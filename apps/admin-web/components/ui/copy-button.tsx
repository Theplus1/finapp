"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  text: string;
  showText?: boolean;
};

export function CopyIcon({ text, showText = true }: Props) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="flex items-center gap-2">
      {showText && <span className="font-mono text-sm">{text}</span>}
      <span
        onClick={handleCopy}
        className={cn(
          "h-6 w-6 p-0 cursor-pointer rounded-full flex items-center justify-center",
          copied ? "text-green-600 border border-green-500 cursor-default" : ""
        )}
      >
        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      </span>
    </div>
  );
}
