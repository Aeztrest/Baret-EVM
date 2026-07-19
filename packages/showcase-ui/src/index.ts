/**
 * @premon/showcase-ui
 *
 * Shared marketing-site primitives: layout scaffolding, scroll-reveal motion,
 * and the small set of "signature" components (Meter, StatTile, Verdict,
 * CompareSplit) reused between the showcase and the real wallet UI.
 */

export { cn } from "./lib/cn.js";
export { toneStyle, type Tone, type ToneStyle } from "./utils/tone.js";

export { Container } from "./layout/Container.js";
export { Eyebrow } from "./layout/Eyebrow.js";
export { PageSection, SectionHeading } from "./layout/PageSection.js";

export { Reveal, RevealGroup, RevealItem, type RevealProps, type RevealGroupProps } from "./motion/Reveal.js";
export { SpotlightCard, type SpotlightCardProps } from "./motion/SpotlightCard.js";

export { Meter, type MeterProps } from "./primitives/Meter.js";
export { StatTile, type StatTileProps } from "./primitives/StatTile.js";
export { Verdict, type VerdictProps, type VerdictTone } from "./primitives/Verdict.js";
export { CompareSplit, type CompareSplitProps } from "./primitives/CompareSplit.js";
export { DangerModeToggle, type DangerModeToggleProps } from "./primitives/DangerModeToggle.js";
