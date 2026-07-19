import { useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowUpDown,
  ChevronDown,
  Settings,
  Info,
  Zap,
  Route,
} from "lucide-react";
import { DangerModeToggle } from "@premon/showcase-ui";
import { SiteShell } from "../../components/SiteShell";
import { ResultOverlay, type ResultState } from "../../premon/ResultOverlay";
import { buildScenario } from "../../premon/transactions";
import { useWallet } from "../../wallet/context";
import { useTokenBalances } from "../../wallet/useBalances";

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

// AQUA/yMON are fictional — NovaSwap doesn't have real pools for them, so
// there's no real price or balance to show. MON/USDC prices below are
// illustrative (no live price feed is wired up); their *balances* are real,
// read on-chain for the connected wallet — see useTokenBalances below.
const TOKENS = [
  { symbol: "MON", name: "Native Token", price: 175.0, logo: "/tokens/monad.webp" },
  { symbol: "USDC", name: "USD Coin", price: 1.0, logo: "/tokens/usdc.webp" },
  { symbol: "AQUA", name: "Aquarius", price: 3.4, logo: null },
  { symbol: "yMON", name: "Yield MON", price: 178.2, logo: null },
];

function TokenIcon({ token }: { token: (typeof TOKENS)[number] }) {
  if (token.logo) {
    return (
      <img
        src={token.logo}
        alt={token.symbol}
        className="h-5 w-5 shrink-0 rounded-full object-cover"
      />
    );
  }
  return (
    <span
      className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-black text-white"
      style={{ background: "linear-gradient(135deg,#FF6B00,#EA5E00)" }}
    >
      {token.symbol[0]}
    </span>
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
  const { mon: monBalance, usdc: usdcBalance } = useTokenBalances(walletAddress ?? null);

  const outputAmount = fromToken.price * parseFloat(amount || "0") / toToken.price;
  const success = signature !== null;

  /** Real on-chain balance for MON/USDC; no data exists for AQUA/yMON (fictional). */
  function balanceFor(symbol: string): string {
    if (symbol === "MON") return monBalance === null ? "—" : monBalance.toFixed(4);
    if (symbol === "USDC") return usdcBalance === null ? "—" : usdcBalance.toFixed(4);
    return "—";
  }

  function reset() {
    setSignature(null);
    setResultMessage(null);
    setResultState("idle");
  }

  // Builds the candidate tx and sends it straight to the wallet to sign —
  // Premon's own pre-sign review happens there, not as a separate step on
  // this page.
  async function handleSwap() {
    if (!connected || !walletAddress) { openWalletModal(); return; }
    setResultState("awaiting"); setSignature(null); setResultMessage(null);
    try {
      const built = await buildScenario(
        dangerous ? "novaswap-danger" : "novaswap-safe",
        walletAddress,
        { amount, tokenSymbol: fromToken.symbol },
      );
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

  function flip() {
    const tmp = fromToken;
    setFromToken(toToken);
    setToToken(tmp);
  }

  return (
    <SiteShell
      theme={THEME}
      navLinks={[{ label: "Swap", href: "#swap" }]}
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

          {/* Swap card */}
          <div className="mx-auto max-w-md">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              id="swap"
              className="w-full rounded-3xl p-px"
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
                    <span className="text-xs text-ink-400">Balance: {balanceFor(fromToken.symbol)}</span>
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
                      <TokenIcon token={fromToken} />
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
                    <span className="text-xs text-ink-400">Balance: {balanceFor(toToken.symbol)}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="flex-1 text-2xl font-bold text-ink-700">
                      {isNaN(outputAmount) ? "0" : outputAmount.toFixed(2)}
                    </span>
                    <button className="flex items-center gap-2 rounded-xl border border-black/5 bg-white px-3 py-1.5 text-sm font-semibold text-ink-900 shadow-sm">
                      <TokenIcon token={toToken} />
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
        </div>
      </div>
    </SiteShell>
  );
}
