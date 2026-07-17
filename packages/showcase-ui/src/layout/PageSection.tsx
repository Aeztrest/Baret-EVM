import type { ReactNode } from "react";
import { cn } from "../lib/cn.js";
import { Container } from "./Container.js";
import { Eyebrow } from "./Eyebrow.js";

/**
 * A full marketing section: consistent vertical padding, an optional top
 * border between stacked sections, and an `id` for in-page nav.
 */
export function PageSection({
  id,
  children,
  className,
  bordered = true,
  container = true,
}: {
  id?: string;
  children: ReactNode;
  className?: string;
  bordered?: boolean;
  container?: boolean;
}) {
  return (
    <section
      id={id}
      className={cn("py-20 sm:py-28", bordered && "border-t border-ink-900/10", className)}
    >
      {container ? <Container>{children}</Container> : children}
    </section>
  );
}

/**
 * Eyebrow + big uppercase display title + optional muted lead. Left-aligned
 * by default; `align="center"` for hero-style centering.
 */
export function SectionHeading({
  index,
  eyebrow,
  title,
  lead,
  align = "left",
  className,
}: {
  index?: string;
  eyebrow: ReactNode;
  title: ReactNode;
  lead?: ReactNode;
  align?: "left" | "center";
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-5", align === "center" && "items-center text-center", className)}>
      <Eyebrow index={index} align={align}>
        {eyebrow}
      </Eyebrow>
      <h2 className="max-w-3xl text-balance font-display text-4xl font-bold uppercase leading-[0.95] tracking-[-0.03em] text-ink-900 sm:text-5xl lg:text-[4rem]">
        {title}
      </h2>
      {lead && (
        <p className={cn("max-w-xl text-pretty text-base leading-relaxed text-ink-500 sm:text-lg", align === "center" && "mx-auto")}>
          {lead}
        </p>
      )}
    </div>
  );
}
