# Deploying Premon (free tier)

The monorepo ships in 3 deployable parts; all fit free tiers.

| Part | Type | Where | Cost |
|------|------|-------|------|
| `apps/server` | Fastify analyzer API | **Render** (free web service) | $0 (sleeps after 15 min idle) |
| `apps/showcase` | Vite/React SPA → calls backend via `/api` | **Vercel** | $0 |
| `apps/wallet` | Vite/React SPA (static) | **Vercel** (2nd project) | $0 |
| `apps/extension` | Browser extension | local build → load unpacked | $0 |

Flow: browser opens `showcase` → `/api/v1/analyze` is **rewritten by Vercel** to
the Render backend (same-origin, no CORS) → backend simulates on the
configured EVM chain and returns the verdict.

---

## 1) Backend → Render (do this first; you need its URL)

1. https://render.com → free account.
2. **New → Blueprint** → pick this repo. Render reads `render.yaml` and creates
   the `baret-api` service (build, start, health check, and env vars are all
   pre-filled, including `RPC_URL=https://testnet-rpc.monad.xyz`).
3. Deploy gives a URL like `https://baret-api.onrender.com`.
4. Verify: `https://<url>/health` → `{"status":"ok","chainId":10143,...}` and
   `https://<url>/health/ready` → `{"status":"ready","rpcChainId":10143}`.

> Free plan sleeps after 15 min idle; the next request cold-starts in ~30 s.

If the auto-generated name isn't `baret-api`, note the real URL and update the
rewrite in `vercel.json` (step 2).

---

## 2) Frontend (showcase) → Vercel

1. If your Render URL is **not** `https://baret-api.onrender.com`, edit
   `vercel.json`'s rewrite `destination` to match it.
2. https://vercel.com → **Add New → Project** → import this repo.
3. Vercel auto-uses `vercel.json` (build + output `apps/showcase/dist` + the
   `/api` rewrite). The build bakes `VITE_ANALYZE_URL=/api`, so the SPA calls
   `/api/v1/analyze` → rewritten to Render. No extra env needed.
4. Deploy → `https://<project>.vercel.app` shows the showcase; analysis calls
   proxy to Render.

> API key: the frontend sends `dev-key-change-me` by default, matching the
> Render `DELTAG_API_KEYS`. To lock down, set `VITE_ANALYZE_API_KEY` in Vercel
> and `DELTAG_API_KEYS` in Render to the same value.

---

## 3) Wallet → a second Vercel project (optional)

The wallet is a static SPA. Add it as a **second Vercel project** from the same
repo, overriding the build in the project settings (the root `vercel.json`
targets the showcase):

- **Install Command:** `pnpm install --frozen-lockfile --prod=false`
- **Build Command:** `pnpm --filter @premon/guard build && pnpm --filter @premon/wallet-adapter build && pnpm --filter @premon/ui build && pnpm --filter @premon/wallet build`
- **Output Directory:** `apps/wallet/dist`
- **Env:** `VITE_ANALYZE_URL=https://baret-api.onrender.com` (cross-origin; the
  backend sends `Access-Control-Allow-Origin: *` so this works).

---

## 4) Extension → load unpacked

```bash
pnpm --filter @premon/extension build      # → apps/extension/dist
```
Chrome: `chrome://extensions` → Developer mode → **Load unpacked** →
`apps/extension/dist`. Point it at your Render API by setting `VITE_ANALYZE_URL`
at build time if you don't run the analyzer locally.

---

## 5) Smart contract → your EVM chain (optional)

```bash
cd contracts && forge install   # if lib/ is absent
export TOKEN=0x<usdc-on-your-chain>
export PRIVATE_KEY=0x<deployer-key>
forge script script/Deploy.s.sol --rpc-url testnet --broadcast --private-key $PRIVATE_KEY
```

---

## Env reference

Server (`apps/server/.env.example`): `RPC_URL` (required), `NETWORK`,
`USDC_ADDRESS`, `DELTAG_API_KEYS`, `CORS_ALLOW_ORIGIN`, `X402_*`.
Frontends: `VITE_ANALYZE_URL`, `VITE_ANALYZE_API_KEY`, `VITE_WALLET_URL`.
