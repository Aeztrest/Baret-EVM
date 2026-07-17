/**
 * Pooled, resilient RPC provider per network. Uses an ethers FallbackProvider
 * across several RPC endpoints so a slow / rate-limited / down endpoint
 * doesn't stall balance + simulation reads — the first healthy backend answers.
 */

import { JsonRpcProvider, FallbackProvider, Network, type AbstractProvider } from "ethers";
import type { EvmNetwork } from "@premon/ext-protocol";
import { chainFor } from "../../shared/chain";
import { getState } from "../state/store";

const providerCache = new Map<EvmNetwork, AbstractProvider>();

function buildProvider(n: EvmNetwork): AbstractProvider {
  const cfg = chainFor(n);
  // Pin the chain id + name so ethers never performs an eth_chainId probe that
  // would fail to auto-detect on a fresh service-worker wake.
  const net = new Network(`evm-${n}`, cfg.chainId);

  const urls = cfg.rpcUrls?.length ? cfg.rpcUrls : [cfg.rpcUrl];
  const children = urls.map(
    (url) =>
      new JsonRpcProvider(url, net, { staticNetwork: net, batchMaxCount: 1 }),
  );

  if (children.length === 1) return children[0]!;

  // quorum 1 → return as soon as one backend responds; stallTimeout fails over
  // quickly when a backend is slow. priority orders the preferred endpoints.
  return new FallbackProvider(
    children.map((provider, i) => ({
      provider,
      priority: i + 1,
      weight: 1,
      stallTimeout: 1500,
    })),
    net,
    { quorum: 1 },
  );
}

export function getProvider(network?: EvmNetwork): AbstractProvider {
  const n: EvmNetwork = network ?? getState().network;
  let provider = providerCache.get(n);
  if (!provider) {
    provider = buildProvider(n);
    providerCache.set(n, provider);
  }
  return provider;
}

export function getChainId(network?: EvmNetwork): number {
  const n: EvmNetwork = network ?? getState().network;
  return chainFor(n).chainId;
}
