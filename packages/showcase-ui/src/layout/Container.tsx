import type { ElementType, ReactNode } from "react";
import { cn } from "../lib/cn.js";

/**
 * One consistent max width with generous side padding, so vertical rhythm
 * stays identical section to section.
 */
export function Container({
  children,
  className,
  as: Tag = "div",
}: {
  children: ReactNode;
  className?: string;
  as?: ElementType;
}) {
  return (
    <Tag className={cn("mx-auto w-full max-w-7xl px-6", className)}>
      {children}
    </Tag>
  );
}
