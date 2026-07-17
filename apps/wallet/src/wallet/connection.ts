/**
 * EVM JSON-RPC client + chain config for the wallet.
 * The wallet talks to a single network; every value below is overridable via
 * Vite env vars to point the build at a different EVM chain.
 */

import { ethers } from "ethers";
import type { EvmNetwork } from "@premon/guard";

export const ACTIVE_NETWORK: EvmNetwork = "testnet";

export interface ChainConfig {
  network: EvmNetwork;
  chainId: number;
  rpcUrl: string;
  name: string;
  nativeSymbol: string;
  nativeDecimals: number;
  explorerBase: string;
}

const DEFAULT_CHAIN: ChainConfig = {
  network: "testnet",
  chainId: Number(import.meta.env.VITE_CHAIN_ID ?? 10143),
  rpcUrl: (import.meta.env.VITE_RPC_URL as string | undefined) ?? "https://testnet-rpc.monad.xyz",
  name: "EVM Testnet",
  nativeSymbol: (import.meta.env.VITE_NATIVE_SYMBOL as string | undefined) ?? "MON",
  nativeDecimals: 18,
  explorerBase: (import.meta.env.VITE_EXPLORER_URL as string | undefined) ?? "https://testnet.monadexplorer.com",
};

/** Fallback RPCs — a FallbackProvider races/fails over so a slow or
 *  rate-limited endpoint doesn't stall balance reads. Only used for the
 *  bundled default; a VITE_RPC_URL override talks to that endpoint alone. */
const FALLBACK_RPC_URLS = [
  "https://testnet-rpc.monad.xyz",
  "https://rpc.ankr.com/monad_testnet",
  "https://monad-testnet.drpc.org",
  "https://rpc-testnet.monadinfra.com",
];

const CHAINS: Record<EvmNetwork, ChainConfig> = {
  testnet: DEFAULT_CHAIN,
  // Mainnet isn't configured — point at the same default so the app still resolves.
  mainnet: DEFAULT_CHAIN,
};

export const CHAIN = CHAINS[ACTIVE_NETWORK];
export const RPC_URL = CHAIN.rpcUrl;
export const CHAIN_ID = CHAIN.chainId;
export const NATIVE_SYMBOL = CHAIN.nativeSymbol;

/**
 * There is usually no programmatic faucet for a testnet. Point users at the
 * public faucet and let them copy their address to fund it manually.
 */
export const FAUCET_URL = (import.meta.env.VITE_FAUCET_URL as string | undefined) ?? "https://faucet.monad.xyz";

/** Configurable USDC token on the active chain (6 decimals). */
export const USDC_TOKEN =
  (import.meta.env.VITE_USDC_ADDRESS as string | undefined) ??
  "0x534b2f3A21130d7a60830c2Df862319e593943A3";
export const USDC_DECIMALS = 6;

let provider: ethers.AbstractProvider | null = null;

export function getProvider(): ethers.AbstractProvider {
  if (!provider) {
    const net = new ethers.Network(CHAIN.name, CHAIN_ID);
    const rpcUrls = import.meta.env.VITE_RPC_URL ? [RPC_URL] : FALLBACK_RPC_URLS;
    const children = rpcUrls.map(
      (url) => new ethers.JsonRpcProvider(url, net, { staticNetwork: net, batchMaxCount: 1 }),
    );
    provider =
      children.length === 1
        ? children[0]!
        : new ethers.FallbackProvider(
            children.map((p, i) => ({ provider: p, priority: i + 1, weight: 1, stallTimeout: 1500 })),
            net,
            { quorum: 1 },
          );
  }
  return provider;
}

/** Block explorer deep link for an address or transaction. */
export function explorerUrl(kind: "account" | "address" | "tx", value: string): string {
  const seg = kind === "tx" ? "tx" : "address";
  return `${CHAIN.explorerBase}/${seg}/${value}`;
}
