"use client";

import { CheckCircle2, Circle, CircleCheckBig, Plus, Square, SquareCheckBig, Trash2 } from "lucide-react";
import { useActionState, useMemo, useState } from "react";

import { createQuizAction, type QuizActionState } from "@/features/academics/application/assignment-quiz-actions";
import { quizLimits, quizTotalMarks, validateQuizQuestions, type QuizQuestionDraft } from "@/features/academics/domain/assignment-quiz-rules";
import { Card } from "@/design-system/primitives/card";
import { cn } from "@/lib/utils";

const initialQuizActionState: QuizActionState = { message: "", status: "idle" };

type OptionDraft = { isCorrect: boolean; key: string; label: string };
type QuestionDraft = { allowMultiple: boolean; explanation: string; key: string; marks: string; options: OptionDraft[]; prompt: string };

const field = "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100";
const label = "text-xs font-semibold text-slate-600";
const newKey = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : Math.random().toString(36).slice(2));
const newOption = (label = ""): OptionDraft => ({ isCorrect: false, key: newKey(), label });
const newQuestion = (): QuestionDraft => ({ allowMultiple: false, explanation: "", key: newKey(), marks: "1", options: [newOption(), newOption(), newOption(), newOption()], prompt: "" });

function toDraft(question: QuestionDraft): QuizQuestionDraft {
  return { allowMultiple: question.allowMultiple, explanation: question.explanation.trim() || undefined, marks: Number(question.marks), options: question.options.map((option) => ({ isCorrect: option.isCorrect, label: option.label })), prompt: question.prompt };
}

