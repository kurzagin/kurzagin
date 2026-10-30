'use client';

import { useState, useRef } from 'react';
import type { ToolDefinition } from '@/lib/tools';
import { Image as ImageIcon, Download, UploadCloud, RefreshCw, ShieldCheck } from 'lucide-react';

export default function ImageConverterClient({ tool }: { tool: ToolDefinition }) {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [format, setFormat] = useState<'image/webp' | 'image/png' | 'image/jpeg'>('image/webp');
  const [quality, setQuality] = useState(0.85);
  const [scalePct, setScalePct] = useState(100);
  const [originalDims, setOriginalDims] = useState<{ w: number; h: number } | null>(null);
  const [convertedUrl, setConvertedUrl] = useState<string | null>(null);
  const [convertedSize, setConvertedSize] = useState<number | null>(null);
  const [converting, setConverting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFile = (selectedFile: File) => {
    if (!selectedFile.type.startsWith('image/')) return;
    setFile(selectedFile);
    setConvertedUrl(null);
    setConvertedSize(null);

    const url = URL.createObjectURL(selectedFile);
    setPreviewUrl(url);

    const img = new Image();
    img.onload = () => {
      setOriginalDims({ w: img.width, h: img.height });
    };
    img.src = url;
  };

  const handleConvert = () => {
    if (!previewUrl || !originalDims) return;
    setConverting(true);

    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const targetW = Math.round(originalDims.w * (scalePct / 100));
      const targetH = Math.round(originalDims.h * (scalePct / 100));
      canvas.width = targetW;
      canvas.height = targetH;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Handle background fill for JPEG
      if (format === 'image/jpeg') {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, targetW, targetH);
      }

      ctx.drawImage(img, 0, 0, targetW, targetH);

      canvas.toBlob(
        (blob) => {
          if (!blob) return;
          const resultUrl = URL.createObjectURL(blob);
          setConvertedUrl(resultUrl);
          setConvertedSize(blob.size);
          setConverting(false);
        },
        format,
        quality
      );
    };
    img.src = previewUrl;
  };

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    else return (bytes / 1048576).toFixed(2) + ' MB';
  };

  const getExtension = () => {
    if (format === 'image/webp') return 'webp';
    if (format === 'image/png') return 'png';
    return 'jpg';
  };

  return (
    <div className="tool-view-wrapper">
      <div className="page-header" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <div className="card-tag active" style={{ margin: 0 }}>{tool.category}</div>
          <span className="tool-badge-pill">
            <ShieldCheck size={11} style={{ marginRight: '3px' }} />
            client-side canvas
          </span>
        </div>
        <h1><span className="hl">image</span> converter &amp; resizer</h1>
        <div className="page-sub">
          <span className="jp-label">画像処理</span> — {tool.description}
        </div>
      </div>

      <div className="bracket-card tool-box">
        {/* Upload Dropzone */}
        {!file ? (
          <div
            className="tool-dropzone"
            style={{
              border: '2px dashed var(--border)',
              padding: '40px 20px',
              textAlign: 'center',
              cursor: 'pointer',
              borderRadius: '4px',
              background: 'var(--bg-0)',
            }}
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              if (e.dataTransfer.files?.[0]) handleFile(e.dataTransfer.files[0]);
            }}
          >
            <UploadCloud size={36} style={{ color: 'var(--accent)', marginBottom: '12px' }} />
            <div style={{ font: '0.82rem var(--mono)', fontWeight: 600, color: 'var(--fg-0)' }}>
              click to choose image or drag &amp; drop
            </div>
            <div style={{ font: '0.68rem var(--mono)', color: 'var(--fg-3)', marginTop: '6px' }}>
              Supports PNG, JPG, WebP, GIF, SVG · 100% private, never uploaded
            </div>
          </div>
        ) : (
          <div className="image-adjust-panel">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px' }}>
              {/* Controls */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <span className="tool-input-label">{file.name}</span>
                  <button
                    type="button"
                    className="tool-text-btn"
                    onClick={() => { setFile(null); setPreviewUrl(null); setConvertedUrl(null); }}
                  >
                    change file
                  </button>
                </div>

                <div style={{ font: '0.7rem var(--mono)', color: 'var(--fg-2)', marginBottom: '16px' }}>
                  Original: {originalDims ? `${originalDims.w}×${originalDims.h}px` : ''} ({formatBytes(file.size)})
                </div>

                {/* Target Format */}
                <div style={{ marginBottom: '14px' }}>
                  <label className="tool-input-label" style={{ display: 'block', marginBottom: '6px' }}>output format</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {(['image/webp', 'image/png', 'image/jpeg'] as const).map((fmt) => (
                      <button
                        key={fmt}
                        type="button"
                        className={`tool-action-btn ${format === fmt ? 'primary' : 'secondary'}`}
                        onClick={() => { setFormat(fmt); setConvertedUrl(null); }}
                      >
                        {fmt.split('/')[1].toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Resize Scale */}
                <div style={{ marginBottom: '14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <label className="tool-input-label">dimensions scale</label>
                    <span style={{ font: '0.72rem var(--mono)', color: 'var(--accent)' }}>{scalePct}%</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    step="5"
                    value={scalePct}
                    onChange={(e) => { setScalePct(Number(e.target.value)); setConvertedUrl(null); }}
                    style={{ width: '100%', accentColor: 'var(--accent)' }}
                  />
                  {originalDims && (
                    <div style={{ font: '0.66rem var(--mono)', color: 'var(--fg-3)', marginTop: '4px' }}>
                      Output size: {Math.round(originalDims.w * (scalePct / 100))}×{Math.round(originalDims.h * (scalePct / 100))}px
                    </div>
                  )}
                </div>

                {/* Quality Slider (for WebP and JPEG) */}
                {format !== 'image/png' && (
                  <div style={{ marginBottom: '18px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <label className="tool-input-label">compression quality</label>
                      <span style={{ font: '0.72rem var(--mono)', color: 'var(--accent)' }}>{Math.round(quality * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0.1"
                      max="1.0"
                      step="0.05"
                      value={quality}
                      onChange={(e) => { setQuality(Number(e.target.value)); setConvertedUrl(null); }}
                      style={{ width: '100%', accentColor: 'var(--accent)' }}
                    />
                  </div>
                )}

                <button
                  type="button"
                  className="tool-action-btn primary"
                  style={{ width: '100%', justifyContent: 'center', padding: '10px' }}
                  onClick={handleConvert}
                  disabled={converting}
                >
                  <RefreshCw size={13} style={{ marginRight: '6px' }} />
                  {converting ? 'processing...' : 'process & compress'}
                </button>
              </div>

              {/* Preview & Download */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-0)', border: '1px solid var(--border)', padding: '16px', borderRadius: '4px' }}>
                <img
                  src={convertedUrl || previewUrl || ''}
                  alt="Preview"
                  style={{ maxWidth: '100%', maxHeight: '200px', objectFit: 'contain', borderRadius: '2px', marginBottom: '12px' }}
                />
                {convertedUrl && convertedSize !== null && (
                  <div style={{ textAlign: 'center', width: '100%' }}>
                    <div style={{ font: '0.72rem var(--mono)', color: 'var(--accent)', marginBottom: '8px' }}>
                      Ready: {formatBytes(convertedSize)} (saved {Math.max(0, Math.round(((file.size - convertedSize) / file.size) * 100))}%)
                    </div>
                    <a
                      href={convertedUrl}
                      download={`converted-image.${getExtension()}`}
                      className="tool-action-btn primary"
                      style={{ display: 'inline-flex', textDecoration: 'none' }}
                    >
                      <Download size={13} style={{ marginRight: '6px' }} />
                      download converted {getExtension().toUpperCase()}
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <input
          type="file"
          ref={fileInputRef}
          onChange={(e) => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }}
          accept="image/*"
          style={{ display: 'none' }}
        />
      </div>
    </div>
  );
}
