// @ts-nocheck
'use client';

import React from 'react';
import Link from 'next/link';
import {
  Tv,
  Plus,
  Search,
  Star,
  MessageSquare,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  ExternalLink,
  Film,
  Trash2,
  Edit3,
  Check,
  AlertCircle,
  Clock,
  Sparkles,
  Share2,
  X,
} from 'lucide-react';
import { css } from '../_ui/css';
import AnimeClient from './AnimeClient';
import './anime.css';

function formatReviewType(type: string) {
  switch (type) {
    case 'first_impression':
      return 'FIRST IMPRESSION';
    case 'mid_watch':
    case 'episodic':
      return 'MID-WATCH LOG';
    case 'final':
      return 'FINAL VERDICT';
    case 'dropped':
      return 'DROPPED LOG';
    case 'rewatch':
      return 'REWATCH LOG';
    default:
      return type.replace(/_/g, ' ').toUpperCase();
  }
}

function formatDate(dateStr: string | Date) {
  try {
    const d = new Date(dateStr);
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const yy = String(d.getFullYear()).slice(-2);
    return `${yy}.${mm}.${dd}`;
  } catch {
    return 'recently';
  }
}

interface AnimeViewProps {
  authenticated: boolean;
  initialStatus: string;
  initialPage: number;
  stats: any;
  allAnimeItems: any[];
  filteredAnimeItems: any[];
  totalFiltered: number;
  totalPages: number;
  safePage: number;
  startIndex: number;
  endIndex: number;
  ssrPaginationItems: (number | string)[];
}

