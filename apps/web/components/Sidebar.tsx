'use client';

import Link from 'next/link';
import { desc } from 'drizzle-orm';
import { getDb, tracks as tracksTable } from '@/lib/db';

export default async function Sidebar({ visits = 0 }: { visits?: number }) {
  const displayVisits = String(visits).padStart(6, '0');
  const db = getDb();
  const firstTrack = db
    ? (await db.select().from(tracksTable).orderBy(desc(tracksTable.created_at)).limit(1).catch(() => []))[0]
    : null;
  return (
    <aside className="sidebar">
      <div className="sb-section anime-side-card">
        <div className="sb-title">operator</div>
        <strong className="anime-side-operator">kurzagin</strong>
        <span className="anime-side-copy">operator dossier &amp; identity</span>
        <Link href="/profile" className="anime-side-link">view dossier →</Link>
        <Link href="/login" className="anime-side-link">operator access →</Link>
      </div>

      <div className="sb-section anime-side-card">
        <div className="sb-title">audio deck // turntable</div>
        <span className="anime-side-status">● DECK STANDBY</span>
        <strong className="anime-side-operator">{firstTrack?.title || 'No tracks in crate'}</strong>
        <span className="anime-side-copy">{firstTrack?.artist || 'Turntable silent'}</span>
        <Link href="/music" className="anime-side-link">crate console →</Link>
      </div>

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
