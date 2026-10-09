import { and, asc, eq } from 'drizzle-orm';
import { cookies } from 'next/headers';
import { type NextRequest } from 'next/server';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { getDb, wikiVisualReferences } from '@/lib/db';
import { isAuthenticated } from '@/lib/auth';
import { isR2Configured, uploadBufferToR2 } from '@/lib/r2';
import { processPostImageToAvif } from '@/lib/image';
import { deleteR2Object } from '@/lib/r2';

export async function GET(request: NextRequest) {
  const db = getDb();
  const session = await isAuthenticated(await cookies(), request);
  if (!session || !db) return Response.json({ items: [] });
  const params = new URL(request.url).searchParams;
  const items = await db.select().from(wikiVisualReferences)
    .where(and(eq(wikiVisualReferences.novel_slug, params.get('novel') || ''), eq(wikiVisualReferences.category, params.get('category') || ''), eq(wikiVisualReferences.entry_slug, params.get('slug') || '')))
    .orderBy(asc(wikiVisualReferences.created_at));
  return Response.json({ items });
}

export async function POST(request: NextRequest) {
  const db = getDb();
  if (!(await isAuthenticated(await cookies(), request))) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  if (!db) return Response.json({ error: 'Database unavailable' }, { status: 503 });
  try {
    const form = await request.formData();
    const files = form.getAll('image').filter((value): value is File => value instanceof File);
    const novel = String(form.get('novel') || '').trim();
    const category = String(form.get('category') || '').trim();
    const slug = String(form.get('slug') || '').trim();
    if (!files.length || files.some((file) => !file.type.startsWith('image/'))) return Response.json({ error: 'At least one valid image is required' }, { status: 400 });
    if (!novel || !category || !slug) return Response.json({ error: 'Wiki entry is required' }, { status: 400 });
    const rows = [];
    for (const file of files) {
      const processed = await processPostImageToAvif(Buffer.from(await file.arrayBuffer()), { maxWidth: 2400, maxHeight: 2400, quality: 85 });
      const id = crypto.randomUUID();
      const key = `wiki-references/${id}.avif`;
      let url: string | null = null;
      if (isR2Configured()) url = await uploadBufferToR2(key, processed.buffer, 'image/avif');
      else {
        const dir = path.resolve(process.cwd(), 'public/uploads/wiki-references');
        fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(path.join(dir, `${id}.avif`), processed.buffer);
        url = `/uploads/wiki-references/${id}.avif`;
      }
      if (!url) return Response.json({ error: 'Image storage failed' }, { status: 500 });
      rows.push({ novel_slug: novel, category, entry_slug: slug, url, storage_key: key, alt_text: String(form.get('alt_text') || '').trim() || null, caption: String(form.get('caption') || '').trim() || null, source: String(form.get('source') || '').trim() || null });
    }
    const items = await db.insert(wikiVisualReferences).values(rows).returning();
    return Response.json({ items }, { status: 201 });
  } catch (error) {
    console.error('Wiki reference upload failed:', error);
    return Response.json({ error: 'Upload failed' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const db = getDb();
  if (!(await isAuthenticated(await cookies(), request))) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  if (!db) return Response.json({ error: 'Database unavailable' }, { status: 503 });
  const id = new URL(request.url).searchParams.get('id');
  if (!id) return Response.json({ error: 'Reference id is required' }, { status: 400 });
  const [item] = await db.select().from(wikiVisualReferences).where(eq(wikiVisualReferences.id, id)).limit(1);
  if (!item) return Response.json({ error: 'Reference not found' }, { status: 404 });
  if (isR2Configured()) await deleteR2Object(item.storage_key);
  else { const local = path.resolve(process.cwd(), 'public', item.url.replace(/^\/+/, '')); if (fs.existsSync(local)) fs.unlinkSync(local); }
  await db.delete(wikiVisualReferences).where(eq(wikiVisualReferences.id, id));
  return Response.json({ success: true });
}
