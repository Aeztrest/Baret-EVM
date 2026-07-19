/**
 * NovaSwap demo vault.
 *
 * The showcase's NovaSwap site isn't a real DEX — there's no liquidity pool
 * deployed on Monad testnet. Instead, a single funded EOA (this vault) takes
 * the user's input token and pays back the counterpart at a fixed demo rate,
 * so the showcase can demonstrate a genuine two-way asset transfer without
 * writing and deploying an AMM contract.
 *
 * Configured via NOVASWAP_VAULT_PRIVATE_KEY. When unset, the feature is
 * simply inert — vaultAddress() returns null and the frontend falls back to
 * a self-transfer-only demo (no counter-payment).
 *
 * Rate is intentionally a fixed integer (default 4, i.e. 1 MON = 4 USDC) —
 * that keeps every conversion an exact bigint multiply/divide with no
 * fractional-rate rounding to reason about.
 */

import {
  JsonRpcProvider,
  Wallet,
  Contract,
  Interface,
  getAddress,
  type Provider,
  type TransactionReceipt,
} from "ethers";
import type { AppConfig } from "../config/index.js";

const ERC20 = new Interface([
  "function transfer(address to, uint256 amount) returns (bool)",
  "function balanceOf(address owner) view returns (uint256)",
]);

const RECEIPT_POLL_ATTEMPTS = 8;
const RECEIPT_POLL_INTERVAL_MS = 1500;

async function pollForReceipt(
  provider: Provider,
  txHash: string,
): Promise<TransactionReceipt | null> {
  for (let attempt = 0; attempt < RECEIPT_POLL_ATTEMPTS; attempt++) {
    const receipt = await provider.getTransactionReceipt(txHash).catch(() => null);
    if (receipt) return receipt;
    await new Promise((resolve) => setTimeout(resolve, RECEIPT_POLL_INTERVAL_MS));
  }
  return null;
}

/** 1 MON = this many USDC. Must stay a positive integer (see file doc). */
export const MON_PER_USDC_RATE = (() => {
  const n = Number(process.env.NOVASWAP_MON_USDC_RATE ?? "4");
  return Number.isInteger(n) && n > 0 ? n : 4;
})();

/** Safety cap: max MON-equivalent size of a single swap request. */
const MAX_MON_PER_SWAP = (() => {
  const n = Number(process.env.NOVASWAP_MAX_MON_PER_SWAP ?? "5");
  return Number.isInteger(n) && n > 0 ? n : 5;
})();

/** Gas headroom the vault always keeps in reserve, in wei. */
const GAS_RESERVE_WEI = 10n ** 16n; // 0.01 MON

export type FulfillResult =
  | { ok: true; payoutTxHash: string; payoutAmount: string; payoutSymbol: "MON" | "USDC" }
  | { ok: false; status: number; error: string };

// In-memory replay guard — resets on restart, same trade-off as the rest of
// this server's stores (see data/audit-store.ts). Acceptable here: the vault
// only ever holds small testnet amounts, and this is a low-traffic demo.
const fulfilled = new Set<string>();

let cached: { key: string; wallet: Wallet } | null = null;

function getWallet(config: AppConfig): Wallet | null {
  const key = process.env.NOVASWAP_VAULT_PRIVATE_KEY;
  if (!key) return null;
  if (cached?.key === key) return cached.wallet;
  const provider = new JsonRpcProvider(config.chain.rpcUrl);
  const wallet = new Wallet(key, provider);
  cached = { key, wallet };
  return wallet;
}

export function vaultAddress(config: AppConfig): string | null {
  return getWallet(config)?.address ?? null;
}

