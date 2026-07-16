/**
 * Showcase ↔ Baret wallet bridge.
 *
 * The showcase pages use a small adapter shape `{ signTransaction,
 * signAndSendTransaction, account_pubkey }`. There are two ways to
 * reach a wallet:
 *
 *   - Baret — the dApp opens the wallet popup via `BaretAdapter`
 *     (`@baret/wallet-adapter`) and handshakes over postMessage. Every
 *     signature is gated by Baret's policy + analysis, by design.
 *   - An injected EIP-1193 provider (`window.ethereum`, e.g. MetaMask) — the
 *     "without Baret" comparison: it signs immediately, no firewall.
 *
 * This module wraps both behind one provider interface the picker + context
 * consume.
 */

import {
  BaretAdapter,
  WalletAdapterError,
  type TxRequest,
} from "@baret/wallet-adapter";

/** EVM testnet chain id. */
export const CHAIN_ID = 10143;

/** Default origin of the Baret wallet popup. */
const DEFAULT_WALLET_URL =
  import.meta.env.VITE_WALLET_URL ?? "http://localhost:5180";

export class WalletStandardBridgeError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = "WalletStandardBridgeError";
  }
}

export type { TxRequest };

/** Minimal EIP-1193 provider surface we rely on. */
interface Eip1193Provider {
  isMetaMask?: boolean;
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
}

declare global {
  interface Window {
    ethereum?: Eip1193Provider & {
      providers?: Eip1193Provider[];
    };
  }
}

/** A wallet provider the picker can render + the context can connect to. */
export interface EvmWalletProvider {
  /** Display name, e.g. "Baret" or "MetaMask". */
  name: string;
  /** Data-URI icon. */
  icon: string;
  /** True for the Baret wallet (the recommended, firewall-protected option). */
  baret: boolean;
  /** Request access; returns the connected EOA + chain id. */
  connect: () => Promise<{ address: string; chainId: number }>;
  /** Sign + broadcast a tx; returns the on-chain tx hash. */
  signAndSendTransaction: (
    tx: TxRequest,
  ) => Promise<{ txHash: string; signedTransaction?: string }>;
  /** Sign without broadcasting; returns the 0x-hex signed serialized tx. */
  signTransaction: (tx: TxRequest) => Promise<{ signedTransaction: string }>;
  disconnect: () => Promise<void>;
}

/* ────────────── bridge ────────────── */

export class WalletStandardBridge {
  constructor(
    public readonly provider: EvmWalletProvider,
    public readonly address: string,
    public readonly chainId: number,
  ) {}

  get name(): string {
    return this.provider.name;
  }
  get icon(): string {
    return this.provider.icon;
  }

  static async connect(
    provider: EvmWalletProvider,
  ): Promise<WalletStandardBridge> {
    const { address, chainId } = await provider.connect();
    if (!address) {
      throw new WalletStandardBridgeError(
        `${provider.name} did not return an address`,
        "NO_ACCOUNTS",
      );
    }
    return new WalletStandardBridge(provider, address, chainId);
  }

  account_pubkey(): string {
    return this.address;
  }

  async disconnect(): Promise<void> {
    await this.provider.disconnect().catch(() => {});
  }

  /** Sign + immediately broadcast. Returns `{ signature }` (the tx hash). */
  async signAndSendTransaction(
    tx: TxRequest,
  ): Promise<{ signature: string; signedTxXdr: string }> {
    const r = await this.provider.signAndSendTransaction(withFrom(tx, this.address));
    if (!r.txHash) {
      throw new WalletStandardBridgeError(
        `${this.provider.name} did not return a tx hash`,
        "NO_SIGNATURE",
      );
    }
    return { signature: r.txHash, signedTxXdr: r.signedTransaction ?? "" };
  }

  /** Sign without broadcasting — used by the x402 payment leg. */
  async signTransaction(tx: TxRequest): Promise<{ signedTransaction: string }> {
    return this.provider.signTransaction(withFrom(tx, this.address));
  }
}

function withFrom(tx: TxRequest, from: string): TxRequest {
  return { from, chainId: tx.chainId ?? CHAIN_ID, ...tx };
}

/* ────────────── discovery (EIP-6963) ────────────── */

interface Eip6963Detail {
  info: { uuid: string; name: string; icon: string; rdns: string };
  provider: Eip1193Provider;
}

/** rdns the Baret extension announces itself with (apps/extension inpage). */
const BARET_RDNS = "dev.baret.wallet";

/**
 * Synchronously collect EIP-6963 providers. Wallets respond to
 * `eip6963:requestProvider` with a synchronous `eip6963:announceProvider`
 * event, so dispatching + reading within the same tick captures them.
 */
function collectAnnounced(): Eip6963Detail[] {
  if (typeof window === "undefined") return [];
  const found = new Map<string, Eip6963Detail>();
  const onAnnounce = (ev: Event) => {
    const detail = (ev as CustomEvent<Eip6963Detail>).detail;
    if (detail?.info?.uuid && detail.provider) found.set(detail.info.uuid, detail);
  };
  window.addEventListener("eip6963:announceProvider", onAnnounce as EventListener);
  window.dispatchEvent(new Event("eip6963:requestProvider"));
  window.removeEventListener("eip6963:announceProvider", onAnnounce as EventListener);
  return [...found.values()];
}

/**
 * Discover wallet providers available to the page.
 *  - If the Baret EXTENSION is announced (EIP-6963), it's the primary
 *    "Baret" provider and connects through its own approval UI — no separate
 *    web-wallet tab.
 *  - Otherwise we fall back to the popup web wallet at VITE_WALLET_URL.
 *  - Every other announced/injected wallet becomes a "without Baret" option.
 */
