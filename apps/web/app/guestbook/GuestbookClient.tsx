'use client';

import { FormEvent, useState } from 'react';
import type { DbGuestbookEntry } from '@/lib/db';
import Image from 'next/image';
import { ChevronDown } from 'lucide-react';

function formatEntryDate(value: string | Date) {
  const date = new Date(value);
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')} · ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

export default function GuestbookClient({
  bannerUrl,
  initialEntries,
}: {
  bannerUrl: string | null;
  initialEntries: DbGuestbookEntry[];
}) {
  const [entries, setEntries] = useState(initialEntries);
  const [name, setName] = useState('');
  const [content, setContent] = useState('');
  const [honeypot, setHoneypot] = useState('');
  const [status, setStatus] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isWebringOpen, setIsWebringOpen] = useState(false);

  async function signGuestbook(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setStatus('');
    try {
      const response = await fetch('/api/guestbook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ authorName: name, content, honeypot }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to sign the guestbook.');
      setEntries((current) => [data.entry, ...current]);
      setName('');
      setContent('');
      setStatus('entry archived — thank you for stopping by.');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Unable to sign the guestbook.');
    } finally {
      setIsSubmitting(false);
    }
  }

  const badgeHtmlCode = `<a href="https://kurzagin.com" target="_blank" rel="noopener noreferrer"><img src="https://kurzagin.com/badges/kurzagin.svg" alt="Kur Zagin" width="88" height="31" /></a>`;

  const copyCode = () => {
    navigator.clipboard.writeText(badgeHtmlCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <main className="guestbook-page">
      <section className="hero guestbook-hero">
        {bannerUrl && (
          <div className="hero-banner-wrap bracket-card">
            <div className="hero-image" style={{ backgroundImage: `url('${bannerUrl}')` }} />
            <div className="hero-grid" />
            <div className="hero-corner tl" />
            <div className="hero-corner tr" />
            <div className="hero-corner bl" />
            <div className="hero-corner br" />
            <span className="hero-coord top">VISITOR LOG // BACK ALLEY NODE</span>
            <span className="hero-coord bottom">KURZAGIN GUESTBOOK</span>
          </div>
        )}
        <div className="hero-content">
          <div className="hero-label">VISITOR LOG</div>
          <h1 className="hero-title">
            <span className="hl">guestbook</span>
            <br />
            leave a trace
            <span className="jp-sub">訪問者名簿</span>
          </h1>
          <p className="hero-desc">
            A quiet page for passing visitors. Leave a note before you disappear back into the night.
          </p>
        </div>
      </section>

      <div className="divider" />

      {/* Guestbook Sign Form */}
      <section className="section guestbook-section">
        <div className="section-head">
          <h2>sign the guestbook</h2>
          <span className="jp-label">記帳</span>
          <div className="line" />
        </div>
        <form className="guestbook-form bracket-card" onSubmit={signGuestbook}>
          <label>
            name / handle
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="guest"
              maxLength={50}
            />
          </label>
          <label>
            message
            <textarea
              value={content}
              onChange={(event) => setContent(event.target.value)}
              placeholder="you found this place..."
              maxLength={1000}
              required
            />
          </label>
          <input
            className="guestbook-trap"
            value={honeypot}
            onChange={(event) => setHoneypot(event.target.value)}
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
          />
          <div className="guestbook-form-footer">
            <span>{status || `${content.length} / 1000`}</span>
            <button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'ARCHIVING...' : 'SIGN THE GUESTBOOK →'}
            </button>
          </div>
        </form>

        {/* Subtle Accordion for Webring Join Guide */}
        <div className="webring-accordion-wrap">
          <button
            type="button"
            className="webring-accordion-trigger"
            onClick={() => setIsWebringOpen((open) => !open)}
            aria-expanded={isWebringOpen}
          >
            <span className="trigger-left">
              <span className="trigger-icon">❖</span>
              <span>Want to join the 88×31 webring federation?</span>
            </span>
            <span className="trigger-right">
              <span className="trigger-toggle-text">{isWebringOpen ? 'Hide guide' : 'Show guide'}</span>
              <ChevronDown
                size={14}
                className={`accordion-chevron ${isWebringOpen ? 'open' : ''}`}
              />
            </span>
          </button>

          {isWebringOpen && (
            <div className="bracket-card webring-join-card webring-accordion-content">
              <div className="webring-join-header">
                <span className="webring-join-tag">FEDERATION PROTOCOL</span>
                <h3 className="webring-join-title">Submit your site to our 88×31 webring</h3>
                <p className="webring-join-intro">
                  Sign the guestbook above with your <strong>site name</strong>, <strong>URL</strong>, and either your <strong>88×31 image badge link</strong> or the <strong>HTML code snippet</strong>.
                </p>
              </div>

              <div className="webring-join-options">
                <div className="webring-join-step">
                  <span className="step-num">OPTION 1</span>
                  <h4>Send Badge Image Link</h4>
                  <p>Host an 88×31 GIF, PNG, or SVG badge and share the link:</p>
                  <code>
                    Site: My Indie Site<br />
                    URL: https://example.com<br />
                    Badge: https://example.com/badge-88x31.png
                  </code>
                </div>

                <div className="webring-join-step">
                  <span className="step-num">OPTION 2</span>
                  <h4>Send HTML Embed Code</h4>
                  <p>Or paste your full button embed snippet into the message box:</p>
                  <code>
                    &lt;a href=&quot;https://example.com&quot;&gt;&lt;img src=&quot;https://example.com/badge.svg&quot; width=&quot;88&quot; height=&quot;31&quot; alt=&quot;My Site&quot; /&gt;&lt;/a&gt;
                  </code>
                </div>
              </div>

              {/* Reciprocal Badge Code */}
              <div className="webring-reciprocal">
                <div className="reciprocal-left">
                  <div className="reciprocal-badge">
                    <Image
                      src="/badges/kurzagin.svg"
                      alt="Kur Zagin 88x31 badge"
                      width={88}
                      height={31}
                      unoptimized
                      style={{ imageRendering: 'pixelated' }}
                    />
                  </div>
                  <div>
                    <span className="reciprocal-label">OUR 88×31 BADGE</span>
                    <p className="reciprocal-desc">Add this button to your site to complete the ring link.</p>
                  </div>
                </div>
                <button type="button" onClick={copyCode} className="copy-badge-btn">
                  {copied ? 'COPIED TO CLIPBOARD ✓' : 'COPY HTML CODE'}
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Archived Entries */}
      <section className="section guestbook-entries">
        <div className="section-head">
          <h2>archived entries</h2>
          <span className="jp-label">記録</span>
          <div className="line" />
          <span className="guestbook-count">{entries.length} entries</span>
        </div>
        <div className="guestbook-list">
          {entries.length === 0 ? (
            <div className="bracket-card guestbook-empty">
              The page is quiet. Be the first visitor to leave a trace.
            </div>
          ) : (
            entries.map((entry, index) => (
              <article className="guestbook-entry bracket-card" key={entry.id}>
                <div className="guestbook-entry-meta">
                  <span>
                    #{String(entries.length - index).padStart(3, '0')} · {entry.author_name}
                  </span>
                  <time>{formatEntryDate(entry.created_at)}</time>
                </div>
                <p>{entry.content}</p>
              </article>
            ))
          )}
        </div>
      </section>
    </main>
  );
}
