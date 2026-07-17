/**
 * Account picker overlay — list accounts derived from the wallet's recovery
 * phrase (BIP-44, m/44'/60'/0'/0/index), switch the active one, rename them,
 * derive a new one, or view any account's address + QR without switching to it.
 *
 * Opened from TopStrip's account button (T22).
 */

import { useEffect, useState } from "react";
import { X, Check, Plus, QrCode, Pencil } from "lucide-react";
import type { WalletAccount } from "@premon/ext-protocol";
import { useRpc, useWalletContext } from "../shared/state-context";
import { ReceiveScreen } from "./ReceiveScreen";

interface Props {
  onClose: () => void;
}

function shortAddr(s: string): string {
  return `${s.slice(0, 6)}…${s.slice(-4)}`;
}

export function AccountSheet({ onClose }: Props) {
  const { state, refresh } = useWalletContext();
  const rpc = useRpc();
  const [accounts, setAccounts] = useState<WalletAccount[]>(state?.accounts ?? []);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<number | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [viewingAddress, setViewingAddress] = useState<string | null>(null);

  useEffect(() => {
    if (state?.accounts) setAccounts(state.accounts);
  }, [state?.accounts]);

  const onSwitch = async (index: number) => {
    if (index === state?.activeAccountIndex || busy) return;
    setBusy(true);
    setError(null);
    try {
      await rpc.call("account.switch", { index });
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  const onAdd = async () => {
    setBusy(true);
    setError(null);
    try {
      const account = await rpc.call("account.create", {});
      setAccounts((prev) => [...prev, account]);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  const startRename = (a: WalletAccount) => {
    setEditing(a.index);
    setEditLabel(a.label);
  };

  const saveRename = async (index: number) => {
    const label = editLabel.trim();
    setEditing(null);
    if (!label) return;
    try {
      await rpc.call("account.rename", { index, label });
      setAccounts((prev) => prev.map((a) => (a.index === index ? { ...a, label } : a)));
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  if (viewingAddress) {
    return (
      <ReceiveScreen
        address={viewingAddress}
        network={state?.network ?? "testnet"}
        onClose={() => setViewingAddress(null)}
      />
    );
  }

  return (
    <div className="absolute inset-0 z-30 flex flex-col" style={{ background: "var(--bg)" }}>
      <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "var(--line)" }}>
        <p className="font-semibold text-sm">Accounts</p>
        <button onClick={onClose} className="p-1.5 rounded-input hover:bg-black/5">
          <X size={16} />
        </button>
      </div>

      <div className="flex-1 px-4 py-4 overflow-y-auto flex flex-col gap-3">
        <div
          className="rounded-card overflow-hidden divide-y divide-line"
          style={{ background: "var(--bg-card)", border: "1px solid var(--line)" }}
        >
          {accounts.map((a) => {
            const active = a.index === state?.activeAccountIndex;
            return (
              <div key={a.index} className="w-full flex items-center gap-2 px-3 py-3">
                <button
                  onClick={() => onSwitch(a.index)}
                  disabled={busy}
                  className="flex-1 flex items-center gap-2 text-left min-w-0 disabled:opacity-60"
                >
                  <div
                    className="w-6 h-6 shrink-0 rounded-full flex items-center justify-center"
                    style={{
                      background: active ? "var(--accent)" : "rgba(20,20,20,0.06)",
                      color: active ? "white" : "var(--text-faint)",
                    }}
                  >
                    {active ? <Check size={12} /> : <span className="text-[10px] font-bold">{a.index + 1}</span>}
                  </div>
                  <div className="min-w-0">
                    {editing === a.index ? (
                      <input
                        autoFocus
                        value={editLabel}
                        onChange={(e) => setEditLabel(e.target.value)}
                        onBlur={() => saveRename(a.index)}
                        onKeyDown={(e) => { if (e.key === "Enter") saveRename(a.index); if (e.key === "Escape") setEditing(null); }}
                        onClick={(e) => e.stopPropagation()}
                        className="text-sm font-semibold bg-transparent border-b outline-none w-full"
                        style={{ borderColor: "var(--accent)" }}
                      />
                    ) : (
                      <p className="text-sm font-semibold truncate">{a.label}</p>
                    )}
                    <p className="text-[11px] font-mono text-text-faint">{shortAddr(a.address)}</p>
                  </div>
                </button>

                <button
                  onClick={() => startRename(a)}
                  aria-label="Rename account"
                  className="p-1.5 rounded-input text-text-faint hover:text-text hover:bg-black/[0.04] shrink-0"
                >
                  <Pencil size={13} />
                </button>
                <button
                  onClick={() => setViewingAddress(a.address)}
                  aria-label="View address + QR"
                  className="p-1.5 rounded-input text-text-faint hover:text-text hover:bg-black/[0.04] shrink-0"
                >
                  <QrCode size={13} />
                </button>
              </div>
            );
          })}
        </div>

        {error && <p className="text-[11px] text-bad px-1">{error}</p>}

        <button
          onClick={onAdd}
          disabled={busy}
          className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-input text-sm font-semibold disabled:opacity-60"
          style={{ border: "1px dashed var(--line)", color: "var(--text-muted)" }}
        >
          <Plus size={14} /> Add account
        </button>
        <p className="text-[10px] text-text-faint text-center px-2">
          New accounts are derived from your recovery phrase — no new phrase to back up.
          Private-key imports support only one account.
        </p>
      </div>
    </div>
  );
}
