import { useState } from "react";
import { motion } from "framer-motion";
import {
  Sparkles,
  Minus,
  Plus,
  ArrowRight,
  Layers,
  Users,
  TrendingUp,
  Wallet,
  Crown,
  Zap,
  Shield,
  Gem,
  Rocket,
  Eye,
  Coins,
  Vote,
  HelpCircle,
  CheckCircle2,
} from "lucide-react";
import { DangerModeToggle } from "@premon/showcase-ui";
import { useWallet } from "../../wallet/context";
import { SiteShell } from "../../components/SiteShell";
import { ResultOverlay, type ResultState } from "../../premon/ResultOverlay";
import { RiskPreview } from "../../premon/RiskPreview";
import { buildScenario } from "../../premon/transactions";
import type { TxRequest } from "@premon/wallet-adapter";

const THEME = {
  primary: "#141414",
  accent: "#FF6B00",
  bg: "#FAF8F4",
  name: "PixelDrop",
  logo: (
    <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black" style={{ background: "#141414" }}>
      <span style={{ color: "#FF6B00" }}>P</span>
    </div>
  ),
};

const NFT_COLLECTION = {
  name: "Cyber Phantoms",
  description: "10,000 generative Phantoms, minted on Monad. Every Phantom is one vote in the DAO.",
  supply: 10000,
  minted: 6843,
  price: "0.1 MON",
  priceUsd: "$17.50",
};

// Headline collection metrics, stat tiles.
const COLLECTION_STATS = [
  { icon: Layers, label: "Items", value: "10,000" },
  { icon: Users, label: "Owners", value: "4,127" },
  { icon: TrendingUp, label: "Floor", value: "0.2 MON" },
  { icon: Coins, label: "Volume", value: "1,040 MON" },
  { icon: Wallet, label: "Minted", value: "68.4%" },
];

// Generated gallery of Cyber Phantoms, CSS gradient tiles + rarity chips.
const GALLERY: {
  id: number;
  glyph: string;
  from: string;
  to: string;
  rarity: "Common" | "Rare" | "Epic" | "Legendary";
}[] = [
  { id: 1841, glyph: "👾", from: "#FF6B00", to: "#141414", rarity: "Legendary" },
  { id: 2207, glyph: "🤖", from: "#322F2C", to: "#FF8938", rarity: "Epic" },
  { id: 3390, glyph: "🛸", from: "#FF6B00", to: "#E8470A", rarity: "Rare" },
  { id: 4512, glyph: "🦾", from: "#141414", to: "#FF6B00", rarity: "Common" },
  { id: 5028, glyph: "🧬", from: "#FF8938", to: "#322F2C", rarity: "Epic" },
  { id: 6144, glyph: "⚡", from: "#FF6B00", to: "#141414", rarity: "Rare" },
  { id: 7761, glyph: "🔮", from: "#322F2C", to: "#FF6B00", rarity: "Common" },
  { id: 8890, glyph: "👁️", from: "#E8470A", to: "#141414", rarity: "Legendary" },
];

const RARITY_STYLE: Record<string, string> = {
  Common: "border-ink-900/15 bg-bone text-ink-700",
  Rare: "border-ink-900/15 bg-bone text-ink-700",
  Epic: "border-brand-300/60 bg-brand-50 text-brand-700",
  Legendary: "border-[#FF6B00]/40 bg-[#FF6B00]/10 text-[#C24E02]",
};

// Rarity distribution breakdown.
const RARITY_TIERS = [
  { name: "Common", pct: 60, count: "6,000", icon: Gem },
  { name: "Rare", pct: 25, count: "2,500", icon: Shield },
  { name: "Epic", pct: 12, count: "1,200", icon: Zap },
  { name: "Legendary", pct: 3, count: "300", icon: Crown },
];

// Mint → reveal → staking → DAO roadmap.
const ROADMAP = [
  {
    phase: "Phase 01",
    title: "Genesis Mint",
    icon: Rocket,
    status: "live" as const,
    body: "10,000 Phantoms mint live on Monad. Fair 0.1 MON price, 5 per wallet.",
  },
  {
    phase: "Phase 02",
    title: "On-chain Reveal",
    icon: Eye,
    status: "next" as const,
    body: "Traits reveal 48h after sellout. Metadata pinned to IPFS + on-chain refs.",
  },
  {
    phase: "Phase 03",
    title: "Phantom Staking",
    icon: Coins,
    status: "soon" as const,
    body: "Stake Phantoms to earn $PHNTM emissions. Rarity boosts yield multipliers.",
  },
  {
    phase: "Phase 04",
    title: "Phantom DAO",
    icon: Vote,
    status: "soon" as const,
    body: "Every Phantom is one vote. Treasury and future drops governed on-chain.",
  },
];

