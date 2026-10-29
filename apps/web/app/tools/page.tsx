import Link from 'next/link';
import { Wrench, ArrowRight, ShieldCheck } from 'lucide-react';
import { TOOLS } from '@/lib/tools';

export const metadata = {
  title: 'tools — kurzagin',
  description: 'Free, lightweight, client-side web and utility tools.',
};

export default function ToolsPage() {
  return (
    <>
      <div className="page-header">
        <h1>
          <span className="hl">free</span> tools
        </h1>
        <div className="page-sub">
          <span className="jp-label">道具箱</span> — minimalist, privacy-first operator utilities
        </div>
      </div>

      <section className="section">
        <div className="section-head">
          <h2>all tools</h2>
          <span className="jp-label">全ツール</span>
          <div className="line" />
        </div>

        <div className="cards-grid reveal">
          {TOOLS.map((tool) => (
            <Link href={`/tools/${tool.slug}`} key={tool.slug} className="item-card tool-card">
              <div className="card-visual tool-visual">
                <Wrench size={32} />
              </div>
              <div className="card-body">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <div className="card-tag active" style={{ margin: 0 }}>
                    {tool.category}
                  </div>
                  {tool.badge && (
                    <span className="tool-badge-pill">
                      <ShieldCheck size={11} style={{ marginRight: '3px' }} />
                      {tool.badge}
                    </span>
                  )}
                </div>
                <h3 className="card-title">
                  {tool.name}
                  {tool.nameJp && <span className="jp-sub" style={{ fontSize: '0.7rem', marginLeft: '6px' }}>{tool.nameJp}</span>}
                </h3>
                <p className="card-desc">{tool.tagline || tool.description}</p>
                <div className="card-meta">
                  <span>{tool.status}</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--accent)' }}>
                    launch <ArrowRight size={12} />
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
