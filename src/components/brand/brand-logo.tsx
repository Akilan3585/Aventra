import Image from "next/image";

import { cn } from "@/lib/utils";

type BrandLogoProps = {
  className?: string;
  eager?: boolean;
};

export function BrandLogo({ className, eager = false }: BrandLogoProps) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <Image
        alt=""
        aria-hidden="true"
        className="size-10 shrink-0 object-contain"
        height={1192}
        loading={eager ? "eager" : "lazy"}
        sizes="40px"
        src="/brand/aventra-ai-official-logo.png"
        width={1320}
      />
      <span className="whitespace-nowrap text-[14px] font-bold tracking-[-0.035em] text-slate-950">
        Aventra <span className="text-blue-600">AI</span>
      </span>
    </span>
  );
}
