import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Rocket, Timer, Users, ShieldCheck, ExternalLink, FileSearch,
  Coins, TrendingUp, Calendar, Lock, CheckCircle2, Circle,
  Building2, Award, Target, Layers, Globe, Wallet,
} from "lucide-react";
import { DangerModeToggle } from "@premon/showcase-ui";
import { useWallet } from "../../wallet/context";
import { SiteShell } from "../../components/SiteShell";
import { ResultOverlay, type ResultState } from "../../premon/ResultOverlay";
import { RiskPreview } from "../../premon/RiskPreview";
import { buildScenario } from "../../premon/transactions";
import type { TxRequest } from "@premon/wallet-adapter";

const THEME = {
  primary: "#C24E02",
  accent: "#FF6B00",
  bg: "#FFF9F4",
  name: "LaunchPad",
  logo: (
    <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white" style={{ background: "linear-gradient(135deg,#FF6B00,#C24E02)" }}>
      <Rocket size={15} />
    </div>
  ),
};

// Fixed launch target so the countdown always shows time remaining.
const LAUNCH_AT = Date.now() + (2 * 86400 + 14 * 3600 + 38 * 60 + 55) * 1000;

function useCountdown(target: number) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const diff = Math.max(0, target - now);
  const s = Math.floor(diff / 1000);
  return {
    days: Math.floor(s / 86400),
    hours: Math.floor((s % 86400) / 3600),
    minutes: Math.floor((s % 3600) / 60),
    seconds: s % 60,
  };
}

// Decorative-only project identities (mock demo data; not read anywhere else).
const PROJECTS = {
  safe: { name: "NovaBridge", ticker: "NOVA", priceUsd: 0.05 },
  danger: { name: "ScamToken", ticker: "SCAM", priceUsd: 0.0001 },
};

