import type { NextRequest } from 'next/server';
import { desc } from 'drizzle-orm';
import { getDb, guestbookEntries } from '@/lib/db';
import { getServerSession } from '@/lib/serverSession';

export async function GET() {
  const db = getDb();
  if (!db) return Response.json({ entries: [] });
  try {
    const entries = await db.select().from(guestbookEntries).orderBy(desc(guestbookEntries.created_at)).limit(100);
    return Response.json({ entries });
  } catch (error) { console.error('Error reading guestbook:', error); return Response.json({ error: 'Failed to read guestbook' }, { status: 500 }); }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (body.honeypot) return Response.json({ success: true });
    const content = String(body.content || '').trim();
    let authorName = String(body.authorName || '').trim() || 'guest';
    const session = await getServerSession();
    if (session) authorName = session.username;
    if (!content) return Response.json({ error: 'Please leave a message.' }, { status: 400 });
    if (content.length > 1000) return Response.json({ error: 'Your message is too long.' }, { status: 400 });
    const db = getDb();
    if (!db) return Response.json({ error: 'Guestbook is not available right now.' }, { status: 503 });
    const [entry] = await db.insert(guestbookEntries).values({ author_name: authorName.slice(0, 50), content }).returning();
    return Response.json({ success: true, entry }, { status: 201 });
  } catch (error) { console.error('Error signing guestbook:', error); return Response.json({ error: 'Failed to sign the guestbook.' }, { status: 500 }); }
}
