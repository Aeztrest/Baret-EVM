import { useState } from "react";
import { motion } from "framer-motion";
import { formatEther, formatUnits } from "ethers";
import {
  ArrowUpDown,
  ChevronDown,
  Settings,
  Info,
  Loader2,
  Zap,
  Route,
} from "lucide-react";
import { DangerModeToggle } from "@premon/showcase-ui";
import { SiteShell } from "../../components/SiteShell";
import { ResultOverlay, type ResultState } from "../../premon/ResultOverlay";
import { buildScenario } from "../../premon/transactions";
import { useWallet } from "../../wallet/context";
import { useTokenBalances } from "../../wallet/useBalances";
import { useVaultConfig, fulfillSwap } from "./vault";

const USDC_DECIMALS = 6;
type PayoutState = "idle" | "pending" | "done" | "failed";

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

// Only MON/USDC: both have a real balance, read on-chain (see
// useTokenBalances). AQUA/yMON were removed — they were fictional tokens
// with no real data source and no way to actually select them (the
// selector buttons don't open a picker). The exchange rate is a fixed,
// human-friendly demo rate (live market data swings too much to test
// against reliably) — see useVaultConfig for the authoritative value.
const TOKENS = [
  { symbol: "MON", name: "Native Token", logo: "/tokens/monad.webp" },
  { symbol: "USDC", name: "USD Coin", logo: "/tokens/usdc.webp" },
];

function TokenIcon({ token }: { token: (typeof TOKENS)[number] }) {
  return (
    <img
      src={token.logo}
      alt={token.symbol}
      className="h-5 w-5 shrink-0 rounded-full object-cover"
    />
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
  const { vaultAddress, rate } = useVaultConfig();
  const [payoutState, setPayoutState] = useState<PayoutState>("idle");
  const [payoutText, setPayoutText] = useState<string | null>(null);
  const [payoutTxHash, setPayoutTxHash] = useState<string | null>(null);

  function priceFor(symbol: string): number {
    return symbol === "MON" ? rate : 1;
  }

  const outputAmount = (priceFor(fromToken.symbol) * parseFloat(amount || "0")) / priceFor(toToken.symbol);
  const success = signature !== null;

  function balanceFor(symbol: string): string {
    if (symbol === "MON") return monBalance === null ? "—" : monBalance.toFixed(4);
    if (symbol === "USDC") return usdcBalance === null ? "—" : usdcBalance.toFixed(4);
    return "—";
  }

  function reset() {
    setSignature(null);
    setResultMessage(null);
    setResultState("idle");
    setPayoutState("idle");
    setPayoutText(null);
    setPayoutTxHash(null);
  }

  // Builds the candidate tx and sends it straight to the wallet to sign —
  // Premon's own pre-sign review happens there, not as a separate step on
  // this page. When a NovaSwap vault is configured, the tx pays the vault
  // instead of self, and once it confirms we ask the vault to pay back the
  // other side of the swap at the fixed rate.
  async function handleSwap() {
    if (!connected || !walletAddress) { openWalletModal(); return; }
    setResultState("awaiting"); setSignature(null); setResultMessage(null);
    setPayoutState("idle"); setPayoutText(null); setPayoutTxHash(null);
    try {
      const built = await buildScenario(
        dangerous ? "novaswap-danger" : "novaswap-safe",
        walletAddress,
        { amount, tokenSymbol: fromToken.symbol, recipient: vaultAddress ?? undefined },
      );
      const { signature: sig } = await adapter.signAndSendTransaction(built.transaction);
      setSignature(sig); setResultState("confirmed");

      if (vaultAddress && !dangerous) {
        setPayoutState("pending");
        try {
          const payout = await fulfillSwap(sig);
          const human =
            payout.payoutSymbol === "USDC"
              ? formatUnits(payout.payoutAmount, USDC_DECIMALS)
              : formatEther(payout.payoutAmount);
          setPayoutText(`+${Number(human).toFixed(4)} ${payout.payoutSymbol}`);
          setPayoutTxHash(payout.payoutTxHash);
          setPayoutState("done");
        } catch (payoutErr) {
          setPayoutText(payoutErr instanceof Error ? payoutErr.message : String(payoutErr));
          setPayoutState("failed");
        }
      }
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
                  <p className="mt-1.5 text-xs text-ink-400">≈ ${(priceFor(fromToken.symbol) * parseFloat(amount || "0")).toFixed(2)}</p>
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
                  <p className="mt-1.5 text-xs text-ink-400">≈ ${(outputAmount * priceFor(toToken.symbol)).toFixed(2)}</p>
                </div>

                {/* Route info */}
                <div className="flex items-center justify-between px-1 text-xs text-ink-400">
                  <span className="flex items-center gap-1"><Route size={11} /> Route: NovaSwap</span>
                  <span className="flex items-center gap-1">0.3% fee <Info size={11} /></span>
                </div>

                {/* Honest disclaimer — wording depends on whether a demo vault
                    is actually configured on this deployment. */}
                <p className="flex items-start gap-1.5 rounded-lg px-2.5 py-2 text-[10.5px] leading-relaxed text-ink-400" style={{ background: "rgba(255,107,0,0.06)" }}>
                  <Info size={11} className="mt-0.5 shrink-0" style={{ color: "#C24E02" }} />
                  {vaultAddress ? (
                    <>
                      Demo quote — fixed 1 MON = {rate} USDC rate, not a live feed.
                      Your {fromToken.symbol} goes to NovaSwap's demo vault, which
                      automatically pays back {toToken.symbol} at that rate.
                    </>
                  ) : (
                    <>
                      Demo quote — fixed 1 MON = {rate} USDC rate, not a live feed. This
                      deployment has no NovaSwap vault configured, so the transaction
                      sent below moves your {fromToken.symbol} for Premon to analyze;
                      it won't deliver {toToken.symbol}.
                    </>
                  )}
                </p>

                {/* Swap button */}
                {success ? (
                  <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="space-y-2">
                    <div className="w-full rounded-xl border border-emerald-500/30 bg-emerald-50 py-4 text-center font-bold text-emerald-600">
                      ✓ Swap Successful
                    </div>
                    {payoutState === "pending" && (
                      <div className="flex items-center justify-center gap-2 rounded-xl border border-black/5 bg-ink-900/[0.02] py-2.5 text-xs font-semibold text-ink-500">
                        <Loader2 size={13} className="animate-spin" /> Waiting for the vault to send {toToken.symbol} back…
                      </div>
                    )}
                    {payoutState === "done" && (
                      <a
                        href={`https://testnet.monadexplorer.com/tx/${payoutTxHash}`}
                        target="_blank"
                        rel="noreferrer"
                        className="block w-full rounded-xl border border-emerald-500/30 bg-emerald-50 py-2.5 text-center text-xs font-semibold text-emerald-600 hover:underline"
                      >
                        {payoutText} received from the vault — view tx
                      </a>
                    )}
                    {payoutState === "failed" && (
                      <div className="rounded-xl border border-red-500/30 bg-red-50 px-3 py-2.5 text-xs font-semibold text-red-600">
                        Vault payout didn't go through: {payoutText}
                      </div>
                    )}
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
