import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { OperationsHeader, WorkspaceBanner } from "@/components/operations/operations-ui";
import { loadAssignmentsWorkspace } from "@/features/academics/infrastructure/academic-workflows.repository";
import { QuizBuilder } from "@/features/academics/presentation/quiz-builder";
import { resolveWorkspaceAccess } from "@/server/workspace/workspace-access";

export const dynamic = "force-dynamic";

export default async function NewQuizPage() {
  const access = await resolveWorkspaceAccess("assignments:manage");
  let offerings: Array<{ id: string; label: string }> | null = null;
  if (access.mode === "live") try { offerings = (await loadAssignmentsWorkspace(access.role, access.profileId)).offeringOptions; } catch { offerings = null; }
  const mode = access.mode === "live" && !offerings ? "error" : access.mode;

  return <section>
    <OperationsHeader actions={<Link className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50" href="/assignments"><ArrowLeft className="size-4" /> Back to assignments</Link>} description="Build a multiple choice quiz the way you would in a form: add questions, mark the correct options, set a time limit, and publish. Attempts are graded automatically the moment a student submits." eyebrow="Academic delivery" title="Create a quiz." />
    <WorkspaceBanner mode={mode} />
    {mode === "live" ? <div className="mt-6">
      {offerings?.length ? <QuizBuilder offerings={offerings} /> : <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">No classes are assigned to you yet. Ask an administrator to assign a course offering before creating a quiz.</div>}
    </div> : null}
  </section>;
}
