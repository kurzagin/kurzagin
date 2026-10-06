// ============================================================
// kurzagin — shared javascript
// ============================================================

// ==============================
// SCROLL REVEAL
// ==============================
function initScrollReveal() {
  const obs = new IntersectionObserver((entries) => {
    entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); });
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

  document.querySelectorAll('.reveal').forEach(el => obs.observe(el));
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initScrollReveal);
} else {
  initScrollReveal();
}
document.addEventListener('app:page-load', initScrollReveal);

// (Active nav state is now rendered by React components based on the route.)

// ==============================
// FEED FUNCTIONS
// ==============================
function updateCharCount() {
  const input = document.getElementById('postInput');
  if (!input) return;
  const countEl = document.getElementById('charCount');
  if (countEl) countEl.textContent = input.value.length + ' / 5000';
}

let stagedMediaFiles = [];

function handleImageSelected(event) {
  const files = Array.from(event.target.files || []);
  if (!files.length) return;

  for (const file of files) {
    if (file.type.startsWith('image/')) {
      if (stagedMediaFiles.length < 8) {
        stagedMediaFiles.push(file);
      }
    } else {
      alert(`File "${file.name}" is not an image`);
    }
  }

  event.target.value = '';
  renderMediaPreviews();
}

function removeStagedMedia(index) {
  if (typeof index === 'number') {
    stagedMediaFiles.splice(index, 1);
  } else {
    stagedMediaFiles = [];
  }
  renderMediaPreviews();
}

function renderMediaPreviews() {
  const previewWrap = document.getElementById('mediaPreviewWrap');
  if (!previewWrap) return;

  if (stagedMediaFiles.length === 0) {
    previewWrap.style.display = 'none';
    previewWrap.innerHTML = '';
    return;
  }

  previewWrap.style.display = 'grid';
  previewWrap.innerHTML = '';

  stagedMediaFiles.forEach((file, index) => {
    const item = document.createElement('div');
    item.className = 'media-preview-item';

    const objectUrl = URL.createObjectURL(file);
    item.innerHTML = `
      <img src="${objectUrl}" alt="${escapeHtml(file.name)}" />
      <span class="media-preview-badge">AVIF</span>
      <button type="button" class="media-preview-remove" onclick="removeStagedMedia(${index})" title="Remove image" style="display:inline-flex;align-items:center;justify-content:center;"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg></button>
    `;
    previewWrap.appendChild(item);
  });
}

async function broadcastPost() {
  const input = document.getElementById('postInput');
  const btn = document.getElementById('submitPostBtn');
  if (!btn) return;
  const content = input ? input.value.trim() : '';

  if (!content && stagedMediaFiles.length === 0) {
    alert('Please enter text or attach an image for your log transmission');
    return;
  }

  btn.disabled = true;
  btn.textContent = stagedMediaFiles.length > 0
    ? `CONVERTING TO AVIF (0/${stagedMediaFiles.length})...`
    : 'BROADCASTING...';

  try {
    let mediaPayload = [];

    // If images are staged, convert all to AVIF via the server
    if (stagedMediaFiles.length > 0) {
      let uploadedCount = 0;
      const uploadPromises = stagedMediaFiles.map(async (file) => {
        const fd = new FormData();
        fd.append('image', file);

        const mediaRes = await fetch('/api/media/upload-post-image', {
          method: 'POST',
          body: fd,
        });

        const mediaData = await mediaRes.json();
        if (!mediaRes.ok || !mediaData.success) {
          throw new Error(mediaData.error || `Failed to process image "${file.name}" to AVIF`);
        }

        uploadedCount++;
        btn.textContent = `UPLOADING AVIF (${uploadedCount}/${stagedMediaFiles.length})...`;

        return {
          url: mediaData.url,
          category: 'media',
          media_type: 'image',
          width: mediaData.width,
          height: mediaData.height,
        };
      });

      mediaPayload = await Promise.all(uploadPromises);
    }

    btn.textContent = 'BROADCASTING LOG...';
    const res = await fetch('/api/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content,
        media: mediaPayload,
      }),
    });

    const data = await res.json();
    if (res.ok && data.success) {
      removeStagedMedia();
      window.location.reload();
    } else {
      alert(data.error || 'Failed to broadcast post');
      btn.disabled = false;
      btn.textContent = 'BROADCAST LOG →';
    }
  } catch (err) {
    alert(err.message || 'Network error while broadcasting post');
    btn.disabled = false;
    btn.textContent = 'BROADCAST LOG →';
  }
}

