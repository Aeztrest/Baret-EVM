/** Docs index — Premon light theme. */

import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft, ArrowUpRight, BookOpen, Shield, FileText, Zap, Layers, Globe,
} from "lucide-react";
import { PremonMark, Wordmark, LandingFooter } from "../components/LandingChrome";

const DOCS = [
  { title: "Overview",         desc: "What Premon catches, the repo layout, and how to run the full stack.",        path: "README.md",                    icon: BookOpen },
  { title: "Architecture",     desc: "The /v1/analyze request lifecycle, module map, and confidence model.",        path: "docs/ARCHITECTURE.md",         icon: Layers },
  { title: "Guard SDK",        desc: "@premon/guard — evaluate a transaction against a policy before signing.",      path: "packages/guard/README.md",     icon: Shield },
  { title: "Agent Kit",        desc: "@premon/agent-kit — a guarded ethers signer + CLI for agents and scripts.",    path: "packages/agent-kit/README.md", icon: FileText },
  { title: "PaymentGuard",     desc: "The on-chain spending-limit vault behind agentic x402 micropayments.",         path: "contracts/README.md",          icon: Zap },
  { title: "Brand",            desc: "The mark, palette, and typography Premon ships with.",                        path: "brand/README.md",              icon: Globe },
  { title: "Deploying Premon", desc: "Render + Vercel setup for the analyzer, wallet, and showcase, free tier.",     path: "DEPLOY.md",                    icon: BookOpen },
];

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-paper text-ink-900">
      {/* Header */}
      <header className="fixed top-0 inset-x-0 z-50 border-b border-ink-900/8 bg-white/85 backdrop-blur-xl">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/home" className="flex items-center gap-2.5 group">
            <PremonMark />
            <Wordmark className="text-sm" />
            <span className="hidden sm:inline text-ink-400 text-xs">/ Docs</span>
          </Link>
          <Link
            to="/home"
            className="inline-flex items-center gap-1.5 text-xs text-ink-500 hover:text-ink-900 px-3 py-1.5 rounded-md hover:bg-ink-900/[0.04]"
          >
            <ArrowLeft size={12} /> Home
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 pt-32 pb-24">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          <p className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] font-bold text-brand-600">
            <span className="w-6 h-[3px] hazard rounded-full" />
            Documentation
          </p>
          <h1 className="mt-4 font-display text-5xl md:text-6xl font-bold tracking-tight leading-[1.04]">
            How Premon<br />works, in detail.
          </h1>
          <p className="mt-6 text-ink-500 leading-relaxed max-w-2xl">
            Specs, protocols, and design notes that back every claim on the home page.
            Each entry below links straight to the real file in the repo.
          </p>
        </motion.div>

        <div className="mt-12 grid sm:grid-cols-2 gap-3">
          {DOCS.map((d, i) => (
            <motion.a
              key={d.path}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              href={`https://github.com/Aeztrest/Baret-EVM/blob/main/${d.path}`}
              target="_blank"
              rel="noreferrer"
              className="group card-hover block p-5"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <span className="w-10 h-10 grid place-items-center rounded-xl bg-ink-900 text-brand-400">
                    <d.icon size={16} />
                  </span>
                  <div>
                    <p className="font-display font-bold">{d.title}</p>
                    <p className="text-[11px] font-mono text-ink-400 mt-0.5">{d.path}</p>
                  </div>
                </div>
                <ArrowUpRight size={16} className="text-ink-300 group-hover:text-brand-500 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-all" />
              </div>
              <p className="mt-4 text-sm text-ink-500 leading-relaxed">{d.desc}</p>
            </motion.a>
          ))}
        </div>

        <div className="mt-16 card p-8 text-center bg-bone">
          <p className="font-display text-xl font-bold">Prefer to see it running?</p>
          <p className="mt-2 text-ink-500 max-w-md mx-auto">
            The showcase puts every layer of the wallet through its paces in your browser.
          </p>
          <Link to="/" className="btn-brand mt-6 !px-5 !py-2.5">
            Open the showcase <ArrowUpRight size={14} />
          </Link>
        </div>
      </main>

      <LandingFooter />
    </div>
  );
}
