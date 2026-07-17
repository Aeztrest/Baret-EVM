import { useEffect, useState } from "react";
import { cn } from "../lib/cn.js";
import { toneStyle, type Tone } from "../utils/tone.js";

export interface MeterProps {
  label?: string;
  value: number;
  max: number;
  /** Custom value label, e.g. `(v, m) => \`${v} / ${m} USDC\``. Defaults to "v / m". */
  formatValue?: (value: number, max: number) => string;
  /** Fraction of max (0-1) at which the meter shifts to warn tone. Default 0.6. */
  warnAt?: number;
  /** Fraction of max (0-1) at which the meter shifts to bad tone. Default 0.8. */
  badAt?: number;
  size?: "compact" | "default";
  className?: string;
}

/** Premon's threshold-colored cap/allowance bar — the same component the real
 *  wallet's allowance ledger uses, so the marketing demo and the product match. */
export function Meter({
  label,
  value,
  max,
  formatValue,
  warnAt = 0.6,
  badAt = 0.8,
  size = "default",
  className,
}: MeterProps) {
  const frac = max > 0 ? value / max : 0;
  const pct = Math.min(100, Math.max(0, frac * 100));
  const tone: Tone = frac >= badAt ? "bad" : frac >= warnAt ? "warn" : "ok";
  const t = toneStyle(tone);

  const [width, setWidth] = useState(0);
  useEffect(() => {
    const id = requestAnimationFrame(() => setWidth(pct));
    return () => cancelAnimationFrame(id);
  }, [pct]);

  const valueLabel = formatValue ? formatValue(value, max) : `${value.toFixed(2)} / ${max.toFixed(2)}`;

  return (
    <div className={cn("space-y-1", className)}>
      {(label || valueLabel) && (
        <div className="flex items-center justify-between text-[10px]">
          {label && <span className="text-text-faint">{label}</span>}
          <span className="font-mono text-text-muted tabular-nums">{valueLabel}</span>
        </div>
      )}
      <div
        className={cn("rounded-pill overflow-hidden bg-ink-900/[0.06]", size === "compact" ? "h-1" : "h-1.5")}
        role="progressbar"
        aria-valuenow={Math.round(pct)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
      >
        <div
          className="h-full rounded-pill transition-[width] duration-300 ease-out"
          style={{ width: `${width}%`, background: t.dotColor }}
        />
      </div>
    </div>
  );
}
