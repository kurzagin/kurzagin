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

      if (selectedFilesQueue.length === 0) {
        if (emptyEl) emptyEl.style.display = 'block';
        if (queueEl) queueEl.style.display = 'none';
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
          <div class="queue-tile ${item.status === 'done' ? 'is-done' : ''} ${item.status === 'error' ? 'is-error' : ''} ${item.status === 'uploading' || item.status === 'converting' || item.status === 'pinning' ? 'is-processing' : ''}" id="queue-tile-${item.id}">
            <img src="${item.previewUrl}" alt="Preview" class="queue-tile-img" />

            ${
              !isUploading
                ? `
              <button
                type="button"
                onclick="removeQueueItem('${item.id}')"
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
              onclick="toggleItemNsfw('${item.id}', !${Boolean(item.isNsfw)})"
              class="queue-tile-nsfw ${item.isNsfw ? 'active' : ''}"
              title="Toggle 18+ sensitive flag"
              ${isUploading ? 'disabled' : ''}
            >
              18+
            </button>

            <div class="queue-tile-footer">
              <span class="queue-tile-size" style="${item.file.size > 4.5 * 1024 * 1024 ? 'color: #ffaa00; font-weight: 600;' : ''}">${formatBytes(item.file.size)}${item.file.size > 4.5 * 1024 * 1024 ? ' ⚠️' : ''}</span>
            </div>

            <div id="status-${item.id}" class="queue-tile-overlay">
              <span class="queue-tile-status-icon" style="color: ${getStatusColor(item.status)};">
                ${getStatusLabel(item)}
              </span>
            </div>
          </div>
        `
          )
          .join('');
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

    function updateItemStatusUI(id, statusText, color, statusClass) {
      const tile = document.getElementById(`queue-tile-${id}`);
      if (tile) {
        tile.classList.remove('is-processing', 'is-done', 'is-error');
        if (statusClass) tile.classList.add(statusClass);
      }
      const overlay = document.getElementById(`status-${id}`);
      if (overlay) {
        overlay.innerHTML = `<span class="queue-tile-status-icon" style="color: ${color || 'var(--accent)'};">${escapeHtml(statusText)}</span>`;
      }
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
          item.status = 'uploading';
          updateItemStatusUI(item.id, '// UPLOADING...', 'var(--accent)', 'is-processing');
          if (progressLabel) progressLabel.textContent = `// [${itemNumber}/${total}] UPLOADING ${item.file.name}...`;
          if (statusText) statusText.textContent = `// transmitting artifact ${itemNumber} of ${total}...`;

          const formData = new FormData();
          formData.append('file', item.file);

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
          updateItemStatusUI(item.id, `❌ ${item.error}`, '#ff5555', 'is-error');
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
      const nsfwBadge = document.getElementById('lightboxNsfwBadge');
      const nsfwOverlay = document.getElementById('lightboxNsfwOverlay');
      const lbPolaroid = document.getElementById('lightboxPolaroidWrap');

      if (!overlay || !img) return;

      img.src = item.url;
      img.alt = item.alt_text || item.title || item.caption || 'Polaroid view';

      const isNsfwItem = Boolean(item.is_nsfw);

      if (nsfwBadge) {
        nsfwBadge.style.display = isNsfwItem ? 'inline-flex' : 'none';
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
