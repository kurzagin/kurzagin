'use client';

import { useState } from 'react';
import type { WikiVisualReference } from '@/lib/db';

export default function WikiVisualReferencePanel({ novel, category, slug, initialItems }: { novel: string; category: string; slug: string; initialItems: WikiVisualReference[] }) {
  const [items, setItems] = useState(initialItems);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  async function upload(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage('');
    const form = new FormData(event.currentTarget); form.append('novel', novel); form.append('category', category); form.append('slug', slug);
    const response = await fetch('/api/wiki/visual-references', { method: 'POST', body: form });
    const result = await response.json();
    if (response.ok) { setItems([...items, result.item]); event.currentTarget.reset(); setMessage('Reference attached.'); }
    else setMessage(result.error || 'Upload failed.');
    setBusy(false);
  }
  async function remove(id: string) {
    if (!confirm('Delete this visual reference?')) return;
    const response = await fetch(`/api/wiki/visual-references?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
    if (response.ok) setItems(items.filter((item) => item.id !== id));
  }
  return <div className="bracket-card" style={{ padding: '16px', marginBottom: '24px', background: 'var(--bg-1)', border: '1px dashed var(--accent)' }}>
    <div style={{ fontFamily: 'var(--mono)', fontSize: '0.72rem', color: 'var(--accent)', marginBottom: '12px' }}>OPERATOR // VISUAL REFERENCE CONTROL</div>
    {items.map((item) => <div key={item.id} style={{ display: 'grid', gridTemplateColumns: '96px 1fr auto', gap: '12px', alignItems: 'center', marginBottom: '12px' }}>
      <img src={item.url} alt={item.alt_text || 'Wiki visual reference'} style={{ width: '96px', height: '72px', objectFit: 'cover', borderRadius: '3px' }} />
      <div style={{ fontSize: '0.78rem', color: 'var(--text-2)' }}>{item.caption || 'No caption'}<div style={{ color: 'var(--text-3)', fontFamily: 'var(--mono)', fontSize: '0.65rem' }}>{item.source || 'No source recorded'}</div></div>
      <button type="button" onClick={() => remove(item.id)} style={{ cursor: 'pointer' }}>DELETE</button>
    </div>)}
    <form onSubmit={upload} style={{ display: 'grid', gap: '8px' }}>
      <input name="image" type="file" accept="image/*" required />
      <input name="alt_text" placeholder="Alt text" />
      <input name="caption" placeholder="Caption / design note" />
      <input name="source" placeholder="Source or generation note" />
      <button type="submit" disabled={busy} style={{ cursor: busy ? 'wait' : 'pointer' }}>{busy ? 'UPLOADING…' : 'UPLOAD REFERENCE'}</button>
    </form>
    {message && <div style={{ marginTop: '8px', fontSize: '0.72rem', color: 'var(--text-3)' }}>{message}</div>}
  </div>;
}
