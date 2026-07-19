/**
 * Scrybe — pay-per-question oracle, x402 over an EVM testnet.
 *
 * This is Premon's flagship demo. The page itself pays nothing: it just does a
 * plain `fetch` to the merchant. The merchant answers HTTP 402 with x402
 * PaymentRequirements, and the Premon BROWSER EXTENSION's x402 layer transparently
 * intercepts it, pays real USDC on-chain (under the user's x402 caps / auto-approve
 * setting), and retries with the `X-PAYMENT` header — so a successful fetch comes
 * back as a normal 200 with the answer.
 *
 * No session keys, no native MON, no dApp-side signing. Connecting a wallet is
 * optional: the extension pays from its own wallet regardless.
 */

import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Sparkles, ShieldCheck, AlertTriangle,
  Loader2, Zap, ChevronDown, Lock, ShieldQuestion,
  Terminal, Clock, FileCheck, MessageSquare, ArrowRight, Cpu, Check,
} from "lucide-react";
import { useWallet } from "../../wallet/context";

type Phase =
  | "asking"     // sent the fetch — extension may be settling x402 transparently
  | "answered"   // 200 + answer
  | "declined"   // 402 — extension didn't pay
  | "error";

interface AnswerEntry {
  id: string;
  question: string;
  phase: Phase;
  answer?: string;
  network?: string;
  txHash?: string;
  error?: string;
  startedAt: number;
  finishedAt?: number;
}

const SUGGESTIONS = [
  "What is liquid staking?",
  "How does an AMM price swaps?",
  "What does an aggregator route?",
  "Explain USDC on-chain",
];

const DECLINE_MESSAGE =
  "Premon didn't authorize this payment — install/unlock the extension, or check your x402 settings (auto-approve + caps) in the wallet.";

// Static marketing content for the landing view (no live calls).
const EXAMPLES: { q: string; a: string; ms: number }[] = [
  {
    q: "What is an EVM aggregator route?",
    a: "An aggregator splits one swap across several liquidity sources — pools, order books, RFQ quotes — and stitches the fills back together so you get closer to the best available price than any single pool alone would offer.",
    ms: 820,
  },
  {
    q: "How does x402 settle a payment?",
    a: "The server answers HTTP 402 with PaymentRequirements. The Premon extension builds and pays the exact USDC amount on-chain under your caps, then retries the request with an X-PAYMENT header — the answer comes back with the transaction hash.",
    ms: 940,
  },
  {
    q: "Why pay per question instead of a subscription?",
    a: "Machine clients can't sign up for plans. A $0.001 pay-per-call meters usage exactly, needs no accounts or API keys, and every request settles its own on-chain proof of payment.",
    ms: 760,
  },
];

const FLOW_STEPS: { n: string; icon: typeof Zap; t: string; b: string }[] = [
  { n: "01", icon: MessageSquare, t: "Ask", b: "The page requests an answer over plain HTTP." },
  { n: "02", icon: Lock, t: "402 Payment Required", b: "The oracle returns PaymentRequirements: $0.001 USDC." },
  { n: "03", icon: ShieldCheck, t: "Premon pays", b: "The extension settles USDC on-chain under your x402 caps." },
  { n: "04", icon: Zap, t: "Answer", b: "The retried fetch returns 200 with the answer." },
];

const ORACLE_STATS: { icon: typeof Zap; value: string; label: string }[] = [
  { icon: MessageSquare, value: "48,210", label: "Questions answered" },
  { icon: Clock, value: "0.9s", label: "Avg settle time" },
  { icon: FileCheck, value: "100%", label: "On-chain proofs" },
];

const RECENT_QUESTIONS: { q: string; ago: string; ms: number }[] = [
  { q: "What secures Monad's consensus?", ago: "just now", ms: 780 },
  { q: "How does an EIP-1559 base fee adjust?", ago: "12s ago", ms: 910 },
  { q: "Difference between an EOA and a smart account?", ago: "44s ago", ms: 850 },
  { q: "What is MEV and who captures it?", ago: "1m ago", ms: 690 },
  { q: "How does USDC keep its peg?", ago: "2m ago", ms: 970 },
];

