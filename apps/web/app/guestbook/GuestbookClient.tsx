'use client';

import { FormEvent, useState } from 'react';
import type { DbGuestbookEntry } from '@/lib/db';

function formatEntryDate(value: string | Date) { const date = new Date(value); return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')} · ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`; }

export default function GuestbookClient({ bannerUrl, initialEntries }: { bannerUrl: string | null; initialEntries: DbGuestbookEntry[] }) {
  const [entries, setEntries] = useState(initialEntries); const [name, setName] = useState(''); const [content, setContent] = useState(''); const [honeypot, setHoneypot] = useState(''); const [status, setStatus] = useState(''); const [isSubmitting, setIsSubmitting] = useState(false);
  async function signGuestbook(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setIsSubmitting(true); setStatus('');
    try { const response = await fetch('/api/guestbook', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ authorName: name, content, honeypot }) }); const data = await response.json(); if (!response.ok) throw new Error(data.error || 'Unable to sign the guestbook.'); setEntries((current) => [data.entry, ...current]); setName(''); setContent(''); setStatus('entry archived — thank you for stopping by.'); }
    catch (error) { setStatus(error instanceof Error ? error.message : 'Unable to sign the guestbook.'); } finally { setIsSubmitting(false); }
  }
  return <main className="guestbook-page">
    <section className="hero guestbook-hero">
      {bannerUrl && <div className="hero-banner-wrap bracket-card"><div className="hero-image" style={{ backgroundImage: `url('${bannerUrl}')` }} /><div className="hero-grid" /><div className="hero-corner tl" /><div className="hero-corner tr" /><div className="hero-corner bl" /><div className="hero-corner br" /><span className="hero-coord top">VISITOR LOG // BACK ALLEY NODE</span><span className="hero-coord bottom">KURZAGIN GUESTBOOK</span></div>}
      <div className="hero-content"><div className="hero-label">VISITOR LOG</div><h1 className="hero-title"><span className="hl">guestbook</span><br />leave a trace<span className="jp-sub">訪問者名簿</span></h1><p className="hero-desc">A quiet page for passing visitors. Leave a note before you disappear back into the night.</p></div>
    </section><div className="divider" />
    <section className="section guestbook-section"><div className="section-head"><h2>sign the guestbook</h2><span className="jp-label">記帳</span><div className="line" /></div>
      <form className="guestbook-form bracket-card" onSubmit={signGuestbook}><label>name / handle<input value={name} onChange={(event) => setName(event.target.value)} placeholder="guest" maxLength={50} /></label><label>message<textarea value={content} onChange={(event) => setContent(event.target.value)} placeholder="you found this place..." maxLength={1000} required /></label><input className="guestbook-trap" value={honeypot} onChange={(event) => setHoneypot(event.target.value)} tabIndex={-1} autoComplete="off" aria-hidden="true" /><div className="guestbook-form-footer"><span>{status || `${content.length} / 1000`}</span><button type="submit" disabled={isSubmitting}>{isSubmitting ? 'ARCHIVING...' : 'SIGN THE GUESTBOOK →'}</button></div></form>
    </section>
    <section className="section guestbook-entries"><div className="section-head"><h2>archived entries</h2><span className="jp-label">記録</span><div className="line" /><span className="guestbook-count">{entries.length} entries</span></div><div className="guestbook-list">{entries.length === 0 ? <div className="bracket-card guestbook-empty">The page is quiet. Be the first visitor to leave a trace.</div> : entries.map((entry, index) => <article className="guestbook-entry bracket-card" key={entry.id}><div className="guestbook-entry-meta"><span>#{String(entries.length - index).padStart(3, '0')} · {entry.author_name}</span><time>{formatEntryDate(entry.created_at)}</time></div><p>{entry.content}</p></article>)}</div></section>
  </main>;
}
