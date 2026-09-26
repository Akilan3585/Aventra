"use client";

import { AlertTriangle, TimerReset } from "lucide-react";
import { useActionState, useEffect, useRef, useState } from "react";

import { submitQuizAttemptAction, type QuizActionState } from "@/features/academics/application/assignment-quiz-actions";
import { quizAnswerFieldPrefix } from "@/features/academics/domain/assignment-quiz-rules";
import type { QuizQuestion } from "@/features/academics/infrastructure/assignment-quizzes.repository";
import { Card } from "@/design-system/primitives/card";
import { cn } from "@/lib/utils";

const initialQuizActionState: QuizActionState = { message: "", status: "idle" };

function remainingLabel(milliseconds: number) {
  const total = Math.max(0, Math.floor(milliseconds / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

/**
 * The live quiz form. Answers are named `answer-<questionId>` so the server
 * can grade them from the answer key. When a deadline is set the form
 * auto-submits the moment it is reached so nothing the student chose is lost.
 */
export function QuizAttempt({ assignmentId, deadline, questions }: { assignmentId: string; deadline: string | null; questions: QuizQuestion[] }) {
  const [state, action, pending] = useActionState(submitQuizAttemptAction, initialQuizActionState);
  const [answered, setAnswered] = useState<Record<string, number>>({});
  const [remaining, setRemaining] = useState<number | null>(() => deadline ? new Date(deadline).getTime() - Date.now() : null);
  const formRef = useRef<HTMLFormElement>(null);
  const autoSubmitted = useRef(false);

  useEffect(() => {
    if (!deadline) return;
    const target = new Date(deadline).getTime();
    const tick = () => {
      const left = target - Date.now();
      setRemaining(left);
      if (left <= 0 && !autoSubmitted.current) {
        autoSubmitted.current = true;
        formRef.current?.requestSubmit();
      }
    };
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [deadline]);

  const answeredCount = Object.values(answered).filter((count) => count > 0).length;
  const urgent = remaining !== null && remaining <= 60_000;

  return (
    <form action={action} className="space-y-4" ref={formRef}>
      <input name="assignmentId" type="hidden" value={assignmentId} />
      <div className="sticky top-16 z-10 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white/95 px-4 py-3 shadow-sm backdrop-blur">
        <p className="text-sm text-slate-600"><span className="font-semibold text-slate-950">{answeredCount}</span> of {questions.length} answered</p>
        {remaining !== null ? <p className={cn("inline-flex items-center gap-1.5 font-mono text-sm font-semibold", urgent ? "text-rose-600" : "text-slate-800")} aria-live="polite"><TimerReset className="size-4" /> {remainingLabel(remaining)} left</p> : <p className="text-xs text-slate-500">No time limit</p>}
      </div>

      {questions.map((question, index) => (
        <Card className="p-5 sm:p-6" key={question.id}>
          <div className="flex items-start justify-between gap-4">
            <p className="text-sm font-semibold text-slate-950">Q{index + 1}. {question.prompt}</p>
            <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">{question.marks} {question.marks === 1 ? "mark" : "marks"}</span>
          </div>
          {question.allowMultiple ? <p className="mt-1 text-xs text-slate-500">Select every option that applies.</p> : null}
          <fieldset className="mt-4 space-y-2" onChange={(event) => {
            const form = event.currentTarget.closest("form");
            const count = form ? Array.from(form.querySelectorAll<HTMLInputElement>(`input[name="${quizAnswerFieldPrefix}${question.id}"]:checked`)).length : 0;
            setAnswered((current) => ({ ...current, [question.id]: count }));
          }}>
            <legend className="sr-only">Options for question {index + 1}</legend>
            {question.options.map((option) => (
              <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-800 transition has-[:checked]:border-blue-500 has-[:checked]:bg-blue-50/60 hover:bg-slate-50" key={option.id}>
                <input className="size-4 accent-blue-600" name={`${quizAnswerFieldPrefix}${question.id}`} type={question.allowMultiple ? "checkbox" : "radio"} value={option.id} />
                <span>{option.label}</span>
              </label>
            ))}
          </fieldset>
        </Card>
      ))}

      {state.status === "error" ? <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800" role="alert"><AlertTriangle className="mt-0.5 size-4 shrink-0" /><p>{state.message}</p></div> : null}
      <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4">
        <button className="rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-wait disabled:opacity-60" disabled={pending} type="submit">{pending ? "Submitting…" : "Submit quiz"}</button>
        <p className="text-xs leading-5 text-slate-500">You can submit once. Unanswered questions score zero.</p>
      </div>
    </form>
  );
}
