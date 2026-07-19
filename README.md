# Premon

**The first smart wallet with a user-defined transaction policy — and the fix
for x402's blind-signing problem.**

Premon analyzes every transaction **before it is signed**: it decodes and
simulates what the transaction will actually do, runs it through independent
risk detectors, checks it against *your* policy, and returns `safe: true/false`
with reasons — for wallets, dApps, and AI agents. Nothing gets signed or
submitted until it clears your rules.

---

## Why this is more than "a tx simulator"

Most wallet security tools stop at showing you a warning badge on top of a
preset (Strict/Balanced/Permissive) that someone else defined. Premon does two
things nothing else in this space does:

**1. Real custom policy, not just presets.** `GuardPolicy`
([`packages/guard/src/policy.ts`](packages/guard/src/policy.ts)) is a set of
~20 independently toggleable rules — max acceptable loss %, minimum post-tx
balance, unlimited-approval blocks, `setApprovalForAll` blocks, risky/unknown
contract exposure, SELFDESTRUCT/DELEGATECALL/ownership-transfer blocks, gas
ceilings, and x402 spending caps. Strict/Balanced/Permissive are just starting
templates — in the wallet's **Policies** screen
([`apps/wallet/src/pages/Policies.tsx`](apps/wallet/src/pages/Policies.tsx))
you pick one, then tune every rule individually with a visual editor or edit
the raw policy JSON directly. That policy is *yours*: the wallet enforces it
on every transaction, before a signature is ever requested.

