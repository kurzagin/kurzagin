// @ts-nocheck
import { connection } from 'next/server';
import { desc, asc, eq, inArray, sql } from 'drizzle-orm';
import {
  getDb,
  animeWatchlist as animeWatchlistTable,
  animeReviews as animeReviewsTable,
  type DbAnimeWatchlistItem,
  type DbAnimeReview,
} from '@/lib/db';
import { getServerSession } from '@/lib/serverSession';
import AnimeView from './AnimeView';

export const metadata = { title: 'anime watchlist & reviews — kurzagin.log' };

function getPaginationItems(current: number, total: number) {
  const items: (number | string)[] = [];
  if (total <= 7) {
    for (let i = 1; i <= total; i++) items.push(i);
  } else if (current <= 4) {
    for (let i = 1; i <= 5; i++) items.push(i);
    items.push('...');
    items.push(total);
  } else if (current >= total - 3) {
    items.push(1);
    items.push('...');
    for (let i = total - 4; i <= total; i++) items.push(i);
  } else {
    items.push(1);
    items.push('...');
    items.push(current - 1);
    items.push(current);
    items.push(current + 1);
    items.push('...');
    items.push(total);
  }
  return items;
}

export default async function AnimePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  await connection();
  const session = await getServerSession();
  const authenticated = session !== null;

  const sp = await searchParams;
  const initialStatus = (typeof sp.status === 'string' ? sp.status : 'all').toLowerCase();
  const initialPageParam = parseInt(typeof sp.page === 'string' ? sp.page : '1', 10);
  const initialPage = isNaN(initialPageParam) || initialPageParam < 1 ? 1 : initialPageParam;
  const PAGE_SIZE = 20;

  const db = getDb();
  let allAnimeItems: (DbAnimeWatchlistItem & {
    reviews: DbAnimeReview[];
    latest_review: DbAnimeReview | null;
  })[] = [];

  if (db) {
    try {
      const list = await db
        .select()
        .from(animeWatchlistTable)
        .orderBy(sql`${animeWatchlistTable.season_year} DESC NULLS LAST`, desc(animeWatchlistTable.updated_at));

      let reviewsByAnime: Record<string, DbAnimeReview[]> = {};
      if (list.length > 0) {
        const animeIds = list.map((a) => a.id);
        const rawReviews = await db
          .select()
          .from(animeReviewsTable)
          .where(inArray(animeReviewsTable.anime_id, animeIds))
          .orderBy(desc(animeReviewsTable.created_at));

        rawReviews.forEach((r) => {
          if (!reviewsByAnime[r.anime_id]) reviewsByAnime[r.anime_id] = [];
          reviewsByAnime[r.anime_id].push(r);
        });
      }

      allAnimeItems = list.map((a) => ({
        ...a,
        reviews: reviewsByAnime[a.id] || [],
        latest_review: (reviewsByAnime[a.id] && reviewsByAnime[a.id][0]) || null,
      }));
    } catch (err) {
      console.error('Error querying anime watchlist:', err);
    }
  }

  const stats = {
    total: allAnimeItems.length,
    watching: allAnimeItems.filter((a) => a.status === 'watching').length,
    completed: allAnimeItems.filter((a) => a.status === 'completed').length,
    planning: allAnimeItems.filter((a) => a.status === 'planning').length,
    paused: allAnimeItems.filter((a) => a.status === 'paused' || a.status === 'on_hold').length,
    dropped: allAnimeItems.filter((a) => a.status === 'dropped').length,
    totalEpisodes: allAnimeItems.reduce((acc, a) => acc + (a.current_episode || 0), 0),
  };

  const filteredAnimeItems = allAnimeItems.filter((item) => {
    if (initialStatus === 'all') return true;
    if (initialStatus === 'paused') return item.status === 'paused' || item.status === 'on_hold';
    return item.status === initialStatus;
  });
  const totalFiltered = filteredAnimeItems.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / PAGE_SIZE));
  const safePage = Math.min(Math.max(1, initialPage), totalPages);
  const startIndex = (safePage - 1) * PAGE_SIZE;
  const endIndex = startIndex + PAGE_SIZE;
  const ssrPaginationItems = getPaginationItems(safePage, totalPages);

  return (
    <AnimeView
      authenticated={authenticated}
      initialStatus={initialStatus}
      initialPage={initialPage}
      stats={stats}
      allAnimeItems={JSON.parse(JSON.stringify(allAnimeItems))}
      filteredAnimeItems={JSON.parse(JSON.stringify(filteredAnimeItems))}
      totalFiltered={totalFiltered}
      totalPages={totalPages}
      safePage={safePage}
      startIndex={startIndex}
      endIndex={endIndex}
      ssrPaginationItems={ssrPaginationItems}
    />
  );
}
