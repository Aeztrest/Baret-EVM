/**
 * @premon/ext-protocol
 *
 * Single source of truth for messages exchanged between the four extension
 * surfaces: background service worker, popup, options page, content script +
 * inpage provider. The inpage provider is EIP-1193.
 */

/* ── 1. Envelope ── */

export const PROTOCOL_TAG = 1 as const;

export interface Envelope<TMethod extends string, TPayload> {
  __bx: typeof PROTOCOL_TAG;
  id: string; // correlation id (caller-generated)
  kind: "req" | "rsp" | "evt";
  method: TMethod;
  payload: TPayload;
}

/* ── 2. Domain types ── */

export type EvmNetwork = "testnet" | "mainnet";

export type WalletPhase = "uninitialized" | "locked" | "ready" | "signing" | "alert";

/** One BIP-44-derived account under the wallet's mnemonic (or the sole account of a private-key import). */
export interface WalletAccount {
  /** BIP-44 address_index (m/44'/60'/0'/0/index). Always 0 for private-key imports. */
  index: number;
  address: string;
  label: string;
}

export interface WalletStateSnapshot {
  phase: WalletPhase;
  network: EvmNetwork;
  chainId: number;
  /** Active EOA address (0x) — equals accounts[activeAccountIndex].address. */
  address: string | null;
  accounts: WalletAccount[];
  activeAccountIndex: number;
  alertsUnread: number;
  watchedAddresses: string[];
}

export interface AllowanceSnapshot {
  id: string;
  merchantOrigin: string;
  /** Token address (0x) or `native`. */
  asset: string;
  capPerTx: number;
  capPerHour: number;
  capPerDay: number;
  spentHour: number;
  spentDay: number;
  hits: number;
  lastHitAt: number | null;
  expiresAt: number | null;
  status: "active" | "paused" | "revoked";
  /** Spender address authorized on-chain (PaymentGuard merchant). */
  spender: string;
}

export interface HistoryEntry {
  id: string;
  type: "send" | "receive" | "dapp" | "x402" | "alert";
  /** Transaction hash (0x) or null. */
  txHash: string | null;
  origin: string | null;
  summary: string;
  decision: "allow" | "block";
  reasons: string[];
  broadcast: boolean;
  createdAt: number;
}

export interface AlertEntry {
  id: string;
  severity: "low" | "medium" | "high";
  kind: "drift" | "verify_orphan" | "no_delivery" | "cap_hit";
  merchantOrigin: string;
  txHash: string | null;
  body: string;
  createdAt: number;
  dismissedAt: number | null;
}

/* ── 2b. Pre-sign analysis result (mirrors @premon/guard AnalysisResult) ── */

export interface RiskFindingPayload {
  code: string;
  severity: "low" | "medium" | "high" | "critical";
  message: string;
  details?: Record<string, unknown>;
}

export interface NativeBalanceChangePayload {
  accountId: string;
  preWei: string | null;
  postWei: string | null;
  deltaWei: string | null;
}

export interface AssetBalanceChangePayload {
  accountId: string;
  /** Token address (0x). */
  asset: string;
  assetCode: string;
  assetIssuer: string | null;
  preBalance: string;
  postBalance: string;
  delta: string;
  decimals: number;
}

export interface ApprovalChangePayload {
  kind: "erc20_approval" | "approval_for_all";
  tokenAddress: string;
  tokenSymbol: string;
  owner: string;
  spender: string;
  amount: string;
  unlimited: boolean;
  message: string;
}

export interface AnalyzeResponse {
  decision: "allow" | "block" | "advisory";
  safe: boolean;
  blockingReasons: string[];
  advisoryReasons: string[];
  reasons: string[];
  riskFindings: RiskFindingPayload[];
  estimatedChanges: {
    native: NativeBalanceChangePayload[];
    assets: AssetBalanceChangePayload[];
    approvals: ApprovalChangePayload[];
  };
  simulationWarnings: string[];
  /** True when the analyze server was unreachable. UI must surface this prominently. */
  offline: boolean;
}

/* ── 3. RPC method registry — popup/options ↔ background ── */

export interface ExtRpc {
  /* Wallet lifecycle */
  "wallet.getState": { req: void; rsp: WalletStateSnapshot };
  "wallet.unlock": { req: { passphrase: string }; rsp: { ok: true } };
  "wallet.lock": { req: void; rsp: { ok: true } };
  "wallet.create": { req: { passphrase: string; network: EvmNetwork }; rsp: { address: string } };
  "wallet.import": { req: { passphrase: string; secret: string }; rsp: { address: string } };
  "wallet.reset": { req: { confirmation: "I-UNDERSTAND" }; rsp: { ok: true } };
  "wallet.exportSecret": { req: { passphrase: string; format: "mnemonic" | "privateKey" }; rsp: { secret: string } };
  "wallet.balance": { req: { address?: string }; rsp: { wei: string | null; usdc: string | null } };
  /** User-initiated native MON transfer: builds + signs + broadcasts locally. */
  "wallet.transferNative": { req: { to: string; amountEth: string }; rsp: { txHash: string } };