export default function AnimeView({
  authenticated,
  initialStatus,
  initialPage,
  stats,
  allAnimeItems,
  filteredAnimeItems,
  totalFiltered,
  totalPages,
  safePage,
  startIndex,
  endIndex,
  ssrPaginationItems,
}: AnimeViewProps) {
  return (
    <>
      <AnimeClient />
  <div className="page-header">
    <div style={css("display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 16px;")}>
      <div>
        <h1><span className="hl">anime</span> log</h1>
        <div className="page-sub">
          <span className="jp-label">アニメ</span> — watching, rewatching, remembering • synced via AniList
        </div>
      </div>
      {authenticated && (
        <button className="add-anime-btn" onClick={(e) => { const w = window as any; openAddAnimeModal() }}>
          <Plus size={16} /> // ADD ANIME (ANILIST)
        </button>
      )}
    </div>
  </div>

  {/* STATS BAR */}
  <div className="anime-stats-bar bracket-card reveal">
    <div className="stat-item">
      <span className="stat-num">{stats.total}</span>
      <span className="stat-label">TOTAL LOGGED</span>
    </div>
    <div className="stat-divider"></div>
    <div className="stat-item highlight">
      <span className="stat-num">{stats.watching}</span>
      <span className="stat-label">WATCHING</span>
    </div>
    <div className="stat-divider"></div>
    <div className="stat-item">
      <span className="stat-num">{stats.completed}</span>
      <span className="stat-label">COMPLETED</span>
    </div>
    <div className="stat-divider"></div>
    <div className="stat-item">
      <span className="stat-num">{stats.planning}</span>
      <span className="stat-label">PLANNING</span>
    </div>
    <div className="stat-divider"></div>
    <div className="stat-item">
      <span className="stat-num">{stats.totalEpisodes}</span>
      <span className="stat-label">EPISODES WATCHED</span>
    </div>
  </div>

  {/* FILTER TABS BAR */}
  <div className="anime-filter-bar">
    <button type="button" className={`anime-filter-btn ${initialStatus === 'all' ? 'active' : ''}`} data-status="all" onClick={(e) => { const w = window as any; setAnimeFilter('all') }}>
      // ALL ({stats.total})
    </button>
    <button type="button" className={`anime-filter-btn ${initialStatus === 'watching' ? 'active' : ''}`} data-status="watching" onClick={(e) => { const w = window as any; setAnimeFilter('watching') }}>
      WATCHING ({stats.watching})
    </button>
    <button type="button" className={`anime-filter-btn ${initialStatus === 'completed' ? 'active' : ''}`} data-status="completed" onClick={(e) => { const w = window as any; setAnimeFilter('completed') }}>
      COMPLETED ({stats.completed})
    </button>
    <button type="button" className={`anime-filter-btn ${initialStatus === 'planning' ? 'active' : ''}`} data-status="planning" onClick={(e) => { const w = window as any; setAnimeFilter('planning') }}>
      PLAN TO WATCH ({stats.planning})
    </button>
    {stats.paused > 0 && (
      <button type="button" className={`anime-filter-btn ${initialStatus === 'paused' ? 'active' : ''}`} data-status="paused" onClick={(e) => { const w = window as any; setAnimeFilter('paused') }}>
        PAUSED ({stats.paused})
      </button>
    )}
    {stats.dropped > 0 && (
      <button type="button" className={`anime-filter-btn ${initialStatus === 'dropped' ? 'active' : ''}`} data-status="dropped" onClick={(e) => { const w = window as any; setAnimeFilter('dropped') }}>
        DROPPED ({stats.dropped})
      </button>
    )}
  </div>

  {/* META STATUS / SORT INFO BAR */}
  <div className="anime-meta-bar">
    <div className="anime-meta-left">
      <span className="meta-pill">// SORT: YEAR (NEWEST → OLDEST)</span>
      <span className="meta-pill">// LIMIT: 20 / PAGE</span>
    </div>
    <div className="anime-meta-right" id="metaStatusCount">
      {totalFiltered > 0 ? (
        <span>
          SHOWING <strong className="hl">{startIndex + 1}&ndash;{Math.min(endIndex, totalFiltered)}</strong> OF {totalFiltered} TITLES
        </span>
      ) : (
        <span>0 TITLES FOUND</span>
      )}
    </div>
  </div>

  <section className="section">
    {allAnimeItems.length === 0 ? (
      <div className="bracket-card empty-state" id="noAnimeLogged">
        <div className="empty-state-glyph"><Tv size={36} /></div>
        <div className="empty-state-title">NO ANIME LOGGED</div>
        <p className="empty-state-desc">
          The broadcast is silent. No series currently watching, completed, or queued in the log.
        </p>
        <span className="empty-state-meta">
          {authenticated
            ? '// operator ready — query AniList to log your first series'
            : '// status: idle — awaiting curator entries'}
        </span>
        {authenticated && (
          <div style={css("margin-top: 18px;")}>
            <button
              type="button"
              className="post-btn"
              style={css("cursor: pointer; font-size: 0.75rem; display: inline-flex; align-items: center; gap: 6px;")}
              onClick={(e) => { const w = window as any; openAddAnimeModal() }}
            >
              <Plus size={14} /> // ADD ANIME (ANILIST) →
            </button>
          </div>
        )}
      </div>
    ) : (
      <>
        {/* CATEGORY EMPTY STATE (WHEN FILTER HAS 0 TITLES, e.g. WATCHING) */}
        <div
          className="bracket-card empty-state"
          id="categoryEmptyState"
          style={allAnimeItems.length > 0 && totalFiltered === 0 ? undefined : { display: 'none' }}
        >
          <div className="empty-state-glyph"><Tv size={36} /></div>
          <div className="empty-state-title" id="categoryEmptyTitle">
            {totalFiltered === 0 && initialStatus !== 'all'
              ? `NO TITLES IN "${initialStatus.toUpperCase()}"`
              : 'NO TITLES IN CATEGORY'}
          </div>
          <p className="empty-state-desc" id="categoryEmptyDesc">
            {totalFiltered === 0 && initialStatus !== 'all'
              ? `No anime series found under status "${initialStatus}". Switch tabs to browse other entries.`
              : 'No anime series found under this status filter.'}
          </p>
          <span className="empty-state-meta">// status: category currently empty</span>
          <div style={css("margin-top: 18px;")}>
            <button
              type="button"
              className="post-btn"
              style={css("cursor: pointer; font-size: 0.75rem; display: inline-flex; align-items: center; gap: 6px;")}
              onClick={(e) => { const w = window as any; setAnimeFilter('all') }}
            >
              // VIEW ALL TITLES ({allAnimeItems.length}) →
            </button>
          </div>
        </div>

        <div className="anime-grid" id="animeGrid" style={totalFiltered === 0 ? { display: 'none' } : undefined}>
          {allAnimeItems.map((item) => {
            const matchesFilter =
              initialStatus === 'all'
                ? true
                : initialStatus === 'paused'
                ? item.status === 'paused' || item.status === 'on_hold'
                : item.status === initialStatus;
            
            const matchedIndex = matchesFilter ? filteredAnimeItems.indexOf(item) : -1;
            const isVisibleOnPage = matchesFilter && matchedIndex >= startIndex && matchedIndex < endIndex;

            const progressPercent = item.total_episodes
              ? Math.min(100, Math.round(((item.current_episode || 0) / item.total_episodes) * 100))
              : (item.current_episode ? 50 : 0);
            return (
            <div
              className="anime-card bracket-card"
              data-status={item.status}
              data-year={item.season_year || 0}
              id={`anime-${item.id}`}
              style={isVisibleOnPage ? undefined : { display: 'none' }}
            >
              {/* COVER IMAGE */}
              <div className="anime-card-cover-wrap">
                {item.cover_url ? (
                  <img src={item.cover_url} alt={item.title} className="anime-card-cover" loading="lazy" />
                ) : (
                  <div className="anime-card-cover-placeholder">
                    <Tv size={32} />
                  </div>
                )}
                <span className={`anime-status-badge ${item.status}`}>
                  {item.status.toUpperCase()}
                </span>
                {item.score && (
                  <span className="anime-score-badge">
                    <Star size={12} fill="var(--accent)" color="var(--accent)" /> {item.score}/10
                  </span>
                )}
              </div>

              {/* CARD CONTENT */}
              <div className="anime-card-content">
                <div className="anime-card-header">
                  <h3 className="anime-card-title" title={item.title}>{item.title}</h3>
                  {item.romaji_title && item.romaji_title !== item.title && (
                    <div className="anime-card-romaji">{item.romaji_title}</div>
                  )}
                  <div className="anime-card-meta">
                    <span className="format-pill">{item.format || 'TV'}</span>
                    {item.season_year && <span>{item.season_year}</span>}
                    {item.studio && <span>{item.studio}</span>}
                  </div>
                </div>

                {/* PROGRESS BAR & COUNTER */}
                <div className="anime-progress-section">
                  <div className="anime-progress-labels">
                    <span className="progress-label">PROGRESS:</span>
                    <span className="progress-val">
                      EP <strong id={`ep-val-${item.id}`}>{item.current_episode}</strong> / {item.total_episodes || '?'}
                    </span>
                  </div>
                  <div className="anime-progress-bar">
                    <div
                      className="anime-progress-fill"
                      id={`bar-${item.id}`}
                      style={{ width: `${progressPercent}%` }}
                    ></div>
                  </div>
                </div>

                {/* OPERATOR CONTROLS */}
                {authenticated && (
                  <div className="anime-operator-row">
                    <button
                      className="quick-ep-btn"
                      title="Increment episode +1"
                      onclick={`incrementEpisode('${item.id}', ${item.current_episode}, ${item.total_episodes || 'null'})`}
                    >
                      +1 EP
                    </button>
                    <button
                      className="quick-review-btn"
                      title="Post episode review / log"
                      onclick={`openReviewModal('${item.id}', '${item.title.replace(/'/g, "\\'")}', ${item.current_episode}, ${item.total_episodes || 'null'})`}
                    >
                      <MessageSquare size={13} /> // LOG REVIEW
                    </button>
                    <button
                      className="quick-edit-btn"
                      title="Edit progress & status"
                      onclick={`openEditModal('${item.id}', '${item.title.replace(/'/g, "\\'")}', ${item.current_episode}, ${item.total_episodes || "null"}, '${item.status}', ${item.score || "null"})`}
                    >
                      <Edit3 size={13} />
                    </button>
                    <button
                      className="quick-delete-btn"
                      title="Remove from watchlist"
                      onclick={`deleteAnime('${item.id}', '${item.title.replace(/'/g, "\\'")}')`}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                )}

                {/* LATEST REVIEW / EPISODIC LOG SNIPPET */}
                {item.latest_review ? (
                  <div className="anime-card-review-preview">
                    <div className="review-preview-header">
                      <span className="review-pill-type">
                        {formatReviewType(item.latest_review.review_type)}
                      </span>
                      {item.latest_review.episode !== null && (
                        <span className="review-pill-ep">EP {item.latest_review.episode}</span>
                      )}
                      {item.latest_review.rating && (
                        <span className="review-pill-rating">★ {item.latest_review.rating}/10</span>
                      )}
                      <span className="review-preview-date">{formatDate(item.latest_review.created_at)}</span>
                    </div>

                    {item.latest_review.has_spoilers ? (
                      <details className="spoiler-drawer">
                        <summary className="spoiler-summary">// ⚠️ Contains spoilers (click to reveal)</summary>
                        <p className="review-text">{item.latest_review.content}</p>
                      </details>
                    ) : (
                      <p className="review-text">{item.latest_review.content}</p>
                    )}

                    {item.reviews.length > 1 && (
                      <button
                        className="toggle-all-reviews-btn"
                        onclick={`toggleReviewsDrawer('${item.id}')`}
                      >
                        // view all {item.reviews.length} logs &darr;
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="no-reviews-note">
                    // no review logs yet {authenticated && '— click [LOG REVIEW] to add'}
                  </div>
                )}

                {/* FULL REVIEWS DRAWER (COLLAPSIBLE) */}
                {item.reviews.length > 1 && (
                  <div className="reviews-drawer" id={`reviews-drawer-${item.id}`} style={css("display: none;")}>
                    <div className="drawer-title">// ALL EPISODE LOGS & REVIEWS:</div>
                    <div className="reviews-timeline">
                      {item.reviews.map((rev) => (
                        <div className="timeline-review-entry">
                          <div className="timeline-header">
                            <span className="timeline-badge type">{formatReviewType(rev.review_type)}</span>
                            {rev.episode !== null && (
                              <span className="timeline-badge ep">EP {rev.episode}</span>
                            )}
                            {rev.rating && (
                              <span className="timeline-badge rating">★ {rev.rating}/10</span>
                            )}
                            <span className="timeline-date">{formatDate(rev.created_at)}</span>
                          </div>
                          {rev.has_spoilers ? (
                            <details className="spoiler-drawer">
                              <summary className="spoiler-summary">// ⚠️ Spoilers</summary>
                              <p className="timeline-content">{rev.content}</p>
                            </details>
                          ) : (
                            <p className="timeline-content">{rev.content}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

        {/* PAGINATION BAR */}
        <nav
          className="anime-pagination bracket-card"
          id="animePagination"
          style={totalPages > 1 ? undefined : { display: 'none' }}
          aria-label="Anime watchlist pagination"
        >
          <div className="pagination-info" id="paginationInfo">
            PAGE <span className="hl">{safePage}</span> OF {totalPages} • {totalFiltered} TITLES
          </div>

          <div className="pagination-controls">
            <button
              type="button"
              className={`pagination-btn ${safePage <= 1 ? 'disabled' : ''}`}
              id="paginationPrevBtn"
              disabled={safePage <= 1}
              onClick={(e) => { const w = window as any; goToAnimePage(currentAnimePage - 1) }}
            >
              <ChevronLeft size={14} /> PREV
            </button>

            <div className="pagination-pages" id="paginationPagesContainer">
              {ssrPaginationItems.map((item) =>
                item === '...' ? (
                  <span className="pagination-ellipsis">&hellip;</span>
                ) : (
                  <button
                    type="button"
                    className={`pagination-page ${Number(item) === safePage ? 'active' : ''}`}
                    aria-current={Number(item) === safePage ? 'page' : undefined}
                    onclick={`goToAnimePage(${item})`}
                  >
                    {item}
                  </button>
                )
              )}
            </div>

            <button
              type="button"
              className={`pagination-btn ${safePage >= totalPages ? 'disabled' : ''}`}
              id="paginationNextBtn"
              disabled={safePage >= totalPages}
              onClick={(e) => { const w = window as any; goToAnimePage(currentAnimePage + 1) }}
            >
              NEXT <ChevronRight size={14} />
            </button>
          </div>
        </nav>
      </>
    )}
  </section>

  {/* MODAL 1: ADD ANIME FROM ANILIST */}
  <div id="addAnimeModal" className="cyber-modal-overlay" style={css("display: none;")}>
    <div className="cyber-modal bracket-card">
      <div className="modal-header">
        <div className="modal-title">
          <span className="hl">QUERY ANILIST</span> // ADD TO WATCHLIST
        </div>
        <button className="modal-close-btn" onClick={(e) => { const w = window as any; closeAddAnimeModal() }}>×</button>
      </div>

      <div className="modal-search-row">
        <input
          type="text"
          id="anilistSearchInput"
          placeholder="Search anime title on AniList (e.g. Frieren, Evangelion, Lain)..."
          onInput={(e) => { const w = window as any; handleAniListSearchDebounced() }}
        />
        <button className="search-action-btn" onClick={(e) => { const w = window as any; searchAniListDirect() }}>
          <Search size={16} /> SEARCH
        </button>
      </div>

      <div id="searchResultsList" className="search-results-container">
        <div className="search-hint">// type a title above to fetch metadata & cover art from AniList</div>
      </div>

      {/* SELECTED ANIME STAGING FORM */}
      <div id="selectedAnimeStaging" style={css("display: none;")} className="anime-staging-form">
        <div className="staging-head">
          <img id="stagingCover" src="" alt="Selected Cover" className="staging-cover" />
          <div className="staging-info">
            <h4 id="stagingTitle" className="staging-title"></h4>
            <div id="stagingMeta" className="staging-meta"></div>
            <div id="stagingDesc" className="staging-desc"></div>
          </div>
        </div>

        <div className="staging-fields-grid">
          <div className="form-group">
            <label htmlFor="stagingStatus">// WATCHLIST STATUS</label>
            <select id="stagingStatus" onChange={(e) => { const w = window as any; handleStagingStatusChange() }}>
              <option value="watching">Watching (視聴中)</option>
              <option value="completed">Completed (完了)</option>
              <option value="planning">Plan to Watch (見たい)</option>
              <option value="paused">Paused / On Hold</option>
              <option value="dropped">Dropped</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="stagingCurrentEp">// CURRENT EPISODE</label>
            <input type="number" id="stagingCurrentEp" min="0" value="0" onInput={(e) => { const w = window as any; handleStagingEpChange() }} />
          </div>

          <div className="form-group">
            <label htmlFor="stagingScore">// SCORE (1 - 10)</label>
            <input type="number" id="stagingScore" min="1" max="10" placeholder="Optional" />
          </div>
        </div>

        <div className="staging-actions">
          <button className="staging-cancel-btn" onClick={(e) => { const w = window as any; clearSelectedAnime() }}>BACK TO RESULTS</button>
          <button className="staging-submit-btn" id="confirmAddAnimeBtn" onClick={(e) => { const w = window as any; submitAddAnime() }}>
            + COMMIT TO WATCHLIST
          </button>
        </div>
      </div>
    </div>
  </div>

  {/* MODAL 2: ADD REVIEW / LOG EPISODE */}
  <div id="reviewModal" className="cyber-modal-overlay" style={css("display: none;")}>
    <div className="cyber-modal bracket-card">
      <div className="modal-header">
        <div className="modal-title">
          <span className="hl">LOG / REVIEW</span> // <span id="reviewModalAnimeTitle">Anime</span>
        </div>
        <button className="modal-close-btn" onClick={(e) => { const w = window as any; closeReviewModal() }}>×</button>
      </div>

      <input type="hidden" id="reviewAnimeId" value="" />

      <div className="modal-form-body">
        <div className="modal-fields-row">
          <div className="form-group">
            <label htmlFor="reviewEpisode">// WATCHED EPISODE</label>
            <input
              type="number"
              id="reviewEpisode"
              placeholder="e.g. 10 (or blank for series)"
              min="1"
            />
            <span className="input-hint">e.g. 10 for mid-watch review</span>
          </div>

          <div className="form-group">
            <label htmlFor="reviewType">// REVIEW STAGE / CATEGORY</label>
            <select id="reviewType" onChange={(e) => { const w = window as any; handleReviewTypeChange() }}>
              <option value="mid_watch">Mid-Watch / Episodic Log</option>
              <option value="first_impression">First Impression (Ep 1-3)</option>
              <option value="final">Final Verdict (Completed)</option>
              <option value="rewatch">Rewatch Impressions</option>
              <option value="dropped">Dropped Thoughts</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="reviewRating">// RATING (1 - 10)</label>
            <input
              type="number"
              id="reviewRating"
              placeholder="Score 1-10"
              min="1"
              max="10"
            />
          </div>
        </div>

        <div className="form-group" style={css("margin-top: 12px;")}>
          <label htmlFor="reviewContent">// REVIEW THOUGHTS & LOG ENTRY</label>
          <textarea
            id="reviewContent"
            rows="5"
            placeholder="Write your impressions, thoughts on animation, music, directing, pacing, or arc climax..."
          ></textarea>
        </div>

        <div className="review-checkboxes-row">
          <label className="cyber-checkbox-label">
            <input type="checkbox" id="reviewHasSpoilers" />
            <span>⚠️ Contains Spoilers (protect with click-to-reveal)</span>
          </label>

          <label className="cyber-checkbox-label">
            <input type="checkbox" id="reviewShareToFeed" checked />
            <span>📡 Broadcast review to main blog feed (index)</span>
          </label>
        </div>

        <div className="modal-actions-footer">
          <button className="staging-cancel-btn" onClick={(e) => { const w = window as any; closeReviewModal() }}>CANCEL</button>
          <button className="staging-submit-btn" id="submitReviewBtn" onClick={(e) => { const w = window as any; submitReview() }}>
            PUBLISH REVIEW LOG →
          </button>
        </div>
      </div>
    </div>
  </div>

  {/* MODAL 3: EDIT PROGRESS & STATUS */}
  <div id="editModal" className="cyber-modal-overlay" style={css("display: none;")}>
    <div className="cyber-modal bracket-card">
      <div className="modal-header">
        <div className="modal-title">
          <span className="hl">UPDATE PROGRESS</span> // <span id="editModalAnimeTitle">Anime</span>
        </div>
        <button className="modal-close-btn" onClick={(e) => { const w = window as any; closeEditModal() }}>×</button>
      </div>

      <input type="hidden" id="editAnimeId" value="" />

      <div className="modal-form-body">
        <div className="staging-fields-grid">
          <div className="form-group">
            <label htmlFor="editStatus">// STATUS</label>
            <select id="editStatus" onChange={(e) => { const w = window as any; handleEditStatusChange() }}>
              <option value="watching">Watching</option>
              <option value="completed">Completed</option>
              <option value="planning">Plan to Watch</option>
              <option value="paused">Paused</option>
              <option value="dropped">Dropped</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="editEpisode">// CURRENT EPISODE</label>
            <input type="number" id="editEpisode" min="0" onInput={(e) => { const w = window as any; handleEditEpChange() }} />
          </div>

          <div className="form-group">
            <label htmlFor="editTotalEpisodes">// TOTAL EPISODES</label>
            <input type="number" id="editTotalEpisodes" min="1" placeholder="Unknown if ongoing" onInput={(e) => { const w = window as any; handleEditStatusChange() }} />
          </div>

          <div className="form-group">
            <label htmlFor="editScore">// SCORE (1 - 10)</label>
            <input type="number" id="editScore" min="1" max="10" placeholder="Unrated" />
          </div>
        </div>

        <div className="modal-actions-footer">
          <button className="staging-cancel-btn" onClick={(e) => { const w = window as any; closeEditModal() }}>CANCEL</button>
          <button className="staging-submit-btn" id="saveEditBtn" onClick={(e) => { const w = window as any; submitEditProgress() }}>
            SAVE PROGRESS
          </button>
        </div>
      </div>
    </div>
  </div>

    </>
  );
}
