'use client';

import Link from 'next/link';

export default function Sidebar({ visits = 0 }: { visits?: number }) {
  const displayVisits = String(visits).padStart(6, '0');
  return (
    <aside className="sidebar">
      <div className="sb-section anime-side-card">
        <div className="sb-title">operator</div>
        <strong className="anime-side-operator">kurzagin</strong>
        <span className="anime-side-copy">personal logs, anime notes &amp; midnight transmissions</span>
        <Link href="/profile" className="anime-side-link">open dossier →</Link>
        <Link href="/login" className="anime-side-link">operator access →</Link>
      </div>

      <div className="sb-section anime-side-card">
        <div className="sb-title">now spinning</div>
        <span className="anime-side-status">● TURNTABLE ONLINE</span>
        <strong className="anime-side-operator">late night rotation</strong>
        <Link href="/music" className="anime-side-link">open music crate →</Link>
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
