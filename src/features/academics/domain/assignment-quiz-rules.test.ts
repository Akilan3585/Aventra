import { describe, expect, it } from "vitest";

import {
  answersFromEntries,
  assignmentAcceptsAttempts,
  attemptDeadline,
  attemptIsWithinTime,
  canTransitionAssignmentStatus,
  formatDuration,
  gradeQuizAttempt,
  parseQuizQuestionsPayload,
  quizTotalMarks,
  scoreQuizAnswer,
  stableShuffle,
  summariseAssignmentScores,
  summariseQuizQuestions,
  validateQuizQuestions,
} from "./assignment-quiz-rules";

const question = (overrides: Partial<Parameters<typeof validateQuizQuestions>[0][number]> = {}) => ({
  allowMultiple: false,
  marks: 2,
  options: [{ isCorrect: true, label: "Paris" }, { isCorrect: false, label: "Rome" }],
  prompt: "Capital of France?",
  ...overrides,
});

describe("quiz draft validation", () => {
  it("accepts a well formed single answer question", () => {
    expect(validateQuizQuestions([question()])).toEqual([]);
  });

  it("requires at least one question", () => {
    expect(validateQuizQuestions([])).toContain("Add at least one question.");
  });

  it("rejects questions without a correct answer, too few options, or blank options", () => {
    expect(validateQuizQuestions([question({ options: [{ isCorrect: false, label: "A" }, { isCorrect: false, label: "B" }] })])).toContain("Question 1 needs a correct answer.");
    expect(validateQuizQuestions([question({ options: [{ isCorrect: true, label: "A" }] })])).toContain("Question 1 needs between 2 and 8 options.");
    expect(validateQuizQuestions([question({ options: [{ isCorrect: true, label: "A" }, { isCorrect: false, label: "  " }] })])).toContain("Question 1 has an empty option.");
  });

  it("rejects several correct answers on a single answer question and duplicate options", () => {
    const errors = validateQuizQuestions([question({ options: [{ isCorrect: true, label: "A" }, { isCorrect: true, label: "a" }] })]);
    expect(errors.some((error) => error.includes("allows one answer"))).toBe(true);
    expect(errors).toContain("Question 1 has duplicate options.");
  });

  it("allows multiple correct answers when the question permits them", () => {
    expect(validateQuizQuestions([question({ allowMultiple: true, options: [{ isCorrect: true, label: "A" }, { isCorrect: true, label: "B" }, { isCorrect: false, label: "C" }] })])).toEqual([]);
  });

  it("sums marks across questions", () => {
    expect(quizTotalMarks([{ marks: 1.5 }, { marks: 2 }, { marks: 0.25 }])).toBe(3.75);
  });
});

const scorable = {
  allowMultiple: false,
  id: "q1",
  marks: 4,
  options: [{ id: "a", isCorrect: true }, { id: "b", isCorrect: false }, { id: "c", isCorrect: false }],
};

describe("quiz auto-grading", () => {
  it("awards full marks for the exact correct selection and nothing otherwise", () => {
    expect(scoreQuizAnswer(scorable, ["a"])).toEqual({ awardedMarks: 4, isCorrect: true, selectedOptionIds: ["a"] });
    expect(scoreQuizAnswer(scorable, ["b"])).toEqual({ awardedMarks: 0, isCorrect: false, selectedOptionIds: ["b"] });
    expect(scoreQuizAnswer(scorable, [])).toEqual({ awardedMarks: 0, isCorrect: false, selectedOptionIds: [] });
  });

  it("ignores option ids that do not belong to the question and keeps one choice for single answer questions", () => {
    expect(scoreQuizAnswer(scorable, ["zzz", "a", "b"])).toEqual({ awardedMarks: 4, isCorrect: true, selectedOptionIds: ["a"] });
  });

  it("requires the complete set for multiple answer questions", () => {
    const multi = { ...scorable, allowMultiple: true, options: [{ id: "a", isCorrect: true }, { id: "b", isCorrect: true }, { id: "c", isCorrect: false }] };
    expect(scoreQuizAnswer(multi, ["a"]).isCorrect).toBe(false);
    expect(scoreQuizAnswer(multi, ["a", "b", "c"]).isCorrect).toBe(false);
    expect(scoreQuizAnswer(multi, ["b", "a"]).isCorrect).toBe(true);
  });

  it("grades a whole attempt", () => {
    const result = gradeQuizAttempt([scorable, { ...scorable, id: "q2", marks: 1 }], { q1: ["a"], q2: ["c"] });
    expect(result.total).toBe(4);
    expect(result.maximum).toBe(5);
    expect(result.answered).toBe(2);
    expect(result.perQuestion.map((answer) => answer.isCorrect)).toEqual([true, false]);
  });
});

