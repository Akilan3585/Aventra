import "server-only";

import { Output, stepCountIs, ToolLoopAgent } from "ai";
import { z } from "zod";

import type { AgentResult } from "@/ai/contracts/agent-result";
import { resolveAiProviderConfiguration } from "@/ai/providers/provider-configuration";
import { createCampusLanguageModel } from "@/ai/providers/provider";
import { createCampusAgentTools } from "@/ai/tools/campus-tools";
import { loadPerformanceWorkspace, resolveActorProfileId } from "@/features/administration/infrastructure/administration.repository";
import { loadAttendanceWorkspace, loadClassroomWorkspace, loadMaintenanceWorkspace, loadScheduleWorkspace } from "@/features/operations/infrastructure/campus-operations.repository";
import { createSupabaseAdminClient } from "@/server/supabase/admin-client";
import type { Json } from "@/types/database";

export const campusAgentNames = ["coordinator", "student-success", "classroom", "maintenance"] as const;
export type CampusAgentName = (typeof campusAgentNames)[number];
type CampusDecision = { action: "monitor" | "review"; agent: CampusAgentName; summary: string };

const recommendationSchema = z.object({
  confidence: z.number().min(0).max(1),
  nextActions: z.array(z.string().min(1).max(240)).min(1).max(4),
  reasons: z.array(z.string().min(1).max(240)).min(1).max(4),
  summary: z.string().min(1).max(320),
});

const activeToolsByAgent = {
  classroom: ["classroomSignals", "scheduleSignals"],
  coordinator: ["attendanceSignals", "performanceSignals", "classroomSignals", "scheduleSignals", "maintenanceSignals"],
  maintenance: ["maintenanceSignals"],
  "student-success": ["attendanceSignals", "performanceSignals"],
} as const;

function asJson(value: unknown) { return value as Json; }

export async function executeCampusAgent({ agentName, focus, userId }: { agentName: CampusAgentName; focus: string; userId: string }) {
  const client = createSupabaseAdminClient();
  const actorProfileId = await resolveActorProfileId(userId);
  const { data: run, error: runError } = await client.from("agent_runs").insert({ agent_name: agentName, input: { focus }, requested_by_profile_id: actorProfileId, started_at: new Date().toISOString(), status: "running" }).select("id, correlation_id").single();
  if (runError) throw new Error("AGENT_RUN_CREATE_FAILED");

  try {
    const result = await buildDecision(agentName, focus);
    const completedAt = new Date().toISOString();
    const [decisionWrite, runWrite] = await Promise.all([
      client.from("agent_decisions").insert({ confidence: result.confidence, decision_type: result.decision.action, reasons: asJson(result.reasons), recommendations: asJson(result.nextActions), requires_human_review: result.requiresHumanReview, run_id: run.id }),
      client.from("agent_runs").update({ completed_at: completedAt, output: asJson(result), status: "completed" }).eq("id", run.id),
    ]);
    if (decisionWrite.error || runWrite.error) throw new Error("AGENT_RESULT_PERSIST_FAILED");

    if (agentName === "coordinator") {
      await client.from("agent_messages").insert(["student-success", "classroom", "maintenance"].map((specialist) => ({ payload: { evidence_count: result.evidence.length, outcome: result.decision.action }, recipient_agent: "coordinator", run_id: run.id, sender_agent: specialist })));
    }
    await client.from("audit_logs").insert({ action: "agent.completed", actor_profile_id: actorProfileId, correlation_id: run.correlation_id, entity_id: run.id, entity_type: "agent_run", metadata: { agent_name: agentName, confidence: result.confidence, requires_human_review: result.requiresHumanReview } });
    return result;
  } catch (error) {
    await client.from("agent_runs").update({ completed_at: new Date().toISOString(), error_message: error instanceof Error ? error.message : "Agent execution failed", status: "failed" }).eq("id", run.id);
    throw error;
  }
}

