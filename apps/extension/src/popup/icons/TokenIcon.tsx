/**
 * Small circular token badges for the balance rows + token detail screen.
 * MON uses the wallet's own Monad-purple accent; USDC uses Circle's
 * brand blue — so assets are recognizable by color/shape, not just text,
 * the way every other wallet renders its balance list.
 */

export function MonIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" aria-hidden>
      <circle cx="10" cy="10" r="10" fill="#836EF9" />
      <path
        d="M10 4.5c-2.4 0-4.2 2.6-4.2 5.5s1.8 5.5 4.2 5.5 4.2-2.6 4.2-5.5S12.4 4.5 10 4.5Zm0 2.1c1.1 0 2.1 1.6 2.1 3.4s-1 3.4-2.1 3.4-2.1-1.6-2.1-3.4 1-3.4 2.1-3.4Z"
        fill="#FFFFFF"
      />
    </svg>
  );
}

export function UsdcIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" aria-hidden>
      <circle cx="10" cy="10" r="10" fill="#2775CA" />
      <path
        d="M8.3 14.1c-2.1-.6-3.3-2.1-3.3-4.1s1.2-3.5 3.3-4.1v-1h1.3v.9c.6-.05 1.2 0 1.8.2l-.2 1.5a4 4 0 0 0-1.8-.2c-1.1.1-1.9.7-1.9 1.6 0 .8.5 1.2 1.9 1.6 1.9.5 2.7 1.3 2.7 2.7 0 1.4-1 2.5-2.7 2.7v1H8.1v-.9a5 5 0 0 1-2.1-.4l.3-1.5c.5.2 1.3.4 2.1.4 1.2 0 2-.5 2-1.3 0-.7-.5-1.1-1.9-1.5Z"
        fill="#FFFFFF"
      />
    </svg>
  );
}

export function TokenIcon({ symbol, size = 20 }: { symbol: string; size?: number }) {
  if (symbol === "USDC") return <UsdcIcon size={size} />;
  return <MonIcon size={size} />;
}
