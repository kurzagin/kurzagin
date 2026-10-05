import { desc } from 'drizzle-orm';
import { connection } from 'next/server';
import { getDb, galleryItems as galleryItemsTable, type DbGalleryItem } from '@/lib/db';
import { isServerAuthenticated } from '@/lib/serverSession';
import GalleryClient, { type RenderedGalleryItem } from './GalleryClient';
import './gallery.css';

export const metadata = { title: 'gallery — kurzagin' };

const rotations = ['-2deg', '1.5deg', '-1deg', '2.5deg', '-1.8deg', '1.2deg', '-2.5deg', '2deg'];
const tapeRotations = ['-3deg', '2deg', '-1.5deg', '3.5deg', '-2deg', '1deg'];

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

export default async function GalleryPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  await connection();
  const authenticated = await isServerAuthenticated();

  const sp = await searchParams;
  const initialTag = (typeof sp?.tag === 'string' ? sp.tag : 'all').toLowerCase();
  const initialPageParam = parseInt(typeof sp?.page === 'string' ? sp.page : '1', 10);
  const initialPage = isNaN(initialPageParam) || initialPageParam < 1 ? 1 : initialPageParam;
  const PAGE_SIZE = 20;

  const db = getDb();
  let rawItems: DbGalleryItem[] = [];

  if (db) {
    try {
      rawItems = await db
        .select()
        .from(galleryItemsTable)
        .orderBy(desc(galleryItemsTable.created_at));
    } catch (err) {
      console.error('Error fetching gallery items:', err);
    }
  }

  const items: RenderedGalleryItem[] = rawItems.map((r, i) => ({
    ...r,
    rotation: rotations[i % rotations.length],
    hasTape: i % 2 === 0,
    tapeRotation: tapeRotations[i % tapeRotations.length],
  }));

  // Collect unique tags
  const allTags = Array.from(
    new Set(
      rawItems
        .flatMap((item) => (Array.isArray(item.tags) ? item.tags : []))
        .map((t) => String(t).trim().toLowerCase())
        .filter(Boolean)
    )
  );

  const filteredItems = items.filter((item) => {
    if (initialTag === 'all') return true;
    return Array.isArray(item.tags) && item.tags.some((t: string) => String(t).trim().toLowerCase() === initialTag);
  });

  const totalFiltered = filteredItems.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / PAGE_SIZE));
  const safePage = Math.min(Math.max(1, initialPage), totalPages);
  const startIndex = (safePage - 1) * PAGE_SIZE;
  const endIndex = startIndex + PAGE_SIZE;
  const ssrPaginationItems = getPaginationItems(safePage, totalPages);

  return (
    <GalleryClient
      items={items}
      filteredItems={filteredItems}
      allTags={allTags}
      authenticated={authenticated}
      initialTag={initialTag}
      initialPage={initialPage}
      totalFiltered={totalFiltered}
      totalPages={totalPages}
      safePage={safePage}
      startIndex={startIndex}
      endIndex={endIndex}
      ssrPaginationItems={ssrPaginationItems}
    />
  );
}
