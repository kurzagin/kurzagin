'use client';

import { useState } from 'react';
import { Plus, X } from 'lucide-react';

export default function GamesClient({ authenticated }: { authenticated: boolean }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  if (!authenticated) return null;
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError('');
    const data = Object.fromEntries(new FormData(event.currentTarget));
    const res = await fetch('/api/games', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    const result = await res.json();
    if (!res.ok) { setError(result.error || 'Unable to add game'); setBusy(false); return; }
    window.location.href = `/games/${result.slug}`;
  }
  return <>
    <button className="post-btn" type="button" onClick={() => setOpen(!open)}><Plus size={14} /> // ADD GAME</button>
    {open && <div className="bracket-card" style={{ marginTop: 18, padding: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}><strong>// NEW GAME ARCHIVE</strong><button type="button" className="btn-remove-row" onClick={() => setOpen(false)}><X size={14} /></button></div>
      <form onSubmit={submit} style={{ display: 'grid', gap: 10 }}>
        <input className="editor-input" name="title" placeholder="Game title (e.g. Genshin Impact)" required />
        <input className="editor-input" name="slug" placeholder="Slug (optional: genshin-impact)" />
        <input className="editor-input" name="platform" placeholder="Platform (PC, PS5, mobile...)" />
        <input className="editor-input" name="progress" placeholder="Progress label (AR 60, Chapter 3...)" />
        <select className="editor-input" name="status" defaultValue="active"><option value="active">Active</option><option value="paused">Paused</option><option value="completed">Completed</option><option value="archived">Archived</option></select>
        <input className="editor-input" name="cover_url" placeholder="Cover URL (optional)" />
        <textarea className="editor-input" name="summary" placeholder="Why is this game worth documenting?" rows={3} />
        {error && <span style={{ color: 'var(--red-soft)' }}>{error}</span>}
        <button className="post-btn" type="submit" disabled={busy}>{busy ? 'CREATING...' : 'CREATE GAME ARCHIVE →'}</button>
      </form>
    </div>}
  </>;
}