async function submitComment(e, postId) {
  e.preventDefault();
  const form = e.target;
  const nameInput = form.querySelector('[name="authorName"]');
  const contentInput = form.querySelector('[name="content"]');
  const honeypotInput = form.querySelector('[name="honeypot"]');
  const submitBtn = form.querySelector('button[type="submit"]');

  const content = contentInput.value.trim();
  const authorName = nameInput ? nameInput.value.trim() : '';
  const honeypot = honeypotInput ? honeypotInput.value : '';

  if (!content) return;

  submitBtn.disabled = true;
  submitBtn.textContent = '...';

  try {
    const res = await fetch('/api/comments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ postId, content, authorName, honeypot })
    });

    const data = await res.json();
    if (res.ok && data.success) {
      const c = data.comment;
      let list = document.getElementById(`comments-list-${postId}`);
      if (!list) {
        list = document.createElement('div');
        list.className = 'comments-list';
        list.id = `comments-list-${postId}`;
        form.parentNode.insertBefore(list, form);
      }

      // Remove "no replies yet" placeholder if present
      const emptyNotice = list.querySelector('.comments-empty-notice');
      if (emptyNotice) {
        emptyNotice.remove();
      }

      const commentEl = document.createElement('div');
      commentEl.className = 'comment-item bracket-card';
      commentEl.style.padding = '14px 16px';
      const isGuest = c.author_name === 'guest';
      commentEl.innerHTML = `
        <div class="comment-head" style="margin-bottom: 8px;">
          <span class="comment-author ${isGuest ? 'guest' : ''}" style="font-size: 0.72rem;">
            ${isGuest ? '[guest]' : '[@' + escapeHtml(c.author_name) + ']'}
          </span>
          <span class="comment-time">just now</span>
        </div>
        <div class="comment-body" style="font-size: 0.85rem; line-height: 1.6;">${escapeHtml(c.content)}</div>
      `;
      list.appendChild(commentEl);
      contentInput.value = '';

      // Update comment counter button if present
      const postCard = document.getElementById(`post-${postId}`);
      if (postCard) {
        const commentBtn = postCard.querySelector('.post-actions button:nth-child(3) span');
        if (commentBtn) {
          const currentCount = parseInt(commentBtn.textContent) || 0;
          commentBtn.textContent = currentCount + 1;
        }
      }
    } else {
      alert(data.error || 'Failed to submit comment');
    }
  } catch (err) {
    alert('Network error while posting comment');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'SEND ↵';
  }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function toggleCommentBox(postId) {
  const box = document.getElementById(`comments-box-${postId}`);
  if (box) {
    box.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    const input = box.querySelector('.comment-input-content');
    if (input) input.focus();
  }
}

