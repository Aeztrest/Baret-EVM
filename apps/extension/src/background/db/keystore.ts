/**
 * Keystore: stores the encrypted EOA secret.
 *
 * Persistence is double-layered:
 *  1. IndexedDB (`keystore` object store) — primary, fast random read.
 *  2. browser.storage.local (BACKUP_KEY) — durable mirror.
 *
 * The mirror exists because Firefox temporary add-ons sometimes wipe
 * extension IndexedDB on reload, and `storage.local` is generally more
 * resilient.
 *
 * Exactly one row, id = "primary".
 */

import browser from "webextension-polyfill";
import { asPromise, tx } from "./index";
import type { EncryptedBlob } from "../crypto/kdf";
import type { WalletAccount } from "@premon/ext-protocol";

const BACKUP_KEY = "premon.keystore.backup.v1";

export interface KeystoreRow {
  id: "primary";
  blob: EncryptedBlob;
  /** Active EOA address (0x) — mirrors accounts[activeIndex].address. Shown by the wallet UI while locked. */
  address: string;
  /** What the encrypted blob holds, so export can label it correctly. */
  secretType: "mnemonic" | "privateKey";
  createdAt: number;
  /** BIP-44-derived accounts under this wallet's mnemonic (single entry for private-key imports). */
  accounts: WalletAccount[];
  activeIndex: number;
}

/** Back-fills accounts/activeIndex for rows written before multi-account support existed. */
function normalize(row: KeystoreRow): KeystoreRow {
  if (row.accounts && row.accounts.length > 0) return row;
  return {
    ...row,
    accounts: [{ index: 0, address: row.address, label: "Account 1" }],
    activeIndex: 0,
  };
}

export async function readKeystore(): Promise<KeystoreRow | null> {
  const fromIdb = await tx("keystore", "readonly", async (t) => {
    const store = t.objectStore("keystore");
    const row = await asPromise(store.get("primary"));
    return (row ?? null) as KeystoreRow | null;
  });
  if (fromIdb) return normalize(fromIdb);

  try {
    const all = await browser.storage.local.get(BACKUP_KEY);
    const backup = all[BACKUP_KEY] as KeystoreRow | undefined;
    if (backup && backup.id === "primary") {
      const normalized = normalize(backup);
      await tx("keystore", "readwrite", async (t) => {
        await asPromise(t.objectStore("keystore").put(normalized));
      });
      return normalized;
    }
  } catch (err) {
    console.warn("[PREMON] storage.local keystore read failed:", err);
  }
  return null;
}

export async function writeKeystore(row: KeystoreRow): Promise<void> {
  if (row.id !== "primary") throw new Error("Keystore id must be 'primary'");
  await tx("keystore", "readwrite", async (t) => {
    await asPromise(t.objectStore("keystore").put(row));
  });
  try {
    await browser.storage.local.set({ [BACKUP_KEY]: row });
  } catch (err) {
    console.warn("[PREMON] storage.local keystore mirror failed:", err);
  }
}

export async function clearKeystore(): Promise<void> {
  await tx("keystore", "readwrite", async (t) => {
    await asPromise(t.objectStore("keystore").clear());
  });
  try {
    await browser.storage.local.remove(BACKUP_KEY);
  } catch { /* ignore */ }
}

export async function hasKeystore(): Promise<boolean> {
  return (await readKeystore()) !== null;
}
