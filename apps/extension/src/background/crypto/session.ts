/**
 * In-memory session: holds the decrypted EOA secret while the wallet is
 * unlocked. Service worker memory only; never persisted.
 *
 * The secret is either a BIP-39 mnemonic phrase or a raw 0x-hex private key.
 * `useWallet()` rebuilds a fresh ethers signer from it on
 * every call and renews the idle timer; after `idleTimeoutMs` of inactivity
 * the session clears the secret and dispatches `wallet.locked`.
 *
 * Multi-account: mnemonic wallets derive additional accounts via BIP-44
 * (m/44'/60'/0'/0/index). Private-key imports have exactly one account
 * (index 0) since there's no seed to derive further from.
 */

import { HDNodeWallet, Mnemonic, Wallet } from "ethers";
import { dispatch, getState } from "../state/store";

export type EvmSigner = HDNodeWallet | Wallet;

let secret: string | null = null;
let activeIndex = 0;
let idleTimer: ReturnType<typeof setTimeout> | null = null;

export function isUnlocked(): boolean {
  return secret !== null;
}

export function getActiveIndex(): number {
  return activeIndex;
}

/** Build an ethers signer from a mnemonic phrase or 0x private key. */
export function walletFromSecret(secretValue: string, accountIndex = 0): EvmSigner {
  const trimmed = secretValue.trim();
  if (trimmed.includes(" ")) {
    if (!Mnemonic.isValidMnemonic(trimmed)) {
      throw new Error("Invalid recovery phrase.");
    }
    return HDNodeWallet.fromPhrase(trimmed, undefined, `m/44'/60'/0'/0/${accountIndex}`);
  }
  if (accountIndex !== 0) {
    throw new Error("Private-key wallets support only one account.");
  }
  const hex = trimmed.startsWith("0x") ? trimmed : `0x${trimmed}`;
  if (!/^0x[0-9a-fA-F]{64}$/.test(hex)) {
    throw new Error("Invalid private key — expected 32 bytes of hex.");
  }
  return new Wallet(hex);
}

/** Unlock with a decrypted secret. Returns the derived EOA address (0x). */
export function unlockWith(secretValue: string, accountIndex = 0): string {
  const w = walletFromSecret(secretValue, accountIndex);
  secret = secretValue;
  activeIndex = accountIndex;
  resetIdle();
  return w.address;
}

/**
 * Returns a fresh ethers signer backed by the unlocked secret at the active
 * account index. Renews the idle timer. Throws when the wallet is locked.
 */
export function useWallet(): EvmSigner {
  if (!secret) throw new Error("Wallet is locked. Unlock before signing.");
  resetIdle();
  return walletFromSecret(secret, activeIndex);
}

/** Derives the address at a given BIP-44 index without changing the active account. */
export function deriveAddressAt(accountIndex: number): string {
  if (!secret) throw new Error("Wallet is locked.");
  return walletFromSecret(secret, accountIndex).address;
}

/** Switches the active account. Returns its address. Throws if the index is invalid for this secret type. */
export function setActiveIndex(accountIndex: number): string {
  if (!secret) throw new Error("Wallet is locked.");
  const address = walletFromSecret(secret, accountIndex).address;
  activeIndex = accountIndex;
  resetIdle();
  return address;
}

export function lock(): void {
  secret = null;
  activeIndex = 0;
  if (idleTimer) {
    clearTimeout(idleTimer);
    idleTimer = null;
  }
  dispatch({ type: "wallet.locked" });
}

function resetIdle(): void {
  if (idleTimer) clearTimeout(idleTimer);
  const ms = getState().idleTimeoutMs;
  idleTimer = setTimeout(() => {
    console.info("[PREMON] idle timeout — locking wallet");
    lock();
  }, ms);
}
