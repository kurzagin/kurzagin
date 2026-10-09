import { desc } from 'drizzle-orm';
import { getDb, getProfile, guestbookEntries, type DbGuestbookEntry } from '@/lib/db';
import GuestbookClient from './GuestbookClient';

export const metadata = { title: 'guestbook — kurzagin' };

export default async function GuestbookPage() {
  const profile = await getProfile();
  let entries: DbGuestbookEntry[] = [];
  const db = getDb();
  if (db) { try { entries = await db.select().from(guestbookEntries).orderBy(desc(guestbookEntries.created_at)).limit(100); } catch (error) { console.error('Error loading guestbook:', error); } }
  return <GuestbookClient bannerUrl={profile.banner_url} initialEntries={JSON.parse(JSON.stringify(entries))} />;
}