**2. x402 without blind signing.** [x402](https://x402.org) lets an AI agent
hit an HTTP 402 paywall and auto-pay to get past it — which, by default, means
the agent authorizes a payment to whatever address and amount the server asks
for, with no human ever seeing it. Premon's browser extension intercepts
`fetch` at the exact moment a 402 response comes back
([`x402-interceptor.ts`](apps/extension/src/inpage/x402-interceptor.ts)),
decodes the real `PaymentRequirements` — who gets paid, how much, in what
asset — and runs it through the same policy engine before any payment header
is sent: merchant allow/block lists, asset allowlist, facilitator allowlist,
per-transaction cap, and rolling hourly/daily spending caps
([`x402/handlers.ts`](apps/extension/src/background/x402/handlers.ts)). On
the server side, `detectX402Findings`
([`risk/detectors/x402.ts`](apps/server/src/risk/detectors/x402.ts))
cross-checks the transaction against the payment requirements it actually
received, flagging a mismatch (`X402_DESTINATION_MISMATCH`,
`X402_ASSET_MISMATCH`) if what's being paid doesn't match what was asked for.
Agents keep paying autonomously — but every payment is decoded, policy-checked,
and capped first, instead of signed blind.
[`contracts/PaymentGuard.sol`](contracts/README.md) is the on-chain counterpart
of the same idea: a spending-limit vault an agent can draw from without a
human co-signing each payment.

---

## What it catches

The EVM risk model targets the attack surface that actually drains EVM wallets:

- **Unlimited ERC-20 approvals** (`approve(spender, 2^256-1)`) — the #1 drainer
- **`setApprovalForAll`** operator grants over an entire NFT collection
- **EIP-2612 `permit`** off-chain approvals
- **Reverting transactions** (wasted gas, no effect)
- **Known-malicious addresses** (reputation DB; critical → always blocked)
- **Risky / unknown contracts**, **SELFDESTRUCT**, **DELEGATECALL**, ownership transfers
- **Deep internal-call nesting**, **excessive gas**, and **x402** payment-shape checks

## Live proof (EVM testnet, chainId 10143)

An unlimited-approve tx returns:

```json
{
  "safe": false,
  "confidence": "high",
  "chainId": 10143,
  "reasons": ["Unlimited ERC-20 approval detected and blocked by policy"],
  "findingCodes": ["ERC20_APPROVAL_GRANTED", "ERC20_APPROVAL_UNLIMITED"],
  "primaryAction": "erc20_approve"
}
```

The bundled default chain supports `debug_traceCall`, so Premon runs full
internal-call tracing → `confidence: "high"`. On nodes without it, Premon
degrades gracefully to calldata-projected deltas at `medium` confidence (still
detects approvals, reverts, etc.).

---

## Repo layout

```
apps/
  server/      Fastify + TypeScript analysis API (the core)
  wallet/      Standalone React smart-wallet — custom policy editor lives here
               (ethers + guard pre-sign, apps/wallet/src/pages/Policies.tsx)
  showcase/    Demo gallery — EVM threat scenarios + Premon badge/overlay
  extension/   Chrome MV3 + Firefox wallet (EIP-1193/6963 provider + the x402
               fetch interceptor that kills blind-signed payments)
packages/
  guard/         @premon/guard — pre-sign guard SDK + GuardPolicy (no ethers needed to consume)
  agent-kit/     @premon/agent-kit — guarded ethers signer + CLI for agents
  wallet-adapter/dApp ↔ wallet postMessage bridge (EVM)
  ext-protocol/  extension message protocol (EIP-1193)
  ui/            design tokens + brand glyph
  showcase-ui/   showcase UI plumbing
contracts/     Foundry — PaymentGuard.sol, an on-chain spending-limit vault
               (the on-chain counterpart of the x402 caps; see contracts/README.md)
docs/          ARCHITECTURE.md
```

Every value that ties the stack to a specific chain — RPC URL, chain id,
explorer, native symbol, USDC address — is a config value, not a hardcoded
assumption. Point it at any EVM chain by setting env vars (see
[Configuration](#configuration)).

## Run the full stack

```bash
pnpm install

# 1) Analyzer API (the brain)
cd apps/server && RPC_URL=https://testnet-rpc.monad.xyz pnpm dev   # :8080

# 2) Standalone wallet
pnpm --filter @premon/wallet dev        # :5180

# 3) Demo gallery (point it at the analyzer)
pnpm --filter @premon/showcase dev      # :5175

# 4) Browser extension (load apps/extension/dist as an unpacked MV3 extension)
pnpm --filter @premon/extension build
```

The wallet, showcase, and extension all call the analyzer through
`@premon/guard` and refuse to sign what the policy blocks.

## Quickstart

```bash
pnpm install

# Run the analysis server against an EVM testnet
cd apps/server
RPC_URL=https://testnet-rpc.monad.xyz NETWORK=testnet pnpm dev
# → http://localhost:8080

curl localhost:8080/health/ready   # {"status":"ready","rpcChainId":10143,...}
```

Analyze a transaction:

```bash
curl -X POST localhost:8080/v1/analyze -H 'content-type: application/json' -d '{
  "network": "testnet",
  "transaction": { "from": "0x…", "to": "0x<token>", "data": "0x095ea7b3…" },
  "userWallet": "0x…",
  "policy": { "blockUnlimitedApprovals": true }
}'
```

`transaction` accepts **either** a raw `0x`-hex serialized tx **or** a tx-request
object `{from,to,value,data,…}`.

## Use the guard SDK

Start from a template, then override just the rules you care about — this is
the same `GuardPolicy` object the wallet's Policies screen edits:

```ts
import { TransactionGuard, STRICT_POLICY } from "@premon/guard";

const guard = new TransactionGuard({
  network: "testnet",
  analyze: { baseUrl: "http://localhost:8080" },
});

const { decision, blockingReasons } = await guard.evaluate({
  transaction: { from: userAddr, to: token, data: approveCalldata },
  userWallet: userAddr,
  policy: {
    ...STRICT_POLICY,
    maxLossPercent: 10,          // tighter than the template's 25%
    minPostUsdcBalance: 50,      // never let USDC balance drop below 50
    allowedMerchantOrigins: ["https://api.trusted-service.com"],
  },
});
// decision: "allow" | "block" — never signs, never submits
```

For agents/programs, [`@premon/agent-kit`](packages/agent-kit) wraps this in a
drop-in ethers signer + CLI that refuses to sign what the policy blocks.

## Tests

```bash
pnpm -r test                       # unit + HTTP + live-shape tests
cd contracts && forge test -vv     # Solidity tests incl. a fuzz invariant
```

## API

| Method | Path | Description |
| ------ | ---- | ----------- |
| GET  | `/health`, `/health/ready` | liveness / RPC readiness |
| POST | `/v1/analyze` | analyze one transaction |
| POST | `/v1/analyze/batch` | up to 25 txs |
| POST | `/v1/analyze/stream` | SSE result stream |
| POST | `/v1/replay` | re-simulate |
| GET  | `/v1/audit/recent` · `/aggregate` · `/contract/:address` | audit trail |
| GET/POST | `/mcp/tools` · `/mcp/call` | MCP tools for AI agents |
| GET  | `/demo/scrybe` | x402 paywall demo |

## Configuration

See [`apps/server/.env.example`](apps/server/.env.example). Required:
`RPC_URL`. Everything else — `CHAIN_ID`, `EXPLORER_URL`, `NATIVE_SYMBOL`,
`NATIVE_DECIMALS`, `USDC_ADDRESS` — is optional and overridable to target any
EVM chain. **Set `USDC_ADDRESS`** to the real token on your target chain
before relying on token metadata / x402 (the bundled default is a placeholder).
