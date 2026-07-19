/**
 * Live MON/USDC USD prices from CoinGecko's public API — no mock numbers.
 * Refreshed periodically so a swap quote reflects the real market rate.
 */

import { useEffect, useState } from "react";

const COINGECKO_URL =
  "https://api.coingecko.com/api/v3/simple/price?ids=monad,usd-coin&vs_currencies=usd";
const REFRESH_MS = 60_000;

export interface TokenPrices {
  mon: number | null;
  usdc: number | null;
}

export function useTokenPrices(): TokenPrices {
  const [prices, setPrices] = useState<TokenPrices>({ mon: null, usdc: null });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch(COINGECKO_URL);
        const json = (await res.json()) as {
          monad?: { usd?: number };
          "usd-coin"?: { usd?: number };
        };
        if (cancelled) return;
        setPrices({
          mon: json.monad?.usd ?? null,
          usdc: json["usd-coin"]?.usd ?? null,
        });
      } catch {
        // Transient fetch failure — keep showing the last known price.
      }
    }

    load();
    const id = setInterval(load, REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  return prices;
}
