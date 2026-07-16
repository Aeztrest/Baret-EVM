# @baret/agent-kit

Guard your **agent / program wallet** with [Baret](https://baret.example).
A drop-in `ethers` signer + CLI that runs every transaction through Baret's
pre-sign firewall and **refuses to sign** anything your policy blocks — so a
poisoned prompt, a bad tool, or a malicious dependency can't drain the wallet.

```bash
pnpm add @baret/agent-kit
```

## SDK — `GuardedWallet`

```ts
import { GuardedWallet, STRICT_POLICY } from "@baret/agent-kit";

const agent = new GuardedWallet({
  privateKey: process.env.AGENT_KEY!,
  rpcUrl:     "https://testnet-rpc.monad.xyz",
  analyzeUrl: "https://baret-api.onrender.com",
  policy:     STRICT_POLICY,
});

// Baret simulates + policy-checks FIRST. On a block this throws
// GuardBlockedError and never signs.
await agent.sendTransaction({ to: token, data: approveCalldata });

// Dry-run without signing:
const { decision, blockingReasons } = await agent.evaluate({ to, data });
```

## CLI — `baret`

```bash
export BARET_PRIVATE_KEY=0xYOUR_AGENT_KEY

baret address                                   # show the agent address
baret analyze --to 0xToken --data 0x.. --policy strict   # dry-run verdict
baret send    --to 0xToken --data 0x.. --policy strict   # guarded send
baret policy strict                             # print a policy as JSON
```

Env: `BARET_PRIVATE_KEY`, `BARET_RPC_URL`, `BARET_ANALYZE_URL`,
`BARET_API_KEY`, `BARET_NETWORK`, `BARET_POLICY`.

Policies: `STRICT_POLICY`, `BALANCED_POLICY`, `PERMISSIVE_POLICY` (or `--policy strict|balanced|permissive`).

MIT · https://baret.example/agents
