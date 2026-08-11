import { Vote } from "lucide-react";
import Link from "next/link";

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link className="brand" href="/">
      <span className="brand-mark">
        <Vote size={compact ? 17 : 19} strokeWidth={2} />
      </span>
      {!compact && <span>Linear Pointing</span>}
    </Link>
  );
}
