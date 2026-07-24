export default function DashboardLoading() {
  return (
    <div aria-label="Loading dashboard" className="animate-pulse space-y-8">
      <div className="space-y-3">
        <div className="h-4 w-28 rounded bg-muted" />
        <div className="h-9 w-72 rounded bg-muted" />
        <div className="h-4 max-w-xl rounded bg-muted" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div className="h-36 rounded-lg border bg-card" key={index} />
        ))}
      </div>
    </div>
  );
}
