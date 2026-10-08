'use client';

import { useState } from 'react';
import { Check, Copy } from 'lucide-react';

export default function CopyMarkdownButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <button type="button" className="novel-copy-button" onClick={copy} aria-label="Copy Markdown">
      {copied ? <Check size={13} /> : <Copy size={13} />}
      <span>{copied ? 'COPIED' : 'COPY MD'}</span>
    </button>
  );
}
