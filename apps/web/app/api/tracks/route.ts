import { connection, type NextRequest } from 'next/server';
import { cookies as nextCookies } from 'next/headers';
import { desc, eq, and, ne } from 'drizzle-orm';
import { getDb, tracks } from '@/lib/db';
import { isAuthenticated } from '@/lib/auth';
import { purgeMediaByUrl } from '@/lib/mediaRegistry';

export async function GET() {
  await connection();
  const db = getDb();
  if (!db) {
    return new Response(JSON.stringify({ tracks: [], message: 'DATABASE_URL not configured' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const allTracks = await db
      .select()
      .from(tracks)
      .orderBy(desc(tracks.created_at))
      .limit(100);

    return new Response(JSON.stringify({ tracks: allTracks }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('Error fetching tracks:', err);
    return new Response(JSON.stringify({ error: 'Failed to fetch tracks' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export async function POST(request: NextRequest) {
  const cookies = await nextCookies();
  if (!(await isAuthenticated(cookies, request))) {
    return new Response(JSON.stringify({ error: 'Unauthorized: login required to add tracks' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await request.json();
    const title = (body.title || '').trim();
    const artist = (body.artist || '').trim();
    const album = (body.album || '').trim() || null;
    const audioUrl = (body.audio_url || '').trim();
    const coverUrl = (body.cover_url || '').trim() || null;
    const duration = (body.duration || '0:00').trim();
    const durationSec = Number(body.duration_sec) || 0;

    if (!title) {
      return new Response(JSON.stringify({ error: 'Track title is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!artist) {
      return new Response(JSON.stringify({ error: 'Artist name is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!audioUrl) {
      return new Response(JSON.stringify({ error: 'Audio stream URL is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const db = getDb();
    if (!db) {
      return new Response(JSON.stringify({ error: 'Database connection is not configured on server' }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const inserted = await db
      .insert(tracks)
      .values({
        title,
        artist,
        album,
        audio_url: audioUrl,
        cover_url: coverUrl,
        duration,
        duration_sec: durationSec,
      })
      .returning();

    return new Response(JSON.stringify({ success: true, track: inserted[0] }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('Error adding track:', err);
    return new Response(JSON.stringify({ error: 'Failed to add track: ' + err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export async function DELETE(request: NextRequest) {
  const cookies = await nextCookies();
  if (!(await isAuthenticated(cookies, request))) {
    return new Response(JSON.stringify({ error: 'Unauthorized: login required to delete tracks' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const url = new URL(request.url);
  const id = url.searchParams.get('id');

  if (!id) {
    return new Response(JSON.stringify({ error: 'Track ID is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const db = getDb();
  if (!db) {
    return new Response(JSON.stringify({ error: 'Database is not configured' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const existing = await db.select().from(tracks).where(eq(tracks.id, id)).limit(1);
    if (existing.length > 0) {
      const track = existing[0];

      // Check if any other track shares this audio file before permanently purging
      if (track.audio_url) {
        const otherAudio = await db
          .select({ id: tracks.id })
          .from(tracks)
          .where(and(eq(tracks.audio_url, track.audio_url), ne(tracks.id, id)))
          .limit(1);
        if (otherAudio.length === 0) {
          await purgeMediaByUrl(track.audio_url);
        }
      }

      // Check if any other track shares this cover image before permanently purging
      if (track.cover_url) {
        const otherCover = await db
          .select({ id: tracks.id })
          .from(tracks)
          .where(and(eq(tracks.cover_url, track.cover_url), ne(tracks.id, id)))
          .limit(1);
        if (otherCover.length === 0) {
          await purgeMediaByUrl(track.cover_url);
        }
      }
    }

    await db.delete(tracks).where(eq(tracks.id, id));
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('Error deleting track:', err);
    return new Response(JSON.stringify({ error: 'Failed to delete track' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
