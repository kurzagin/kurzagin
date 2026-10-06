// @ts-nocheck
'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import {
  Music,
  Image as ImageIcon,
  Disc3,
  SkipBack,
  Play,
  SkipForward,
  Trash2,
} from 'lucide-react';
import { css } from '../_ui/css';
import type { DbTrack } from '@/lib/db';

interface MusicClientProps {
  tracks: DbTrack[];
  authenticated: boolean;
  r2Configured: boolean;
  username?: string;
}

export default function MusicClient({
  tracks,
  authenticated,
  r2Configured,
  username,
}: MusicClientProps) {
  useEffect(() => {
  (function () {
    // OPERATOR STATE
    let selectedAudioFile = null;
    let selectedCoverFile = null;
    let detectedDurationSec = 0;
    let detectedDurationStr = '0:00';

    function formatTime(seconds) {
      if (!seconds || isNaN(seconds)) return '0:00';
      const m = Math.floor(seconds / 60);
      const s = Math.floor(seconds % 60);
      return `${m}:${s < 10 ? '0' : ''}${s}`;
    }

    // CRATE MANAGEMENT & DELEGATED AUDIO PLAYBACK
    let tracks = [];
    try {
      const raw = document.getElementById('tracksDataStore')?.dataset?.tracks;
      if (raw) tracks = JSON.parse(raw);
    } catch (e) {
      tracks = [];
    }

    function syncWithGlobalEngine() {
      if (window.__AUDIO_ENGINE__ && tracks.length > 0) {
        window.__AUDIO_ENGINE__.setTracks(tracks);
        window.__AUDIO_ENGINE__.syncUI();
      }
    }
    syncWithGlobalEngine();

    // OPERATOR CONSOLE: REACTIVE PREVIEW & STATE ENGINE
    function updatePreviewCard() {
      const previewRow = document.getElementById('cratePreviewRow');
      const previewTitle = document.getElementById('previewTitle');
      const previewMeta = document.getElementById('previewMeta');
      const previewBadge = document.getElementById('previewBadge');
      const previewImg = document.getElementById('cratePreviewImg');
      const placeholder = document.getElementById('cratePreviewPlaceholder');
      const audioDrop = document.getElementById('audioDropzone');
      const coverDrop = document.getElementById('coverDropzone');
      const audioLabel = document.getElementById('audioFileLabel');
      const audioHint = document.getElementById('audioFileHint');
      const coverLabel = document.getElementById('coverFileLabel');
      const coverHint = document.getElementById('coverFileHint');
      const pressBtn = document.getElementById('pressVinylBtn');

      const rawTitle = (document.getElementById('crateTitle')?.value || '').trim();
      const rawArtist = (document.getElementById('crateArtist')?.value || '').trim();
      const displayTitle = rawTitle || 'Untitled Track';
      const displayArtist = rawArtist || 'Unknown Artist';

      // Dropzone visual feedback
      if (audioDrop) {
        if (selectedAudioFile) {
          audioDrop.classList.add('has-file');
          const sizeMb = (selectedAudioFile.size / (1024 * 1024)).toFixed(2);
          if (audioLabel) {
            audioLabel.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:-2px;margin-right:6px;"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>✓ ${selectedAudioFile.name} (${sizeMb} MB)`;
          }
          if (audioHint) {
            audioHint.textContent = `✓ Audio ready • Duration: ${detectedDurationStr || '0:00'} (${detectedDurationSec || 0}s)`;
          }
        } else {
          audioDrop.classList.remove('has-file');
          if (audioLabel) {
            audioLabel.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:-2px;margin-right:6px;"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>SELECT OPUS AUDIO (.opus)`;
          }
          if (audioHint) {
            audioHint.textContent = 'Native Opus stream • direct R2 presigned upload';
          }
        }
      }

      if (coverDrop) {
        if (selectedCoverFile) {
          coverDrop.classList.add('has-file');
          const sizeKb = (selectedCoverFile.size / 1024).toFixed(1);
          if (coverLabel) {
            coverLabel.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:-2px;margin-right:6px;"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>✓ ${selectedCoverFile.name} (${sizeKb} KB)`;
          }
          if (coverHint) {
            coverHint.textContent = '✓ Cover art ready • Sharp AVIF 1:1 circle-crop';
          }
        } else {
          coverDrop.classList.remove('has-file');
          if (coverLabel) {
            coverLabel.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:-2px;margin-right:6px;"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>SELECT ALBUM ART (IMAGE)`;
          }
          if (coverHint) {
            coverHint.textContent = 'Sharp serverless transcode • 1:1 circle-crop • AVIF format';
          }
        }
      }

      // Check missing requirements for readiness
      const missing = [];
      if (!selectedAudioFile) missing.push('audio file');
      if (!rawTitle) missing.push('track title');
      if (!rawArtist) missing.push('artist name');
      const isReady = missing.length === 0;

      // Update vinyl center preview
      if (previewImg && placeholder) {
        if (selectedCoverFile && previewImg.src && !previewImg.src.endsWith('#')) {
          previewImg.style.display = 'block';
          placeholder.style.display = 'none';
        } else {
          previewImg.style.display = 'none';
          placeholder.style.display = 'flex';
        }
      }

      // Update preview row and badge
      if (previewRow) {
        previewRow.style.display = 'flex';
        previewRow.classList.toggle('ready', isReady);
      }

      if (previewTitle) {
        previewTitle.textContent = `${displayTitle} — ${displayArtist}`;
      }

      if (previewMeta) {
        const audioInfo = selectedAudioFile ? `Audio: ${selectedAudioFile.name} (${detectedDurationStr || '0:00'})` : 'Audio: none';
        const coverInfo = selectedCoverFile ? `Cover: ${selectedCoverFile.name}` : 'Cover: default sleeve (optional)';
        previewMeta.innerHTML = `${audioInfo} &bull; ${coverInfo}`;
      }

      if (previewBadge) {
        if (isReady) {
          previewBadge.textContent = '✓ READY TO PRESS';
          previewBadge.style.background = 'rgba(85, 239, 196, 0.15)';
          previewBadge.style.color = 'var(--accent)';
          previewBadge.style.borderColor = 'var(--accent)';
        } else if (!selectedAudioFile) {
          previewBadge.textContent = 'AWAITING AUDIO';
          previewBadge.style.background = 'rgba(255, 170, 0, 0.15)';
          previewBadge.style.color = '#ffaa00';
          previewBadge.style.borderColor = '#ffaa00';
        } else {
          previewBadge.textContent = `MISSING: ${missing.join(', ').toUpperCase()}`;
          previewBadge.style.background = 'rgba(255, 107, 107, 0.15)';
          previewBadge.style.color = '#ff6b6b';
          previewBadge.style.borderColor = '#ff6b6b';
        }
      }

      // Button visual state
      if (pressBtn) {
        pressBtn.classList.toggle('ready', isReady);
      }
    }

    // OPERATOR CONSOLE: FILE HANDLERS
    function handleAudioSelect(input) {
      const file = input?.files?.[0];
      if (!file) return;
      selectedAudioFile = file;
      detectedDurationSec = 0;
      detectedDurationStr = '0:00';

      // Auto-fill track title if empty
      const titleInput = document.getElementById('crateTitle');
      if (titleInput && !titleInput.value.trim()) {
        const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ').trim();
        titleInput.value = cleanName;
      }

      // Inspect duration via temporary Audio object
      const tempAudio = new Audio();
      const objectUrl = URL.createObjectURL(file);
      tempAudio.src = objectUrl;

      const onMeta = () => {
        if (tempAudio.duration && !isNaN(tempAudio.duration) && isFinite(tempAudio.duration)) {
          detectedDurationSec = Math.round(tempAudio.duration);
          detectedDurationStr = formatTime(detectedDurationSec);
        } else {
          detectedDurationSec = 0;
          detectedDurationStr = '0:00';
        }
        const durInput = document.getElementById('crateDuration');
        if (durInput) durInput.value = `${detectedDurationStr} (${detectedDurationSec}s)`;
        URL.revokeObjectURL(objectUrl);
        updatePreviewCard();
      };

      tempAudio.addEventListener('loadedmetadata', onMeta);
      tempAudio.addEventListener('error', () => {
        URL.revokeObjectURL(objectUrl);
        detectedDurationSec = 0;
        detectedDurationStr = '0:00';
        const durInput = document.getElementById('crateDuration');
        if (durInput) durInput.value = 'Auto (detected on server)';
        updatePreviewCard();
      });

      updatePreviewCard();
    }

    function handleCoverSelect(input) {
      const file = input?.files?.[0];
      if (!file) return;
      selectedCoverFile = file;

      const reader = new FileReader();
      reader.onload = function(e) {
        const previewImg = document.getElementById('cratePreviewImg');
        const placeholder = document.getElementById('cratePreviewPlaceholder');
        if (previewImg && placeholder) {
          previewImg.src = e.target.result;
          previewImg.style.display = 'block';
          placeholder.style.display = 'none';
        }
        updatePreviewCard();
      };
      reader.readAsDataURL(file);
      updatePreviewCard();
    }

    function setUploadProgress(percent, labelText) {
      const container = document.getElementById('crateProgressContainer');
      const bar = document.getElementById('crateProgressBar');
      const percentEl = document.getElementById('crateProgressPercent');
      const labelEl = document.getElementById('crateProgressLabel');

      if (container) container.style.display = percent === null ? 'none' : 'block';
      if (bar && percent !== null) bar.style.width = `${Math.min(100, Math.max(0, percent))}%`;
      if (percentEl && percent !== null) percentEl.textContent = `${Math.round(percent)}%`;
      if (labelEl && labelText) labelEl.textContent = labelText;
    }

    // Direct XHR streaming upload with progress updates
    function uploadAudioStream(uploadUrl, file, contentType) {
      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('PUT', uploadUrl, true);
        xhr.setRequestHeader('Content-Type', contentType || 'audio/ogg; codecs=opus');

        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            const filePct = Math.round((e.loaded / e.total) * 100);
            const overallPct = 30 + Math.round((e.loaded / e.total) * 55);
            setUploadProgress(overallPct, `// STREAMING OPUS AUDIO TO R2... (${filePct}%)`);
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
          } else {
            reject(new Error(`R2 upload rejected (HTTP ${xhr.status}: ${xhr.statusText || 'Upload error'})`));
          }
        };

        xhr.onerror = () => {
          reject(new Error('Network failure or CORS rejection during R2 audio stream upload. Cloudflare R2 requires a CORS policy to accept browser uploads.'));
        };
        xhr.onabort = () => reject(new Error('Audio stream upload was aborted'));
        xhr.send(file);
      });
    }

    function cropImageToSquare(file, maxSize = 800) {
      return new Promise((resolve) => {
        if (!file || !file.type.startsWith('image/')) {
          resolve(file);
          return;
        }
        const img = new Image();
        const url = URL.createObjectURL(file);
        img.onload = () => {
          URL.revokeObjectURL(url);
          try {
            const minSide = Math.min(img.width, img.height);
            const targetSize = Math.min(maxSize, minSide);
            const canvas = document.createElement('canvas');
            canvas.width = targetSize;
            canvas.height = targetSize;
            const ctx = canvas.getContext('2d');
            const sx = (img.width - minSide) / 2;
            const sy = (img.height - minSide) / 2;
            ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, targetSize, targetSize);
            canvas.toBlob((blob) => {
              if (blob) {
                resolve(new File([blob], file.name.replace(/\.[^/.]+$/, '') + '.jpg', { type: 'image/jpeg' }));
              } else {
                resolve(file);
              }
            }, 'image/jpeg', 0.9);
          } catch {
            resolve(file);
          }
        };
        img.onerror = () => {
          URL.revokeObjectURL(url);
          resolve(file);
        };
        img.src = url;
      });
    }

    // OPERATOR CONSOLE: SUBMISSION WORKFLOW
    async function pressVinylRecord() {
      const title = (document.getElementById('crateTitle')?.value || '').trim();
      const artist = (document.getElementById('crateArtist')?.value || '').trim();
      const album = (document.getElementById('crateAlbum')?.value || '').trim();
      const statusEl = document.getElementById('crateStatus');
      const btn = document.getElementById('pressVinylBtn');

      const missing = [];
      if (!title) missing.push('Track Title');
      if (!artist) missing.push('Artist Name');
      if (!selectedAudioFile) missing.push('Audio File (.opus)');

      if (missing.length > 0) {
        if (statusEl) {
          statusEl.innerHTML = `<span style="color: #ff6b6b; font-weight: 500;">[!] CANNOT PRESS: Missing ${missing.join(', ')}. Please complete these fields.</span>`;
        }
        if (!title) document.getElementById('crateTitle')?.focus();
        else if (!artist) document.getElementById('crateArtist')?.focus();
        else if (!selectedAudioFile) document.getElementById('audioFileInput')?.click();
        return;
      }

      let currentStep = 'Initializing assets';
      try {
        if (btn) {
          btn.disabled = true;
          btn.textContent = 'PRESSING VINYL...';
        }

        setUploadProgress(5, '// PREPARING ASSETS...');
        if (statusEl) statusEl.innerHTML = '<span style="color: var(--accent);">// PREPARING TRACK ASSETS FOR MASTERING...</span>';

        // 1. Process and upload Album Cover Art (if provided)
        let coverUrl = null;
        if (selectedCoverFile) {
          currentStep = 'Uploading album cover';
          if (statusEl) statusEl.textContent = '// PROCESSING & UPLOADING ALBUM COVER ART...';
          setUploadProgress(15, '// PROCESSING COVER ART...');

          const squareCover = await cropImageToSquare(selectedCoverFile, 800);
          const coverFormData = new FormData();
          coverFormData.append('cover', squareCover);
          coverFormData.append('image', squareCover);

          let coverRes = null;
          let coverData = null;

          try {
            coverRes = await fetch('/api/media/upload-cover', {
              method: 'POST',
              body: coverFormData,
            });
            if (coverRes.ok) {
              coverData = await coverRes.json().catch(() => null);
            }
          } catch (fetchErr) {
            console.warn('Cover upload network error, trying /api/media/upload-post-image:', fetchErr);
          }

          // Fallback to proven working upload-post-image endpoint if upload-cover failed
          if (!coverData?.success) {
            try {
              const fallbackRes = await fetch('/api/media/upload-post-image', {
                method: 'POST',
                body: coverFormData,
              });
              if (fallbackRes.ok) {
                coverData = await fallbackRes.json().catch(() => null);
              }
            } catch (fallbackErr) {
              console.warn('Fallback upload-post-image error:', fallbackErr);
            }
          }

          if (!coverData?.success || !coverData?.url) {
            throw new Error(coverData?.error || 'Cover upload failed');
          }
          coverUrl = coverData.url;
        }

        // 2. Request Presigned Upload URL for Opus Audio
        currentStep = 'Acquiring R2 audio ticket';
        if (statusEl) statusEl.textContent = '// REQUESTING R2 PRESIGNED AUDIO TICKET...';
        setUploadProgress(25, '// ACQUIRING R2 PRESIGNED TICKET...');

        let presignRes = null;
        try {
          presignRes = await fetch('/api/media/presign-audio', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              filename: selectedAudioFile.name,
              contentType: selectedAudioFile.type || 'audio/ogg; codecs=opus',
            }),
          });
        } catch (fetchErr) {
          console.warn('Presign request network error:', fetchErr);
          throw new Error(`Audio presign connection error: ${fetchErr.message}`);
        }

        let presignData = null;
        try {
          presignData = await presignRes.json();
        } catch {
          presignData = { error: `Server returned HTTP ${presignRes.status}` };
        }

        if (!presignRes.ok || !presignData?.success) {
          throw new Error(presignData?.error || `Audio presign rejected (HTTP ${presignRes.status})`);
        }

        // 3. Directly PUT Audio stream to Cloudflare R2 with progress
        currentStep = 'Streaming audio to Cloudflare R2';
        if (statusEl) statusEl.textContent = '// STREAMING OPUS AUDIO TO CLOUDFLARE R2...';
        setUploadProgress(30, '// STREAMING AUDIO TO R2...');

        await uploadAudioStream(
          presignData.uploadUrl,
          selectedAudioFile,
          presignData.contentType || selectedAudioFile.type || 'audio/ogg; codecs=opus'
        );

        const audioUrl = presignData.publicUrl;

        // 4. Save Track to Postgres Database
        currentStep = 'Registering record in database';
        if (statusEl) statusEl.textContent = '// REGISTERING RECORD IN DATABASE...';
        setUploadProgress(90, '// COMMITTING RECORD TO DATABASE...');

        const trackPayload = {
          title,
          artist,
          album: album || null,
          audio_url: audioUrl,
          cover_url: coverUrl,
          duration: detectedDurationStr || '0:00',
          duration_sec: detectedDurationSec || 0,
        };

        let trackRes = null;
        try {
          trackRes = await fetch('/api/tracks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(trackPayload),
          });
        } catch (fetchErr) {
          console.warn('Track register network error:', fetchErr);
          throw new Error(`Database registration connection error: ${fetchErr.message}`);
        }

        let trackData = null;
        try {
          trackData = await trackRes.json();
        } catch {
          trackData = { error: `Server returned HTTP ${trackRes.status}` };
        }

        if (!trackRes.ok || !trackData?.success) {
          throw new Error(trackData?.error || `Database registration rejected (HTTP ${trackRes.status})`);
        }

        setUploadProgress(100, '// COMPLETE: RECORD PRESSED');
        if (statusEl) statusEl.innerHTML = '<span style="color: var(--accent); font-weight: 600;">// SUCCESS: RECORD PRESSED TO CRATE! RELOADING...</span>';
        setTimeout(() => {
          window.location.reload();
        }, 1200);
      } catch (err) {
        console.error('Press vinyl error:', err);
        if (statusEl) {
          let extraHint = '';
          if (currentStep === 'Streaming audio to Cloudflare R2') {
            extraHint = '<br><span style="display:inline-block; margin-top:6px; font-size:11px; opacity:0.85;">Tip: Ensure your Cloudflare R2 bucket has CORS configured (run <code>npm run r2:cors</code> or add CORS policy in Cloudflare R2 Settings).</span>';
          }
          statusEl.innerHTML = `<span style="color: #ff6b6b; font-weight: 500;">[!] ERROR during [${currentStep}]: ${err.message || 'Operation failed'}${extraHint}</span>`;
        }
        setUploadProgress(null);
        if (btn) {
          btn.disabled = false;
          btn.textContent = 'PRESS VINYL →';
        }
      }
    }

    // DELETE TRACK FROM CRATE
    async function deleteTrackRecord(trackId, encodedTitle) {
      const title = decodeURIComponent(encodedTitle);
      if (!confirm(`Are you sure you want to remove "${title}" from the crate?`)) {
        return;
      }

      try {
        const res = await fetch(`/api/tracks?id=${trackId}`, { method: 'DELETE' });
        const data = await res.json();
        if (!res.ok || !data.success) {
          alert(data.error || 'Failed to remove track');
          return;
        }
        window.location.reload();
      } catch (err) {
        alert('Network error while deleting track');
      }
    }

    // Event binding & dropzone setup
    function initDropzoneEvents() {
      const audioDrop = document.getElementById('audioDropzone');
      const audioInput = document.getElementById('audioFileInput');
      if (audioDrop && audioInput) {
        audioDrop.addEventListener('dragover', (e) => {
          e.preventDefault();
          audioDrop.classList.add('drag-over');
        });
        audioDrop.addEventListener('dragleave', () => {
          audioDrop.classList.remove('drag-over');
        });
        audioDrop.addEventListener('drop', (e) => {
          e.preventDefault();
          audioDrop.classList.remove('drag-over');
          if (e.dataTransfer?.files?.length) {
            audioInput.files = e.dataTransfer.files;
            handleAudioSelect(audioInput);
          }
        });
        audioInput.addEventListener('change', () => handleAudioSelect(audioInput));
      }

      const coverDrop = document.getElementById('coverDropzone');
      const coverInput = document.getElementById('coverFileInput');
      if (coverDrop && coverInput) {
        coverDrop.addEventListener('dragover', (e) => {
          e.preventDefault();
          coverDrop.classList.add('drag-over');
        });
        coverDrop.addEventListener('dragleave', () => {
          coverDrop.classList.remove('drag-over');
        });
        coverDrop.addEventListener('drop', (e) => {
          e.preventDefault();
          coverDrop.classList.remove('drag-over');
          if (e.dataTransfer?.files?.length) {
            coverInput.files = e.dataTransfer.files;
            handleCoverSelect(coverInput);
          }
        });
        coverInput.addEventListener('change', () => handleCoverSelect(coverInput));
      }

      ['crateTitle', 'crateArtist', 'crateAlbum'].forEach((id) => {
        document.getElementById(id)?.addEventListener('input', updatePreviewCard);
      });

      const pressBtn = document.getElementById('pressVinylBtn');
      if (pressBtn) {
        pressBtn.addEventListener('click', (e) => {
          e.preventDefault();
          pressVinylRecord();
        });
      }
    }

    // Expose methods globally for inline triggers and external access
    window.handleAudioSelect = handleAudioSelect;
    window.handleCoverSelect = handleCoverSelect;
    window.pressVinylRecord = pressVinylRecord;
    window.deleteTrackRecord = deleteTrackRecord;
    window.updatePreviewCard = updatePreviewCard;

    function initPage() {
      initDropzoneEvents();
      updatePreviewCard();
      syncWithGlobalEngine();
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initPage);
    } else {
      initPage();
    }
    document.addEventListener('app:page-load', initPage);
  })();

  }, []);

  return (
    <>
  <div className="page-header">
    <div style={css("display: flex; justify-content: space-between; align-items: flex-end; flex-wrap: wrap; gap: 12px;")}>
      <div>
        <h1><span className="hl">music</span> player</h1>
        <div className="page-sub"><span className="jp-label">音楽</span> — vinyl crackle, opus audio & avif sleeves</div>
      </div>
      {authenticated ? (
        <span style={css("font-family: var(--mono); font-size: 0.65rem; color: var(--accent);")}>
          // operator: @{username} — <a href="/api/auth/logout" style={css("color: var(--text-3); text-decoration: underline;")}>logout</a>
        </span>
      ) : (
        <a href="/login" style={css("font-family: var(--mono); font-size: 0.6rem; color: var(--text-3); text-decoration: none; opacity: 0.6;")} title="Operator Login">
          // operator access
        </a>
      )}
    </div>
  </div>

  <section className="section">
    {/* OPERATOR CRATE CONSOLE (UPLOAD OPUS AUDIO & AVIF VINYL ART) */}
    {authenticated && (
      <div className="crate-console bracket-card reveal">
        <div className="crate-console-header">
          <span>// CRATE CONSOLE — PRESS NEW RECORD (OPUS × AVIF)</span>
          <span style={css("color: var(--text-3); font-size: 0.55rem;")}>
            {r2Configured ? 'R2: CONNECTED' : 'R2: ENV NOT SET'}
          </span>
        </div>

        {!r2Configured && (
          <div style={css("background: rgba(255, 107, 107, 0.1); border: 1px solid #ff6b6b; padding: 10px 14px; margin-bottom: 14px; font-family: var(--mono); font-size: 0.65rem; color: #ff8888;")}>
            [!] Cloudflare R2 credentials (R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME) are not configured. Add them to your environment variables to enable uploads.
          </div>
        )}

        <div className="crate-form-grid">
          <div className="crate-input-group">
            <label className="crate-label" htmlFor="crateTitle">// TRACK TITLE *</label>
            <input className="crate-input" id="crateTitle" type="text" placeholder="e.g. Neon & Rust" required />
          </div>
          <div className="crate-input-group">
            <label className="crate-label" htmlFor="crateArtist">// ARTIST NAME *</label>
            <input className="crate-input" id="crateArtist" type="text" placeholder="e.g. The Back Streets" required />
          </div>
        </div>

        <div className="crate-form-grid">
          <div className="crate-input-group">
            <label className="crate-label" htmlFor="crateAlbum">// ALBUM / EP NAME (OPTIONAL)</label>
            <input className="crate-input" id="crateAlbum" type="text" placeholder="e.g. Midnight Transmission" />
          </div>
          <div className="crate-input-group">
            <label className="crate-label">// ESTIMATED DURATION</label>
            <input className="crate-input" id="crateDuration" type="text" placeholder="auto-detected from audio" readonly style={css("opacity: 0.7;")} />
          </div>
        </div>

        {/* FILE DROPZONES */}
        <div className="crate-file-area">
          <div className="crate-dropzone" id="audioDropzone">
            <input type="file" id="audioFileInput" accept=".opus,audio/ogg,audio/opus,audio/webm,audio/*" onChange={(e) => { const w = window as any; handleAudioSelect(this) }} />
            <div className="crate-dropzone-title" id="audioFileLabel" style={css("display: flex; align-items: center; justify-content: center; gap: 6px;")}><Music size={14} /> SELECT OPUS AUDIO (.opus)</div>
            <div className="crate-dropzone-hint" id="audioFileHint">Native Opus stream • direct R2 presigned upload</div>
          </div>

          <div className="crate-dropzone" id="coverDropzone">
            <input type="file" id="coverFileInput" accept="image/*" onChange={(e) => { const w = window as any; handleCoverSelect(this) }} />
            <div className="crate-dropzone-title" id="coverFileLabel" style={css("display: flex; align-items: center; justify-content: center; gap: 6px;")}><ImageIcon size={14} /> SELECT ALBUM ART (IMAGE)</div>
            <div className="crate-dropzone-hint" id="coverFileHint">Sharp serverless transcode • 1:1 circle-crop • AVIF format</div>
          </div>
        </div>

        {/* LIVE VINYL CENTER & READINESS PREVIEW */}
        <div className="crate-preview-row" id="cratePreviewRow">
          <div className="crate-vinyl-preview" id="crateVinylPreview">
            <img id="cratePreviewImg" src="" alt="Vinyl Center Preview" style={css("display: none;")} />
            <div id="cratePreviewPlaceholder" style={css("width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: 0.65rem; color: var(--text-3); font-family: var(--mono); background: var(--bg-3);")}>KRZ</div>
            <div className="vinyl-spindle"></div>
          </div>
          <div className="crate-preview-info" style={css("flex: 1;")}>
            <div style={css("display: flex; justify-content: space-between; align-items: center; gap: 8px; flex-wrap: wrap;")}>
              <span style={css("color: var(--text-0); font-weight: 500; font-size: 0.75rem;")} id="previewTitle">New Track</span>
              <span id="previewBadge" style={css("font-family: var(--mono); font-size: 0.58rem; padding: 2px 6px; border-radius: 2px; background: rgba(255, 170, 0, 0.15); color: #ffaa00; border: 1px solid #ffaa00;")}>AWAITING AUDIO</span>
            </div>
            <span id="previewMeta" style={css("color: var(--text-3); font-size: 0.6rem; margin-top: 2px;")}>Audio: none • Cover: none (optional)</span>
          </div>
        </div>

        {/* PROGRESS BAR */}
        <div className="crate-progress-container" id="crateProgressContainer" style={css("display: none; margin-bottom: 12px;")}>
          <div style={css("display: flex; justify-content: space-between; font-family: var(--mono); font-size: 0.6rem; color: var(--text-2); margin-bottom: 4px;")}>
            <span id="crateProgressLabel">// UPLOADING...</span>
            <span id="crateProgressPercent">0%</span>
          </div>
          <div style={css("width: 100%; height: 4px; background: var(--bg-1); border: 1px solid var(--border); border-radius: 2px; overflow: hidden;")}>
            <div id="crateProgressBar" style={css("width: 0%; height: 100%; background: var(--accent); transition: width 0.15s ease;")}></div>
          </div>
        </div>

        <div className="crate-status-log" id="crateStatus"></div>

        <div className="crate-footer">
          <button className="post-btn" id="pressVinylBtn" onClick={(e) => { const w = window as any; pressVinylRecord() }}>
            PRESS VINYL →
          </button>
        </div>
      </div>
    )}

    {/* TURNTABLE PLAYER */}
    {tracks.length === 0 ? (
      <div className="bracket-card empty-state reveal">
        <div className="empty-state-glyph"><Disc3 size={36} /></div>
        <div className="empty-state-title">NO TRACKS IN PLAYLIST</div>
        <p className="empty-state-desc">
          The turntable is still. No records spinning and no audio tracks have been queued in the crate yet.
        </p>
        <span className="empty-state-meta">
          {authenticated ? '// crate empty — use the console above to upload an opus track' : '// status: silent — turntable powered off'}
        </span>
      </div>
    ) : (
      <>
        <div className="player-wrap bracket-card reveal">
          {/* VINYL TURNTABLE */}
          <div className="vinyl-area" id="vinylArea" onClick={(e) => { const w = window as any; togglePlay() }} title="Click to play / pause">
            <div className="vinyl-ring"></div>
            <div className="vinyl" id="vinyl">
              <div className="vinyl-label" id="vinylLabel">
                <img
                  id="vinylCoverImg"
                  className="vinyl-cover-img"
                  src={tracks[0]?.cover_url || ''}
                  alt="Vinyl Center Label"
                  style={tracks[0]?.cover_url ? undefined : { display: 'none' }}
                />
                <span id="vinylFallbackText" style={tracks[0]?.cover_url ? { display: 'none' } : undefined}>KRZ</span>
                <div className="vinyl-spindle"></div>
              </div>
            </div>
          </div>

          {/* PLAYER CONTROLS & METADATA */}
          <div className="player-info">
            <div className="track-now-label"><span className="pulse" id="nowPlayingPulse"></span> NOW PLAYING</div>
            <div className="track-title" id="trackTitle">{tracks[0]?.title}</div>
            <div className="track-artist" id="trackArtist">
              {tracks[0]?.artist}{tracks[0]?.album ? ` — [${tracks[0].album}]` : ''}
            </div>

            <div className="controls">
              <button className="ctrl-btn" onClick={() => { (window as any).prevTrack?.(); }} title="Previous track"><SkipBack size={14} /></button>
              <button className="ctrl-btn play" id="playBtn" onClick={() => { (window as any).togglePlay?.(); }} title="Play / Pause"><Play size={14} /></button>
              <button className="ctrl-btn" onClick={() => { (window as any).nextTrack?.(); }} title="Next track"><SkipForward size={14} /></button>
            </div>

            <div
              className="progress-track"
              id="progressBar"
              role="slider"
              aria-label="Audio playback seek bar"
              aria-valuemin={0}
              aria-valuemax={100}
              tabIndex={0}
              onClick={(e) => { (window as any).seekTrack?.(e.nativeEvent); }}
              onPointerDown={(e) => { (window as any).startScrub?.(e.nativeEvent); }}
            >
              <div className="progress-fill" id="progress" style={css("width: 0%;")}></div>
            </div>

            <div className="time-display">
              <span id="currentTime">0:00</span>
              <span id="totalTime">{tracks[0]?.duration || '0:00'}</span>
            </div>
          </div>
        </div>

        {/* TRACKLIST PLAYLIST */}
        <div className="playlist reveal" id="playlistContainer">
          {tracks.map((t, idx) => (
            <div
              className={`pl-item ${idx === 0 ? 'active' : ''}`}
              id={`pl-item-${idx}`}
              onclick={`selectTrack(${idx})`}
            >
              <span className="num">{String(idx + 1).padStart(2, '0')}</span>
              <span className="name">
                {t.title} <span style={css("opacity: 0.6; font-size: 0.65rem;")}>• {t.artist}</span>
              </span>
              <div style={css("display: flex; align-items: center; gap: 10px;")}>
                <span className="dur">{t.duration || '0:00'}</span>
                {authenticated && (
                  <button
                    className="track-del-btn"
                    onclick={`event.stopPropagation(); deleteTrackRecord('${t.id}', '${encodeURIComponent(t.title)}')`}
                    title="Remove record from crate"
                    style={css("display: inline-flex; align-items: center; justify-content: center;")}
                  >
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </>
    )}
  </section>

  {/* STORE TRACKS DATA IN CLIENT DATASET */}
  <div id="tracksDataStore" data-tracks={JSON.stringify(tracks)} style={css("display: none;")}></div>

    </>
  );
}
