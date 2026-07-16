# Baret PaymentGuard

On-chain spending-limit vault for x402 / agentic micropayments.

The off-chain firewall (Baret analyzer + `@baret/guard`) screens a tx
before a human signs it. This contract is the on-chain counterpart: the owner
deposits a token (e.g. USDC), grants each merchant a per-transaction cap plus a
rolling 24-hour cap, and an agent calls `pay()` to settle micropayments **without
the owner signing each one** — the caps ARE the firewall.

`deposit` uses `transferFrom` (caller must `approve` first); `pay`/`withdraw`
use `transfer` from the vault.

## Develop

```bash
forge build
forge test -vv          # includes a fuzz invariant
forge fmt
```

## Deploy

```bash
export TOKEN=0x...            # USDC (or equivalent) on your target chain
export PRIVATE_KEY=0x...
forge script script/Deploy.s.sol --rpc-url testnet --broadcast --private-key $PRIVATE_KEY
```

`testnet` is the RPC alias defined in `foundry.toml` — point it at any EVM
chain by editing `[rpc_endpoints]`.
