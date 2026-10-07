import { connection, type NextRequest } from 'next/server';
import { cookies as nextCookies } from 'next/headers';
import { desc, eq } from 'drizzle-orm';
import { getDb, animeWatchlist, animeReviews, posts, postMedia, type AnimePostMeta } from '@/lib/db';
import { isAuthenticated, getSession } from '@/lib/auth';

export async function GET(request: NextRequest) {
  await connection();
  const db = getDb();
  if (!db) {
    return new Response(JSON.stringify({ reviews: [], message: 'DATABASE_URL not configured' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const url = new URL(request.url);
    const animeId = url.searchParams.get('anime_id');

    const query = db.select().from(animeReviews);
    const list = animeId
      ? await query.where(eq(animeReviews.anime_id, animeId)).orderBy(desc(animeReviews.created_at))
      : await query.orderBy(desc(animeReviews.created_at)).limit(30);

    return new Response(JSON.stringify({ reviews: list }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('Error fetching anime reviews:', err);
    return new Response(JSON.stringify({ error: 'Failed to fetch reviews' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export async function POST(request: NextRequest) {
  const cookies = await nextCookies();
  if (!(await isAuthenticated(cookies, request))) {
    return new Response(JSON.stringify({ error: 'Unauthorized: login required to submit review' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const db = getDb();
  if (!db) {
    return new Response(JSON.stringify({ error: 'Database connection not configured' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const session = await getSession(cookies, request);
  const authorName = session?.name || 'Kur Zagin';
  const authorHandle = `@${session?.username || 'kurzagin'}`;

  try {
    const body = await request.json();
    const animeId = body.anime_id;
    const content = (body.content || '').trim();
    const reviewType = body.review_type || 'mid_watch';
    const rawEp = body.episode;
    const episode = rawEp !== undefined && rawEp !== null && rawEp !== '' ? parseInt(String(rawEp), 10) : null;
    const rawRating = body.rating;
    const rating = rawRating !== undefined && rawRating !== null && rawRating !== '' ? parseInt(String(rawRating), 10) : null;
    const hasSpoilers = Boolean(body.has_spoilers);
    const shareToFeed = Boolean(body.share_to_feed);

    if (!animeId || !content) {
      return new Response(JSON.stringify({ error: 'anime_id and content are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const animeRecord = await db
      .select()
      .from(animeWatchlist)
      .where(eq(animeWatchlist.id, animeId))
      .limit(1);

    if (animeRecord.length === 0) {
      return new Response(JSON.stringify({ error: 'Anime entry not found in watchlist' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const anime = animeRecord[0];

    // Auto-update watchlist progress if needed
    const animeUpdates: Record<string, any> = { updated_at: new Date() };
    if (episode !== null && episode > anime.current_episode) {
      animeUpdates.current_episode = episode;
    }
    if (rating !== null && (!anime.score || reviewType === 'final')) {
      animeUpdates.score = rating;
    }
    if (reviewType === 'final' && anime.status !== 'completed') {
      animeUpdates.status = 'completed';
      if (anime.total_episodes && (!anime.current_episode || anime.current_episode < anime.total_episodes)) {
        animeUpdates.current_episode = anime.total_episodes;
      }
    }
    if (Object.keys(animeUpdates).length > 1) {
      await db.update(animeWatchlist).set(animeUpdates).where(eq(animeWatchlist.id, anime.id));
    }

    let sharedPostId: string | null = null;

    // Cross-post to main feed if selected
    if (shareToFeed) {
      const animeMeta: AnimePostMeta = {
        anilist_id: anime.anilist_id,
        anime_id: anime.id,
        title: anime.title,
        romaji_title: anime.romaji_title || undefined,
        cover_url: anime.cover_url || undefined,
        episode,
        score: rating,
        review_type: reviewType,
        has_spoilers: hasSpoilers,
      };

      const rawMedia = Array.isArray(body.media) ? body.media : [];
      const hasMedia = rawMedia.length > 0;

      const insertedPost = await db
        .insert(posts)
        .values({
          content,
          author_name: authorName,
          author_handle: authorHandle,
          category: 'anime',
          anime_meta: animeMeta,
          has_media: hasMedia,
        })
        .returning();

      if (insertedPost.length > 0) {
        sharedPostId = insertedPost[0].id;

        if (hasMedia) {
          const mediaRows = rawMedia.map((m: any) => ({
            post_id: sharedPostId!,
            category: 'media',
            media_type: 'image',
            url: String(m.url),
            alt_text: m.alt_text ? String(m.alt_text) : `Screenshot from ${anime.title}`,
            width: typeof m.width === 'number' ? m.width : null,
            height: typeof m.height === 'number' ? m.height : null,
          }));
          await db.insert(postMedia).values(mediaRows);
        }
      }
    }

    const insertedReview = await db
      .insert(animeReviews)
      .values({
        anime_id: anime.id,
        episode,
        review_type: reviewType,
        content,
        rating,
        has_spoilers: hasSpoilers,
        share_to_feed: shareToFeed,
        post_id: sharedPostId,
      })
      .returning();

    return new Response(
      JSON.stringify({
        success: true,
        review: insertedReview[0],
        post_id: sharedPostId,
      }),
      {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (err: any) {
    console.error('Error creating anime review:', err);
    return new Response(JSON.stringify({ error: 'Failed to create review', details: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
