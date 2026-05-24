import { useState, useCallback } from "react";
import { Copy, Check } from "lucide-react";

interface CopyableJsonProps {
  data: unknown;
}

export default function CopyableJson({ data }: CopyableJsonProps) {
  const [copied, setCopied] = useState(false);
  const json = JSON.stringify(data, null, 2);

  const handleCopy = useCallback(() => {
    void navigator.clipboard.writeText(json).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [json]);

  return (
    <div className="relative mt-3">
      <button
        type="button"
        onClick={handleCopy}
        className="absolute top-2 right-2 inline-flex items-center gap-1.5 rounded-lg border border-[var(--line)] bg-[var(--surface)] px-2.5 py-1.5 text-[10px] font-semibold text-[var(--sea-ink-soft)] transition hover:bg-[var(--link-bg-hover)] hover:text-[var(--sea-ink)] cursor-pointer"
      >
        {copied ? (
          <>
            <Check size={12} className="text-green-500" />
            Copied!
          </>
        ) : (
          <>
            <Copy size={12} />
            Copy
          </>
        )}
      </button>
      <pre className="overflow-x-auto rounded-lg bg-[var(--surface)] border border-[var(--line)] p-4 pr-20 text-xs text-[var(--sea-ink-soft)] leading-relaxed">
        {json}
      </pre>
    </div>
  );
}
