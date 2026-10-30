'use client';

import { useState, useRef, useEffect } from 'react';
import type { ToolDefinition } from '@/lib/tools';
import { qrcodegen } from '@/lib/qrcodegen';
import { QrCode, Download, Copy, Check, Sparkles, ShieldCheck, Wifi, Link2, Type } from 'lucide-react';

export default function QrGeneratorClient({ tool }: { tool: ToolDefinition }) {
  const [text, setText] = useState('https://kurzagin.com');
  const [mode, setMode] = useState<'url' | 'text' | 'wifi'>('url');
  const [ecc, setEcc] = useState<'L' | 'M' | 'Q' | 'H'>('M');
  const [copied, setCopied] = useState(false);
  const [copiedDataUri, setCopiedDataUri] = useState(false);

  // WiFi helper state
  const [wifiSsid, setWifiSsid] = useState('');
  const [wifiPass, setWifiPass] = useState('');
  const [wifiType, setWifiType] = useState<'WPA' | 'WEP' | 'nopass'>('WPA');

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Compute final payload
  const payload = mode === 'wifi'
    ? `WIFI:T:${wifiType};S:${wifiSsid};P:${wifiPass};;`
    : text;

  // Generate QR code and paint canvas
  useEffect(() => {
    if (!payload.trim() || !canvasRef.current) return;
    try {
      let eccLevel = qrcodegen.QrCode.Ecc.MEDIUM;
      if (ecc === 'L') eccLevel = qrcodegen.QrCode.Ecc.LOW;
      if (ecc === 'Q') eccLevel = qrcodegen.QrCode.Ecc.QUARTILE;
      if (ecc === 'H') eccLevel = qrcodegen.QrCode.Ecc.HIGH;

      const qr = qrcodegen.QrCode.encodeText(payload, eccLevel);
      const canvas = canvasRef.current;
      const scale = 8;
      const border = 3;
      const size = (qr.size + border * 2) * scale;

      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Dark background
      ctx.fillStyle = '#111216';
      ctx.fillRect(0, 0, size, size);

      // Light foreground
      ctx.fillStyle = '#f0f3f6';
      for (let y = 0; y < qr.size; y++) {
        for (let x = 0; x < qr.size; x++) {
          if (qr.getModule(x, y)) {
            ctx.fillRect((x + border) * scale, (y + border) * scale, scale, scale);
          }
        }
      }
    } catch (e) {
      console.error('QR Gen error:', e);
    }
  }, [payload, ecc]);

  const downloadPNG = () => {
    if (!canvasRef.current) return;
    const url = canvasRef.current.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = `qrcode-${Date.now()}.png`;
    a.click();
  };

  const copyImage = async () => {
    if (!canvasRef.current) return;
    try {
      canvasRef.current.toBlob(async (blob) => {
        if (!blob) return;
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob })
        ]);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    } catch {
      // Fallback
    }
  };

  return (
    <div className="tool-view-wrapper">
      <div className="page-header" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <div className="card-tag active" style={{ margin: 0 }}>{tool.category}</div>
          <span className="tool-badge-pill">
            <ShieldCheck size={11} style={{ marginRight: '3px' }} />
            100% offline
          </span>
        </div>
        <h1><span className="hl">qr code</span> generator</h1>
        <div className="page-sub">
          <span className="jp-label">QRコード</span> — {tool.description}
        </div>
      </div>

      <div className="qr-tool-grid">
        <div className="bracket-card tool-box">
          {/* Mode switch */}
          <div className="tool-tabs-row" style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
            <button
              type="button"
              className={`tool-action-btn ${mode === 'url' ? 'primary' : 'secondary'}`}
              onClick={() => { setMode('url'); setText('https://kurzagin.com'); }}
            >
              <Link2 size={12} /> URL
            </button>
            <button
              type="button"
              className={`tool-action-btn ${mode === 'text' ? 'primary' : 'secondary'}`}
              onClick={() => { setMode('text'); setText('Secret message or memo'); }}
            >
              <Type size={12} /> Plain Text
            </button>
            <button
              type="button"
              className={`tool-action-btn ${mode === 'wifi' ? 'primary' : 'secondary'}`}
              onClick={() => setMode('wifi')}
            >
              <Wifi size={12} /> WiFi Connect
            </button>
          </div>

          {mode !== 'wifi' ? (
            <div className="tool-form-group">
              <label htmlFor="qr-payload" className="tool-input-label" style={{ marginBottom: '8px', display: 'block' }}>
                content to encode
              </label>
              <textarea
                id="qr-payload"
                className="tool-text-input"
                style={{ height: '110px', resize: 'vertical' }}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Type or paste text..."
              />
            </div>
          ) : (
            <div className="tool-form-group" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label className="tool-input-label" style={{ marginBottom: '4px', display: 'block' }}>network name (ssid)</label>
                <input
                  type="text"
                  className="tool-text-input"
                  value={wifiSsid}
                  onChange={(e) => setWifiSsid(e.target.value)}
                  placeholder="MyHomeWifi"
                />
              </div>
              <div>
                <label className="tool-input-label" style={{ marginBottom: '4px', display: 'block' }}>password</label>
                <input
                  type="text"
                  className="tool-text-input"
                  value={wifiPass}
                  onChange={(e) => setWifiPass(e.target.value)}
                  placeholder="Network password"
                />
              </div>
              <div>
                <label className="tool-input-label" style={{ marginBottom: '4px', display: 'block' }}>security</label>
                <select
                  className="tool-text-input"
                  value={wifiType}
                  onChange={(e) => setWifiType(e.target.value as any)}
                >
                  <option value="WPA">WPA / WPA2 / WPA3</option>
                  <option value="WEP">WEP</option>
                  <option value="nopass">Open (No password)</option>
                </select>
              </div>
            </div>
          )}

          {/* ECC Settings */}
          <div style={{ marginTop: '16px' }}>
            <span className="tool-breakdown-title" style={{ display: 'block' }}>Error Correction Level:</span>
            <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
              {(['L', 'M', 'Q', 'H'] as const).map((lvl) => (
                <button
                  key={lvl}
                  type="button"
                  className={`tool-preset-chip ${ecc === lvl ? 'active' : ''}`}
                  style={ecc === lvl ? { borderColor: 'var(--accent)', color: 'var(--accent)', background: 'var(--accent-dim)' } : {}}
                  onClick={() => setEcc(lvl)}
                >
                  {lvl} ({lvl === 'L' ? '7%' : lvl === 'M' ? '15%' : lvl === 'Q' ? '25%' : '30%'})
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* QR Preview & Download Panel */}
        <div className="bracket-card tool-box" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div className="qr-canvas-holder" style={{ padding: '16px', background: '#0a0a0c', border: '1px solid var(--border)', borderRadius: '4px', marginBottom: '16px' }}>
            <canvas ref={canvasRef} style={{ display: 'block', maxWidth: '220px', height: 'auto', imageRendering: 'pixelated' }} />
          </div>

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center' }}>
            <button type="button" className="tool-action-btn primary" onClick={downloadPNG}>
              <Download size={13} />
              <span>download png</span>
            </button>
            <button type="button" className="tool-action-btn secondary" onClick={copyImage}>
              {copied ? <Check size={13} /> : <Copy size={13} />}
              <span>{copied ? 'copied!' : 'copy image'}</span>
            </button>
          </div>
          <span style={{ font: '0.65rem var(--mono)', color: 'var(--fg-3)', marginTop: '10px' }}>
            Rendered purely in browser. No network requests made.
          </span>
        </div>
      </div>
    </div>
  );
}
