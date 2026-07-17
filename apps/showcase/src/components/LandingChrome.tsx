/**
 * Premon brand chrome: logo mark, header, footer, backdrop.
 *
 * Identity: "Premon" = a foresight eye. White-first surfaces, Monad purple
 * (#836EF9) as the single accent, ink-black type. Signature motif: the
 * hazard stripe (orange/ink diagonals) plus the accent tick used in Eyebrow.
 */

import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ArrowRight, Github, Menu, X as XIcon } from "lucide-react";
import { cn } from "@premon/showcase-ui";

export const SOCIAL_GITHUB = "https://github.com/Aeztrest/Baret-EVM";
export const SOCIAL_X = "https://x.com/premonxyz";

const NAV_LINKS = [
  { label: "Home", to: "/home" },
  { label: "Showcase", to: "/showcase" },
  { label: "Agents", to: "/agents" },
  { label: "Docs", to: "/docs" },
  { label: "Install", to: "/install" },
];

const FOOTER_LINKS = [
  ...NAV_LINKS,
  { label: "Security", to: "/home#security" },
  { label: "FAQ", to: "/home#faq" },
];

/** The Premon foresight mark: an eye on an ink tile — the firewall sees the tx. */
export function PremonMark({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden>
      <rect width="32" height="32" rx="8" fill="#141414" />
      <path
        d="M6 16c3-4.7 7-7 10-7s7 2.3 10 7c-3 4.7-7 7-10 7s-7-2.3-10-7Z"
        fill="#FFFFFF"
      />
      <circle cx="16" cy="16" r="3.7" fill="#836EF9" />
    </svg>
  );
}

/** Logo = mark only (kept name/signature compatible with old call sites). */
export function Logo({ size = 8 }: { size?: number }) {
  return <PremonMark size={size * 4} />;
}

/** Wordmark: PREMON in display face with a purple full stop. */
export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={cn("font-display font-bold tracking-[0.14em] text-ink-900", className)}>
      PREMON<span className="text-brand-500">.</span>
    </span>
  );
}

/** Thin hazard-stripe rule — Premon's signature divider. */
export function HazardRule({ className = "" }: { className?: string }) {
  return <div aria-hidden className={cn("hazard h-1.5 w-full", className)} />;
}

/**
 * A quiet, neutral backdrop: a faint technical dot-grid that fades toward the
 * edges, plus a soft accent glow reserved for the very top of the page.
 */
export function BackdropGrid() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10">
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: "radial-gradient(rgba(20,20,20,0.06) 1px, transparent 1px)",
          backgroundSize: "22px 22px",
          maskImage: "radial-gradient(ellipse 80% 50% at 50% 0%, #000 20%, transparent 75%)",
          WebkitMaskImage: "radial-gradient(ellipse 80% 50% at 50% 0%, #000 20%, transparent 75%)",
        }}
      />
      <div
        className="absolute -top-48 left-1/2 -translate-x-1/2 w-[1000px] h-[1000px] rounded-full"
        style={{ background: "radial-gradient(closest-side, rgba(131,110,249,0.10), transparent 70%)" }}
      />
    </div>
  );
}

function NavLink({ to, label, onClick }: { to: string; label: string; onClick?: () => void }) {
  const { pathname } = useLocation();
  const active = to === pathname || (to === "/showcase" && pathname === "/");
  return (
    <Link
      to={to}
      onClick={onClick}
      className={cn(
        "relative px-3.5 py-2 text-sm font-semibold transition-colors",
        active ? "text-ink-900" : "text-ink-500 hover:text-ink-900",
      )}
    >
      {label}
      <span
        aria-hidden
        className={cn(
          "absolute inset-x-3.5 -bottom-0.5 h-px rounded-full bg-brand-500 transition-opacity",
          active ? "opacity-100" : "opacity-0",
        )}
      />
    </Link>
  );
}

