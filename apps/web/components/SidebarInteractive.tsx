'use client';

import Link from 'next/link';
import { Mail, Play, SkipBack, SkipForward } from 'lucide-react';
import type { DbProfile, DbTrack } from '@/lib/db';

export default function SidebarInteractive({ profile, track }: { profile: DbProfile; track: DbTrack | null }) {
  const w = () => window as any;

  return (
    <>
      <div className="sb-section anime-side-card sidebar-profile-card">
        <div className="sb-title">operator dossier</div>
        <div className="sidebar-profile-head">
          <div className="sidebar-avatar">
            {profile.avatar_url ? <img src={profile.avatar_url} alt={profile.name} /> : <span>𒀭</span>}
          </div>
          <div>
            <strong className="anime-side-operator">{profile.name}</strong>
            <span className="anime-side-copy">{profile.handle}</span>
          </div>
        </div>
        <p className="sidebar-profile-headline">{profile.headline || 'System architect and builder of strange but useful things.'}</p>
        <div className="sidebar-profile-links">
          <Link href="/profile" className="anime-side-link">view dossier →</Link>
          {profile.contact_email && <a href={`mailto:${profile.contact_email}`} className="anime-side-link"><Mail size={11} /> contact operator</a>}
        </div>
      </div>

      <div className="sb-section anime-side-card sidebar-player-card">
        <div className="sb-title">audio deck // turntable</div>
        <div className="anime-side-status">● DECK STANDBY</div>
        <strong className="anime-side-operator">{track?.title || 'No tracks in crate'}</strong>
        <span className="anime-side-copy">{track?.artist || 'Turntable silent'}</span>
        <div className="sidebar-player-controls">
          <button type="button" aria-label="Previous track" onClick={() => w().prevTrack?.()}><SkipBack size={13} /></button>
          <button type="button" aria-label="Play or pause" onClick={() => w().togglePlay?.()}><Play size={14} /></button>
          <button type="button" aria-label="Next track" onClick={() => w().nextTrack?.()}><SkipForward size={13} /></button>
        </div>
        <Link href="/music" className="anime-side-link">crate console →</Link>
      </div>
    </>
  );
}
