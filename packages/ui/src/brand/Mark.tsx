/**
 * BARET brand glyph — a hard hat: the firewall protects before you sign.
 * Renders in signature graphite (#5B6169) by default; pass `mono` to inherit
 * `currentColor` (for tinted contexts).
 */

import type { SVGProps } from "react";

export interface MarkProps extends SVGProps<SVGSVGElement> {
  size?: number | string;
  /** Render single-color using currentColor instead of the signature graphite. */
  mono?: boolean;
}

export function Mark({ size = 24, mono = false, ...rest }: MarkProps) {
  const c = mono ? "currentColor" : "#5B6169";
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="BARET"
      {...rest}
    >
      <path
        d="M4 17c0-4.4 3.6-8 8-8s8 3.6 8 8"
        stroke={c}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M2.5 17.5h19" stroke={c} strokeWidth="2" strokeLinecap="round" />
      <circle cx="12" cy="9" r="1.4" fill={c} />
    </svg>
  );
}