export async function fulfillSwap(
  config: AppConfig,
  txHash: string,
): Promise<FulfillResult> {
  const wallet = getWallet(config);
  if (!wallet) {
    return { ok: false, status: 503, error: "NovaSwap vault is not configured on this deployment." };
  }

  const dedupeKey = txHash.toLowerCase();
  if (fulfilled.has(dedupeKey)) {
    return { ok: false, status: 409, error: "This transaction has already been fulfilled." };
  }

  const provider = wallet.provider!;
  // The caller typically arrives right after broadcasting the incoming
  // payment — `sendTransaction` resolves with a hash as soon as the RPC
  // accepts it, well before it's mined. Poll briefly for the receipt instead
  // of failing on the very first check.
  const receipt = await pollForReceipt(provider, txHash);
  if (!receipt || receipt.status !== 1) {
    return { ok: false, status: 400, error: "Transaction not found or not confirmed on-chain yet." };
  }
  const tx = await provider.getTransaction(txHash).catch(() => null);
  if (!tx || !tx.from || !tx.to) {
    return { ok: false, status: 400, error: "Could not read the transaction." };
  }

  const sender = getAddress(tx.from);
  const vault = wallet.address;
  const usdcAddress = getAddress(config.chain.usdcAddress);
  const usdcDecimals = config.chain.usdcDecimals;

  let payoutAmount: bigint;
  let payoutSymbol: "MON" | "USDC";

  const isNativeToVault =
    getAddress(tx.to) === vault && tx.value > 0n && (!tx.data || tx.data === "0x");

  if (isNativeToVault) {
    const monIn = tx.value;
    const cap = BigInt(MAX_MON_PER_SWAP) * 10n ** 18n;
    if (monIn > cap) {
      return { ok: false, status: 400, error: `Swap exceeds the ${MAX_MON_PER_SWAP} MON demo cap.` };
    }
    payoutAmount = (monIn * BigInt(MON_PER_USDC_RATE) * 10n ** BigInt(usdcDecimals)) / 10n ** 18n;
    payoutSymbol = "USDC";
  } else if (getAddress(tx.to) === usdcAddress && tx.data && tx.data !== "0x") {
    let decoded: unknown;
    try {
      decoded = ERC20.decodeFunctionData("transfer", tx.data);
    } catch {
      return { ok: false, status: 400, error: "Unrecognized payment shape." };
    }
    const [to, amount] = decoded as unknown as [string, bigint];
    if (getAddress(to) !== vault) {
      return { ok: false, status: 400, error: "Transaction did not pay the NovaSwap vault." };
    }
    const usdcIn = amount;
    const cap = BigInt(MAX_MON_PER_SWAP) * BigInt(MON_PER_USDC_RATE) * 10n ** BigInt(usdcDecimals);
    if (usdcIn > cap) {
      return { ok: false, status: 400, error: "Swap exceeds the demo cap." };
    }
    payoutAmount = (usdcIn * 10n ** 18n) / (BigInt(MON_PER_USDC_RATE) * 10n ** BigInt(usdcDecimals));
    payoutSymbol = "MON";
  } else {
    return { ok: false, status: 400, error: "Transaction did not pay the NovaSwap vault." };
  }

  if (payoutAmount <= 0n) {
    return { ok: false, status: 400, error: "Amount too small to quote a counter-payment." };
  }

  const vaultMon = await provider.getBalance(vault);
  if (vaultMon < GAS_RESERVE_WEI) {
    return { ok: false, status: 503, error: "NovaSwap vault is out of gas funds — try again later." };
  }
  if (payoutSymbol === "MON") {
    if (vaultMon - GAS_RESERVE_WEI < payoutAmount) {
      return { ok: false, status: 503, error: "NovaSwap vault doesn't have enough MON liquidity for this swap size." };
    }
  } else {
    const usdcRead = new Contract(usdcAddress, ERC20, provider);
    const vaultUsdc = (await usdcRead.getFunction("balanceOf")(vault)) as bigint;
    if (vaultUsdc < payoutAmount) {
      return { ok: false, status: 503, error: "NovaSwap vault doesn't have enough USDC liquidity for this swap size." };
    }
  }

  let payoutTxHash: string;
  try {
    if (payoutSymbol === "MON") {
      const sent = await wallet.sendTransaction({ to: sender, value: payoutAmount });
      await sent.wait();
      payoutTxHash = sent.hash;
    } else {
      const usdcWrite = new Contract(usdcAddress, ERC20, wallet);
      const sent = await usdcWrite.getFunction("transfer")(sender, payoutAmount);
      await sent.wait();
      payoutTxHash = sent.hash;
    }
  } catch (err) {
    return {
      ok: false,
      status: 502,
      error: `Vault payout failed: ${err instanceof Error ? err.message : String(err)}`,
    };
  }

  // Marked done only after a successful payout broadcast — a transient
  // failure above should be retryable with the same incoming txHash rather
  // than permanently locked out.
  fulfilled.add(dedupeKey);

  return { ok: true, payoutTxHash, payoutAmount: payoutAmount.toString(), payoutSymbol };
}
