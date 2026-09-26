"use client";

import { FolderPlus, Upload, X } from "lucide-react";
import { useState, type ReactNode } from "react";

// Icons are resolved here by name: a Server Component cannot pass a component
// function across the client boundary.
const icons = { folder: FolderPlus, upload: Upload } as const;

/**
 * A header button that opens a modal around one of the study-material forms.
 * The form itself is passed as children so the page stays a Server Component.
 */
export function MaterialDialog({ children, description, icon, label, title, tone = "secondary" }: { children: ReactNode; description: string; icon: keyof typeof icons; label: string; title: string; tone?: "primary" | "secondary" }) {
  const [open, setOpen] = useState(false);
  const Icon = icons[icon];
  return <>
    <button className={tone === "primary" ? "inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-200 transition hover:bg-blue-700" : "inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"} onClick={() => setOpen(true)} type="button"><Icon className="size-4" />{label}</button>
    {open ? <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/35 p-4 backdrop-blur-sm">
      <button aria-label="Close dialog" className="absolute inset-0 cursor-default" onClick={() => setOpen(false)} type="button" />
      <div aria-labelledby="material-dialog-title" aria-modal="true" className="relative z-10 max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-3xl border border-white/70 bg-white p-5 shadow-2xl sm:p-7" role="dialog">
        <div className="flex items-start justify-between gap-4">
          <div><h2 className="text-xl font-semibold tracking-tight text-slate-950" id="material-dialog-title">{title}</h2><p className="mt-1 text-sm leading-6 text-slate-500">{description}</p></div>
          <button aria-label="Close" className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700" onClick={() => setOpen(false)} type="button"><X className="size-5" /></button>
        </div>
        <div className="mt-5">{children}</div>
      </div>
    </div> : null}
  </>;
}
