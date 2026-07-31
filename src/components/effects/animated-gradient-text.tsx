import type { ReactNode } from "react";

type AnimatedGradientTextProps = {
  children: ReactNode;
  className?: string;
};

export function AnimatedGradientText({
  children,
  className = "",
}: AnimatedGradientTextProps) {
  return (
    <span className={`animated-gradient-text ${className}`}>{children}</span>
  );
}