export function LandingHeader({ cta }: { cta?: { label: string; to: string } | null } = {}) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const defaultCta =
    pathname.startsWith("/showcase") || pathname === "/"
      ? { label: "Get the wallet", to: "/install" }
      : { label: "Try the demo", to: "/showcase" };
  const headerCta = cta === null ? null : (cta ?? defaultCta);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-colors duration-300",
        scrolled ? "border-b border-ink-900/10 bg-white/80 backdrop-blur-xl" : "border-b border-transparent bg-transparent",
      )}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <Link to="/home" className="flex items-center gap-2.5">
          <PremonMark />
          <Wordmark className="text-sm" />
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {NAV_LINKS.map((l) => (
            <NavLink key={l.label} to={l.to} label={l.label} />
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {headerCta && (
            <Link
              to={headerCta.to}
              className="hidden items-center gap-1.5 rounded-input bg-ink-900 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-ink-700 sm:inline-flex"
            >
              {headerCta.label} <ArrowRight size={14} className="text-brand-400" />
            </Link>
          )}
          <button
            onClick={() => setOpen((v) => !v)}
            className="grid h-10 w-10 place-items-center rounded-input border border-ink-900/15 text-ink-900 transition-colors hover:bg-ink-900/5 md:hidden"
            aria-label="Menu"
          >
            {open ? <XIcon size={16} /> : <Menu size={16} />}
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-ink-900/10 bg-white/95 backdrop-blur-xl md:hidden">
          <div className="space-y-1 px-6 py-4">
            {NAV_LINKS.map((l) => (
              <Link
                key={l.label}
                to={l.to}
                onClick={() => setOpen(false)}
                className="block rounded-input px-3 py-2 text-sm text-ink-600 hover:bg-ink-900/5 hover:text-ink-900"
              >
                {l.label}
              </Link>
            ))}
            {headerCta && (
              <Link
                to={headerCta.to}
                onClick={() => setOpen(false)}
                className="mt-2 flex items-center justify-center gap-1.5 rounded-input bg-ink-900 px-4 py-3 text-sm font-bold text-white"
              >
                {headerCta.label} <ArrowRight size={14} />
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

export function XGlyph({ size = 13 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M18.244 2H21.5l-7.51 8.583L23 22h-6.91l-5.41-7.083L4.4 22H1.143l8.04-9.19L1 2h7.094l4.89 6.46L18.244 2zm-1.21 18h1.92L7.05 4H5.01l12.024 16z" />
    </svg>
  );
}

/** Persistently-dark footer island — an ink-900 surface regardless of the rest of the page. */
export function LandingFooter() {
  return (
    <footer className="relative bg-ink-900 text-white">
      <HazardRule />
      <div className="px-6 py-12">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-8 md:flex-row md:items-center">
          <div className="flex items-center gap-3">
            <PremonMark />
            <div>
              <p className="font-display text-sm font-bold tracking-[0.14em]">
                PREMON<span className="text-brand-500">.</span>
              </p>
              <p className="mt-0.5 text-xs text-white/45">Transaction foresight for EVM chains.</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {FOOTER_LINKS.map((l) => (
              <Link
                key={l.label}
                to={l.to}
                className="rounded-input px-3 py-1.5 text-xs text-white/55 transition-colors hover:bg-white/[0.06] hover:text-white"
              >
                {l.label}
              </Link>
            ))}
            <span className="mx-2 hidden h-4 w-px bg-white/15 md:inline-block" />
            <a
              href={SOCIAL_GITHUB}
              target="_blank"
              rel="noreferrer"
              aria-label="GitHub"
              className="grid h-9 w-9 place-items-center rounded-input border border-white/15 text-white/70 transition-colors hover:border-brand-500 hover:text-white"
            >
              <Github size={14} />
            </a>
            <a
              href={SOCIAL_X}
              target="_blank"
              rel="noreferrer"
              aria-label="X (Twitter)"
              className="grid h-9 w-9 place-items-center rounded-input border border-white/15 text-white/70 transition-colors hover:border-brand-500 hover:text-white"
            >
              <XGlyph />
            </a>
          </div>
        </div>

        <div className="mx-auto mt-8 flex max-w-7xl flex-col items-start justify-between gap-2 border-t border-white/10 pt-6 text-[11px] text-white/40 md:flex-row md:items-center">
          <p>© {new Date().getFullYear()} Premon. Open source, MIT licensed.</p>
          <p className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand-500" /> Live on EVM testnet
          </p>
        </div>
      </div>
    </footer>
  );
}
