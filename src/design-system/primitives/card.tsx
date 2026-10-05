import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-xl border border-slate-200/80 bg-card text-card-foreground shadow-[0_1px_2px_rgba(15,23,42,0.04),0_1px_3px_-1px_rgba(15,23,42,0.03)]",
        className,
      )}
      {...props}
    />
  );
}
