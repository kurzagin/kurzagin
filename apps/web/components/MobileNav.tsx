import { connection } from 'next/server';
import { desc } from 'drizzle-orm';
import { getDb, tracks as tracksTable, type DbTrack } from '@/lib/db';
import MobileNavClient from './MobileNavClient';

export default async function MobileNav() {
  // Always fetch fresh tracks per request (never prerender this at build time).
  await connection();

  const db = getDb();
  let tracks: DbTrack[] = [];
  if (db) {
    try {
      tracks = await db
        .select()
        .from(tracksTable)
        .orderBy(desc(tracksTable.created_at))
        .limit(30);
    } catch {
      tracks = [];
    }
  }

  return <MobileNavClient tracks={JSON.parse(JSON.stringify(tracks))} />;
}
