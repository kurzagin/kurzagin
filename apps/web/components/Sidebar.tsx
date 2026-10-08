'use client';

import { desc } from 'drizzle-orm';
import { getDb, getProfile, tracks as tracksTable } from '@/lib/db';
import SidebarInteractive from './SidebarInteractive';

export default async function Sidebar({ visits = 0 }: { visits?: number }) {
  const displayVisits = String(visits).padStart(6, '0');
  const db = getDb();
  const firstTrack = db
    ? (await db.select().from(tracksTable).orderBy(desc(tracksTable.created_at)).limit(1).catch(() => []))[0]
    : null;
  const profile = await getProfile();
  return (
    <aside className="sidebar">
      <SidebarInteractive profile={profile} track={firstTrack || null} />

      <div className="sb-section retro-counter-side" aria-label={`${visits} total visits`}>
        <span className="retro-counter-label">VISITORS</span>
        <span className="retro-counter-number">{displayVisits}</span>
        <span className="retro-counter-since">SINCE 2026</span>
      </div>

      <div className="sb-section">
        <div className="sb-title">quote</div>
        <blockquote className="sb-quote">
          <p className="quote-text">
            an gal-ta ki gal-ce3 jectug2-ga-ni na-an-gub
          </p>
          <cite className="quote-source">— ETCSL 1.4.1 (Inana&apos;s descent to the nether world)</cite>
        </blockquote>
      </div>
    </aside>
  );
}
