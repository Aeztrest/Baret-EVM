/**
 * Scroll-reveal primitives. Content fades in with a small rise the first
 * time it scrolls into view (once). `RevealGroup` staggers its children.
 * Both respect `prefers-reduced-motion`.
 */
import { forwardRef, type ElementType, type ReactNode } from "react";
import {
  motion,
  useReducedMotion,
  type HTMLMotionProps,
  type Variants,
} from "framer-motion";

const EASE = [0.22, 1, 0.36, 1] as const;

export interface RevealProps extends Omit<HTMLMotionProps<"div">, "ref"> {
  children: ReactNode;
  y?: number;
  duration?: number;
  delay?: number;
  as?: ElementType;
}

export const Reveal = forwardRef<HTMLDivElement, RevealProps>(function Reveal(
  { children, y = 16, duration = 0.4, delay = 0, as, ...rest },
  ref,
) {
  const reduce = useReducedMotion();
  const MotionTag = as ? motion(as) : motion.div;
  return (
    <MotionTag
      ref={ref}
      initial={reduce ? false : { opacity: 0, y }}
      whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "0px 0px -10% 0px" }}
      transition={{ duration, delay, ease: EASE }}
      {...rest}
    >
      {children}
    </MotionTag>
  );
});

const groupVariants: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};
const itemVariants = (y: number, duration: number): Variants => ({
  hidden: { opacity: 0, y },
  show: { opacity: 1, y: 0, transition: { duration, ease: EASE } },
});

export interface RevealGroupProps extends Omit<HTMLMotionProps<"div">, "ref"> {
  children: ReactNode;
  y?: number;
  duration?: number;
  className?: string;
}

/** Wrap a set of `<RevealItem>` children to stagger them as one group. */
export function RevealGroup({ children, className, ...rest }: RevealGroupProps) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;
  return (
    <motion.div
      className={className}
      variants={groupVariants}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "0px 0px -10% 0px" }}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

export function RevealItem({ children, y = 16, duration = 0.4, className, ...rest }: RevealGroupProps) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;
  return (
    <motion.div className={className} variants={itemVariants(y, duration)} {...rest}>
      {children}
    </motion.div>
  );
}
