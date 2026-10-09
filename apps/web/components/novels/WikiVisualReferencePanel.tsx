'use client';

import { useState } from 'react';
import type { WikiVisualReference } from '@/lib/db';

export default function WikiVisualReferencePanel({ novel, category, slug, initialItems }: { novel: string; category: string; slug: string; initialItems: WikiVisualReference[] }) {
  const [items, setItems] = useState(initialItems);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  async function prepareFile(file: File): Promise<File> {
    if (file.size <= 4 * 1024 * 1024) return file;
    return new Promise((resolve) => {
      const image = new Image();
      const objectUrl = URL.createObjectURL(file);
      image.onload = () => {
        URL.revokeObjectURL(objectUrl);
        const maxDim = 2560;
        let width = image.naturalWidth || image.width;
        let height = image.naturalHeight || image.height;
        if (width > maxDim || height > maxDim) {
          if (width > height) { height = Math.round(height * maxDim / width); width = maxDim; }
          else { width = Math.round(width * maxDim / height); height = maxDim; }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width; canvas.height = height;
        const context = canvas.getContext('2d');
        if (!context) { resolve(file); return; }
        context.drawImage(image, 0, 0, width, height);
        canvas.toBlob((blob) => resolve(blob && blob.size < file.size
          ? new File([blob], file.name.replace(/\.[^/.]+$/, '') + '.jpg', { type: 'image/jpeg' })
          : file), 'image/jpeg', 0.88);
      };
      image.onerror = () => { URL.revokeObjectURL(objectUrl); resolve(file); };
      image.src = objectUrl;
    });
  }
  async function upload(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage('');
    const form = new FormData(event.currentTarget);
    const files = form.getAll('image').filter((value): value is File => value instanceof File);
    const attached: WikiVisualReference[] = [];
    const failed: string[] = [];
    for (let index = 0; index < files.length; index += 1) {
      try {
        const payload = new FormData();
        payload.append('image', await prepareFile(files[index]), files[index].name);
        payload.append('novel', novel); payload.append('category', category); payload.append('slug', slug);
        for (const name of ['alt_text', 'caption', 'source']) payload.append(name, String(form.get(name) || ''));
        setMessage(`Uploading reference ${index + 1} of ${files.length}…`);
        const response = await fetch('/api/wiki/visual-references', { method: 'POST', body: payload });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Upload failed.');
        attached.push(...(result.items || []));
        if (index < files.length - 1) await new Promise((resolve) => setTimeout(resolve, 350));
      } catch (error) {
        failed.push(`${files[index].name}: ${error instanceof Error ? error.message : 'Upload failed.'}`);
      }
    }
    if (attached.length) setItems((current) => [...current, ...attached]);
    if (!failed.length) { event.currentTarget.reset(); setMessage(`${attached.length} references attached.`); }
    else setMessage(`${attached.length} attached; ${failed.length} failed. ${failed.join(' ')}`);
    setBusy(false);
  }
  async function remove(id: string) {
    if (!confirm('Delete this visual reference?')) return;
    const response = await fetch(`/api/wiki/visual-references?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
    if (response.ok) setItems(items.filter((item) => item.id !== id));
  }
  return <div className="bracket-card reveal" style={{ padding: '20px', marginBottom: '24px', background: 'var(--bg-1)', border: '1px solid var(--border-subtle)' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', flexWrap: 'wrap', marginBottom: '16px' }}>
      <div>
        <div style={{ fontFamily: 'var(--mono)', fontSize: '0.72rem', color: 'var(--accent)', letterSpacing: '0.04em' }}>// OPERATOR VISUAL REFERENCE CONTROL</div>
        <div style={{ color: 'var(--text-3)', fontSize: '0.76rem', marginTop: '5px', lineHeight: 1.5 }}>Unofficial concept material. Not canonical or final artwork.</div>
      </div>
      <span style={{ fontFamily: 'var(--mono)', fontSize: '0.62rem', color: 'var(--text-3)', padding: '3px 7px', border: '1px solid var(--border-subtle)', borderRadius: '3px' }}>OPERATOR ONLY</span>
    </div>
    {items.map((item) => <div key={item.id} style={{ display: 'grid', gridTemplateColumns: '96px minmax(0, 1fr) auto', gap: '12px', alignItems: 'center', padding: '10px 0', borderTop: '1px solid var(--border-subtle)' }}>
      <img src={item.url} alt={item.alt_text || 'Wiki visual reference'} style={{ width: '96px', height: '72px', objectFit: 'cover', borderRadius: '3px', border: '1px solid var(--border-subtle)', background: 'var(--bg-2)' }} />
      <div style={{ minWidth: 0, fontSize: '0.78rem', color: 'var(--text-2)', lineHeight: 1.5 }}><div>{item.caption || 'No caption recorded.'}</div><div style={{ color: 'var(--text-3)', fontFamily: 'var(--mono)', fontSize: '0.64rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.source || 'No source recorded'}</div></div>
      <button type="button" className="feed-filter-btn" onClick={() => remove(item.id)} style={{ cursor: 'pointer', color: '#ff6b81' }}>DELETE</button>
    </div>)}
    <form onSubmit={upload} style={{ display: 'grid', gap: '10px', marginTop: items.length ? '12px' : 0, paddingTop: items.length ? '16px' : 0, borderTop: items.length ? '1px solid var(--border-subtle)' : undefined }}>
      <label style={{ fontFamily: 'var(--mono)', fontSize: '0.64rem', color: 'var(--text-3)' }}>// ATTACH REFERENCE IMAGES<input name="image" type="file" accept="image/*" multiple required style={{ display: 'block', width: '100%', marginTop: '6px', color: 'var(--text-2)', fontFamily: 'var(--mono)', fontSize: '0.7rem' }} /></label>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '8px' }}>
        <input name="alt_text" placeholder="ALT TEXT" aria-label="Alt text" style={{ background: 'var(--bg-2)', border: '1px solid var(--border-subtle)', color: 'var(--text-1)', padding: '8px 10px', fontFamily: 'var(--mono)', fontSize: '0.68rem', borderRadius: '3px' }} />
        <input name="caption" placeholder="CAPTION / DESIGN NOTE" aria-label="Caption or design note" style={{ background: 'var(--bg-2)', border: '1px solid var(--border-subtle)', color: 'var(--text-1)', padding: '8px 10px', fontFamily: 'var(--mono)', fontSize: '0.68rem', borderRadius: '3px' }} />
      </div>
      <input name="source" placeholder="SOURCE OR GENERATION NOTE" aria-label="Source or generation note" style={{ background: 'var(--bg-2)', border: '1px solid var(--border-subtle)', color: 'var(--text-1)', padding: '8px 10px', fontFamily: 'var(--mono)', fontSize: '0.68rem', borderRadius: '3px' }} />
      <button type="submit" className="post-btn" disabled={busy} style={{ cursor: busy ? 'wait' : 'pointer', justifySelf: 'start' }}>{busy ? 'TRANSMITTING…' : 'PIN VISUAL REFERENCE →'}</button>
    </form>
    {message && <div style={{ marginTop: '8px', fontSize: '0.72rem', color: 'var(--text-3)' }}>{message}</div>}
  </div>;
}