describe("assignment lifecycle", () => {
  it("allows publish, close, reopen, and unpublish transitions only", () => {
    expect(canTransitionAssignmentStatus("draft", "published")).toBe(true);
    expect(canTransitionAssignmentStatus("published", "closed")).toBe(true);
    expect(canTransitionAssignmentStatus("published", "draft")).toBe(true);
    expect(canTransitionAssignmentStatus("closed", "published")).toBe(true);
    expect(canTransitionAssignmentStatus("draft", "closed")).toBe(false);
    expect(canTransitionAssignmentStatus("closed", "draft")).toBe(false);
  });

  it("accepts attempts only while published and before the due date", () => {
    const now = new Date("2026-09-24T10:00:00Z");
    expect(assignmentAcceptsAttempts({ dueAt: null, status: "published" }, now)).toBe(true);
    expect(assignmentAcceptsAttempts({ dueAt: "2026-09-25T00:00:00Z", status: "published" }, now)).toBe(true);
    expect(assignmentAcceptsAttempts({ dueAt: "2026-09-23T00:00:00Z", status: "published" }, now)).toBe(false);
    expect(assignmentAcceptsAttempts({ dueAt: null, status: "draft" }, now)).toBe(false);
    expect(assignmentAcceptsAttempts({ dueAt: null, status: "closed" }, now)).toBe(false);
  });

  it("uses the earlier of the time limit and the due date as the attempt deadline", () => {
    expect(attemptDeadline({ dueAt: null, startedAt: null, timeLimitMinutes: null })).toBeNull();
    expect(attemptDeadline({ dueAt: "2026-09-24T12:00:00Z", startedAt: "2026-09-24T10:00:00Z", timeLimitMinutes: 30 })?.toISOString()).toBe("2026-09-24T10:30:00.000Z");
    expect(attemptDeadline({ dueAt: "2026-09-24T10:10:00Z", startedAt: "2026-09-24T10:00:00Z", timeLimitMinutes: 30 })?.toISOString()).toBe("2026-09-24T10:10:00.000Z");
  });

  it("applies a short grace period to timed submissions", () => {
    const attempt = { dueAt: null, startedAt: "2026-09-24T10:00:00Z", timeLimitMinutes: 10 };
    expect(attemptIsWithinTime(attempt, new Date("2026-09-24T10:10:20Z"))).toBe(true);
    expect(attemptIsWithinTime(attempt, new Date("2026-09-24T10:11:00Z"))).toBe(false);
  });

  it("shuffles deterministically for the same seed", () => {
    const items = [{ id: "1" }, { id: "2" }, { id: "3" }, { id: "4" }, { id: "5" }];
    const first = stableShuffle(items, "student-a");
    expect(stableShuffle(items, "student-a")).toEqual(first);
    expect(first.map((item) => item.id).sort()).toEqual(["1", "2", "3", "4", "5"]);
    expect(stableShuffle(items, "student-b").map((item) => item.id)).not.toEqual(first.map((item) => item.id));
  });
});

