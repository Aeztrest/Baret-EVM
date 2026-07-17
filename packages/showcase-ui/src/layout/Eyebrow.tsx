import type { ReactNode } from "react";
import { cn } from "../lib/cn.js";

/**
 * The signature section marker: a mono, wide-tracked, uppercase label led by
 * a tabular accent index and a short accent tick line.
 */
export function Eyebrow({
  index,
  children,
  className,
  align = "left",
}: {
  /** Two-digit section number, e.g. "03". */
  index?: string;
  children: ReactNode;
  className?: string;
  align?: "left" | "center";
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-2.5 font-mono text-[11px] uppercase tracking-[0.2em] text-ink-400",
        align === "center" && "justify-center",
        className,
      )}
    >
      {index && <span className="text-brand-500 tabular-nums">{index}</span>}
      <span aria-hidden className="h-px w-6 bg-brand-500" />
      <span>{children}</span>
    </div>
  );
}
