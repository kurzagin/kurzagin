'use client';

import { useState } from 'react';
import type { ToolDefinition } from '@/lib/tools';
import { cleanUrl, type CleanUrlResult } from '@/lib/linkCleaner';
import {
  Link2,
  Trash2,
  Copy,
  Check,
  ExternalLink,
  ShieldCheck,
  Sparkles,
  Info,
} from 'lucide-react';

export default function LinkCleanerClient({ tool }: { tool: ToolDefinition }) {
  const [inputUrl, setInputUrl] = useState('');
  const [result, setResult] = useState<CleanUrlResult | null>(null);
  const [copied, setCopied] = useState(false);

  const handleClean = (urlToProcess?: string) => {
    const val = urlToProcess !== undefined ? urlToProcess : inputUrl;
    if (!val.trim()) {
      setResult(null);
      return;
    }
    const res = cleanUrl(val);
    setResult(res);
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setInputUrl(text);
        handleClean(text);
      }
    } catch {
      // clipboard access not permitted
    }
  };

  const handleClear = () => {
    setInputUrl('');
    setResult(null);
  };

  const handleCopy = () => {
    if (!result || !result.cleaned) return;
    navigator.clipboard.writeText(result.cleaned);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const loadExample = (url: string) => {
    setInputUrl(url);
    handleClean(url);
  };

  return (
    <div className="tool-view-wrapper">
      <div className="page-header" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <div className="card-tag active" style={{ margin: 0 }}>
            {tool.category}
          </div>
          <span className="tool-badge-pill">
            <ShieldCheck size={11} style={{ marginRight: '3px' }} />
            client-side only
          </span>
        </div>
        <h1>
          <span className="hl">link</span> cleaner
        </h1>
        <div className="page-sub">
          <span className="jp-label">URL整形</span> — {tool.description}
        </div>
      </div>

      <div className="bracket-card tool-box">
        <div className="tool-form-group">
          <div className="tool-label-row">
            <label htmlFor="url-input" className="tool-input-label">
              <Link2 size={13} style={{ marginRight: '6px' }} />
              target url
            </label>
            <div className="tool-input-actions">
              <button
                type="button"
                className="tool-text-btn"
                onClick={handlePaste}
                title="Paste from clipboard"
              >
                paste clipboard
              </button>
              {inputUrl && (
                <button
                  type="button"
                  className="tool-text-btn"
                  onClick={handleClear}
                  title="Clear input"
                >
                  <Trash2 size={11} style={{ marginRight: '3px' }} />
                  clear
                </button>
              )}
            </div>
          </div>

          <div className="tool-input-wrap">
            <input
              id="url-input"
              type="text"
              value={inputUrl}
              onChange={(e) => {
                setInputUrl(e.target.value);
                if (e.target.value.trim()) {
                  handleClean(e.target.value);
                } else {
                  setResult(null);
                }
              }}
              placeholder="https://example.com/item?utm_source=twitter&utm_medium=social&fbclid=IwAR0..."
              className="tool-text-input"
              autoComplete="off"
              spellCheck="false"
            />
          </div>
        </div>

        {/* Examples / presets quick pills */}
        <div className="tool-presets-row">
          <span className="tool-presets-label">
            <Sparkles size={11} style={{ marginRight: '4px' }} />
            try examples:
          </span>
          <button
            type="button"
            className="tool-preset-chip"
            onClick={() =>
              loadExample(
                'https://x.com/kurzagin/status/2069299802509082854?a=0MsyzqUgyHmuQHRQCWU&s=19'
              )
            }
          >
            Twitter / X
          </button>
          <button
            type="button"
            className="tool-preset-chip"
            onClick={() =>
              loadExample(
                'https://www.amazon.com/Product-Name/dp/B08N5WRWNW?tag=affiliate-20&ref_=nav_ya_signin'
              )
            }
          >
            Amazon
          </button>
          <button
            type="button"
            className="tool-preset-chip"
            onClick={() =>
              loadExample(
                'https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT?si=b8c8d84a7df146d5'
              )
            }
          >
            Spotify
          </button>
          <button
            type="button"
            className="tool-preset-chip"
            onClick={() =>
              loadExample(
                'https://youtu.be/dQw4w9WgXcQ?si=abcdefghijk&feature=shared'
              )
            }
          >
            YouTube
          </button>
        </div>

        {/* Results Area */}
        {result && (
          <div className="tool-result-panel">
            {result.error ? (
              <div className="tool-error-msg">
                <span>{result.error}</span>
              </div>
            ) : (
              <>
                <div className="tool-result-head">
                  <div className="tool-result-status">
                    <span className="dot" style={{ background: 'var(--accent)' }}></span>
                    <span style={{ fontWeight: 600, color: 'var(--accent)' }}>
                      CLEANED LINK
                    </span>
                    {result.removedParams.length > 0 ? (
                      <span className="tool-badge-pill" style={{ marginLeft: '8px' }}>
                        {result.removedParams.length} parameter{result.removedParams.length > 1 ? 's' : ''} removed
                      </span>
                    ) : (
                      <span className="tool-badge-pill" style={{ marginLeft: '8px', opacity: 0.8 }}>
                        Already clean
                      </span>
                    )}
                  </div>
                  <div className="tool-result-actions">
                    <a
                      href={result.cleaned}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="tool-action-btn secondary"
                      title="Open in new tab"
                    >
                      <ExternalLink size={12} />
                      <span>visit</span>
                    </a>
                    <button
                      type="button"
                      className="tool-action-btn primary"
                      onClick={handleCopy}
                    >
                      {copied ? (
                        <>
                          <Check size={12} />
                          <span>copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy size={12} />
                          <span>copy cleaned</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <div className="tool-output-box">
                  <span className="tool-output-text">{result.cleaned}</span>
                </div>

                {/* Removed parameters list */}
                {result.removedParams.length > 0 && (
                  <div className="tool-params-breakdown">
                    <div className="tool-breakdown-title">
                      Stripped trackers:
                    </div>
                    <div className="tool-param-chips">
                      {result.removedParams.map((param, idx) => (
                        <span key={idx} className="tool-param-tag">
                          <s>{param}</s>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Notes */}
                {result.notes && result.notes.length > 0 && (
                  <div className="tool-notes">
                    {result.notes.map((n, i) => (
                      <div key={i} className="tool-note-line">
                        <Info size={11} style={{ marginRight: '5px' }} />
                        {n}
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Informative Explanation Section */}
      <section className="section" style={{ marginTop: '36px' }}>
        <div className="section-head">
          <h2>what gets stripped</h2>
          <span className="jp-label">除外パラメータ</span>
          <div className="line" />
        </div>

        <div className="bracket-card" style={{ fontSize: '0.82rem', lineHeight: '1.6', color: 'var(--fg-1)' }}>
          <p style={{ marginBottom: '12px' }}>
            When you share URLs from social media, newsletters, or search results, they frequently embed surveillance tokens that identify your individual profile, track your social graph, and clutter links:
          </p>
          <ul style={{ paddingLeft: '20px', listStyleType: 'square', color: 'var(--fg-2)' }}>
            <li><strong>Marketing &amp; Analytics:</strong> <code>utm_source</code>, <code>utm_medium</code>, <code>utm_campaign</code>, <code>utm_content</code>, <code>utm_term</code></li>
            <li><strong>Meta / Facebook / Instagram:</strong> <code>fbclid</code>, <code>igsh</code>, <code>igshid</code></li>
            <li><strong>Google &amp; Ads:</strong> <code>gclid</code>, <code>gbraid</code>, <code>wbraid</code>, <code>gad_source</code></li>
            <li><strong>Social Media Share Trackers:</strong> Twitter (<code>s</code>, <code>t</code>, <code>twclid</code>), Spotify (<code>si</code>), YouTube (<code>si</code>, <code>feature</code>)</li>
            <li><strong>E-Commerce Bloat:</strong> Amazon &amp; AliExpress affiliate referral strings and redundant query trees</li>
          </ul>
          <p style={{ marginTop: '12px', color: 'var(--fg-3)', fontStyle: 'italic', fontSize: '0.75rem' }}>
            All operations occur strictly client-side within your browser JavaScript context. No URLs or search tokens are logged or transmitted to any server.
          </p>
        </div>
      </section>
    </div>
  );
}