async function buildDecision(agentName: CampusAgentName, focus: string): Promise<AgentResult<CampusDecision>> {
  const deterministic = await buildDeterministicDecision(agentName, focus);
  const configuration = resolveAiProviderConfiguration();

  if (!configuration) {
    return {
      ...deterministic,
      execution: { mode: "deterministic-fallback", model: null, provider: null, tools: [] },
    };
  }

  const toolCalls: string[] = [];
  const tools = createCampusAgentTools((toolName) => toolCalls.push(toolName));
  const activeTools = [...activeToolsByAgent[agentName]];

  try {
    const agent = new ToolLoopAgent({
      activeTools,
      instructions: [
        "You are a governed smart-campus decision-support specialist.",
        "Call every available evidence tool before producing an answer.",
        "Use only tool evidence and the deterministic policy result supplied by the application.",
        "Never invent students, rooms, incidents, counts, policies, or privileged actions.",
        "The deterministic action and human-review requirement are binding and cannot be changed.",
        "Return concise reasons and safe next actions for an authorized campus operator.",
      ].join(" "),
      model: createCampusLanguageModel(configuration),
      output: Output.object({ schema: recommendationSchema }),
      prepareStep: ({ steps }) => {
        const requiredTool = activeTools[steps.length];
        return requiredTool
          ? { activeTools: [requiredTool], toolChoice: { toolName: requiredTool, type: "tool" } }
          : { activeTools, toolChoice: "auto" };
      },
      stopWhen: stepCountIs(activeTools.length + 2),
      tools,
    });

    const response = await agent.generate({
      prompt: [
        `Specialist: ${agentName}.`,
        `Operator focus: ${focus || "No additional focus supplied"}.`,
        `Binding deterministic action: ${deterministic.decision.action}.`,
        `Binding human review: ${deterministic.requiresHumanReview}.`,
        `Verified baseline evidence: ${JSON.stringify(deterministic.evidence)}.`,
        `You must call these tools before answering: ${activeTools.join(", ")}.`,
      ].join("\n"),
    });

    const missingTools = activeTools.filter((toolName) => !toolCalls.includes(toolName));
    if (missingTools.length > 0) throw new Error(`AGENT_EVIDENCE_INCOMPLETE:${missingTools.join(",")}`);

    return {
      ...deterministic,
      confidence: Math.min(deterministic.confidence, response.output.confidence),
      decision: { ...deterministic.decision, summary: response.output.summary },
      execution: {
        mode: "provider",
        model: configuration.model,
        provider: configuration.provider,
        tools: [...new Set(toolCalls)],
      },
      nextActions: response.output.nextActions,
      reasons: response.output.reasons,
    };
  } catch {
    return {
      ...deterministic,
      execution: {
        mode: "deterministic-fallback",
        model: configuration.model,
        provider: configuration.provider,
        tools: [...new Set(toolCalls)],
      },
    };
  }
}

