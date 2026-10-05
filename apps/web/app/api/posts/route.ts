import { connection, type NextRequest } from 'next/server';
import { cookies as nextCookies } from 'next/headers';
import { desc, eq, inArray } from 'drizzle-orm';
import { getDb, posts, postMedia, getProfile, type PostMedia } from '@/lib/db';
import { isAuthenticated, getSession } from '@/lib/auth';
import { processYouTubePost } from '@/lib/youtube';

export async function GET(request: NextRequest) {
  await connection();
  const db = getDb();
  if (!db) {
    return new Response(JSON.stringify({ posts: [], message: 'DATABASE_URL not configured' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const url = new URL(request.url);
    const filter = url.searchParams.get('filter');
    const category = url.searchParams.get('category');
    const isMediaFilter = filter === 'media' || category === 'media';
    const isAnimeFilter = filter === 'anime' || category === 'anime';

    const query = db.select().from(posts);
    let allPosts;
    if (isMediaFilter) {
      allPosts = await query.where(eq(posts.has_media, true)).orderBy(desc(posts.created_at)).limit(50);
    } else if (isAnimeFilter) {
      allPosts = await query.where(eq(posts.category, 'anime')).orderBy(desc(posts.created_at)).limit(50);
    } else {
      allPosts = await query.orderBy(desc(posts.created_at)).limit(50);
    }

    let mediaByPost: Record<string, PostMedia[]> = {};
    if (allPosts.length > 0) {
      const postIds = allPosts.map((p) => p.id);
      const rawMedia = await db
        .select()
        .from(postMedia)
        .where(inArray(postMedia.post_id, postIds))
        .orderBy(desc(postMedia.created_at));

      rawMedia.forEach((m) => {
        if (!mediaByPost[m.post_id]) mediaByPost[m.post_id] = [];
        mediaByPost[m.post_id].push(m);
      });
    }

    const profile = await getProfile();
    const postsWithMedia = allPosts.map((p) => ({
      ...p,
      author_avatar: profile.avatar_url,
      media: mediaByPost[p.id] || [],
    }));

    return new Response(JSON.stringify({ posts: postsWithMedia }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Error fetching posts:', err);
    return new Response(JSON.stringify({ error: 'Failed to fetch posts' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export async function POST(request: NextRequest) {
  const cookies = await nextCookies();
  if (!(await isAuthenticated(cookies, request))) {
    return new Response(JSON.stringify({ error: 'Unauthorized: login required to broadcast logs' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const session = await getSession(cookies, request);
  const authorName = session?.name || 'Kur Zagin';
  const authorHandle = `@${session?.username || 'kurzagin'}`;

  try {
    const body = await request.json();
    const content = (body.content || '').trim();
    const mediaItems: any[] = Array.isArray(body.media)
      ? body.media
      : body.media
      ? [body.media]
      : [];

    if (!content && mediaItems.length === 0) {
      return new Response(JSON.stringify({ error: 'Post must contain text or attached media' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (content.length > 5000) {
      return new Response(JSON.stringify({ error: 'Post exceeds maximum allowed length (5000 characters)' }), {
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

    const { videos } = processYouTubePost(content);
    const hasMedia = mediaItems.length > 0 || videos.length > 0;
    const category = body.category === 'anime' ? 'anime' : hasMedia ? 'media' : 'text';
    const animeMeta = body.category === 'anime' ? body.anime_meta || null : null;

    const inserted = await db
      .insert(posts)
      .values({
        content,
        author_name: authorName,
        author_handle: authorHandle,
        category,
        anime_meta: animeMeta,
        has_media: hasMedia,
      })
      .returning();

    const post = inserted[0];
    let savedMedia: PostMedia[] = [];

    if (mediaItems.length > 0) {
      const mediaRecords = mediaItems.map((m) => ({
        post_id: post.id,
        category: 'media',
        media_type: m.media_type || 'image',
        url: m.url,
        alt_text: m.alt_text || null,
        width: m.width ? parseInt(String(m.width), 10) : null,
        height: m.height ? parseInt(String(m.height), 10) : null,
      }));

      savedMedia = await db.insert(postMedia).values(mediaRecords).returning();
    }

    return new Response(
      JSON.stringify({
        success: true,
        post: {
          ...post,
          media: savedMedia,
        },
      }),
      {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (err) {
    console.error('Error creating post:', err);
    return new Response(JSON.stringify({ error: 'Failed to create post' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

