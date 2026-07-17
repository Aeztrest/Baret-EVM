/**
 * Premon home — white-first landing with Monad-purple + ink-black.
 * Voice: construction-site safety for your signature. "Sign safe. Build on."
 */

import { useRef } from "react";
import { Link } from "react-router-dom";
import { motion, useScroll, useTransform, useInView, useReducedMotion } from "framer-motion";
import {
  Shield, ShieldCheck, ShieldAlert, Eye, Lock, Activity,
  ArrowRight, ArrowUpRight, ChevronDown, AlertTriangle, CheckCircle2,
  Wallet, Layers, Radar, BookOpen, FileSearch,
  BellRing, KeyRound, Server, Github,
} from "lucide-react";
import {
  PageSection, SectionHeading, Reveal, RevealGroup, RevealItem,
  SpotlightCard, Meter, StatTile, CompareSplit,
} from "@premon/showcase-ui";
import { BackdropGrid, LandingHeader, LandingFooter, HazardRule, SOCIAL_GITHUB } from "../components/LandingChrome";

const SHOWCASE_SITES = [
  { path: "/scrybe",     name: "Scrybe",     tag: "x402 paywall",   threat: "Agent drift", flagship: true },
  { path: "/novaswap",   name: "NovaSwap",   tag: "DeFi swap",      threat: "Fund drain" },
  { path: "/pixeldrop",  name: "PixelDrop",  tag: "NFT mint",       threat: "Wallet drainer" },
  { path: "/orbityield", name: "OrbitYield", tag: "Liquid staking", threat: "Unverified pool" },
  { path: "/claimhub",   name: "ClaimHub",   tag: "Airdrop claim",  threat: "Malicious transfer" },
  { path: "/launchpad",  name: "LaunchPad",  tag: "Token launch",   threat: "Reverting honeypot" },
];

const DETECTOR_TICKER = [
  "Wallet drainer", "Unlimited approval", "setApprovalForAll", "Ownership transfer",
  "Excessive gas fee", "Known malicious address", "Memo omission", "Rug-pull pattern",
  "Drift detected", "Allowance overflow", "Facilitator impostor", "Unknown contract",
  "LP unlock", "Selfdestruct", "Phishing payload", "Silent re-sign",
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-paper text-ink-900 antialiased">
      <BackdropGrid />
      <LandingHeader cta={{ label: "Try the demo", to: "/showcase" }} />
      <Hero />
      <DetectorMarquee />
      <ThreePillars />
      <ProtocolWedge />
      <StatsBar />
      <ShowcaseStrip />
      <ComparisonSection />
      <SecuritySection />
      <FaqSection />
      <FinalCta />
      <LandingFooter />
    </div>
  );
}

/* ─────────────────────────── hero ─────────────────────────── */

function Hero() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [0, -60]);
  const opacity = useTransform(scrollYProgress, [0, 1], [1, 0.4]);

  return (
    <section ref={ref} className="relative pt-36 pb-24 px-6 overflow-hidden">
      <motion.div style={{ y, opacity }} className="max-w-7xl mx-auto grid lg:grid-cols-12 gap-12 items-center relative">
        <div className="lg:col-span-7">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] uppercase tracking-[0.18em] font-bold border border-brand-500/30 bg-brand-50 text-brand-700"
          >
            <span className="relative flex w-2 h-2">
              <span className="absolute inset-0 rounded-full bg-brand-500 animate-ping opacity-60" />
              <span className="relative w-2 h-2 rounded-full bg-brand-500" />
            </span>
            Live on EVM testnet
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.05 }}
            className="mt-6 font-display text-5xl sm:text-6xl lg:text-7xl font-bold tracking-[-0.03em] leading-[1.0]"
          >
            Sign safe.
            <br />
            <span className="text-brand-500">Build on.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.15 }}
            className="mt-7 text-lg sm:text-xl text-ink-500 max-w-xl leading-relaxed"
          >
            Premon is transaction foresight for EVM chains — every transaction is
            simulated, explained in plain language, and blocked when dangerous,
            before your keys ever touch it.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.25 }}
            className="mt-9 flex flex-wrap items-center gap-3"
          >
            <Link to="/showcase" className="btn-brand group">
              Open the live showcase
              <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
            </Link>
            <Link to="/docs" className="btn-outline">
              <BookOpen size={14} /> Read the docs
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.7, delay: 0.4 }}
            className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-ink-400"
          >
            <Trust icon={ShieldCheck} label="Pre-sign simulation" />
            <Trust icon={Eye} label="Plain-language findings" />
            <Trust icon={Lock} label="Stateful allowances" />
            <Trust icon={BellRing} label="Real-time drift alerts" />
          </motion.div>
        </div>

        <div className="lg:col-span-5">
          <LiveAnalysisCard />
        </div>
      </motion.div>
    </section>
  );
}