  /* Accounts (multi-account, BIP-44-derived from the wallet's mnemonic) */
  "account.list": { req: void; rsp: WalletAccount[] };
  /** Derives the next BIP-44 index. Mnemonic wallets only — throws for private-key imports. */
  "account.create": { req: { label?: string }; rsp: WalletAccount };
  "account.switch": { req: { index: number }; rsp: { address: string } };
  "account.rename": { req: { index: number; label: string }; rsp: { ok: true } };

  /* Sign + tx */
  "tx.sign": { req: { requestId: string; accept: boolean; remember?: boolean }; rsp: { signed?: string; txHash?: string; rejection?: string; ok?: true } };
  "tx.send": { req: { signedTransaction: string }; rsp: { txHash: string } };
  "tx.peekRequest": { req: void; rsp: { requestId: string; kind: "message" | "transaction" | "transactionAndSend" | "typedData" | "x402Payment" | "connect"; origin: string; payload: unknown; label?: string } | null };
  "tx.analyzeRequest": { req: { requestId: string }; rsp: AnalyzeResponse };

  /* Allowance ledger */
  "ledger.list": { req: { filter?: { status?: AllowanceSnapshot["status"] } }; rsp: AllowanceSnapshot[] };
  "ledger.revoke": { req: { merchantOrigin: string }; rsp: { signRequestId: string } };
  "ledger.pause": { req: { merchantOrigin: string }; rsp: { ok: true } };
  "ledger.unpause": { req: { merchantOrigin: string }; rsp: { ok: true } };

  /* Policy */
  "policy.read": { req: void; rsp: unknown }; /* GuardPolicy */
  "policy.write": { req: { policy: unknown }; rsp: { ok: true } };

  /* History + alerts */
  "history.list": { req: { filter?: { type?: HistoryEntry["type"]; origin?: string; from?: number; to?: number } }; rsp: HistoryEntry[] };
  "history.detail": { req: { id: string }; rsp: HistoryEntry & { analysis: unknown } };
  "alerts.list": { req: { includeDismissed?: boolean }; rsp: AlertEntry[] };
  "alerts.dismiss": { req: { id: string }; rsp: { ok: true } };

  /* Network */
  "network.set": { req: { network: EvmNetwork }; rsp: { ok: true } };
}

export type ExtRpcMethod = keyof ExtRpc;
export type ExtRpcRequest<M extends ExtRpcMethod> = ExtRpc[M]["req"];
export type ExtRpcResponse<M extends ExtRpcMethod> = ExtRpc[M]["rsp"];

/* ── 4. Events — background → surfaces ── */

export interface ExtEvents {
  "state.changed": Partial<WalletStateSnapshot>;
  "alert.new": AlertEntry;
  "ledger.tick": { merchantOrigin: string; hits: number; capRemaining: number };
  "tx.signRequest": { requestId: string; kind: "tx" | "x402"; summary: string; origin?: string };
  "tx.signed": { id: string; txHash: string };
}

export type ExtEventName = keyof ExtEvents;

/* ── 5. Content script ↔ background channels (EIP-1193 provider) ── */

/**
 * EIP-1193 provider methods forwarded from the page through the content
 * script's `bx-provider` port.
 */
export interface ExtProviderMethods {
  "eth_requestAccounts": { req: { origin: string }; rsp: { accounts: string[] } };
  "eth_accounts": { req: { origin: string }; rsp: { accounts: string[] } };
  "eth_chainId": { req: { origin: string }; rsp: { chainId: string } };
  "wallet_switchEthereumChain": { req: { origin: string; chainId: string }; rsp: { ok: true } };
  "personal_sign": { req: { origin: string; message: string; address: string }; rsp: { signature: string } };
  "eth_signTypedData_v4": { req: { origin: string; address: string; typedData: string }; rsp: { signature: string } };
  "eth_sendTransaction": { req: { origin: string; transaction: unknown }; rsp: { txHash: string } };
  "eth_signTransaction": { req: { origin: string; transaction: unknown }; rsp: { signedTransaction: string } };
}

/** x402 intercepts forwarded from the inpage interceptor via the `bx-x402` port. */
export interface ExtX402Methods {
  "x402.review": {
    req: { origin: string; requestUrl: string; requirements: unknown };
    rsp: { action: "decline"; reason: string } | { action: "approve"; headerValue: string };
  };
}

/* ── 6. Helpers ── */

export function newRequestId(): string {
  let s = "";
  for (let i = 0; i < 8; i++) s += ((Math.random() * 65536) | 0).toString(16).padStart(4, "0");
  return s;
}

export function isEnvelope(data: unknown): data is Envelope<string, unknown> {
  if (!data || typeof data !== "object") return false;
  const d = data as Record<string, unknown>;
  return (
    d.__bx === PROTOCOL_TAG &&
    typeof d.id === "string" &&
    (d.kind === "req" || d.kind === "rsp" || d.kind === "evt") &&
    typeof d.method === "string"
  );
}
