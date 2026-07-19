/**
 * Token badges for the balance rows + token detail screen — the real MON
 * and USDC marks, shipped as static assets (public/tokens/*.webp) and
 * resolved via runtime.getURL like every other extension-internal asset.
 */

import browser from "webextension-polyfill";

const MON_URL = browser.runtime.getURL("tokens/monad.webp");
const USDC_URL = browser.runtime.getURL("tokens/usdc.webp");

export function MonIcon({ size = 20 }: { size?: number }) {
  return (
    <img
      src={MON_URL}
      alt="MON"
      width={size}
      height={size}
      className="rounded-full"
      style={{ width: size, height: size }}
    />
  );
}

export function UsdcIcon({ size = 20 }: { size?: number }) {
  return (
    <img
      src={USDC_URL}
      alt="USDC"
      width={size}
      height={size}
      className="rounded-full"
      style={{ width: size, height: size }}
    />
  );
}

export function TokenIcon({ symbol, size = 20 }: { symbol: string; size?: number }) {
  if (symbol === "USDC") return <UsdcIcon size={size} />;
  return <MonIcon size={size} />;
}
