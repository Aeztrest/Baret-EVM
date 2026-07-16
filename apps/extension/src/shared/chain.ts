/**
 * EVM chain configuration — single source of truth shared by the background
 * worker and the React surfaces.
 *
 * The native gas token is 18 decimals. USDC is the ERC-20 the x402
 * micropayment rails spend; the testnet token address is a placeholder that
 * may rotate.
 */

import type { EvmNetwork } from "@baret/ext-protocol";

export interface ChainConfig {
  network: EvmNetwork;
  chainId: number;
  /** EIP-155 chain id as a 0x-hex string (eth_chainId / wallet_switchEthereumChain). */
  chainIdHex: string;
  /** Primary RPC. */
  rpcUrl: string;
  /** All RPCs (primary + fallbacks) — used to build a resilient FallbackProvider. */
  rpcUrls: string[];
  explorerUrl: string;
  nativeSymbol: string;
  nativeDecimals: number;
  /** USDC ERC-20 token address (0x). */
  usdcAddress: string;
  usdcDecimals: number;
  /** Public testnet faucet URL ("" when none, e.g. mainnet). */
  faucetUrl: string;
}

export const CHAINS: Record<EvmNetwork, ChainConfig> = {
  testnet: {
    network: "testnet",
    chainId: 10143,
    chainIdHex: "0x279f",
    rpcUrl: "https://testnet-rpc.monad.xyz",
    rpcUrls: [
      "https://testnet-rpc.monad.xyz",
      "https://rpc.ankr.com/monad_testnet",
      "https://monad-testnet.drpc.org",
      "https://rpc-testnet.monadinfra.com",
    ],
    explorerUrl: "https://testnet.monadexplorer.com",
    nativeSymbol: "MON",
    nativeDecimals: 18,
    usdcAddress: "0x534b2f3A21130d7a60830c2Df862319e593943A3",
    usdcDecimals: 6,
    faucetUrl: "https://faucet.monad.xyz",
  },
  mainnet: {
    network: "mainnet",
    chainId: 143,
    chainIdHex: "0x8f",
    rpcUrl: "https://rpc.monad.xyz",
    rpcUrls: ["https://rpc.monad.xyz"],
    explorerUrl: "https://monadexplorer.com",
    nativeSymbol: "MON",
    nativeDecimals: 18,
    usdcAddress: "0x0000000000000000000000000000000000000000",
    usdcDecimals: 6,
    faucetUrl: "",
  },
};

export function chainFor(network: EvmNetwork): ChainConfig {
  return CHAINS[network] ?? CHAINS.testnet;
}

export function chainForId(chainId: number): ChainConfig | null {
  for (const cfg of Object.values(CHAINS)) {
    if (cfg.chainId === chainId) return cfg;
  }
  return null;
}

export function explorerTxUrl(network: EvmNetwork, txHash: string): string {
  return `${chainFor(network).explorerUrl}/tx/${txHash}`;
}

export function explorerAddressUrl(network: EvmNetwork, address: string): string {
  return `${chainFor(network).explorerUrl}/address/${address}`;
}
