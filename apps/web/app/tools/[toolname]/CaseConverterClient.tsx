'use client';

import { useState } from 'react';
import type { ToolDefinition } from '@/lib/tools';
import { Type, Copy, Check, Trash2, ShieldCheck, Sparkles } from 'lucide-react';

export default function CaseConverterClient({ tool }: { tool: ToolDefinition }) {
  const [text, setText] = useState('');
  const [copied, setCopied] = useState(false);

  // Conversion algorithms
  const toSentenceCase = (str: string) => {
    return str.toLowerCase().replace(/(^\s*\w|[.!?]\s*\w)/g, (c) => c.toUpperCase());
  };

  const toTitleCase = (str: string) => {
    const smallWords = new Set(['a', 'an', 'and', 'as', 'at', 'but', 'by', 'for', 'if', 'in', 'nor', 'of', 'on', 'or', 'so', 'the', 'to', 'up', 'yet']);
    return str.toLowerCase().split(/\s+/).map((word, idx) => {
      if (idx > 0 && smallWords.has(word)) return word;
      return word.charAt(0).toUpperCase() + word.slice(1);
    }).join(' ');
  };

  const toCapitalizedWords = (str: string) => {
    return str.toLowerCase().split(/\s+/).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  };

  const toCamelCase = (str: string) => {
    return str
      .replace(/[^a-zA-Z0-9]+(.)/g, (_, chr) => chr.toUpperCase())
      .replace(/^[A-Z]/, (c) => c.toLowerCase());
  };

  const toSnakeCase = (str: string) => {
    return str
      .trim()
      .toLowerCase()
      .replace(/[^a-zA-Z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
  };

  const toKebabCase = (str: string) => {
    return str
      .trim()
      .toLowerCase()
      .replace(/[^a-zA-Z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  const cleanWhitespace = (str: string) => {
    return str.replace(/[ \t]+/g, ' ').replace(/\n\s*\n/g, '\n\n').trim();
  };

  const applyTransform = (transform: (s: string) => string) => {
    if (!text) return;
    setText(transform(text));
  };

  const handleCopy = () => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="tool-view-wrapper">
      <div className="page-header" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <div className="card-tag active" style={{ margin: 0 }}>{tool.category}</div>
          <span className="tool-badge-pill">
            <ShieldCheck size={11} style={{ marginRight: '3px' }} />
            client-side
          </span>
        </div>
        <h1><span className="hl">case</span> converter</h1>
        <div className="page-sub">
          <span className="jp-label">変換</span> — {tool.description}
        </div>
      </div>

      <div className="bracket-card tool-box">
        {/* Transformation Action Buttons */}
        <div className="case-buttons-grid" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
          <button type="button" className="tool-action-btn secondary" onClick={() => applyTransform((s) => s.toUpperCase())}>
            UPPERCASE
          </button>
          <button type="button" className="tool-action-btn secondary" onClick={() => applyTransform((s) => s.toLowerCase())}>
            lowercase
          </button>
          <button type="button" className="tool-action-btn secondary" onClick={() => applyTransform(toTitleCase)}>
            Title Case
          </button>
          <button type="button" className="tool-action-btn secondary" onClick={() => applyTransform(toSentenceCase)}>
            Sentence case
          </button>
          <button type="button" className="tool-action-btn secondary" onClick={() => applyTransform(toCapitalizedWords)}>
            Capitalized Words
          </button>
          <button type="button" className="tool-action-btn secondary" onClick={() => applyTransform(toCamelCase)}>
            camelCase
          </button>
          <button type="button" className="tool-action-btn secondary" onClick={() => applyTransform(toSnakeCase)}>
            snake_case
          </button>
          <button type="button" className="tool-action-btn secondary" onClick={() => applyTransform(toKebabCase)}>
            kebab-case
          </button>
          <button type="button" className="tool-action-btn secondary" onClick={() => applyTransform(cleanWhitespace)}>
            Clean Spacing
          </button>
        </div>

        <div className="tool-label-row">
          <label htmlFor="case-input" className="tool-input-label">
            <Type size={13} style={{ marginRight: '6px' }} />
            text editor
          </label>
          <div className="tool-input-actions">
            {text && (
              <>
                <button type="button" className="tool-text-btn" onClick={handleCopy}>
                  {copied ? <Check size={11} style={{ marginRight: '3px' }} /> : <Copy size={11} style={{ marginRight: '3px' }} />}
                  {copied ? 'copied' : 'copy text'}
                </button>
                <button type="button" className="tool-text-btn" onClick={() => setText('')}>
                  <Trash2 size={11} style={{ marginRight: '3px' }} />
                  clear
                </button>
              </>
            )}
          </div>
        </div>

        <textarea
          id="case-input"
          className="tool-text-input"
          style={{ height: '240px', resize: 'vertical', lineHeight: '1.6' }}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Paste or type any text to transform instantly..."
        />
      </div>
    </div>
  );
}
