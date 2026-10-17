import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Sparkles, BookOpen, Clock, Tag } from 'lucide-react';
import { getShortStory } from '@/lib/shortStories';
import CopyMarkdownButton from '@/components/novels/CopyMarkdownButton';

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ ch?: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const story = await getShortStory(slug);
  return {
    title: `${story?.title || slug} — short story — kurzagin`,
    description: story?.summary,
  };
}

export default async function ShortStoryReaderPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { ch } = await searchParams;
  const story = await getShortStory(slug);

  if (!story || story.chapters.length === 0) {
    notFound();
  }

  // Determine active chapter (1-indexed based on ch param or default to first chapter)
  const activeChapterIndex = ch ? Math.max(0, parseInt(ch, 10) - 1) : 0;
  const activeChapter = story.chapters[activeChapterIndex] || story.chapters[0];
  const activeChNum = activeChapterIndex + 1;

  const prevCh = activeChapterIndex > 0 ? activeChapterIndex : null;
  const nextCh = activeChapterIndex < story.chapters.length - 1 ? activeChapterIndex + 2 : null;

  return (
    <>
      <div className="page-header">
        <div className="novel-detail-actions">
          <Link
            href="/novels"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontFamily: 'var(--mono)',
              fontSize: '0.75rem',
              color: 'var(--text-3)',
              textDecoration: 'none',
            }}
          >
            <ArrowLeft size={12} /> back to novels archive
          </Link>
          <CopyMarkdownButton
            text={`# ${story.title}\n\n${activeChapter.rawContent.trim()}`}
          />
        </div>
        <h1>
          <span className="hl">{story.title}</span>{' '}
          {story.titleJp && (
            <span style={{ opacity: 0.6, fontSize: '0.7em' }}>{story.titleJp}</span>
          )}
        </h1>
        <div className="page-sub">
          <span className="jp-label">短編</span> —{' '}
          {story.tagline || 'short story & instant inspiration'}
        </div>
      </div>

      <section className="section">
        {/* Story Metadata Card */}
        <div
          className="bracket-card"
          style={{
            padding: '20px 24px',
            marginBottom: '28px',
            background: 'var(--bg-1)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '6px',
          }}
        >
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '12px',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '12px',
            }}
          >
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <span
                style={{
                  fontFamily: 'var(--mono)',
                  fontSize: '0.7rem',
                  padding: '2px 8px',
                  background: 'var(--bg-2)',
                  borderRadius: '3px',
                  color: 'var(--accent)',
                  border: '1px solid var(--border-subtle)',
                  textTransform: 'uppercase',
                }}
              >
                {story.status}
              </span>
              <span
                style={{
                  fontFamily: 'var(--mono)',
                  fontSize: '0.7rem',
                  padding: '2px 8px',
                  background: 'var(--bg-2)',
                  borderRadius: '3px',
                  color: 'var(--text-3)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                {story.chaptersCount === 1 ? 'ONE-SHOT' : `${story.chaptersCount} CHAPTERS`}
              </span>
            </div>

            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {story.genres.map((g) => (
                <span
                  key={g}
                  style={{
                    fontSize: '0.7rem',
                    fontFamily: 'var(--mono)',
                    color: 'var(--text-3)',
                    background: 'rgba(255, 255, 255, 0.04)',
                    padding: '2px 8px',
                    borderRadius: '2px',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  {g}
                </span>
              ))}
            </div>
          </div>

          {story.summary && (
            <p
              style={{
                fontSize: '0.88rem',
                color: 'var(--text-2)',
                lineHeight: 1.6,
                margin: '12px 0 0',
              }}
            >
              {story.summary}
            </p>
          )}

          {/* Chapter selector pills if more than 1 chapter */}
          {story.chapters.length > 1 && (
            <div
              style={{
                display: 'flex',
                gap: '8px',
                marginTop: '18px',
                paddingTop: '14px',
                borderTop: '1px dashed var(--border-subtle)',
                alignItems: 'center',
                flexWrap: 'wrap',
              }}
            >
              <span
                style={{
                  fontSize: '0.72rem',
                  fontFamily: 'var(--mono)',
                  color: 'var(--text-3)',
                  marginRight: '6px',
                }}
              >
                CHAPTERS:
              </span>
              {story.chapters.map((chItem, idx) => {
                const chNum = idx + 1;
                const isActive = chNum === activeChNum;
                return (
                  <Link
                    key={chItem.slug}
                    href={`/novels/shorts/${slug}?ch=${chNum}`}
                    className={`feed-filter-btn ${isActive ? 'active' : ''}`}
                    style={{ fontSize: '0.72rem' }}
                  >
                    Ch {chNum}: {chItem.title}
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Story Reader Body */}
        <article
          className="markdown-body"
          style={{
            background: 'var(--bg-1)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '6px',
            padding: '36px 30px',
            color: 'var(--text-1)',
            lineHeight: 1.85,
            fontSize: '1rem',
          }}
          dangerouslySetInnerHTML={{ __html: activeChapter.contentHtml }}
        />

        {/* Chapter Navigation Footer */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: '32px',
            gap: '16px',
            flexWrap: 'wrap',
          }}
        >
          {prevCh ? (
            <Link
              href={`/novels/shorts/${slug}?ch=${prevCh}`}
              style={{
                padding: '10px 18px',
                background: 'var(--bg-1)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '6px',
                fontSize: '0.8rem',
                fontFamily: 'var(--mono)',
                color: 'var(--text-2)',
                textDecoration: 'none',
              }}
            >
              ← Previous: Chapter {prevCh}
            </Link>
          ) : (
            <div />
          )}

          {nextCh && (
            <Link
              href={`/novels/shorts/${slug}?ch=${nextCh}`}
              style={{
                padding: '10px 18px',
                background: 'var(--bg-1)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '6px',
                fontSize: '0.8rem',
                fontFamily: 'var(--mono)',
                color: 'var(--text-2)',
                textDecoration: 'none',
              }}
            >
              Next: Chapter {nextCh} →
            </Link>
          )}
        </div>
      </section>
    </>
  );
}
