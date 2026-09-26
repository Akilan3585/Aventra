import "server-only";

import { tool } from "ai";
import { z } from "zod";

import { loadPerformanceWorkspace } from "@/features/administration/infrastructure/administration.repository";
import { loadAttendanceWorkspace, loadScheduleWorkspace } from "@/features/operations/infrastructure/campus-operations.repository";

type ToolObserver = (toolName: string) => void;

const noInput = z.object({});

export function createCampusAgentTools(onToolCall: ToolObserver = () => undefined) {
  return {
    attendanceSignals: tool({
      description: "Read current verified attendance participation and absence signals.",
      inputSchema: noInput,
      execute: async () => {
        onToolCall("attendanceSignals");
        const data = await loadAttendanceWorkspace();
        return {
          absent: data.absent,
          attendanceRate: data.attendanceRate,
          late: data.late,
          records: data.records.length,
          todayRecorded: data.todayRecorded,
        };
      },
    }),
    performanceSignals: tool({
      description: "Read verified student GPA and published performance signals.",
      inputSchema: noInput,
      execute: async () => {
        onToolCall("performanceSignals");
        const data = await loadPerformanceWorkspace();
        const lowGpa = data.results.filter((item) => Number(item.gpa) < 6).length;
        return {
          averageGpa: data.results.length
            ? Number((data.results.reduce((sum, item) => sum + Number(item.gpa), 0) / data.results.length).toFixed(2))
            : null,
          lowGpa,
          published: data.results.filter((item) => item.published_at).length,
          results: data.results.length,
        };
      },
    }),
    scheduleSignals: tool({
      description: "Read verified timetable conflicts, sessions, and utilization signals.",
      inputSchema: noInput,
      execute: async () => {
        onToolCall("scheduleSignals");
        const data = await loadScheduleWorkspace();
        return {
          conflicts: data.conflicts,
          schedules: data.schedules.length,
          todaySessions: data.todaySessions,
          utilizationPercent: data.utilizationPercent,
        };
      },
    }),
  };
}
