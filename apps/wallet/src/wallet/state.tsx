import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { clearWallet as clearWalletStore } from "../storage/wallet-store";
import { clearPolicy } from "../storage/policy-store";
import { clearHistory } from "../storage/history-store";
import { createNewWallet, loadExistingWallet, type WalletAccount } from "./keypair";
import { getProvider, USDC_TOKEN } from "./connection";
import { fetchNativeBalance, fetchTokenBalance, type TokenBalance } from "./smart-wallet";

export interface WalletIdentity {
  /** The ethers wallet — signs transactions. */
  wallet: WalletAccount;
  /** EOA `0x…` address — holds funds and signs. */
  address: string;
  /**
   * On EVM the EOA *is* the wallet, so this always equals `address`
   * (no contract to provision).
   */
  smartWalletAddress: string;
  /** BIP-39 mnemonic when available (for the backup step). */
  mnemonic: string | null;
  createdAt: string;
}

export type WalletPhase = "loading" | "unprovisioned" | "ready";

export interface WalletStateValue {
  phase: WalletPhase;
  error: string | null;
  identity: WalletIdentity | null;
  /** True once a wallet exists. On EVM the EOA is usable immediately. */
  provisioned: boolean;
  /** Native MON balance. */
  balance: number | null;
  /** USDC (ERC-20) balance, when readable. */
  usdcBalance: TokenBalance | null;

  /** Generate a fresh EVM wallet and persist. Throws if a wallet exists. */
  createWallet: () => WalletIdentity;
  /**
   * No-op on EVM (the EOA needs no provisioning).
   */
  provision: () => Promise<void>;
  /** Refresh balances from the RPC. */
  refresh: () => Promise<void>;
  /** Wipe everything: key material, policy, history. Returns user to onboarding. */
  reset: () => void;
}

const Ctx = createContext<WalletStateValue | null>(null);

export function useWallet(): WalletStateValue {
  const v = useContext(Ctx);
  if (!v) throw new Error("useWallet must be used inside <WalletProvider>");
  return v;
}

export function WalletProvider({ children }: { children: ReactNode }) {
  const [phase, setPhase] = useState<WalletPhase>("loading");
  const [error] = useState<string | null>(null);
  const [identity, setIdentity] = useState<WalletIdentity | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [usdcBalance, setUsdcBalance] = useState<TokenBalance | null>(null);

  const refreshBalances = useCallback(async (id: WalletIdentity) => {
    const provider = getProvider();
    const [mon, usdc] = await Promise.all([
      fetchNativeBalance(provider, id.address),
      fetchTokenBalance(provider, USDC_TOKEN, id.address),
    ]);
    // Keep the last good value on a transient null so balances never blank to 0.
    if (mon != null) setBalance(mon);
    if (usdc != null) setUsdcBalance(usdc);
  }, []);

  // Initial mount: load existing wallet from storage.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const stored = loadExistingWallet();
      if (!stored) {
        if (!cancelled) setPhase("unprovisioned");
        return;
      }
      const id: WalletIdentity = {
        wallet: stored.wallet,
        address: stored.wallet.address,
        smartWalletAddress: stored.wallet.address,
        mnemonic: stored.mnemonic,
        createdAt: stored.createdAt,
      };
      if (cancelled) return;
      setIdentity(id);
      setPhase("ready");
      await refreshBalances(id);
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshBalances]);

  const createWallet = useCallback((): WalletIdentity => {
    const { wallet, mnemonic } = createNewWallet();
    const id: WalletIdentity = {
      wallet,
      address: wallet.address,
      smartWalletAddress: wallet.address,
      mnemonic,
      createdAt: new Date().toISOString(),
    };
    setIdentity(id);
    setPhase("ready");
    void refreshBalances(id);
    return id;
  }, [refreshBalances]);

  // EVM EOA needs no provisioning — resolve immediately.
  const provision = useCallback(async (): Promise<void> => {}, []);

  const refresh = useCallback(async (): Promise<void> => {
    if (!identity) return;
    await refreshBalances(identity);
  }, [identity, refreshBalances]);

  const reset = useCallback(() => {
    clearWalletStore();
    clearPolicy();
    clearHistory();
    setIdentity(null);
    setBalance(null);
    setUsdcBalance(null);
    setPhase("unprovisioned");
  }, []);

  const value = useMemo<WalletStateValue>(
    () => ({
      phase,
      error,
      identity,
      provisioned: !!identity,
      balance,
      usdcBalance,
      createWallet,
      provision,
      refresh,
      reset,
    }),
    [phase, error, identity, balance, usdcBalance, createWallet, provision, refresh, reset],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
