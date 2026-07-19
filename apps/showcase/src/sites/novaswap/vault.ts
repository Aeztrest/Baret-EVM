/**
 * Client for the NovaSwap demo vault (apps/server's /demo/novaswap/* routes).
 * NovaSwap has no real DEX liquidity on Monad testnet, so a single funded
 * vault EOA stands in for a pool: pay it your input token, it pays back the
 * counterpart at a fixed rate. See apps/server/src/novaswap/vault.ts for the
 * mechanism and its safety caps.
 */

import { useEffect, useState } from "react";

const ANALYZE_BASE = import.meta.env.VITE_ANALYZE_URL ?? "http://localhost:8080";

export interface VaultConfig {
  vaultAddress: string | null;
  rate: number;
}

export function useVaultConfig(): VaultConfig {
  const [config, setConfig] = useState<VaultConfig>({ vaultAddress: null, rate: 4 });

  useEffect(() => {
    let cancelled = false;
    fetch(`${ANALYZE_BASE}/demo/novaswap/config`)
      .then((r) => r.json())
      .then((json: { vaultAddress?: string | null; rate?: number }) => {
        if (cancelled) return;
        setConfig({
          vaultAddress: json.vaultAddress ?? null,
          rate: json.rate ?? 4,
        });
      })
      .catch(() => {
        // Vault unreachable/misconfigured — stay in "no vault" fallback mode.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return config;
}

export interface FulfillResult {
  payoutTxHash: string;
  payoutAmount: string;
  payoutSymbol: "MON" | "USDC";
}

export async function fulfillSwap(txHash: string): Promise<FulfillResult> {
  const res = await fetch(`${ANALYZE_BASE}/demo/novaswap/fulfill`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ txHash }),
  });
  const json = (await res.json().catch(() => ({}))) as
    | FulfillResult
    | { error?: string };
  if (!res.ok) {
    throw new Error("error" in json && json.error ? json.error : `Vault request failed (${res.status})`);
  }
  return json as FulfillResult;
}