export default function Scrybe() {
  const { connected, shortAddress, openWalletModal, disconnect } = useWallet();
  const [question, setQuestion] = useState("");
  const [history, setHistory] = useState<AnswerEntry[]>([]);
  const [pending, setPending] = useState(false);

  async function submit(q: string) {
    const trimmed = q.trim();
    if (!trimmed || pending) return;
    void runQuestion(trimmed);
  }

  async function runQuestion(q: string) {
    setPending(true);
    setQuestion("");
    const entryId = `ask-${Date.now()}`;
    const entry: AnswerEntry = { id: entryId, question: q, phase: "asking", startedAt: Date.now() };
    setHistory((prev) => [...prev, entry]);
    const update = (patch: Partial<AnswerEntry>) =>
      setHistory((prev) => prev.map((e) => (e.id === entryId ? { ...e, ...patch } : e)));

    try {
      // Plain fetch. If the Premon extension is installed + within caps, it pays
      // real USDC on-chain and transparently retries — so we just see a 200.
      const res = await fetch(`/api/demo/scrybe?q=${encodeURIComponent(q)}`, {
        headers: { accept: "application/json" },
      });

      if (res.status === 200) {
        const body = await res.json().catch(() => ({}));
        update({
          phase: "answered",
          answer: body.answer ?? "(empty answer)",
          network: body.network,
          txHash: body.txHash ?? undefined,
          finishedAt: Date.now(),
        });
        return;
      }

      if (res.status === 402) {
        // The extension didn't pay: not installed, locked, paused/revoked,
        // over cap, or the user declined the approval popup.
        update({ phase: "declined", error: DECLINE_MESSAGE, finishedAt: Date.now() });
        return;
      }

      const body = await res.json().catch(() => ({}));
      throw new Error(body.error ?? `Server returned ${res.status}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      update({ phase: "error", error: msg, finishedAt: Date.now() });
    } finally {
      setPending(false);
    }
  }

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    void submit(question);
  }

  return (
    <div className="relative min-h-screen bg-paper text-ink-900">
      {/* Backdrop: glow + grid, in Premon's own violet */}
      <div
        className="pointer-events-none fixed inset-0"
        style={{
          background:
            "radial-gradient(ellipse 60% 45% at 50% -5%, rgba(131,110,249,0.14) 0%, transparent 62%), radial-gradient(ellipse 50% 40% at 85% 15%, rgba(131,110,249,0.08) 0%, transparent 60%)",
        }}
      />
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.5]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(131,110,249,0.07) 1px,transparent 1px),linear-gradient(90deg,rgba(131,110,249,0.07) 1px,transparent 1px)",
          backgroundSize: "48px 48px",
          maskImage: "radial-gradient(ellipse 90% 60% at 50% 0%, black, transparent 78%)",
          WebkitMaskImage: "radial-gradient(ellipse 90% 60% at 50% 0%, black, transparent 78%)",
        }}
      />

      <Link to="/showcase" className="fixed top-4 left-4 z-50 flex items-center gap-1.5 text-xs text-ink-900/40 hover:text-ink-900/80 transition-colors">
        <ArrowLeft size={12} /> Showcase
      </Link>

      <header className="relative border-b border-ink-900/10 sticky top-0 backdrop-blur-md z-30 bg-paper/85">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-white"
              style={{ background: "linear-gradient(135deg,#836EF9,#5B40D6)", boxShadow: "0 0 18px rgba(131,110,249,0.45)" }}
            >
              <Zap size={15} />
            </div>
            <div>
              <h1 className="font-display font-bold tracking-tight">Scrybe</h1>
              <p className="mt-0.5 flex items-center gap-1 font-mono text-[10px] leading-none text-brand-600">
                <Terminal size={9} /> AI oracle · x402
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {connected ? (
              <button
                onClick={() => void disconnect()}
                className="flex items-center gap-2 px-2.5 py-1 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-600/25"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                {shortAddress}
              </button>
            ) : (
              <button
                onClick={openWalletModal}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-medium bg-bone text-ink-900/70 border border-ink-900/12 hover:bg-ink-900/[0.04]"
              >
                <Lock size={10} /> Connect (optional)
              </button>
            )}
            <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-medium bg-brand-50 text-brand-700 border border-brand-500/20">
              <ShieldCheck size={10} /> Premon x402
            </span>
            <span className="hidden sm:inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-mono font-medium bg-bone text-ink-900/60 border border-ink-900/10">
              $0.001/q
            </span>
          </div>
        </div>
      </header>

      <main className="relative max-w-3xl mx-auto px-5 sm:px-6 pt-12 pb-40">
        {history.length === 0 && (
          <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-12">
            {/* Hero */}
            <div>
              <span className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-brand-500/25 bg-brand-50 px-3 py-1 font-mono text-[11px] font-medium text-brand-700">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand-500" /> HTTP 402 · Monad testnet
              </span>
              <h2 className="font-display text-4xl sm:text-5xl font-black tracking-tight leading-[1.05]">
                Ask anything.<br />
                <span className="text-brand-500">Pay per answer.</span>
              </h2>
              <p className="mt-3 max-w-xl leading-relaxed text-ink-900/55">
                A pay-per-question oracle speaking the HTTP&nbsp;402 protocol on an EVM testnet.
                Each question costs $0.001 in USDC — but you never sign anything here. The Premon
                extension settles the payment on-chain automatically, under your x402 caps.
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                {[
                  { icon: Zap, t: "$0.001 / question" },
                  { icon: ShieldCheck, t: "No account · no API key" },
                  { icon: FileCheck, t: "Proof on every answer" },
                ].map(({ icon: Icon, t }) => (
                  <span
                    key={t}
                    className="inline-flex items-center gap-1.5 rounded-full border border-ink-900/10 bg-white/70 px-3 py-1.5 text-xs font-medium text-ink-900/70"
                  >
                    <Icon size={12} className="text-brand-500" /> {t}
                  </span>
                ))}
              </div>
            </div>

            {/* Suggestion prompts */}
            <div className="space-y-3">
              <p className="flex items-center gap-2 font-mono text-[11px] font-semibold uppercase tracking-wider text-ink-900/50">
                <Cpu size={12} className="text-brand-500" /> Try a question
              </p>
              <div className="grid sm:grid-cols-2 gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => void submit(s)}
                    disabled={pending}
                    className="group flex items-center gap-2 text-left px-4 py-3.5 rounded-xl text-sm transition-all disabled:opacity-50 bg-paper border border-ink-900/10 shadow-card hover:-translate-y-0.5 hover:border-brand-500/40 hover:shadow-lift"
                  >
                    <span className="font-mono text-brand-400 transition-transform group-hover:translate-x-0.5">›</span>
                    <span className="text-ink-900/80">{s}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Example Q&A showcase */}
            <ExampleShowcase />

            {/* Pricing + how it works */}
            <PricingFlow />

            {/* Oracle stats */}
            <OracleStats />

            {/* Recent questions feed */}
            <RecentFeed />

            <HowItWorksDisclosure />
          </motion.section>
        )}

        <div className="space-y-5 mt-2">
          <AnimatePresence initial={false}>
            {history.map((entry) => (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
              >
                <ConversationEntry entry={entry} />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </main>

      <form
        onSubmit={onSubmit}
        className="fixed bottom-0 inset-x-0 z-20 border-t border-ink-900/10 backdrop-blur-md bg-paper/92"
      >
        <div className="max-w-3xl mx-auto px-5 sm:px-6 py-3.5 flex items-center gap-3">
          <div className="relative flex-1">
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 font-mono text-brand-400">›</span>
            <input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask Scrybe a question…"
              disabled={pending}
              className="w-full pl-9 pr-4 py-3 rounded-xl bg-bone border border-ink-900/12 text-ink-900 outline-none focus:border-brand-500/50 focus:bg-paper transition-all placeholder:text-ink-900/35 disabled:opacity-60 font-mono text-sm"
            />
          </div>
          <button
            type="submit"
            disabled={pending || !question.trim()}
            className="px-4 py-3 rounded-xl text-sm font-semibold disabled:opacity-30 transition-all flex items-center gap-2 text-white bg-ink-900 hover:bg-ink-800"
          >
            <Zap size={13} className="text-brand-500" /> Ask
          </button>
        </div>
      </form>
    </div>
  );
}

/* ───────── pieces ───────── */

function ConversationEntry({ entry }: { entry: AnswerEntry }) {
  return (
    <div className="space-y-3">
      <div className="flex items-start gap-3 justify-end">
        <p
          className="pt-1 rounded-2xl rounded-tr-sm text-white px-4 py-2.5 leading-relaxed max-w-[80%]"
          style={{ background: "linear-gradient(135deg,#836EF9,#5B40D6)", boxShadow: "0 8px 24px -10px rgba(131,110,249,0.5)" }}
        >
          {entry.question}
        </p>
        <div className="w-7 h-7 rounded-full bg-ink-900/8 flex items-center justify-center text-[10px] text-ink-900/55 shrink-0">you</div>
      </div>

      {entry.phase === "asking" && <ProgressStep />}

      {entry.answer && (
        <div className="flex items-start gap-3">
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-white"
            style={{ background: "linear-gradient(135deg,#836EF9,#5B40D6)", boxShadow: "0 0 14px rgba(131,110,249,0.4)" }}
          >
            <Sparkles size={11} />
          </div>
          <div className="flex-1">
            <p className="rounded-2xl rounded-tl-sm bg-bone text-ink-900 px-4 py-2.5 leading-relaxed border border-ink-900/8">{entry.answer}</p>
            <SettlementReceipt
              network={entry.network}
              txHash={entry.txHash}
              elapsedMs={(entry.finishedAt ?? Date.now()) - entry.startedAt}
            />
          </div>
        </div>
      )}

      {entry.phase === "declined" && (
        <div className="ml-10 flex items-start gap-2 text-sm rounded-lg p-3 bg-bone border border-ink-900/12">
          <ShieldQuestion size={14} className="mt-0.5 shrink-0 text-ink-900/55" />
          <span className="text-ink-900/70">{entry.error}</span>
        </div>
      )}

      {entry.phase === "error" && (
        <div className="ml-10 flex items-start gap-2 text-sm rounded-lg p-3 border border-rose-500/25 bg-rose-500/10">
          <AlertTriangle size={14} className="mt-0.5 shrink-0 text-rose-500" />
          <span className="text-rose-600">{entry.error}</span>
        </div>
      )}
    </div>
  );
}

function ProgressStep() {
  const PHASES = [
    { key: "ask",    label: "Asking" },
    { key: "settle", label: "Premon settling x402" },
    { key: "answer", label: "Answered" },
  ];
  // Everything happens inside one transparent fetch, so we surface the middle
  // step as the active one while we wait.
  const idx = 1;

  return (
    <div className="ml-10 rounded-xl p-3.5 space-y-1.5 bg-white/70 border border-ink-900/10 font-mono">
      {PHASES.map((p, i) => {
        const done = i < idx;
        const active = i === idx;
        return (
          <div key={p.key} className="flex items-center gap-2.5 text-xs">
            <span
              className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full ${
                done ? "bg-emerald-500/15" : active ? "bg-brand-500/15" : "bg-ink-900/6"
              }`}
            >
              {done
                ? <Check size={9} className="text-emerald-500" />
                : active ? <Loader2 size={9} className="animate-spin text-brand-500" />
                : <span className="text-[8px] text-ink-900/35">{i + 1}</span>}
            </span>
            <span className={active ? "font-semibold text-ink-900" : done ? "text-ink-900/55" : "text-ink-900/35"}>
              {p.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function SettlementReceipt({ network, txHash, elapsedMs }: {
  network?: string; txHash?: string; elapsedMs: number;
}) {
  const explorerTx = txHash
    ? `https://testnet.monadexplorer.com/tx/${txHash}`
    : null;
  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 220, damping: 22 }}
      className="mt-3 rounded-xl p-3.5 text-xs flex items-start gap-2.5 bg-emerald-50 border border-emerald-600/20 shadow-[0_0_28px_-8px_rgba(16,185,129,0.35)]"
    >
      <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 bg-emerald-500/15">
        <ShieldCheck size={13} className="text-emerald-600" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-emerald-700 font-medium mb-1">
          Paid via Premon x402 · {network ?? "testnet"} · {(elapsedMs / 1000).toFixed(1)}s
        </p>
        {explorerTx ? (
          <a
            href={explorerTx}
            target="_blank"
            rel="noreferrer"
            className="text-[10px] text-emerald-700 underline font-mono break-all mt-0.5 inline-block"
          >
            tx {txHash!.slice(0, 12)}… ↗
          </a>
        ) : (
          <p className="text-[10px] text-ink-900/40 mt-1">
            Settled on-chain by the extension under your x402 caps.
          </p>
        )}
      </div>
    </motion.div>
  );
}

/* ───────── landing sections (static marketing) ───────── */

function ExampleShowcase() {
  return (
    <div className="space-y-4">
      <div>
        <p className="flex items-center gap-2 font-mono text-[11px] font-semibold uppercase tracking-wider text-ink-900/50">
          <Sparkles size={12} className="text-brand-500" /> Example answers
        </p>
        <p className="mt-1 text-sm text-ink-900/55">
          Sample question → answer pairs. Every real answer arrives with an on-chain receipt.
        </p>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        {EXAMPLES.map((ex) => (
          <motion.div
            key={ex.q}
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            className="flex flex-col gap-3 rounded-2xl border border-ink-900/10 bg-white/70 p-4 shadow-sm"
          >
            <div className="flex items-start gap-2">
              <span className="mt-0.5 shrink-0 font-mono text-brand-400">›</span>
              <p className="text-sm font-semibold leading-snug text-ink-900">{ex.q}</p>
            </div>
            <div className="flex items-start gap-2">
              <span
                className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-white"
                style={{ background: "linear-gradient(135deg,#836EF9,#5B40D6)", boxShadow: "0 0 12px rgba(131,110,249,0.45)" }}
              >
                <Sparkles size={9} />
              </span>
              <p className="text-xs leading-relaxed text-ink-900/60">{ex.a}</p>
            </div>
            <div className="mt-auto flex items-center gap-1.5 border-t border-ink-900/8 pt-2.5 text-[10px] text-emerald-600">
              <ShieldCheck size={11} /> Settled in {(ex.ms / 1000).toFixed(1)}s · proof on-chain
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function PricingFlow() {
  return (
    <div className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
      {/* Pricing card */}
      <div className="relative overflow-hidden rounded-2xl border border-brand-500/25 bg-brand-50 p-5" style={{ boxShadow: "0 0 40px -16px rgba(131,110,249,0.4)" }}>
        <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full blur-3xl" style={{ background: "rgba(131,110,249,0.20)" }} />
        <p className="relative flex items-center gap-2 font-mono text-[11px] font-semibold uppercase tracking-wider text-brand-700">
          <Zap size={12} /> Pricing
        </p>
        <div className="relative mt-3 flex items-end gap-1.5">
          <span className="font-display text-4xl font-black tracking-tight">$0.001</span>
          <span className="mb-1 text-sm text-ink-900/55">/ question</span>
        </div>
        <p className="relative mt-1 font-mono text-xs text-ink-900/50">≈ 0.001 USDC · Monad testnet</p>
        <ul className="relative mt-4 space-y-2 text-xs text-ink-900/70">
          {[
            "No subscription, no minimum spend",
            "Pay only for answers you receive",
            "Premon enforces your per-tx caps",
            "Every call carries its own proof",
          ].map((li) => (
            <li key={li} className="flex items-start gap-2">
              <Check size={13} className="mt-0.5 shrink-0 text-emerald-500" /> {li}
            </li>
          ))}
        </ul>
      </div>

      {/* How it works */}
      <div className="rounded-2xl border border-ink-900/10 bg-white/70 p-5 shadow-sm">
        <p className="flex items-center gap-2 font-mono text-[11px] font-semibold uppercase tracking-wider text-ink-900/50">
          <Terminal size={12} className="text-brand-500" /> The x402 handshake
        </p>
        <div className="mt-4 space-y-2.5">
          {FLOW_STEPS.map((s, i) => (
            <div key={s.n} className="flex items-start gap-3">
              <div className="flex flex-col items-center">
                <span
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white"
                  style={{ background: "linear-gradient(135deg,#836EF9,#5B40D6)", boxShadow: "0 0 14px rgba(131,110,249,0.4)" }}
                >
                  <s.icon size={14} />
                </span>
                {i < FLOW_STEPS.length - 1 && <span className="my-1 h-4 w-px bg-ink-900/10" />}
              </div>
              <div className="pt-1">
                <p className="flex items-center gap-2 text-sm font-bold text-ink-900">
                  <span className="font-mono text-[10px] text-brand-600">{s.n}</span>
                  {s.t}
                </p>
                <p className="mt-0.5 text-xs leading-snug text-ink-900/55">{s.b}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function OracleStats() {
  return (
    <div className="grid grid-cols-3 gap-3">
      {ORACLE_STATS.map(({ icon: Icon, value, label }) => (
        <motion.div
          key={label}
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          className="rounded-2xl border border-ink-900/10 bg-white/70 p-4 text-center shadow-sm"
        >
          <Icon size={16} className="mx-auto text-brand-500" />
          <p className="mt-2 font-display text-xl sm:text-2xl font-black tabular-nums">{value}</p>
          <p className="mt-0.5 text-[11px] leading-tight text-ink-900/55">{label}</p>
        </motion.div>
      ))}
    </div>
  );
}

function RecentFeed() {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-2 font-mono text-[11px] font-semibold uppercase tracking-wider text-ink-900/50">
          <Clock size={12} className="text-brand-500" /> Recent questions
        </p>
        <span className="rounded-full border border-ink-900/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-ink-900/40">
          Sample data
        </span>
      </div>
      <div className="divide-y divide-ink-900/8 overflow-hidden rounded-2xl border border-ink-900/10 bg-white/70 shadow-sm">
        {RECENT_QUESTIONS.map((r) => (
          <div key={r.q} className="flex items-center gap-3 px-4 py-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/12">
              <Check size={11} className="text-emerald-500" />
            </span>
            <p className="min-w-0 flex-1 truncate text-sm text-ink-900/75">{r.q}</p>
            <span className="hidden shrink-0 items-center gap-1 font-mono text-[10px] text-ink-900/40 sm:inline-flex">
              <Zap size={9} className="text-brand-400" /> {(r.ms / 1000).toFixed(1)}s
            </span>
            <span className="shrink-0 font-mono text-[10px] text-ink-900/40">{r.ago}</span>
          </div>
        ))}
      </div>
      <p className="flex items-center justify-center gap-1.5 text-[11px] text-ink-900/40">
        Ask your own to see a live settlement receipt <ArrowRight size={11} className="text-brand-400" />
      </p>
    </div>
  );
}

function HowItWorksDisclosure() {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl bg-paper border border-ink-900/10 shadow-card">
      <button
        onClick={() => setOpen((s) => !s)}
        className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-ink-900/[0.02] rounded-xl"
      >
        <span className="text-xs uppercase tracking-wider text-ink-900/50 font-semibold">Technical details</span>
        <ChevronDown size={12} className={`text-ink-900/35 transition-transform ${open ? "" : "-rotate-90"}`} />
      </button>
      {open && (
        <div className="px-4 pb-4 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          {[
            { n: "01", t: "Ask",     b: "Page does a plain fetch" },
            { n: "02", t: "402",     b: "Server demands 0.001 USDC" },
            { n: "03", t: "Premon",  b: "Extension pays USDC on-chain" },
            { n: "04", t: "Answer",  b: "Retried fetch returns 200" },
          ].map((s) => (
            <div key={s.n} className="rounded-lg p-2.5 bg-bone border border-ink-900/8">
              <p className="text-[9px] text-brand-700 font-mono">{s.n}</p>
              <p className="text-[12px] font-bold mt-0.5 text-ink-900">{s.t}</p>
              <p className="text-[10px] text-ink-900/50 mt-0.5 leading-snug">{s.b}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
