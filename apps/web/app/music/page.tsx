import { desc } from 'drizzle-orm';
import { getDb, tracks as tracksTable, type DbTrack } from '@/lib/db';
import { getServerSession } from '@/lib/serverSession';
import { isR2Configured } from '@/lib/r2';
import MusicClient from './MusicClient';

export const metadata = { title: 'music — kurzagin.log' };

export default async function MusicPage() {
  const session = await getServerSession();
  const authenticated = session !== null;
  const r2Configured = isR2Configured();

  const db = getDb();
  let tracks: DbTrack[] = [];

  if (db) {
    try {
      tracks = await db
        .select()
        .from(tracksTable)
        .orderBy(desc(tracksTable.created_at));
    } catch (err) {
      console.error('Error fetching tracks from Neon DB:', err);
    }
  }

  return (
    <MusicClient
      tracks={JSON.parse(JSON.stringify(tracks))}
      authenticated={authenticated}
      username={session?.username ?? undefined}
      r2Configured={r2Configured}
    />
  );
}
