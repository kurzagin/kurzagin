import Link from 'next/link';
import { BookOpen, Sparkles } from 'lucide-react';
import { getAllNovels } from '@/lib/novels';

export const metadata = { title: 'novels — kurzagin' };

export default function NovelsPage() {
  const novelsList = getAllNovels();

  return (
    <>
      <div className="page-header">
        <h1><span className="hl">novels</span> archive</h1>
        <div className="page-sub"><span className="jp-label">小説</span> — manuscripts, tactical dossiers & world codices</div>
      </div>

      <section className="section">
        {novelsList.length === 0 ? (
          <div className="bracket-card empty-state ">
            <div className="empty-state-glyph"><BookOpen size={36} /></div>
            <div className="empty-state-title">NO NOVELS REGISTERED</div>
            <p className="empty-state-desc">
              Manuscripts and tactical codices are currently unlinked or in incubation.
              When ready, worlds, story drafts, and lore databases will appear here.
            </p>
            <span className="empty-state-meta">// status: ready — awaiting novel registration</span>
          </div>
        ) : (
          <div className="cards-grid ">
            {novelsList.map((novel) => (
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
                    {novel.title} {novel.titleJp && <span style={{ opacity: 0.6, fontSize: '0.8em' }}>{novel.titleJp}</span>}
                  </h3>
                  {novel.tagline && (
                    <div style={{ fontFamily: 'var(--mono)', fontSize: '0.72rem', color: 'var(--accent)', marginBottom: '8px' }}>
                      {novel.tagline}
                    </div>
                  )}
                  <p className="card-desc">{novel.summary}</p>
                  
                  {novel.stats && (
                    <div style={{ display: 'flex', gap: '8px', fontSize: '0.7rem', fontFamily: 'var(--mono)', color: 'var(--text-3)', margin: '10px 0 4px' }}>
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
    </>
  );
}
