import { connection, type NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { getDb, games } from '@/lib/db';
import { isAuthenticated } from '@/lib/auth';

export async function POST(request: NextRequest) {
  await connection();
  const cookieStore = await cookies();
  if (!(await isAuthenticated(cookieStore, request))) return Response.json({ error: 'Login required' }, { status: 401 });
  const db = getDb();
  if (!db) return Response.json({ error: 'Database is not configured' }, { status: 503 });
  try {
    const body = await request.json();
    const title = String(body.title || '').trim();
    const slug = String(body.slug || title).trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    if (!title || !slug) return Response.json({ error: 'Title is required' }, { status: 400 });
    const inserted = await db.insert(games).values({
      title,
      slug,
      summary: String(body.summary || '').trim() || null,
      cover_url: String(body.cover_url || '').trim() || null,
      meta: { status: body.status || 'active', platform: String(body.platform || '').trim() || undefined, progress: String(body.progress || '').trim() || undefined },
    }).returning({ slug: games.slug });
    return Response.json({ success: true, slug: inserted[0].slug }, { status: 201 });
  } catch (error: any) {
    if (error?.code === '23505') return Response.json({ error: 'A game with this slug already exists' }, { status: 409 });
    return Response.json({ error: 'Failed to create game' }, { status: 500 });
  }
}
