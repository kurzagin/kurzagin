'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, User, SquarePen, Disc3, Image as ImageIcon, Tv, Gamepad2, Settings, BookOpen } from 'lucide-react';
import { getCurrent } from './current';

export default function Sidebar() {
  const current = getCurrent(usePathname());
  return (
    <aside className="sidebar">
      <div className="sb-section sb-nav-section">
        <div className="sb-title">site index</div>
        <ul className="sb-nav">
          <li><Link href="/" className={current === 'home' ? 'active' : ''}><span className="nav-icon"><Home size={14} /></span> home</Link></li>
          <li><Link href="/profile" className={current === 'profile' ? 'active' : ''}><span className="nav-icon"><User size={14} /></span> profile</Link></li>
          <li><Link href="/#blog"><span className="nav-icon"><SquarePen size={14} /></span> blog</Link></li>
          <li><Link href="/music" className={current === 'music' ? 'active' : ''}><span className="nav-icon"><Disc3 size={14} /></span> music</Link></li>
          <li><Link href="/gallery" className={current === 'gallery' ? 'active' : ''}><span className="nav-icon"><ImageIcon size={14} /></span> gallery</Link></li>
          <li><Link href="/anime" className={current === 'anime' ? 'active' : ''}><span className="nav-icon"><Tv size={14} /></span> anime</Link></li>
          <li><Link href="/games" className={current === 'games' ? 'active' : ''}><span className="nav-icon"><Gamepad2 size={14} /></span> games</Link></li>
          <li><Link href="/novels" className={current === 'novels' ? 'active' : ''}><span className="nav-icon"><BookOpen size={14} /></span> novels</Link></li>
          <li><Link href="/settings" className={current === 'settings' ? 'active' : ''}><span className="nav-icon"><Settings size={14} /></span> settings</Link></li>
        </ul>
      </div>

      <div className="sb-section anime-side-card">
        <div className="sb-title">now watching</div>
        <div className="anime-side-entry">
          <span className="anime-side-status">● ON AIR</span>
          <strong>late night anime logs</strong>
          <span>episode notes, first impressions &amp; rewatches</span>
        </div>
        <Link href="/anime" className="anime-side-link">open watchlist →</Link>
      </div>

      <div className="sb-section anime-side-card">
        <div className="sb-title">old web links</div>
        <div className="anime-side-links">
          <span>✦ anime archive</span>
          <span>✦ personal diary</span>
          <span>✦ music crate</span>
        </div>
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