export default function LaunchPad() {
  const { connected, openWalletModal, walletAddress, adapter } = useWallet();
  const [contribution, setContribution] = useState("500");
  const [dangerous, setDangerous] = useState(false);
  const [resultState, setResultState] = useState<ResultState>("idle");
  const [signature, setSignature] = useState<string | null>(null);
  const [resultMessage, setResultMessage] = useState<string | null>(null);
  const [previewTx, setPreviewTx] = useState<TxRequest | null>(null);
  const success = signature !== null;

  const countdown = useCountdown(LAUNCH_AT);

  const raised = dangerous ? 82000 : 1_240_000;
  const goal = 2_000_000;
  const pct = (raised / goal) * 100;
  const participants = dangerous ? 12 : 3847;
  const project = dangerous ? PROJECTS.danger : PROJECTS.safe;
  const scenarioLabel = dangerous
    ? `Contribute ${contribution} USDC to a rug-pull launchpad (danger scenario)`
    : `Contribute ${contribution} USDC to a vetted token launch`;

  function reset() {
    setSignature(null);
    setResultMessage(null);
    setResultState("idle");
  }

  async function handleBuy() {
    if (!connected || !walletAddress) { openWalletModal(); return; }
    try {
      const built = await buildScenario(dangerous ? "launchpad-danger" : "launchpad-safe", walletAddress);
      setPreviewTx(built.transaction);
    } catch (e) {
      setResultState("error");
      setResultMessage(e instanceof Error ? e.message : String(e));
    }
  }

  async function sendViaPremon() {
    if (!previewTx) return;
    const tx = previewTx;
    setPreviewTx(null);
    setResultState("awaiting"); setSignature(null); setResultMessage(null);
    try {
      const { signature: sig } = await adapter.signAndSendTransaction(tx);
      setSignature(sig); setResultState("confirmed");
    } catch (e) {
      if ((e instanceof Error && /SIGN_REJECTED|POPUP_CLOSED|User cancel|declined/.test(e.message))) {
        setResultState("blocked"); setResultMessage(e.message);
      } else {
        setResultState("error"); setResultMessage(e instanceof Error ? e.message : String(e));
      }
    }
  }
  const sendRaw = sendViaPremon;

  // The danger project is styled as polished as the safe one on purpose. The
  // red flags are the quiet kind Premon reads for you: an 87% team allocation
  // with no vesting buried in the tokenomics, an unaudited contract, and an
  // "audit" that never actually happened.
  const tokenomics = dangerous
    ? [
        { label: "Team · no vesting", pct: 87, color: "#ef4444" },
        { label: "Sale", pct: 8, color: "#f97316" },
        { label: "Liquidity", pct: 5, color: "#fca5a5" },
      ]
    : [
        { label: "Public Sale", pct: 20, color: "#FF6B00" },
        { label: "Team · 24mo vest", pct: 15, color: "#C24E02" },
        { label: "Ecosystem", pct: 35, color: "#FF8A33" },
        { label: "Liquidity", pct: 30, color: "#FFB37A" },
      ];

  const TOTAL_SUPPLY = 1_000_000_000;
  const tagline = dangerous
    ? "Revolutionary memecoin with 1000x potential. First mover in the nothing market."
    : "Cross-chain bridge enabling seamless asset transfers across 12 networks on Monad. Audited by OtterSec.";

  const saleDetails = [
    { icon: Coins, label: "Token price", value: dangerous ? "$0.0001" : "$0.05" },
    { icon: Target, label: "Total raise · hard cap", value: "$2,000,000" },
    { icon: Wallet, label: "Allocation / wallet", value: "$100 – $10,000" },
    { icon: Globe, label: "Accepted asset", value: "USDC (Monad)" },
    { icon: Lock, label: "Vesting", value: dangerous ? "None · 100% at TGE" : "10% TGE · 3-mo cliff · 12-mo linear" },
    { icon: Calendar, label: "TGE / listing", value: dangerous ? "TBA" : "Aug 2026" },
  ];

  // Vesting schedule: each group's tokens release over the timeline.
  // segments sum to 100 (share of the release timeline), keyed by kind.
  const vesting = dangerous
    ? [{ label: "All allocations", segs: [{ w: 100, kind: "tge" as const }] }]
    : [
        { label: "Public Sale", segs: [{ w: 10, kind: "tge" as const }, { w: 15, kind: "cliff" as const }, { w: 75, kind: "linear" as const }] },
        { label: "Team", segs: [{ w: 0, kind: "tge" as const }, { w: 50, kind: "cliff" as const }, { w: 50, kind: "linear" as const }] },
        { label: "Ecosystem", segs: [{ w: 5, kind: "tge" as const }, { w: 20, kind: "cliff" as const }, { w: 75, kind: "linear" as const }] },
        { label: "Liquidity", segs: [{ w: 100, kind: "tge" as const }] },
      ];

  const roadmap = dangerous
    ? [
        { phase: "Private Round", date: "Q1 2026", status: "done" as const, desc: "Closed round with strategic partners" },
        { phase: "Public Sale", date: "Now", status: "active" as const, desc: "IDO live now on LaunchPad" },
        { phase: "TGE", date: "TBA", status: "upcoming" as const, desc: "Date to be announced" },
        { phase: "Mainnet", date: "TBA", status: "upcoming" as const, desc: "Timeline under review" },
      ]
    : [
        { phase: "Seed Round", date: "Q4 2025", status: "done" as const, desc: "$1.2M raised across 6 funds" },
        { phase: "Public Sale", date: "Now", status: "active" as const, desc: "IDO live now on LaunchPad" },
        { phase: "TGE", date: "Aug 2026", status: "upcoming" as const, desc: "Token generation + airdrop" },
        { phase: "CEX Listing", date: "Q4 2026", status: "upcoming" as const, desc: "Tier-1 exchange listing" },
      ];

  const team = dangerous
    ? [
        { name: "Cirrus", role: "Founder · prefers to stay private", initials: "C" },
        { name: "Stratus", role: "Lead engineer · prefers to stay private", initials: "S" },
      ]
    : [
        { name: "Elena Vasquez", role: "CEO · ex-Stripe", initials: "EV" },
        { name: "Marcus Chen", role: "CTO · ex-Polygon", initials: "MC" },
        { name: "Priya Nair", role: "Head of BD · ex-Circle", initials: "PN" },
        { name: "Tom Blake", role: "Lead Eng · ex-Coinbase", initials: "TB" },
      ];

  const backers = dangerous
    ? ["Undisclosed private investors"]
    : ["Monad Foundation", "OtterSec", "Wintermute", "Delphi Digital", "Fenbushi"];

  const projectStats = [
    { icon: Layers, label: "FDV", value: dangerous ? "$200M" : "$50M" },
    { icon: Target, label: "MCap at listing", value: dangerous ? "TBA" : "$10M" },
    { icon: Coins, label: "Initial circ. supply", value: dangerous ? "3%" : "20%" },
    { icon: TrendingUp, label: "Listing price", value: dangerous ? "$0.0003" : "$0.06" },
    { icon: Globe, label: "Supported networks", value: dangerous ? "1" : "12" },
  ];

  const cardBase = "rounded-2xl border border-ink-900/10 bg-white/80 backdrop-blur-sm";
  const sectionTitle = "mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-ink-500";

  return (
    <SiteShell
      theme={THEME}
      navLinks={[
        { label: "Active Launches", href: "#launches" },
        { label: "Upcoming", href: "#upcoming" },
        { label: "Portfolio", href: "#portfolio" },
        { label: "Leaderboard", href: "#leaderboard" },
      ]}
    >
      <ResultOverlay
        state={resultState}
        signature={signature}
        message={resultMessage}
        onClose={() => setResultState("idle")}
      />

      <div className="relative min-h-screen px-4 pb-28 pt-10 text-ink-900">
        {/* Glow + grid backdrop */}
        <div
          className="pointer-events-none fixed inset-0"
          style={{ background: "radial-gradient(ellipse 70% 45% at 50% -5%, rgba(255,107,0,0.10) 0%, transparent 60%)" }}
        />
        <div
          className="pointer-events-none fixed inset-0 opacity-50"
          style={{
            backgroundImage:
              "linear-gradient(rgba(194,78,2,0.06) 1px,transparent 1px),linear-gradient(90deg,rgba(194,78,2,0.06) 1px,transparent 1px)",
            backgroundSize: "56px 56px",
            maskImage: "radial-gradient(ellipse 80% 60% at 50% 0%, black, transparent 75%)",
            WebkitMaskImage: "radial-gradient(ellipse 80% 60% at 50% 0%, black, transparent 75%)",
          }}
        />

        <div className="relative mx-auto max-w-5xl space-y-6 md:space-y-8">
          {/* ───────── Hero ───────── */}
          <motion.section
            id="launches"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative scroll-mt-24 overflow-hidden rounded-3xl p-6 sm:p-8"
            style={{
              border: "1px solid rgba(255,107,0,0.30)",
              background: "linear-gradient(135deg, rgba(255,107,0,0.12), transparent 55%, rgba(194,78,2,0.05))",
              boxShadow: "0 24px 70px -28px rgba(194,78,2,0.55)",
            }}
          >
            {/* decorative launch glow */}
            <div
              className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full blur-3xl"
              style={{ background: "rgba(255,107,0,0.22)" }}
            />
            <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-xl">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <span
                    className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.14em]"
                    style={{ border: "1px solid rgba(255,107,0,0.30)", background: "rgba(255,107,0,0.15)", color: "#C24E02" }}
                  >
                    <Rocket size={11} /> IDO · Live
                  </span>
                  {!dangerous ? (
                    <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold" style={{ background: "rgba(255,107,0,0.20)", color: "#C24E02" }}>
                      <ShieldCheck size={11} /> KYC Verified
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-ink-900/5 px-2 py-0.5 text-xs font-semibold text-ink-500">
                      <FileSearch size={11} /> Audit in progress
                    </span>
                  )}
                </div>
                <h1 className="font-display text-3xl font-black tracking-tight sm:text-4xl">
                  {project.name} <span style={{ color: "#C24E02" }}>({project.ticker})</span>
                </h1>
                <p className="mt-3 max-w-md text-sm leading-relaxed text-ink-500">{tagline}</p>
              </div>

              {/* Countdown */}
              <div className="w-full max-w-sm lg:w-auto">
                <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: "#C24E02" }}>
                  <Timer size={12} /> Sale closes in
                </p>
                <div className="flex gap-2 sm:gap-3">
                  {[
                    { v: countdown.days, u: "Days" },
                    { v: countdown.hours, u: "Hrs" },
                    { v: countdown.minutes, u: "Min" },
                    { v: countdown.seconds, u: "Sec" },
                  ].map(({ v, u }) => (
                    <div key={u} className="flex-1 rounded-xl bg-white/70 px-2 py-2 text-center backdrop-blur-sm" style={{ border: "1px solid rgba(255,107,0,0.25)" }}>
                      <div className="font-display text-2xl font-black tabular-nums sm:text-3xl" style={{ color: "#C24E02" }}>
                        {String(v).padStart(2, "0")}
                      </div>
                      <div className="text-[9px] uppercase tracking-widest text-ink-500">{u}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Sale-progress bar */}
            <div className="relative mt-7 space-y-3">
              <div className="flex flex-wrap items-end justify-between gap-2 text-sm">
                <div className="flex items-baseline gap-2">
                  <span className="font-display text-2xl font-black tabular-nums text-ink-900">${raised.toLocaleString("en-US")}</span>
                  <span className="text-ink-400">raised of ${goal.toLocaleString("en-US")}</span>
                </div>
                <span className="flex items-center gap-1.5 text-xs text-ink-500">
                  <Users size={12} style={{ color: "#C24E02" }} />
                  <strong className="text-ink-900">{participants.toLocaleString("en-US")}</strong> participants
                </span>
              </div>
              <div className="h-3 overflow-hidden rounded-full" style={{ background: "rgba(20,20,20,0.08)" }}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 1.2, delay: 0.3, ease: "easeOut" }}
                  className="h-full rounded-full"
                  style={{
                    background: dangerous ? "#ef4444" : "linear-gradient(90deg,#FF6B00,#C24E02)",
                    boxShadow: dangerous ? "none" : "0 0 16px rgba(255,107,0,0.55)",
                  }}
                />
              </div>
              <div className="flex justify-between text-xs text-ink-400">
                <span>{pct.toFixed(1)}% filled</span>
                <span className="flex items-center gap-1"><Timer size={11} /> {countdown.days}d {countdown.hours}h left</span>
              </div>
            </div>
          </motion.section>

          {/* ───────── Two-column body ───────── */}
          <div className="grid gap-6 md:grid-cols-3 md:gap-8">
            {/* Left: details */}
            <div className="space-y-6 md:col-span-2">
              {/* About */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                className={`${cardBase} p-5`}
              >
                <div className="flex items-start gap-4">
                  <div
                    className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-2xl"
                    style={{ background: dangerous ? "rgba(239,68,68,0.10)" : "rgba(255,107,0,0.12)", border: dangerous ? "1px solid rgba(239,68,68,0.25)" : "1px solid rgba(255,107,0,0.25)" }}
                  >
                    {dangerous ? "💀" : "🚀"}
                  </div>
                  <div>
                    <h2 className="font-display text-lg font-black tracking-tight text-ink-900">About {project.name}</h2>
                    <p className="mt-1 text-sm leading-relaxed text-ink-500">
                      {dangerous
                        ? "ScamToken markets itself as the next 1000x memecoin. There's no verified contract, no locked liquidity, and the \"audit\" link has never resolved to an actual report."
                        : "NovaBridge moves native assets across 12 networks with fast finality on Monad. Audited by OtterSec, backed by tier-1 funds, with liquidity locked for 24 months after listing."}
                    </p>
                  </div>
                </div>
                <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {[
                    { label: "Token Price", value: dangerous ? "$0.0001" : "$0.05" },
                    { label: "Hard Cap", value: "$2M" },
                    { label: "Vesting", value: dangerous ? "None" : "12 months" },
                    { label: "Audit", value: dangerous ? "In progress" : "OtterSec" },
                  ].map(({ label, value }) => (
                    <div key={label} className="rounded-xl border border-ink-900/10 bg-bone p-3">
                      <p className="text-xs text-ink-500">{label}</p>
                      <p className="mt-0.5 text-sm font-bold text-ink-900">{value}</p>
                    </div>
                  ))}
                </div>
              </motion.div>

              {/* Sale details */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                className={`${cardBase} p-5`}
              >
                <h3 className={sectionTitle}><Coins size={13} style={{ color: "#C24E02" }} /> Sale details</h3>
                <div className="grid gap-2.5 sm:grid-cols-2">
                  {saleDetails.map(({ icon: Icon, label, value }) => (
                    <div key={label} className="flex items-center gap-3 rounded-xl border border-ink-900/10 bg-bone p-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg" style={{ background: "rgba(255,107,0,0.15)", color: "#C24E02" }}>
                        <Icon size={15} />
                      </span>
                      <div className="min-w-0">
                        <p className="text-[11px] text-ink-500">{label}</p>
                        <p className="truncate text-sm font-semibold text-ink-900">{value}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>

              {/* Tokenomics: donut + supply legend */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                className={`${cardBase} p-5`}
              >
                <h3 className={sectionTitle}><Layers size={13} style={{ color: "#C24E02" }} /> Tokenomics · {TOTAL_SUPPLY.toLocaleString("en-US")} {project.ticker}</h3>
                <div className="flex flex-col items-center gap-6 sm:flex-row">
                  <Donut segments={tokenomics} />
                  <div className="w-full flex-1 space-y-2.5">
                    {tokenomics.map(({ label, pct: p, color }) => (
                      <div key={label} className="flex items-center gap-3">
                        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: color }} />
                        <span className="flex-1 text-xs text-ink-700">{label}</span>
                        <span className="font-mono text-[11px] tabular-nums text-ink-400">
                          {((p / 100) * TOTAL_SUPPLY / 1_000_000).toLocaleString("en-US")}M
                        </span>
                        <span className="w-9 text-right font-mono text-xs font-bold tabular-nums text-ink-900">{p}%</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Vesting schedule bars */}
                <div className="mt-6 border-t border-ink-900/10 pt-5">
                  <h4 className="mb-3 flex items-center gap-2 text-xs font-semibold text-ink-700">
                    <Lock size={12} style={{ color: "#C24E02" }} /> Vesting schedule
                  </h4>
                  <div className="space-y-3">
                    {vesting.map((row) => (
                      <div key={row.label}>
                        <div className="mb-1 flex justify-between text-[11px] text-ink-500">
                          <span>{row.label}</span>
                        </div>
                        <div className="flex h-2.5 overflow-hidden rounded-full" style={{ background: "rgba(20,20,20,0.08)" }}>
                          {row.segs.filter((s) => s.w > 0).map((s, i) => (
                            <span key={i} className="h-full" style={{ width: `${s.w}%`, background: vestColor(s.kind) }} />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-3 text-[10px] text-ink-500">
                    {dangerous ? (
                      <LegendDot color={vestColor("tge")} label="100% unlocked at TGE" />
                    ) : (
                      <>
                        <LegendDot color={vestColor("tge")} label="TGE unlock" />
                        <LegendDot color={vestColor("cliff")} label="Cliff · locked" />
                        <LegendDot color={vestColor("linear")} label="Linear vesting" />
                      </>
                    )}
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Right: buy panel */}
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }} id="portfolio" className="scroll-mt-24">
              <div className="card p-5 sticky top-24 space-y-4">
                <div className="flex items-center gap-2">
                  <Rocket size={16} style={{ color: "#C24E02" }} />
                  <h2 className="font-bold text-ink-900 text-sm">Participate in launch</h2>
                </div>

                <div className="p-4 rounded-xl bg-bone border border-ink-900/10">
                  <p className="text-xs text-ink-500 mb-2">Contribution (USDC)</p>
                  <input
                    type="number"
                    value={contribution}
                    onChange={(e) => setContribution(e.target.value)}
                    className="w-full bg-transparent text-2xl font-bold text-ink-900 outline-none"
                  />
                  <div className="flex gap-1.5 mt-2">
                    {["100", "500", "1000"].map((v) => (
                      <button key={v} onClick={() => setContribution(v)} className="px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors" style={{ background: "rgba(255,107,0,0.12)", color: "#C24E02" }}>
                        ${v}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  {[
                    { label: "You get", value: `${(parseFloat(contribution || "0") / project.priceUsd).toFixed(0)} ${project.ticker}` },
                    { label: "Min / Max", value: "$100 / $10,000" },
                    { label: "Lock period", value: dangerous ? "None" : "3 months" },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex justify-between">
                      <span className="text-ink-500">{label}</span>
                      <span className="font-semibold text-ink-900">{value}</span>
                    </div>
                  ))}
                </div>

                {success ? (
                  <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="space-y-2">
                    <div className="w-full py-3.5 rounded-xl text-center font-bold text-sm" style={{ background: "rgba(255,107,0,0.1)", border: "1px solid rgba(255,107,0,0.25)", color: "#C24E02" }}>
                      ✓ ${contribution} Invested
                    </div>
                    <button onClick={reset} className="w-full rounded-xl border border-ink-900/10 py-2.5 text-xs font-semibold text-ink-500 transition-colors hover:text-ink-900">
                      Run it again
                    </button>
                  </motion.div>
                ) : (
                  <button onClick={handleBuy} className="w-full py-3.5 rounded-xl font-bold text-white text-sm transition-all hover:brightness-110" style={{ background: "#C24E02" }}>
                    {connected ? "Contribute Now" : "Connect Wallet"}
                  </button>
                )}

                <DangerModeToggle checked={dangerous} onChange={setDangerous} label="Simulate rug pull project" />

                {dangerous ? (
                  <p className="flex items-center justify-center gap-1.5 text-xs text-ink-400">
                    <FileSearch size={11} /> Audit report available after review
                  </p>
                ) : (
                  <a href="#" onClick={(e) => e.preventDefault()} className="flex items-center justify-center gap-1.5 text-xs text-ink-400 hover:text-ink-700 transition-colors">
                    View audit report <ExternalLink size={11} />
                  </a>
                )}
              </div>

              {/* Social proof */}
              <div className="mt-4 card p-4 flex items-center gap-3">
                <Users size={14} style={{ color: "#C24E02" }} />
                <span className="text-xs text-ink-500">
                  <strong className="text-ink-900">{participants.toLocaleString("en-US")}</strong> participants secured allocation
                </span>
              </div>
            </motion.div>
          </div>

          {/* ───────── Roadmap ───────── */}
          <motion.section
            id="upcoming"
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            className={`${cardBase} scroll-mt-24 p-5 sm:p-6`}
          >
            <h3 className={sectionTitle}><Calendar size={13} style={{ color: "#C24E02" }} /> Roadmap</h3>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {roadmap.map((r) => {
                const done = r.status === "done";
                const active = r.status === "active";
                return (
                  <div
                    key={r.phase}
                    className="relative rounded-xl border p-4"
                    style={active
                      ? { borderColor: "rgba(255,107,0,0.40)", background: "rgba(255,107,0,0.10)" }
                      : { borderColor: "rgba(20,20,20,0.10)", background: "#FAF8F4" }}
                  >
                    <div className="mb-2 flex items-center gap-2">
                      {done ? (
                        <CheckCircle2 size={16} style={{ color: "#C24E02" }} />
                      ) : active ? (
                        <span className="flex h-4 w-4 items-center justify-center rounded-full" style={{ background: "rgba(255,107,0,0.25)" }}>
                          <span className="h-2 w-2 animate-pulse rounded-full" style={{ background: "#C24E02" }} />
                        </span>
                      ) : (
                        <Circle size={16} className="text-ink-300" />
                      )}
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-400">{r.date}</span>
                    </div>
                    <p className="text-sm font-bold text-ink-900">{r.phase}</p>
                    <p className="mt-1 text-xs leading-snug text-ink-500">{r.desc}</p>
                  </div>
                );
              })}
            </div>
          </motion.section>

          {/* ───────── Project stats ───────── */}
          <motion.section
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5"
          >
            {projectStats.map(({ icon: Icon, label, value }) => (
              <div key={label} className={`${cardBase} p-4`}>
                <Icon size={15} style={{ color: "#C24E02" }} />
                <p className="mt-2 font-display text-xl font-black tabular-nums text-ink-900">{value}</p>
                <p className="mt-0.5 text-[11px] text-ink-500">{label}</p>
              </div>
            ))}
          </motion.section>

          {/* ───────── Team & backers ───────── */}
          <motion.section
            id="leaderboard"
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            className="grid scroll-mt-24 gap-6 md:grid-cols-3"
          >
            <div className={`${cardBase} p-5 md:col-span-2`}>
              <h3 className={sectionTitle}><Users size={13} style={{ color: "#C24E02" }} /> Team</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                {team.map((m) => (
                  <div key={m.name} className="flex items-center gap-3 rounded-xl border border-ink-900/10 bg-bone p-3">
                    <span
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
                      style={{ background: "linear-gradient(135deg,#FF6B00,#C24E02)" }}
                    >
                      {m.initials}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-ink-900">{m.name}</p>
                      <p className="truncate text-[11px] text-ink-500">{m.role}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className={`${cardBase} p-5`}>
              <h3 className={sectionTitle}><Building2 size={13} style={{ color: "#C24E02" }} /> Backers</h3>
              <div className="flex flex-wrap gap-2">
                {backers.map((b) => (
                  <span key={b} className="inline-flex items-center gap-1.5 rounded-lg border border-ink-900/10 bg-bone px-2.5 py-1.5 text-xs font-medium text-ink-700">
                    <Award size={11} style={{ color: "#C24E02" }} /> {b}
                  </span>
                ))}
              </div>
              {!dangerous && (
                <a href="#" onClick={(e) => e.preventDefault()} className="mt-4 inline-flex items-center gap-1.5 text-xs text-ink-400 hover:text-ink-700 transition-colors">
                  Read the OtterSec audit <ExternalLink size={11} />
                </a>
              )}
            </div>
          </motion.section>
        </div>
      </div>

      <RiskPreview
        open={previewTx !== null}
        transaction={previewTx}
        userWallet={walletAddress ?? null}
        scenarioLabel={scenarioLabel}
        onClose={() => setPreviewTx(null)}
        onProceedWithPremon={sendViaPremon}
        onProceedRaw={sendRaw}
      />
    </SiteShell>
  );
}

/* ───────── helpers ───────── */

function vestColor(kind: "tge" | "cliff" | "linear"): string {
  switch (kind) {
    case "tge": return "#FF6B00";
    case "cliff": return "#334155";
    case "linear": return "#C24E02";
  }
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="h-2 w-2 rounded-full" style={{ background: color }} /> {label}
    </span>
  );
}

/* ───────── tokenomics donut ───────── */

function Donut({ segments }: { segments: { label: string; pct: number; color: string }[] }) {
  const size = 132;
  const stroke = 18;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  let offset = 0;

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          className="stroke-ink-900/10"
        />
        {segments.map((s) => {
          const len = (s.pct / 100) * c;
          const el = (
            <motion.circle
              key={s.label}
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke={s.color}
              strokeWidth={stroke}
              strokeLinecap="butt"
              strokeDasharray={`${len} ${c - len}`}
              strokeDashoffset={-offset}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            />
          );
          offset += len;
          return el;
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-[9px] uppercase tracking-widest text-ink-400">Supply</span>
        <span className="font-display text-lg font-black text-ink-900">1B</span>
      </div>
    </div>
  );
}
