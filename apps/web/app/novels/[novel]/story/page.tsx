import Link from 'next/link';
import { ScrollText, ArrowLeft } from 'lucide-react';

interface Props {
  params: Promise<{ novel: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { novel } = await params;
  return { title: `story — ${novel} — kurzagin` };
}

export default async function NovelStoryPage({ params }: Props) {
  const { novel } = await params;
  const formattedTitle = novel
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

  // Empty state by default
  const stories: any[] = [];

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
        <h1><span className="hl">official</span> story releases</h1>
        <div className="page-sub"><span className="jp-label">本編</span> — canon chapters, published releases & serialized volumes</div>
      </div>

      <section className="section">
        {stories.length === 0 ? (
          <div className="bracket-card empty-state reveal">
            <div className="empty-state-glyph"><ScrollText size={36} /></div>
            <div className="empty-state-title">NO RELEASES FOUND</div>
            <p className="empty-state-desc">
              No finalized story releases or official published chapters are available yet.
              Final manuscripts will be indexed here.
            </p>
            <span className="empty-state-meta">// status: unpublished — awaiting official release</span>
          </div>
        ) : (
          <div>{/* Official releases list */}</div>
        )}
      </section>
    </>
  );
}
