import type { FastifyInstance } from "fastify";
import type { RouteDeps } from "./types.js";
import { vaultAddress, fulfillSwap, MON_PER_USDC_RATE } from "../../novaswap/vault.js";

/**
 * NovaSwap demo-vault routes (see ../../novaswap/vault.ts for the mechanism).
 * Unauthenticated by design, same as /demo/scrybe — a self-contained demo
 * endpoint, not part of the analyze API surface.
 */
export function registerNovaSwapRoutes(app: FastifyInstance, deps: RouteDeps): void {
  app.get("/demo/novaswap/config", async (_req, reply) => {
    return reply.send({
      vaultAddress: vaultAddress(deps.config),
      rate: MON_PER_USDC_RATE,
      usdcAddress: deps.config.chain.usdcAddress,
      usdcDecimals: deps.config.chain.usdcDecimals,
    });
  });

  app.post("/demo/novaswap/fulfill", async (req, reply) => {
    const body = req.body as { txHash?: unknown } | undefined;
    const txHash = body?.txHash;
    if (typeof txHash !== "string" || !/^0x[0-9a-fA-F]{64}$/.test(txHash)) {
      return reply.code(400).send({ error: "Missing or malformed txHash." });
    }
    const result = await fulfillSwap(deps.config, txHash);
    if (!result.ok) {
      return reply.code(result.status).send({ error: result.error });
    }
    return reply.send(result);
  });
}
