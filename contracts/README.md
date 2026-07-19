# Premon PaymentGuard

On-chain spending-limit vault for x402 / agentic micropayments.

The off-chain firewall (Premon analyzer + `@premon/guard`) screens a tx
before a human signs it, and the browser extension's x402 interceptor decodes
every payment request before an agent pays it — see the root
[README](../README.md#why-this-is-more-than-a-tx-simulator) for that flow.
This contract is the on-chain counterpart: the owner deposits a token (e.g.
USDC), grants each merchant a per-transaction cap plus a rolling 24-hour cap,
and an agent calls `pay()` to settle micropayments **without the owner
signing each one** — the caps ARE the firewall, enforced by the contract
itself rather than by a human reviewing every payment.

`deposit` uses `transferFrom` (caller must `approve` first); `pay`/`withdraw`
use `transfer` from the vault.

## Deployed

| Network | Address | Token | Owner |
| --- | --- | --- | --- |
| Monad testnet (10143) | [`0x1e09E971c53bD59e481Ef02147C6CeeBf0B09717`](https://testnet.monadexplorer.com/address/0x1e09E971c53bD59e481Ef02147C6CeeBf0B09717) | USDC `0x534b2f3A21130d7a60830c2Df862319e593943A3` | `0x450aC235634BCE52eBFd90A52DFb32A0813919f4` |

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
