import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "react";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-[var(--line)] bg-[var(--card)] text-[var(--ink)] shadow-[0_8px_30px_rgba(22,24,26,0.04)]",
        className,
      )}
      {...props}
    />
  );
}
