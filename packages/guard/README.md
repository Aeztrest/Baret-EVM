# @premon/guard

Pre-sign transaction guard SDK for **Premon**, on any **EVM** chain. Chain-light —
no `ethers` required to consume. Sends a transaction to Premon's analyzer, applies
your policy, and returns an allow/block decision. **Never signs, never submits.**

This package also ships `GuardPolicy` — the same custom-policy schema behind
[the Premon wallet's Policy editor](../../README.md#why-this-is-more-than-a-tx-simulator).
`STRICT_POLICY` / `BALANCED_POLICY` / `PERMISSIVE_POLICY` are just pre-filled
starting points; every one of the ~20 fields — approval blocks, loss %, min
post-tx balance, gas ceilings, and the x402 caps/allowlists that stop an
agent from blind-signing a payment — can be overridden per call.

```bash
pnpm add @premon/guard
```

```ts
import { TransactionGuard, STRICT_POLICY } from "@premon/guard";

const guard = new TransactionGuard({
  network: "testnet",
  analyze: { baseUrl: "https://baret-api.onrender.com" },
});

const ev = await guard.evaluate({
  transaction: { from, to: token, data: approveCalldata },
  userWallet: from,
  policy: {
    ...STRICT_POLICY,
    minPostUsdcBalance: 50,   // custom rule on top of the template
  },
});

if (ev.decision === "block") {
  console.warn("Blocked:", ev.blockingReasons);
} else {
  // safe to sign with your wallet of choice
}
```

- `TransactionGuard.evaluate(req)` → `{ decision, blockingReasons, advisoryFindings, analysis }`
- `TransactionGuard.prepare(req)` → throws `GuardBlockedError` on block
- Policy templates: `STRICT_POLICY`, `BALANCED_POLICY`, `PERMISSIVE_POLICY` — any
  field on `GuardPolicy` can be overridden, so policy is per-user, not per-tier

For a drop-in **ethers signer** that enforces this automatically, see
[`@premon/agent-kit`](https://www.npmjs.com/package/@premon/agent-kit).

MIT · https://premon.example
