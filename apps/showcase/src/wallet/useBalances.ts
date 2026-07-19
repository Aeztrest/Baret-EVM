/**
 * Reads a connected wallet's real on-chain MON + USDC balance directly from
 * Monad testnet — no mock numbers. Balance is public on-chain data, so this
 * reads straight from an RPC provider rather than going through the wallet.
 */

import { useEffect, useState } from "react";
import { Contract, JsonRpcProvider, formatEther, formatUnits } from "ethers";

const RPC_URL = "https://testnet-rpc.monad.xyz";
const USDC_ADDRESS = "0x534b2f3A21130d7a60830c2Df862319e593943A3";
const USDC_DECIMALS = 6;
const ERC20_BALANCE_ABI = ["function balanceOf(address) view returns (uint256)"];

let sharedProvider: JsonRpcProvider | null = null;
function getProvider(): JsonRpcProvider {
  if (!sharedProvider) sharedProvider = new JsonRpcProvider(RPC_URL);
  return sharedProvider;
}

export interface TokenBalances {
  mon: number | null;
  usdc: number | null;
  loading: boolean;
}

export function useTokenBalances(address: string | null): TokenBalances {
  const [mon, setMon] = useState<number | null>(null);
  const [usdc, setUsdc] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!address) {
      setMon(null);
      setUsdc(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const provider = getProvider();
    const usdc = new Contract(USDC_ADDRESS, ERC20_BALANCE_ABI, provider);

    Promise.allSettled([
      provider.getBalance(address),
      usdc.getFunction("balanceOf")(address) as Promise<bigint>,
    ])
      .then(([monRes, usdcRes]) => {
        if (cancelled) return;
        if (monRes.status === "fulfilled") setMon(Number(formatEther(monRes.value)));
        if (usdcRes.status === "fulfilled") setUsdc(Number(formatUnits(usdcRes.value, USDC_DECIMALS)));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [address]);

  return { mon, usdc, loading };
}
