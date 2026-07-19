/**
 * Token detail overlay — shows a token's balance and its CONTRACT address
 * (copyable, no QR) for importing/verifying the token in an explorer or
 * another wallet. This is NOT a receive address — sending funds to a token
 * contract does not credit your wallet. A previous version showed a QR code
 * here, which reads exactly like ReceiveScreen's "send here" QR and led to
 * funds being sent to the contract by mistake. Removed the QR entirely and
 * pointed users at the real receive flow instead.
 *
 * Opened from the balance rows on Home.tsx.
 */

import { useState } from "react";
import { X, Copy, Check, ExternalLink, Download, AlertTriangle } from "lucide-react";
import type { EvmNetwork } from "@premon/ext-protocol";
import { chainFor } from "../shared/chain";
import { TokenIcon } from "./icons/TokenIcon";

interface Props {
  symbol: string;
  /** Token contract address (0x). */
  tokenAddress: string;
  balance: string;
  network: string;
  onClose: () => void;
  onReceive: () => void;
}

export function TokenDetail({ symbol, tokenAddress, balance, network, onClose, onReceive }: Props) {
  const chain = chainFor(network as EvmNetwork);
  const [copied, setCopied] = useState(false);

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(tokenAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="absolute inset-0 z-30 flex flex-col" style={{ background: "var(--bg)" }}>
      <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "var(--line)" }}>
        <p className="font-semibold text-sm flex items-center gap-2">
          <TokenIcon symbol={symbol} size={18} /> {symbol}
        </p>
        <button onClick={onClose} className="p-1.5 rounded-input hover:bg-black/5">
          <X size={16} />
        </button>
      </div>

      <div className="flex-1 px-5 py-6 flex flex-col items-center gap-5 overflow-y-auto">
        <TokenIcon symbol={symbol} size={44} />
        <div className="text-center -mt-2">
          <p className="text-3xl font-extrabold font-mono tracking-tight">{balance}</p>
          <p className="text-text-faint text-[11px] mt-1">{symbol} balance on {network}</p>
        </div>

        <button
          onClick={onReceive}
          className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-input text-sm font-semibold text-white"
          style={{ background: "var(--accent)" }}
        >
          <Download size={14} /> Receive {symbol}
        </button>

        <div className="w-full h-px" style={{ background: "var(--line)" }} />

        <div
          className="w-full flex items-start gap-2 p-3 rounded-input text-[11px]"
          style={{ background: "rgba(255,136,56,0.08)", border: "1px solid rgba(255,136,56,0.25)" }}
        >
          <AlertTriangle size={13} className="shrink-0 mt-0.5" style={{ color: "var(--warn)" }} />
          <span className="text-text-muted">
            This is the {symbol} <strong>token contract</strong> — not your wallet address.
            Sending funds here will not credit your balance. Use "Receive {symbol}" above instead.
          </span>
        </div>

        <div className="w-full">
          <p className="label">Token contract address</p>
          <button
            onClick={onCopy}
            className="w-full text-left p-3 rounded-input font-mono text-[11px] break-all flex items-start gap-2 group"
            style={{ background: "rgba(20,20,20,0.045)", border: "1px solid var(--line)" }}
          >
            <span className="flex-1 text-text-muted group-hover:text-text">{tokenAddress}</span>
            {copied
              ? <Check size={14} className="shrink-0 text-ok mt-0.5" />
              : <Copy size={14} className="shrink-0 text-text-faint group-hover:text-text mt-0.5" />}
          </button>
          {copied && <p className="text-[10px] text-ok mt-1.5">Copied to clipboard</p>}
        </div>

        <a
          href={`${chain.explorerUrl}/address/${tokenAddress}`}
          target="_blank"
          rel="noreferrer"
          className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-input text-sm font-semibold"
          style={{ background: "rgba(20,20,20,0.04)", border: "1px solid var(--line)" }}
        >
          <ExternalLink size={14} /> View on explorer
        </a>
        <p className="text-[10px] text-text-faint text-center max-w-[260px]">
          Copy this contract address to import {symbol} into another wallet, or
          share it so others can verify the token.
        </p>
      </div>
    </div>
  );
}
