import Image from "next/image";
import Link from "next/link";

export function PointedMark({
  className,
  size = 28,
}: {
  className?: string;
  size?: number;
}) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      focusable="false"
      height={size}
      viewBox="0 0 48 48"
      width={size}
    >
      <circle cx="24" cy="24" fill="currentColor" r="5.25" />
      <g
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="6.5"
      >
        <path d="M14.5 9.5A18.5 18.5 0 0 1 33.5 9.5" />
        <path
          d="M14.5 9.5A18.5 18.5 0 0 1 33.5 9.5"
          transform="rotate(120 24 24)"
        />
        <path
          d="M14.5 9.5A18.5 18.5 0 0 1 33.5 9.5"
          transform="rotate(240 24 24)"
        />
      </g>
    </svg>
  );
}

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link aria-label="Pointed home" className="brand" href="/">
      <Image
        alt=""
        aria-hidden="true"
        className="brand-mark"
        height={compact ? 26 : 28}
        src="/pointed-mark.svg"
        unoptimized
        width={compact ? 26 : 28}
      />
      {!compact && <span>Pointed</span>}
    </Link>
  );
}
