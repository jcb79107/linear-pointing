"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";

export function CopySetupPrompt({ prompt }: { prompt: string }) {
  const [copied, setCopied] = useState(false);

  async function copyPrompt() {
    await navigator.clipboard.writeText(prompt);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <button className="button button-primary" onClick={copyPrompt} type="button">
      {copied ? <Check size={15} /> : <Copy size={15} />}
      {copied ? "Copied" : "Copy setup prompt"}
    </button>
  );
}
