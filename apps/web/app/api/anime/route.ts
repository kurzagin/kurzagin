import { connection, type NextRequest } from 'next/server';
import { cookies as nextCookies } from 'next/headers';
import { desc, eq, inArray, sql } from 'drizzle-orm';
import { getDb, animeWatchlist, animeReviews, type AnimeWatchlistItem, type AnimeReview } from '@/lib/db';
import { isAuthenticated } from '@/lib/auth';
import { convertRemoteCoverToAvif } from '@/lib/image';

export async function GET(request: NextRequest) {
  await connection();
  const db = getDb();
  if (!db) {
    return new Response(JSON.stringify({ anime: [], message: 'DATABASE_URL not configured' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const url = new URL(request.url);
    const statusFilter = url.searchParams.get('status');
    const pageParam = url.searchParams.get('page');
    const limitParam = url.searchParams.get('limit');

    const isAll = limitParam === 'all' || limitParam === '0';
    const limit = isAll ? undefined : (limitParam ? Math.max(1, parseInt(limitParam, 10)) : 20);
    const page = isAll ? 1 : Math.max(1, parseInt(pageParam || '1', 10));
    const offset = isAll || !limit ? undefined : (page - 1) * limit;

    const countQuery = db.select({ count: sql<number>`count(*)::int` }).from(animeWatchlist).$dynamic();
    let countRes;
    if (statusFilter && statusFilter !== 'all') {
      countRes = statusFilter === 'paused'
        ? await countQuery.where(inArray(animeWatchlist.status, ['paused', 'on_hold']))
        : await countQuery.where(eq(animeWatchlist.status, statusFilter));
    } else {
      countRes = await countQuery;
    }
    const total = countRes[0]?.count || 0;

    let query = db.select().from(animeWatchlist).$dynamic();
    if (statusFilter && statusFilter !== 'all') {
      query = statusFilter === 'paused'
        ? query.where(inArray(animeWatchlist.status, ['paused', 'on_hold']))
        : query.where(eq(animeWatchlist.status, statusFilter));
    }

    // Sort by year descending (newest to oldest), secondary sort by updated_at descending
    query = query.orderBy(sql`${animeWatchlist.season_year} DESC NULLS LAST`, desc(animeWatchlist.updated_at));

    if (!isAll && limit !== undefined && offset !== undefined) {
      query = query.limit(limit).offset(offset);
    }

    const list = await query;

    const reviewsByAnime: Record<string, AnimeReview[]> = {};
    if (list.length > 0) {
      const animeIds = list.map((a) => a.id);
      const rawReviews = await db
        .select()
        .from(animeReviews)
        .where(inArray(animeReviews.anime_id, animeIds))
        .orderBy(desc(animeReviews.created_at));

      rawReviews.forEach((r) => {
        if (!reviewsByAnime[r.anime_id]) reviewsByAnime[r.anime_id] = [];
        reviewsByAnime[r.anime_id].push(r);
      });
    }

    const items = list.map((a) => ({
      ...a,
      reviews: reviewsByAnime[a.id] || [],
      latest_review: (reviewsByAnime[a.id] && reviewsByAnime[a.id][0]) || null,
    }));

    return new Response(JSON.stringify({
      anime: items,
      pagination: {
        page,
        limit: isAll ? total : (limit || 20),
        total,
        totalPages: isAll ? 1 : Math.max(1, Math.ceil(total / (limit || 20))),
      },
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('Error fetching anime watchlist:', err);
    return new Response(JSON.stringify({ error: 'Failed to fetch anime list' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export async function POST(request: NextRequest) {
  const cookies = await nextCookies();
  if (!(await isAuthenticated(cookies, request))) {
    return new Response(JSON.stringify({ error: 'Unauthorized: login required to manage watchlist' }), {
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

  try {
    const body = await request.json();
    const anilistId = parseInt(String(body.anilist_id), 10);
    const title = (body.title || '').trim();

    if (!anilistId || !title) {
      return new Response(JSON.stringify({ error: 'anilist_id and title are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    let coverUrl = body.cover_url || null;
    if (coverUrl && coverUrl.startsWith('http')) {
      coverUrl = await convertRemoteCoverToAvif(coverUrl, anilistId);
    }

    const existing = await db
      .select()
      .from(animeWatchlist)
      .where(eq(animeWatchlist.anilist_id, anilistId))
      .limit(1);

    if (existing.length > 0) {
      const prev = existing[0];
      const totalEps = body.total_episodes !== undefined ? (body.total_episodes ? parseInt(String(body.total_episodes), 10) : null) : prev.total_episodes;
      let currentEp = body.current_episode !== undefined ? parseInt(String(body.current_episode), 10) : prev.current_episode;
      let newStatus = body.status || prev.status;

      // Auto-number episode to end of series if completed
      if (newStatus === 'completed' && totalEps && currentEp < totalEps) {
        currentEp = totalEps;
      } else if (totalEps && currentEp >= totalEps && newStatus === 'watching') {
        newStatus = 'completed';
      }

      // Update existing item
      const updated = await db
        .update(animeWatchlist)
        .set({
          status: newStatus,
          current_episode: currentEp,
          total_episodes: totalEps,
          score: body.score !== undefined ? (body.score ? parseInt(String(body.score), 10) : null) : prev.score,
          cover_url: coverUrl || prev.cover_url,
          updated_at: new Date(),
        })
        .where(eq(animeWatchlist.id, prev.id))
        .returning();

      return new Response(JSON.stringify({ success: true, anime: updated[0] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const totalEpisodes = body.total_episodes ? parseInt(String(body.total_episodes), 10) : null;
    let currentEpisode = body.current_episode ? parseInt(String(body.current_episode), 10) : 0;
    let status = body.status || 'watching';

    // Auto-number episode to end of series if completed
    if (status === 'completed' && totalEpisodes && currentEpisode < totalEpisodes) {
      currentEpisode = totalEpisodes;
    } else if (totalEpisodes && currentEpisode >= totalEpisodes && status === 'watching') {
      status = 'completed';
    }

    const inserted = await db
      .insert(animeWatchlist)
      .values({
        anilist_id: anilistId,
        title,
        romaji_title: body.romaji_title || null,
        native_title: body.native_title || null,
        cover_url: coverUrl,
        banner_url: body.banner_url || null,
        format: body.format || 'TV',
        status,
        current_episode: currentEpisode,
        total_episodes: totalEpisodes,
        score: body.score ? parseInt(String(body.score), 10) : null,
        genres: Array.isArray(body.genres) ? body.genres : [],
        studio: body.studio || null,
        season_year: body.season_year ? parseInt(String(body.season_year), 10) : null,
        summary: body.summary || null,
      })
      .returning();

    return new Response(JSON.stringify({ success: true, anime: inserted[0] }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('Error adding anime to watchlist:', err);
    return new Response(JSON.stringify({ error: 'Failed to add anime', details: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export async function PATCH(request: NextRequest) {
  const cookies = await nextCookies();
  if (!(await isAuthenticated(cookies, request))) {
    return new Response(JSON.stringify({ error: 'Unauthorized: login required' }), {
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

  try {
    const body = await request.json();
    const id = body.id;
    if (!id) {
      return new Response(JSON.stringify({ error: 'Anime id is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const existing = await db
      .select()
      .from(animeWatchlist)
      .where(eq(animeWatchlist.id, id))
      .limit(1);

    if (existing.length === 0) {
      return new Response(JSON.stringify({ error: 'Anime not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const prev = existing[0];
    const totalEps = body.total_episodes !== undefined ? (body.total_episodes ? parseInt(String(body.total_episodes), 10) : null) : prev.total_episodes;
    let currentEp = body.current_episode !== undefined ? parseInt(String(body.current_episode), 10) : prev.current_episode;
    let newStatus = body.status !== undefined ? body.status : prev.status;

    // Auto-number episode to end of series if completed
    if (newStatus === 'completed' && totalEps && currentEp < totalEps) {
      currentEp = totalEps;
    } else if (totalEps && currentEp >= totalEps && newStatus === 'watching') {
      newStatus = 'completed';
    } else if (newStatus === 'planning' && currentEp > 0 && body.status === undefined) {
      newStatus = 'watching';
    }

    const updateFields: Record<string, any> = {
      status: newStatus,
      current_episode: currentEp,
      total_episodes: totalEps,
      updated_at: new Date(),
    };

    if (body.score !== undefined) {
      updateFields.score = body.score ? parseInt(String(body.score), 10) : null;
    }

    const updated = await db
      .update(animeWatchlist)
      .set(updateFields)
      .where(eq(animeWatchlist.id, id))
      .returning();

    if (updated.length === 0) {
      return new Response(JSON.stringify({ error: 'Anime not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true, anime: updated[0] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('Error updating anime:', err);
    return new Response(JSON.stringify({ error: 'Failed to update anime', details: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export async function DELETE(request: NextRequest) {
  const cookies = await nextCookies();
  if (!(await isAuthenticated(cookies, request))) {
    return new Response(JSON.stringify({ error: 'Unauthorized: login required' }), {
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

  try {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');

    if (!id) {
      return new Response(JSON.stringify({ error: 'Anime id is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    await db.delete(animeWatchlist).where(eq(animeWatchlist.id, id));

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('Error deleting anime:', err);
    return new Response(JSON.stringify({ error: 'Failed to delete anime', details: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
