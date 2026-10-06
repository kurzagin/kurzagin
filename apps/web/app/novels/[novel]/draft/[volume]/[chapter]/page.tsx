import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, BookOpen, Clock, MapPin, Users, Tag } from 'lucide-react';
import { getNovelBySlug } from '@/lib/novels';
import { getNovelDraft, getAllNovelDrafts } from '@/lib/drafts';

interface Props {
  params: Promise<{ novel: string; volume: string; chapter: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { novel, volume, chapter } = await params;
  const draft = await getNovelDraft(novel, volume, chapter);
  return { title: `${draft?.metadata.title || chapter} — draft — ${novel} — kurzagin` };
}

export default async function NovelDraftReaderPage({ params }: Props) {
  const { novel, volume, chapter } = await params;
  const novelData = getNovelBySlug(novel);
  const draft = await getNovelDraft(novel, volume, chapter);

  if (!novelData || !draft) {
    notFound();
  }

  // Find previous and next chapters
  const allDrafts = getAllNovelDrafts(novel);
  const currentIndex = allDrafts.findIndex(
    (d) => d.folder.toLowerCase() === volume.toLowerCase() && d.slug.toLowerCase() === chapter.toLowerCase()
  );
  const prevChapter = currentIndex > 0 ? allDrafts[currentIndex - 1] : null;
  const nextChapter = currentIndex >= 0 && currentIndex < allDrafts.length - 1 ? allDrafts[currentIndex + 1] : null;

  return (
    <>
      <div className="page-header">
        <div style={{ marginBottom: '12px' }}>
          <Link
            href={`/novels/${novel}/draft`}
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
            <ArrowLeft size={12} /> back to drafts index
          </Link>
        </div>
        <h1><span className="hl">{draft.metadata.title}</span></h1>
        <div className="page-sub">
          <span className="jp-label">草稿</span> — {draft.folder.replace(/-/g, ' ').toUpperCase()} // {draft.metadata.type?.toUpperCase()}
        </div>
      </div>

      <section className="section">
        {/* Chapter Metadata Card */}
        <div
          className="bracket-card"
          style={{
            padding: '18px 22px',
            marginBottom: '28px',
            background: 'var(--bg-1)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '6px',
          }}
        >
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px', alignItems: 'center', justifyContent: 'space-between' }}>
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
                }}
              >
                VOLUME {draft.metadata.volume}
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
                CHAPTER {draft.metadata.chapter}
              </span>
            </div>

            {draft.metadata.timeline_date && (
              <span style={{ fontSize: '0.75rem', fontFamily: 'var(--mono)', color: 'var(--text-3)' }}>
                TIMELINE: {draft.metadata.timeline_date}
              </span>
            )}
          </div>

          {draft.metadata.summary && (
            <p style={{ marginTop: '14px', marginBottom: 0, fontSize: '0.86rem', color: 'var(--text-2)', lineHeight: 1.6, fontStyle: 'italic' }}>
              "{draft.metadata.summary}"
            </p>
          )}

          {(draft.metadata.location || (draft.metadata.pov_characters && draft.metadata.pov_characters.length > 0)) && (
            <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', marginTop: '12px', fontSize: '0.72rem', color: 'var(--text-3)', fontFamily: 'var(--mono)' }}>
              {draft.metadata.location && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <MapPin size={12} style={{ color: 'var(--accent)' }} /> {draft.metadata.location}
                </span>
              )}
              {draft.metadata.pov_characters && draft.metadata.pov_characters.length > 0 && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <Users size={12} style={{ color: 'var(--accent)' }} /> POV: {draft.metadata.pov_characters.join(', ')}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Manuscript Reader Body */}
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
          dangerouslySetInnerHTML={{ __html: draft.contentHtml }}
        />

        {/* Chapter Navigation Footer */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '32px', gap: '16px', flexWrap: 'wrap' }}>
          {prevChapter ? (
            <Link
              href={`/novels/${novel}/draft/${prevChapter.folder}/${prevChapter.slug}`}
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
              ← Previous: {prevChapter.metadata.title}
            </Link>
          ) : <div />}

          {nextChapter && (
            <Link
              href={`/novels/${novel}/draft/${nextChapter.folder}/${nextChapter.slug}`}
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
              Next: {nextChapter.metadata.title} →
            </Link>
          )}
        </div>
      </section>
    </>
  );
}