function Trust({ icon: Icon, label }: { icon: typeof Shield; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <Icon size={12} className="text-brand-600" />
      {label}
    </span>
  );
}

function LiveAnalysisCard() {
  const findings = [
    { sev: "danger", icon: AlertTriangle, label: "Transfers MON to unknown wallet", detail: "10.0 MON → 0xdead…beef" },
    { sev: "warn",   icon: ShieldAlert,   label: "Sets unlimited token approval",   detail: "USDC · spender unverified" },
    { sev: "ok",     icon: CheckCircle2,  label: "Contract reputation verified",    detail: "NovaSwap aggregator" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 24, rotateX: 12 }}
      animate={{ opacity: 1, y: 0, rotateX: 0 }}
      transition={{ duration: 0.9, delay: 0.2, ease: [0.2, 0.8, 0.2, 1] }}
      style={{ transformStyle: "preserve-3d" }}
      className="relative"
    >
      <div className="absolute -inset-6 rounded-[2rem] opacity-60 blur-2xl"
           style={{ background: "radial-gradient(closest-side, rgba(131, 110, 249,0.18), transparent 70%)" }} />

      {/* The analysis console renders dark — Premon's "inspection booth" inside the white page */}
      <div className="relative rounded-2xl overflow-hidden bg-ink-900 text-white shadow-lift">
        <HazardRule className="h-1" />
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/10">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-white/15" />
            <span className="w-2.5 h-2.5 rounded-full bg-white/15" />
            <span className="w-2.5 h-2.5 rounded-full bg-brand-500/70" />
          </div>
          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.2em] text-brand-400 font-semibold">
            <Activity size={10} /> Pre-sign inspection
          </div>
        </div>

        <div className="p-6">
          <div className="flex items-start justify-between mb-5">
            <div>
              <p className="text-[10px] uppercase tracking-[0.18em] text-white/40 font-semibold">Risk score</p>
              <div className="mt-1.5 flex items-baseline gap-2">
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1.0 }}
                  className="font-display text-5xl font-bold tracking-tight"
                >
                  87
                </motion.span>
                <span className="text-white/40 text-sm">/100</span>
                <span className="ml-2 text-xs px-2 py-0.5 rounded-md font-bold bg-brand-500 text-white">
                  HIGH
                </span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-[0.18em] text-white/40 font-semibold">Detectors</p>
              <p className="mt-1 text-sm font-mono text-white/70">3 / 25 fired</p>
            </div>
          </div>

          <div className="space-y-2">
            {findings.map((f, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 + i * 0.18 }}
                className="flex items-start gap-3 p-3 rounded-xl border"
                style={{
                  borderColor:
                    f.sev === "danger" ? "rgba(131, 110, 249,0.45)" :
                    f.sev === "warn"   ? "rgba(255,171,110,0.30)" :
                                         "rgba(255,255,255,0.10)",
                  background:
                    f.sev === "danger" ? "rgba(131, 110, 249,0.10)" :
                    f.sev === "warn"   ? "rgba(255,171,110,0.06)" :
                                         "rgba(255,255,255,0.03)",
                }}
              >
                <f.icon
                  size={14}
                  className={
                    f.sev === "danger" ? "text-brand-400 mt-0.5" :
                    f.sev === "warn"   ? "text-brand-300 mt-0.5" :
                                         "text-emerald-300 mt-0.5"
                  }
                />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white/90 leading-tight">{f.label}</p>
                  <p className="text-xs text-white/45 mt-0.5 font-mono">{f.detail}</p>
                </div>
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.2 }}
            className="mt-5 grid grid-cols-2 gap-2"
          >
            <button className="py-2.5 rounded-xl text-sm font-semibold border border-white/15 text-white/65 hover:bg-white/[0.05]">
              Cancel
            </button>
            <button className="py-2.5 rounded-xl text-sm font-bold bg-brand-500 hover:bg-brand-600 text-white flex items-center justify-center gap-1.5 transition-colors">
              <ShieldCheck size={14} /> Block & revoke
            </button>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}