describe("assignment analytics", () => {
  const submissions = [
    { gradedAt: "2026-09-24T10:00:00Z", score: 9, startedAt: "2026-09-24T09:00:00Z", submittedAt: "2026-09-24T09:10:00Z" },
    { gradedAt: "2026-09-24T10:00:00Z", score: 3, startedAt: "2026-09-24T09:00:00Z", submittedAt: "2026-09-24T09:20:00Z" },
    { gradedAt: "2026-09-24T10:00:00Z", score: 6, startedAt: null, submittedAt: "2026-09-24T09:30:00Z" },
    { gradedAt: null, score: null, startedAt: null, submittedAt: "2026-09-24T09:30:00Z" },
    { gradedAt: null, score: null, startedAt: null, submittedAt: null },
  ];

  it("computes completion, averages, pass rate, and the score distribution", () => {
    const summary = summariseAssignmentScores({ enrolledCount: 6, maximumMarks: 10, submissions });
    expect(summary.enrolled).toBe(6);
    expect(summary.submitted).toBe(4);
    expect(summary.graded).toBe(3);
    expect(summary.ungraded).toBe(1);
    expect(summary.pending).toBe(2);
    expect(summary.completionRate).toBe(67);
    expect(summary.averagePercent).toBe(60);
    expect(summary.medianPercent).toBe(60);
    expect(summary.highestPercent).toBe(90);
    expect(summary.lowestPercent).toBe(30);
    expect(summary.passRate).toBe(67);
    expect(summary.averageDurationSeconds).toBe(900);
    expect(summary.distribution.map((band) => band.count)).toEqual([1, 0, 1, 1]);
  });

  it("never reports more enrolled students than submissions", () => {
    expect(summariseAssignmentScores({ enrolledCount: 0, maximumMarks: 10, submissions }).enrolled).toBe(4);
  });

  it("breaks quiz results down by question and option", () => {
    const questions = [
      { allowMultiple: false, id: "q1", marks: 1, options: [{ id: "a", isCorrect: true, label: "A" }, { id: "b", isCorrect: false, label: "B" }], position: 1, prompt: "One" },
      { allowMultiple: false, id: "q2", marks: 1, options: [{ id: "c", isCorrect: true, label: "C" }, { id: "d", isCorrect: false, label: "D" }], position: 2, prompt: "Two" },
    ];
    const answers = [
      { isCorrect: true, questionId: "q1", selectedOptionIds: ["a"] },
      { isCorrect: false, questionId: "q1", selectedOptionIds: ["b"] },
      { isCorrect: false, questionId: "q1", selectedOptionIds: [] },
      { isCorrect: true, questionId: "q2", selectedOptionIds: ["c"] },
      { isCorrect: true, questionId: "q2", selectedOptionIds: ["c"] },
    ];
    const summary = summariseQuizQuestions(questions, answers);
    expect(summary.questions[0]).toMatchObject({ attempts: 3, correctCount: 1, correctRate: 33, skipped: 1 });
    expect(summary.questions[0].options.map((option) => option.share)).toEqual([50, 50]);
    expect(summary.questions[1]).toMatchObject({ attempts: 2, correctRate: 100 });
    expect(summary.hardest?.id).toBe("q1");
    expect(summary.easiest?.id).toBe("q2");
  });
});

describe("quiz answer form parsing", () => {
  it("groups answer fields by question id and ignores unrelated fields", () => {
    const answers = answersFromEntries([
      ["answer-q1", "o1"],
      ["answer-q2", "o3"],
      ["answer-q2", "o4"],
      ["assignmentId", "a1"],
      ["answer-", "o9"],
      ["answer-q3", ""],
    ]);
    expect(answers).toEqual({ q1: ["o1"], q2: ["o3", "o4"] });
  });

  it("formats durations for the attempt timer", () => {
    expect(formatDuration(45)).toBe("45s");
    expect(formatDuration(125)).toBe("2m 5s");
    expect(formatDuration(3600 * 2 + 60)).toBe("2h 1m");
    expect(formatDuration(-5)).toBe("0s");
  });
});

describe("quiz builder payload", () => {
  it("parses the JSON posted by the builder and applies defaults", () => {
    const parsed = parseQuizQuestionsPayload(JSON.stringify([{ marks: "2", options: [{ label: "A", isCorrect: true }, { label: "B" }], prompt: "Pick A" }]));
    expect(parsed).toEqual([{ allowMultiple: false, marks: 2, options: [{ isCorrect: true, label: "A" }, { isCorrect: false, label: "B" }], prompt: "Pick A" }]);
  });

  it("returns null for missing, malformed, or structurally invalid payloads", () => {
    expect(parseQuizQuestionsPayload(null)).toBeNull();
    expect(parseQuizQuestionsPayload("not json")).toBeNull();
    expect(parseQuizQuestionsPayload(JSON.stringify({ prompt: "x" }))).toBeNull();
    expect(parseQuizQuestionsPayload(JSON.stringify([{ marks: 1, options: "A,B", prompt: "x" }]))).toBeNull();
  });
});
