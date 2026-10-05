import { connection, type NextRequest } from 'next/server';
import { cookies as nextCookies } from 'next/headers';
import { desc, eq } from 'drizzle-orm';
import { getDb, posts, postMedia, getProfile, type PostMedia } from '@/lib/db';
import { isAuthenticated } from '@/lib/auth';
import { processYouTubePost } from '@/lib/youtube';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await connection();
  const { id } = await params;
  const db = getDb();
  if (!db) {
    return new Response(JSON.stringify({ error: 'Database connection not configured' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const postResults = await db.select().from(posts).where(eq(posts.id, id)).limit(1);
    if (postResults.length === 0) {
      return new Response(JSON.stringify({ error: 'Post not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const post = postResults[0];
    const media = await db
      .select()
      .from(postMedia)
      .where(eq(postMedia.post_id, id))
      .orderBy(desc(postMedia.created_at));

    const profile = await getProfile();

    return new Response(
      JSON.stringify({
        post: {
          ...post,
          author_avatar: profile.avatar_url,
          media,
        },
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (err) {
    console.error('Error fetching post by ID:', err);
    return new Response(JSON.stringify({ error: 'Failed to fetch post' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const cookies = await nextCookies();
  if (!(await isAuthenticated(cookies, request))) {
    return new Response(JSON.stringify({ error: 'Unauthorized: operator login required to edit posts' }), {
      status: 401,
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

  try {
    const body = await request.json();

    const existingPosts = await db
      .select()
      .from(posts)
      .where(eq(posts.id, id))
      .limit(1);

    if (existingPosts.length === 0) {
      return new Response(JSON.stringify({ error: 'Post not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const currentPost = existingPosts[0];
    const content = body.content !== undefined ? (body.content || '').trim() : currentPost.content;

    if (content.length > 5000) {
      return new Response(JSON.stringify({ error: 'Post exceeds maximum allowed length (5000 characters)' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    let savedMedia: PostMedia[] = [];
    if (body.media !== undefined) {
      const mediaItems: any[] = Array.isArray(body.media)
        ? body.media
        : body.media
        ? [body.media]
        : [];

      await db.delete(postMedia).where(eq(postMedia.post_id, id));

      if (mediaItems.length > 0) {
        const mediaRecords = mediaItems.map((m) => ({
          post_id: id,
          category: 'media',
          media_type: m.media_type || 'image',
          url: m.url,
          alt_text: m.alt_text || null,
          width: m.width ? parseInt(String(m.width), 10) : null,
          height: m.height ? parseInt(String(m.height), 10) : null,
        }));

        savedMedia = await db.insert(postMedia).values(mediaRecords).returning();
      }
    } else {
      savedMedia = await db
        .select()
        .from(postMedia)
        .where(eq(postMedia.post_id, id))
        .orderBy(desc(postMedia.created_at));
    }

    if (!content && savedMedia.length === 0) {
      return new Response(JSON.stringify({ error: 'Post must contain text or attached media' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { videos } = processYouTubePost(content);
    const hasMedia = savedMedia.length > 0 || videos.length > 0;
    const category = body.category !== undefined
      ? body.category
      : currentPost.category === 'anime'
      ? 'anime'
      : hasMedia
      ? 'media'
      : 'text';

    const animeMeta = body.anime_meta !== undefined ? body.anime_meta : currentPost.anime_meta;

    const updated = await db
      .update(posts)
      .set({
        content,
        category,
        anime_meta: animeMeta,
        has_media: hasMedia,
      })
      .where(eq(posts.id, id))
      .returning();

    return new Response(
      JSON.stringify({
        success: true,
        post: {
          ...updated[0],
          media: savedMedia,
        },
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (err) {
    console.error('Error updating post:', err);
    return new Response(JSON.stringify({ error: 'Failed to update post' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const cookies = await nextCookies();
  if (!(await isAuthenticated(cookies, request))) {
    return new Response(JSON.stringify({ error: 'Unauthorized: operator login required to delete posts' }), {
      status: 401,
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

  try {
    await db.delete(posts).where(eq(posts.id, id));

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Post deleted successfully',
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (err) {
    console.error('Error deleting post:', err);
    return new Response(JSON.stringify({ error: 'Failed to delete post' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
