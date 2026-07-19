import { useState } from "react";
import { motion } from "framer-motion";
import {
  TrendingUp,
  Lock,
  Zap,
  Info,
  Orbit,
  Users,
  Coins,
  Clock,
  ShieldCheck,
  Gift,
  ArrowDownToLine,
  Wallet,
} from "lucide-react";
import { DangerModeToggle } from "@premon/showcase-ui";
import { useWallet } from "../../wallet/context";
import { SiteShell } from "../../components/SiteShell";
import { ResultOverlay, type ResultState } from "../../premon/ResultOverlay";
import { RiskPreview } from "../../premon/RiskPreview";
import { buildScenario } from "../../premon/transactions";
import type { TxRequest } from "@premon/wallet-adapter";

const THEME = {
  primary: "#D97706",
  accent: "#F59E0B",
  bg: "#FFFDF8",
  name: "OrbitYield",
  logo: (
    <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black text-white" style={{ background: "linear-gradient(135deg,#F59E0B,#D97706)" }}>
      O
    </div>
  ),
};

const POOLS = [
  { name: "Aquarius yMON", apy: "7.2%", tvl: "$284M", risk: "Low", badge: "Audited", commission: "5%", stakers: "18.2K" },
  { name: "UltraStake sMON", apy: "6.8%", tvl: "$142M", risk: "Low", badge: "Verified", commission: "8%", stakers: "9.7K" },
  { name: "YieldVault LMON", apy: "8.1%", tvl: "$198M", risk: "Low", badge: "Boosted", commission: "4%", stakers: "12.4K" },
];

// The unverified pool behind the danger toggle — used for the risky row in
// the validators table and the summary panel in the stake form.
const DANGER_POOL = { name: "SuperYield Protocol", apyPct: 48, tvl: "$42K", receiveToken: "syMON" };

// ── Rewards / TVL chart series per timeframe (mock, $M) ─────────────
const CHART_SERIES: Record<string, number[]> = {
  "1W": [598, 604, 601, 609, 613, 611, 619, 624],
  "1M": [552, 561, 558, 574, 581, 596, 608, 624],
  "3M": [468, 491, 486, 512, 538, 567, 601, 624],
  "1Y": [284, 331, 386, 442, 498, 541, 589, 624],
};
const TIMEFRAMES = ["1W", "1M", "3M", "1Y"] as const;

const HOW_STEPS = [
  { icon: Coins, title: "Deposit MON", body: "Stake any amount into an audited validator pool. No lockups, no minimums." },
  { icon: Orbit, title: "Receive yMON", body: "Get liquid staking tokens 1:1. They keep earning while you trade, lend, or provide liquidity." },
  { icon: Gift, title: "Earn rewards", body: "Rewards accrue automatically and compound into your position every epoch." },
];

// Build line + area SVG paths from a numeric series.
function buildPaths(data: number[], w: number, h: number, pad = 6) {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const step = w / (data.length - 1);
  const pts = data.map((d, i) => [
    i * step,
    pad + (h - pad * 2) * (1 - (d - min) / range),
  ]);
  const line = pts
    .map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`)
    .join(" ");
  const area = `${line} L${w},${h} L0,${h} Z`;
  return { line, area, last: pts[pts.length - 1] };
}

export default function OrbitYield() {
  const { connected, openWalletModal, walletAddress, adapter } = useWallet();
  const [amount, setAmount] = useState("10");
  const [selectedPool, setSelectedPool] = useState(0);
  const [dangerous, setDangerous] = useState(false);
  const [resultState, setResultState] = useState<ResultState>("idle");
  const [signature, setSignature] = useState<string | null>(null);
  const [resultMessage, setResultMessage] = useState<string | null>(null);
  const [previewTx, setPreviewTx] = useState<TxRequest | null>(null);
  const [timeframe, setTimeframe] = useState<(typeof TIMEFRAMES)[number]>("1M");
  const success = signature !== null;
  const pool = POOLS[selectedPool];
  const scenarioLabel = dangerous
    ? `Stake ${amount} MON in an unverified pool (warn scenario)`
    : `Stake ${amount} MON in ${pool?.name ?? "?"}`;

  function reset() {
    setSignature(null);
    setResultMessage(null);
    setResultState("idle");
  }

  async function handleStake() {
    if (!connected || !walletAddress) { openWalletModal(); return; }
    try {
      const built = await buildScenario(dangerous ? "orbityield-warn" : "orbityield-safe", walletAddress);
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
  const activeApyPct = dangerous ? DANGER_POOL.apyPct : parseFloat(pool.apy);
  const estimatedYearly = parseFloat(amount || "0") * (activeApyPct / 100);

  // ── chart derived values ──
  const series = CHART_SERIES[timeframe];
  const chartW = 640;
  const chartH = 170;
  const { line: chartLine, area: chartArea, last } = buildPaths(series, chartW, chartH, 10);
  const chartGrowth = ((series[series.length - 1] - series[0]) / series[0]) * 100;

  const heroStats = [
    { label: "Total Value Locked", value: "$624M", change: "+4.1%", icon: Lock },
    { label: "Current APY", value: "7.4%", change: "+0.2%", icon: TrendingUp },
    { label: "Total Stakers", value: "48,291", change: "+318", icon: Users },
    { label: "Your Staked", value: "245.3 MON", change: "+2.1 yMON", icon: Wallet },
  ];

  return (
    <SiteShell
      theme={THEME}
      navLinks={[{ label: "Stake", href: "#stake" }, { label: "Pools", href: "#pools" }, { label: "Portfolio", href: "#portfolio" }, { label: "Docs", href: "#docs" }]}
    >
      <ResultOverlay
        state={resultState}
        signature={signature}
        message={resultMessage}
        onClose={() => setResultState("idle")}
      />

      {/* ── Full-bleed amber canvas with orbital-ring motif ── */}
      <div className="relative min-h-screen overflow-hidden" style={{ background: "#FFFDF8" }}>
        {/* backdrop: glow + concentric orbit rings */}
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 left-1/2 h-[480px] w-[760px] -translate-x-1/2 rounded-full blur-[130px]" style={{ background: "rgba(245,158,11,0.20)" }} />
          <div className="absolute top-24 -right-24 h-[400px] w-[400px] rounded-full blur-[120px]" style={{ background: "rgba(217,119,6,0.16)" }} />
          <svg
            className="absolute left-1/2 top-[-140px] h-[720px] w-[720px] -translate-x-1/2"
            style={{ color: "rgba(245,158,11,0.18)" }}
            viewBox="0 0 720 720"
            fill="none"
          >
            {[160, 240, 320].map((r) => (
              <circle key={r} cx="360" cy="360" r={r} stroke="currentColor" strokeWidth="1" />
            ))}
            <circle cx="360" cy="200" r="7" fill="currentColor" />
            <circle cx="600" cy="360" r="5" fill="currentColor" />
            <circle cx="360" cy="680" r="6" fill="currentColor" />
          </svg>
        </div>

        <div className="relative px-4 py-12 pb-28">
          <div className="mx-auto max-w-5xl">
            {/* Hero */}
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8 text-center">
              <span
                className="mb-4 inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold backdrop-blur"
                style={{ borderColor: "rgba(245,158,11,0.25)", background: "rgba(255,255,255,0.7)", color: "#D97706" }}
              >
                <Orbit size={12} /> Liquid staking, in orbit
              </span>
              <h1 className="font-display text-3xl font-black tracking-tight text-ink-900 sm:text-4xl">
                Stake MON, stay <span className="text-gradient">liquid.</span>
              </h1>
              <p className="mx-auto mt-3 max-w-md text-ink-500">
                Your MON earns staking rewards. Your yMON stays free to trade, lend, and farm anywhere on Monad.
              </p>
            </motion.div>

            {/* Hero stats row */}
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
              {heroStats.map(({ label, value, change, icon: Icon }) => (
                <div key={label} className="rounded-2xl border p-4 backdrop-blur-sm" style={{ borderColor: "rgba(245,158,11,0.20)", background: "rgba(255,255,255,0.8)" }}>
                  <div className="mb-2 flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-md" style={{ background: "rgba(245,158,11,0.12)", color: "#D97706" }}>
                      <Icon size={13} />
                    </span>
                    <span className="truncate text-xs text-ink-500">{label}</span>
                  </div>
                  <p className="font-display text-xl font-black text-ink-900">{value}</p>
                  <p className="mt-0.5 text-xs font-semibold" style={{ color: "#D97706" }}>{change}</p>
                </div>
              ))}
            </motion.div>

            {/* Rewards / TVL chart */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="mb-8 rounded-3xl border p-5 backdrop-blur-xl"
              style={{ borderColor: "rgba(245,158,11,0.20)", background: "rgba(255,255,255,0.85)", boxShadow: "0 20px 60px -30px rgba(217,119,6,0.35)" }}
            >
              <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                <div>
                  <span className="text-xs font-medium uppercase tracking-wider text-ink-500">Total Value Locked</span>
                  <div className="mt-1 flex items-baseline gap-2">
                    <span className="font-display text-3xl font-black text-ink-900">$624M</span>
                    <span className="flex items-center gap-0.5 text-sm font-semibold text-emerald-600">
                      <TrendingUp size={13} /> +{chartGrowth.toFixed(1)}%
                    </span>
                  </div>
                </div>
                <div className="flex gap-1 rounded-xl border border-black/5 bg-ink-900/[0.03] p-1">
                  {TIMEFRAMES.map((tf) => (
                    <button
                      key={tf}
                      onClick={() => setTimeframe(tf)}
                      className="rounded-lg px-3 py-1 text-xs font-semibold transition-colors"
                      style={timeframe === tf ? { background: "#fff", color: "#D97706", boxShadow: "0 1px 2px rgba(20,20,20,0.08)" } : { color: "#9A9488" }}
                    >
                      {tf}
                    </button>
                  ))}
                </div>
              </div>

              <div className="w-full overflow-hidden">
                <svg viewBox={`0 0 ${chartW} ${chartH}`} className="h-40 w-full sm:h-44" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="orbitChartFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.35" />
                      <stop offset="100%" stopColor="#F59E0B" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <path d={chartArea} fill="url(#orbitChartFill)" />
                  <path
                    d={chartLine}
                    fill="none"
                    stroke="#D97706"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <circle cx={last[0]} cy={last[1]} r="4.5" fill="#F59E0B" stroke="#fff" strokeWidth="2" />
                </svg>
              </div>
            </motion.div>

            <div className="grid gap-8 md:grid-cols-5">
              {/* Validators / pools table */}
              <div className="space-y-4 md:col-span-3">
                <h2 id="pools" className="mb-1 flex scroll-mt-24 items-center gap-2 text-sm font-semibold uppercase tracking-wider text-ink-500">
                  <ShieldCheck size={15} style={{ color: "#D97706" }} /> Validators
                </h2>
                <div className="overflow-hidden rounded-3xl border backdrop-blur-xl" style={{ borderColor: "rgba(245,158,11,0.20)", background: "rgba(255,255,255,0.85)", boxShadow: "0 20px 60px -32px rgba(217,119,6,0.35)" }}>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[420px] text-left text-sm">
                      <thead>
                        <tr className="border-b border-black/5 text-xs uppercase tracking-wider text-ink-400">
                          <th className="px-4 py-3 font-medium">Validator</th>
                          <th className="px-2 py-3 text-right font-medium">APY</th>
                          <th className="hidden px-2 py-3 text-right font-medium sm:table-cell">Commission</th>
                          <th className="px-2 py-3 text-right font-medium">TVL</th>
                          <th className="px-4 py-3 text-right font-medium">Stake</th>
                        </tr>
                      </thead>
                      <tbody>
                        {POOLS.map((p, i) => {
                          const active = selectedPool === i && !dangerous;
                          return (
                            <tr
                              key={p.name}
                              onClick={() => setSelectedPool(i)}
                              className="cursor-pointer border-b border-black/5 transition-colors last:border-b-0 hover:bg-amber-500/[0.04]"
                              style={active ? { background: "rgba(245,158,11,0.08)" } : undefined}
                            >
                              <td className="px-4 py-3.5">
                                <div className="flex items-center gap-2.5">
                                  <span className="flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-black text-white" style={{ background: "linear-gradient(135deg,#F59E0B,#D97706)" }}>
                                    {p.name.slice(0, 1)}
                                  </span>
                                  <div className="min-w-0">
                                    <p className="font-semibold text-ink-900">{p.name}</p>
                                    <span className="rounded-full px-1.5 py-0.5 text-[10px] font-medium" style={{ background: "rgba(245,158,11,0.12)", color: "#D97706" }}>{p.badge}</span>
                                  </div>
                                </div>
                              </td>
                              <td className="px-2 py-3.5 text-right font-semibold tabular-nums" style={{ color: "#D97706" }}>{p.apy}</td>
                              <td className="hidden px-2 py-3.5 text-right tabular-nums text-ink-500 sm:table-cell">{p.commission}</td>
                              <td className="px-2 py-3.5 text-right tabular-nums text-ink-700">{p.tvl}</td>
                              <td className="px-4 py-3.5 text-right">
                                <span
                                  className="inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors"
                                  style={active ? { background: "#D97706", color: "#fff" } : { background: "rgba(245,158,11,0.12)", color: "#D97706" }}
                                >
                                  {active ? "Selected" : "Select"}
                                </span>
                              </td>
                            </tr>
                          );
                        })}

                        {/* Risky pool */}
                        {dangerous && (
                          <tr className="border-t border-rose-500/30 bg-rose-500/[0.06]">
                            <td className="px-4 py-3.5">
                              <div className="flex items-center gap-2.5">
                                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-rose-500 text-[11px] font-black text-white">S</span>
                                <div className="min-w-0">
                                  <p className="font-semibold text-rose-600">{DANGER_POOL.name}</p>
                                  <span className="rounded-full bg-rose-500/12 px-1.5 py-0.5 text-[10px] font-semibold text-rose-600">UNAUDITED</span>
                                </div>
                              </div>
                            </td>
                            <td className="px-2 py-3.5 text-right font-semibold tabular-nums text-rose-600">{DANGER_POOL.apyPct}%</td>
                            <td className="hidden px-2 py-3.5 text-right tabular-nums text-rose-600 sm:table-cell">0%</td>
                            <td className="px-2 py-3.5 text-right tabular-nums text-ink-500">{DANGER_POOL.tvl}</td>
                            <td className="px-4 py-3.5 text-right">
                              <span className="inline-flex items-center rounded-lg bg-rose-500/12 px-2.5 py-1 text-xs font-semibold text-rose-600">Risky</span>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Your positions */}
                <h2 id="portfolio" className="mb-1 mt-6 flex scroll-mt-24 items-center gap-2 text-sm font-semibold uppercase tracking-wider text-ink-500">
                  <Wallet size={15} style={{ color: "#D97706" }} /> Your positions
                </h2>
                <div className="space-y-3 rounded-3xl border p-5 backdrop-blur-xl" style={{ borderColor: "rgba(245,158,11,0.20)", background: "rgba(255,255,255,0.85)", boxShadow: "0 20px 60px -32px rgba(217,119,6,0.35)" }}>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-2xl border border-black/5 bg-ink-900/[0.02] p-3.5">
                      <span className="text-xs text-ink-500">Staked</span>
                      <p className="font-display text-lg font-black text-ink-900">245.30 MON</p>
                      <p className="text-xs text-ink-400">≈ 245.30 yMON</p>
                    </div>
                    <div className="rounded-2xl border p-3.5" style={{ borderColor: "rgba(245,158,11,0.25)", background: "rgba(245,158,11,0.06)" }}>
                      <span className="flex items-center gap-1 text-xs text-ink-500"><Gift size={11} /> Pending rewards</span>
                      <p className="font-display text-lg font-black" style={{ color: "#D97706" }}>+2.14 MON</p>
                      <button className="text-xs font-semibold hover:underline" style={{ color: "#D97706" }}>Claim</button>
                    </div>
                  </div>
                  {/* Unstake queue */}
                  <div className="flex items-center justify-between rounded-2xl border border-black/5 bg-ink-900/[0.02] px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full" style={{ background: "rgba(245,158,11,0.12)", color: "#D97706" }}>
                        <ArrowDownToLine size={15} />
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-ink-900">Unstaking 50 MON</p>
                        <p className="text-xs text-ink-400">Available after cooldown</p>
                      </div>
                    </div>
                    <span className="flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold tabular-nums" style={{ background: "rgba(245,158,11,0.12)", color: "#D97706" }}>
                      <Clock size={11} /> 2d 14h 06m
                    </span>
                  </div>
                </div>
              </div>

              {/* Stake form */}
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }} id="stake" className="scroll-mt-24 md:col-span-2">
                <div
                  className="space-y-5 rounded-3xl border p-6 backdrop-blur-xl md:sticky md:top-24"
                  style={{ borderColor: "rgba(245,158,11,0.20)", background: "rgba(255,255,255,0.85)", boxShadow: "0 20px 60px -28px rgba(217,119,6,0.3)" }}
                >
                  <h2 className="font-display font-bold text-ink-900">Stake MON</h2>

                  <div className="rounded-2xl border border-black/5 bg-ink-900/[0.02] p-4">
                    <div className="mb-2 flex justify-between text-xs text-ink-500">
                      <span>Amount</span>
                      <span>Balance: 12.45 MON</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="min-w-0 flex-1 bg-transparent text-2xl font-bold text-ink-900 outline-none"
                        placeholder="0"
                      />
                      <div className="flex shrink-0 gap-1">
                        {["25%", "50%", "MAX"].map((p) => (
                          <button key={p} className="rounded-lg px-2 py-1 text-xs font-semibold transition-colors hover:bg-amber-500/10" style={{ color: "#D97706" }}>
                            {p}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3 rounded-2xl border p-4" style={{ borderColor: "rgba(245,158,11,0.25)", background: "rgba(245,158,11,0.06)" }}>
                    {[
                      { label: "Staking pool", value: dangerous ? DANGER_POOL.name : pool.name },
                      { label: "Annual APY", value: dangerous ? `${DANGER_POOL.apyPct.toFixed(1)}%` : pool.apy },
                      { label: "You receive", value: dangerous ? DANGER_POOL.receiveToken : "yMON" },
                      { label: "Estimated yearly", value: `+${estimatedYearly.toFixed(4)} MON` },
                    ].map(({ label, value }) => (
                      <div key={label} className="flex justify-between text-sm">
                        <span className="flex items-center gap-1 text-ink-500">{label} <Info size={11} className="opacity-50" /></span>
                        <span className="font-semibold text-ink-900">{value}</span>
                      </div>
                    ))}
                  </div>

                  {success ? (
                    <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="space-y-2">
                      <div className="w-full rounded-xl border border-emerald-500/30 bg-emerald-50 py-4 text-center font-bold text-emerald-600">
                        ✓ {amount} MON Staked
                      </div>
                      <button
                        onClick={reset}
                        className="w-full rounded-xl border border-black/10 py-2.5 text-xs font-semibold text-ink-500 transition-colors hover:text-ink-900"
                      >
                        Run it again
                      </button>
                    </motion.div>
                  ) : (
                    <button
                      onClick={handleStake}
                      className="w-full rounded-xl py-4 font-bold text-white transition-all hover:brightness-110 active:scale-[0.99]"
                      style={{ background: "linear-gradient(135deg,#F59E0B,#D97706)", boxShadow: "0 10px 30px -8px rgba(217,119,6,0.5)" }}
                    >
                      {connected ? "Stake Now" : "Connect Wallet to Stake"}
                    </button>
                  )}

                  {/* Demo toggle, right under the primary CTA */}
                  <DangerModeToggle checked={dangerous} onChange={setDangerous} label="Simulate unverified pool" activeColor="#dc2626" />

                  <p className="flex items-center justify-center gap-1 text-center text-xs text-ink-400">
                    <ShieldCheck size={11} /> Non-custodial · unstake anytime after cooldown
                  </p>
                </div>
              </motion.div>
            </div>

            {/* How liquid staking works */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              id="docs"
              className="mt-12 scroll-mt-24"
            >
              <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-ink-500">
                <Zap size={15} style={{ color: "#D97706" }} /> How liquid staking works
              </h2>
              <div className="grid gap-4 sm:grid-cols-3">
                {HOW_STEPS.map(({ icon: Icon, title, body }, i) => (
                  <div
                    key={title}
                    className="relative rounded-2xl border p-5 backdrop-blur-sm"
                    style={{ borderColor: "rgba(245,158,11,0.20)", background: "rgba(255,255,255,0.8)" }}
                  >
                    <span className="absolute right-4 top-4 font-display text-3xl font-black" style={{ color: "rgba(245,158,11,0.15)" }}>
                      {i + 1}
                    </span>
                    <span className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl text-white" style={{ background: "linear-gradient(135deg,#F59E0B,#D97706)" }}>
                      <Icon size={17} />
                    </span>
                    <h3 className="mb-1 font-semibold text-ink-900">{title}</h3>
                    <p className="text-sm text-ink-500">{body}</p>
                  </div>
                ))}
              </div>
            </motion.div>

          </div>
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
