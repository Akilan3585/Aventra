import type { LucideIcon } from "lucide-react";

import { Card } from "@/design-system/primitives/card";

type MetricCardProps = {
  icon: LucideIcon;
  label: string;
  value: string;
  supportingText: string;
};

export function MetricCard({
  icon: Icon,
  label,
  supportingText,
  value,
}: MetricCardProps) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight">{value}</p>
        </div>
        <div className="rounded-md bg-accent p-2 text-accent-foreground">
          <Icon aria-hidden="true" className="size-4" />
        </div>
      </div>
      <p className="mt-4 text-xs text-muted-foreground">{supportingText}</p>
    </Card>
  );
}