const TRAIT_CATEGORIES = [
  { name: "Background", variants: 18 },
  { name: "Body", variants: 24 },
  { name: "Eyes", variants: 31 },
  { name: "Mouth", variants: 16 },
  { name: "Accessory", variants: 42 },
  { name: "Aura", variants: 9 },
];

const FAQ = [
  {
    q: "What is a Cyber Phantom?",
    a: "A fully generative PFP minted natively on Monad. Each Phantom is assembled from 140+ hand-drawn traits and grants one vote in the Phantom DAO.",
  },
  {
    q: "How much does it cost to mint?",
    a: "0.1 MON per Phantom (about $17.50) plus network fees. Wallets are capped at 5 to keep the drop fair.",
  },
  {
    q: "When do traits reveal?",
    a: "Metadata is revealed on-chain 48 hours after the collection sells out, so nobody can snipe rarities during the mint.",
  },
];

export default function PixelDrop() {
  const { connected, openWalletModal, walletAddress, adapter } = useWallet();
  const [qty, setQty] = useState(1);
  const [dangerous, setDangerous] = useState(false);
  const [resultState, setResultState] = useState<ResultState>("idle");
  const [signature, setSignature] = useState<string | null>(null);
  const [resultMessage, setResultMessage] = useState<string | null>(null);
  const [previewTx, setPreviewTx] = useState<TxRequest | null>(null);
  const success = signature !== null;
  const scenarioLabel = dangerous
    ? `Mint ${qty} Cyber Phantom NFT(s) (danger scenario · drainer pattern)`
    : `Mint ${qty} Cyber Phantom NFT(s) for ${(qty * 0.1).toFixed(2)} MON`;

  function reset() {
    setSignature(null);
    setResultMessage(null);
    setResultState("idle");
  }

  async function handleMint() {
    if (!connected || !walletAddress) { openWalletModal(); return; }
    try {
      const built = await buildScenario(dangerous ? "pixeldrop-danger" : "pixeldrop-safe", walletAddress);
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

  const pct = (NFT_COLLECTION.minted / NFT_COLLECTION.supply) * 100;

  // Warm ink-on-bone panel — reuses Premon's own `.card` convention, PixelDrop-toned.
  const panel = "card";

  return (
    <SiteShell
      theme={THEME}
      navLinks={[{ label: "Mint", href: "#mint" }, { label: "Gallery", href: "#gallery" }, { label: "Roadmap", href: "#roadmap" }, { label: "Community", href: "#community" }]}
    >
      <ResultOverlay
        state={resultState}
        signature={signature}
        message={resultMessage}
        onClose={() => setResultState("idle")}
      />

      {/* Background warm glow */}
      <div className="fixed inset-0 -z-10 pointer-events-none" style={{ background: "#FAF8F4" }} />
      <div className="fixed inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse 60% 40% at 50% 20%, rgba(255,107,0,0.07) 0%, transparent 70%)" }} />
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.05]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(20,20,20,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,107,0,0.6) 1px, transparent 1px)",
          backgroundSize: "44px 44px",
          maskImage: "radial-gradient(ellipse 90% 70% at 50% 0%, black 20%, transparent 75%)",
          WebkitMaskImage: "radial-gradient(ellipse 90% 70% at 50% 0%, black 20%, transparent 75%)",
        }}
      />

      <div className="min-h-screen flex flex-col items-center pt-8 pb-24 px-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-5xl">
          {/* Header */}
          <div className="text-center mb-14">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider mb-5 bg-brand-50 text-brand-700">
              <span className="relative flex size-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75" style={{ background: "#FF6B00" }} />
                <span className="relative inline-flex size-2 rounded-full" style={{ background: "#FF6B00" }} />
              </span>
              Live Mint
            </span>
            <h1 className="text-5xl font-black font-display text-ink-900 mb-4 tracking-tight">
              Cyber Phantoms
            </h1>
            <p className="text-ink-500 max-w-lg mx-auto">{NFT_COLLECTION.description}</p>
          </div>

          {/* Collection stats bar */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="mb-12 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5"
          >
            {COLLECTION_STATS.map(({ icon: Icon, label, value }, i) => (
              <div
                key={label}
                className={`${panel} group relative overflow-hidden p-4 ${i === 4 ? "col-span-2 sm:col-span-1" : ""}`}
              >
                <div className="pointer-events-none absolute -right-4 -top-4 h-16 w-16 rounded-full blur-2xl transition-opacity group-hover:opacity-80" style={{ background: "rgba(255,107,0,0.18)" }} />
                <Icon size={15} className="mb-2" style={{ color: "#FF6B00" }} />
                <p className="font-display text-xl font-black leading-none text-ink-900">{value}</p>
                <p className="mt-1.5 text-[11px] font-medium uppercase tracking-wider text-ink-400">{label}</p>
              </div>
            ))}
          </motion.div>

          <div className="grid md:grid-cols-2 gap-10 items-start">
            {/* NFT preview — deliberate dark art block on the light page */}
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}>
              <div className="aspect-square rounded-2xl overflow-hidden relative bg-ink-900 shadow-card" style={{ border: "1px solid rgba(20,20,20,0.1)" }}>
                {/* grid overlay */}
                <div
                  className="absolute inset-0 opacity-25"
                  style={{
                    backgroundImage:
                      "linear-gradient(rgba(255,107,0,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.15) 1px, transparent 1px)",
                    backgroundSize: "28px 28px",
                  }}
                />
                {/* Generative art placeholder */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="relative w-40 h-40">
                    {[...Array(6)].map((_, i) => (
                      <motion.div
                        key={i}
                        animate={{ rotate: 360 }}
                        transition={{ duration: 8 + i * 2, repeat: Infinity, ease: "linear" }}
                        className="absolute inset-0 rounded-full border"
                        style={{
                          borderColor: `hsla(24,100%,55%,${0.5 - i * 0.06})`,
                          transform: `scale(${0.3 + i * 0.12})`,
                        }}
                      />
                    ))}
                    <div className="absolute inset-0 flex items-center justify-center text-6xl drop-shadow-[0_0_20px_rgba(255,107,0,0.5)]">👾</div>
                  </div>
                </div>
                {/* Generative tag */}
                <div className="absolute left-4 top-4 flex items-center gap-1.5 rounded-full border border-white/10 bg-black/40 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-white/80 backdrop-blur">
                  <Sparkles size={11} /> Generative
                </div>
                <div className="absolute bottom-4 left-4 right-4">
                  <div className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>
                    <p className="text-xs text-white/45">Next Reveal</p>
                    <p className="font-mono font-bold text-white text-sm">#{NFT_COLLECTION.minted + qty}</p>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Mint panel */}
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 }} id="mint" className="space-y-6 scroll-mt-24">
              {/* Progress */}
              <div className={`${panel} p-5 space-y-3`}>
                <div className="flex justify-between items-center">
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider" style={{ color: "#C24E02" }}>
                    <span className="relative flex size-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75" style={{ background: "#FF6B00" }} />
                      <span className="relative inline-flex size-2 rounded-full" style={{ background: "#FF6B00" }} />
                    </span>
                    Minting Live
                  </span>
                  <span className="rounded-md px-2 py-0.5 text-xs font-bold bg-bone text-ink-700">
                    {(NFT_COLLECTION.supply - NFT_COLLECTION.minted).toLocaleString("en-US")} left
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-ink-500">Minted</span>
                  <span className="font-semibold text-ink-900">{NFT_COLLECTION.minted.toLocaleString("en-US")} / {NFT_COLLECTION.supply.toLocaleString("en-US")}</span>
                </div>
                <div className="h-2.5 rounded-full overflow-hidden bg-ink-900/10">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 1, delay: 0.3, ease: "easeOut" }}
                    className="h-full rounded-full"
                    style={{ background: "#FF6B00" }}
                  />
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-ink-400">{pct.toFixed(1)}% minted</span>
                  <span className="text-ink-400">Limit 5 / wallet</span>
                </div>
              </div>

              {/* Price + qty */}
              <div className={`${panel} p-5 space-y-4`}>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-ink-500">Price per NFT</span>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-md bg-brand-50 text-brand-700 font-bold text-sm">{NFT_COLLECTION.price}</span>
                    <span className="text-xs text-ink-400">{NFT_COLLECTION.priceUsd}</span>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-ink-500">Quantity</span>
                  <div className="flex items-center gap-3">
                    <button onClick={() => setQty(Math.max(1, qty - 1))} className="w-8 h-8 rounded-lg border border-ink-900/10 hover:border-ink-900/25 hover:bg-bone flex items-center justify-center text-ink-900 transition-colors"><Minus size={14} /></button>
                    <span className="w-8 text-center font-bold text-ink-900">{qty}</span>
                    <button onClick={() => setQty(Math.min(5, qty + 1))} className="w-8 h-8 rounded-lg border border-ink-900/10 hover:border-ink-900/25 hover:bg-bone flex items-center justify-center text-ink-900 transition-colors"><Plus size={14} /></button>
                  </div>
                </div>
                <div className="border-t border-ink-900/10 pt-4 flex justify-between">
                  <span className="text-sm text-ink-500">Total</span>
                  <span className="font-bold text-ink-900">{(0.1 * qty).toFixed(2)} MON <span className="text-ink-400 text-xs font-normal">${(17.5 * qty).toFixed(2)}</span></span>
                </div>
              </div>

              {success ? (
                <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="space-y-2">
                  <div className="w-full py-4 rounded-xl text-center font-bold text-emerald-600 bg-emerald-50" style={{ border: "1px solid rgba(16,185,129,0.25)" }}>
                    ✓ {qty} Phantom{qty > 1 ? "s" : ""} Minted!
                  </div>
                  <button
                    onClick={reset}
                    className="w-full rounded-xl border border-ink-900/10 py-2.5 text-xs font-semibold text-ink-500 transition-colors hover:text-ink-900"
                  >
                    Run it again
                  </button>
                </motion.div>
              ) : (
                <button onClick={handleMint} className="group w-full py-4 rounded-xl font-bold text-white flex items-center justify-center gap-2 transition-colors" style={{ background: "#141414" }} onMouseEnter={(e) => (e.currentTarget.style.background = "#322F2C")} onMouseLeave={(e) => (e.currentTarget.style.background = "#141414")}>
                  {connected ? `Mint ${qty} Phantom${qty > 1 ? "s" : ""}` : "Connect Wallet"}
                  <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" style={{ color: "#FF6B00" }} />
                </button>
              )}

              {/* Demo toggle */}
              <DangerModeToggle checked={dangerous} onChange={setDangerous} label="Simulate wallet drainer" activeColor="#E8470A" />

              {/* Traits */}
              <div className="grid grid-cols-3 gap-2">
                {["Background", "Body", "Eyes", "Mouth", "Accessory", "Aura"].map((t) => (
                  <div key={t} className="rounded-xl p-2.5 text-center bg-bone border border-ink-900/10">
                    <p className="text-xs text-ink-400">{t}</p>
                    <p className="text-xs font-medium text-ink-600 mt-0.5">?</p>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>

          {/* Gallery */}
          <section id="gallery" className="mt-24 scroll-mt-24">
            <div className="mb-8 flex items-end justify-between">
              <div>
                <h2 className="font-display text-2xl font-black tracking-tight text-ink-900">The Gallery</h2>
                <p className="mt-1 text-sm text-ink-500">Freshly generated Phantoms, straight off the on-chain assembler.</p>
              </div>
              <span className="hidden items-center gap-1.5 text-sm font-semibold sm:inline-flex" style={{ color: "#C24E02" }}>
                View all <ArrowRight size={14} />
              </span>
            </div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {GALLERY.map((item, i) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 18 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-40px" }}
                  transition={{ delay: (i % 4) * 0.06 }}
                  className={`${panel} group overflow-hidden p-2`}
                >
                  <div className="relative aspect-square overflow-hidden rounded-xl bg-ink-900">
                    <div
                      className="absolute inset-0 opacity-90 transition-transform duration-500 group-hover:scale-110"
                      style={{
                        background: `radial-gradient(circle at 30% 25%, ${item.from}cc, transparent 55%), radial-gradient(circle at 75% 80%, ${item.to}cc, transparent 55%), #141414`,
                      }}
                    />
                    <div
                      className="absolute inset-0 opacity-20"
                      style={{
                        backgroundImage:
                          "linear-gradient(rgba(255,255,255,0.35) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.35) 1px, transparent 1px)",
                        backgroundSize: "22px 22px",
                      }}
                    />
                    <div className="absolute inset-0 flex items-center justify-center text-5xl drop-shadow-[0_0_18px_rgba(0,0,0,0.6)]">
                      {item.glyph}
                    </div>
                    <span className={`absolute left-2 top-2 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider backdrop-blur ${RARITY_STYLE[item.rarity]}`}>
                      {item.rarity}
                    </span>
                  </div>
                  <div className="flex items-center justify-between px-1 py-2">
                    <span className="font-mono text-sm font-bold text-ink-900">#{item.id}</span>
                    <span className="text-xs font-semibold" style={{ color: "#C24E02" }}>0.1 MON</span>
                  </div>
                </motion.div>
              ))}
            </div>
          </section>

          {/* Rarity tiers */}
          <section className="mt-24">
            <h2 className="mb-2 font-display text-2xl font-black tracking-tight text-ink-900">Rarity Tiers</h2>
            <p className="mb-8 text-sm text-ink-500">Every Phantom is ranked by trait scarcity across four coded tiers.</p>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {RARITY_TIERS.map(({ name, pct: tierPct, count, icon: Icon }, i) => (
                <motion.div
                  key={name}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05 }}
                  className={`${panel} p-5`}
                >
                  <div className="mb-4 flex items-center justify-between">
                    <span className="flex size-9 items-center justify-center rounded-lg text-white" style={{ background: "#141414" }}>
                      <Icon size={16} style={{ color: "#FF6B00" }} />
                    </span>
                    <span className="font-display text-2xl font-black text-ink-900">{tierPct}%</span>
                  </div>
                  <p className="font-bold text-ink-900">{name}</p>
                  <p className="text-xs text-ink-500">{count} Phantoms</p>
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-ink-900/10">
                    <motion.div
                      initial={{ width: 0 }}
                      whileInView={{ width: `${tierPct}%` }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.8, ease: "easeOut" }}
                      className="h-full rounded-full"
                      style={{ background: "#FF6B00" }}
                    />
                  </div>
                </motion.div>
              ))}
            </div>
          </section>

          {/* Roadmap */}
          <section id="roadmap" className="mt-24 scroll-mt-24">
            <h2 className="mb-2 font-display text-2xl font-black tracking-tight text-ink-900">Roadmap</h2>
            <p className="mb-8 text-sm text-ink-500">From genesis mint to a fully Phantom-governed DAO.</p>
            <div className="relative space-y-5 before:absolute before:left-[19px] before:top-2 before:h-[calc(100%-1rem)] before:w-px before:bg-ink-900/10">
              {ROADMAP.map(({ phase, title, icon: Icon, status, body }, i) => (
                <motion.div
                  key={phase}
                  initial={{ opacity: 0, x: -16 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.06 }}
                  className="relative flex gap-4 pl-0"
                >
                  <span
                    className="relative z-10 flex size-10 shrink-0 items-center justify-center rounded-full border text-white"
                    style={
                      status === "live"
                        ? { background: "#141414", borderColor: "#141414" }
                        : { background: "#fff", borderColor: "rgba(20,20,20,0.15)", color: "#141414" }
                    }
                  >
                    <Icon size={16} style={status === "live" ? { color: "#FF6B00" } : undefined} />
                  </span>
                  <div className={`${panel} flex-1 p-4`}>
                    <div className="mb-1 flex items-center gap-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: "#C24E02" }}>{phase}</span>
                      {status === "live" && (
                        <span className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-brand-50 text-brand-700">Live now</span>
                      )}
                    </div>
                    <p className="font-bold text-ink-900">{title}</p>
                    <p className="mt-1 text-sm text-ink-500">{body}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </section>

          {/* Traits + FAQ */}
          <section id="community" className="mt-24 grid scroll-mt-24 gap-10 lg:grid-cols-2">
            <div>
              <h2 className="mb-2 font-display text-2xl font-black tracking-tight text-ink-900">Trait Library</h2>
              <p className="mb-6 text-sm text-ink-500">140+ hand-drawn traits combine into every Phantom.</p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {TRAIT_CATEGORIES.map(({ name, variants }) => (
                  <div key={name} className={`${panel} p-3`}>
                    <p className="text-sm font-semibold text-ink-900">{name}</p>
                    <p className="mt-0.5 text-xs" style={{ color: "#C24E02" }}>{variants} variants</p>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h2 className="mb-2 flex items-center gap-2 font-display text-2xl font-black tracking-tight text-ink-900">
                <HelpCircle size={20} style={{ color: "#FF6B00" }} />
                FAQ
              </h2>
              <p className="mb-6 text-sm text-ink-500">Everything you need before you mint.</p>
              <div className="space-y-3">
                {FAQ.map(({ q, a }) => (
                  <div key={q} className={`${panel} p-4`}>
                    <p className="flex items-start gap-2 font-semibold text-ink-900">
                      <CheckCircle2 size={15} className="mt-0.5 shrink-0" style={{ color: "#FF6B00" }} />
                      {q}
                    </p>
                    <p className="mt-1.5 pl-6 text-sm text-ink-500">{a}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </motion.div>
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
