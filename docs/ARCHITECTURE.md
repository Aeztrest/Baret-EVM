# Premon — Architecture

Module-by-module description of the EVM implementation. Source of truth is the
code under `apps/server/src`, `packages/guard/src`, `apps/wallet/src`,
`apps/extension/src`, `contracts/src`.

Premon is three layers working together, not one simulator:

1. **Analyzer** (`apps/server`) — decodes and simulates a transaction, runs
   independent risk detectors, and evaluates it against a policy. Stateless;
   any client can call it.
2. **Policy** (`packages/guard`) — the `GuardPolicy` schema and evaluation
   client shared by every surface (wallet, extension, agent-kit). This is what
   makes policy *custom* rather than a hardcoded server-side toggle: the
   policy object is authored client-side and sent with every request.
3. **x402 interceptor** (`apps/extension`) — a `fetch`-level guard that turns
   x402's autonomous "pay the 402 and move on" flow into a decode-then-check
   flow, so an agent can keep paying without a human in the loop while still
   never blind-signing a payment.

## Request lifecycle — `POST /v1/analyze`

Body: `{ network, transaction, policy?, userWallet?, integratorRequestId?, paymentRequirements? }`
where `transaction` is a raw `0x` serialized tx or a `{from,to,value,data,…}` object.

```
[1] rate limit (IP) + auth (API key / x402)
[2] zod body validation
            │  application/analyze-transaction.ts
[3] decodeTransaction()        raw hex | object → DecodedEvmTx (ethers)
[4] collectTxAddresses()       from/to + ABI-decoded args → addresses/tokens/assets
[5] pickAccountsForSimulation()cap to MAX_SIMULATION_OPERATIONS
[6] EvmSimulator.simulate()    pre-state (getBalance/getCode/balanceOf)
                               + eth_call (revert) + estimateGas + debug_traceCall
[7] extractEstimatedChanges()  native + ERC-20 deltas + approval grants
[8] decodeTransactionOperations()  human-readable summary
[9] runRiskDetection()         all detectors
[10] evaluatePolicy()          gates + fail-closed decision
[11] generateSuggestions()     actionable fixes
[12] audit.record()
            ▼
{ safe, reasons, estimatedChanges, riskFindings, simulationWarnings, annotation, suggestions, meta }
```

## Modules