async function toggleLike(btn) {
  if (!btn || btn.dataset.loading === 'true') return;

  const postId = btn.dataset.postId || btn.getAttribute('data-post-id');
  if (!postId) return;

  const isAlreadyLiked = btn.classList.contains('liked') || btn.dataset.liked === 'true';

  if (isAlreadyLiked) {
    // 1 time only: already liked
    btn.classList.add('liked');
    btn.dataset.liked = 'true';
    btn.title = 'You already liked this log';
    return;
  }

  // Optimistic UI update
  btn.dataset.loading = 'true';
  btn.classList.add('liked');
  btn.dataset.liked = 'true';

  const span = btn.querySelector('span');
  const svg = btn.querySelector('.like-icon');
  if (svg) svg.setAttribute('fill', 'currentColor');

  const currentCount = span ? parseInt(span.textContent) || 0 : 0;
  if (span) span.textContent = currentCount + 1;

  try {
    const res = await fetch('/api/like', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ postId }),
    });

    const data = await res.json().catch(() => ({}));

    if (res.ok && data.success) {
      if (span && typeof data.likes_count === 'number') {
        span.textContent = data.likes_count;
      }
      btn.title = 'You liked this log';
      try {
        localStorage.setItem(`liked_${postId}`, 'true');
      } catch (e) {}
    } else if (data.alreadyLiked) {
      if (span && typeof data.likes_count === 'number') {
        span.textContent = data.likes_count;
      }
      btn.title = 'You already liked this log';
      try {
        localStorage.setItem(`liked_${postId}`, 'true');
      } catch (e) {}
    } else {
      // Revert optimistic update on error
      btn.classList.remove('liked');
      btn.dataset.liked = 'false';
      if (svg) svg.setAttribute('fill', 'none');
      if (span) span.textContent = currentCount;
      alert(data.error || 'Failed to register like');
    }
  } catch (err) {
    console.error('Like error:', err);
    btn.classList.remove('liked');
    btn.dataset.liked = 'false';
    if (svg) svg.setAttribute('fill', 'none');
    if (span) span.textContent = currentCount;
  } finally {
    btn.dataset.loading = 'false';
  }
}