/* ─────────────────────────── marquee ─────────────────────────── */

function DetectorMarquee() {
  const reduce = useReducedMotion();

  if (reduce) {
    return (
      <section className="border-y border-ink-900/10 bg-bone px-6 py-5">
        <div className="mx-auto flex max-w-7xl flex-wrap gap-x-8 gap-y-2">
          {DETECTOR_TICKER.map((label) => (
            <span key={label} className="inline-flex items-center gap-2 font-mono text-sm text-ink-500">
              <Radar size={12} className="text-brand-500" />
              {label}
            </span>
          ))}
        </div>
      </section>
    );
  }

  const items = [...DETECTOR_TICKER, ...DETECTOR_TICKER];
  return (
    <section className="relative border-y border-ink-900/10 bg-bone py-5 overflow-hidden">
      <div className="absolute inset-y-0 left-0 w-24 z-10 pointer-events-none"
           style={{ background: "linear-gradient(90deg,#FAF8F4 10%,transparent)" }} />
      <div className="absolute inset-y-0 right-0 w-24 z-10 pointer-events-none"
           style={{ background: "linear-gradient(-90deg,#FAF8F4 10%,transparent)" }} />
      <motion.div
        className="flex gap-10 whitespace-nowrap"
        animate={{ x: ["0%", "-50%"] }}
        transition={{ duration: 38, repeat: Infinity, ease: "linear" }}
      >
        {items.map((label, i) => (
          <span key={i} className="inline-flex items-center gap-2 text-sm text-ink-500 font-mono">
            <Radar size={12} className="text-brand-500" />
            {label}
            <span className="text-ink-300">·</span>
          </span>
        ))}
      </motion.div>
    </section>
  );
}

/* ─────────────────────────── three pillars ─────────────────────────── */

function ThreePillars() {
  const pillars = [
    {
      icon: FileSearch,
      title: "Pre-sign Guard",
      body: "Premon decodes and simulates every transaction on the server, then runs 25+ risk detectors. The popup explains each finding in one sentence.",
      points: ["Server simulation", "25+ risk detectors", "Policy DSL gate"],
    },
    {
      icon: Layers,
      title: "Authorization Ledger",
      body: "Every approval becomes a row with a cap, a clock, and a live progress bar. No more unlimited approval you forgot about.",
      points: ["Rolling caps", "One-tap revoke", "Pause / resume"],
      demo: true,
    },
    {
      icon: Radar,
      title: "Post-sign Monitor",
      body: "Premon subscribes to your wallet over a WebSocket. If something moves that it didn't sign, you get a browser notification right away.",
      points: ["WebSocket subscribe", "Drift detection", "Cold-boot backfill"],
    },
  ];

  return (
    <PageSection id="product">
      <Reveal>
        <SectionHeading
          index="01"
          eyebrow="The product"
          title="Three layers, one signature"
          lead="Premon runs three checks before your keys move. Each one stands on its own. Together they close the gap that lets drainers, stale approvals, and silent agents through today."
        />
      </Reveal>

      <RevealGroup className="mt-12 grid gap-4 md:grid-cols-3">
        {pillars.map((p) => (
          <RevealItem key={p.title}>
            <PillarCard {...p} />
          </RevealItem>
        ))}
      </RevealGroup>
    </PageSection>
  );
}

function PillarCard({
  icon: Icon, title, body, points, demo,
}: {
  icon: typeof Shield; title: string; body: string; points: string[]; demo?: boolean;
}) {
  return (
    <SpotlightCard tilt className="h-full p-7">
      <span className="grid h-10 w-10 place-items-center rounded-input bg-ink-900 text-brand-400">
        <Icon size={17} />
      </span>
      <h3 className="mt-6 font-display text-2xl font-bold tracking-tight text-ink-900">{title}</h3>
      <p className="mt-3 text-sm leading-relaxed text-ink-500">{body}</p>

      <ul className="mt-6 space-y-1.5">
        {points.map((pt) => (
          <li key={pt} className="flex items-center gap-2 text-xs font-medium text-ink-600">
            <span className="h-1.5 w-1.5 rounded-sm bg-brand-500" />
            {pt}
          </li>
        ))}
      </ul>

      {demo && (
        <div className="mt-6 border-t border-ink-900/10 pt-5">
          <Meter
            label="acme-dex.xyz daily cap"
            value={62}
            max={100}
            formatValue={(v, m) => `${v} / ${m} USDC`}
          />
        </div>
      )}
    </SpotlightCard>
  );
}

