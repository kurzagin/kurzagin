'use client';

import { useState, useEffect, useRef } from 'react';
import type { ToolDefinition } from '@/lib/tools';
import { Timer, Play, Pause, RotateCcw, Bell, ShieldCheck } from 'lucide-react';

export default function TimerClient({ tool }: { tool: ToolDefinition }) {
  const [tab, setTab] = useState<'timer' | 'stopwatch' | 'countdown'>('timer');

  // Focus Timer (Pomodoro) state
  const [timerSeconds, setTimerSeconds] = useState(25 * 60);
  const [timerRunning, setTimerRunning] = useState(false);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Stopwatch state
  const [stopwatchMs, setStopwatchMs] = useState(0);
  const [stopwatchRunning, setStopwatchRunning] = useState(false);
  const stopwatchIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Target Countdown state
  const [targetDateStr, setTargetDateStr] = useState('');
  const [targetName, setTargetName] = useState('');
  const [countdownDiff, setCountdownDiff] = useState<{ d: number; h: number; m: number; s: number } | null>(null);

  // Focus Timer tick
  useEffect(() => {
    if (timerRunning) {
      timerIntervalRef.current = setInterval(() => {
        setTimerSeconds((prev) => {
          if (prev <= 1) {
            setTimerRunning(false);
            if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
              new Notification('Kurzagin Focus Timer', { body: 'Focus session completed!' });
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [timerRunning]);

  // Stopwatch tick
  useEffect(() => {
    if (stopwatchRunning) {
      const start = Date.now() - stopwatchMs;
      stopwatchIntervalRef.current = setInterval(() => {
        setStopwatchMs(Date.now() - start);
      }, 50);
    } else if (stopwatchIntervalRef.current) {
      clearInterval(stopwatchIntervalRef.current);
    }
    return () => {
      if (stopwatchIntervalRef.current) clearInterval(stopwatchIntervalRef.current);
    };
  }, [stopwatchRunning, stopwatchMs]);

  // Target Countdown tick
  useEffect(() => {
    if (!targetDateStr) {
      setCountdownDiff(null);
      return;
    }
    const updateCountdown = () => {
      const target = new Date(targetDateStr).getTime();
      const now = Date.now();
      const diff = Math.max(0, target - now);

      const d = Math.floor(diff / (1000 * 60 * 60 * 24));
      const h = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const m = Math.floor((diff / 1000 / 60) % 60);
      const s = Math.floor((diff / 1000) % 60);
      setCountdownDiff({ d, h, m, s });
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [targetDateStr]);

  const formatTimer = (totalSec: number) => {
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const formatStopwatch = (totalMs: number) => {
    const s = Math.floor(totalMs / 1000);
    const m = Math.floor(s / 60);
    const sec = s % 60;
    const ms = Math.floor((totalMs % 1000) / 10);
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}.${String(ms).padStart(2, '0')}`;
  };

  return (
    <div className="tool-view-wrapper">
      <div className="page-header" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <div className="card-tag active" style={{ margin: 0 }}>{tool.category}</div>
          <span className="tool-badge-pill">
            <ShieldCheck size={11} style={{ marginRight: '3px' }} />
            offline
          </span>
        </div>
        <h1><span className="hl">focus</span> timer &amp; countdown</h1>
        <div className="page-sub">
          <span className="jp-label">秒読み</span> — {tool.description}
        </div>
      </div>

      <div className="bracket-card tool-box" style={{ maxWidth: '640px', margin: '0 auto' }}>
        {/* Sub-modes */}
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginBottom: '24px' }}>
          <button
            type="button"
            className={`tool-action-btn ${tab === 'timer' ? 'primary' : 'secondary'}`}
            onClick={() => setTab('timer')}
          >
            focus intervals
          </button>
          <button
            type="button"
            className={`tool-action-btn ${tab === 'stopwatch' ? 'primary' : 'secondary'}`}
            onClick={() => setTab('stopwatch')}
          >
            stopwatch
          </button>
          <button
            type="button"
            className={`tool-action-btn ${tab === 'countdown' ? 'primary' : 'secondary'}`}
            onClick={() => setTab('countdown')}
          >
            date countdown
          </button>
        </div>

        {tab === 'timer' && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ font: '3.6rem var(--mono)', fontWeight: 700, color: 'var(--accent)', letterSpacing: '0.04em', margin: '20px 0' }}>
              {formatTimer(timerSeconds)}
            </div>

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginBottom: '20px' }}>
              <button
                type="button"
                className="tool-preset-chip"
                onClick={() => { setTimerSeconds(25 * 60); setTimerRunning(false); }}
              >
                25m (pomodoro)
              </button>
              <button
                type="button"
                className="tool-preset-chip"
                onClick={() => { setTimerSeconds(5 * 60); setTimerRunning(false); }}
              >
                5m (short break)
              </button>
              <button
                type="button"
                className="tool-preset-chip"
                onClick={() => { setTimerSeconds(15 * 60); setTimerRunning(false); }}
              >
                15m (long break)
              </button>
              <button
                type="button"
                className="tool-preset-chip"
                onClick={() => { setTimerSeconds(50 * 60); setTimerRunning(false); }}
              >
                50m (deep focus)
              </button>
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                type="button"
                className="tool-action-btn primary"
                style={{ padding: '10px 24px', fontSize: '0.8rem' }}
                onClick={() => setTimerRunning((r) => !r)}
              >
                {timerRunning ? <Pause size={14} style={{ marginRight: '6px' }} /> : <Play size={14} style={{ marginRight: '6px' }} />}
                <span>{timerRunning ? 'pause' : 'start'}</span>
              </button>
              <button
                type="button"
                className="tool-action-btn secondary"
                style={{ padding: '10px 18px', fontSize: '0.8rem' }}
                onClick={() => { setTimerRunning(false); setTimerSeconds(25 * 60); }}
              >
                <RotateCcw size={14} style={{ marginRight: '6px' }} />
                <span>reset</span>
              </button>
            </div>
          </div>
        )}

        {tab === 'stopwatch' && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ font: '3.6rem var(--mono)', fontWeight: 700, color: 'var(--fg-0)', letterSpacing: '0.04em', margin: '20px 0' }}>
              {formatStopwatch(stopwatchMs)}
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                type="button"
                className="tool-action-btn primary"
                style={{ padding: '10px 24px', fontSize: '0.8rem' }}
                onClick={() => setStopwatchRunning((r) => !r)}
              >
                {stopwatchRunning ? <Pause size={14} style={{ marginRight: '6px' }} /> : <Play size={14} style={{ marginRight: '6px' }} />}
                <span>{stopwatchRunning ? 'stop' : 'start'}</span>
              </button>
              <button
                type="button"
                className="tool-action-btn secondary"
                style={{ padding: '10px 18px', fontSize: '0.8rem' }}
                onClick={() => { setStopwatchRunning(false); setStopwatchMs(0); }}
              >
                <RotateCcw size={14} style={{ marginRight: '6px' }} />
                <span>reset</span>
              </button>
            </div>
          </div>
        )}

        {tab === 'countdown' && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
              <div>
                <label className="tool-input-label" style={{ display: 'block', marginBottom: '6px' }}>event / milestone name</label>
                <input
                  type="text"
                  className="tool-text-input"
                  value={targetName}
                  onChange={(e) => setTargetName(e.target.value)}
                  placeholder="e.g. Next Big Release"
                />
              </div>
              <div>
                <label className="tool-input-label" style={{ display: 'block', marginBottom: '6px' }}>target date &amp; time</label>
                <input
                  type="datetime-local"
                  className="tool-text-input"
                  value={targetDateStr}
                  onChange={(e) => setTargetDateStr(e.target.value)}
                />
              </div>
            </div>

            {countdownDiff ? (
              <div style={{ textAlign: 'center', background: 'var(--bg-0)', padding: '24px', border: '1px solid var(--border)', borderRadius: '4px' }}>
                <div style={{ font: '0.75rem var(--mono)', color: 'var(--accent)', textTransform: 'uppercase', marginBottom: '12px' }}>
                  {targetName || 'Milestone Target'}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                  <div>
                    <div style={{ font: '2.2rem var(--mono)', fontWeight: 700, color: 'var(--fg-0)' }}>{countdownDiff.d}</div>
                    <div style={{ font: '0.62rem var(--mono)', color: 'var(--fg-3)' }}>DAYS</div>
                  </div>
                  <div>
                    <div style={{ font: '2.2rem var(--mono)', fontWeight: 700, color: 'var(--fg-0)' }}>{countdownDiff.h}</div>
                    <div style={{ font: '0.62rem var(--mono)', color: 'var(--fg-3)' }}>HOURS</div>
                  </div>
                  <div>
                    <div style={{ font: '2.2rem var(--mono)', fontWeight: 700, color: 'var(--fg-0)' }}>{countdownDiff.m}</div>
                    <div style={{ font: '0.62rem var(--mono)', color: 'var(--fg-3)' }}>MINS</div>
                  </div>
                  <div>
                    <div style={{ font: '2.2rem var(--mono)', fontWeight: 700, color: 'var(--accent)' }}>{countdownDiff.s}</div>
                    <div style={{ font: '0.62rem var(--mono)', color: 'var(--fg-3)' }}>SECS</div>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', color: 'var(--fg-3)', font: '0.72rem var(--mono)', padding: '20px' }}>
                Select a target date and time to start countdown
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