function syncLikedPostsFromStorage() {
  document.querySelectorAll('.post-act.like-btn').forEach((btn) => {
    const postId = btn.dataset.postId;
    if (!postId) return;
    try {
      if (localStorage.getItem(`liked_${postId}`) === 'true') {
        btn.classList.add('liked');
        btn.dataset.liked = 'true';
        btn.title = 'You already liked this log';
        const svg = btn.querySelector('.like-icon');
        if (svg) svg.setAttribute('fill', 'currentColor');
      }
    } catch (e) {}
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', syncLikedPostsFromStorage);
} else {
  syncLikedPostsFromStorage();
}
document.addEventListener('app:page-load', syncLikedPostsFromStorage);

// ==============================
// GLOBAL AUDIO ENGINE (SINGLETON)
// ==============================
(function () {
  function formatTime(seconds) {
    if (!seconds || isNaN(seconds)) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  }

  function getPersistentAudioElement() {
    return document.getElementById('globalPersistentAudio') || null;
  }

  if (!window.__AUDIO_ENGINE__) {
    const engine = {
      tracks: [],
      currentIdx: 0,
      isPlaying: false,
      audio: null,
    };

    function initAudio() {
      if (!engine.audio) {
        const persistentEl = getPersistentAudioElement();
        engine.audio = persistentEl || new Audio();
        engine.audio.preload = 'metadata';

        engine.audio.addEventListener('timeupdate', onTimeUpdate);
        engine.audio.addEventListener('ended', onEnded);
        engine.audio.addEventListener('loadedmetadata', onLoadedMetadata);
        engine.audio.addEventListener('play', () => {
          engine.isPlaying = true;
          syncPlayingState();
        });
        engine.audio.addEventListener('pause', () => {
          engine.isPlaying = false;
          syncPlayingState();
        });
        engine.audio.addEventListener('error', (e) => {
          console.warn('Audio playback error:', e);
          engine.isPlaying = false;
          syncPlayingState();
        });
      } else if (!engine.audio.parentNode) {
        // If audio was created in memory, attempt to adopt the persistent element if it became available
        const persistentEl = getPersistentAudioElement();
        if (persistentEl && persistentEl !== engine.audio) {
          const wasPlaying = engine.isPlaying;
          const currTime = engine.audio.currentTime;
          const currSrc = engine.audio.src;
          engine.audio.pause();
          engine.audio = persistentEl;
          engine.audio.preload = 'metadata';
          engine.audio.addEventListener('timeupdate', onTimeUpdate);
          engine.audio.addEventListener('ended', onEnded);
          engine.audio.addEventListener('loadedmetadata', onLoadedMetadata);
          engine.audio.addEventListener('play', () => { engine.isPlaying = true; syncPlayingState(); });
          engine.audio.addEventListener('pause', () => { engine.isPlaying = false; syncPlayingState(); });
          if (currSrc) {
            engine.audio.src = currSrc;
            engine.audio.currentTime = currTime;
            if (wasPlaying) {
              engine.audio.play().catch(() => {});
            }
          }
        }
      }
    }

    function onTimeUpdate() {
      if (!engine.audio || isScrubbing) return;
      const progress = document.getElementById('progress');
      const currentTimeEl = document.getElementById('currentTime');
      const sheetProgress = document.getElementById('sheetProgress');
      const sheetCurrentTime = document.getElementById('sheetCurrentTime');

      const dur = getDuration();
      if (dur > 0) {
        const pct = Math.max(0, Math.min(100, (engine.audio.currentTime / dur) * 100));
        if (progress) progress.style.width = `${pct}%`;
        if (sheetProgress) sheetProgress.style.width = `${pct}%`;
      }
      const formatted = formatTime(engine.audio.currentTime);
      if (currentTimeEl) currentTimeEl.textContent = formatted;
      if (sheetCurrentTime) sheetCurrentTime.textContent = formatted;
    }

    function onEnded() {
      nextTrack();
    }

    function onLoadedMetadata() {
      if (!engine.audio) return;
      const totalTimeEl = document.getElementById('totalTime');
      const sheetTotalTime = document.getElementById('sheetTotalTime');
      const dur = getDuration();
      const formatted = formatTime(dur);
      if (totalTimeEl && (!engine.tracks[engine.currentIdx]?.duration || engine.tracks[engine.currentIdx]?.duration === '0:00')) {
        totalTimeEl.textContent = formatted;
      }
      if (sheetTotalTime && (!engine.tracks[engine.currentIdx]?.duration || engine.tracks[engine.currentIdx]?.duration === '0:00')) {
        sheetTotalTime.textContent = formatted;
      }
    }

    function loadTracksFromDOM() {
      try {
        const raw = document.getElementById('tracksDataStore')?.dataset?.tracks
          || document.getElementById('mobileTracksStore')?.dataset?.tracks;
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setTracks(parsed);
            return;
          }
        }
      } catch (e) {}

      if (engine.tracks.length === 0) {
        fetch('/api/tracks')
          .then(res => res.json())
          .then(data => {
            if (data && Array.isArray(data.tracks) && data.tracks.length > 0) {
              setTracks(data.tracks);
              syncUI();
            }
          })
          .catch(() => {});
      }
    }

    function setTracks(newTracks) {
      if (!Array.isArray(newTracks) || newTracks.length === 0) return;
      
      const currentTrack = engine.tracks[engine.currentIdx];
      engine.tracks = newTracks;

      if (currentTrack && currentTrack.audio_url) {
        const matchIdx = newTracks.findIndex(t => t.audio_url === currentTrack.audio_url || (t.id && t.id === currentTrack.id));
        if (matchIdx !== -1) {
          engine.currentIdx = matchIdx;
        }
      } else if (!engine.audio || !engine.audio.src) {
        engine.currentIdx = 0;
      }
    }

    function loadTrack(idx, autoPlay = false) {
      if (!engine.tracks || engine.tracks.length === 0) return;
      initAudio();

      if (idx < 0) idx = engine.tracks.length - 1;
      if (idx >= engine.tracks.length) idx = 0;

      engine.currentIdx = idx;
      const track = engine.tracks[engine.currentIdx];
      if (!track || !track.audio_url) return;

      engine.audio.src = track.audio_url;
      syncUI();

      if (autoPlay) {
        engine.audio.play().then(() => {
          engine.isPlaying = true;
          syncPlayingState();
        }).catch(err => {
          console.warn('Playback interrupted:', err);
          engine.isPlaying = false;
          syncPlayingState();
        });
      } else {
        engine.isPlaying = false;
        syncPlayingState();
      }
    }

    function togglePlay() {
      initAudio();
      if (!engine.tracks || engine.tracks.length === 0) return;

      if (!engine.audio.src && engine.tracks[engine.currentIdx]?.audio_url) {
        loadTrack(engine.currentIdx, true);
        return;
      }

      if (engine.audio.paused) {
        engine.audio.play().then(() => {
          engine.isPlaying = true;
          syncPlayingState();
        }).catch(e => console.error('Play error:', e));
      } else {
        engine.audio.pause();
        engine.isPlaying = false;
        syncPlayingState();
      }
    }

    function selectTrack(i) {
      if (!engine.tracks || engine.tracks.length === 0 || !engine.tracks[i]) return;
      loadTrack(i, true);
    }

    function nextTrack() {
      if (!engine.tracks || engine.tracks.length === 0) return;
      loadTrack(engine.currentIdx + 1, true);
    }

    function prevTrack() {
      if (!engine.tracks || engine.tracks.length === 0) return;
      loadTrack(engine.currentIdx - 1, true);
    }

    let isScrubbing = false;
    let activeScrubBar = null;

    function getDuration() {
      if (engine.audio && Number.isFinite(engine.audio.duration) && engine.audio.duration > 0) {
        return engine.audio.duration;
      }
      const track = engine.tracks[engine.currentIdx];
      if (track && track.duration_sec && track.duration_sec > 0) {
        return track.duration_sec;
      }
      if (track && track.duration) {
        const parts = track.duration.split(':').map(Number);
        if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
          return parts[0] * 60 + parts[1];
        }
      }
      return 0;
    }

    function getRatioFromEvent(e, bar) {
      if (!bar) return 0;
      const rect = bar.getBoundingClientRect();
      if (!rect.width || rect.width <= 0) return 0;
      const clientX = (e.touches && e.touches[0])
        ? e.touches[0].clientX
        : (e.clientX !== undefined ? e.clientX : (e.pageX || 0));
      return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    }

    function updateScrubUI(ratio) {
      const dur = getDuration();
      const previewTime = ratio * dur;
      const pct = (ratio * 100).toFixed(2);

      const progress = document.getElementById('progress');
      const currentTimeEl = document.getElementById('currentTime');
      const sheetProgress = document.getElementById('sheetProgress');
      const sheetCurrentTime = document.getElementById('sheetCurrentTime');

      if (progress) progress.style.width = `${pct}%`;
      if (sheetProgress) sheetProgress.style.width = `${pct}%`;

      const formatted = formatTime(previewTime);
      if (currentTimeEl) currentTimeEl.textContent = formatted;
      if (sheetCurrentTime) sheetCurrentTime.textContent = formatted;
    }

    function seekTrack(e) {
      const dur = getDuration();
      if (!dur || dur <= 0) return;
      const bar = e?.currentTarget
        || (e?.target && e.target.closest('.progress-track, .mobile-sheet-progress-bar'))
        || activeScrubBar
        || document.getElementById('progressBar')
        || document.getElementById('sheetProgressBar');
      if (!bar) return;
      const ratio = getRatioFromEvent(e, bar);
      initAudio();
      if (engine.audio) {
        engine.audio.currentTime = ratio * dur;
      }
      onTimeUpdate();
    }

    function startScrub(e) {
      const bar = e?.currentTarget
        || (e?.target && e.target.closest('.progress-track, .mobile-sheet-progress-bar'))
        || document.getElementById('progressBar')
        || document.getElementById('sheetProgressBar');
      if (!bar) return;
      isScrubbing = true;
      activeScrubBar = bar;

      if (e?.target && typeof e.target.setPointerCapture === 'function' && e.pointerId !== undefined) {
        try {
          e.target.setPointerCapture(e.pointerId);
        } catch (_) {}
      }

      const ratio = getRatioFromEvent(e, bar);
      updateScrubUI(ratio);
    }

    function moveScrub(e) {
      if (!isScrubbing || !activeScrubBar) return;
      const ratio = getRatioFromEvent(e, activeScrubBar);
      updateScrubUI(ratio);
    }

    function endScrub(e) {
      if (!isScrubbing) return;
      const bar = activeScrubBar
        || (e?.target && e.target.closest('.progress-track, .mobile-sheet-progress-bar'))
        || document.getElementById('progressBar')
        || document.getElementById('sheetProgressBar');

      if (bar && e) {
        const ratio = getRatioFromEvent(e, bar);
        const dur = getDuration();
        initAudio();
        if (engine.audio && dur > 0) {
          engine.audio.currentTime = ratio * dur;
        }
      }

      if (e?.target && typeof e.target.releasePointerCapture === 'function' && e.pointerId !== undefined) {
        try {
          e.target.releasePointerCapture(e.pointerId);
        } catch (_) {}
      }

      isScrubbing = false;
      activeScrubBar = null;
      onTimeUpdate();
    }

    function syncPlayingState() {
      const playing = engine.isPlaying && !engine.audio?.paused;

      // Homepage & /music Turntable
      const vinyl = document.getElementById('vinyl');
      const playBtn = document.getElementById('playBtn');

      if (playBtn) {
        playBtn.innerHTML = playing
          ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>'
          : '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="6 3 20 12 6 21 6 3"></polygon></svg>';
        playBtn.classList.toggle('active', playing);
      }
      if (vinyl) {
        vinyl.classList.toggle('playing', playing);
      }

      // Mobile Sheet Player
      const sheetV = document.getElementById('sheetVinyl');
      const sheetBtn = document.getElementById('sheetPlayBtn');
      const sheetStatus = document.getElementById('sheetStatusText');
      const sheetPulse = document.getElementById('sheetPlayingPulse');
      const eq = document.getElementById('mobileNavEqualizer');
      const moreBtn = document.getElementById('mobileNavMoreBtn');

      if (sheetBtn) {
        sheetBtn.innerHTML = playing
          ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>'
          : '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="6 3 20 12 6 21 6 3"></polygon></svg>';
        sheetBtn.classList.toggle('active', playing);
      }
      if (sheetV) {
        sheetV.classList.toggle('playing', playing);
      }
      if (sheetStatus) {
        sheetStatus.textContent = playing ? 'NOW PLAYING' : 'DECK STANDBY';
      }
      if (sheetPulse) {
        sheetPulse.classList.toggle('active', playing);
      }
      if (eq) {
        eq.classList.toggle('active', playing);
      }
      if (moreBtn) {
        moreBtn.classList.toggle('music-playing', playing);
      }

      if ('mediaSession' in navigator) {
        navigator.mediaSession.playbackState = playing ? 'playing' : 'paused';
      }
    }

    function syncUI() {
      loadTracksFromDOM();
      initAudio();

      const track = engine.tracks[engine.currentIdx];
      if (!track) return;

      // MediaSession API Integration for Lock Screen / Wearable Controls
      if ('mediaSession' in navigator && track) {
        try {
          navigator.mediaSession.metadata = new MediaMetadata({
            title: track.title || 'Turntable Track',
            artist: track.artist || 'Kur Zagin',
            album: track.album || 'Vinyl Archive',
            artwork: [
              { src: track.cover_url || '/pwa-512x512.png', sizes: '512x512', type: 'image/png' },
              { src: track.cover_url || '/pwa-192x192.png', sizes: '192x192', type: 'image/png' }
            ]
          });
          navigator.mediaSession.setActionHandler('play', () => engine.togglePlay());
          navigator.mediaSession.setActionHandler('pause', () => engine.togglePlay());
          navigator.mediaSession.setActionHandler('previoustrack', () => engine.prevTrack());
          navigator.mediaSession.setActionHandler('nexttrack', () => engine.nextTrack());
          navigator.mediaSession.setActionHandler('seekto', (details) => {
            if (details.seekTime && engine.audio) engine.audio.currentTime = details.seekTime;
          });
        } catch (e) {
          // ignore unsupported handlers in specific browsers
        }
      }

      // Homepage & /music Player Elements
      const titleEl = document.getElementById('trackTitle');
      const artistEl = document.getElementById('trackArtist');
      const totalTimeEl = document.getElementById('totalTime');
      const vinylCoverImg = document.getElementById('vinylCoverImg');
      const vinylFallbackText = document.getElementById('vinylFallbackText');

      if (titleEl) titleEl.textContent = track.title;
      if (artistEl) {
        artistEl.textContent = track.artist + (track.album ? ` — [${track.album}]` : '');
      }
      if (totalTimeEl) totalTimeEl.textContent = track.duration || (engine.audio?.duration ? formatTime(engine.audio.duration) : '0:00');

      if (track.cover_url) {
        if (vinylCoverImg) {
          vinylCoverImg.src = track.cover_url;
          vinylCoverImg.style.display = 'block';
        }
        if (vinylFallbackText) vinylFallbackText.style.display = 'none';
      } else {
        if (vinylCoverImg) vinylCoverImg.style.display = 'none';
        if (vinylFallbackText) vinylFallbackText.style.display = 'block';
      }

      // Mobile Sheet Player Elements
      const sheetTitle = document.getElementById('sheetTrackTitle');
      const sheetArtist = document.getElementById('sheetTrackArtist');
      const sheetTotalTime = document.getElementById('sheetTotalTime');
      const sheetCoverImg = document.getElementById('sheetVinylCoverImg');
      const sheetFallback = document.getElementById('sheetVinylFallback');

      if (sheetTitle) sheetTitle.textContent = track.title;
      if (sheetArtist) {
        sheetArtist.textContent = track.artist + (track.album ? ` — [${track.album}]` : '');
      }
      if (sheetTotalTime) sheetTotalTime.textContent = track.duration || (engine.audio?.duration ? formatTime(engine.audio.duration) : '0:00');

      if (track.cover_url) {
        if (sheetCoverImg) {
          sheetCoverImg.src = track.cover_url;
          sheetCoverImg.style.display = 'block';
        }
        if (sheetFallback) sheetFallback.style.display = 'none';
      } else {
        if (sheetCoverImg) sheetCoverImg.style.display = 'none';
        if (sheetFallback) sheetFallback.style.display = 'block';
      }

      // Highlight active playlist item on /music
      document.querySelectorAll('.pl-item').forEach((el, idx) => {
        el.classList.toggle('active', idx === engine.currentIdx);
      });

      syncPlayingState();
      onTimeUpdate();
    }

    engine.loadTrack = loadTrack;
    engine.togglePlay = togglePlay;
    engine.selectTrack = selectTrack;
    engine.nextTrack = nextTrack;
    engine.prevTrack = prevTrack;
    engine.seekTrack = seekTrack;
    engine.startScrub = startScrub;
    engine.moveScrub = moveScrub;
    engine.endScrub = endScrub;
    engine.getDuration = getDuration;
    engine.setTracks = setTracks;
    engine.syncUI = syncUI;
    engine.syncPlayingState = syncPlayingState;

    window.__AUDIO_ENGINE__ = engine;

    initAudio();
    loadTracksFromDOM();

    // Global pointer listeners for smooth continuous scrubbing across the screen
    window.addEventListener('pointermove', (e) => {
      if (isScrubbing) {
        moveScrub(e);
      }
    }, { passive: true });

    window.addEventListener('pointerup', (e) => {
      if (isScrubbing) {
        endScrub(e);
      }
    });

    window.addEventListener('pointercancel', (e) => {
      if (isScrubbing) {
        endScrub(e);
      }
    });

    // Delegated pointerdown listener for any progress bar in the DOM
    document.addEventListener('pointerdown', (e) => {
      const bar = e.target?.closest?.('.progress-track, .mobile-sheet-progress-bar');
      if (bar) {
        startScrub(e);
      }
    });
  }

  // Keyboard shortcuts
  document.addEventListener('keydown', e => {
    if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT') return;
    const engine = window.__AUDIO_ENGINE__;
    if (!engine || !engine.tracks || engine.tracks.length === 0) return;
    if (e.key === ' ' && (document.getElementById('player') || document.getElementById('mobileSheetPlayer') || document.getElementById('vinylArea'))) {
      e.preventDefault();
      engine.togglePlay();
    }
    if (e.key === 'ArrowRight' && (document.getElementById('player') || document.getElementById('mobileSheetPlayer') || document.getElementById('vinylArea'))) engine.nextTrack();
    if (e.key === 'ArrowLeft' && (document.getElementById('player') || document.getElementById('mobileSheetPlayer') || document.getElementById('vinylArea'))) engine.prevTrack();
  });

  // Global functions exposed to inline click handlers
  window.togglePlay = function () { window.__AUDIO_ENGINE__?.togglePlay(); };
  window.selectTrack = function (i) { window.__AUDIO_ENGINE__?.selectTrack(i); };
  window.nextTrack = function () { window.__AUDIO_ENGINE__?.nextTrack(); };
  window.prevTrack = function () { window.__AUDIO_ENGINE__?.prevTrack(); };
  window.seekTrack = function (e) { window.__AUDIO_ENGINE__?.seekTrack(e); };
  window.startScrub = function (e) { window.__AUDIO_ENGINE__?.startScrub(e); };
  window.moveScrub = function (e) { window.__AUDIO_ENGINE__?.moveScrub(e); };
  window.endScrub = function (e) { window.__AUDIO_ENGINE__?.endScrub(e); };

  // Page lifecycle synchronization
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => { window.__AUDIO_ENGINE__?.syncUI(); });
  } else {
    window.__AUDIO_ENGINE__?.syncUI();
  }
  document.addEventListener('app:page-load', () => {
    window.__AUDIO_ENGINE__?.syncUI();
  });
})();

