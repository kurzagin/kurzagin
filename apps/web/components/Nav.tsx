'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { User, SquarePen, Disc3, Image as ImageIcon, Tv, Gamepad2, BookOpen, MessageSquare } from 'lucide-react';
import { getCurrent } from './current';

export default function Nav() {
  const current = getCurrent(usePathname());
  return (
    <nav className="top-nav">
      <Link href="/" className="nav-brand">
        <span className="dot"></span>kurzagin<span className="jp">クルザギン</span>
      </Link>
      <ul className="nav-links">
        <li><Link href="/profile" className={current === 'profile' ? 'active' : ''}><User size={13} /><span>profile</span></Link></li>
        <li><Link href="/#blog" className={current === 'home' ? 'active' : ''}><SquarePen size={13} /><span>blog</span></Link></li>
        <li><Link href="/music" className={current === 'music' ? 'active' : ''}><Disc3 size={13} /><span>music</span></Link></li>
        <li><Link href="/gallery" className={current === 'gallery' ? 'active' : ''}><ImageIcon size={13} /><span>gallery</span></Link></li>
        <li><Link href="/anime" className={current === 'anime' ? 'active' : ''}><Tv size={13} /><span>anime</span></Link></li>
        <li><Link href="/games" className={current === 'games' ? 'active' : ''}><Gamepad2 size={13} /><span>games</span></Link></li>
        <li><Link href="/novels" className={current === 'novels' ? 'active' : ''}><BookOpen size={13} /><span>novels</span></Link></li>
        <li><Link href="/guestbook" className={current === 'guestbook' ? 'active' : ''}><MessageSquare size={13} /><span>guestbook</span></Link></li>
      </ul>
    </nav>
  );
}