/* ─────────────────────────── the x402 wedge ─────────────────────────── */

const TRACK_STEPS = ["402 Challenge", "Sign", "Pay", "Settle"];

const WEDGE_CALLOUTS = [
  {
    icon: Layers,
    gap: "Silent agent drift. An agent re-signs micro-payments every minute. The protocol has no allowance object, so nothing shows the running total.",
    response: "Rolling per-merchant caps by the hour and the day. Every signature spends down a real number. Hit the cap and Premon blocks the next one.",
  },
  {
    icon: ShieldAlert,
    gap: "Look-alike asset swap. A merchant serves a token labeled USDC from the wrong contract. The spec checks that the asset field matches, not which issuer is real.",
    response: "A wallet-side asset allowlist seeded with the canonical USDC. Unknown token contracts need an explicit override before you sign.",
  },
  {
    icon: KeyRound,
    gap: "Facilitator impersonation. If a fake facilitator relays the payment, x402 alone has no way to tell it apart from the real one.",
    response: "A facilitator allowlist enforced at sign time. An unrecognized facilitator is blocked before the payment ever leaves your wallet.",
  },
];

function ProtocolWedge() {
  return (
    <section id="wedge" className="border-y border-ink-900/10 bg-bone py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-6">
        <Reveal>
          <div className="mb-14 flex max-w-3xl flex-col gap-5">
            <p className="flex items-center gap-2.5 font-mono text-[11px] uppercase tracking-[0.2em] text-ink-400">
              <span className="text-brand-500 tabular-nums">02</span>
              <span aria-hidden className="h-px w-6 bg-brand-500" />
              <span>The x402 gap</span>
            </p>
            <h2 className="font-display text-4xl font-bold uppercase leading-[0.95] tracking-[-0.03em] text-ink-900 md:text-5xl">
              x402 is stateless. Premon isn't.
            </h2>
            <p className="leading-relaxed text-ink-500">
              x402 is the agentic-payment protocol our extension speaks natively. By
              design it's a <strong className="text-ink-900">stateless</strong> challenge,
              pay, settle handshake. Every payment is a fresh signed transfer. No
              allowance object, no revoke endpoint, no spend cap in the protocol
              itself. Premon isn't the protocol. It's a{" "}
              <strong className="text-ink-900">stateful control plane</strong> on top of
              it, and it adds the caps x402 leaves out on purpose.
            </p>
          </div>
        </Reveal>

        <Reveal delay={0.1}>
          <CompareSplit
            leftLabel="x402 alone"
            rightLabel="x402 + Premon"
            leftTone="neutral"
            rightTone="accent"
            left={<Track steps={TRACK_STEPS} note="Each step forgets the last. No memory between calls." />}
            right={
              <TrackWithGuard
                steps={TRACK_STEPS}
                note="The ledger below is the one thing that remembers, across every call."
              />
            }
          />
        </Reveal>

        <RevealGroup className="mt-12 grid gap-4 md:grid-cols-3">
          {WEDGE_CALLOUTS.map((c) => (
            <RevealItem key={c.gap.slice(0, 12)}>
              <div className="h-full rounded-card border border-ink-900/10 bg-white p-5">
                <c.icon size={16} className="text-brand-500" />
                <p className="mt-3 font-mono text-[11px] font-medium uppercase tracking-wider text-ink-400">
                  Protocol gap
                </p>
                <p className="mt-1 text-sm leading-relaxed text-ink-500">{c.gap}</p>
                <p className="mt-4 font-mono text-[11px] font-medium uppercase tracking-wider text-brand-600">
                  Premon's response
                </p>
                <p className="mt-1 text-sm font-medium leading-relaxed text-ink-900">{c.response}</p>
              </div>
            </RevealItem>
          ))}
        </RevealGroup>
      </div>
    </section>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-input border border-ink-900/10 bg-white px-2.5 py-1.5 font-mono text-[11px] font-semibold text-ink-500">
      {children}
    </span>
  );
}

