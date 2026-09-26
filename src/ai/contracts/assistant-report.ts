/**
 * Shared, client-safe contract for the faculty assistant. Every use case
 * returns an AssistantReport built only from verified campus records.
 */

export const assistantUseCases = [
  { description: "Today's classes, attendance marked so far, and who needs attention.", id: "daily-briefing", input: null, label: "Daily briefing" },
  { description: "Students below the 75% attendance policy in the last 30 days.", id: "at-risk-students", input: null, label: "At-risk students" },
  { description: "Rate, trend, status breakdown, and departments for the last 7 days.", id: "attendance-summary", input: null, label: "Attendance summary" },
  { description: "Attendance, risk signals, CGPA, and coding profiles for one student.", id: "student-lookup", input: "Student name or register number", label: "Look up a student" },
  { description: "Submissions waiting for grading and assignments due this week.", id: "grading-queue", input: null, label: "Grading queue" },
  { description: "Top students by coding readiness across linked platforms.", id: "coding-leaders", input: null, label: "Coding leaders" },
  { description: "A ready-to-edit attendance concern message for a student. Nothing is sent.", id: "draft-attendance-message", input: "Student name or register number", label: "Draft attendance message" },
] as const;

export type AssistantUseCaseId = (typeof assistantUseCases)[number]["id"];

export function isAssistantUseCaseId(value: unknown): value is AssistantUseCaseId {
  return assistantUseCases.some((useCase) => useCase.id === value);
}

export type AssistantCell = number | string;

export type AssistantSection = {
  heading: string;
  lines?: string[];
  /** Plain text meant to be copied and edited by the faculty member. */
  draft?: string;
  table?: { columns: string[]; rows: AssistantCell[][] };
};

export type AssistantReport = {
  generatedAt: string;
  sections: AssistantSection[];
  summary: string;
  title: string;
};

export type AssistantChatMessage = { content: string; role: "assistant" | "user" };

export type AssistantAnswer = {
  mode: "model" | "unavailable";
  model: string | null;
  text: string;
  tools: string[];
};
