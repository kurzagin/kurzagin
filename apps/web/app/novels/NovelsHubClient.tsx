'use client';

import { useState } from 'react';
import Link from 'next/link';
import { BookOpen, Sparkles, ScrollText, Zap } from 'lucide-react';
import type { NovelMeta } from '@/lib/novels';
import type { ShortStoryMeta } from '@/lib/shortStories';

interface NovelsHubClientProps {
  novels: NovelMeta[];
  shortStories: ShortStoryMeta[];
}

export default function NovelsHubClient({ novels, shortStories }: NovelsHubClientProps) {
  const [tab, setTab] = useState<'all' | 'novels' | 'shorts'>('all');

  const showNovels = tab === 'all' || tab === 'novels';
  const showShorts = tab === 'all' || tab === 'shorts';

  return (
    <>
      <div className="page-header">
        <h1>
          <span className="hl">archive</span> & stories
        </h1>
        <div className="page-sub">
          <span className="jp-label">目録</span> — serial manuscripts, one-shots & tactical codices
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="feed-filter-bar" style={{ marginBottom: '24px' }}>
        <button
          type="button"
          onClick={() => setTab('all')}
          className={`feed-filter-btn ${tab === 'all' ? 'active' : ''}`}
        >
          ALL ARCHIVES ({novels.length + shortStories.length})
        </button>
        <button
          type="button"
          onClick={() => setTab('novels')}
          className={`feed-filter-btn ${tab === 'novels' ? 'active' : ''}`}
        >
          SERIAL NOVELS ({novels.length})
        </button>
        <button
          type="button"
          onClick={() => setTab('shorts')}
          className={`feed-filter-btn ${tab === 'shorts' ? 'active' : ''}`}
        >
          <Sparkles size={11} style={{ display: 'inline', marginRight: '4px' }} />
          SHORT STORIES ({shortStories.length})
        </button>
      </div>

      {/* Serial Novels Section */}
      {showNovels && (
        <section className="section" style={{ marginBottom: showShorts && tab === 'all' ? '40px' : '0' }}>
          {tab === 'all' && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontFamily: 'var(--mono)',
                fontSize: '0.8rem',
                color: 'var(--text-3)',
                letterSpacing: '1px',
                marginBottom: '16px',
                borderBottom: '1px solid var(--border-subtle)',
                paddingBottom: '8px',
              }}
            >
              <BookOpen size={14} style={{ color: 'var(--accent)' }} />
              <span>// SERIAL NOVELS [長編小説]</span>
            </div>
          )}

          {novels.length === 0 ? (
            <div className="bracket-card empty-state">
              <div className="empty-state-glyph">
                <BookOpen size={36} />
              </div>
              <div className="empty-state-title">NO NOVELS REGISTERED</div>
              <p className="empty-state-desc">
                Serial manuscripts are currently unlinked or in incubation.
              </p>
              <span className="empty-state-meta">// status: ready — awaiting novel registration</span>
            </div>
          ) : (
            <div className="cards-grid">
              {novels.map((novel) => (
                <Link
                  key={novel.slug}
                  href={`/novels/${novel.slug}`}
                  className="item-card"
                  style={{ textDecoration: 'none' }}
                >
                  <div className="card-visual">
                    <BookOpen size={28} />
                  </div>
                  <div className="card-body">
                    <div className={`card-tag ${novel.status}`}>{novel.status}</div>
                    <h3 className="card-title">
                      {novel.title}{' '}
                      {novel.titleJp && (
                        <span style={{ opacity: 0.6, fontSize: '0.8em' }}>{novel.titleJp}</span>
                      )}
                    </h3>
                    {novel.tagline && (
                      <div
                        style={{
                          fontFamily: 'var(--mono)',
                          fontSize: '0.72rem',
                          color: 'var(--accent)',
                          marginBottom: '8px',
                        }}
                      >
                        {novel.tagline}
                      </div>
                    )}
                    <p className="card-desc">{novel.summary}</p>

                    {novel.stats && (
                      <div
                        style={{
                          display: 'flex',
                          gap: '8px',
                          fontSize: '0.7rem',
                          fontFamily: 'var(--mono)',
                          color: 'var(--text-3)',
                          margin: '10px 0 4px',
                        }}
                      >
                        <span>Drafts: {novel.stats.draftsCount}</span>
                        <span>·</span>
                        <span>Wiki: {novel.stats.wikiCount}</span>
                      </div>
                    )}

                    <div className="card-meta">
                      {novel.genres.map((g) => (
                        <span key={g}>{g}</span>
                      ))}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Short Stories Section */}
      {showShorts && (
        <section className="section">
          {tab === 'all' && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontFamily: 'var(--mono)',
                fontSize: '0.8rem',
                color: 'var(--text-3)',
                letterSpacing: '1px',
                marginBottom: '16px',
                borderBottom: '1px solid var(--border-subtle)',
                paddingBottom: '8px',
              }}
            >
              <Sparkles size={14} style={{ color: 'var(--accent)' }} />
              <span>// SHORT STORIES & ONE-SHOTS [短編・一発ネタ]</span>
            </div>
          )}

          {shortStories.length === 0 ? (
            <div className="bracket-card empty-state">
              <div className="empty-state-glyph">
                <Sparkles size={36} />
              </div>
              <div className="empty-state-title">NO SHORT STORIES YET</div>
              <p className="empty-state-desc">
                Quick inspiration strikes, comedic one-shots, and epic standalone ideas will appear here.
              </p>
              <span className="empty-state-meta">// status: ready — awaiting inspiration</span>
            </div>
          ) : (
            <div className="cards-grid">
              {shortStories.map((story) => (
                <Link
                  key={story.slug}
                  href={`/novels/shorts/${story.slug}`}
                  className="item-card"
                  style={{ textDecoration: 'none' }}
                >
                  <div
                    className="card-visual"
                    style={{
                      background: 'radial-gradient(circle, rgba(196, 147, 104, 0.08) 0%, transparent 70%)',
                    }}
                  >
                    <Zap size={28} style={{ color: 'var(--accent)' }} />
                  </div>
                  <div className="card-body">
                    <div className="card-tag">
                      {story.chaptersCount === 1 ? 'ONE-SHOT' : `${story.chaptersCount} CHAPTERS`}
                    </div>
                    <h3 className="card-title">
                      {story.title}{' '}
                      {story.titleJp && (
                        <span style={{ opacity: 0.6, fontSize: '0.8em' }}>{story.titleJp}</span>
                      )}
                    </h3>
                    {story.tagline && (
                      <div
                        style={{
                          fontFamily: 'var(--mono)',
                          fontSize: '0.72rem',
                          color: 'var(--accent)',
                          marginBottom: '8px',
                        }}
                      >
                        {story.tagline}
                      </div>
                    )}
                    <p className="card-desc">{story.summary}</p>

                    <div
                      style={{
                        display: 'flex',
                        gap: '8px',
                        fontSize: '0.7rem',
                        fontFamily: 'var(--mono)',
                        color: 'var(--text-3)',
                        margin: '10px 0 4px',
                      }}
                    >
                      <span>Status: {story.status}</span>
                      <span>·</span>
                      <span>{story.chaptersCount} {story.chaptersCount === 1 ? 'Chapter' : 'Chapters'}</span>
                    </div>

                    <div className="card-meta">
                      {story.genres.map((g) => (
                        <span key={g}>{g}</span>
                      ))}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      )}
    </>
  );
}
