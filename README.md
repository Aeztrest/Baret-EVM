# Premon

**Pre-sign transaction security for EVM.** Premon analyzes a transaction
**before it is signed**, runs it through independent risk detectors, applies the
user's policy, and returns `safe: true/false` with reasons — for wallets, dApps,
and AI agents.

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
  wallet/      Standalone React smart-wallet (ethers + guard pre-sign)
  showcase/    Demo gallery — EVM threat scenarios + Premon badge/overlay
  extension/   Chrome MV3 + Firefox wallet (EIP-1193/6963 provider + x402 interceptor)
packages/
  guard/         @premon/guard — pre-sign guard SDK (no ethers needed to consume)
  agent-kit/     @premon/agent-kit — guarded ethers signer + CLI for agents
  wallet-adapter/dApp ↔ wallet postMessage bridge (EVM)
  ext-protocol/  extension message protocol (EIP-1193)
  ui/            design tokens + brand glyph
  showcase-ui/   showcase UI plumbing
contracts/     Foundry — PaymentGuard.sol, an on-chain spending-limit vault
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

```ts
import { TransactionGuard, STRICT_POLICY } from "@premon/guard";

const guard = new TransactionGuard({
  network: "testnet",
  analyze: { baseUrl: "http://localhost:8080" },
});

const { decision, blockingReasons } = await guard.evaluate({
  transaction: { from: userAddr, to: token, data: approveCalldata },
  userWallet: userAddr,
  policy: STRICT_POLICY,
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
