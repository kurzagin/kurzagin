import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Edit3, ArrowLeft, ChevronRight, BookOpen, Clock, MapPin, Users } from 'lucide-react';
import { getNovelBySlug } from '@/lib/novels';
import { getAllNovelDrafts } from '@/lib/drafts';

interface Props {
  params: Promise<{ novel: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { novel } = await params;
  const novelData = getNovelBySlug(novel);
  return { title: `drafts — ${novelData?.title || novel} — kurzagin` };
}

export default async function NovelDraftPage({ params }: Props) {
  const { novel } = await params;
  const novelData = getNovelBySlug(novel);

  if (!novelData) {
    notFound();
  }

  const drafts = getAllNovelDrafts(novel);

  // Group drafts by volume / folder
  const groupedVolumes: Record<string, typeof drafts> = {};
  for (const draft of drafts) {
    const volKey = draft.folder.replace(/-/g, ' ').toUpperCase();
    if (!groupedVolumes[volKey]) groupedVolumes[volKey] = [];
    groupedVolumes[volKey].push(draft);
  }

  return (
    <>
      <div className="page-header">
        <div style={{ marginBottom: '12px' }}>
          <Link
            href={`/novels/${novel}`}
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
            <ArrowLeft size={12} /> back to {novelData.title}
          </Link>
        </div>
        <h1><span className="hl">draft</span> manuscripts</h1>
        <div className="page-sub">
          <span className="jp-label">草稿</span> — {drafts.length} work-in-progress chapters & volume manuscripts
        </div>
      </div>

      <section className="section">
        {drafts.length === 0 ? (
          <div className="bracket-card empty-state">
            <div className="empty-state-glyph"><Edit3 size={36} /></div>
            <div className="empty-state-title">NO DRAFTS LOGGED</div>
            <p className="empty-state-desc">
              No manuscript drafts or rough cuts found for this novel.
              WIP chapters and volume folders will appear here once connected.
            </p>
            <span className="empty-state-meta">// status: idle — awaiting manuscript ingestion</span>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            {Object.entries(groupedVolumes).map(([volumeTitle, chapters]) => (
              <div key={volumeTitle}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    marginBottom: '14px',
                    fontFamily: 'var(--mono)',
                    fontSize: '0.8rem',
                    color: 'var(--accent)',
                    borderBottom: '1px solid var(--border-subtle)',
                    paddingBottom: '8px',
                  }}
                >
                  <BookOpen size={16} />
                  <span>// {volumeTitle} ({chapters.length} CHAPTERS)</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
                  {chapters.map((ch) => (
                    <Link
                      key={`${ch.folder}-${ch.slug}`}
                      href={`/novels/${novel}/draft/${ch.folder}/${ch.slug}`}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        padding: '16px',
                        background: 'var(--bg-1)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: '6px',
                        textDecoration: 'none',
                        color: 'inherit',
                        transition: 'border-color 0.2s ease',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <span
                          style={{
                            fontFamily: 'var(--mono)',
                            fontSize: '0.68rem',
                            padding: '2px 6px',
                            background: 'var(--bg-2)',
                            borderRadius: '3px',
                            color: 'var(--text-3)',
                            border: '1px solid var(--border-subtle)',
                          }}
                        >
                          {ch.metadata.type?.toUpperCase() || 'CHAPTER'} {ch.metadata.chapter > 0 ? `#${ch.metadata.chapter}` : ''}
                        </span>

                        {ch.metadata.timeline_date && (
                          <span style={{ fontSize: '0.68rem', fontFamily: 'var(--mono)', color: 'var(--text-3)' }}>
                            {ch.metadata.timeline_date}
                          </span>
                        )}
                      </div>

                      <h3 style={{ fontSize: '0.98rem', margin: '0 0 6px', color: 'var(--text-1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        {ch.metadata.title}
                        <ChevronRight size={14} style={{ color: 'var(--text-3)' }} />
                      </h3>

                      {ch.metadata.summary && (
                        <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-3)', lineHeight: 1.5, flex: 1 }}>
                          {ch.metadata.summary}
                        </p>
                      )}

                      {(ch.metadata.location || (ch.metadata.pov_characters && ch.metadata.pov_characters.length > 0)) && (
                        <div style={{ display: 'flex', gap: '10px', marginTop: '10px', fontSize: '0.7rem', color: 'var(--text-3)', fontFamily: 'var(--mono)' }}>
                          {ch.metadata.location && (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              <MapPin size={11} /> {ch.metadata.location}
                            </span>
                          )}
                          {ch.metadata.pov_characters && ch.metadata.pov_characters.length > 0 && (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              <Users size={11} /> {ch.metadata.pov_characters.join(', ')}
                            </span>
                          )}
                        </div>
                      )}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
