// @ts-nocheck
'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import {
  Image as ImageIcon,
  Plus,
  Upload,
  X,
  Trash2,
  Tag as TagIcon,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  ShieldAlert,
  Eye,
  EyeOff,
} from 'lucide-react';
import { css } from '../_ui/css';
import { initGallery } from './galleryScript';
import type { DbGalleryItem } from '@/lib/db';

export interface RenderedGalleryItem extends DbGalleryItem {
  rotation: string;
  hasTape: boolean;
  tapeRotation: string;
}

interface GalleryClientProps {
  items: RenderedGalleryItem[];
  allTags: string[];
  authenticated: boolean;
}

export default function GalleryClient({ items, allTags, authenticated }: GalleryClientProps) {
  useEffect(() => {
    const cleanup = initGallery(authenticated);
    return cleanup;
  }, [authenticated]);

  return (
    <>
  <div className="page-header">
    <div style={css("display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 12px;")}>
      <div>
        <h1><span className="hl">gallery</span></h1>
        <div className="page-sub"><span className="jp-label">画廊</span> — imageboard & polaroid fragments</div>
      </div>
      <div style={css("font-family: var(--mono); font-size: 0.65rem; color: var(--text-3); text-align: right; padding-top: 6px; display: flex; flex-direction: column; align-items: flex-end; gap: 6px;")}>
        <div>
          <span className="status-indicator live" style={css("display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: var(--accent); margin-right: 6px;")}></span>
          board: {items.length} captures pinned
        </div>
        <div style={css("display: flex; gap: 6px; align-items: center; flex-wrap: wrap; justify-content: flex-end;")}>
          <button
            id="nsfwControlBtn"
            className="feed-filter-btn"
            style={css("cursor: pointer; padding: 4px 8px; font-size: 0.62rem; display: inline-flex; align-items: center; gap: 5px;")}
            onClick={(e) => { const w = window as any; openNsfwModal() }}
            title="Configure sensitive content & age verification filter"
          >
            <ShieldAlert size={12} style={{ color: '#ff6b81' }} />
            <span id="nsfwControlText">NSFW: BLURRED</span>
          </button>
          {authenticated && (
            <button
              id="toggleUploadBtn"
              className="feed-filter-btn"
              style={css("cursor: pointer; padding: 4px 10px; font-size: 0.62rem; display: inline-flex; align-items: center; gap: 5px;")}
              onClick={(e) => { const w = window as any; toggleUploadForm() }}
              title="Pin visual fragments to the darkroom board"
            >
              <Plus size={12} /> PIN POLAROIDS
            </button>
          )}
        </div>
      </div>
    </div>
  </div>

  {/* OPERATOR PIN COMPOSER (VISIBLE WHEN AUTHENTICATED) */}
  {authenticated && (
    <div
      id="operatorUploadCard"
      className="bracket-card reveal composer"
      style={css("margin-bottom: 24px; display: none;")}
    >
      <div style={css("display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;")}>
        <div style={css("font-family: var(--mono); font-size: 0.65rem; color: var(--accent); letter-spacing: 1px;")}>
          // DARKROOM TRANSMISSION — PIN POLAROIDS
        </div>
        <button
          onClick={(e) => { const w = window as any; toggleUploadForm() }}
          style={css("background: none; border: none; color: var(--text-3); cursor: pointer; padding: 4px;")}
          title="Close uploader"
        >
          <X size={16} />
        </button>
      </div>

      <div style={css("display: flex; flex-direction: column; gap: 14px;")}>
        {/* Dropzone / Multi-file input */}
        <div
          id="dropzone"
          style={css("border: 2px dashed var(--border); border-radius: 4px; padding: 18px 16px; text-align: center; cursor: pointer; background: rgba(255,255,255,0.01); transition: border-color 0.2s, background 0.2s;")}
          onClick={(e) => { const w = window as any; handleDropzoneClick(event) }}
          onDragOver={(e) => { const w = window as any; event.preventDefault(); this.style.borderColor='var(--accent)'; }}
          onDragLeave={(e) => { const w = window as any; this.style.borderColor='var(--border)'; }}
          onDrop={(e) => { const w = window as any; handleFileDrop(event) }}
        >
          <div id="dropzoneEmpty">
            <Upload size={28} style={{ margin: '0 auto 8px', color: 'var(--accent)', opacity: 0.8 }} />
            <div style={css("font-family: var(--mono); font-size: 0.72rem; color: var(--text-1); margin-bottom: 4px;")}>
              CLICK OR DROP VISUAL ARTIFACTS HERE
            </div>
            <div style={css("font-family: var(--mono); font-size: 0.62rem; color: var(--text-3);")}>
              Select single or multiple files • JPG, PNG, WEBP, AVIF (auto-optimized to AVIF)
            </div>
          </div>

          {/* Queue container when files are selected */}
          <div id="dropzoneQueue" style={css("display: none; flex-direction: column; gap: 8px; cursor: default;")} onClick={(e) => { const w = window as any; event.stopPropagation() }}>
            {/* Queue Header Bar */}
            <div style={css("display: flex; justify-content: space-between; align-items: center; padding-bottom: 6px; border-bottom: 1px solid var(--border-subtle); flex-wrap: wrap; gap: 6px;")}>
              <div style={css("font-family: var(--mono); font-size: 0.65rem; color: var(--text-1); display: flex; align-items: center; gap: 6px; min-width: 0;")}>
                <span id="queueCountBadge" style={css("background: var(--accent-dim); color: var(--accent); padding: 2px 6px; border-radius: 2px; font-weight: 600;")}>0 ARTIFACTS</span>
                <span id="queueTotalSize" style={css("color: var(--text-3); font-size: 0.58rem;")}></span>
              </div>
              <div style={css("display: flex; gap: 6px;")}>
                <button
                  type="button"
                  className="feed-filter-btn"
                  style={css("cursor: pointer; padding: 2px 8px; font-size: 0.6rem; display: inline-flex; align-items: center; gap: 4px;")}
                  onClick={(e) => { const w = window as any; document.getElementById('galleryFileInput').click() }}
                  title="Select more images to add"
                >
                  <Plus size={11} /> ADD MORE
                </button>
                <button
                  type="button"
                  className="feed-filter-btn"
                  style={css("cursor: pointer; padding: 2px 8px; font-size: 0.6rem; color: var(--red-soft); border-color: rgba(176, 80, 80, 0.3);")}
                  onClick={(e) => { const w = window as any; clearAllSelectedFiles() }}
                  title="Clear all queued images"
                >
                  CLEAR ALL
                </button>
              </div>
            </div>

            {/* Compact Preview Grid */}
            <div id="queueItemsList" className="queue-grid">
              {/* Dynamically populated compact tiles */}
            </div>

            <div style={css("display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 6px; padding-top: 2px;")}>
              <span style={css("font-family: var(--mono); font-size: 0.56rem; color: var(--text-3);")}>
                // tap 18+ to flag sensitive • tap ✕ to remove
              </span>
              <button
                type="button"
                id="toggleTitlesBtn"
                className="feed-filter-btn"
                style={css("cursor: pointer; padding: 2px 7px; font-size: 0.56rem;")}
                onClick={(e) => { const w = window as any; togglePerImageTitles() }}
                title="Expand individual title inputs"
              >
                + CUSTOM TITLES
              </button>
            </div>

            {/* Collapsible Individual Title Drawer (hidden by default) */}
            <div id="perImageTitlesWrap" className="per-image-titles-container">
              {/* Dynamically populated title inputs */}
            </div>
          </div>
        </div>

        <input
          type="file"
          id="galleryFileInput"
          accept="image/*"
          multiple
          style={css("display: none;")}
          onChange={(e) => { const w = window as any; handleFilesSelected(event) }}
        />

        {/* Title & Tags */}
        <div className="composer-inputs-grid" style={css("display: grid; grid-template-columns: 1fr 1fr; gap: 12px;")}>
          <div>
            <label style={css("display: block; font-family: var(--mono); font-size: 0.62rem; color: var(--text-3); margin-bottom: 4px;")}>
              // POLAROID TITLE / BATCH PREFIX (OPTIONAL)
            </label>
            <input
              type="text"
              id="galleryTitleInput"
              placeholder="e.g. Akihabara at 3am, Rainy balcony"
              style={css("width: 100%; background: var(--bg-1); border: 1px solid var(--border); color: var(--text-1); padding: 8px 10px; font-family: var(--mono); font-size: 0.72rem; border-radius: 2px; box-sizing: border-box;")}
            />
          </div>
          <div>
            <label style={css("display: block; font-family: var(--mono); font-size: 0.62rem; color: var(--text-3); margin-bottom: 4px;")}>
              // TAGS (APPLIED TO ALL IN BATCH)
            </label>
            <input
              type="text"
              id="galleryTagsInput"
              placeholder="e.g. photography, night, 35mm, aesthetic"
              style={css("width: 100%; background: var(--bg-1); border: 1px solid var(--border); color: var(--text-1); padding: 8px 10px; font-family: var(--mono); font-size: 0.72rem; border-radius: 2px; box-sizing: border-box;")}
            />
          </div>
        </div>

        {/* Caption / Fragment Notes */}
        <div>
          <label style={css("display: block; font-family: var(--mono); font-size: 0.62rem; color: var(--text-3); margin-bottom: 4px;")}>
            // VISUAL FRAGMENT CAPTION (SHOWN ON POLAROID BOTTOM)
          </label>
          <textarea
            id="galleryCaptionInput"
            rows="2"
            placeholder="brief caption or transmission note to print onto polaroid border (applied to batch)..."
            style={css("width: 100%; background: var(--bg-1); border: 1px solid var(--border); color: var(--text-1); padding: 8px 10px; font-family: var(--sans); font-size: 0.78rem; border-radius: 2px; resize: vertical;")}
          ></textarea>
        </div>

        {/* NSFW Toggle */}
        <div style={css("display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; background: rgba(255, 71, 87, 0.05); border: 1px dashed rgba(255, 71, 87, 0.25); border-radius: 2px;")}>
          <label htmlFor="galleryNsfwInput" style={css("cursor: pointer; font-family: var(--mono); font-size: 0.68rem; color: #ff6b81; font-weight: 500; display: flex; align-items: center; gap: 6px;")}>
            <ShieldAlert size={14} /> // SENSITIVE CONTENT • MARK BATCH AS NSFW (18+)
          </label>
          <input
            type="checkbox"
            id="galleryNsfwInput"
            onChange={(e) => { const w = window as any; handleBatchNsfwChange(this.checked) }}
            style={css("cursor: pointer; accent-color: #ff4757; width: 15px; height: 15px;")}
          />
        </div>

        {/* Upload Progress Section (visible during transmission) */}
        <div id="uploadProgressSection" style={css("display: none; flex-direction: column; gap: 6px;")}>
          <div style={css("display: flex; justify-content: space-between; align-items: center; font-family: var(--mono); font-size: 0.65rem;")}>
            <span id="uploadProgressLabel" style={css("color: var(--accent);")}>// TRANSMITTING VISUAL ARTIFACTS...</span>
            <span id="uploadProgressPercent" style={css("color: var(--text-2); font-weight: 600;")}>0%</span>
          </div>
          <div style={css("width: 100%; height: 6px; background: var(--bg-3); border-radius: 3px; overflow: hidden; border: 1px solid var(--border);")}>
            <div id="uploadProgressBar" style={css("width: 0%; height: 100%; background: var(--accent); transition: width 0.3s ease;")}></div>
          </div>
        </div>

        <div style={css("display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-top: 4px; flex-wrap: wrap;")}>
          <span id="uploadStatusText" style={css("font-family: var(--mono); font-size: 0.65rem; color: var(--accent);")}></span>
          <div style={css("display: flex; gap: 8px; margin-left: auto;")}>
            <button
              id="submitGalleryBtn"
              className="post-btn"
              style={css("cursor: pointer;")}
              onClick={(e) => { const w = window as any; submitGalleryBatch() }}
            >
              PIN TO BOARD →
            </button>
          </div>
        </div>
      </div>
    </div>
  )}

  {/* TAGS FILTER BAR (IF TAGS EXIST) */}
  {allTags.length > 0 && (
    <div className="gallery-tag-filter reveal" style={css("display: flex; gap: 8px; margin-bottom: 20px; flex-wrap: wrap; align-items: center;")}>
      <span style={css("font-family: var(--mono); font-size: 0.65rem; color: var(--text-3); margin-right: 4px;")}>
        <TagIcon size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '3px' }} /> TAGS:
      </span>
      <button
        className="feed-filter-btn active tag-btn"
        data-tag="all"
        onClick={(e) => { const w = window as any; filterByTag('all') }}
      >
        // ALL ({items.length})
      </button>
      {allTags.map((tag) => {
        const count = items.filter((item) =>
          Array.isArray(item.tags) && item.tags.some((t) => t.toLowerCase() === tag)
        ).length;
        return (
          <button
            className="feed-filter-btn tag-btn"
            data-tag={tag}
            onclick={`filterByTag('${tag}')`}
          >
            #{tag} ({count})
          </button>
        );
      })}
    </div>
  )}

  <section className="section">
    {items.length === 0 ? (
      <div className="bracket-card empty-state">
        <div className="empty-state-glyph"><ImageIcon size={36} /></div>
        <div className="empty-state-title">NO POLAROIDS IN GALLERY</div>
        <p className="empty-state-desc">
          The darkroom is quiet. Dedicated visual fragments, photography, and imageboard captures will appear here once pinned.
        </p>
        <span className="empty-state-meta">// status: darkroom idle — separated from microblog feed</span>
        {authenticated && (
          <div style={css("margin-top: 16px;")}>
            <button
              className="post-btn"
              style={css("cursor: pointer; font-size: 0.7rem;")}
              onClick={(e) => { const w = window as any; toggleUploadForm() }}
            >
              PIN FIRST POLAROID →
            </button>
          </div>
        )}
      </div>
    ) : (
      <div className="gallery-grid" id="galleryGrid">
        {items.map((item, idx) => {
          const tagsStr = Array.isArray(item.tags) ? item.tags.join(' ').toLowerCase() : '';
          const displayCaption = item.caption || item.title || 'visual capture';
          return (
            <div
              className={`polaroid gallery-card ${item.is_nsfw ? 'is-nsfw-item' : ''}`}
              data-id={item.id}
              data-tags={tagsStr}
              data-index={idx}
              data-nsfw={item.is_nsfw ? "true" : "false"}
              style={{ ['--rot' as any]: item.rotation || '0deg', cursor: 'pointer' }}
              onclick={`handlePolaroidClick(event, ${idx})`}
              title={item.title || item.caption || 'Click to view polaroid in darkroom lightbox'}
            >
              {item.hasTape && <div className="pol-tape" style={{ ['--tape-rot' as any]: item.tapeRotation || '0deg' }}></div>}

              {item.is_nsfw && (
                <div className="pol-nsfw-badge" title="18+ Sensitive Content">
                  <span className="nsfw-dot"></span> 18+ NSFW
                </div>
              )}

              {authenticated && (
                <button
                  className="pol-del-btn"
                  title="Delete polaroid"
                  onclick={`event.stopPropagation(); deleteGalleryItem('${item.id}');`}
                >
                  <Trash2 size={12} />
                </button>
              )}

              <div className="pol-img" style={css("padding: 0; overflow: hidden; background: #0d0d10; position: relative; display: flex; align-items: center; justify-content: center;")}>
                <img
                  src={item.url}
                  alt={item.alt_text || item.title || item.caption || 'Polaroid image'}
                  loading="lazy"
                  className="pol-photo"
                  style={css("width: 100%; height: 100%; object-fit: contain; display: block;")}
                />

                {item.is_nsfw && (
                  <div className="pol-nsfw-overlay" onclick={`event.stopPropagation(); toggleCardUnblur(${idx});`}>
                    <div className="pol-nsfw-alert">
                      <ShieldAlert size={15} />
                      <span style={css("font-weight: 600;")}>18+ SENSITIVE</span>
                    </div>
                    <button type="button" className="pol-reveal-btn">
                      <Eye size={11} /> REVEAL
                    </button>
                    <button type="button" className="pol-settings-link" onClick={(e) => { const w = window as any; event.stopPropagation(); openNsfwModal(); }} title="Filter settings">
                      SETTINGS ⚙
                    </button>
                  </div>
                )}
              </div>
              <span className="pol-caption">{displayCaption.length > 50 ? displayCaption.slice(0, 50) + '…' : displayCaption}</span>
            </div>
          );
        })}
      </div>
    )}
  </section>

  {/* STORE GALLERY DATA IN CLIENT DATASET SAFELY */}
  <div id="galleryDataStore" data-gallery={JSON.stringify(items)} style={css("display: none;")}></div>

  {/* DARKROOM LIGHTBOX MODAL (ONLY MOUNTED WHEN ITEMS EXIST) */}
  {items.length > 0 && (
    <div id="galleryLightbox" className="lightbox-overlay" onClick={(e) => { const w = window as any; handleLightboxBackdropClick(event) }}>
      <div className="lightbox-container" onClick={(e) => { const w = window as any; event.stopPropagation() }}>
        {/* Close Button */}
        <button className="lightbox-close-btn" onClick={(e) => { const w = window as any; closeLightbox() }} title="Close (Esc)">
          <X size={20} />
        </button>

        {/* Nav buttons */}
        <button className="lightbox-nav-btn prev" onClick={(e) => { const w = window as any; lightboxPrev() }} title="Previous (Left Arrow)">
          <ChevronLeft size={24} />
        </button>
        <button className="lightbox-nav-btn next" onClick={(e) => { const w = window as any; lightboxNext() }} title="Next (Right Arrow)">
          <ChevronRight size={24} />
        </button>

        {/* Media Content Viewport */}
        <div className="lightbox-stage">
          <div className="lightbox-polaroid" id="lightboxPolaroidWrap" style={css("position: relative;")}>
            <div id="lightboxNsfwBadge" className="lb-nsfw-tag" style={css("display: none;")}>
              <ShieldAlert size={12} /> 18+ NSFW
            </div>
            <div className="lightbox-img-frame">
              <img id="lightboxImg" src="" alt="" />
              <div id="lightboxNsfwOverlay" className="lb-nsfw-overlay" style={css("display: none;")}>
                <div className="lb-nsfw-alert">
                  <ShieldAlert size={20} />
                  <span>SENSITIVE ARTIFACT (18+)</span>
                </div>
                <button
                  type="button"
                  className="post-btn"
                  onClick={(e) => { const w = window as any; revealLightboxNsfw() }}
                  style={css("font-size: 0.72rem; padding: 8px 16px; background: #ff4757; color: #fff; border: none; cursor: pointer; display: inline-flex; align-items: center; gap: 6px;")}
                >
                  <Eye size={13} /> REVEAL SENSITIVE CONTENT
                </button>
              </div>
            </div>
            <div className="lightbox-polaroid-band">
              <div id="lightboxTitle" className="lb-title"></div>
              <div id="lightboxCaption" className="lb-caption"></div>
            </div>
          </div>
        </div>

        {/* Metadata & Info Bar */}
        <div className="lightbox-meta-bar">
          <div className="lightbox-tags" id="lightboxTags"></div>
          <div className="lightbox-info">
            <span id="lightboxIndex" style={css("font-family: var(--mono); color: var(--text-3); font-size: 0.65rem;")}></span>
            <span id="lightboxDimensions" style={css("font-family: var(--mono); color: var(--text-3); font-size: 0.65rem;")}></span>
            <span id="lightboxDate" style={css("font-family: var(--mono); color: var(--text-3); font-size: 0.65rem;")}></span>
            <a
              id="lightboxOriginalLink"
              href="#"
              target="_blank"
              rel="noopener noreferrer"
              className="lb-link"
              title="Open raw visual artifact"
            >
              <ExternalLink size={12} /> RAW
            </a>
            {authenticated && (
              <button
                id="lightboxDeleteBtn"
                className="lb-del-btn"
                title="Delete from darkroom"
                onClick={(e) => { const w = window as any; deleteCurrentLightboxItem() }}
              >
                <Trash2 size={12} /> DELETE
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )}

  {/* SELF-AGE VERIFICATION & CONTENT FILTER MODAL */}
  <div id="nsfwModal" className="lightbox-overlay" onClick={(e) => { const w = window as any; handleNsfwModalBackdropClick(event) }}>
    <div className="bracket-card reveal" style={css("max-width: 480px; width: 92vw; padding: 28px; position: relative; background: var(--bg-1); border: 1px solid var(--border);")}>
      <div style={css("display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;")}>
        <div style={css("font-family: var(--mono); font-size: 0.68rem; color: #ff6b81; letter-spacing: 1px; display: flex; align-items: center; gap: 6px;")}>
          <ShieldAlert size={15} /> // CONTENT FILTER & SENSITIVE MEDIA (18+)
        </div>
        <div style={css("display: flex; align-items: center; gap: 8px;")}>
          <span id="modalNsfwCurrentBadge" style={css("font-family: var(--mono); font-size: 0.6rem; color: var(--text-3); border: 1px solid var(--border-subtle); padding: 2px 6px; border-radius: 2px;")}>
            CURRENT: OPEN ALL
          </span>
          <button onClick={(e) => { const w = window as any; closeNsfwModal() }} style={css("background: none; border: none; color: var(--text-3); cursor: pointer; padding: 4px;")} title="Close modal">
            <X size={16} />
          </button>
        </div>
      </div>

      <p style={css("font-family: var(--sans); font-size: 0.82rem; color: var(--text-2); line-height: 1.5; margin-bottom: 18px;")}>
        {authenticated 
          ? 'As operator, your default is set to open all images, but you can toggle blurred mode anytime to preview visitor experience.'
          : 'This visual imageboard includes sensitive, artistic, or adult fragments. Sensitive items are blurred by default for guests. You can self-verify 18+ to open all.'
        }
      </p>

      <div style={css("display: flex; flex-direction: column; gap: 10px; margin-bottom: 18px;")}>
        <button
          type="button"
          className="post-btn"
          style={css("background: #ff4757; color: #fff; border: none; padding: 10px; font-size: 0.75rem; font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px;")}
          onClick={(e) => { const w = window as any; confirmAgeAndUnblurAll() }}
        >
          <Eye size={14} /> OPEN ALL • SHOW SENSITIVE (18+)
        </button>
        <button
          type="button"
          className="feed-filter-btn"
          style={css("padding: 9px; font-size: 0.72rem; cursor: pointer; text-align: center; justify-content: center; display: flex; align-items: center; gap: 6px;")}
          onClick={(e) => { const w = window as any; setNsfwBlurredMode() }}
        >
          <EyeOff size={13} /> BLUR SENSITIVE CAPTURES
        </button>
      </div>

      <div style={css("display: flex; justify-content: space-between; align-items: center; font-family: var(--mono); font-size: 0.62rem; color: var(--text-3); border-top: 1px solid var(--border-subtle); padding-top: 10px;")}>
        <span>// preference stored in browser</span>
        <a href="/settings" style={css("color: var(--accent); text-decoration: none;")}>SETTINGS PAGE →</a>
      </div>
    </div>
  </div>


    </>
  );
}
