'use client';

import { useState } from 'react';
import type { ToolDefinition } from '@/lib/tools';
import { KeyRound, Copy, Check, RefreshCw, ShieldAlert, ShieldCheck, Lock } from 'lucide-react';

export default function PasswordGeneratorClient({ tool }: { tool: ToolDefinition }) {
  const [length, setLength] = useState(16);
  const [useUppercase, setUseUppercase] = useState(true);
  const [useLowercase, setUseLowercase] = useState(true);
  const [useNumbers, setUseNumbers] = useState(true);
  const [useSymbols, setUseSymbols] = useState(true);
  const [avoidAmbiguous, setAvoidAmbiguous] = useState(false);
  const [mode, setMode] = useState<'password' | 'pin'>('password');
  const [pinLength, setPinLength] = useState(6);

  const [password, setPassword] = useState(() => generatePassword(16, true, true, true, true, false));
  const [copied, setCopied] = useState(false);

  function generatePassword(
    len: number,
    upper: boolean,
    lower: boolean,
    nums: boolean,
    syms: boolean,
    noAmbiguous: boolean
  ): string {
    let chars = '';
    if (upper) chars += noAmbiguous ? 'ABCDEFGHJKLMNPQRSTUVWXYZ' : 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    if (lower) chars += noAmbiguous ? 'abcdefghijkmnopqrstuvwxyz' : 'abcdefghijklmnopqrstuvwxyz';
    if (nums) chars += noAmbiguous ? '23456789' : '0123456789';
    if (syms) chars += '!@#$%^&*()_+-=[]{}|;:,.<>?';

    if (!chars) chars = 'abcdefghijklmnopqrstuvwxyz';

    const array = new Uint32Array(len);
    window.crypto.getRandomValues(array);

    let res = '';
    for (let i = 0; i < len; i++) {
      res += chars[array[i] % chars.length];
    }
    return res;
  }

  function generatePin(len: number): string {
    const array = new Uint32Array(len);
    window.crypto.getRandomValues(array);
    let res = '';
    for (let i = 0; i < len; i++) {
      res += (array[i] % 10).toString();
    }
    return res;
  }

  const handleRefresh = () => {
    if (mode === 'pin') {
      setPassword(generatePin(pinLength));
    } else {
      setPassword(generatePassword(length, useUppercase, useLowercase, useNumbers, useSymbols, avoidAmbiguous));
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(password);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Entropy calculation
  const poolSize = (mode === 'pin')
    ? 10
    : ((useUppercase ? 26 : 0) + (useLowercase ? 26 : 0) + (useNumbers ? 10 : 0) + (useSymbols ? 30 : 0));
  const entropyBits = Math.round((mode === 'pin' ? pinLength : length) * Math.log2(Math.max(2, poolSize)));

  let strengthTag = 'Strong';
  let strengthColor = 'var(--accent)';
  if (entropyBits < 40) {
    strengthTag = 'Weak';
    strengthColor = '#ef4444';
  } else if (entropyBits < 64) {
    strengthTag = 'Fair';
    strengthColor = '#f59e0b';
  } else if (entropyBits >= 90) {
    strengthTag = 'Very Strong';
    strengthColor = '#10b981';
  }

  return (
    <div className="tool-view-wrapper">
      <div className="page-header" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <div className="card-tag active" style={{ margin: 0 }}>{tool.category}</div>
          <span className="tool-badge-pill">
            <Lock size={11} style={{ marginRight: '3px' }} />
            Zero Storage
          </span>
        </div>
        <h1><span className="hl">password</span> &amp; pin generator</h1>
        <div className="page-sub">
          <span className="jp-label">暗号生成</span> — {tool.description}
        </div>
      </div>

      {/* Explicit Privacy Banner */}
      <div
        className="bracket-card"
        style={{
          background: 'rgba(245, 158, 11, 0.05)',
          borderColor: 'rgba(245, 158, 11, 0.3)',
          padding: '12px 16px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}
      >
        <ShieldCheck size={20} style={{ color: '#f59e0b', flexShrink: 0 }} />
        <div style={{ font: '0.72rem var(--mono)', color: 'var(--fg-1)', lineHeight: '1.4' }}>
          <strong>No Data Storage:</strong> Generated values are computed exclusively in your device's browser memory using <code>window.crypto.getRandomValues</code>. Nothing is ever sent to or stored on any server, database, or disk.
        </div>
      </div>

      <div className="bracket-card tool-box" style={{ maxWidth: '640px', margin: '0 auto' }}>
        {/* Password Output Box */}
        <div style={{ background: 'var(--bg-0)', border: '1px solid var(--border)', padding: '16px', borderRadius: '4px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ font: '0.65rem var(--mono)', color: 'var(--fg-3)', textTransform: 'uppercase' }}>
              generated {mode} // entropy: {entropyBits} bits ({strengthTag})
            </span>
            <span style={{ font: '0.65rem var(--mono)', color: strengthColor, fontWeight: 700 }}>
              ● {strengthTag}
            </span>
          </div>

          <div style={{ font: '1.4rem var(--mono)', color: 'var(--fg-0)', wordBreak: 'break-all', userSelect: 'all', letterSpacing: '0.05em' }}>
            {password}
          </div>

          <div style={{ display: 'flex', gap: '8px', marginTop: '14px' }}>
            <button
              type="button"
              className="tool-action-btn primary"
              style={{ flex: 1, justifyContent: 'center' }}
              onClick={handleCopy}
            >
              {copied ? <Check size={13} style={{ marginRight: '6px' }} /> : <Copy size={13} style={{ marginRight: '6px' }} />}
              {copied ? 'copied to clipboard' : 'copy'}
            </button>
            <button
              type="button"
              className="tool-action-btn secondary"
              onClick={handleRefresh}
              title="Generate new"
            >
              <RefreshCw size={14} />
            </button>
          </div>
        </div>

        {/* Mode Selector */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
          <button
            type="button"
            className={`tool-action-btn ${mode === 'password' ? 'primary' : 'secondary'}`}
            onClick={() => { setMode('password'); setPassword(generatePassword(length, useUppercase, useLowercase, useNumbers, useSymbols, avoidAmbiguous)); }}
          >
            Password
          </button>
          <button
            type="button"
            className={`tool-action-btn ${mode === 'pin' ? 'primary' : 'secondary'}`}
            onClick={() => { setMode('pin'); setPassword(generatePin(pinLength)); }}
          >
            Numeric PIN
          </button>
        </div>

        {mode === 'password' ? (
          <div>
            {/* Length slider */}
            <div style={{ marginBottom: '18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <label className="tool-input-label">password length</label>
                <span style={{ font: '0.78rem var(--mono)', color: 'var(--accent)', fontWeight: 700 }}>{length}</span>
              </div>
              <input
                type="range"
                min="6"
                max="64"
                value={length}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setLength(val);
                  setPassword(generatePassword(val, useUppercase, useLowercase, useNumbers, useSymbols, avoidAmbiguous));
                }}
                style={{ width: '100%', accentColor: 'var(--accent)' }}
              />
            </div>

            {/* Checkbox toggles */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', font: '0.74rem var(--mono)', cursor: 'pointer', color: 'var(--fg-1)' }}>
                <input
                  type="checkbox"
                  checked={useUppercase}
                  onChange={(e) => {
                    setUseUppercase(e.target.checked);
                    setPassword(generatePassword(length, e.target.checked, useLowercase, useNumbers, useSymbols, avoidAmbiguous));
                  }}
                />
                Uppercase (A-Z)
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', font: '0.74rem var(--mono)', cursor: 'pointer', color: 'var(--fg-1)' }}>
                <input
                  type="checkbox"
                  checked={useLowercase}
                  onChange={(e) => {
                    setUseLowercase(e.target.checked);
                    setPassword(generatePassword(length, useUppercase, e.target.checked, useNumbers, useSymbols, avoidAmbiguous));
                  }}
                />
                Lowercase (a-z)
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', font: '0.74rem var(--mono)', cursor: 'pointer', color: 'var(--fg-1)' }}>
                <input
                  type="checkbox"
                  checked={useNumbers}
                  onChange={(e) => {
                    setUseNumbers(e.target.checked);
                    setPassword(generatePassword(length, useUppercase, useLowercase, e.target.checked, useSymbols, avoidAmbiguous));
                  }}
                />
                Numbers (0-9)
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', font: '0.74rem var(--mono)', cursor: 'pointer', color: 'var(--fg-1)' }}>
                <input
                  type="checkbox"
                  checked={useSymbols}
                  onChange={(e) => {
                    setUseSymbols(e.target.checked);
                    setPassword(generatePassword(length, useUppercase, useLowercase, useNumbers, e.target.checked, avoidAmbiguous));
                  }}
                />
                Symbols (!@#$%)
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', font: '0.74rem var(--mono)', cursor: 'pointer', color: 'var(--fg-1)', gridColumn: 'span 2' }}>
                <input
                  type="checkbox"
                  checked={avoidAmbiguous}
                  onChange={(e) => {
                    setAvoidAmbiguous(e.target.checked);
                    setPassword(generatePassword(length, useUppercase, useLowercase, useNumbers, useSymbols, e.target.checked));
                  }}
                />
                Avoid ambiguous characters (l, 1, I, O, 0)
              </label>
            </div>
          </div>
        ) : (
          <div>
            <div style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <label className="tool-input-label">pin digits</label>
                <span style={{ font: '0.78rem var(--mono)', color: 'var(--accent)', fontWeight: 700 }}>{pinLength}</span>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                {[4, 6, 8, 10].map((digits) => (
                  <button
                    key={digits}
                    type="button"
                    className={`tool-preset-chip ${pinLength === digits ? 'active' : ''}`}
                    style={pinLength === digits ? { borderColor: 'var(--accent)', color: 'var(--accent)', background: 'var(--accent-dim)' } : {}}
                    onClick={() => {
                      setPinLength(digits);
                      setPassword(generatePin(digits));
                    }}
                  >
                    {digits} digits
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
