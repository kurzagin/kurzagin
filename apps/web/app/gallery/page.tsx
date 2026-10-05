import { desc } from 'drizzle-orm';
import { connection } from 'next/server';
import { getDb, galleryItems as galleryItemsTable, type DbGalleryItem } from '@/lib/db';
import { isServerAuthenticated } from '@/lib/serverSession';
import GalleryClient, { type RenderedGalleryItem } from './GalleryClient';
import './gallery.css';

export const metadata = { title: 'gallery — kurzagin.log' };

const rotations = ['-2deg', '1.5deg', '-1deg', '2.5deg', '-1.8deg', '1.2deg', '-2.5deg', '2deg'];
const tapeRotations = ['-3deg', '2deg', '-1.5deg', '3.5deg', '-2deg', '1deg'];

export default async function GalleryPage() {
  await connection();
  const authenticated = await isServerAuthenticated();

  const db = getDb();
  let rawItems: DbGalleryItem[] = [];

  if (db) {
    try {
      rawItems = await db
        .select()
        .from(galleryItemsTable)
        .orderBy(desc(galleryItemsTable.created_at))
        .limit(100);
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

  return <GalleryClient items={items} allTags={allTags} authenticated={authenticated} />;
}
