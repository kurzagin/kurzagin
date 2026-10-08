// @ts-nocheck
'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Paperclip,
  Heart,
  MessageSquare,
  ExternalLink,
  Mail,
  Disc3,
  SkipBack,
  Play,
  SkipForward,
  Image as ImageIcon,
  Inbox,
  ArrowRight,
  ArrowUpRight,
  Pencil,
} from 'lucide-react';
import { css } from './_ui/css';
import EditPostModal from '@/components/EditPostModal';
import { processYouTubePost, formatBody } from '@/lib/youtube';
import type {
  DbPost,
  DbComment,
  DbPostMedia,
  DbProfile,
  DbTrack,
  ProjectEntry,
} from '@/lib/db';
import type { SessionUser } from '@/lib/auth';

function formatProjectHost(url?: string) {
  if (!url) return 'view dossier';
  try {
    const u = new URL(url);
    const path = u.pathname.replace(/^\/+/, '').replace(/\/+$/, '');
    if (u.hostname.includes('github.com')) {
      return path || 'github';
    }
    return u.hostname + (path ? `/${path.slice(0, 16)}...` : '');
  } catch {
    return 'view link';
  }
}

function formatPostTime(dateStr: string | Date) {
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffHours < 1) {
      const diffMins = Math.max(1, Math.floor(diffMs / (1000 * 60)));
      return `${diffMins}m ago`;
    }
    if (diffHours < 24) return `${diffHours}h ago`;
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${mm}.${dd}`;
  } catch {
    return 'recently';
  }
}

interface HomeClientProps {
  authenticated: boolean;
  session: SessionUser | null;
  profile: DbProfile;
  currentlyBuilding: ProjectEntry[];
  isMediaFilter: boolean;
  isAnimeFilter: boolean;
  posts: DbPost[];
  commentsByPost: Record<string, DbComment[]>;
  mediaByPost: Record<string, DbPostMedia[]>;
  likedPostIds: string[];
  tracks: DbTrack[];
}

export default function HomeClient({
  authenticated,
  session,
  profile,
  currentlyBuilding,
  isMediaFilter,
  isAnimeFilter,
  posts,
  commentsByPost,
  mediaByPost,
  likedPostIds: likedPostIdsArray,
  tracks,
}: HomeClientProps) {
  const likedPostIds = new Set(likedPostIdsArray);
  const [editingPost, setEditingPost] = useState<DbPost | null>(null);
  const [editingMedia, setEditingMedia] = useState<DbPostMedia[]>([]);

  return (
    <>
  <section className="hero">
    {profile.banner_url && (
      <div className="hero-banner-wrap bracket-card">
        <div className="hero-image" style={profile.banner_url ? { backgroundImage: `url('${profile.banner_url}')` } : undefined}></div>
        <div className="hero-grid"></div>
        <div className="hero-corner tl"></div>
        <div className="hero-corner tr"></div>
        <div className="hero-corner bl"></div>
        <div className="hero-corner br"></div>
        <span className="hero-coord top">35.6614° N, 139.6681° E</span>
        <span className="hero-coord bottom">v0.1.3 — last updated 10.02</span>
      </div>
    )}
    <div className="hero-content">
      <div className="hero-label">PERSONAL LOG</div>
      <h1 className="hero-title">
        <span className="hl">kurzagin</span><br />back alleys
        <span className="jp-sub">クルザギンの裏通り</span>
      </h1>
      <p className="hero-desc">
        A quiet corner of the web — <em>vinyl crackle, late-night anime,
        half-finished games, and whatever else washes up.</em>{' '}
        Somewhere between a journal and a junkyard.
      </p>
    </div>
  </section>

  <div className="divider"></div>

  {/* PROMINENT BLOG SECTION (PLACED FIRST) */}
  <section className="section" id="blog">
    <div className="section-head">
      <h2>blog</h2>
      <span className="jp-label">日誌</span>
      <div className="line"></div>
      {authenticated ? (
        <span style={css("font-family: var(--mono); font-size: 0.65rem; color: var(--accent);")}>
          // operator: @{session?.username} — <a href="/api/auth/logout" style={css("color: var(--text-3); text-decoration: underline;")}>logout</a>
        </span>
      ) : (
        <a href="/login" style={css("font-family: var(--mono); font-size: 0.6rem; color: var(--text-3); text-decoration: none; opacity: 0.6;")} title="Operator Login">
          // operator access
        </a>
      )}
    </div>

    {/* FEED CATEGORY FILTER (ALL LOGS VS MEDIA ONLY VS ANIME) */}
    <div className="feed-filter-bar" style={css("display: flex; gap: 8px; margin-bottom: 16px; flex-wrap: wrap;")}>
      <a
        href="/#blog"
        className={`feed-filter-btn ${!isMediaFilter && !isAnimeFilter ? 'active' : ''}`}
      >
        // ALL LOGS
      </a>
      <a
        href="/?filter=media#blog"
        className={`feed-filter-btn ${isMediaFilter ? 'active' : ''}`}
      >
        // MEDIA ONLY (メディア)
      </a>
      <a
        href="/?filter=anime#blog"
        className={`feed-filter-btn ${isAnimeFilter ? 'active' : ''}`}
      >
        // ANIME LOGS (アニメ)
      </a>
    </div>

    {/* IN-PLACE CMS COMPOSER (ONLY VISIBLE WHEN OPERATOR IS AUTHENTICATED) */}
    {authenticated && (
      <div className="composer bracket-card" style={css("margin-bottom: 20px;")}>
        <div style={css("font-family: var(--mono); font-size: 0.65rem; color: var(--accent); margin-bottom: 8px; letter-spacing: 1px;")}>
          // TRANSMISSION CONSOLE — NEW LOG
        </div>
        <textarea
          id="postInput"
          placeholder="broadcast new transmission to kurzagin... (supports #tags)"
          maxlength="5000"
          onInput={(e) => { const w = window as any; updateCharCount() }}
        ></textarea>

        {/* Media Attachment Preview Staging Grid */}
        <div id="mediaPreviewWrap" className="media-preview-grid" style={css("display: none;")}></div>

        {/* Hidden input for multiple file selection */}
        <input
          type="file"
          id="postImageInput"
          accept="image/*"
          multiple
          style={css("display: none;")}
          onChange={(e) => { const w = window as any; handleImageSelected(event) }}
        />

        <div className="composer-footer">
          <div style={css("display: flex; align-items: center; gap: 14px;")}>
            <label
              htmlFor="postImageInput"
              className="attachment-icon"
              title="Attach images (AVIF)"
              aria-label="Attach images"
            >
              <Paperclip size={18} />
            </label>
            <span className="char-ct" id="charCount">0 / 5000</span>
          </div>
          <button className="post-btn" id="submitPostBtn" onClick={(e) => { const w = window as any; broadcastPost() }}>BROADCAST LOG →</button>
        </div>
      </div>
    )}

    {/* POSTS FEED */}
    <div className="feed" id="postsFeed">
      {posts.length === 0 ? (
        <div className="bracket-card feed-empty">
          <div className="feed-empty-glyph">{isMediaFilter ? <ImageIcon size={32} /> : <Inbox size={32} />}</div>
          <div className="feed-empty-title">
            {isMediaFilter ? 'NO MEDIA LOGS FOUND' : 'NO LOGS RECORDED'}
          </div>
          <p className="feed-empty-desc">
            {isMediaFilter
              ? 'No transmissions with attached media have been broadcasted yet.'
              : 'The back alleys are quiet tonight. No transmissions or logs have been broadcasted yet.'}
          </p>
          <span className="feed-empty-meta">
            {authenticated ? '// curator ready — use the transmission console above' : '// status: idle — awaiting operator broadcast'}
          </span>
        </div>
      ) : (
        posts.map((post) => {
          const postComments = commentsByPost[post.id] || [];
          const postMediaItems = mediaByPost[post.id] || [];
          const isLiked = likedPostIds.has(post.id);
          const { cleanedContent, videos: postYouTubeVideos } = processYouTubePost(post.content || '');
          // Anime reviews historically stored uploaded images as markdown in the
          // body as well as in postMedia. The media grid is the canonical renderer,
          // so hide those markdown tokens to prevent raw syntax and duplicate images.
          const displayContent = postMediaItems.length > 0
            ? cleanedContent.replace(/!\[[^\]]*\]\([^)]*\)/g, '').replace(/\n{3,}/g, '\n\n').trim()
            : cleanedContent;
          return (
            <article
              className="post bracket-card feed-post"
              id={`post-${post.id}`}
              onClick={() => { window.location.href = `/post/${post.id}`; }}
              style={css("cursor: pointer;")}
            >
              <div className="post-head">
                <div className="avatar">
                  {profile.avatar_url ? (
                    <img src={profile.avatar_url} alt={post.author_name} loading="lazy" />
                  ) : (
                    post.author_name.charAt(0).toUpperCase()
                  )}
                </div>
                <div>
                  <div className="post-user">{post.author_name}</div>
                  <div className="post-handle">{post.author_handle}</div>
                </div>
                <div style={css("margin-left: auto; display: flex; align-items: center; gap: 8px;")}>
                  {post.category === 'anime' && (
                    <span className="post-media-tag anime-tag" title="Anime Watchlist Review">ANIME LOG</span>
                  )}
                  {post.has_media && (
                    <span className="post-media-tag" title="Contains AVIF media attachment">MEDIA</span>
                  )}
                  <div className="post-time">{formatPostTime(post.created_at)}</div>
                </div>
              </div>

              {post.category === 'anime' && post.anime_meta && (
                <div className="post-anime-banner" onClick={(e) => { e.stopPropagation(); }}>
                  {post.anime_meta.cover_url && (
                    <a href="/anime" className="post-anime-cover-link">
                      <img src={post.anime_meta.cover_url} alt={post.anime_meta.title || 'Anime'} className="post-anime-cover" loading="lazy" />
                    </a>
                  )}
                  <div className="post-anime-details">
                    <div className="post-anime-title-bar">
                      <a href="/anime" className="post-anime-title">{post.anime_meta.title}</a>
                      {post.anime_meta.score && (
                        <span className="post-anime-score">★ {post.anime_meta.score}/10</span>
                      )}
                    </div>
                    <div className="post-anime-pills">
                      {post.anime_meta.episode !== null && post.anime_meta.episode !== undefined ? (
                        <span className="anime-pill ep">EP {post.anime_meta.episode}</span>
                      ) : (
                        <span className="anime-pill series">SERIES</span>
                      )}
                      {post.anime_meta.review_type && (
                        <span className="anime-pill type">{post.anime_meta.review_type.replace(/_/g, ' ').toUpperCase()}</span>
                      )}
                      {post.anime_meta.has_spoilers && (
                        <span className="anime-pill spoiler">⚠️ SPOILERS</span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {displayContent && (
                post.category === 'anime' && post.anime_meta?.has_spoilers ? (
                  <details className="post-spoiler-fold" onClick={(e) => { e.stopPropagation(); }}>
                    <summary className="post-spoiler-toggle">// ⚠️ Contains spoilers for {post.anime_meta.title} (click to reveal review)</summary>
                    <div className="post-body" dangerouslySetInnerHTML={{ __html: formatBody(displayContent) }} />
                  </details>
                ) : (
                  <div className="post-body" dangerouslySetInnerHTML={{ __html: formatBody(displayContent) }} />
                )
              )}

              {postYouTubeVideos.length > 0 && (
                <div className="post-youtube-embeds" onClick={(e) => { e.stopPropagation(); }}>
                  {postYouTubeVideos.map((video) => (
                    <div className="post-youtube-player">
                      <iframe
                        src={video.embedUrl}
                        title="YouTube video player"
                        loading="lazy"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        referrerpolicy="strict-origin-when-cross-origin"
                        allowfullscreen
                      ></iframe>
                    </div>
                  ))}
                </div>
              )}

              {postMediaItems.length > 0 && (
                <div className={`post-media-grid count-${Math.min(postMediaItems.length, 4)}`} style={css("margin-top: 12px;")}>
                  {postMediaItems.map((m) => (
                    <div className="post-media-card" onClick={(e) => { e.stopPropagation(); }}>
                      <a href={m.url} target="_blank" rel="noopener noreferrer" className="post-media-link" title="Open full AVIF media">
                        <img
                          src={m.url}
                          alt={m.alt_text || 'Post attachment'}
                          loading="lazy"
                          className="post-media-img"
                        />
                        <span className="media-format-pill">AVIF</span>
                      </a>
                    </div>
                  ))}
                </div>
              )}
              
              <div className="post-actions" style={css("margin-top: 14px;")}>
                <button
                  className={`post-act like-btn ${isLiked ? 'liked' : ''}`}
                  data-post-id={post.id}
                  data-liked={isLiked ? 'true' : 'false'}
                  onClick={(e) => { e.stopPropagation(); toggleLike(e.currentTarget); }}
                  title={isLiked ? "You already liked this log" : "Like this log"}
                  aria-label={`Like log (${post.likes_count} likes)`}
                >
                  <Heart className="like-icon" size={14} fill={isLiked ? "currentColor" : "none"} />
                  <span>{post.likes_count}</span>
                </button>
                <button className="post-act" onClick={(e) => { e.stopPropagation(); window.location.href = `/post/${post.id}`; }} title="View thread and replies" style={css("display: inline-flex; align-items: center; gap: 4px")}>
                  <MessageSquare size={13} />
                  <span>{postComments.length}</span>
                </button>
                {authenticated && (
                  <button
                    type="button"
                    className="post-act edit-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingPost(post);
                      setEditingMedia(postMediaItems);
                    }}
                    title="Operator: Edit transmission"
                    style={css("margin-left: auto; color: var(--accent); opacity: 0.85; display: inline-flex; align-items: center; gap: 4px;")}
                  >
                    <Pencil size={12} />
                    <span>EDIT</span>
                  </button>
                )}
              </div>
            </article>
          );
        })
      )}
    </div>
  </section>

  <div className="divider"></div>

  {/* OPERATOR DOSSIER SECTION */}
  <section className="section" id="operator">
    <div className="section-head reveal">
      <h2>operator</h2>
      <span className="jp-label">人物</span>
      <div className="line"></div>
      <a href="/profile" className="music-more-link">full dossier →</a>
    </div>

    <div className="bracket-card reveal home-operator-card">
      {/* OPERATOR BIO / IDENTITY TOP ROW */}
      <div className="home-profile-top">
        <div className="home-profile-avatar-wrap">
          <div className="home-profile-avatar">
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt={profile.name} loading="lazy" />
            ) : (
              <span>𒀭</span>
            )}
          </div>
        </div>

        <div className="home-profile-body">
          <div className="home-profile-header">
            <div className="home-profile-identity">
              <h3 className="home-profile-name">{profile.name}</h3>
              <div className="home-profile-meta-row">
                <span className="home-profile-handle">{profile.handle}</span>
                {profile.location && (
                  <span className="home-profile-coord">[{profile.location}]</span>
                )}
              </div>
            </div>
            {profile.status_message && (
              <div className="profile-status-badge">
                <span className="dot"></span>
                <span>{profile.status_message}</span>
              </div>
            )}
          </div>

          <p className="home-profile-headline">
            {profile.headline || 'System architect, solo developer, and builder of strange but useful things.'}
          </p>

          <div className="home-profile-actions">
            <div className="home-social-links">
              {(profile.social_links as any[])?.slice(0, 4).map((link) => (
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="home-social-link"
                >
                  <span>{link.platform}</span> <ExternalLink size={10} />
                </a>
              ))}
              {profile.contact_email && (
                <a
                  href={`mailto:${profile.contact_email}`}
                  className="home-social-link email"
                  title="Direct operator email"
                >
                  <Mail size={11} /> <span>contact</span>
                </a>
              )}
            </div>

            <a href="/profile" className="post-btn home-dossier-btn">
              VIEW DOSSIER →
            </a>
          </div>
        </div>
      </div>

      {/* CURRENTLY BUILDING (CLEANLY ALIGNED GRID) */}
      <div className="home-building-section">
        <div className="home-building-bar">
          <div className="home-building-tag">
            <span style={css("color: var(--accent);")}>//</span>
            <span>CURRENTLY BUILDING</span>
            <span className="jp-sub" style={css("font-size: 0.65rem; color: var(--text-3); font-weight: 300;")}>現在開発中</span>
          </div>
          {currentlyBuilding.length > 0 && (
            <span className="home-building-meta">
              // {Math.min(currentlyBuilding.length, 3)} OF {currentlyBuilding.length} ACTIVE
            </span>
          )}
        </div>

        {currentlyBuilding.length === 0 ? (
          <div style={css("font-family: var(--mono); font-size: 0.72rem; color: var(--text-3); padding: 12px; background: var(--bg-0); border: 1px dashed var(--border-subtle); border-radius: 4px;")}>
            // no active projects currently listed
          </div>
        ) : (
          <div className="home-building-grid">
            {currentlyBuilding.slice(0, 3).map((item) => (
              <a
                href={item.url || '/profile'}
                target={item.url ? "_blank" : undefined}
                rel={item.url ? "noopener noreferrer" : undefined}
                className="home-building-card"
              >
                <div className="home-building-card-head">
                  <div className="home-building-card-title">
                    <ArrowRight size={12} className="home-building-arrow" />
                    <span>{item.title}</span>
                  </div>
                  {item.badge && (
                    <span className={`project-badge ${item.badge.toLowerCase()}`}>
                      {item.badge}
                    </span>
                  )}
                </div>

                <p className="home-building-card-desc">{item.description}</p>

                <div className="home-building-card-foot">
                  <span className="home-building-card-link-text">
                    {formatProjectHost(item.url)}
                  </span>
                  <ArrowUpRight size={12} className="home-building-arrow-icon" />
                </div>
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  </section>

  <div className="divider"></div>

  {/* MUSIC PLAYER (SPINNING VINYL) */}
  <section className="section" id="player">
    <div className="section-head reveal">
      <h2>now spinning</h2>
      <span className="jp-label">音楽</span>
      <div className="line"></div>
      <a href="/music" className="music-more-link">all tracks →</a>
    </div>

    {tracks.length === 0 ? (
      <div className="bracket-card empty-state reveal">
        <div className="empty-state-glyph"><Disc3 size={36} /></div>
        <div className="empty-state-title">NO TRACKS SPINNING</div>
        <p className="empty-state-desc">
          Turntable is idling. No vinyl records are currently on rotation.
        </p>
        <span className="empty-state-meta">// status: idle — awaiting audio stream</span>
      </div>
    ) : (
      <div className="player-wrap bracket-card reveal">
        {/* VINYL TURNTABLE */}
        <div className="vinyl-area" id="vinylArea" onClick={(e) => { const w = window as any; togglePlay() }} title="Click to play / pause">
          <div className="vinyl-ring"></div>
          <div className="vinyl" id="vinyl">
            <div className="vinyl-label" id="vinylLabel">
              <img
                id="vinylCoverImg"
                className="vinyl-cover-img"
                src={tracks[0]?.cover_url || ''}
                alt="Vinyl Center Label"
                style={tracks[0]?.cover_url ? undefined : { display: 'none' }}
              />
              <span id="vinylFallbackText" style={tracks[0]?.cover_url ? { display: 'none' } : undefined}>KRZ</span>
              <div className="vinyl-spindle"></div>
            </div>
          </div>
        </div>

        {/* PLAYER CONTROLS & METADATA */}
        <div className="player-info">
          <div className="track-now-label"><span className="pulse" id="nowPlayingPulse"></span> NOW PLAYING</div>
          <div className="track-title" id="trackTitle">{tracks[0]?.title}</div>
          <div className="track-artist" id="trackArtist">
            {tracks[0]?.artist}{tracks[0]?.album ? ` \u2014 [${tracks[0].album}]` : ''}
          </div>

          <div className="controls">
            <button className="ctrl-btn" onClick={() => { (window as any).prevTrack?.(); }} title="Previous track"><SkipBack size={14} /></button>
            <button className="ctrl-btn play" id="playBtn" onClick={() => { (window as any).togglePlay?.(); }} title="Play / Pause"><Play size={14} /></button>
            <button className="ctrl-btn" onClick={() => { (window as any).nextTrack?.(); }} title="Next track"><SkipForward size={14} /></button>
          </div>

          <div
            className="progress-track"
            id="progressBar"
            role="slider"
            aria-label="Audio playback seek bar"
            aria-valuemin={0}
            aria-valuemax={100}
            tabIndex={0}
            onClick={(e) => { (window as any).seekTrack?.(e); }}
            onPointerDown={(e) => { (window as any).startScrub?.(e); }}
          >
            <div className="progress-fill" id="progress"></div>
          </div>

          <div className="time-display">
            <span id="currentTime">0:00</span>
            <span id="totalTime">{tracks[0]?.duration || '0:00'}</span>
          </div>
        </div>
      </div>
    )}
  </section>

  {/* OPERATOR EDIT POST MODAL */}
  {authenticated && (
    <EditPostModal
      isOpen={!!editingPost}
      post={editingPost}
      initialMedia={editingMedia}
      onClose={() => setEditingPost(null)}
      onSaved={() => window.location.reload()}
      onDeleted={() => window.location.reload()}
    />
  )}

  {/* STORE TRACKS DATA IN CLIENT DATASET */}
  <div id="tracksDataStore" data-tracks={JSON.stringify(tracks)} style={css("display: none;")}></div>


    </>
  );
}
