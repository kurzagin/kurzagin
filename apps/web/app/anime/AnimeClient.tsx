// @ts-nocheck
'use client';

import { useEffect } from 'react';

// Faithful port of the old inline <script is:inline data-astro-rerun> from anime.astro.
// Runs on mount (replaces astro:page-load / data-astro-rerun) and cleans up on unmount.
export default function AnimeClient() {
  useEffect(() => {
    const PAGE_SIZE = 20;
    let currentAnimeStatus = 'all';
    let currentAnimePage = 1;
  
    function getQueryParam(key) {
      try {
        const url = new URL(window.location.href);
        return url.searchParams.get(key);
      } catch {
        return null;
      }
    }
  
    function updateQueryUrl(status, page, push = false) {
      try {
        const url = new URL(window.location.href);
        if (status && status !== 'all') {
          url.searchParams.set('status', status);
        } else {
          url.searchParams.delete('status');
        }
        if (page && page > 1) {
          url.searchParams.set('page', String(page));
        } else {
          url.searchParams.delete('page');
        }
        const newUrl = url.pathname + (url.searchParams.toString() ? '?' + url.searchParams.toString() : '');
        if (push) {
          window.history.pushState({ status, page }, '', newUrl);
        } else {
          window.history.replaceState({ status, page }, '', newUrl);
        }
      } catch (e) {
        console.warn('Failed to update URL:', e);
      }
    }
  
    function renderAnimePagination(matchedCount, totalPages, currentPage) {
      const pagEl = document.getElementById('animePagination');
      if (!pagEl) return;
  
      if (totalPages <= 1) {
        pagEl.style.display = 'none';
        return;
      }
      pagEl.style.display = 'flex';
  
      // Update info
      const infoEl = document.getElementById('paginationInfo');
      if (infoEl) {
        infoEl.innerHTML = `PAGE <span class="hl">${currentPage}</span> OF ${totalPages} &bull; ${matchedCount} TITLES`;
      }
  
      // Prev / Next button states
      const prevBtn = document.getElementById('paginationPrevBtn');
      if (prevBtn) {
        if (currentPage <= 1) {
          prevBtn.classList.add('disabled');
          prevBtn.disabled = true;
        } else {
          prevBtn.classList.remove('disabled');
          prevBtn.disabled = false;
          prevBtn.onclick = () => goToAnimePage(currentPage - 1);
        }
      }
  
      const nextBtn = document.getElementById('paginationNextBtn');
      if (nextBtn) {
        if (currentPage >= totalPages) {
          nextBtn.classList.add('disabled');
          nextBtn.disabled = true;
        } else {
          nextBtn.classList.remove('disabled');
          nextBtn.disabled = false;
          nextBtn.onclick = () => goToAnimePage(currentPage + 1);
        }
      }
  
      // Page buttons
      const container = document.getElementById('paginationPagesContainer');
      if (!container) return;
      container.innerHTML = '';
  
      const items = [];
      if (totalPages <= 7) {
        for (let i = 1; i <= totalPages; i++) items.push(i);
      } else if (currentPage <= 4) {
        for (let i = 1; i <= 5; i++) items.push(i);
        items.push('...');
        items.push(totalPages);
      } else if (currentPage >= totalPages - 3) {
        items.push(1);
        items.push('...');
        for (let i = totalPages - 4; i <= totalPages; i++) items.push(i);
      } else {
        items.push(1);
        items.push('...');
        items.push(currentPage - 1);
        items.push(currentPage);
        items.push(currentPage + 1);
        items.push('...');
        items.push(totalPages);
      }
  
      items.forEach((item) => {
        if (item === '...') {
          const span = document.createElement('span');
          span.className = 'pagination-ellipsis';
          span.innerHTML = '&hellip;';
          container.appendChild(span);
        } else {
          const pageNum = Number(item);
          const isActive = pageNum === Number(currentPage);
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = `pagination-page ${isActive ? 'active' : ''}`;
          if (isActive) {
            btn.setAttribute('aria-current', 'page');
          }
          btn.textContent = String(pageNum);
          btn.onclick = () => goToAnimePage(pageNum);
          container.appendChild(btn);
        }
      });
    }
  
    function applyAnimeView(status, page, shouldScroll = false, pushHistory = false) {
      currentAnimeStatus = status || 'all';
      currentAnimePage = parseInt(page, 10) || 1;
  
      // 1. Update filter tab buttons active state
      document.querySelectorAll('.anime-filter-btn').forEach((btn) => {
        const bStatus = btn.getAttribute('data-status');
        if (bStatus === currentAnimeStatus) {
          btn.classList.add('active');
        } else {
          btn.classList.remove('active');
        }
      });
  
      // 2. Filter matching cards
      const allCards = Array.from(document.querySelectorAll('.anime-card'));
      const matched = allCards.filter((card) => {
        const cardStatus = card.getAttribute('data-status');
        if (currentAnimeStatus === 'all') return true;
        if (currentAnimeStatus === 'paused') {
          return cardStatus === 'paused' || cardStatus === 'on_hold';
        }
        return cardStatus === currentAnimeStatus;
      });
  
      const totalPages = Math.max(1, Math.ceil(matched.length / PAGE_SIZE));
      if (currentAnimePage > totalPages) {
        currentAnimePage = totalPages;
      }
      if (currentAnimePage < 1) {
        currentAnimePage = 1;
      }
  
      // 3. Handle Empty State vs Grid
      const gridEl = document.getElementById('animeGrid');
      const emptyCategoryEl = document.getElementById('categoryEmptyState');
      const metaCountEl = document.getElementById('metaStatusCount');
  
      if (matched.length === 0) {
        if (gridEl) gridEl.style.display = 'none';
        if (emptyCategoryEl) {
          emptyCategoryEl.style.display = 'flex';
          const titleEl = document.getElementById('categoryEmptyTitle');
          if (titleEl) titleEl.textContent = `NO TITLES IN "${currentAnimeStatus.toUpperCase()}"`;
          const descEl = document.getElementById('categoryEmptyDesc');
          if (descEl) descEl.textContent = `No anime series found under status "${currentAnimeStatus}". Switch tabs to browse other entries.`;
        }
        if (metaCountEl) {
          metaCountEl.innerHTML = `<span>0 TITLES FOUND</span>`;
        }
        renderAnimePagination(0, 0, 1);
        updateQueryUrl(currentAnimeStatus, currentAnimePage, pushHistory);
        return;
      }
  
      if (emptyCategoryEl) emptyCategoryEl.style.display = 'none';
      if (gridEl) gridEl.style.display = 'grid';
  
      // 4. Show only 20 cards for the current page
      const startIndex = (currentAnimePage - 1) * PAGE_SIZE;
      const endIndex = startIndex + PAGE_SIZE;
  
      allCards.forEach((card) => {
        card.style.display = 'none';
      });
  
      matched.forEach((card, index) => {
        if (index >= startIndex && index < endIndex) {
          card.style.display = 'flex';
        } else {
          card.style.display = 'none';
        }
      });
  
      // 5. Update Meta Counter
      if (metaCountEl) {
        const startNum = startIndex + 1;
        const endNum = Math.min(endIndex, matched.length);
        metaCountEl.innerHTML = `<span>SHOWING <strong class="hl">${startNum}&ndash;${endNum}</strong> OF ${matched.length} TITLES</span>`;
      }
  
      // 6. Update Pagination Bar
      renderAnimePagination(matched.length, totalPages, currentAnimePage);
  
      // 7. Update URL
      updateQueryUrl(currentAnimeStatus, currentAnimePage, pushHistory);
  
      // 8. Scroll to top of grid if requested
      if (shouldScroll) {
        const header = document.querySelector('.anime-stats-bar') || gridEl;
        if (header) {
          header.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }
    }
  
    function setAnimeFilter(status) {
      applyAnimeView(status, 1, false, true);
    }
  
    function goToAnimePage(page) {
      applyAnimeView(currentAnimeStatus, page, true, true);
    }
  
    function filterWatchlist(status) {
      setAnimeFilter(status);
    }
  

    function toggleReviewsDrawer(animeId) {
      const el = document.getElementById(`reviews-drawer-${animeId}`);
      if (el) {
        el.style.display = el.style.display === 'none' ? 'block' : 'none';
      }
    }
  
    // OPERATOR ACTIONS
    async function incrementEpisode(id, currentEp, totalEp, currentStatus) {
      const nextEp = (currentEp || 0) + 1;
      if (totalEp && nextEp > totalEp) {
        alert(`Already reached total episodes (${totalEp})!`);
        return;
      }

      let newStatus = undefined;
      if (currentStatus === 'planning') {
        newStatus = 'watching';
      }
      if (totalEp && nextEp >= totalEp) {
        newStatus = 'completed';
      }

      try {
        const res = await fetch('/api/anime', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id,
            current_episode: nextEp,
            status: newStatus,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to update');
  
        // Update UI immediately
        const epEl = document.getElementById(`ep-val-${id}`);
        if (epEl) epEl.textContent = nextEp;
        const barEl = document.getElementById(`bar-${id}`);
        if (barEl && totalEp) {
          barEl.style.width = `${Math.min(100, Math.round((nextEp / totalEp) * 100))}%`;
        }
        window.location.reload();
      } catch (err) {
        alert(err.message);
      }
    }
  
    async function deleteAnime(id, title) {
      if (!confirm(`Are you sure you want to remove "${title}" and all its logs from your watchlist?`)) {
        return;
      }
  
      try {
        const res = await fetch(`/api/anime?id=${id}`, { method: 'DELETE' });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to delete');
        const card = document.getElementById(`anime-${id}`);
        if (card) card.remove();
        window.location.reload();
      } catch (err) {
        alert(err.message);
      }
    }
  
    // MODAL 1: ADD ANIME (ANILIST)
    let searchTimeout = null;
    let selectedAniListMedia = null;
  
    function openAddAnimeModal() {
      document.getElementById('addAnimeModal').style.display = 'flex';
      document.getElementById('anilistSearchInput').focus();
    }
  
    function closeAddAnimeModal() {
      document.getElementById('addAnimeModal').style.display = 'none';
      clearSelectedAnime();
    }
  
    function handleAniListSearchDebounced() {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        searchAniListDirect();
      }, 400);
    }
  
    async function searchAniListDirect() {
      const input = document.getElementById('anilistSearchInput');
      const q = input.value.trim();
      const resultsContainer = document.getElementById('searchResultsList');
  
      if (!q) {
        resultsContainer.innerHTML = '<div class="search-hint">// type a title above to fetch metadata from AniList</div>';
        return;
      }
  
      resultsContainer.innerHTML = '<div class="search-hint">// querying AniList GraphQL server...</div>';
  
      try {
        const res = await fetch(`/api/anime/search?q=${encodeURIComponent(q)}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to search');
  
        const results = data.results || [];
        if (results.length === 0) {
          resultsContainer.innerHTML = '<div class="search-hint">// no matches found on AniList</div>';
          return;
        }
  
        resultsContainer.innerHTML = '';
        results.forEach((item) => {
          const title = item.title.english || item.title.romaji || item.title.native;
          const studio = item.studios?.nodes?.[0]?.name || '';
          const year = item.seasonYear || '';
          const eps = item.episodes ? `${item.episodes} eps` : 'ongoing';
          const cover = item.coverImage?.large || item.coverImage?.medium || '';
  
          const row = document.createElement('div');
          row.className = 'search-result-row';
          row.innerHTML = `
            <img src="${cover}" class="result-cover" />
            <div class="result-details">
              <div class="result-title">${title}</div>
              <div class="result-meta">${item.format || 'TV'} &bull; ${year} ${studio ? '&bull; ' + studio : ''} &bull; ${eps}</div>
            </div>
          `;
          row.onclick = () => selectAniListItem(item);
          resultsContainer.appendChild(row);
        });
      } catch (err) {
        resultsContainer.innerHTML = `<div class="search-hint" style="color: #ff5555;">// error: ${err.message}</div>`;
      }
    }
  
    function selectAniListItem(item) {
      selectedAniListMedia = item;
      const title = item.title.english || item.title.romaji || item.title.native;
      const cover = item.coverImage?.extraLarge || item.coverImage?.large || '';
      const studio = item.studios?.nodes?.[0]?.name || '';
      const year = item.seasonYear || '';
      const eps = item.episodes ? `${item.episodes} episodes` : 'ongoing';
  
      document.getElementById('searchResultsList').style.display = 'none';
      const staging = document.getElementById('selectedAnimeStaging');
      staging.style.display = 'flex';
  
      document.getElementById('stagingCover').src = cover;
      document.getElementById('stagingTitle').textContent = title;
      document.getElementById('stagingMeta').textContent = `${item.format || 'TV'} • ${year} ${studio ? '• ' + studio : ''} • ${eps}`;
      document.getElementById('stagingDesc').textContent = item.description ? item.description.replace(/<[^>]*>?/gm, '') : '';
      document.getElementById('stagingCurrentEp').max = item.episodes || 9999;
    }
  
    function clearSelectedAnime() {
      selectedAniListMedia = null;
      document.getElementById('selectedAnimeStaging').style.display = 'none';
      document.getElementById('searchResultsList').style.display = 'flex';
    }
  
    async function submitAddAnime() {
      if (!selectedAniListMedia) return;
  
      const btn = document.getElementById('confirmAddAnimeBtn');
      btn.disabled = true;
      btn.textContent = 'ADDING...';
  
      const item = selectedAniListMedia;
      const title = item.title.english || item.title.romaji || item.title.native;
      const cover = item.coverImage?.extraLarge || item.coverImage?.large || null;
      const studio = item.studios?.nodes?.[0]?.name || null;
      const status = document.getElementById('stagingStatus').value;
      const currentEp = parseInt(document.getElementById('stagingCurrentEp').value, 10) || 0;
      const scoreVal = document.getElementById('stagingScore').value;
      const score = scoreVal ? parseInt(scoreVal, 10) : null;
  
      try {
        const res = await fetch('/api/anime', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            anilist_id: item.id,
            title,
            romaji_title: item.title.romaji,
            native_title: item.title.native,
            cover_url: cover,
            banner_url: item.bannerImage,
            format: item.format,
            status,
            current_episode: currentEp,
            total_episodes: item.episodes,
            score,
            genres: item.genres || [],
            studio,
            season_year: item.seasonYear,
            summary: item.description ? item.description.replace(/<[^>]*>?/gm, '') : null,
          }),
        });
  
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to add');
  
        window.location.reload();
      } catch (err) {
        alert(err.message);
        btn.disabled = false;
        btn.textContent = '+ COMMIT TO WATCHLIST';
      }
    }
  
    function handleStagingStatusChange() {
      const status = document.getElementById('stagingStatus').value;
      if (status === 'completed' && selectedAniListMedia?.episodes) {
        document.getElementById('stagingCurrentEp').value = selectedAniListMedia.episodes;
      }
    }
  
    function handleStagingEpChange() {
      const epVal = parseInt(document.getElementById('stagingCurrentEp').value, 10);
      if (selectedAniListMedia?.episodes && epVal >= selectedAniListMedia.episodes) {
        document.getElementById('stagingStatus').value = 'completed';
      }
    }
  
    let stagedReviewImages = [];

    function renderReviewImagePreviews() {
      const container = document.getElementById('reviewImagePreviews');
      if (!container) return;
      container.innerHTML = '';
      if (stagedReviewImages.length === 0) {
        container.style.display = 'none';
        return;
      }
      container.style.display = 'flex';

      stagedReviewImages.forEach((file, idx) => {
        const item = document.createElement('div');
        item.className = 'review-preview-thumb';
        const objUrl = URL.createObjectURL(file);
        item.innerHTML = `
          <img src="${objUrl}" alt="${file.name}" />
          <button type="button" class="review-preview-remove" onclick="window.removeReviewImage?.(${idx})" title="Remove image">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </button>
        `;
        container.appendChild(item);
      });
    }

    function handleReviewImagesSelected(e) {
      const files = Array.from(e.target.files || []);
      if (!files.length) return;
      stagedReviewImages = stagedReviewImages.concat(files);
      renderReviewImagePreviews();
      e.target.value = '';
    }

    function removeReviewImage(idx) {
      stagedReviewImages.splice(idx, 1);
      renderReviewImagePreviews();
    }

    let activeReviewTotalEp = null;

    // MODAL 2: ADD REVIEW / EPISODIC LOG
    function openReviewModal(animeId, title, currentEp, totalEp) {
      try {
        activeReviewTotalEp = totalEp;
        stagedReviewImages = [];
        renderReviewImagePreviews();
        const modal = document.getElementById('reviewModal');
        if (modal) modal.style.display = 'flex';
        const idEl = document.getElementById('reviewAnimeId');
        if (idEl) idEl.value = animeId;
        const titleEl = document.getElementById('reviewModalAnimeTitle');
        if (titleEl) titleEl.textContent = title;
        const epEl = document.getElementById('reviewEpisode');
        if (epEl) epEl.value = currentEp || '';
        const typeEl = document.getElementById('reviewType');
        if (typeEl) typeEl.value = 'mid_watch';
        const contentEl = document.getElementById('reviewContent');
        if (contentEl) {
          contentEl.value = '';
          contentEl.focus();
        }
        const ratingEl = document.getElementById('reviewRating');
        if (ratingEl) ratingEl.value = '';
      } catch (err) {
        console.error('Failed to open review modal:', err);
      }
    }

    function handleReviewTypeChange() {
      const type = document.getElementById('reviewType').value;
      if (type === 'final' && activeReviewTotalEp) {
        document.getElementById('reviewEpisode').value = activeReviewTotalEp;
      }
    }

    function closeReviewModal() {
      stagedReviewImages = [];
      renderReviewImagePreviews();
      document.getElementById('reviewModal').style.display = 'none';
    }

    async function submitReview() {
      const animeId = document.getElementById('reviewAnimeId').value;
      let content = document.getElementById('reviewContent').value.trim();
      const episode = document.getElementById('reviewEpisode').value;
      const reviewType = document.getElementById('reviewType').value;
      const rating = document.getElementById('reviewRating').value;
      const hasSpoilers = document.getElementById('reviewHasSpoilers').checked;
      const shareToFeed = document.getElementById('reviewShareToFeed').checked;

      if (!content && stagedReviewImages.length === 0) {
        alert('Please enter your review thoughts or attach an image.');
        return;
      }

      const btn = document.getElementById('submitReviewBtn');
      btn.disabled = true;
      btn.textContent = stagedReviewImages.length > 0 ? 'CONVERTING TO AVIF...' : 'PUBLISHING...';

      try {
        const uploadedMedia = [];

        if (stagedReviewImages.length > 0) {
          for (let i = 0; i < stagedReviewImages.length; i++) {
            const file = stagedReviewImages[i];
            btn.textContent = `UPLOADING (${i + 1}/${stagedReviewImages.length})...`;
            const fd = new FormData();
            fd.append('image', file, file.name);

            const mediaRes = await fetch('/api/media/upload-post-image', {
              method: 'POST',
              body: fd,
            });

            const mediaData = await mediaRes.json().catch(() => null);
            if (!mediaRes.ok || !mediaData || !mediaData.success) {
              const errMsg = mediaData?.error || `Upload failed with status ${mediaRes.status}`;
              throw new Error(errMsg);
            }

            uploadedMedia.push({
              url: mediaData.url,
              width: mediaData.width,
              height: mediaData.height,
            });
          }

          // Append markdown images to review content if not already in content
          const imgMarkdown = uploadedMedia.map(m => `![attachment](${m.url})`).join('\n\n');
          content = content ? `${content}\n\n${imgMarkdown}` : imgMarkdown;
        }

        btn.textContent = 'PUBLISHING REVIEW...';

        const res = await fetch('/api/anime/reviews', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            anime_id: animeId,
            episode: episode ? parseInt(episode, 10) : null,
            review_type: reviewType,
            rating: rating ? parseInt(rating, 10) : null,
            content,
            has_spoilers: hasSpoilers,
            share_to_feed: shareToFeed,
            media: uploadedMedia,
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to publish review');

        window.location.reload();
      } catch (err) {
        alert(err.message);
        btn.disabled = false;
        btn.textContent = 'PUBLISH REVIEW LOG →';
      }
    }
  
    // MODAL 3: EDIT PROGRESS & STATUS
    function openEditModal(animeId, title, currentEp, totalEp, status, score) {
      document.getElementById('editAnimeId').value = animeId;
      document.getElementById('editModalAnimeTitle').textContent = title;
      document.getElementById('editEpisode').value = currentEp || 0;
      document.getElementById('editTotalEpisodes').value = totalEp || '';
      document.getElementById('editStatus').value = status || 'watching';
      document.getElementById('editScore').value = score || '';
      document.getElementById('editModal').style.display = 'flex';
    }
  
    function handleEditStatusChange() {
      const status = document.getElementById('editStatus').value;
      const totalVal = parseInt(document.getElementById('editTotalEpisodes').value, 10);
      if (status === 'completed' && totalVal) {
        document.getElementById('editEpisode').value = totalVal;
      }
    }
  
    function handleEditEpChange() {
      const epVal = parseInt(document.getElementById('editEpisode').value, 10);
      const totalVal = parseInt(document.getElementById('editTotalEpisodes').value, 10);
      if (totalVal && epVal >= totalVal) {
        document.getElementById('editStatus').value = 'completed';
      }
    }
  
    function closeEditModal() {
      document.getElementById('editModal').style.display = 'none';
    }
  
    async function submitEditProgress() {
      const id = document.getElementById('editAnimeId').value;
      const currentEpisode = parseInt(document.getElementById('editEpisode').value, 10) || 0;
      const totalVal = document.getElementById('editTotalEpisodes').value;
      const totalEpisodes = totalVal ? parseInt(totalVal, 10) : null;
      const status = document.getElementById('editStatus').value;
      const scoreVal = document.getElementById('editScore').value;
      const score = scoreVal ? parseInt(scoreVal, 10) : null;
  
      const btn = document.getElementById('saveEditBtn');
      btn.disabled = true;
      btn.textContent = 'SAVING...';
  
      try {
        const res = await fetch('/api/anime', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id,
            current_episode: currentEpisode,
            total_episodes: totalEpisodes,
            status,
            score,
          }),
        });
  
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to update');
  
        window.location.reload();
      } catch (err) {
        alert(err.message);
        btn.disabled = false;
        btn.textContent = 'SAVE PROGRESS';
      }
    }

    // Initialize on load (mount) and on history navigation
    function initAnimeController() {
      const statusParam = getQueryParam('status') || 'all';
      const pageParam = parseInt(getQueryParam('page') || '1', 10) || 1;
      applyAnimeView(statusParam, pageParam, false, false);
    }

    // Expose methods on window for the handlers rendered in markup
    const api = {
      goToAnimePage, setAnimeFilter, filterWatchlist, toggleReviewsDrawer,
      incrementEpisode, deleteAnime, openAddAnimeModal, closeAddAnimeModal,
      handleAniListSearchDebounced, searchAniListDirect, clearSelectedAnime,
      submitAddAnime, handleStagingStatusChange, handleStagingEpChange,
      openReviewModal, handleReviewTypeChange, closeReviewModal, submitReview,
      handleReviewImagesSelected, removeReviewImage,
      openEditModal, handleEditStatusChange, handleEditEpChange, closeEditModal,
      submitEditProgress,
    };
    Object.assign(window, api);

    const onPopState = () => {
      initAnimeController();
    };
    window.addEventListener('popstate', onPopState);

    initAnimeController();

    return () => {
      window.removeEventListener('popstate', onPopState);
      clearTimeout(searchTimeout);
      for (const k of Object.keys(api)) delete window[k];
    };
  }, []);

  return null;
}
