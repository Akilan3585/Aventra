import "server-only";

import { stepCountIs, tool, ToolLoopAgent, type ModelMessage } from "ai";
import { z } from "zod";

import { buildAssistantReport, type AssistantScope } from "@/ai/assistant/assistant-reports";
import type { AssistantAnswer, AssistantChatMessage, AssistantReport } from "@/ai/contracts/assistant-report";
import { resolveAiProviderConfiguration } from "@/ai/providers/provider-configuration";
import { createCampusLanguageModel } from "@/ai/providers/provider";

/** Compact tool output: the model sees the same verified numbers the UI renders. */
function compact(report: AssistantReport) {
  return {
    sections: report.sections.map((section) => ({
      draft: section.draft,
      heading: section.heading,
      lines: section.lines,
      table: section.table ? { columns: section.table.columns, rows: section.table.rows.slice(0, 40) } : undefined,
    })),
    summary: report.summary,
    title: report.title,
  };
}

const studentQuery = z.object({ student: z.string().min(1).max(80).describe("Student name or register number") });

function createAssistantTools(scope: AssistantScope, onCall: (name: string) => void) {
  const run = (name: string, useCase: Parameters<typeof buildAssistantReport>[0], input = "") => {
    onCall(name);
    return buildAssistantReport(useCase, scope, input).then(compact);
  };
  return {
    attendanceSummary: tool({ description: "Attendance rate, daily trend, status breakdown, and departments for the last 7 days.", execute: () => run("attendanceSummary", "attendance-summary"), inputSchema: z.object({}) }),
    atRiskStudents: tool({ description: "Students below the attendance policy over the last 30 days, with sessions and absences.", execute: () => run("atRiskStudents", "at-risk-students"), inputSchema: z.object({}) }),
    codingLeaders: tool({ description: "Students ranked by coding readiness from their GitHub, LeetCode, CodeChef, and HackerRank profiles.", execute: () => run("codingLeaders", "coding-leaders"), inputSchema: z.object({}) }),
    dailyBriefing: tool({ description: "Today's scheduled classes, attendance marked today, timetable conflicts, and lowest-attendance students.", execute: () => run("dailyBriefing", "daily-briefing"), inputSchema: z.object({}) }),
    draftAttendanceMessage: tool({ description: "Facts and a draft attendance concern message for one student. The message is never sent.", execute: ({ student }) => run("draftAttendanceMessage", "draft-attendance-message", student), inputSchema: studentQuery }),
    gradingQueue: tool({ description: "Submissions waiting for grading and assignments due in the next 7 days.", execute: () => run("gradingQueue", "grading-queue"), inputSchema: z.object({}) }),
    studentLookup: tool({ description: "One student's attendance, recent absences, CGPA, marks average, risk reasons, and coding profiles.", execute: ({ student }) => run("studentLookup", "student-lookup", student), inputSchema: studentQuery }),
  };
}

const instructions = [
  "You are Aventra's faculty assistant for a college. You help faculty and campus staff understand attendance, student risk, grading work, timetables, and coding readiness.",
  "Always call the relevant tools before answering, and answer only from tool results. Never invent students, numbers, dates, or policies. If the tools return no data, say so plainly.",
  "You are read-only. You cannot mark attendance, change grades, approve anything, or send messages. When asked to do so, explain where in the app the faculty member can do it themselves (Attendance, Assignments, Performance, Students pages).",
  "Draft messages are suggestions for the faculty member to review and send themselves; say this whenever you provide one.",
  "Keep answers short and practical: lead with the answer, then a short bulleted list of the key numbers or names. Use the student's name and register number when referring to a student. Never assume a student's gender: repeat their name or use they/them.",
  "Format with plain sentences, **bold** for key figures, and lines starting with \"- \" for bullets. Do not use headings or tables.",
  "The attendance policy is 75%; present, late, and on-duty count as attended, and permission, leave, and excused are excluded from the percentage.",
].join(" ");

/** Free-text chat. Requires a configured AI provider; the report use cases work without one. */
export async function answerFacultyQuestion(scope: AssistantScope, history: AssistantChatMessage[], question: string): Promise<AssistantAnswer> {
  const configuration = resolveAiProviderConfiguration();
  if (!configuration) {
    return {
      mode: "unavailable",
      model: null,
      text: "Chat needs an AI model. Set GEMINI_MODEL (or OPENAI_MODEL) in .env.local next to the API key and restart the server. The quick actions above work without a model.",
      tools: [],
    };
  }

  const toolCalls: string[] = [];
  const agent = new ToolLoopAgent({
    instructions,
    model: createCampusLanguageModel(configuration),
    stopWhen: stepCountIs(6),
    tools: createAssistantTools(scope, (name) => toolCalls.push(name)),
  });
  const messages: ModelMessage[] = [
    ...history.slice(-10).map((message) => ({ content: message.content, role: message.role }) as ModelMessage),
    { content: question, role: "user" },
  ];
  const result = await agent.generate({ messages });
  return {
    mode: "model",
    model: configuration.model,
    text: result.text.trim() || "I could not produce an answer from the available records. Try one of the quick actions.",
    tools: [...new Set(toolCalls)],
  };
}