async function buildDeterministicDecision(agentName: CampusAgentName, focus: string): Promise<AgentResult<CampusDecision>> {
  if (agentName === "student-success") {
    const [attendance, performance] = await Promise.all([loadAttendanceWorkspace(), loadPerformanceWorkspace()]);
    const lowGpa = performance.results.filter((item) => Number(item.gpa) < 6).length;
    const attendanceRisk = attendance.attendanceRate !== null && attendance.attendanceRate < 75;
    const needsReview = lowGpa > 0 || attendanceRisk;
    return { confidence: performance.results.length || attendance.records.length ? 0.91 : 0.62, decision: { action: needsReview ? "review" : "monitor", agent: agentName, summary: needsReview ? "Student support signals require human review." : "No verified high-priority student-success exception was found." }, evidence: [{ sourceId: "attendance-ledger", sourceType: "attendance_records", summary: `Attendance is ${attendance.attendanceRate ?? "not yet available"}%; ${attendance.absent} absences are visible.` }, { sourceId: "semester-results", sourceType: "semester_results", summary: `${lowGpa} result records are below the 6.0 GPA support threshold.` }], reasons: needsReview ? ["Verified attendance or GPA signals crossed a deterministic support threshold."] : ["Available verified signals remain within current campus support thresholds."], nextActions: needsReview ? ["Review the affected students in the student and performance workspaces.", "Approve outreach only after a faculty member validates the evidence."] : ["Continue monitoring as new attendance and results are recorded."], requiresHumanReview: needsReview };
  }
  if (agentName === "classroom") {
    const [classrooms, schedules] = await Promise.all([loadClassroomWorkspace(), loadScheduleWorkspace()]);
    const needsReview = classrooms.attentionRooms > 0 || schedules.conflicts > 0;
    return { confidence: classrooms.classrooms.length ? 0.94 : 0.6, decision: { action: needsReview ? "review" : "monitor", agent: agentName, summary: needsReview ? "Room readiness or timetable constraints require review." : "Teaching spaces pass current deterministic checks." }, evidence: [{ sourceId: "room-readiness", sourceType: "rooms_equipment_tickets", summary: `${classrooms.attentionRooms} rooms require attention; average readiness is ${classrooms.averageReadiness}%.` }, { sourceId: "schedule-constraints", sourceType: "schedules", summary: `${schedules.conflicts} schedule or capacity conflicts are visible.` }], reasons: needsReview ? ["At least one source-of-truth capacity, overlap, equipment, or maintenance rule failed."] : ["No capacity, overlap, or readiness exception was detected."], nextActions: needsReview ? ["Inspect the affected classrooms and schedule conflicts.", "Approve any room reassignment manually after faculty impact review."] : ["Continue readiness monitoring before each teaching day."], requiresHumanReview: needsReview };
  }
  if (agentName === "maintenance") {
    const maintenance = await loadMaintenanceWorkspace();
    const needsReview = maintenance.critical > 0 || maintenance.overdue > 0;
    return { confidence: maintenance.tickets.length ? 0.93 : 0.65, decision: { action: needsReview ? "review" : "monitor", agent: agentName, summary: needsReview ? "Critical or overdue maintenance requires operational review." : "Maintenance workload is inside current SLA signals." }, evidence: [{ sourceId: "maintenance-queue", sourceType: "maintenance_tickets", summary: `${maintenance.critical} critical and ${maintenance.overdue} overdue tickets are visible.` }], reasons: needsReview ? ["Priority and elapsed time exceeded a deterministic maintenance policy."] : ["No active ticket currently crosses a critical or overdue rule."], nextActions: needsReview ? ["Assign or escalate the affected tickets.", "Do not close a ticket until a human verifies restoration."] : ["Continue queue monitoring and record service outcomes."], requiresHumanReview: needsReview };
  }

  const [attendance, classrooms, maintenance, schedules] = await Promise.all([loadAttendanceWorkspace(), loadClassroomWorkspace(), loadMaintenanceWorkspace(), loadScheduleWorkspace()]);
  const exceptionCount = (attendance.attendanceRate !== null && attendance.attendanceRate < 75 ? 1 : 0) + classrooms.attentionRooms + maintenance.critical + maintenance.overdue + schedules.conflicts;
  const needsReview = exceptionCount > 0;
  const summary = needsReview ? `${exceptionCount} cross-campus exception signals require coordinated review.` : "No cross-campus exception signal crossed a deterministic threshold.";
  return { confidence: 0.95, decision: { action: needsReview ? "review" : "monitor", agent: agentName, summary: focus ? `${summary} Focus: ${focus}` : summary }, evidence: [{ sourceId: "student-success", sourceType: "specialist_result", summary: `Attendance health: ${attendance.attendanceRate ?? "not available"}%.` }, { sourceId: "classroom", sourceType: "specialist_result", summary: `${classrooms.attentionRooms} rooms need attention and ${schedules.conflicts} timetable conflicts are visible.` }, { sourceId: "maintenance", sourceType: "specialist_result", summary: `${maintenance.critical} critical and ${maintenance.overdue} overdue maintenance tickets are visible.` }], reasons: needsReview ? ["One or more specialist rule sets returned a verified operational exception.", "Conflicting operational priorities must be resolved by an authorized person."] : ["All available specialist evidence remains inside current deterministic policy thresholds."], nextActions: needsReview ? ["Open the linked specialist workspaces and validate each source record.", "Record a human decision before taking a privileged operational action."] : ["Continue monitoring and rerun after source data changes."], requiresHumanReview: needsReview };
}
