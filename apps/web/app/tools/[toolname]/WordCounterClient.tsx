'use client';

import { useState } from 'react';
import type { ToolDefinition } from '@/lib/tools';
import { AlignLeft, Copy, Check, Trash2, ShieldCheck } from 'lucide-react';

export default function WordCounterClient({ tool }: { tool: ToolDefinition }) {
  const [text, setText] = useState('');
  const [copied, setCopied] = useState(false);

  // Metrics
  const charCount = text.length;
  const charNoSpaces = text.replace(/\s+/g, '').length;
  const wordsArray = text.trim() ? text.trim().split(/\s+/) : [];
  const wordCount = wordsArray.length;
  const linesCount = text ? text.split(/\r\n|\r|\n/).length : 0;
  const sentenceCount = text.trim() ? (text.match(/[^.!?]+[.!?]+(\s|$)/g) || []).length || (text.trim() ? 1 : 0) : 0;
  const paragraphCount = text.trim() ? text.split(/\n+/).filter((p) => p.trim().length > 0).length : 0;

  // Reading / speaking time
  const readingTimeMin = Math.ceil(wordCount / 200);
  const speakingTimeMin = Math.ceil(wordCount / 130);

  // Social limits
  const twitterLimit = 280;
  const instaLimit = 2200;
  const discordLimit = 2000;
  const redditTitleLimit = 300;

  const handleCopy = () => {
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
            realtime memory only
          </span>
        </div>
        <h1><span className="hl">word</span> &amp; character counter</h1>
        <div className="page-sub">
          <span className="jp-label">文字数</span> — {tool.description}
        </div>
      </div>

      {/* Stats Summary Cards */}
      <div className="stats-row-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px', marginBottom: '16px' }}>
        <div className="bracket-card" style={{ padding: '14px', textAlign: 'center' }}>
          <div style={{ font: '1.6rem var(--mono)', fontWeight: 700, color: 'var(--accent)' }}>{wordCount}</div>
          <div style={{ font: '0.66rem var(--mono)', color: 'var(--fg-2)', textTransform: 'uppercase' }}>words</div>
        </div>
        <div className="bracket-card" style={{ padding: '14px', textAlign: 'center' }}>
          <div style={{ font: '1.6rem var(--mono)', fontWeight: 700, color: 'var(--fg-0)' }}>{charCount}</div>
          <div style={{ font: '0.66rem var(--mono)', color: 'var(--fg-2)', textTransform: 'uppercase' }}>characters</div>
        </div>
        <div className="bracket-card" style={{ padding: '14px', textAlign: 'center' }}>
          <div style={{ font: '1.6rem var(--mono)', fontWeight: 700, color: 'var(--fg-0)' }}>{charNoSpaces}</div>
          <div style={{ font: '0.66rem var(--mono)', color: 'var(--fg-2)', textTransform: 'uppercase' }}>no spaces</div>
        </div>
        <div className="bracket-card" style={{ padding: '14px', textAlign: 'center' }}>
          <div style={{ font: '1.6rem var(--mono)', fontWeight: 700, color: 'var(--fg-0)' }}>{sentenceCount}</div>
          <div style={{ font: '0.66rem var(--mono)', color: 'var(--fg-2)', textTransform: 'uppercase' }}>sentences</div>
        </div>
        <div className="bracket-card" style={{ padding: '14px', textAlign: 'center' }}>
          <div style={{ font: '1.6rem var(--mono)', fontWeight: 700, color: 'var(--fg-0)' }}>{paragraphCount}</div>
          <div style={{ font: '0.66rem var(--mono)', color: 'var(--fg-2)', textTransform: 'uppercase' }}>paragraphs</div>
        </div>
        <div className="bracket-card" style={{ padding: '14px', textAlign: 'center' }}>
          <div style={{ font: '1.6rem var(--mono)', fontWeight: 700, color: 'var(--accent)' }}>~{readingTimeMin}m</div>
          <div style={{ font: '0.66rem var(--mono)', color: 'var(--fg-2)', textTransform: 'uppercase' }}>reading time</div>
        </div>
      </div>

      {/* Main Textarea */}
      <div className="bracket-card tool-box">
        <div className="tool-label-row">
          <label htmlFor="word-input" className="tool-input-label">
            <AlignLeft size={13} style={{ marginRight: '6px' }} />
            draft content
          </label>
          <div className="tool-input-actions">
            {text && (
              <>
                <button type="button" className="tool-text-btn" onClick={handleCopy}>
                  {copied ? <Check size={11} style={{ marginRight: '3px' }} /> : <Copy size={11} style={{ marginRight: '3px' }} />}
                  {copied ? 'copied' : 'copy'}
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
          id="word-input"
          className="tool-text-input"
          style={{ height: '220px', resize: 'vertical', lineHeight: '1.6' }}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Paste or start typing your text here..."
        />

        {/* Social Limits Progress */}
        <div style={{ marginTop: '20px', borderTop: '1px dashed var(--border)', paddingTop: '16px' }}>
          <div className="tool-breakdown-title" style={{ marginBottom: '10px' }}>Platform Limits:</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
            {/* Twitter */}
            <div style={{ background: 'var(--bg-0)', padding: '10px 12px', border: '1px solid var(--border)', borderRadius: '2px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', font: '0.7rem var(--mono)', marginBottom: '4px' }}>
                <span>Twitter / X</span>
                <span style={{ color: charCount > twitterLimit ? '#ef4444' : 'var(--accent)' }}>
                  {charCount} / {twitterLimit}
                </span>
              </div>
              <div style={{ width: '100%', height: '4px', background: 'var(--bg-2)', borderRadius: '2px', overflow: 'hidden' }}>
                <div style={{ width: `${Math.min(100, (charCount / twitterLimit) * 100)}%`, height: '100%', background: charCount > twitterLimit ? '#ef4444' : 'var(--accent)' }} />
              </div>
            </div>

            {/* Discord */}
            <div style={{ background: 'var(--bg-0)', padding: '10px 12px', border: '1px solid var(--border)', borderRadius: '2px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', font: '0.7rem var(--mono)', marginBottom: '4px' }}>
                <span>Discord Msg</span>
                <span style={{ color: charCount > discordLimit ? '#ef4444' : 'var(--accent)' }}>
                  {charCount} / {discordLimit}
                </span>
              </div>
              <div style={{ width: '100%', height: '4px', background: 'var(--bg-2)', borderRadius: '2px', overflow: 'hidden' }}>
                <div style={{ width: `${Math.min(100, (charCount / discordLimit) * 100)}%`, height: '100%', background: charCount > discordLimit ? '#ef4444' : 'var(--accent)' }} />
              </div>
            </div>

            {/* Instagram */}
            <div style={{ background: 'var(--bg-0)', padding: '10px 12px', border: '1px solid var(--border)', borderRadius: '2px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', font: '0.7rem var(--mono)', marginBottom: '4px' }}>
                <span>Instagram Caption</span>
                <span style={{ color: charCount > instaLimit ? '#ef4444' : 'var(--accent)' }}>
                  {charCount} / {instaLimit}
                </span>
              </div>
              <div style={{ width: '100%', height: '4px', background: 'var(--bg-2)', borderRadius: '2px', overflow: 'hidden' }}>
                <div style={{ width: `${Math.min(100, (charCount / instaLimit) * 100)}%`, height: '100%', background: charCount > instaLimit ? '#ef4444' : 'var(--accent)' }} />
              </div>
            </div>

            {/* Reddit */}
            <div style={{ background: 'var(--bg-0)', padding: '10px 12px', border: '1px solid var(--border)', borderRadius: '2px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', font: '0.7rem var(--mono)', marginBottom: '4px' }}>
                <span>Reddit Post Title</span>
                <span style={{ color: charCount > redditTitleLimit ? '#ef4444' : 'var(--accent)' }}>
                  {charCount} / {redditTitleLimit}
                </span>
              </div>
              <div style={{ width: '100%', height: '4px', background: 'var(--bg-2)', borderRadius: '2px', overflow: 'hidden' }}>
                <div style={{ width: `${Math.min(100, (charCount / redditTitleLimit) * 100)}%`, height: '100%', background: charCount > redditTitleLimit ? '#ef4444' : 'var(--accent)' }} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
