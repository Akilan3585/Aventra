import { Bot, Building2, GraduationCap, Wrench } from "lucide-react";

import { MetricCard } from "@/design-system";

const metrics = [
  {
    icon: GraduationCap,
    label: "Students monitored",
    value: "—",
    supportingText: "Connect the academic data source in the database milestone.",
  },
  {
    icon: Building2,
    label: "Rooms ready",
    value: "—",
    supportingText: "Room readiness will be calculated from verified facility records.",
  },
  {
    icon: Wrench,
    label: "Open maintenance",
    value: "—",
    supportingText: "Ticket metrics become available after maintenance setup.",
  },
  {
    icon: Bot,
    label: "Agent decisions",
    value: "—",
    supportingText: "Agent execution remains disabled until tools and audit storage exist.",
  },
] as const;

export default function DashboardPage() {
  return (
    <section aria-labelledby="dashboard-heading">
      <div>
        <p className="text-sm font-medium text-primary">Campus overview</p>
        <h1
          className="mt-1 text-3xl font-semibold tracking-tight"
          id="dashboard-heading"
        >
          Operations dashboard
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          The application foundation is active. Operational metrics will appear
          only after their verified data sources are connected.
        </p>
      </div>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <MetricCard key={metric.label} {...metric} />
        ))}
      </div>
    </section>
  );
}
