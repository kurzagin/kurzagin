'use client';

import { useState } from 'react';
import type { ToolDefinition } from '@/lib/tools';
import { Shuffle, Dices, Coins, ShieldCheck, Sparkles, Plus, Trash2 } from 'lucide-react';

export default function RandomPickerClient({ tool }: { tool: ToolDefinition }) {
  const [mode, setMode] = useState<'list' | 'coin' | 'dice'>('list');

  // List picker state
  const [itemsText, setItemsText] = useState('Ramen\nSushi\nCurry Rice\nYakitori\nUdon');
  const [selectedResult, setSelectedResult] = useState<string | null>(null);
  const [isPicking, setIsPicking] = useState(false);

  // Coin state
  const [coinResult, setCoinResult] = useState<'HEADS' | 'TAILS' | null>(null);
  const [isFlipping, setIsFlipping] = useState(false);

  // Dice state
  const [diceCount, setDiceCount] = useState<number>(1);
  const [diceResults, setDiceResults] = useState<number[]>([6]);
  const [isRolling, setIsRolling] = useState(false);

  const handlePickList = () => {
    const lines = itemsText.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);
    if (lines.length === 0) return;

    setIsPicking(true);
    let counter = 0;
    const interval = setInterval(() => {
      setSelectedResult(lines[Math.floor(Math.random() * lines.length)]);
      counter++;
      if (counter > 12) {
        clearInterval(interval);
        setSelectedResult(lines[Math.floor(Math.random() * lines.length)]);
        setIsPicking(false);
      }
    }, 60);
  };

  const handleFlipCoin = () => {
    setIsFlipping(true);
    let counter = 0;
    const interval = setInterval(() => {
      setCoinResult(Math.random() > 0.5 ? 'HEADS' : 'TAILS');
      counter++;
      if (counter > 10) {
        clearInterval(interval);
        setCoinResult(Math.random() > 0.5 ? 'HEADS' : 'TAILS');
        setIsFlipping(false);
      }
    }, 70);
  };

  const handleRollDice = () => {
    setIsRolling(true);
    let counter = 0;
    const interval = setInterval(() => {
      const rolls = Array.from({ length: diceCount }, () => Math.floor(Math.random() * 6) + 1);
      setDiceResults(rolls);
      counter++;
      if (counter > 10) {
        clearInterval(interval);
        setDiceResults(Array.from({ length: diceCount }, () => Math.floor(Math.random() * 6) + 1));
        setIsRolling(false);
      }
    }, 60);
  };

  return (
    <div className="tool-view-wrapper">
      <div className="page-header" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <div className="card-tag active" style={{ margin: 0 }}>{tool.category}</div>
          <span className="tool-badge-pill">
            <ShieldCheck size={11} style={{ marginRight: '3px' }} />
            fair randomness
          </span>
        </div>
        <h1><span className="hl">random</span> decision picker</h1>
        <div className="page-sub">
          <span className="jp-label">決定機</span> — {tool.description}
        </div>
      </div>

      <div className="bracket-card tool-box" style={{ maxWidth: '640px', margin: '0 auto' }}>
        {/* Switch mode */}
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginBottom: '20px' }}>
          <button
            type="button"
            className={`tool-action-btn ${mode === 'list' ? 'primary' : 'secondary'}`}
            onClick={() => setMode('list')}
          >
            <Shuffle size={12} /> Custom List
          </button>
          <button
            type="button"
            className={`tool-action-btn ${mode === 'coin' ? 'primary' : 'secondary'}`}
            onClick={() => setMode('coin')}
          >
            <Coins size={12} /> Flip Coin
          </button>
          <button
            type="button"
            className={`tool-action-btn ${mode === 'dice' ? 'primary' : 'secondary'}`}
            onClick={() => setMode('dice')}
          >
            <Dices size={12} /> Roll Dice
          </button>
        </div>

        {mode === 'list' && (
          <div>
            <label className="tool-input-label" style={{ display: 'block', marginBottom: '6px' }}>
              enter choices (one per line)
            </label>
            <textarea
              className="tool-text-input"
              style={{ height: '140px', resize: 'vertical', marginBottom: '14px' }}
              value={itemsText}
              onChange={(e) => setItemsText(e.target.value)}
              placeholder="Choice 1&#10;Choice 2&#10;Choice 3"
            />

            <button
              type="button"
              className="tool-action-btn primary"
              style={{ width: '100%', justifyContent: 'center', padding: '10px' }}
              onClick={handlePickList}
              disabled={isPicking}
            >
              <Shuffle size={14} style={{ marginRight: '6px' }} />
              {isPicking ? 'selecting choice...' : 'pick random choice'}
            </button>

            {selectedResult && (
              <div style={{ marginTop: '20px', textAlign: 'center', padding: '20px', background: 'var(--bg-0)', border: '1px solid var(--accent)', borderRadius: '4px' }}>
                <div style={{ font: '0.65rem var(--mono)', color: 'var(--fg-3)', textTransform: 'uppercase', marginBottom: '6px' }}>
                  outcome // selected
                </div>
                <div style={{ font: '1.8rem var(--mono)', fontWeight: 700, color: 'var(--accent)' }}>
                  {selectedResult}
                </div>
              </div>
            )}
          </div>
        )}

        {mode === 'coin' && (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{
              width: '120px',
              height: '120px',
              borderRadius: '50%',
              border: '2px solid var(--accent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 24px auto',
              background: 'var(--bg-0)',
              transform: isFlipping ? 'rotateY(720deg)' : 'none',
              transition: 'transform 0.7s ease',
            }}>
              <span style={{ font: '1.4rem var(--mono)', fontWeight: 700, color: 'var(--accent)' }}>
                {coinResult || 'READY'}
              </span>
            </div>

            <button
              type="button"
              className="tool-action-btn primary"
              style={{ padding: '10px 28px' }}
              onClick={handleFlipCoin}
              disabled={isFlipping}
            >
              <Coins size={14} style={{ marginRight: '6px' }} />
              flip coin
            </button>
          </div>
        )}

        {mode === 'dice' && (
          <div style={{ textAlign: 'center', padding: '10px 0' }}>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '20px' }}>
              {[1, 2, 3, 4].map((cnt) => (
                <button
                  key={cnt}
                  type="button"
                  className={`tool-preset-chip ${diceCount === cnt ? 'active' : ''}`}
                  style={diceCount === cnt ? { borderColor: 'var(--accent)', color: 'var(--accent)', background: 'var(--accent-dim)' } : {}}
                  onClick={() => setDiceCount(cnt)}
                >
                  {cnt} {cnt === 1 ? 'die' : 'dice'}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', marginBottom: '24px' }}>
              {diceResults.slice(0, diceCount).map((val, idx) => (
                <div
                  key={idx}
                  style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '6px',
                    border: '1px solid var(--border)',
                    background: 'var(--bg-0)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    font: '2rem var(--mono)',
                    fontWeight: 700,
                    color: 'var(--accent)',
                  }}
                >
                  {val}
                </div>
              ))}
            </div>

            <div style={{ font: '0.8rem var(--mono)', color: 'var(--fg-2)', marginBottom: '16px' }}>
              Sum Total: {diceResults.slice(0, diceCount).reduce((a, b) => a + b, 0)}
            </div>

            <button
              type="button"
              className="tool-action-btn primary"
              style={{ padding: '10px 28px' }}
              onClick={handleRollDice}
              disabled={isRolling}
            >
              <Dices size={14} style={{ marginRight: '6px' }} />
              roll dice
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