// Expose other global functions
window.updateCharCount = updateCharCount;
window.submitPost = submitPost;
window.broadcastPost = broadcastPost;
window.submitComment = submitComment;
window.toggleCommentBox = toggleCommentBox;
window.toggleLike = toggleLike;

// ==============================
// PWA INSTALLATION & LIFECYCLE
// ==============================
let deferredInstallPrompt = null;

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredInstallPrompt = e;
  window.__DEFERRED_PROMPT__ = e;
  syncPwaUI();
  window.dispatchEvent(new CustomEvent('pwa:installable'));
});

window.addEventListener('appinstalled', () => {
  deferredInstallPrompt = null;
  window.__DEFERRED_PROMPT__ = null;
  syncPwaUI();
  window.dispatchEvent(new CustomEvent('pwa:installed'));
});

function syncPwaUI() {
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  const canInstall = !!deferredInstallPrompt;

  document.querySelectorAll('.pwa-install-trigger').forEach((el) => {
    if (isStandalone) {
      el.style.display = 'none';
    } else if (canInstall) {
      el.style.display = 'flex';
    }
  });

  const pwaStatusEl = document.getElementById('pwaStatusBadge');
  if (pwaStatusEl) {
    if (isStandalone) {
      pwaStatusEl.textContent = 'STANDALONE (INSTALLED)';
      pwaStatusEl.style.color = 'var(--teal)';
      pwaStatusEl.style.borderColor = 'rgba(106, 158, 158, 0.4)';
    } else {
      pwaStatusEl.textContent = 'BROWSER CLIENT';
    }
  }

  const pwaInstallBtn = document.getElementById('pwaInstallBtn');
  if (pwaInstallBtn) {
    if (isStandalone) {
      pwaInstallBtn.style.display = 'none';
    } else {
      pwaInstallBtn.style.display = 'inline-flex';
    }
  }
}

window.promptPwaInstall = async function() {
  if (!deferredInstallPrompt) {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
    if (isStandalone) {
      alert('Kur Zagin is already running as an installed standalone application.');
    } else {
      alert('To install Kur Zagin on your device:\n\n• iOS / Safari: Tap the Share button and select "Add to Home Screen".\n• Android / Chrome: Tap menu (⋮) and select "Install app" or "Add to Home screen".\n• Desktop Chrome / Edge: Click the install icon in the address bar.');
    }
    return false;
  }

  try {
    deferredInstallPrompt.prompt();
    const { outcome } = await deferredInstallPrompt.userChoice;
    if (outcome === 'accepted') {
      deferredInstallPrompt = null;
      window.__DEFERRED_PROMPT__ = null;
      syncPwaUI();
      return true;
    }
  } catch (err) {
    console.warn('Install prompt error:', err);
  }
  return false;
};

window.syncPwaUI = syncPwaUI;

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', syncPwaUI);
} else {
  syncPwaUI();
}
document.addEventListener('app:page-load', syncPwaUI);