function Track({ steps, note }: { steps: string[]; note: string }) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-1.5">
        {steps.map((s, i) => (
          <span key={s} className="flex items-center gap-1.5">
            <Chip>{s}</Chip>
            {i < steps.length - 1 && <span className="text-xs text-ink-300">→</span>}
          </span>
        ))}
      </div>
      <p className="text-xs leading-relaxed text-ink-500">{note}</p>
    </div>
  );
}

function TrackWithGuard({ steps, note }: { steps: string[]; note: string }) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-1.5">
        {steps.map((s, i) => (
          <span key={s} className="flex items-center gap-1.5">
            <Chip>{s}</Chip>
            {i === 1 && (
              <>
                <ArrowRight size={11} className="-rotate-90 text-brand-500" />
                <span className="rounded-input bg-brand-500 px-2.5 py-1.5 font-mono text-[11px] font-bold text-white">
                  Premon guard
                </span>
              </>
            )}
            {i < steps.length - 1 && <span className="text-xs text-ink-300">→</span>}
          </span>
        ))}
      </div>
      <p className="text-xs leading-relaxed text-ink-500">{note}</p>
      <div className="pt-1">
        <Meter
          label="scrybe.premon.dev daily cap"
          value={0.7}
          max={1.0}
          formatValue={(v, m) => `${v.toFixed(2)} / ${m.toFixed(2)} USDC`}
        />
      </div>
    </div>
  );
}

/* ─────────────────────────── stats ─────────────────────────── */

