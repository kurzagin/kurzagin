import Link from 'next/link';
import { Edit3, ArrowLeft } from 'lucide-react';

interface Props {
  params: Promise<{ novel: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { novel } = await params;
  return { title: `drafts — ${novel} — kurzagin` };
}

export default async function NovelDraftPage({ params }: Props) {
  const { novel } = await params;
  const formattedTitle = novel
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

  // Empty state by default
  const drafts: any[] = [];

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
            <ArrowLeft size={12} /> back to {formattedTitle}
          </Link>
        </div>
        <h1><span className="hl">draft</span> manuscripts</h1>
        <div className="page-sub"><span className="jp-label">草稿</span> — work-in-progress chapters & volume manuscripts</div>
      </div>

      <section className="section">
        {drafts.length === 0 ? (
          <div className="bracket-card empty-state reveal">
            <div className="empty-state-glyph"><Edit3 size={36} /></div>
            <div className="empty-state-title">NO DRAFTS LOGGED</div>
            <p className="empty-state-desc">
              No manuscript drafts or rough cuts found for this novel.
              WIP chapters and volume folders will appear here once connected.
            </p>
            <span className="empty-state-meta">// status: idle — awaiting manuscript ingestion</span>
          </div>
        ) : (
          <div>{/* Draft list items when populated */}</div>
        )}
      </section>
    </>
  );
}