- **config/** — env (zod), EVM chain config (chainId, RPC, explorer, USDC), limits.
- **simulation/**
  - `abi.ts` — known selectors (ERC-20/721/1155/Ownable) + calldata decode.
  - `tx-decode.ts` — raw hex / object → `DecodedEvmTx`.
  - `account-keys.ts` — address/token/asset extraction from calldata.
  - `evm-simulator.ts` — concurrent pre-state + `eth_call` + `estimateGas` + trace.
  - `parse-call-trace.ts` — `callTracer` frames → generic `CallTrace`.
- **infra/evm-rpc.ts** — `EvmRpc` interface (mockable) + ethers adapter;
  `debug_traceCall` is feature-detected and cached.
- **analysis/** — `extract-deltas` (intent-projected balance/approval deltas),
  `instruction-decoder` (summary), `suggestion-engine`.
- **risk/detectors/** — `simulation`, `programs` (risky/unknown), `reputation`,
  `compute` (gas), `cpi` (call nesting), `approvals` (the drainer surface),
  `evm-danger` (selfdestruct/delegatecall/ownership/native-to-contract), `x402`.
- **policy/** — `engine` (gates + `isBlocked` fail-closed; critical findings
  always block), `profiles` (strict/balanced/permissive).
- **mcp/server.ts** — `premon_analyze`, `premon_health`, `premon_list_profiles`.
- **api/routes/** — health, analyze, batch, stream, replay, audit, mcp, demo-paywall.
- **data/** — in-memory `audit-store`, seeded `reputation-db`.

## Domain types (`domain/`)

- `NormalizedSimulation` — `status`, `traced`, `accounts[]`, `callEvents[]`,
  `gasFeeWei`, `gasUsed`, `gasPriceWei`.
- `EstimatedChanges` — `native[]` (wei), `assets[]` (ERC-20), `approvals[]`.
- `CallTrace` — `roots[]`, `maxDepth`, `totalInvocations`, `hasDelegateCall`, `hasSelfdestruct`.
- `RiskFinding` — `{ code, severity, message, details? }`.
- `Decision` — `safe`, `reasons`, `estimatedChanges`, `riskFindings`,
  `simulationWarnings`, `annotation`, `suggestions`, `meta{network,chainId,confidence,…}`.

## Confidence model

`high` = traced + non-revert. `medium` = not traced (node lacks `debug_traceCall`;
deltas projected from calldata). `low` = revert or genuinely incomplete inputs.

## Custom policy — `packages/guard/src/policy.ts`

`GuardPolicy` is a flat object of ~20 optional, independently-settable rules
(loss %, min post-tx balance, approval blocks, contract-exposure blocks,
danger-opcode blocks, gas ceilings, x402 caps/allowlists — full list in
[`packages/guard/README.md`](../packages/guard/README.md)). `STRICT_POLICY`,
`BALANCED_POLICY`, `PERMISSIVE_POLICY` are just pre-filled `GuardPolicy`
values, not a separate mechanism — any field can be overridden.

The server carries the pre-sign subset of these rules and evaluates them in
`evaluatePolicy()` (`policy/engine.ts`) as part of the `/v1/analyze` pipeline
above. Client-only rules — x402 rolling hourly/daily caps, merchant
allow/block lists — are evaluated in the wallet/extension, since they depend
on state (spend-so-far this hour/day) the stateless analyzer doesn't hold.

- **Wallet**: `apps/wallet/src/pages/Policies.tsx` is the editor — apply a
  template, then tweak individual fields via form controls or the raw-JSON
  tab. `validatePolicy()` runs before every save. Persisted at
  `apps/wallet/src/storage/policy-store.ts` (`localStorage`, key
  `premon.policy.v1`).
- **Extension**: mirrors the same policy shape per-site in
  `PoliciesPage.tsx` / `X402Page.tsx` / `Allowances.tsx`, persisted in
  `browser.storage.local` under the same key.

## x402 interceptor — `apps/extension/src/inpage/x402-interceptor.ts`

x402's normal flow is: dApp/agent calls a paywalled endpoint → gets HTTP 402 →
reads `PaymentRequirements` → retries with an `X-PAYMENT` header. Nothing in
that flow requires showing a human what's being paid, to whom, or in what
asset — an agent can be tricked into paying whatever a compromised or
malicious server asks for.

Premon's interceptor sits in the page's `fetch`:

```
[1] window.fetch patched in the MAIN world (x402-interceptor.ts)
[2] response status 402 → parseRequirements() decodes PaymentRequirements
    from the PAYMENT-REQUIRED header or JSON body (incl. `accepts[]`/`accepted`)
[3] requirements posted to the background via the page bridge → x402.review
[4] background handlers.ts (x402Review):
      schema validation → network match → asset allowlist →
      merchant origin allow/block lists → facilitator allowlist →
      per-origin allowance lookup (revoked/paused check) →
      per-tx cap (maxX402PerTx) → rolling hourly/daily caps
    x402AutoApprove:false routes through the same manual approval popup
    used for eth_sendTransaction (enqueueAndWait)
[5] approved → X-PAYMENT header attached, original fetch retried
    declined → original 402 response returned untouched, page continues
```

Server-side, `risk/detectors/x402.ts` (`detectX402Findings`) independently
cross-checks a submitted transaction against the `PaymentRequirements` it was
actually issued, so a mismatched destination or asset surfaces as a finding
(`X402_DESTINATION_MISMATCH`, `X402_ASSET_MISMATCH`,
`X402_NON_CANONICAL_ASSET`, `X402_MEMO_MISSING`) even if a client-side check
were bypassed. `api/routes/demo-paywall.ts` (`/demo/scrybe`) is a working
end-to-end x402 paywall for exercising the whole path.

Caps enforced today live off-chain, in the extension's allowance ledger
(`apps/extension/src/background/db/allowances.ts`).

## On-chain — `contracts/PaymentGuard.sol`

An on-chain spending-limit vault: owner deposits a token, grants per-merchant
per-tx + rolling-24h caps, and an agent calls `pay()` to settle micropayments
without per-payment owner signatures — the caps are the firewall. See
`contracts/README.md`. This is the on-chain counterpart to the x402 caps
above; the wallet/extension enforce caps off-chain today, with the vault as
the natural next step for agent wallets that hold funds outside a browser
session.