export function QuizBuilder({ offerings }: { offerings: Array<{ id: string; label: string }> }) {
  const [state, action, pending] = useActionState(createQuizAction, initialQuizActionState);
  const [questions, setQuestions] = useState<QuestionDraft[]>(() => [newQuestion()]);
  const drafts = useMemo(() => questions.map(toDraft), [questions]);
  const problems = useMemo(() => validateQuizQuestions(drafts), [drafts]);
  const totalMarks = quizTotalMarks(drafts.map((question) => ({ marks: Number.isFinite(question.marks) ? question.marks : 0 })));
  const payload = useMemo(() => JSON.stringify(drafts), [drafts]);

  const update = (key: string, patch: Partial<QuestionDraft>) => setQuestions((current) => current.map((question) => question.key === key ? { ...question, ...patch } : question));
  const updateOption = (questionKey: string, optionKey: string, patch: Partial<OptionDraft>) => setQuestions((current) => current.map((question) => {
    if (question.key !== questionKey) return question;
    return { ...question, options: question.options.map((option) => option.key === optionKey ? { ...option, ...patch } : option) };
  }));
  const markCorrect = (question: QuestionDraft, optionKey: string) => setQuestions((current) => current.map((item) => {
    if (item.key !== question.key) return item;
    return { ...item, options: item.options.map((option) => question.allowMultiple ? option.key === optionKey ? { ...option, isCorrect: !option.isCorrect } : option : { ...option, isCorrect: option.key === optionKey }) };
  }));
  const toggleMultiple = (question: QuestionDraft) => setQuestions((current) => current.map((item) => {
    if (item.key !== question.key) return item;
    const allowMultiple = !item.allowMultiple;
    let seen = false;
    return { ...item, allowMultiple, options: allowMultiple ? item.options : item.options.map((option) => { const keep = option.isCorrect && !seen; if (option.isCorrect) seen = true; return { ...option, isCorrect: keep }; }) };
  }));

  return (
    <form action={action} className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px] xl:items-start">
      <input name="questions" type="hidden" value={payload} />
      <div className="space-y-4">
        <Card className="p-5 sm:p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className={`${label} sm:col-span-2`}>Class<select className={`${field} mt-1`} name="offeringId" required><option value="">Choose class</option>{offerings.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
            <label className={`${label} sm:col-span-2`}>Quiz title<input className={`${field} mt-1`} maxLength={160} minLength={3} name="title" placeholder="Unit A · Multiple choice quiz" required /></label>
            <label className={`${label} sm:col-span-2`}>Instructions for students (optional)<textarea className={`${field} mt-1 min-h-20`} maxLength={4000} name="instructions" placeholder="Answer every question. Each question has exactly one correct option unless marked otherwise." /></label>
          </div>
        </Card>

        {questions.map((question, index) => (
          <Card className="p-5 sm:p-6" key={question.key}>
            <div className="flex items-start justify-between gap-4">
              <p className="text-sm font-semibold text-slate-950">Question {index + 1}</p>
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-1.5 text-xs font-medium text-slate-600"><input checked={question.allowMultiple} className="size-3.5 accent-blue-600" onChange={() => toggleMultiple(question)} type="checkbox" />Multiple answers</label>
                <label className="flex items-center gap-1.5 text-xs font-medium text-slate-600">Marks<input className={`${field} w-20 py-1.5`} min="0.25" onChange={(event) => update(question.key, { marks: event.target.value })} step="0.25" type="number" value={question.marks} /></label>
                <button aria-label={`Remove question ${index + 1}`} className="rounded-lg p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 disabled:opacity-40" disabled={questions.length === 1} onClick={() => setQuestions((current) => current.filter((item) => item.key !== question.key))} type="button"><Trash2 className="size-4" /></button>
              </div>
            </div>
            <textarea className={`${field} mt-3 min-h-16`} maxLength={quizLimits.maxPrompt} onChange={(event) => update(question.key, { prompt: event.target.value })} placeholder="Type the question" required value={question.prompt} />
            <div className="mt-3 space-y-2">
              {question.options.map((option, optionIndex) => {
                const Icon = question.allowMultiple ? option.isCorrect ? SquareCheckBig : Square : option.isCorrect ? CircleCheckBig : Circle;
                return (
                  <div className="flex items-center gap-2" key={option.key}>
                    <button aria-label={option.isCorrect ? "Correct answer" : "Mark as correct answer"} aria-pressed={option.isCorrect} className={cn("shrink-0 rounded-lg p-1.5 transition", option.isCorrect ? "text-emerald-600" : "text-slate-300 hover:text-slate-500")} onClick={() => markCorrect(question, option.key)} type="button"><Icon className="size-5" /></button>
                    <input className={cn(field, option.isCorrect && "border-emerald-300 bg-emerald-50/40")} maxLength={quizLimits.maxOptionLabel} onChange={(event) => updateOption(question.key, option.key, { label: event.target.value })} placeholder={`Option ${optionIndex + 1}`} value={option.label} />
                    <button aria-label={`Remove option ${optionIndex + 1}`} className="shrink-0 rounded-lg p-1.5 text-slate-300 transition hover:text-rose-500 disabled:opacity-30" disabled={question.options.length <= quizLimits.minOptions} onClick={() => update(question.key, { options: question.options.filter((item) => item.key !== option.key) })} type="button"><Trash2 className="size-4" /></button>
                  </div>
                );
              })}
              {question.options.length < quizLimits.maxOptions ? <button className="ml-9 inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 hover:text-blue-800" onClick={() => update(question.key, { options: [...question.options, newOption()] })} type="button"><Plus className="size-3.5" /> Add option</button> : null}
            </div>
            <label className={`${label} mt-3 block`}>Explanation shown after submission (optional)<input className={`${field} mt-1`} maxLength={quizLimits.maxExplanation} onChange={(event) => update(question.key, { explanation: event.target.value })} placeholder="Why this answer is correct" value={question.explanation} /></label>
            <p className="mt-2 text-xs text-slate-500">{question.allowMultiple ? "Students must select every correct option to earn the marks." : "Tap the circle next to the correct option."}</p>
          </Card>
        ))}
        {questions.length < quizLimits.maxQuestions ? <button className="inline-flex items-center gap-2 rounded-xl border border-dashed border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-blue-400 hover:text-blue-700" onClick={() => setQuestions((current) => [...current, newQuestion()])} type="button"><Plus className="size-4" /> Add question</button> : null}
      </div>

      <aside className="space-y-4 xl:sticky xl:top-24">
        <Card className="p-5">
          <p className="text-sm font-semibold text-slate-950">Settings</p>
          <div className="mt-4 grid gap-3">
            <label className={label}>Due date (optional)<input className={`${field} mt-1`} name="dueAt" type="datetime-local" /></label>
            <label className={label}>Time limit in minutes (optional)<input className={`${field} mt-1`} max={quizLimits.maxTimeLimitMinutes} min="1" name="timeLimitMinutes" placeholder="e.g. 15" type="number" /></label>
            <label className="flex items-center gap-2 text-sm text-slate-700"><input className="size-4 accent-blue-600" name="shuffleQuestions" type="checkbox" />Shuffle question order per student</label>
            <label className="flex items-center gap-2 text-sm text-slate-700"><input className="size-4 accent-blue-600" defaultChecked name="showResults" type="checkbox" />Show score and correct answers after submission</label>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center justify-between text-sm"><span className="text-slate-500">Questions</span><span className="font-semibold text-slate-950">{questions.length}</span></div>
          <div className="mt-2 flex items-center justify-between text-sm"><span className="text-slate-500">Total marks</span><span className="font-semibold text-slate-950">{totalMarks}</span></div>
          {problems.length ? <ul className="mt-4 space-y-1.5 text-xs text-amber-700">{problems.slice(0, 6).map((problem) => <li key={problem}>• {problem}</li>)}{problems.length > 6 ? <li>• {problems.length - 6} more…</li> : null}</ul> : <p className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700"><CheckCircle2 className="size-3.5" /> Every question is complete.</p>}
          {state.status === "error" ? <div className="mt-4 rounded-xl bg-rose-50 p-3 text-xs text-rose-700" role="alert"><p className="font-semibold">{state.message}</p>{state.errors?.length ? <ul className="mt-1 space-y-1">{state.errors.map((error) => <li key={error}>• {error}</li>)}</ul> : null}</div> : null}
          <div className="mt-5 grid gap-2">
            <button className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50" disabled={pending || problems.length > 0 || !offerings.length} name="publish" type="submit" value="published">{pending ? "Saving…" : "Publish quiz"}</button>
            <button className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50" disabled={pending || problems.length > 0 || !offerings.length} name="publish" type="submit" value="draft">Save as draft</button>
          </div>
          <p className="mt-3 text-xs leading-5 text-slate-500">Published quizzes open to enrolled students immediately. Drafts stay private until you publish them.</p>
        </Card>
      </aside>
    </form>
  );
}
