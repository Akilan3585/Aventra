import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

type ShimmerLinkProps = ComponentProps<typeof Link> & {
  children: ReactNode;
};

export function ShimmerLink({ children, className = "", ...props }: ShimmerLinkProps) {
  return (
    <Link className={`shimmer-link ${className}`} {...props}>
      <span className="relative z-10 inline-flex items-center gap-2">{children}</span>
    </Link>
  );
}
