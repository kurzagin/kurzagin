import { connection, type NextRequest } from 'next/server';
import { cookies as nextCookies } from 'next/headers';
import { desc, eq } from 'drizzle-orm';
import { getDb, galleryItems, type DbGalleryItem } from '@/lib/db';
import { isAuthenticated } from '@/lib/auth';
import { detachMediaByUrl } from '@/lib/mediaRegistry';

export async function GET(request: NextRequest) {
  await connection();
  const db = getDb();
  if (!db) {
    return new Response(JSON.stringify({ items: [], message: 'DATABASE_URL not configured' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const url = new URL(request.url);
    const tag = url.searchParams.get('tag')?.trim().toLowerCase();

    const items = await db
      .select()
      .from(galleryItems)
      .orderBy(desc(galleryItems.created_at))
      .limit(100);

    const filtered = tag
      ? items.filter((item) =>
          Array.isArray(item.tags) && item.tags.some((t) => t.toLowerCase() === tag)
        )
      : items;

    return new Response(JSON.stringify({ items: filtered }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('Error fetching gallery items:', err);
    return new Response(JSON.stringify({ error: 'Failed to fetch gallery items' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export async function POST(request: NextRequest) {
  const cookies = await nextCookies();
  if (!(await isAuthenticated(cookies, request))) {
    return new Response(JSON.stringify({ error: 'Unauthorized: login required to pin gallery items' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const db = getDb();
  if (!db) {
    return new Response(JSON.stringify({ error: 'Database connection is not configured' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await request.json();
    const rawList = Array.isArray(body)
      ? body
      : Array.isArray(body?.items)
      ? body.items
      : [body];

    if (!rawList.length) {
      return new Response(JSON.stringify({ error: 'No gallery item data provided' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const rowsToInsert = [];

    for (const raw of rawList) {
      const url = (raw.url || '').trim();
      if (!url) continue;

      const title = (raw.title || '').trim() || null;
      const caption = (raw.caption || '').trim() || null;
      const altText = (raw.alt_text || '').trim() || title || caption || null;
      const width = raw.width ? parseInt(String(raw.width), 10) : null;
      const height = raw.height ? parseInt(String(raw.height), 10) : null;

      let parsedTags: string[] = [];
      if (Array.isArray(raw.tags)) {
        parsedTags = raw.tags.map((t: string) => String(t).replace(/^#/, '').trim()).filter(Boolean);
      } else if (typeof raw.tags === 'string' && raw.tags.trim()) {
        parsedTags = raw.tags
          .split(/[, ]+/)
          .map((t: string) => t.replace(/^#/, '').trim())
          .filter(Boolean);
      }

      const isNsfw = Boolean(
        raw.is_nsfw === true || raw.is_nsfw === 'true' || raw.is_nsfw === 1 || raw.is_nsfw === '1'
      );

      rowsToInsert.push({
        url,
        title,
        caption,
        alt_text: altText,
        width,
        height,
        tags: parsedTags,
        is_nsfw: isNsfw,
      });
    }

    if (rowsToInsert.length === 0) {
      return new Response(JSON.stringify({ error: 'Image URL is required for all items' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const inserted = await db
      .insert(galleryItems)
      .values(rowsToInsert)
      .returning();

    return new Response(
      JSON.stringify({
        success: true,
        count: inserted.length,
        item: inserted[0],
        items: inserted,
      }),
      {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (err: any) {
    console.error('Error creating gallery item:', err);
    return new Response(JSON.stringify({ error: 'Failed to create gallery item' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export async function DELETE(request: NextRequest) {
  const cookies = await nextCookies();
  if (!(await isAuthenticated(cookies, request))) {
    return new Response(JSON.stringify({ error: 'Unauthorized: login required to delete gallery items' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const db = getDb();
  if (!db) {
    return new Response(JSON.stringify({ error: 'Database connection is not configured' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const url = new URL(request.url);
    let id = url.searchParams.get('id');

    if (!id && request.headers.get('content-type')?.includes('application/json')) {
      const body = await request.json().catch(() => ({}));
      id = body.id;
    }

    if (!id) {
      return new Response(JSON.stringify({ error: 'Item ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const existing = await db.select().from(galleryItems).where(eq(galleryItems.id, id)).limit(1);
    if (existing.length > 0 && existing[0].url) {
      await detachMediaByUrl(existing[0].url);
    }

    await db.delete(galleryItems).where(eq(galleryItems.id, id));

    return new Response(JSON.stringify({ success: true, deletedId: id }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('Error deleting gallery item:', err);
    return new Response(JSON.stringify({ error: 'Failed to delete gallery item' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export async function PATCH(request: NextRequest) {
  const cookies = await nextCookies();
  if (!(await isAuthenticated(cookies, request))) {
    return new Response(JSON.stringify({ error: 'Unauthorized: login required to edit gallery items' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const db = getDb();
  if (!db) {
    return new Response(JSON.stringify({ error: 'Database connection is not configured' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const id = body.id;

    if (!id) {
      return new Response(JSON.stringify({ error: 'Item ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const updates: Partial<{
      is_nsfw: boolean;
      title: string | null;
      caption: string | null;
      alt_text: string | null;
      tags: string[];
    }> = {};

    if (typeof body.is_nsfw === 'boolean') {
      updates.is_nsfw = body.is_nsfw;
    } else if (body.is_nsfw === 'true' || body.is_nsfw === 'false') {
      updates.is_nsfw = body.is_nsfw === 'true';
    }

    if (typeof body.title === 'string') {
      updates.title = body.title.trim() || null;
    }
    if (typeof body.caption === 'string') {
      updates.caption = body.caption.trim() || null;
    }
    if (typeof body.alt_text === 'string') {
      updates.alt_text = body.alt_text.trim() || null;
    }
    if (Array.isArray(body.tags)) {
      updates.tags = body.tags.map((t: string) => String(t).replace(/^#/, '').trim()).filter(Boolean);
    }

    if (Object.keys(updates).length === 0) {
      return new Response(JSON.stringify({ error: 'No valid update fields provided' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const updated = await db
      .update(galleryItems)
      .set(updates)
      .where(eq(galleryItems.id, id))
      .returning();

    if (updated.length === 0) {
      return new Response(JSON.stringify({ error: 'Gallery item not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        item: updated[0],
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (err: any) {
    console.error('Error updating gallery item:', err);
    return new Response(JSON.stringify({ error: 'Failed to update gallery item' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