function StatsBar() {
  const stats = [
    { value: "25+", label: "Risk detectors" },
    { value: "6", label: "Threat scenarios" },
    { value: "3", label: "Defense layers" },
    { value: "1", label: "Solidity contract on testnet" },
  ];
  return (
    <section className="px-6 pb-24">
      <div className="mx-auto max-w-7xl">
        <Reveal>
          <div className="grid grid-cols-2 gap-px overflow-hidden rounded-card border border-ink-900/10 bg-ink-900/10 shadow-card md:grid-cols-4">
            {stats.map((s) => (
              <div key={s.label} className="flex flex-col items-center bg-white px-6 py-10 text-center">
                <StatTile label={s.label} value={s.value} variant="display" />
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ─────────────────────────── comparison ─────────────────────────── */

const COMPARE_ROWS = [
  {
    label: "Before you sign",
    plain: "A contract address and a Confirm button. The chain decides the rest.",
    premon: "A decoded transaction, a simulation, and a verdict: Safe / Caution / Blocked.",
  },
  {
    label: "Unlimited approvals",
    plain: "Granted once, live until you remember to revoke them.",
    premon: "Every approval is a row with a cap and a clock. One tap to pause or revoke.",
  },
  {
    label: "Agent payments",
    plain: "An agent can re-sign micro-payments all day with no ceiling.",
    premon: "Per-site caps by the hour and the day, checked at sign time and again on-chain.",
  },
  {
    label: "After you sign",
    plain: "You find out what happened from a block explorer.",
    premon: "Premon watches your wallet and alerts you when something moves that it didn't sign.",
  },
];

function CompareColumn({ rows }: { rows: { label: string; text: string }[] }) {
  return (
    <ul className="space-y-4">
      {rows.map((r) => (
        <li key={r.label} className="border-t border-ink-900/10 pt-3 first:border-t-0 first:pt-0">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-400">{r.label}</p>
          <p className="mt-1 text-sm leading-relaxed text-ink-800">{r.text}</p>
        </li>
      ))}
    </ul>
  );
}

function ComparisonSection() {
  return (
    <PageSection id="compare">
      <Reveal>
        <SectionHeading
          index="04"
          eyebrow="Side by side"
          title="The same signature, two wallets"
          lead="No wallet is bashed here. This is what changes when a pre-sign check sits between the app and your keys."
        />
      </Reveal>
      <Reveal delay={0.1}>
        <div className="mt-12">
          <CompareSplit
            leftLabel="A standard EVM wallet"
            rightLabel="Premon"
            leftTone="neutral"
            rightTone="accent"
            left={<CompareColumn rows={COMPARE_ROWS.map((r) => ({ label: r.label, text: r.plain }))} />}
            right={<CompareColumn rows={COMPARE_ROWS.map((r) => ({ label: r.label, text: r.premon }))} />}
          />
        </div>
      </Reveal>
    </PageSection>
  );
}

/* ─────────────────────── security and privacy ─────────────────────── */

const SECURITY_POINTS = [
  {
    icon: Server,
    title: "Analysis runs on a server",
    body: "The extension sends the unsigned transaction to the analyze server for decoding and simulation. The server sees that unsigned transaction. It never sees your keys.",
  },
  {
    icon: ShieldCheck,
    title: "Nothing signs without you",
    body: "The verdict comes back before the popup asks you anything. Nothing is signed until you approve. When Premon says Blocked, it refuses to sign.",
  },
  {
    icon: KeyRound,
    title: "Keys stay on your device",
    body: "Your keys are encrypted at rest in the extension's local storage. They are never sent to the analyze server or anywhere else.",
  },
  {
    icon: Eye,
    title: "Simulation is a preflight",
    body: "Verdicts reflect simulated state, not a guarantee. Gas, mempool ordering, and network conditions can make real execution diverge from the simulation.",
  },
];

function SecuritySection() {
  return (
    <PageSection id="security" className="border-t border-ink-900/10 bg-bone" bordered={false}>
      <Reveal>
        <SectionHeading
          index="05"
          eyebrow="Security and privacy"
          title="What runs where"
          lead="You are trusting Premon with the moment before your keys move, so here is exactly what it does with it."
        />
      </Reveal>

      <RevealGroup className="mt-12 grid gap-4 sm:grid-cols-2">
        {SECURITY_POINTS.map((p) => (
          <RevealItem key={p.title}>
            <SpotlightCard className="h-full p-6">
              <p.icon size={16} className="text-brand-500" />
              <h3 className="mt-4 font-display text-lg font-bold tracking-tight text-ink-900">
                {p.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-500">{p.body}</p>
            </SpotlightCard>
          </RevealItem>
        ))}
      </RevealGroup>

      <Reveal delay={0.1}>
        <div className="mt-8 flex flex-col items-start justify-between gap-4 rounded-card border border-ink-900/10 bg-white p-6 sm:flex-row sm:items-center">
          <p className="text-sm text-ink-900">
            <span className="font-semibold">No audit yet.</span>{" "}
            <span className="text-ink-500">The code is open. Read it.</span>
          </p>
          <a
            href={SOCIAL_GITHUB}
            target="_blank"
            rel="noreferrer"
            className="inline-flex shrink-0 items-center gap-2 rounded-input border border-ink-900/10 bg-bone px-4 py-2.5 text-sm font-semibold text-ink-900 transition-colors hover:border-ink-900/30"
          >
            <Github size={14} /> View the source
          </a>
        </div>
      </Reveal>
    </PageSection>
  );
}

/* ─────────────────────────── faq ─────────────────────────── */

const FAQ_ITEMS = [
  {
    q: "What happens if the analyze server is down?",
    a: "Premon tells you the transaction is unchecked and leaves the decision to you. It never fakes a verdict, and it never signs on your behalf.",
  },
  {
    q: "Does it work alongside MetaMask or other wallets?",
    a: "Yes. Premon registers as an EIP-1193 / EIP-6963 provider, so it shows up in the same wallet picker next to the ones you already use. Install it without uninstalling anything.",
  },
  {
    q: "Is it free?",
    a: "Yes. Premon is free and open source under the MIT license.",
  },
  {
    q: "Mainnet when?",
    a: "Testnet today. Mainnet comes after the browser-store listings land and after more real-world testing. We would rather ship the firewall late than wrong.",
  },
  {
    q: "What does Blocked actually do?",
    a: "Premon refuses to sign. You can override it, but the override is a separate, deliberate step, and it is logged so you can see it later.",
  },
  {
    q: "Where are my keys?",
    a: "Encrypted on your device. They are never sent anywhere, not to the analyze server and not to us.",
  },
];

function FaqSection() {
  return (
    <PageSection id="faq">
      <Reveal>
        <SectionHeading
          index="06"
          eyebrow="FAQ"
          title="Fair questions"
          lead="The things people ask before they trust a wallet with the sign button."
        />
      </Reveal>

      <Reveal delay={0.1}>
        <div className="mt-12 divide-y divide-ink-900/10 overflow-hidden rounded-card border border-ink-900/10 bg-white">
          {FAQ_ITEMS.map((item) => (
            <details key={item.q} className="group">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-6 py-5 text-sm font-semibold text-ink-900 transition-colors hover:bg-bone [&::-webkit-details-marker]:hidden">
                {item.q}
                <ChevronDown
                  size={16}
                  className="shrink-0 text-ink-400 transition-transform group-open:rotate-180"
                />
              </summary>
              <p className="px-6 pb-5 text-sm leading-relaxed text-ink-500">{item.a}</p>
            </details>
          ))}
        </div>
      </Reveal>
    </PageSection>
  );
}

/* ─────────────────────────── showcase strip ─────────────────────────── */

function ShowcaseStrip() {
  return (
    <PageSection id="showcase">
      <Reveal>
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <SectionHeading
            index="03"
            eyebrow="Try it yourself"
            title="Six fake-but-real dApps"
            lead="Connect a wallet and click a button. Premon catches the threat live. No slides, no mocks."
          />
          <Link
            to="/showcase"
            className="inline-flex shrink-0 items-center gap-2 rounded-input border border-ink-900/10 bg-white px-4 py-2.5 text-sm font-semibold text-ink-900 transition-colors hover:border-ink-900/30"
          >
            Open the showcase <ArrowRight size={14} className="text-brand-500" />
          </Link>
        </div>
      </Reveal>

      <RevealGroup className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {SHOWCASE_SITES.map((site) => (
          <RevealItem key={site.path}>
            <SiteCard {...site} />
          </RevealItem>
        ))}
      </RevealGroup>
    </PageSection>
  );
}

function SiteCard({ path, name, tag, threat, flagship }: { path: string; name: string; tag: string; threat: string; flagship?: boolean }) {
  return (
    <SpotlightCard className="h-full">
      <Link to={path} className="absolute inset-0 z-20" aria-label={`Open the ${name} demo`} />
      <div className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="grid h-7 w-7 place-items-center rounded-input bg-bone font-mono text-xs font-bold text-ink-500 transition-colors group-hover/spot:text-ink-900">
                {name[0]}
              </span>
              <p className="font-display font-bold tracking-tight text-ink-900">{name}</p>
              {flagship && (
                <span className="rounded-pill bg-brand-500 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-white">
                  Flagship
                </span>
              )}
            </div>
            <p className="mt-2 font-mono text-[11px] uppercase tracking-wider text-ink-400">{tag}</p>
          </div>
          <ArrowUpRight
            size={16}
            className="text-ink-300 transition-all group-hover/spot:-translate-y-0.5 group-hover/spot:translate-x-0.5 group-hover/spot:text-brand-500"
          />
        </div>

        <div className="mt-5 flex items-center gap-2 border-t border-ink-900/10 pt-4 text-[11px] text-ink-500">
          <ShieldAlert size={11} className="text-ink-400" />
          Catches: <span className="font-semibold text-ink-900">{threat}</span>
        </div>
      </div>
    </SpotlightCard>
  );
}

/* ─────────────────────────── final cta ─────────────────────────── */

function FinalCta() {
  return (
    <section className="px-6 pt-10 pb-24">
      <div className="relative max-w-7xl mx-auto rounded-3xl overflow-hidden bg-ink-900 text-white shadow-lift">
        <HazardRule />
        <div
          aria-hidden
          className="absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)",
            backgroundSize: "44px 44px",
            maskImage: "radial-gradient(ellipse at 50% 100%, transparent 30%, black 80%)",
            WebkitMaskImage: "radial-gradient(ellipse at 50% 100%, transparent 30%, black 80%)",
          }}
        />
        <div className="relative max-w-3xl p-12 md:p-20">
          <Eye size={26} className="text-brand-500" />
          <h2 className="mt-6 font-display text-4xl md:text-6xl font-bold tracking-tight leading-[1.02]">
            See it coming.<br /> <span className="text-brand-500">Sign with sight.</span>
          </h2>
          <p className="mt-6 text-white/60 text-lg max-w-xl">
            Open the showcase, connect a wallet, and watch Premon refuse a wallet drainer in real time.
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-3">
            <Link to="/showcase" className="btn-brand">
              <Wallet size={14} /> Try the demo
            </Link>
            <Link
              to="/install"
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl text-sm font-semibold border border-white/20 text-white hover:bg-white/[0.06] hover:border-white/40 transition"
            >
              Install the wallet <ArrowRight size={14} />
            </Link>
          </div>
          <p className="mt-8 text-xs text-white/50">
            Free and open source, MIT licensed. On EVM testnet today. Store review pending.
          </p>
        </div>
      </div>
    </section>
  );
}
