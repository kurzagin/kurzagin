'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home, SquarePen, Disc3, Image as ImageIcon, Tv, Gamepad2, User, Settings,
  MoreHorizontal, X, ChevronRight, Play, SkipBack, SkipForward, Download, BookOpen, MessageSquare,
} from 'lucide-react';
import { getCurrent } from './current';
import type { DbTrack } from '@/lib/db';

export default function MobileNavClient({ tracks }: { tracks: DbTrack[] }) {
  const current = getCurrent(usePathname());
  const isMoreActive = ['profile', 'anime', 'games', 'novels', 'settings', 'guestbook'].includes(current);
  const first = tracks[0];

  const [open, setOpen] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [dragY, setDragY] = useState(0);
  const startY = useRef(0);
  const curY = useRef(0);

  // Close the sheet whenever the route changes
  useEffect(() => { setOpen(false); }, [current]);

  // Body scroll lock class + Escape to close
  useEffect(() => {
    document.body.classList.toggle('mobile-sheet-locked', open);
    if (!open) setDragY(0);
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && open) setOpen(false); };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.classList.remove('mobile-sheet-locked');
    };
  }, [open]);

  const w = () => window as any;
  const stop = (e: React.SyntheticEvent) => e.stopPropagation();

  const onTouchStart = (e: React.TouchEvent) => {
    if (!open) return;
    startY.current = e.touches[0].clientY;
    curY.current = startY.current;
    setDragging(true);
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (!dragging) return;
    curY.current = e.touches[0].clientY;
    const delta = curY.current - startY.current;
    if (delta > 0) setDragY(delta);
  };
  const onTouchEnd = () => {
    if (!dragging) return;
    setDragging(false);
    if (curY.current - startY.current > 70) setOpen(false);
    else setDragY(0);
  };

  return (
    <>
      {/* Mobile Bottom Navigation Bar */}
      <nav className="mobile-bottom-nav" aria-label="Mobile Navigation">
        <div className="mobile-nav-bar">
          <Link href="/" className={`mobile-nav-item ${current === 'home' ? 'active' : ''}`} data-nav="home">
            <span className="mobile-nav-icon"><Home size={18} /></span>
            <span className="mobile-nav-label">home</span>
            {current === 'home' && <span className="mobile-nav-indicator" />}
          </Link>

          <Link href="/#blog" className="mobile-nav-item" data-nav="blog">
            <span className="mobile-nav-icon"><SquarePen size={18} /></span>
            <span className="mobile-nav-label">blog</span>
          </Link>

          <Link href="/music" className={`mobile-nav-item ${current === 'music' ? 'active' : ''}`} data-nav="music">
            <span className="mobile-nav-icon"><Disc3 size={18} /></span>
            <span className="mobile-nav-label">music</span>
            {current === 'music' && <span className="mobile-nav-indicator" />}
          </Link>

          <Link href="/gallery" className={`mobile-nav-item ${current === 'gallery' ? 'active' : ''}`} data-nav="gallery">
            <span className="mobile-nav-icon"><ImageIcon size={18} /></span>
            <span className="mobile-nav-label">gallery</span>
            {current === 'gallery' && <span className="mobile-nav-indicator" />}
          </Link>

          <button
            type="button"
            id="mobileNavMoreBtn"
            className={`mobile-nav-item mobile-nav-more-btn ${isMoreActive ? 'active' : ''}`}
            aria-expanded={open}
            aria-controls="mobileNavSheet"
            aria-label="More navigation"
            onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}
          >
            <span className="mobile-nav-icon">
              <MoreHorizontal size={18} />
              <span className="mobile-nav-eq" id="mobileNavEqualizer" aria-hidden="true" title="Audio playing">
                <span className="bar bar-1"></span>
                <span className="bar bar-2"></span>
                <span className="bar bar-3"></span>
              </span>
            </span>
            <span className="mobile-nav-label">more</span>
            {isMoreActive && <span className="mobile-nav-indicator" />}
          </button>
        </div>
      </nav>

      {/* Backdrop Overlay for Mobile Sheet */}
      <div
        className={`mobile-sheet-backdrop${open ? ' open' : ''}`}
        id="mobileSheetBackdrop"
        aria-hidden={!open}
        onClick={() => setOpen(false)}
      ></div>

      {/* Slide-Up Sheet for "More" Navigation */}
      <div
        className={`mobile-sheet${open ? ' open' : ''}${dragging ? ' dragging' : ''}`}
        id="mobileNavSheet"
        role="dialog"
        aria-modal="true"
        aria-label="More navigation destinations"
        aria-hidden={!open}
        style={dragY > 0 ? { transform: `translateY(${dragY}px)` } : undefined}
      >
        <div
          className="mobile-sheet-drag-area"
          id="mobileSheetDragArea"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          <div className="mobile-sheet-handle"></div>
        </div>

        <div className="mobile-sheet-header">
          <div className="mobile-sheet-title">
            <span className="mobile-sheet-dot"></span>
            <span className="mobile-sheet-title-text">navigate // more</span>
          </div>
          <button
            type="button"
            className="mobile-sheet-close-btn"
            id="mobileSheetCloseBtn"
            aria-label="Close navigation menu"
            onClick={(e) => { e.stopPropagation(); setOpen(false); }}
          >
            <X size={15} />
          </button>
        </div>

        <div className="mobile-sheet-content" onClick={(e) => { if ((e.target as HTMLElement).closest('a')) setOpen(false); }}>
          {/* MINI MUSIC PLAYER (SLIDE BOTTOM BAR) */}
          <div className="mobile-sheet-section-head">
            <div className="mobile-sheet-group-label" style={{ marginBottom: 0 }}>audio deck // turntable</div>
            <Link href="/music" className="mobile-sheet-crate-link" title="Open full vinyl crate console">
              <span>crate console →</span>
            </Link>
          </div>

          <div className="mobile-sheet-player" id="mobileSheetPlayer">
            <div className="mobile-sheet-player-main">
              {/* MINI VINYL TURNTABLE */}
              <div
                className="mobile-sheet-vinyl-area"
                id="sheetVinylArea"
                role="button"
                aria-label="Play or pause track"
                tabIndex={0}
                title="Tap to play / pause"
                onClick={(e) => { stop(e); if (typeof w().togglePlay === 'function') w().togglePlay(); }}
              >
                <div className="mobile-sheet-vinyl" id="sheetVinyl">
                  <div className="mobile-sheet-vinyl-label">
                    <img
                      id="sheetVinylCoverImg"
                      className="mobile-sheet-vinyl-img"
                      src={first?.cover_url || ''}
                      alt="Vinyl Label"
                      style={first?.cover_url ? undefined : { display: 'none' }}
                    />
                    <span id="sheetVinylFallback" style={first?.cover_url ? { display: 'none' } : undefined}>KRZ</span>
                    <div className="mobile-sheet-spindle"></div>
                  </div>
                </div>
              </div>

              {/* TRACK METADATA & STATUS */}
              <div className="mobile-sheet-player-info">
                <div className="mobile-sheet-status-tag">
                  <span className="pulse" id="sheetPlayingPulse"></span>
                  <span id="sheetStatusText">DECK STANDBY</span>
                </div>
                <div className="mobile-sheet-track-title" id="sheetTrackTitle" title={first?.title || 'No track loaded'}>
                  {first?.title || 'No tracks in crate'}
                </div>
                <div className="mobile-sheet-track-artist" id="sheetTrackArtist">
                  {first?.artist ? `${first.artist}${first.album ? ` — [${first.album}]` : ''}` : 'Turntable silent'}
                </div>
              </div>

              {/* CONTROLS */}
              <div className="mobile-sheet-player-ctrls">
                <button type="button" className="mobile-sheet-ctrl-btn" id="sheetPrevBtn" title="Previous track" aria-label="Previous track"
                  onClick={(e) => { stop(e); if (typeof w().prevTrack === 'function') w().prevTrack(); }}>
                  <SkipBack size={13} />
                </button>
                <button type="button" className="mobile-sheet-ctrl-btn play" id="sheetPlayBtn" title="Play or pause" aria-label="Play or pause"
                  onClick={(e) => { stop(e); if (typeof w().togglePlay === 'function') w().togglePlay(); }}>
                  <Play size={14} />
                </button>
                <button type="button" className="mobile-sheet-ctrl-btn" id="sheetNextBtn" title="Next track" aria-label="Next track"
                  onClick={(e) => { stop(e); if (typeof w().nextTrack === 'function') w().nextTrack(); }}>
                  <SkipForward size={13} />
                </button>
              </div>
            </div>

            {/* PROGRESS TRACK & TIMESTAMPS */}
            <div className="mobile-sheet-progress-wrap">
              <div
                className="mobile-sheet-progress-bar"
                id="sheetProgressBar"
                role="slider"
                aria-label="Audio playback seek bar"
                aria-valuemin={0}
                aria-valuemax={100}
                tabIndex={0}
                title="Seek position"
                onClick={(e) => { stop(e); if (typeof w().seekTrack === 'function') w().seekTrack(e); }}
                onPointerDown={(e) => { stop(e); if (typeof w().startScrub === 'function') w().startScrub(e); }}
              >
                <div className="mobile-sheet-progress-fill" id="sheetProgress"></div>
              </div>
              <div className="mobile-sheet-time-row">
                <span id="sheetCurrentTime">0:00</span>
                <span id="sheetTotalTime">{first?.duration || '0:00'}</span>
              </div>
            </div>
          </div>

          {/* TRACKS DATASET FOR CLIENT AUDIO ENGINE */}
          <div id="mobileTracksStore" data-tracks={JSON.stringify(tracks)} style={{ display: 'none' }}></div>

          <div className="mobile-sheet-divider"></div>

          <div className="mobile-sheet-group-label">additional sections</div>
          <div className="mobile-sheet-cards">
            <Link href="/profile" className={`mobile-sheet-card ${current === 'profile' ? 'active' : ''}`}>
              <div className="mobile-sheet-card-icon"><User size={18} /></div>
              <div className="mobile-sheet-card-body">
                <div className="mobile-sheet-card-title">profile</div>
                <div className="mobile-sheet-card-desc">operator dossier &amp; identity</div>
              </div>
              <ChevronRight size={15} className="mobile-sheet-card-arrow" />
            </Link>

            <Link href="/anime" className={`mobile-sheet-card ${current === 'anime' ? 'active' : ''}`}>
              <div className="mobile-sheet-card-icon"><Tv size={18} /></div>
              <div className="mobile-sheet-card-body">
                <div className="mobile-sheet-card-title">anime</div>
                <div className="mobile-sheet-card-desc">watchlist &amp; review logs</div>
              </div>
              <ChevronRight size={15} className="mobile-sheet-card-arrow" />
            </Link>

            <Link href="/games" className={`mobile-sheet-card ${current === 'games' ? 'active' : ''}`}>
              <div className="mobile-sheet-card-icon"><Gamepad2 size={18} /></div>
              <div className="mobile-sheet-card-body">
                <div className="mobile-sheet-card-title">games</div>
                <div className="mobile-sheet-card-desc">played &amp; backlog index</div>
              </div>
              <ChevronRight size={15} className="mobile-sheet-card-arrow" />
            </Link>

            <Link href="/novels" className={`mobile-sheet-card ${current === 'novels' ? 'active' : ''}`}>
              <div className="mobile-sheet-card-icon"><BookOpen size={18} /></div>
              <div className="mobile-sheet-card-body">
                <div className="mobile-sheet-card-title">novels</div>
                <div className="mobile-sheet-card-desc">drafts, story &amp; tactical codex</div>
              </div>
              <ChevronRight size={15} className="mobile-sheet-card-arrow" />
            </Link>

            <Link href="/guestbook" className={`mobile-sheet-card ${current === 'guestbook' ? 'active' : ''}`}>
              <div className="mobile-sheet-card-icon"><MessageSquare size={18} /></div>
              <div className="mobile-sheet-card-body">
                <div className="mobile-sheet-card-title">guestbook</div>
                <div className="mobile-sheet-card-desc">leave a trace in the back alleys</div>
              </div>
              <ChevronRight size={15} className="mobile-sheet-card-arrow" />
            </Link>

            <Link href="/settings" className={`mobile-sheet-card ${current === 'settings' ? 'active' : ''}`}>
              <div className="mobile-sheet-card-icon"><Settings size={18} /></div>
              <div className="mobile-sheet-card-body">
                <div className="mobile-sheet-card-title">settings</div>
                <div className="mobile-sheet-card-desc">preferences &amp; pwa</div>
              </div>
              <ChevronRight size={15} className="mobile-sheet-card-arrow" />
            </Link>

            <button
              type="button"
              id="mobileSheetInstallBtn"
              className="mobile-sheet-card pwa-install-trigger"
              style={{ width: '100%', border: '1px solid var(--border)', background: 'var(--bg-0)', cursor: 'pointer', textAlign: 'left', display: 'none' }}
              onClick={() => { if (typeof w().promptPwaInstall === 'function') w().promptPwaInstall(); }}
            >
              <div className="mobile-sheet-card-icon" style={{ color: 'var(--accent)' }}><Download size={18} /></div>
              <div className="mobile-sheet-card-body">
                <div className="mobile-sheet-card-title" style={{ color: 'var(--accent)' }}>install app</div>
                <div className="mobile-sheet-card-desc">add kurzagin to home screen</div>
              </div>
              <ChevronRight size={15} className="mobile-sheet-card-arrow" />
            </button>
          </div>

          <div className="mobile-sheet-divider"></div>

          <div className="mobile-sheet-group-label">all sections</div>
          <div className="mobile-sheet-quick-grid">
            <Link href="/" className={`mobile-sheet-quick-link ${current === 'home' ? 'active' : ''}`}>
              <Home size={14} />
              <span>home</span>
            </Link>
            <Link href="/#blog" className="mobile-sheet-quick-link">
              <SquarePen size={14} />
              <span>blog</span>
            </Link>
            <Link href="/music" className={`mobile-sheet-quick-link ${current === 'music' ? 'active' : ''}`}>
              <Disc3 size={14} />
              <span>music</span>
            </Link>
            <Link href="/gallery" className={`mobile-sheet-quick-link ${current === 'gallery' ? 'active' : ''}`}>
              <ImageIcon size={14} />
              <span>gallery</span>
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