export function discoverEvmProviders(): EvmWalletProvider[] {
  const announced = collectAnnounced();
  const baretDetail = announced.find(
    (d) => d.info.rdns === BARET_RDNS || d.info.name?.toLowerCase() === "baret",
  );

  const out: EvmWalletProvider[] = [];

  if (baretDetail) {
    out.push(
      injectedProvider(baretDetail.provider, {
        name: "BARET",
        icon: BARET_ICON,
        baret: true,
      }),
    );
  } else {
    out.push(baretProvider());
  }

  for (const d of announced) {
    if (d === baretDetail) continue;
    out.push(injectedProvider(d.provider, { name: d.info.name, icon: d.info.icon, baret: false }));
  }

  // Legacy window.ethereum only when no EIP-6963 wallet announced at all.
  if (announced.length === 0) {
    const legacy = findInjectedProvider();
    if (legacy) {
      out.push(
        injectedProvider(legacy, {
          name: legacy.isMetaMask ? "MetaMask" : "Browser Wallet",
          icon: METAMASK_ICON,
          baret: false,
        }),
      );
    }
  }

  return out;
}

const BARET_ICON = (() => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="8" fill="#141414"/><ellipse cx="16" cy="20.5" rx="11" ry="2.3" fill="#5B6169"/><path d="M7,20 C7,13 11,9.5 16,9.5 C21,9.5 25,13 25,20 Z" fill="#FFFFFF"/></svg>`;
  return `data:image/svg+xml;base64,${btoa(svg)}`;
})();

const METAMASK_ICON = (() => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><rect width="24" height="24" rx="6" fill="#F6851B"/><path d="M5 6l5 3.6L9 7.2 5 6zm14 0l-5 3.6 1-2.4L19 6zM7.5 15.5L6 18l3 .8.5-2.6-2-.7zm9 0l-2 .7.5 2.6 3-.8-1.5-2.5z" fill="#fff"/></svg>`;
  return `data:image/svg+xml;base64,${btoa(svg)}`;
})();

function baretProvider(): EvmWalletProvider {
  const adapter = new BaretAdapter({
    walletUrl: DEFAULT_WALLET_URL,
    appName: "Baret Showcase",
  });
  return {
    name: "BARET",
    icon: BARET_ICON,
    baret: true,
    async connect() {
      try {
        const a = await adapter.connect();
        return { address: a.address, chainId: a.chainId };
      } catch (err) {
        throw toBridgeError(err);
      }
    },
    async signAndSendTransaction(tx) {
      try {
        return await adapter.signAndSendTransaction(tx);
      } catch (err) {
        throw toBridgeError(err);
      }
    },
    async signTransaction(tx) {
      try {
        const signedTransaction = await adapter.signTransaction(tx);
        return { signedTransaction };
      } catch (err) {
        throw toBridgeError(err);
      }
    },
    async disconnect() {
      adapter.disconnect();
    },
  };
}

function injectedProvider(
  eth: Eip1193Provider,
  opts: { name: string; icon: string; baret: boolean },
): EvmWalletProvider {
  const { name, icon, baret } = opts;
  return {
    name,
    icon,
    baret,
    async connect() {
      const accounts = (await eth.request({
        method: "eth_requestAccounts",
      })) as string[];
      const chainHex = (await eth.request({ method: "eth_chainId" })) as string;
      const address = accounts?.[0];
      if (!address) {
        throw new WalletStandardBridgeError(
          `${name} did not return an account`,
          "NO_ACCOUNTS",
        );
      }
      return { address, chainId: parseInt(chainHex, 16) };
    },
    async signAndSendTransaction(tx) {
      const txHash = (await eth.request({
        method: "eth_sendTransaction",
        params: [toEthSendParams(tx)],
      })) as string;
      return { txHash };
    },
    async signTransaction(tx) {
      // Baret implements eth_signTransaction; other injected wallets usually
      // don't, so the x402 payment leg needs Baret.
      if (!baret) {
        throw new WalletStandardBridgeError(
          `${name} can't sign without broadcasting. Reconnect with Baret for x402 payments.`,
          "NO_SIGN_TRANSACTION",
        );
      }
      const signedTransaction = (await eth.request({
        method: "eth_signTransaction",
        params: [toEthSendParams(tx)],
      })) as string;
      return { signedTransaction };
    },
    async disconnect() {
      /* injected wallets manage their own session */
    },
  };
}

function findInjectedProvider(): Eip1193Provider | null {
  if (typeof window === "undefined" || !window.ethereum) return null;
  const eth = window.ethereum;
  // Prefer MetaMask when multiple providers coexist.
  if (Array.isArray(eth.providers) && eth.providers.length > 0) {
    return eth.providers.find((p) => p.isMetaMask) ?? eth.providers[0] ?? eth;
  }
  return eth;
}

function toEthSendParams(tx: TxRequest): Record<string, string> {
  const out: Record<string, string> = {};
  if (tx.from) out.from = tx.from;
  if (tx.to) out.to = tx.to;
  if (tx.value !== undefined) out.value = toHex(tx.value);
  if (tx.data) out.data = tx.data;
  return out;
}

function toHex(value: string): string {
  if (value.startsWith("0x")) return value;
  try {
    return "0x" + BigInt(value).toString(16);
  } catch {
    return value;
  }
}

function toBridgeError(err: unknown): WalletStandardBridgeError {
  if (err instanceof WalletAdapterError) {
    return new WalletStandardBridgeError(err.message, err.code);
  }
  if (err instanceof WalletStandardBridgeError) return err;
  return new WalletStandardBridgeError(
    err instanceof Error ? err.message : String(err),
    "UNKNOWN",
  );
}
