/**
 * "Smart wallet" module.
 *
 * On EVM the EOA *is* the wallet — there is no per-user smart-wallet contract
 * to deploy or provision. This thin module exists only so the rest of the app
 * keeps a consistent shape: it resolves the
 * wallet address (the EOA) and reads on-chain balances.
 */

import { ethers } from "ethers";

/** The EOA address is the wallet address — nothing to provision. */
export function resolveWalletAddress(address: string): string {
  return address;
}

async function withRetry<T>(fn: () => Promise<T>, tries = 2): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < tries; i++) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr;
}

/** Native MON balance for an address (in MON), or null on RPC failure. */
export async function fetchNativeBalance(
  provider: ethers.Provider,
  address: string,
): Promise<number | null> {
  try {
    const wei = await withRetry(() => provider.getBalance(address));
    return Number(ethers.formatEther(wei));
  } catch {
    return null;
  }
}

const ERC20_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
];

export interface TokenBalance {
  amount: number;
  symbol: string;
  decimals: number;
}

/**
 * Read an ERC-20 balance for an address, or null on failure. Only `balanceOf`
 * is required (with retry); `decimals` / `symbol` are best-effort with fallbacks
 * so a flaky metadata read never blanks the balance.
 */
export async function fetchTokenBalance(
  provider: ethers.Provider,
  token: string,
  address: string,
  fallbackDecimals = 6,
  fallbackSymbol = "USDC",
): Promise<TokenBalance | null> {
  try {
    const c = new ethers.Contract(token, ERC20_ABI, provider);
    const [rawRes, decRes, symRes] = await Promise.allSettled([
      withRetry(() => c.balanceOf(address) as Promise<bigint>),
      c.decimals() as Promise<bigint>,
      c.symbol() as Promise<string>,
    ]);
    if (rawRes.status !== "fulfilled") return null; // balance is the hard requirement
    const dec = decRes.status === "fulfilled" ? Number(decRes.value) : fallbackDecimals;
    const symbol = symRes.status === "fulfilled" ? symRes.value : fallbackSymbol;
    return { amount: Number(ethers.formatUnits(rawRes.value, dec)), symbol, decimals: dec };
  } catch {
    return null;
  }
}
