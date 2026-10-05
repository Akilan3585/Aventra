const tile = "rounded-[1.75rem] bg-slate-900/[0.035] p-1.5 ring-1 ring-slate-900/[0.05]";
const core = "h-full rounded-[calc(1.75rem-0.375rem)] bg-white";

export default function DashboardLoading() {
  return (
    <div aria-label="Loading dashboard" aria-live="polite" className="grid animate-pulse gap-4 xl:grid-cols-12">
      <div className={`h-[26rem] xl:col-span-8 ${tile}`}><div className="h-full rounded-[calc(1.75rem-0.375rem)] bg-slate-800" /></div>
      <div className={`h-[26rem] xl:col-span-4 ${tile}`}><div className={`grid place-items-center ${core}`}><div className="size-44 rounded-full border-[12px] border-slate-100" /></div></div>
      <div className={`h-64 xl:col-span-7 ${tile}`}><div className={core} /></div>
      <div className={`h-64 xl:col-span-5 ${tile}`}><div className={core} /></div>
      <div className={`h-52 xl:col-span-12 ${tile}`}><div className={core} /></div>
      <span className="sr-only">Loading campus data</span>
    </div>
  );
}
