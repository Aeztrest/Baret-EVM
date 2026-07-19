import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Gift,
  CheckCircle,
  Users,
  Clock,
  Sparkles,
  Coins,
  Droplets,
  Vote,
  Timer,
  ListChecks,
  Circle,
  Wallet,
  TrendingUp,
  Rocket,
  Award,
} from "lucide-react";
import { DangerModeToggle } from "@premon/showcase-ui";
import { useWallet } from "../../wallet/context";
import { SiteShell } from "../../components/SiteShell";
import { ResultOverlay, type ResultState } from "../../premon/ResultOverlay";
import { buildScenario } from "../../premon/transactions";

const THEME = {
  primary: "#E8470A",
  accent: "#FF6B00",
  bg: "#FFFFFF",
  name: "ClaimHub",
  logo: (
    <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white" style={{ background: "linear-gradient(135deg,#FF6B00,#E8470A)" }}>
      <Gift size={15} />
    </div>
  ),
};

// Program-wide metrics (mock).
const PROGRAM_STATS = [
  { icon: Coins, label: "Total Allocation", value: "50M TOKEN" },
  { icon: Users, label: "Eligible Wallets", value: "142,841" },
  { icon: TrendingUp, label: "Claimed", value: "63%" },
  { icon: Clock, label: "Deadline", value: "14d 06h" },
];

// Personal allocation, broken down by qualifying criteria (sums to 2,500).
const ALLOCATION_BREAKDOWN = [
  {
    icon: Rocket,
    label: "Early User",
    detail: "Wallet active before mainnet launch",
    amount: 800,
    multiplier: "1.0×",
  },
  {
    icon: Droplets,
    label: "Liquidity Provider",
    detail: "Supplied MON/USDC liquidity 90+ days",
    amount: 1200,
    multiplier: "2.0×",
  },
  {
    icon: Vote,
    label: "Governance Voter",
    detail: "Voted on 3+ proposals",
    amount: 500,
    multiplier: "1.5×",
  },
];

// Vesting: 25% at claim, remainder linear over 6 months.
const VESTING = [
  { label: "At claim", pct: 25, tokens: "625", opacity: 1, when: "Now" },
  { label: "Month 1–2", pct: 25, tokens: "625", opacity: 0.7, when: "Aug" },
  { label: "Month 3–4", pct: 25, tokens: "625", opacity: 0.5, when: "Oct" },
  { label: "Month 5–6", pct: 25, tokens: "625", opacity: 0.3, when: "Dec" },
];

// Recent claims feed (mock).
const RECENT_CLAIMS = [
  { addr: "0x7Fa2…9c4B", amount: "3,120", when: "12s ago" },
  { addr: "0xD1e4…3aF1", amount: "1,850", when: "48s ago" },
  { addr: "0xC2f8…b71D", amount: "980", when: "2m ago" },
  { addr: "0xB9d0…3e2K", amount: "5,400", when: "3m ago" },
  { addr: "0xE1c7…7B12", amount: "2,500", when: "5m ago" },
  { addr: "0xA4f6…6Z9Q", amount: "740", when: "6m ago" },
];

// Gentle confetti scattered across the canvas.
const CONFETTI = [
  { left: "8%", top: "22%", color: "#FF6B00", w: 14, delay: 0 },
  { left: "18%", top: "60%", color: "#FFB136", w: 10, delay: 0.6 },
  { left: "30%", top: "14%", color: "#FDBA74", w: 8, delay: 1.2 },
  { left: "72%", top: "18%", color: "#E8470A", w: 12, delay: 0.3 },
  { left: "86%", top: "48%", color: "#FF8C42", w: 10, delay: 0.9 },
  { left: "62%", top: "70%", color: "#FFD199", w: 8, delay: 1.5 },
  { left: "92%", top: "28%", color: "#F97316", w: 12, delay: 0.4 },
];

export default function ClaimHub() {
  const { connected, openWalletModal, walletAddress, adapter, shortAddress } = useWallet();
  const [dangerous, setDangerous] = useState(false);
  const [resultState, setResultState] = useState<ResultState>("idle");
  const [signature, setSignature] = useState<string | null>(null);
  const [resultMessage, setResultMessage] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);
  const [pendingCheck, setPendingCheck] = useState(false);
  const success = signature !== null;

  useEffect(() => {
    if (connected && pendingCheck) {
      setPendingCheck(false);
      setChecked(true);
    }
  }, [connected, pendingCheck]);

  function handleCheck() {
    if (!connected) { setPendingCheck(true); openWalletModal(); return; }
    setChecked(true);
  }

  function reset() {
    setSignature(null);
    setResultMessage(null);
    setResultState("idle");
  }

  // Builds the candidate tx and sends it straight to the wallet to sign —
  // Premon's own pre-sign review happens there, not as a separate step here.
  async function handleClaim() {
    if (!walletAddress) return;
    setResultState("awaiting"); setSignature(null); setResultMessage(null);
    try {
      const built = await buildScenario(dangerous ? "claimhub-danger" : "claimhub-safe", walletAddress);
      const { signature: sig } = await adapter.signAndSendTransaction(built.transaction);
      setSignature(sig); setResultState("confirmed");
    } catch (e) {
      if ((e instanceof Error && /SIGN_REJECTED|POPUP_CLOSED|User cancel|declined/.test(e.message))) {
        setResultState("blocked"); setResultMessage(e.message);
      } else {
        setResultState("error"); setResultMessage(e instanceof Error ? e.message : String(e));
      }
    }
  }

  // Soft, orange-tinted panel — reused across every section below.
  const panel = "card rounded-2xl";
  const panelStyle = { borderColor: "rgba(232,71,10,0.14)", boxShadow: "0 20px 60px -32px rgba(232,71,10,0.35)" };

  return (
    <SiteShell
      theme={THEME}
      navLinks={[{ label: "Airdrops", href: "#airdrops" }, { label: "History", href: "#history" }, { label: "Leaderboard", href: "#leaderboard" }]}
    >
      <ResultOverlay
        state={resultState}
        signature={signature}
        message={resultMessage}
        onClose={() => setResultState("idle")}
      />

      {/* Full-bleed canvas */}
      <div className="fixed inset-0 -z-10 bg-bone" />
      <div
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          background:
            "radial-gradient(ellipse 55% 45% at 50% 0%, rgba(232,71,10,0.10), transparent 60%), radial-gradient(ellipse 40% 40% at 85% 30%, rgba(255,107,0,0.10), transparent 60%)",
        }}
      />
      {/* Confetti */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        {CONFETTI.map((c, i) => (
          <motion.span
            key={i}
            className="absolute rounded-[2px]"
            style={{ left: c.left, top: c.top, width: c.w, height: c.w * 0.4, background: c.color }}
            animate={{ y: [0, 14, 0], rotate: [0, 25, -10, 0], opacity: [0.5, 0.9, 0.5] }}
            transition={{ duration: 5 + i, repeat: Infinity, ease: "easeInOut", delay: c.delay }}
          />
        ))}
      </div>

      <div className="min-h-screen px-4 pb-24 pt-12">
        <div className="mx-auto max-w-3xl">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-12 text-center">
            <motion.div
              animate={{ y: [0, -7, 0] }}
              transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
              className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl text-white shadow-lift"
              style={{ background: "linear-gradient(135deg,#FF6B00,#E8470A)" }}
            >
              <Gift size={28} />
            </motion.div>
            <h1 className="mb-3 font-display text-4xl font-black tracking-tight text-ink-900">
              Chain <span className="text-gradient">Airdrop</span>
            </h1>
            <p className="mx-auto max-w-md text-ink-500">
              Community distribution — check whether your wallet qualifies for the ecosystem reward program.
            </p>
          </motion.div>

          {/* Program stats bar */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-4 grid grid-cols-2 gap-4 sm:grid-cols-4"
          >
            {PROGRAM_STATS.map(({ icon: Icon, label, value }) => (
              <div key={label} className={`${panel} p-4 text-center`} style={panelStyle}>
                <Icon size={16} className="mx-auto mb-2" style={{ color: "#E8470A" }} />
                <p className="font-display text-lg font-black text-ink-900">{value}</p>
                <p className="mt-0.5 text-xs text-ink-500">{label}</p>
              </div>
            ))}
          </motion.div>

          {/* Distribution progress */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12 }}
            className={`${panel} mb-8 p-5`}
            style={panelStyle}
          >
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="inline-flex items-center gap-1.5 font-semibold text-ink-900">
                <Timer size={14} style={{ color: "#FF6B00" }} />
                31.4M / 50M TOKEN distributed
              </span>
              <span className="font-bold" style={{ color: "#E8470A" }}>63%</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full" style={{ background: "rgba(232,71,10,0.12)" }}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: "63%" }}
                transition={{ duration: 1, delay: 0.3, ease: "easeOut" }}
                className="h-full rounded-full"
                style={{ background: "linear-gradient(90deg,#FF6B00,#E8470A)", boxShadow: "0 0 12px rgba(232,71,10,0.5)" }}
              />
            </div>
            <p className="mt-2 text-xs text-ink-400">
              Claim window closes in 14 days 06 hours. Unclaimed tokens return to the treasury.
            </p>
          </motion.div>

          {/* Claim card */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} id="airdrops" className={`${panel} scroll-mt-24 overflow-hidden`} style={panelStyle}>
            <div className="p-6 border-b border-ink-900/10">
              <h2 className="mb-1 flex items-center gap-2 font-display font-bold text-ink-900">
                <Sparkles size={16} style={{ color: "#FF6B00" }} />
                Check Eligibility
              </h2>
              <p className="text-xs text-ink-500">Connect your wallet to verify your allocation</p>
            </div>

            <div className="p-6 space-y-4">
              {!checked ? (
                <button onClick={handleCheck} className="w-full py-4 rounded-xl font-bold text-white transition-colors hover:brightness-95" style={{ background: "#E8470A" }}>
                  {connected ? "Check My Wallet" : "Connect Wallet to Check"}
                </button>
              ) : (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                  <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-50 border border-emerald-600/20">
                    <CheckCircle size={20} className="text-emerald-600" />
                    <div>
                      <p className="text-sm font-semibold text-ink-900">Wallet eligible!</p>
                      <p className="text-xs text-ink-500 font-mono">{shortAddress}</p>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl border" style={{ background: "rgba(232,71,10,0.06)", borderColor: "rgba(232,71,10,0.18)" }}>
                    <p className="mb-3 text-xs font-semibold uppercase tracking-wider" style={{ color: "#E8470A" }}>
                      Allocation breakdown
                    </p>
                    <div className="space-y-2.5">
                      {ALLOCATION_BREAKDOWN.map(({ icon: Icon, label, detail, amount, multiplier }) => (
                        <div key={label} className="flex items-center gap-3">
                          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-white shadow-card" style={{ color: "#E8470A" }}>
                            <Icon size={14} />
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <p className="truncate text-sm font-semibold text-ink-900">{label}</p>
                              <span className="rounded-full px-1.5 py-0.5 text-[10px] font-bold" style={{ background: "rgba(255,107,0,0.14)", color: "#C24E02" }}>
                                {multiplier}
                              </span>
                            </div>
                            <p className="truncate text-xs text-ink-500">{detail}</p>
                          </div>
                          <span className="shrink-0 text-sm font-bold" style={{ color: "#E8470A" }}>
                            +{amount.toLocaleString("en-US")}
                          </span>
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 flex items-center justify-between border-t pt-3" style={{ borderColor: "rgba(232,71,10,0.15)" }}>
                      <span className="text-sm font-semibold text-ink-900">Total allocation</span>
                      <div className="text-right">
                        <p className="font-display text-lg font-black" style={{ color: "#E8470A" }}>2,500 TOKEN</p>
                        <p className="text-xs text-ink-500">≈ $250.00</p>
                      </div>
                    </div>
                    <div className="mt-2 flex justify-between text-xs">
                      <span className="text-ink-500">Eligibility proof</span>
                      <span className="font-mono text-ink-500">0x4f3a…8c2d</span>
                    </div>
                  </div>

                  {/* Vesting note */}
                  <div className="flex items-start gap-2 rounded-xl border p-3 text-xs text-ink-600" style={{ background: "rgba(255,107,0,0.05)", borderColor: "rgba(255,107,0,0.18)" }}>
                    <Clock size={14} className="mt-0.5 shrink-0" style={{ color: "#FF6B00" }} />
                    <span>
                      <strong className="text-ink-900">625 TOKEN</strong> unlock now (25%). The rest vests
                      linearly over 6 months.
                    </span>
                  </div>

                  {success ? (
                    <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="space-y-2">
                      <div className="w-full py-4 rounded-xl text-center font-bold text-emerald-600 bg-emerald-50 border border-emerald-600/25">
                        ✓ 2,500 TOKEN Claimed!
                      </div>
                      <button
                        onClick={reset}
                        className="w-full rounded-xl border py-2.5 text-xs font-semibold text-ink-500 transition-colors hover:text-ink-900"
                        style={{ borderColor: "rgba(232,71,10,0.18)" }}
                      >
                        Run it again
                      </button>
                    </motion.div>
                  ) : (
                    <button onClick={handleClaim} className="w-full py-4 rounded-xl font-bold text-white transition-colors hover:brightness-95" style={{ background: "#E8470A" }}>
                      Claim 2,500 TOKEN
                    </button>
                  )}
                </motion.div>
              )}

              {/* Demo toggle, right under the primary CTA */}
              <div className="pt-1">
                <DangerModeToggle checked={dangerous} onChange={setDangerous} label="Simulate phishing claim" activeColor="#ef4444" />
              </div>
            </div>
          </motion.div>

          {/* Vesting schedule */}
          <section className="mt-14">
            <h2 className="mb-1 flex items-center gap-2 font-display text-xl font-black tracking-tight text-ink-900">
              <Timer size={18} style={{ color: "#FF6B00" }} />
              Vesting Schedule
            </h2>
            <p className="mb-5 text-sm text-ink-500">25% unlocks at claim, then linear over six months.</p>
            <div className={`${panel} p-5`} style={panelStyle}>
              <div className="flex h-3 overflow-hidden rounded-full" style={{ background: "rgba(232,71,10,0.12)" }}>
                {VESTING.map((v, i) => (
                  <motion.div
                    key={v.label}
                    initial={{ width: 0 }}
                    whileInView={{ width: `${v.pct}%` }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.7, delay: i * 0.12, ease: "easeOut" }}
                    className={`h-full ${i > 0 ? "border-l border-white/50" : ""}`}
                    style={{ background: `linear-gradient(90deg, rgba(255,107,0,${v.opacity}), rgba(232,71,10,${v.opacity}))` }}
                  />
                ))}
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {VESTING.map((v) => (
                  <div key={v.label} className="rounded-xl border p-3" style={{ borderColor: "rgba(232,71,10,0.15)" }}>
                    <p className="text-xs font-semibold text-ink-500">{v.label}</p>
                    <p className="mt-1 font-display text-base font-black text-ink-900">{v.tokens}</p>
                    <p className="text-[11px]" style={{ color: "#E8470A" }}>
                      {v.pct}% · {v.when}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Claim steps checklist */}
          <section className="mt-14">
            <h2 className="mb-1 flex items-center gap-2 font-display text-xl font-black tracking-tight text-ink-900">
              <ListChecks size={18} style={{ color: "#FF6B00" }} />
              Your Claim Steps
            </h2>
            <p className="mb-5 text-sm text-ink-500">Complete each step to unlock your tokens.</p>
            <div className={`${panel} divide-y divide-ink-900/8 p-2`} style={panelStyle}>
              {[
                { icon: Wallet, label: "Connect your wallet", detail: "Link the wallet that qualifies", done: connected },
                { icon: CheckCircle, label: "Verify eligibility", detail: "Confirm your allocation on-chain", done: checked },
                { icon: Gift, label: "Claim your tokens", detail: "Sign the claim transaction", done: success },
                { icon: Award, label: "Stake for bonus APR", detail: "Optional, earn on vested tokens", done: false },
              ].map(({ icon: Icon, label, detail, done }) => (
                <div key={label} className="flex items-center gap-3 p-3">
                  <span
                    className="flex size-9 shrink-0 items-center justify-center rounded-xl"
                    style={
                      done
                        ? { background: "linear-gradient(135deg,#FF6B00,#E8470A)", color: "#fff", boxShadow: "0 0 16px -4px rgba(232,71,10,0.6)" }
                        : { border: "1px solid rgba(232,71,10,0.2)", color: "#E8470A" }
                    }
                  >
                    {done ? <CheckCircle size={16} /> : <Icon size={16} />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-ink-900">{label}</p>
                    <p className="truncate text-xs text-ink-500">{detail}</p>
                  </div>
                  {done ? (
                    <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                      Done
                    </span>
                  ) : (
                    <Circle size={14} className="shrink-0 text-ink-300" />
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* Stats strip + recent claims */}
          <section id="leaderboard" className="mt-14 grid scroll-mt-24 gap-6 lg:grid-cols-5">
            <div className="grid grid-cols-2 gap-4 lg:col-span-2 lg:grid-cols-1">
              <div className={`${panel} p-5`} style={panelStyle}>
                <Users size={16} className="mb-2" style={{ color: "#E8470A" }} />
                <p className="font-display text-2xl font-black text-ink-900">89,204</p>
                <p className="text-xs text-ink-500">Participants claimed</p>
              </div>
              <div className={`${panel} p-5`} style={panelStyle}>
                <Coins size={16} className="mb-2" style={{ color: "#FF6B00" }} />
                <p className="font-display text-2xl font-black text-ink-900">31.4M</p>
                <p className="text-xs text-ink-500">TOKEN distributed</p>
              </div>
            </div>
            <div id="history" className={`${panel} scroll-mt-24 p-5 lg:col-span-3`} style={panelStyle}>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="flex items-center gap-2 text-sm font-bold text-ink-900">
                  <Sparkles size={14} style={{ color: "#FF6B00" }} />
                  Recent Claims
                </h3>
                <span className="rounded-full border border-ink-900/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-ink-400">
                  Sample data
                </span>
              </div>
              <div className="space-y-1">
                {RECENT_CLAIMS.map((c, i) => (
                  <motion.div
                    key={c.addr}
                    initial={{ opacity: 0, x: 12 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.04 }}
                    className="flex items-center gap-3 rounded-lg px-2 py-1.5 transition-colors hover:bg-ink-900/[0.03]"
                  >
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-full text-white" style={{ background: "linear-gradient(135deg,rgba(255,107,0,0.85),rgba(232,71,10,0.85))" }}>
                      <Gift size={12} />
                    </span>
                    <span className="font-mono text-xs text-ink-600">{c.addr}</span>
                    <span className="ml-auto text-sm font-semibold" style={{ color: "#E8470A" }}>
                      {c.amount} <span className="text-xs font-normal text-ink-400">TOKEN</span>
                    </span>
                    <span className="w-16 shrink-0 text-right text-xs text-ink-400">{c.when}</span>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>
        </div>
      </div>
    </SiteShell>
  );
}
