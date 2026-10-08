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
        <div className="sidebar-player-main">
          <div className="sidebar-vinyl-area" role="button" aria-label="Play or pause track" tabIndex={0} onClick={() => w().togglePlay?.()}>
            <div className="sidebar-vinyl" id="sidebarVinyl">
              <div className="sidebar-vinyl-label">
                {track?.cover_url ? <img id="sidebarVinylCover" src={track.cover_url} alt="Record cover" /> : <span id="sidebarVinylFallback">KRZ</span>}
                <i />
              </div>
            </div>
          </div>
          <div className="sidebar-player-info">
            <div className="sidebar-player-status"><i id="sidebarPlayingPulse" /> <span id="sidebarStatusText">DECK STANDBY</span></div>
            <strong className="anime-side-operator" id="sidebarTrackTitle">{track?.title || 'No tracks in crate'}</strong>
            <span className="anime-side-copy" id="sidebarTrackArtist">{track?.artist || 'Turntable silent'}</span>
          </div>
        </div>
        <div className="sidebar-player-controls">
          <button type="button" aria-label="Previous track" onClick={() => w().prevTrack?.()}><SkipBack size={13} /></button>
          <button type="button" className="sidebar-play-btn" id="sidebarPlayBtn" aria-label="Play or pause" onClick={() => w().togglePlay?.()}><Play size={14} /></button>
          <button type="button" aria-label="Next track" onClick={() => w().nextTrack?.()}><SkipForward size={13} /></button>
        </div>
        <div className="sidebar-mini-progress" id="sidebarProgressBar" role="slider" aria-label="Seek position" aria-valuemin={0} aria-valuemax={100} tabIndex={0}
          onClick={(e) => { e.stopPropagation(); w().seekTrack?.(e); }}
          onPointerDown={(e) => { e.stopPropagation(); w().startScrub?.(e); }}>
          <div className="sidebar-mini-progress-fill" id="sidebarProgress" />
        </div>
        <div className="sidebar-mini-time"><span id="sidebarCurrentTime">0:00</span><span id="sidebarTotalTime">{track?.duration || '0:00'}</span></div>
        <Link href="/music" className="anime-side-link">crate console →</Link>
      </div>
    </>
  );
}
