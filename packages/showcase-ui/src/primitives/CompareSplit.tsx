import type { ReactNode } from "react";
import { ArrowRight } from "lucide-react";
import { cn } from "../lib/cn.js";

export interface CompareSplitProps {
  leftLabel: string;
  rightLabel: string;
  left: ReactNode;
  right: ReactNode;
  /** "before" side reads as the unguarded/problem state. Subdued, no accent. */
  leftTone?: "neutral" | "bad";
  /** "after" side reads as Premon's addition. Accented. */
  rightTone?: "neutral" | "accent";
  connector?: boolean;
  className?: string;
}

const LEFT_TONE_STYLE: Record<NonNullable<CompareSplitProps["leftTone"]>, string> = {
  neutral: "border-ink-900/12 bg-white",
  bad: "border-bad/25 bg-bad/[0.04]",
};

const RIGHT_TONE_STYLE: Record<NonNullable<CompareSplitProps["rightTone"]>, string> = {
  neutral: "border-ink-900/12 bg-white",
  accent: "border-brand-500/30 bg-brand-50",
};

/** Two-track before/after layout: "the product alone" vs "the product with Premon". */
export function CompareSplit({
  leftLabel,
  rightLabel,
  left,
  right,
  leftTone = "neutral",
  rightTone = "neutral",
  connector = false,
  className,
}: CompareSplitProps) {
  return (
    <div className={cn("grid md:grid-cols-[1fr_auto_1fr] gap-4 md:gap-6 items-start", className)}>
      <div className={cn("rounded-card border p-5 space-y-3", LEFT_TONE_STYLE[leftTone])}>
        <p className="text-[10px] uppercase tracking-wider font-bold text-ink-400">{leftLabel}</p>
        {left}
      </div>

      {connector && (
        <div className="hidden md:flex items-center justify-center pt-8 text-ink-300" aria-hidden>
          <ArrowRight size={20} />
        </div>
      )}

      <div className={cn("rounded-card border p-5 space-y-3", RIGHT_TONE_STYLE[rightTone])}>
        <p className="text-[10px] uppercase tracking-wider font-bold text-brand-600">{rightLabel}</p>
        {right}
      </div>
    </div>
  );
}
