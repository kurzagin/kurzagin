import type { CSSProperties } from 'react';
import { Gamepad2 } from 'lucide-react';

export const metadata = { title: 'games — kurzagin.log' };

export interface GameItem {
  id?: string;
  title: string;
  status: 'playing' | 'completed' | 'backlog' | 'abandoned';
  desc: string;
  rating?: string;
  genre?: string;
  developer?: string;
  visualEmoji?: string;
  visualGradient?: string;
}

// Data source: empty by default (hardcoded items removed)
const gamesList: GameItem[] = [];

export default function GamesPage() {
  return (
    <>
      <div className="page-header">
        <h1><span className="hl">games</span> log</h1>
        <div className="page-sub"><span className="jp-label">ゲーム</span> — playing, clearing, abandoning</div>
      </div>

      <section className="section">
        {gamesList.length === 0 ? (
          <div className="bracket-card empty-state reveal">
            <div className="empty-state-glyph"><Gamepad2 size={36} /></div>
            <div className="empty-state-title">NO GAMES LOGGED</div>
            <p className="empty-state-desc">
              No active sessions found. No playthroughs, backlogs, or cleared titles recorded yet.
            </p>
            <span className="empty-state-meta">// status: idle — awaiting operator session</span>
          </div>
        ) : (
          <div className="cards-grid reveal">
            {gamesList.map((item, i) => (
              <div className="item-card" key={item.id ?? i}>
                <div
                  className="card-visual"
                  style={item.visualGradient ? ({ background: item.visualGradient } as CSSProperties) : undefined}
                >
                  <Gamepad2 size={28} />
                </div>
                <div className="card-body">
                  <div className={`card-tag ${item.status}`}>{item.status}</div>
                  <h3 className="card-title">{item.title}</h3>
                  {item.desc && <p className="card-desc">{item.desc}</p>}
                  {item.rating && <div className="card-rating">{item.rating}</div>}
                  {(item.genre || item.developer) && (
                    <div className="card-meta">
                      {item.genre && <span>{item.genre}</span>}
                      {item.developer && <span>{item.developer}</span>}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
