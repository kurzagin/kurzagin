'use client';

import { useState, useEffect } from 'react';
import { AlertTriangle, Eye, ShieldAlert } from 'lucide-react';

interface Props {
  novel: string;
  children: React.ReactNode;
}

export default function SpoilerGate({ novel, children }: Props) {
  const [acknowledged, setAcknowledged] = useState(false);
  const [loading, setLoading] = useState(true);

  const storageKey = `kurzagin_spoiler_ack_${novel}`;

  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored === 'true') {
        setAcknowledged(true);
      }
    } catch {
      // LocalStorage access failsafe
    } finally {
      setLoading(false);
    }
  }, [storageKey]);

  const handleConfirm = () => {
    try {
      localStorage.setItem(storageKey, 'true');
    } catch {
      // ignore
    }
    setAcknowledged(true);
  };

  if (loading) {
    return <div style={{ minHeight: '300px' }} />;
  }

  if (!acknowledged) {
    return (
      <div
        className="bracket-card reveal"
        style={{
          padding: '40px 24px',
          textAlign: 'center',
          maxWidth: '560px',
          margin: '40px auto',
          background: 'var(--bg-1)',
          border: '1px solid var(--border-subtle)',
          borderRadius: '8px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '16px',
        }}
      >
        <div
          style={{
            width: '54px',
            height: '54px',
            borderRadius: '50%',
            background: 'rgba(239, 68, 68, 0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ef4444',
          }}
        >
          <ShieldAlert size={28} />
        </div>

        <div>
          <h2 style={{ fontSize: '1.2rem', margin: '0 0 8px', color: 'var(--text-1)', letterSpacing: '0.5px' }}>
            SPOILER WARNING & LORE CLASSIFICATION
          </h2>
          <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-3)', lineHeight: '1.6' }}>
            The Tactical Codex and World Bible archives contain classified narrative intelligence, 
            plot disclosures, character fates, and unreleased story secrets.
          </p>
        </div>

        <div
          style={{
            padding: '10px 14px',
            background: 'var(--bg-2)',
            borderRadius: '4px',
            border: '1px solid var(--border-subtle)',
            fontSize: '0.75rem',
            fontFamily: 'var(--mono)',
            color: 'var(--text-3)',
          }}
        >
          // clearance: reader confirmation required
        </div>

        <button
          onClick={handleConfirm}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 24px',
            background: 'var(--accent)',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            fontSize: '0.85rem',
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'opacity 0.2s ease',
          }}
        >
          <Eye size={16} />
          <span>I Understand — Access Codex</span>
        </button>
      </div>
    );
  }

  return <>{children}</>;
}
