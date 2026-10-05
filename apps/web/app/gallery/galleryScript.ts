// @ts-nocheck
/* eslint-disable */
// Faithful port of the inline <script> from the Astro gallery page.
export function initGallery(isOperator: boolean): () => void {
    // PARSE STORED GALLERY DATA SAFELY
    let galleryData = [];
    try {
      const storeEl = document.getElementById('galleryDataStore');
      if (storeEl && storeEl.dataset.gallery) {
        galleryData = JSON.parse(storeEl.dataset.gallery);
      }
    } catch (e) {
      console.warn('Error reading gallery data store:', e);
    }

    let currentActiveTag = 'all';
    let currentLightboxIdx = -1;
    let selectedFilesQueue = [];
    let isUploading = false;
    const revealedItemIds = new Set();

    // NSFW Content Filtering & Age Verification Logic
    window.applyNsfwPreferences = function () {
      const controlText = document.getElementById('nsfwControlText');
      const nsfwBtn = document.getElementById('nsfwControlBtn');

      // Operator defaults to 'show' (open all); visitor defaults to 'blur'
      const defaultMode = isOperator ? 'show' : 'blur';
      const mode = localStorage.getItem('kurzagin_nsfw_mode') || defaultMode;
      const nsfwCards = document.querySelectorAll('.gallery-card[data-nsfw="true"]');

      if (mode === 'show') {
        if (controlText) {
          controlText.textContent = isOperator ? 'NSFW: OPEN ALL' : 'NSFW: OPEN ALL (18+)';
        }
        if (nsfwBtn) {
          nsfwBtn.style.borderColor = 'rgba(255, 71, 87, 0.45)';
          nsfwBtn.style.color = '#ff6b81';
          nsfwBtn.title = isOperator
            ? 'NSFW filter: Open all captures (Default for operator • Click to change)'
            : 'NSFW filter: Open all captures (18+ verified • Click to change)';
        }
        nsfwCards.forEach((c) => c.classList.remove('nsfw-blurred'));
      } else {
        if (controlText) {
          controlText.textContent = 'NSFW: BLURRED';
        }
        if (nsfwBtn) {
          nsfwBtn.style.borderColor = '';
          nsfwBtn.style.color = '';
          nsfwBtn.title = 'NSFW filter: Blurred (Click to change)';
        }
        nsfwCards.forEach((c) => {
          const id = c.getAttribute('data-id');
          if (!revealedItemIds.has(id)) {
            c.classList.add('nsfw-blurred');
          } else {
            c.classList.remove('nsfw-blurred');
          }
        });
      }

      const modalBadge = document.getElementById('modalNsfwCurrentBadge');
      if (modalBadge) {
        modalBadge.textContent = mode === 'show' ? 'CURRENT: OPEN ALL' : 'CURRENT: BLURRED';
        modalBadge.style.color = mode === 'show' ? '#ff6b81' : 'var(--text-3)';
      }
    };

    window.toggleCardUnblur = function (idx) {
      if (idx < 0 || idx >= galleryData.length) return;
      const item = galleryData[idx];
      const card = document.querySelector(`.gallery-card[data-index="${idx}"]`);
      if (!card || !item) return;

      if (card.classList.contains('nsfw-blurred')) {
        card.classList.remove('nsfw-blurred');
        revealedItemIds.add(item.id);
      } else {
        card.classList.add('nsfw-blurred');
        revealedItemIds.delete(item.id);
      }
    };

    window.handlePolaroidClick = function (e, idx) {
      const card = document.querySelector(`.gallery-card[data-index="${idx}"]`);
      if (card && card.classList.contains('nsfw-blurred')) {
        window.toggleCardUnblur(idx);
        return;
      }
      window.openLightbox(idx);
    };

    window.openNsfwModal = function () {
      const modal = document.getElementById('nsfwModal');
      if (modal) {
        window.applyNsfwPreferences();
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
      }
    };

    window.closeNsfwModal = function () {
      const modal = document.getElementById('nsfwModal');
      if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
      }
    };

    window.handleNsfwModalBackdropClick = function (e) {
      if (e.target && e.target.id === 'nsfwModal') {
        window.closeNsfwModal();
      }
    };

    window.confirmAgeAndUnblurAll = function () {
      if (!isOperator) {
        if (!confirm('Age Confirmation (18+):\n\nDo you confirm that you are at least 18 years old or of legal age in your jurisdiction to view adult/sensitive content?')) {
          return;
        }
      }
      localStorage.setItem('kurzagin_nsfw_mode', 'show');
      window.applyNsfwPreferences();
      window.closeNsfwModal();
    };

    window.setNsfwBlurredMode = function () {
      localStorage.setItem('kurzagin_nsfw_mode', 'blur');
      revealedItemIds.clear();
      window.applyNsfwPreferences();
      window.closeNsfwModal();
    };

    window.revealLightboxNsfw = function () {
      const lbPolaroid = document.getElementById('lightboxPolaroidWrap');
      const overlay = document.getElementById('lightboxNsfwOverlay');
      if (lbPolaroid) lbPolaroid.classList.remove('nsfw-blurred');
      if (overlay) overlay.style.display = 'none';
      if (currentLightboxIdx >= 0 && galleryData[currentLightboxIdx]) {
        revealedItemIds.add(galleryData[currentLightboxIdx].id);
        window.applyNsfwPreferences();
      }
    };

    // Global toggle for upload form
    window.toggleUploadForm = function () {
      const card = document.getElementById('operatorUploadCard');
      if (!card) return;
      const isHidden = card.style.display === 'none' || card.style.display === '';
      card.style.display = isHidden ? 'block' : 'none';
      if (isHidden) {
        card.scrollIntoView({ behavior: 'smooth' });
      }
    };

    // Multi-file drag and drop handling
    window.handleDropzoneClick = function (e) {
      if (selectedFilesQueue.length === 0) {
        document.getElementById('galleryFileInput')?.click();
      }
    };

    window.handleFileDrop = function (e) {
      e.preventDefault();
      const dropzone = document.getElementById('dropzone');
      if (dropzone) dropzone.style.borderColor = 'var(--border)';

      if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        addFilesToQueue(Array.from(e.dataTransfer.files));
      }
    };

    window.handleFilesSelected = function (e) {
      if (e.target.files && e.target.files.length > 0) {
        addFilesToQueue(Array.from(e.target.files));
      }
      e.target.value = '';
    };

    function addFilesToQueue(files) {
      const validFiles = files.filter(
        (f) => f.type.startsWith('image/') || /\.(jpe?g|png|webp|avif|gif)$/i.test(f.name)
      );
      if (validFiles.length === 0) {
        alert('Please select valid image files (JPG, PNG, WEBP, AVIF).');
        return;
      }

      const defaultNsfw = Boolean(document.getElementById('galleryNsfwInput')?.checked);

      validFiles.forEach((file) => {
        const baseName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
        selectedFilesQueue.push({
          id: 'item_' + Math.random().toString(36).slice(2, 9) + Date.now().toString(36),
          file,
          previewUrl: URL.createObjectURL(file),
          title: '',
          defaultTitle: baseName,
          isNsfw: defaultNsfw,
          status: 'queued',
          error: null,
        });
      });

      renderQueue();
    }

    window.updateItemTitle = function (id, val) {
      const item = selectedFilesQueue.find((x) => x.id === id);
      if (item) item.title = val;
    };

    window.toggleItemNsfw = function (id, checked) {
      const item = selectedFilesQueue.find((x) => x.id === id);
      if (!item) return;
      item.isNsfw = typeof checked === 'boolean' ? checked : !item.isNsfw;

      const tile = document.getElementById(`queue-tile-${id}`);
      const nsfwBtn = tile?.querySelector('.queue-tile-nsfw') as HTMLButtonElement | null;
      if (nsfwBtn) {
        nsfwBtn.classList.toggle('active', Boolean(item.isNsfw));
        nsfwBtn.setAttribute('onclick', `toggleItemNsfw('${item.id}', ${!item.isNsfw})`);
      }

      const batchCheckbox = document.getElementById('galleryNsfwInput') as HTMLInputElement | null;
      if (batchCheckbox && selectedFilesQueue.length > 0) {
        const allNsfw = selectedFilesQueue.every((x) => Boolean(x.isNsfw));
        const noneNsfw = selectedFilesQueue.every((x) => !x.isNsfw);
        if (allNsfw) {
          batchCheckbox.checked = true;
        } else if (noneNsfw) {
          batchCheckbox.checked = false;
        }
      }
    };

    window.handleBatchNsfwChange = function (checked) {
      const isChecked = Boolean(checked);
      selectedFilesQueue.forEach((item) => {
        item.isNsfw = isChecked;
        const tile = document.getElementById(`queue-tile-${item.id}`);
        const nsfwBtn = tile?.querySelector('.queue-tile-nsfw') as HTMLButtonElement | null;
        if (nsfwBtn) {
          nsfwBtn.classList.toggle('active', isChecked);
          nsfwBtn.setAttribute('onclick', `toggleItemNsfw('${item.id}', ${!isChecked})`);
        }
      });
      const batchCheckbox = document.getElementById('galleryNsfwInput') as HTMLInputElement | null;
      if (batchCheckbox && batchCheckbox.checked !== isChecked) {
        batchCheckbox.checked = isChecked;
      }
    };

    window.removeQueueItem = function (id) {
      if (isUploading) return;
      const index = selectedFilesQueue.findIndex((x) => x.id === id);
      if (index !== -1) {
        URL.revokeObjectURL(selectedFilesQueue[index].previewUrl);
        selectedFilesQueue.splice(index, 1);
        renderQueue();
      }
    };

    window.clearAllSelectedFiles = function () {
      if (isUploading) return;
      selectedFilesQueue.forEach((item) => URL.revokeObjectURL(item.previewUrl));
      selectedFilesQueue = [];
      const fileInput = document.getElementById('galleryFileInput') as HTMLInputElement | null;
      if (fileInput) fileInput.value = '';
      const batchCheckbox = document.getElementById('galleryNsfwInput') as HTMLInputElement | null;
      if (batchCheckbox) batchCheckbox.checked = false;
      renderQueue();
    };

    window.clearSelectedFile = window.clearAllSelectedFiles;

    function formatBytes(bytes) {
      if (!bytes || bytes === 0) return '0 B';
      const k = 1024;
      const sizes = ['B', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return (bytes / Math.pow(k, i)).toFixed(1) + ' ' + sizes[i];
    }

    function escapeHtml(str) {
      return String(str || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    }

    function getStatusColor(status) {
      switch (status) {
        case 'uploading':
        case 'converting':
        case 'pinning':
          return 'var(--accent)';
        case 'done':
          return 'var(--green-soft)';
        case 'error':
          return '#ff5555';
        default:
          return 'var(--text-3)';
      }
    }

    function shortenErrorMessage(msg: any): string {
      if (!msg) return 'ERR';
      const m = String(msg).toLowerCase();
      if (m.includes('cloudflare r2') || m.includes('r2 storage')) return 'R2 UNCONFIGURED';
      if (m.includes('unauthorized') || m.includes('login required')) return 'UNAUTHORIZED';
      if (m.includes('too large') || m.includes('4.5mb')) return 'FILE > 4.5MB';
      if (m.includes('rate limit') || m.includes('429')) return 'RATE LIMITED';
      if (m.includes('image processing') || m.includes('sharp')) return 'IMAGE TRANSCODE ERR';
      if (m.includes('pinning failed') || m.includes('gallery item')) return 'PIN FAILED';
      if (m.includes('database') || m.includes('db')) return 'DB ERROR';
      const clean = String(msg).trim();
      if (clean.length > 16) return clean.slice(0, 14) + '…';
      return clean.toUpperCase();
    }

    window.showQueueItemError = function (id) {
      const item = selectedFilesQueue.find((x) => x.id === id);
      if (!item) return;
      const errorMsg = item.error || 'Unknown upload error occurred.';
      alert(
        `[TRANSMISSION ERROR DETAILS]\n\nFile: ${item.file.name} (${formatBytes(item.file.size)})\n\nReason:\n${errorMsg}\n\nTip: You can remove this item using ✕ or resolve the issue and click RETRY PINNING.`
      );
    };

    function getStatusLabel(item) {
      switch (item.status) {
        case 'uploading':
          return '↑ UPLOAD';
        case 'converting':
          return '⚙ AVIF';
        case 'pinning':
          return '📌 PIN';
        case 'done':
          return '✓ DONE';
        case 'error':
          return '❌ ERR';
        default:
          return '';
      }
    }

    window.togglePerImageTitles = function () {
      const wrap = document.getElementById('perImageTitlesWrap');
      const btn = document.getElementById('toggleTitlesBtn');
      if (!wrap || !btn) return;
      const isHidden = wrap.style.display === 'none' || wrap.style.display === '';
      wrap.style.display = isHidden ? 'flex' : 'none';
      btn.textContent = isHidden ? '- HIDE TITLES' : '+ CUSTOM TITLES';
    };

    function renderQueue() {
      const emptyEl = document.getElementById('dropzoneEmpty');
      const queueEl = document.getElementById('dropzoneQueue');
      const listEl = document.getElementById('queueItemsList');
      const titlesWrap = document.getElementById('perImageTitlesWrap');
      const badgeEl = document.getElementById('queueCountBadge');
      const sizeEl = document.getElementById('queueTotalSize');
      const submitBtn = document.getElementById('submitGalleryBtn');
      const errorSec = document.getElementById('queueErrorSection');

      if (selectedFilesQueue.length === 0) {
        if (emptyEl) emptyEl.style.display = 'block';
        if (queueEl) queueEl.style.display = 'none';
        if (errorSec) {
          errorSec.innerHTML = '';
          errorSec.style.display = 'none';
        }
        if (titlesWrap) {
          titlesWrap.innerHTML = '';
          titlesWrap.style.display = 'none';
        }
        const btn = document.getElementById('toggleTitlesBtn');
        if (btn) btn.textContent = '+ CUSTOM TITLES';
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.textContent = 'PIN TO BOARD →';
        }
        return;
      }

      if (emptyEl) emptyEl.style.display = 'none';
      if (queueEl) queueEl.style.display = 'flex';

      const totalBytes = selectedFilesQueue.reduce((acc, curr) => acc + (curr.file.size || 0), 0);
      if (badgeEl) badgeEl.textContent = `${selectedFilesQueue.length} ${selectedFilesQueue.length === 1 ? 'ARTIFACT' : 'ARTIFACTS'}`;
      if (sizeEl) sizeEl.textContent = `(${formatBytes(totalBytes)} total)`;

      if (submitBtn && !isUploading) {
        submitBtn.disabled = false;
        submitBtn.textContent = `PIN TO BOARD (${selectedFilesQueue.length}) →`;
      }

      if (listEl) {
        listEl.innerHTML = selectedFilesQueue
          .map(
            (item) => `
          <div
            class="queue-tile ${item.status === 'done' ? 'is-done' : ''} ${item.status === 'error' ? 'is-error' : ''} ${item.status === 'uploading' || item.status === 'converting' || item.status === 'pinning' ? 'is-processing' : ''}"
            id="queue-tile-${item.id}"
            ${
              item.status === 'error'
                ? `title="Error: ${escapeHtml(item.error || 'Upload failed')}\n(Click to view details)" onclick="showQueueItemError('${item.id}')"`
                : ''
            }
          >
            <img src="${item.previewUrl}" alt="Preview" class="queue-tile-img" />

            ${
              !isUploading
                ? `
              <button
                type="button"
                onclick="event.stopPropagation(); removeQueueItem('${item.id}')"
                class="queue-tile-del"
                title="Remove image"
              >
                ✕
              </button>
            `
                : ''
            }

            <button
              type="button"
              onclick="event.stopPropagation(); toggleItemNsfw('${item.id}', !${Boolean(item.isNsfw)})"
              class="queue-tile-nsfw ${item.isNsfw ? 'active' : ''}"
              title="Toggle 18+ sensitive flag"
              ${isUploading ? 'disabled' : ''}
            >
              18+
            </button>

            <div class="queue-tile-footer">
              <span class="queue-tile-size" style="${item.file.size > 4.5 * 1024 * 1024 ? 'color: var(--accent); font-weight: 600;' : ''}" title="${item.file.size > 4.5 * 1024 * 1024 ? 'Over 4.5MB: will be automatically optimized to fit serverless payload' : ''}">${formatBytes(item.file.size)}${item.file.size > 4.5 * 1024 * 1024 ? ' ⚡' : ''}</span>
            </div>

            <div
              id="status-${item.id}"
              class="queue-tile-overlay"
              ${
                item.status === 'error'
                  ? `title="Error: ${escapeHtml(item.error || 'Upload failed')}\n(Click to view details)"`
                  : ''
              }
            >
              <span class="queue-tile-status-icon" style="color: ${getStatusColor(item.status)};">
                ${getStatusLabel(item)}
              </span>
              ${
                item.status === 'error'
                  ? `
                <span class="queue-tile-err-badge" title="${escapeHtml(item.error || 'Upload failed')}">
                  ${escapeHtml(shortenErrorMessage(item.error))}
                </span>
                <span class="queue-tile-tap-hint">TAP INFO</span>
              `
                  : ''
              }
            </div>
          </div>
        `
          )
          .join('');
      }

      if (errorSec) {
        const failedItems = selectedFilesQueue.filter((x) => x.status === 'error');
        if (failedItems.length > 0) {
          const hasR2Err = failedItems.some((x) => (x.error || '').toLowerCase().includes('r2'));
          const hasAuthErr = failedItems.some(
            (x) =>
              (x.error || '').toLowerCase().includes('unauthorized') ||
              (x.error || '').toLowerCase().includes('login')
          );
          const hasSizeErr = failedItems.some(
            (x) =>
              (x.error || '').toLowerCase().includes('too large') ||
              (x.error || '').toLowerCase().includes('4.5mb')
          );

          let hintText = '';
          if (hasR2Err) {
            hintText =
              '💡 Cause: Cloudflare R2 storage credentials (R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME) are not configured on server.';
          } else if (hasAuthErr) {
            hintText =
              '💡 Cause: Operator session expired or unauthorized. Please re-login to operator account.';
          } else if (hasSizeErr) {
            hintText =
              '💡 Cause: File exceeds max server limit of 4.5MB. Please compress or resize image.';
          }

          errorSec.innerHTML = `
            <div class="queue-error-header">
              <span>⚠️ TRANSMISSION ERRORS (${failedItems.length} FAILED)</span>
              <span style="font-size: 0.52rem; font-weight: normal; color: var(--text-3); font-family: var(--mono);">tap row or badge to inspect</span>
            </div>
            <div class="queue-error-list">
              ${failedItems
                .map(
                  (x) => `
                <div class="queue-error-row" onclick="showQueueItemError('${x.id}')" title="Click to view details: ${escapeHtml(x.error || 'Upload error')}">
                  <span class="queue-error-file" title="${escapeHtml(x.file.name)}">${escapeHtml(x.file.name)}</span>
                  <span class="queue-error-msg" title="${escapeHtml(x.error || 'Upload failed')}">${escapeHtml(x.error || 'Upload failed')}</span>
                </div>
              `
                )
                .join('')}
            </div>
            ${hintText ? `<div class="queue-error-hint">${escapeHtml(hintText)}</div>` : ''}
          `;
          errorSec.style.display = 'flex';
        } else {
          errorSec.innerHTML = '';
          errorSec.style.display = 'none';
        }
      }

      if (titlesWrap) {
        titlesWrap.innerHTML = selectedFilesQueue
          .map(
            (item) => `
          <div class="per-image-title-row">
            <span class="per-image-title-name" title="${escapeHtml(item.file.name)}">
              ${escapeHtml(item.file.name)}
            </span>
            <input
              type="text"
              placeholder="Title: ${escapeHtml(item.defaultTitle)}"
              value="${escapeHtml(item.title)}"
              oninput="updateItemTitle('${item.id}', this.value)"
              class="per-image-title-input"
              ${isUploading ? 'disabled' : ''}
            />
          </div>
        `
          )
          .join('');
      }
    }

    function updateItemStatusUI(id, statusText, color, statusClass, errDetails) {
      const tile = document.getElementById(`queue-tile-${id}`);
      if (tile) {
        tile.classList.remove('is-processing', 'is-done', 'is-error');
        if (statusClass) tile.classList.add(statusClass);
        if (statusClass === 'is-error') {
          const err = errDetails || statusText.replace(/^❌\s*/, '');
          tile.setAttribute('title', `Upload error: ${err}\n(Click to inspect)`);
          tile.setAttribute('onclick', `showQueueItemError('${id}')`);
        } else {
          tile.removeAttribute('title');
          tile.removeAttribute('onclick');
        }
      }
      const overlay = document.getElementById(`status-${id}`);
      if (overlay) {
        if (statusClass === 'is-error') {
          const err = errDetails || statusText.replace(/^❌\s*/, '');
          overlay.setAttribute('title', `Error: ${escapeHtml(err)}\n(Click to view details)`);
          overlay.innerHTML = `
            <span class="queue-tile-status-icon" style="color: ${color || '#ff5555'};">❌ ERR</span>
            <span class="queue-tile-err-badge" title="${escapeHtml(err)}">${escapeHtml(shortenErrorMessage(err))}</span>
            <span class="queue-tile-tap-hint">TAP INFO</span>
          `;
        } else {
          overlay.removeAttribute('title');
          overlay.innerHTML = `<span class="queue-tile-status-icon" style="color: ${color || 'var(--accent)'};">${escapeHtml(statusText)}</span>`;
        }
      }
    }

    async function prepareFileForUpload(file: File): Promise<File> {
      // If file is 4MB or smaller, send directly without client-side re-compression
      if (file.size <= 4 * 1024 * 1024) {
        return file;
      }

      // If file exceeds 4MB, downscale in browser canvas to stay safely under Vercel's 4.5MB limit
      return new Promise<File>((resolve) => {
        const img = new Image();
        const objectUrl = URL.createObjectURL(file);
        img.onload = () => {
          URL.revokeObjectURL(objectUrl);
          const maxDim = 2560;
          let width = img.naturalWidth || img.width;
          let height = img.naturalHeight || img.height;

          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(file);
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);
          canvas.toBlob(
            (blob) => {
              if (blob && blob.size < file.size) {
                const optimizedFile = new File([blob], file.name.replace(/\.[^/.]+$/, '') + '.jpg', {
                  type: 'image/jpeg',
                });
                resolve(optimizedFile);
              } else {
                resolve(file);
              }
            },
            'image/jpeg',
            0.88
          );
        };
        img.onerror = () => {
          URL.revokeObjectURL(objectUrl);
          resolve(file);
        };
        img.src = objectUrl;
      });
    }

    // Submit gallery batch
    window.submitGalleryBatch = async function () {
      if (selectedFilesQueue.length === 0) {
        alert('Please choose or drop image files to pin.');
        return;
      }
      if (isUploading) return;

      const batchTitle = (document.getElementById('galleryTitleInput')?.value || '').trim();
      const caption = (document.getElementById('galleryCaptionInput')?.value || '').trim();
      const tags = (document.getElementById('galleryTagsInput')?.value || '').trim();

      const submitBtn = document.getElementById('submitGalleryBtn');
      const statusText = document.getElementById('uploadStatusText');
      const progressSec = document.getElementById('uploadProgressSection');
      const progressBar = document.getElementById('uploadProgressBar');
      const progressLabel = document.getElementById('uploadProgressLabel');
      const progressPercent = document.getElementById('uploadProgressPercent');

      // Process items that haven't been successfully pinned yet
      const pendingItems = selectedFilesQueue.filter((x) => x.status !== 'done');
      if (pendingItems.length === 0) {
        window.location.reload();
        return;
      }

      isUploading = true;
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'TRANSMITTING...';
      }
      if (progressSec) progressSec.style.display = 'flex';
      renderQueue();

      const total = pendingItems.length;
      let completed = 0;
      let successful = 0;
      let failed = 0;

      for (let i = 0; i < total; i++) {
        const item = pendingItems[i];
        const itemNumber = i + 1;

        // Pacing delay (350ms) between consecutive serverless calls to avoid upstream rate limits
        if (i > 0) {
          await new Promise((resolve) => setTimeout(resolve, 350));
        }

        let finalTitle = item.title.trim();
        if (!finalTitle) {
          if (batchTitle) {
            finalTitle = total > 1 ? `${batchTitle} (${itemNumber})` : batchTitle;
          } else {
            finalTitle = item.defaultTitle;
          }
        }

        try {
          let fileToSend = item.file;
          if (item.file.size > 4 * 1024 * 1024) {
            item.status = 'converting';
            updateItemStatusUI(item.id, '// OPTIMIZING...', 'var(--accent)', 'is-processing');
            if (progressLabel) progressLabel.textContent = `// [${itemNumber}/${total}] OPTIMIZING ${item.file.name} (<4.5MB)...`;
            fileToSend = await prepareFileForUpload(item.file);
          }

          item.status = 'uploading';
          updateItemStatusUI(item.id, '// UPLOADING...', 'var(--accent)', 'is-processing');
          if (progressLabel) progressLabel.textContent = `// [${itemNumber}/${total}] UPLOADING ${item.file.name}...`;
          if (statusText) statusText.textContent = `// transmitting artifact ${itemNumber} of ${total}...`;

          const formData = new FormData();
          formData.append('file', fileToSend, item.file.name);

          item.status = 'converting';
          updateItemStatusUI(item.id, '// CONVERTING AVIF...', 'var(--accent)', 'is-processing');

          const uploadRes = await fetch('/api/media/upload-post-image', {
            method: 'POST',
            body: formData,
          });

          let uploadJson: any = null;
          try {
            uploadJson = await uploadRes.json();
          } catch {
            if (uploadRes.status === 413) {
              throw new Error(`File too large (${formatBytes(item.file.size)}). Max allowed is 4.5MB.`);
            } else if (uploadRes.status === 429) {
              throw new Error('Rate limit exceeded. Please wait a moment before retrying.');
            }
            throw new Error(`Upload failed (HTTP ${uploadRes.status}: ${uploadRes.statusText || 'Server error'})`);
          }
          if (!uploadRes.ok || !uploadJson?.success) {
            throw new Error(uploadJson?.error || `Upload failed (HTTP ${uploadRes.status}).`);
          }

          item.status = 'pinning';
          updateItemStatusUI(item.id, '// PINNING...', 'var(--accent)', 'is-processing');

          const batchCheckbox = document.getElementById('galleryNsfwInput') as HTMLInputElement | null;
          const isItemNsfw = item.isNsfw !== undefined ? Boolean(item.isNsfw) : Boolean(batchCheckbox?.checked);

          const galleryRes = await fetch('/api/gallery', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              url: uploadJson.url,
              title: finalTitle,
              caption: caption,
              tags: tags,
              width: uploadJson.width,
              height: uploadJson.height,
              is_nsfw: isItemNsfw,
            }),
          });

          let galleryJson: any = null;
          try {
            galleryJson = await galleryRes.json();
          } catch {
            throw new Error(`Pinning failed (HTTP ${galleryRes.status}: ${galleryRes.statusText || 'Server error'})`);
          }
          if (!galleryRes.ok || !galleryJson?.success) {
            throw new Error(galleryJson?.error || 'Failed to pin gallery item.');
          }

          item.status = 'done';
          updateItemStatusUI(item.id, '✓ PINNED', 'var(--green-soft)', 'is-done');
          successful++;
        } catch (err: any) {
          console.error(`Error uploading ${item.file.name}:`, err);
          item.status = 'error';
          item.error = err.message || 'Upload failed';
          updateItemStatusUI(item.id, '❌ ERR', '#ff5555', 'is-error', item.error);
          failed++;
        }

        completed++;
        const pct = Math.round((completed / total) * 100);
        if (progressBar) progressBar.style.width = `${pct}%`;
        if (progressPercent) progressPercent.textContent = `${pct}%`;
      }

      isUploading = false;

      if (failed === 0) {
        if (statusText) statusText.textContent = `✓ All ${successful} polaroids pinned to board!`;
        if (progressLabel) progressLabel.textContent = '// TRANSMISSION COMPLETE';
        setTimeout(() => {
          window.location.reload();
        }, 800);
      } else {
        // Keep failed items in queue for retry, remove succeeded ones
        const succeeded = selectedFilesQueue.filter((x) => x.status === 'done');
        succeeded.forEach((x) => {
          try { URL.revokeObjectURL(x.previewUrl); } catch {}
        });
        selectedFilesQueue = selectedFilesQueue.filter((x) => x.status !== 'done');
        renderQueue();

        if (successful > 0) {
          if (statusText) {
            statusText.textContent = `⚠️ Pinned ${successful} polaroids (${failed} failed). Review error badges below and retry.`;
          }
        } else {
          if (statusText) {
            statusText.textContent = `❌ All ${failed} uploads failed. Review error badges below.`;
          }
        }
        if (progressLabel) progressLabel.textContent = '// TRANSMISSION INCOMPLETE';
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = `RETRY PINNING (${selectedFilesQueue.length}) →`;
        }
      }
    };

    window.submitGalleryItem = window.submitGalleryBatch;

    // Delete gallery item
    window.deleteGalleryItem = async function (id) {
      if (!confirm('Are you sure you want to remove this polaroid from the darkroom board?')) {
        return;
      }

      try {
        const res = await fetch(`/api/gallery?id=${encodeURIComponent(id)}`, {
          method: 'DELETE',
        });
        const json = await res.json();
        if (json.success) {
          window.location.reload();
        } else {
          alert(json.error || 'Failed to delete item.');
        }
      } catch (err) {
        console.error(err);
        alert('Error deleting polaroid.');
      }
    };

    window.deleteCurrentLightboxItem = function () {
      if (currentLightboxIdx >= 0 && galleryData[currentLightboxIdx]) {
        const item = galleryData[currentLightboxIdx];
        closeLightbox();
        window.deleteGalleryItem(item.id);
      }
    };

    function updateLightboxNsfwUI(item) {
      if (!item) return;
      const isNsfwItem = Boolean(item.is_nsfw);
      const nsfwBadge = document.getElementById('lightboxNsfwBadge');
      const badgeText = document.getElementById('lightboxNsfwBadgeText');
      const toggleBtn = document.getElementById('lightboxNsfwToggleBtn');
      const toggleText = document.getElementById('lightboxNsfwToggleText');
      const nsfwOverlay = document.getElementById('lightboxNsfwOverlay');
      const lbPolaroid = document.getElementById('lightboxPolaroidWrap');

      if (nsfwBadge) {
        if (isOperator) {
          nsfwBadge.style.display = 'inline-flex';
          nsfwBadge.className = `lb-nsfw-tag is-operator ${isNsfwItem ? 'is-nsfw' : 'is-sfw'}`;
          if (badgeText) {
            badgeText.textContent = isNsfwItem ? '18+ NSFW' : 'SFW';
          }
          nsfwBadge.title = isNsfwItem
            ? 'Operator: Click to unmark NSFW'
            : 'Operator: Click to mark as 18+ NSFW';
        } else {
          nsfwBadge.style.display = isNsfwItem ? 'inline-flex' : 'none';
          nsfwBadge.className = 'lb-nsfw-tag';
          if (badgeText) {
            badgeText.textContent = '18+ NSFW';
          }
          nsfwBadge.title = '18+ Sensitive Content';
        }
      }

      if (toggleBtn) {
        toggleBtn.classList.toggle('is-nsfw', isNsfwItem);
        toggleBtn.title = isNsfwItem
          ? 'Mark as safe (SFW)'
          : 'Mark as sensitive (18+ NSFW)';
        if (toggleText) {
          toggleText.textContent = isNsfwItem ? '18+ NSFW: ON' : 'MARK NSFW';
        }
      }

      const defaultMode = isOperator ? 'show' : 'blur';
      const mode = localStorage.getItem('kurzagin_nsfw_mode') || defaultMode;
      const isRevealed = revealedItemIds.has(item.id);

      if (isNsfwItem && mode !== 'show' && !isRevealed) {
        if (lbPolaroid) lbPolaroid.classList.add('nsfw-blurred');
        if (nsfwOverlay) nsfwOverlay.style.display = 'flex';
      } else {
        if (lbPolaroid) lbPolaroid.classList.remove('nsfw-blurred');
        if (nsfwOverlay) nsfwOverlay.style.display = 'none';
      }
    }

    // Toggle NSFW status for a gallery item (Operator only)
    window.toggleGalleryItemNsfw = async function (id, explicitState) {
      if (!isOperator) return;

      const idx = galleryData.findIndex((x) => x.id === id);
      if (idx === -1) return;

      const item = galleryData[idx];
      if (item._isUpdatingNsfw) return;

      const currentStatus = Boolean(item.is_nsfw);
      const newStatus = typeof explicitState === 'boolean' ? explicitState : !currentStatus;

      item._isUpdatingNsfw = true;

      const toggleText = document.getElementById('lightboxNsfwToggleText');
      if (currentLightboxIdx === idx && toggleText) {
        toggleText.textContent = 'UPDATING...';
      }

      try {
        const res = await fetch('/api/gallery', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: item.id, is_nsfw: newStatus }),
        });

        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.error || 'Failed to update NSFW status');
        }

        // Apply new status to item in memory
        item.is_nsfw = newStatus;

        // If newly marked as NSFW, automatically reveal for this operator session
        if (newStatus) {
          revealedItemIds.add(item.id);
        }

        // Update card in gallery grid DOM
        const card = document.querySelector(`.gallery-card[data-id="${item.id}"]`);
        if (card) {
          card.setAttribute('data-nsfw', newStatus ? 'true' : 'false');
          card.classList.toggle('is-nsfw-item', newStatus);

          // Update card NSFW badge
          let badge = card.querySelector('.pol-nsfw-badge');
          if (newStatus) {
            if (!badge) {
              badge = document.createElement('div');
              badge.className = 'pol-nsfw-badge is-operator';
              badge.title = 'Operator: Click to edit NSFW status';
              badge.innerHTML = '<span class="nsfw-dot"></span> 18+ NSFW';
              badge.onclick = (e) => {
                e.stopPropagation();
                window.toggleGalleryItemNsfw(item.id);
              };
              card.insertBefore(badge, card.firstChild);
            } else {
              badge.style.display = '';
            }
          } else if (badge) {
            badge.style.display = 'none';
          }

          // Update card operator NSFW button
          const nsfwBtn = card.querySelector('.pol-nsfw-btn');
          if (nsfwBtn) {
            nsfwBtn.classList.toggle('active', newStatus);
            nsfwBtn.title = newStatus
              ? 'Sensitive (18+ NSFW) • Click to mark as SFW'
              : 'Safe for work • Click to mark as 18+ NSFW';
            const span = nsfwBtn.querySelector('span');
            if (span) span.textContent = newStatus ? '18+' : 'SFW';
          }
        }

        // Update lightbox UI if currently showing this item
        if (currentLightboxIdx === idx) {
          updateLightboxNsfwUI(item);
        }

        // Keep localStorage and card preferences in sync
        window.applyNsfwPreferences();

        // Update the client data store
        const storeEl = document.getElementById('galleryDataStore');
        if (storeEl) {
          storeEl.dataset.gallery = JSON.stringify(galleryData);
        }
      } catch (err: any) {
        console.error('Error toggling NSFW status:', err);
        alert(err.message || 'Error updating NSFW status.');
        if (currentLightboxIdx === idx) {
          updateLightboxNsfwUI(item);
        }
      } finally {
        item._isUpdatingNsfw = false;
      }
    };

    window.toggleCurrentLightboxNsfw = function () {
      if (currentLightboxIdx >= 0 && galleryData[currentLightboxIdx]) {
        window.toggleGalleryItemNsfw(galleryData[currentLightboxIdx].id);
      }
    };

    // Filter by tag
    window.filterByTag = function (tag) {
      currentActiveTag = tag.toLowerCase();

      document.querySelectorAll('.tag-btn').forEach((btn) => {
        if (btn.getAttribute('data-tag') === currentActiveTag) {
          btn.classList.add('active');
        } else {
          btn.classList.remove('active');
        }
      });

      const cards = document.querySelectorAll('.gallery-card');
      cards.forEach((card) => {
        const tags = (card.getAttribute('data-tags') || '').split(' ');
        if (currentActiveTag === 'all' || tags.includes(currentActiveTag)) {
          card.style.display = '';
        } else {
          card.style.display = 'none';
        }
      });
    };

    // Lightbox functions
    window.openLightbox = function (idx) {
      if (idx < 0 || idx >= galleryData.length) return;
      currentLightboxIdx = idx;
      const item = galleryData[idx];

      const overlay = document.getElementById('galleryLightbox');
      const img = document.getElementById('lightboxImg');
      const titleEl = document.getElementById('lightboxTitle');
      const captionEl = document.getElementById('lightboxCaption');
      const tagsEl = document.getElementById('lightboxTags');
      const indexEl = document.getElementById('lightboxIndex');
      const dimEl = document.getElementById('lightboxDimensions');
      const dateEl = document.getElementById('lightboxDate');
      const rawLink = document.getElementById('lightboxOriginalLink');

      if (!overlay || !img) return;

      img.src = item.url;
      img.alt = item.alt_text || item.title || item.caption || 'Polaroid view';

      updateLightboxNsfwUI(item);

      if (titleEl) {
        titleEl.textContent = item.title || '';
        titleEl.style.display = item.title ? 'block' : 'none';
      }

      if (captionEl) {
        captionEl.textContent = item.caption || (item.title ? '' : 'visual capture');
      }

      if (tagsEl) {
        tagsEl.innerHTML = '';
        if (Array.isArray(item.tags) && item.tags.length > 0) {
          item.tags.forEach((t) => {
            const chip = document.createElement('span');
            chip.className = 'lb-tag-chip';
            chip.textContent = `#${t}`;
            tagsEl.appendChild(chip);
          });
        }
      }

      if (indexEl) {
        indexEl.textContent = `[ ${idx + 1} / ${galleryData.length} ]`;
      }

      if (dimEl) {
        dimEl.textContent = item.width && item.height ? `${item.width} × ${item.height} px` : '';
      }

      if (dateEl && item.created_at) {
        const d = new Date(item.created_at);
        dateEl.textContent = d.toLocaleDateString(undefined, {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        });
      }

      if (rawLink) {
        rawLink.href = item.url;
      }

      overlay.classList.add('active');
      document.body.style.overflow = 'hidden';
    };

    window.closeLightbox = function () {
      const overlay = document.getElementById('galleryLightbox');
      if (overlay) overlay.classList.remove('active');
      document.body.style.overflow = '';
      currentLightboxIdx = -1;
    };

    window.lightboxPrev = function () {
      if (galleryData.length <= 1) return;
      let nextIdx = currentLightboxIdx - 1;
      if (nextIdx < 0) nextIdx = galleryData.length - 1;
      openLightbox(nextIdx);
    };

    window.lightboxNext = function () {
      if (galleryData.length <= 1) return;
      let nextIdx = currentLightboxIdx + 1;
      if (nextIdx >= galleryData.length) nextIdx = 0;
      openLightbox(nextIdx);
    };

    window.handleLightboxBackdropClick = function (e) {
      if (e.target && e.target.id === 'galleryLightbox') {
        closeLightbox();
      }
    };

    const __galleryKeydown = (e) => {
      const nsfwModal = document.getElementById('nsfwModal');
      if (nsfwModal && nsfwModal.classList.contains('active') && e.key === 'Escape') {
        closeNsfwModal();
        return;
      }

      const overlay = document.getElementById('galleryLightbox');
      if (!overlay || !overlay.classList.contains('active')) return;

      if (e.key === 'Escape') {
        closeLightbox();
      } else if (e.key === 'ArrowLeft') {
        lightboxPrev();
      } else if (e.key === 'ArrowRight') {
        lightboxNext();
      }
    };
    document.addEventListener('keydown', __galleryKeydown);

    const batchNsfwInput = document.getElementById('galleryNsfwInput') as HTMLInputElement | null;
    const __onBatchNsfwChange = (e: Event) => {
      window.handleBatchNsfwChange((e.target as HTMLInputElement).checked);
    };
    if (batchNsfwInput) {
      batchNsfwInput.addEventListener('change', __onBatchNsfwChange);
    }

    // Initialize NSFW content state immediately
    window.applyNsfwPreferences();
    return () => {
      document.removeEventListener('keydown', __galleryKeydown);
      if (batchNsfwInput) {
        batchNsfwInput.removeEventListener('change', __onBatchNsfwChange);
      }
      document.body.style.overflow = '';
      for (const u of selectedFilesQueue) {
        try {
          URL.revokeObjectURL(u.previewUrl);
        } catch (e) {}
      }
    };
}
