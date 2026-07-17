import type { ReactNode } from "react";
import { cn } from "../lib/cn.js";

export interface StatTileProps {
  label: string;
  value: ReactNode;
  suffix?: string;
  icon?: ReactNode;
  variant?: "display" | "mono";
  className?: string;
}

export function StatTile({ label, value, suffix, icon, variant = "display", className }: StatTileProps) {
  return (
    <div className={cn("flex flex-col items-center gap-2 text-center", className)}>
      {icon && (
        <span
          className="w-8 h-8 rounded-input flex items-center justify-center text-brand-600 bg-brand-50"
          aria-hidden
        >
          {icon}
        </span>
      )}
      <div className="flex items-baseline gap-1">
        <span
          className={cn(
            "font-extrabold tracking-tight text-ink-900 leading-none",
            variant === "mono" ? "font-mono tabular-nums text-2xl" : "font-display text-5xl",
          )}
        >
          {value}
        </span>
        {suffix && <span className="text-xs font-semibold text-ink-400">{suffix}</span>}
      </div>
      <span className="text-[11px] uppercase tracking-[0.22em] font-bold text-ink-400">{label}</span>
    </div>
  );
}
