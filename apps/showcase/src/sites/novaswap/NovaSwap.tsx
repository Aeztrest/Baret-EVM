import { useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowUpDown,
  ChevronDown,
  Settings,
  Info,
  Zap,
  Route,
  TrendingUp,
  TrendingDown,
  Activity,
  Droplets,
  BarChart3,
  Layers,
  Clock,
} from "lucide-react";
import { DangerModeToggle } from "@premon/showcase-ui";
import { SiteShell } from "../../components/SiteShell";
import { ResultOverlay, type ResultState } from "../../premon/ResultOverlay";
import { RiskPreview } from "../../premon/RiskPreview";
import { buildScenario } from "../../premon/transactions";
import { useWallet } from "../../wallet/context";
import type { TxRequest } from "@premon/wallet-adapter";

const THEME = {
  primary: "#FF6B00",
  accent: "#EA5E00",
  bg: "#FFFFFF",
  name: "NovaSwap",
  logo: (
    <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black text-white" style={{ background: "linear-gradient(135deg,#FF6B00,#C24E02)" }}>
      N
    </div>
  ),
};

const TOKENS = [
  { symbol: "MON", name: "Native Token", price: 175.0 },
  { symbol: "USDC", name: "USD Coin", price: 1.0 },
  { symbol: "AQUA", name: "Aquarius", price: 3.4 },
  { symbol: "yMON", name: "Yield MON", price: 178.2 },
];

// ── Market data (mock) ──────────────────────────────────────────────
const MARKET = [
  { symbol: "MON", name: "Native Token", price: 175.0, change: 2.41, volume: "$18.4M", spark: [34, 36, 33, 38, 41, 39, 44, 43, 47, 46, 50, 52] },
  { symbol: "USDC", name: "USD Coin", price: 1.0, change: 0.02, volume: "$22.1M", spark: [40, 40, 41, 40, 40, 41, 40, 40, 41, 40, 40, 40] },
  { symbol: "AQUA", name: "Aquarius", price: 0.08, change: -1.84, volume: "$4.9M", spark: [52, 50, 51, 48, 46, 47, 44, 45, 42, 41, 39, 38] },
  { symbol: "yMON", name: "Yield MON", price: 178.2, change: 3.12, volume: "$2.6M", spark: [30, 32, 31, 35, 34, 38, 40, 39, 43, 45, 48, 51] },
  { symbol: "NOVA", name: "NovaSwap Token", price: 0.06, change: 5.67, volume: "$1.8M", spark: [22, 24, 27, 26, 30, 33, 32, 37, 39, 42, 44, 48] },
];

function fmtUsd(price: number): string {
  if (price >= 1000) return price.toLocaleString("en-US");
  if (price >= 0.1) return price.toFixed(2);
  return price.toFixed(4);
}

// ── Price chart series per timeframe (mock, MON/USDC) ───────────────
const CHART_SERIES: Record<string, number[]> = {
  "1H": [172.4, 172.8, 172.1, 173.2, 173.6, 173.1, 174.0, 174.4, 174.0, 174.5, 175.0, 175.0],
  "1D": [167.6, 168.4, 169.2, 168.7, 170.1, 170.7, 170.3, 171.7, 171.0, 172.6, 173.4, 175.0],
  "1W": [158.6, 161.0, 159.9, 163.2, 162.5, 166.2, 167.6, 166.9, 170.2, 169.0, 172.3, 175.0],
  "1M": [143.5, 146.8, 145.3, 150.9, 154.0, 152.6, 157.5, 156.2, 162.4, 165.9, 169.7, 175.0],
};
const TIMEFRAMES = ["1H", "1D", "1W", "1M"] as const;

const RECENT_SWAPS = [
  { addr: "0x7Fa2…9c4B", from: "MON", to: "USDC", amount: "2.8", value: "$490", ago: "12s" },
  { addr: "0xD1e4…3aF1", from: "USDC", to: "AQUA", amount: "820", value: "$820", ago: "48s" },
  { addr: "0xC2f8…b71R", from: "yMON", to: "MON", amount: "32.4", value: "$5,671", ago: "1m" },
  { addr: "0xB9d0…3e2K", from: "AQUA", to: "USDC", amount: "3,410", value: "$273", ago: "2m" },
  { addr: "0xE1c7…7B12", from: "MON", to: "NOVA", amount: "1.1", value: "$193", ago: "4m" },
];

const POOLS = [
  { pair: "MON / USDC", apr: "14.2%", tvl: "$48.9M" },
  { pair: "AQUA / MON", apr: "22.8%", tvl: "$12.4M" },
  { pair: "yMON / MON", apr: "9.6%", tvl: "$31.1M" },
  { pair: "NOVA / USDC", apr: "31.4%", tvl: "$4.2M" },
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

// Tiny sparkline for token-table rows.
function Sparkline({ data, up }: { data: number[]; up: boolean }) {
  const { line } = buildPaths(data, 72, 24, 2);
  return (
    <svg width="72" height="24" viewBox="0 0 72 24" className="overflow-visible">
      <path
        d={line}
        fill="none"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={up ? "stroke-emerald-500" : "stroke-rose-500"}
      />
    </svg>
  );
}

export default function NovaSwap() {
  const { connected, openWalletModal, walletAddress, adapter } = useWallet();
  const [fromToken, setFromToken] = useState(TOKENS[0]);
  const [toToken, setToToken] = useState(TOKENS[1]);
  const [amount, setAmount] = useState("0.5");
  const [dangerous, setDangerous] = useState(false);
  const [resultState, setResultState] = useState<ResultState>("idle");
  const [signature, setSignature] = useState<string | null>(null);
  const [resultMessage, setResultMessage] = useState<string | null>(null);
  const [previewTx, setPreviewTx] = useState<TxRequest | null>(null);
  const [timeframe, setTimeframe] = useState<(typeof TIMEFRAMES)[number]>("1D");

  const outputAmount = fromToken.price * parseFloat(amount || "0") / toToken.price;
  const success = signature !== null;
  const scenarioLabel = dangerous
    ? `Swap ${amount} ${fromToken.symbol} → ${toToken.symbol} (danger scenario · drainer pattern)`
    : `Swap ${amount} ${fromToken.symbol} → ${outputAmount.toFixed(4)} ${toToken.symbol}`;

  function reset() {
    setSignature(null);
    setResultMessage(null);
    setResultState("idle");
  }

  async function handleSwap() {
    if (!connected || !walletAddress) { openWalletModal(); return; }
    try {
      const built = await buildScenario(dangerous ? "novaswap-danger" : "novaswap-safe", walletAddress);
      setPreviewTx(built.transaction);   // opens RiskPreview — user decides how to send
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
  // "Without protection" = same path through the connected wallet, but no
  // pre-sign review on the site side. Demo aid only — the wallet still
  // applies its own policy, since Premon is the wallet itself. To truly
  // bypass, swap to a different non-Premon wallet from the picker.
  async function sendRaw() {
    return sendViaPremon();
  }

  function flip() {
    const tmp = fromToken;
    setFromToken(toToken);
    setToToken(tmp);
  }

  // ── chart derived values ──
  const series = CHART_SERIES[timeframe];
  const chartW = 640;
  const chartH = 180;
  const { line: chartLine, area: chartArea, last } = buildPaths(series, chartW, chartH, 10);
  const chartChange = ((series[series.length - 1] - series[0]) / series[0]) * 100;
  const chartUp = chartChange >= 0;

  const stats = [
    { label: "24h Volume", value: "$48.2M", change: "+6.8%", up: true, icon: BarChart3 },
    { label: "Total Value Locked", value: "$312M", change: "+1.2%", up: true, icon: Layers },
    { label: "MON Price", value: "$175.00", change: "+2.4%", up: true, icon: TrendingUp },
    { label: "Active Pairs", value: "128", change: "+3", up: true, icon: Activity },
  ];

  return (
    <SiteShell
      theme={THEME}
      navLinks={[
        { label: "Swap", href: "#swap" },
        { label: "Liquidity", href: "#liquidity" },
        { label: "Analytics", href: "#analytics" },
        { label: "Governance", href: "#governance" },
      ]}
    >
      <ResultOverlay
        state={resultState}
        signature={signature}
        message={resultMessage}
        onClose={() => setResultState("idle")}
      />

      {/* ── Full-bleed orange/amber canvas ── */}
      <div className="relative min-h-screen overflow-hidden" style={{ background: "rgba(255,107,0,0.045)" }}>
        {/* backdrop: glows + grid */}
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-48 left-1/2 h-[520px] w-[820px] -translate-x-1/2 rounded-full blur-[130px]" style={{ background: "rgba(255,107,0,0.16)" }} />
          <div className="absolute top-32 -right-24 h-[420px] w-[420px] rounded-full blur-[120px]" style={{ background: "rgba(234,94,0,0.14)" }} />
          <div className="absolute -bottom-24 -left-24 h-[380px] w-[380px] rounded-full blur-[120px]" style={{ background: "rgba(255,177,54,0.14)" }} />
          <div
            className="absolute inset-0 opacity-[0.05]"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,107,0,0.9) 1px, transparent 1px), linear-gradient(90deg, rgba(255,107,0,0.9) 1px, transparent 1px)",
              backgroundSize: "48px 48px",
              maskImage: "radial-gradient(ellipse 80% 60% at 50% 30%, #000 40%, transparent 100%)",
              WebkitMaskImage: "radial-gradient(ellipse 80% 60% at 50% 30%, #000 40%, transparent 100%)",
            }}
          />
        </div>

        <div className="relative mx-auto max-w-6xl px-4 pt-14 pb-28">
          {/* Hero */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-10 text-center">
            <span className="mb-5 inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold backdrop-blur"
                  style={{ borderColor: "rgba(255,107,0,0.25)", background: "rgba(255,255,255,0.7)", color: "#C24E02" }}>
              <Zap size={12} style={{ fill: "#FF6B00", color: "#FF6B00" }} />
              Best execution on Monad
            </span>
            <h1 className="mb-3 font-display text-4xl font-black tracking-tight text-ink-900 sm:text-5xl">
              Swap any token at the{" "}
              <span className="text-gradient">best rate.</span>
            </h1>
            <p className="mx-auto max-w-md text-ink-500">
              We route every order across Monad's liquidity and fill it at the best price we find. Powered by NovaSwap routing.
            </p>
          </motion.div>

          {/* Market stats bar */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-4"
          >
            {stats.map(({ label, value, change, up, icon: Icon }) => (
              <div
                key={label}
                className="rounded-2xl border bg-white/80 p-4 backdrop-blur-sm"
                style={{ borderColor: "rgba(255,107,0,0.15)" }}
              >
                <div className="mb-2 flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-md" style={{ background: "rgba(255,107,0,0.10)", color: "#C24E02" }}>
                    <Icon size={13} />
                  </span>
                  <span className="truncate text-xs text-ink-500">{label}</span>
                </div>
                <p className="font-display text-xl font-black text-ink-900">{value}</p>
                <p className={`mt-0.5 text-xs font-semibold ${up ? "text-emerald-600" : "text-rose-600"}`}>
                  {change}
                </p>
              </div>
            ))}
          </motion.div>

          {/* ── Two-column: left analytics · right swap ── */}
          <div className="grid gap-6 lg:grid-cols-3">
            {/* LEFT: chart + token table */}
            <div className="space-y-6 lg:col-span-2">
              {/* Price chart panel */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                id="analytics"
                className="scroll-mt-24 rounded-3xl border bg-white/85 p-5 backdrop-blur-xl"
                style={{ borderColor: "rgba(255,107,0,0.15)", boxShadow: "0 20px 60px -30px rgba(234,94,0,0.4)" }}
              >
                <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 text-sm font-semibold text-ink-700">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-black text-white" style={{ background: "linear-gradient(135deg,#FF6B00,#EA5E00)" }}>✦</span>
                      MON / USDC
                    </div>
                    <div className="mt-1 flex items-baseline gap-2">
                      <span className="font-display text-3xl font-black text-ink-900">$175.00</span>
                      <span className={`flex items-center gap-0.5 text-sm font-semibold ${chartUp ? "text-emerald-600" : "text-rose-600"}`}>
                        {chartUp ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                        {chartUp ? "+" : ""}{chartChange.toFixed(2)}%
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-1 rounded-xl border border-black/5 bg-ink-900/[0.03] p-1">
                    {TIMEFRAMES.map((tf) => (
                      <button
                        key={tf}
                        onClick={() => setTimeframe(tf)}
                        className="rounded-lg px-3 py-1 text-xs font-semibold transition-colors"
                        style={timeframe === tf ? { background: "#fff", color: "#C24E02", boxShadow: "0 1px 2px rgba(20,20,20,0.08)" } : { color: "var(--ink-500, #7a756c)" }}
                      >
                        {tf}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="w-full overflow-hidden">
                  <svg viewBox={`0 0 ${chartW} ${chartH}`} className="h-40 w-full sm:h-48" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="novaChartFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#FF6B00" stopOpacity="0.35" />
                        <stop offset="100%" stopColor="#FF6B00" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    <path d={chartArea} fill="url(#novaChartFill)" />
                    <path
                      d={chartLine}
                      fill="none"
                      stroke="#FF6B00"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <circle cx={last[0]} cy={last[1]} r="4.5" fill="#EA5E00" stroke="#fff" strokeWidth="2" />
                  </svg>
                </div>
              </motion.div>

              {/* Token table */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                id="governance"
                className="scroll-mt-24 rounded-3xl border bg-white/85 p-5 backdrop-blur-xl"
                style={{ borderColor: "rgba(255,107,0,0.15)", boxShadow: "0 20px 60px -30px rgba(234,94,0,0.4)" }}
              >
                <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink-700">
                  <BarChart3 size={15} style={{ color: "#FF6B00" }} /> Top tokens
                </h2>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[460px] text-left text-sm">
                    <thead>
                      <tr className="text-xs uppercase tracking-wider text-ink-400">
                        <th className="pb-2 font-medium">Token</th>
                        <th className="pb-2 text-right font-medium">Price</th>
                        <th className="pb-2 text-right font-medium">24h</th>
                        <th className="pb-2 text-right font-medium">Volume</th>
                        <th className="pb-2 pl-4 text-right font-medium">7d</th>
                      </tr>
                    </thead>
                    <tbody>
                      {MARKET.map((t) => {
                        const up = t.change >= 0;
                        return (
                          <tr
                            key={t.symbol}
                            className="group border-t border-black/5 transition-colors hover:bg-black/[0.015]"
                          >
                            <td className="py-3">
                              <div className="flex items-center gap-2.5">
                                <span className="flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-black text-white" style={{ background: "linear-gradient(135deg,#FF6B00,#EA5E00)" }}>
                                  {t.symbol.slice(0, 1)}
                                </span>
                                <div className="min-w-0">
                                  <p className="font-semibold text-ink-900">{t.symbol}</p>
                                  <p className="truncate text-xs text-ink-400">{t.name}</p>
                                </div>
                              </div>
                            </td>
                            <td className="py-3 text-right font-medium tabular-nums text-ink-900">
                              ${fmtUsd(t.price)}
                            </td>
                            <td className={`py-3 text-right font-semibold tabular-nums ${up ? "text-emerald-600" : "text-rose-600"}`}>
                              {up ? "+" : ""}{t.change.toFixed(2)}%
                            </td>
                            <td className="py-3 text-right tabular-nums text-ink-500">{t.volume}</td>
                            <td className="py-3 pl-4 text-right">
                              <div className="flex justify-end">
                                <Sparkline data={t.spark} up={up} />
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            </div>

            {/* RIGHT: swap card */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              id="swap"
              className="h-fit w-full scroll-mt-24 rounded-3xl p-px lg:sticky lg:top-24"
              style={{ background: "linear-gradient(180deg, rgba(255,107,0,0.4), rgba(234,94,0,0.2), transparent)", boxShadow: "0 20px 60px -24px rgba(234,94,0,0.5)" }}
            >
              <div className="space-y-3 rounded-[calc(1.5rem-1px)] bg-white/90 p-5 backdrop-blur-xl">
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-sm font-semibold text-ink-700">Swap</span>
                  <button className="text-ink-400 transition-colors hover:text-ink-700">
                    <Settings size={15} />
                  </button>
                </div>

                {/* From */}
                <div className="rounded-2xl border border-black/5 bg-ink-900/[0.02] p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs text-ink-400">You pay</span>
                    <span className="text-xs text-ink-400">Balance: 12.45</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="min-w-0 flex-1 bg-transparent text-2xl font-bold text-ink-900 outline-none"
                      placeholder="0"
                    />
                    <button className="flex items-center gap-2 rounded-xl border border-black/5 bg-white px-3 py-1.5 text-sm font-semibold text-ink-900 shadow-sm">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full text-xs font-black text-white" style={{ background: "linear-gradient(135deg,#FF6B00,#EA5E00)" }}>✦</span>
                      {fromToken.symbol}
                      <ChevronDown size={13} className="text-ink-400" />
                    </button>
                  </div>
                  <p className="mt-1.5 text-xs text-ink-400">≈ ${(fromToken.price * parseFloat(amount || "0")).toFixed(2)}</p>
                </div>

                {/* Flip */}
                <div className="flex justify-center">
                  <button
                    onClick={flip}
                    className="flex h-9 w-9 items-center justify-center rounded-xl transition-all duration-300 hover:rotate-180"
                    style={{ border: "1px solid rgba(255,107,0,0.3)", background: "rgba(255,107,0,0.10)", color: "#C24E02" }}
                  >
                    <ArrowUpDown size={15} />
                  </button>
                </div>

                {/* To */}
                <div className="rounded-2xl border border-black/5 bg-ink-900/[0.02] p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs text-ink-400">You receive</span>
                    <span className="text-xs text-ink-400">Balance: 245.30</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="flex-1 text-2xl font-bold text-ink-700">
                      {isNaN(outputAmount) ? "0" : outputAmount.toFixed(2)}
                    </span>
                    <button className="flex items-center gap-2 rounded-xl border border-black/5 bg-white px-3 py-1.5 text-sm font-semibold text-ink-900 shadow-sm">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full text-xs font-black text-white" style={{ background: "#2775CA" }}>$</span>
                      {toToken.symbol}
                      <ChevronDown size={13} className="text-ink-400" />
                    </button>
                  </div>
                  <p className="mt-1.5 text-xs text-ink-400">≈ ${(outputAmount * toToken.price).toFixed(2)}</p>
                </div>

                {/* Route info */}
                <div className="flex items-center justify-between px-1 text-xs text-ink-400">
                  <span className="flex items-center gap-1"><Route size={11} /> Route: NovaSwap</span>
                  <span className="flex items-center gap-1">0.3% fee <Info size={11} /></span>
                </div>

                {/* Extra route breakdown */}
                <div className="space-y-2 rounded-2xl border p-3 text-xs" style={{ borderColor: "rgba(255,107,0,0.15)", background: "rgba(255,107,0,0.05)" }}>
                  {[
                    { label: "Rate", value: `1 ${fromToken.symbol} = ${(fromToken.price / toToken.price).toFixed(4)} ${toToken.symbol}` },
                    { label: "Price impact", value: "0.04%" },
                    { label: "Min. received", value: `${isNaN(outputAmount) ? "0" : (outputAmount * 0.995).toFixed(4)} ${toToken.symbol}` },
                    { label: "Network fee", value: "~0.0002 MON" },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex items-center justify-between">
                      <span className="text-ink-500">{label}</span>
                      <span className="font-medium text-ink-700">{value}</span>
                    </div>
                  ))}
                </div>

                {/* Swap button */}
                {success ? (
                  <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="space-y-2">
                    <div className="w-full rounded-xl border border-emerald-500/30 bg-emerald-50 py-4 text-center font-bold text-emerald-600">
                      ✓ Swap Successful
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
                    onClick={handleSwap}
                    className="w-full rounded-xl py-4 font-bold text-white transition-all hover:brightness-110 active:scale-[0.99]"
                    style={{ background: "linear-gradient(135deg,#FF6B00,#EA5E00)", boxShadow: "0 10px 30px -8px rgba(255,107,0,0.7)" }}
                  >
                    {connected ? "Swap" : "Connect Wallet to Swap"}
                  </button>
                )}

                {/* Demo toggle */}
                <div className="pt-2">
                  <DangerModeToggle checked={dangerous} onChange={setDangerous} label="Simulate a drainer swap" activeColor="#dc2626" />
                </div>
              </div>
            </motion.div>
          </div>

          {/* ── Activity + liquidity pools ── */}
          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            {/* Recent swaps */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="rounded-3xl border bg-white/85 p-5 backdrop-blur-xl"
              style={{ borderColor: "rgba(255,107,0,0.15)", boxShadow: "0 20px 60px -30px rgba(234,94,0,0.4)" }}
            >
              <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink-700">
                <Activity size={15} style={{ color: "#FF6B00" }} /> Recent swaps
              </h2>
              <div className="space-y-1">
                {RECENT_SWAPS.map((s, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between rounded-xl px-2 py-2.5 text-sm transition-colors hover:bg-black/[0.015]"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full" style={{ background: "rgba(255,107,0,0.10)", color: "#C24E02" }}>
                        <ArrowUpDown size={12} />
                      </span>
                      <span className="font-medium text-ink-700">
                        {s.from} <span className="text-ink-400">→</span> {s.to}
                      </span>
                      <span className="hidden font-mono text-xs text-ink-400 sm:inline">{s.addr}</span>
                    </div>
                    <div className="flex items-center gap-3 text-right">
                      <div>
                        <p className="font-medium tabular-nums text-ink-900">{s.amount} {s.from}</p>
                        <p className="text-xs tabular-nums text-ink-400">{s.value}</p>
                      </div>
                      <span className="flex items-center gap-0.5 text-xs text-ink-400">
                        <Clock size={10} /> {s.ago}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Liquidity pools */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              id="liquidity"
              className="scroll-mt-24 rounded-3xl border bg-white/85 p-5 backdrop-blur-xl"
              style={{ borderColor: "rgba(255,107,0,0.15)", boxShadow: "0 20px 60px -30px rgba(234,94,0,0.4)" }}
            >
              <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink-700">
                <Droplets size={15} style={{ color: "#FF6B00" }} /> Liquidity pools
              </h2>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {POOLS.map((p) => (
                  <div
                    key={p.pair}
                    className="rounded-2xl border border-black/5 bg-ink-900/[0.02] p-3.5 transition-all hover:border-black/10"
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-sm font-semibold text-ink-900">{p.pair}</span>
                      <span className="rounded-full px-2 py-0.5 text-xs font-semibold" style={{ background: "rgba(255,107,0,0.10)", color: "#C24E02" }}>
                        {p.apr} APR
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-ink-500">
                      <span>TVL {p.tvl}</span>
                      <button className="font-semibold hover:underline" style={{ color: "#C24E02" }}>Add liquidity</button>
                    </div>
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
