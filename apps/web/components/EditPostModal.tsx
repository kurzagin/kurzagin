'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X, Paperclip, Trash2, ArrowRight, Image as ImageIcon } from 'lucide-react';
import type { DbPost, DbPostMedia } from '@/lib/db';
import { css } from '../app/_ui/css';

interface StagedFile {
  file: File;
  previewUrl: string;
}

interface EditPostModalProps {
  isOpen: boolean;
  post: DbPost | null;
  initialMedia?: DbPostMedia[];
  onClose: () => void;
  onSaved?: (updatedPost: any) => void;
  onDeleted?: (deletedPostId: string) => void;
}

async function prepareImageForUpload(file: File): Promise<File> {
  if (file.size <= 4 * 1024 * 1024) {
    return file;
  }

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

export default function EditPostModal({
  isOpen,
  post,
  initialMedia = [],
  onClose,
  onSaved,
  onDeleted,
}: EditPostModalProps) {
  const [content, setContent] = useState('');
  const [retainedMedia, setRetainedMedia] = useState<DbPostMedia[]>([]);
  const [stagedFiles, setStagedFiles] = useState<StagedFile[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync state whenever modal opens or post changes
  useEffect(() => {
    if (isOpen && post) {
      setContent(post.content || '');
      setRetainedMedia(initialMedia || []);
      setStagedFiles([]);
      setIsSaving(false);
      setIsDeleting(false);
      setStatusMessage('');
      setErrorMessage('');
    }
  }, [isOpen, post, initialMedia]);

  // Clean up object URLs on unmount / staged files change
  useEffect(() => {
    return () => {
      stagedFiles.forEach((sf) => URL.revokeObjectURL(sf.previewUrl));
    };
  }, [stagedFiles]);

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !post) return null;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const newStaged: StagedFile[] = [];
    for (const file of files) {
      if (file.type.startsWith('image/')) {
        if (retainedMedia.length + stagedFiles.length + newStaged.length < 8) {
          newStaged.push({
            file,
            previewUrl: URL.createObjectURL(file),
          });
        } else {
          alert('Maximum 8 images allowed per transmission');
          break;
        }
      } else {
        alert(`File "${file.name}" is not a supported image format`);
      }
    }

    setStagedFiles((prev) => [...prev, ...newStaged]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeRetainedMedia = (index: number) => {
    setRetainedMedia((prev) => prev.filter((_, i) => i !== index));
  };

  const removeStagedFile = (index: number) => {
    setStagedFiles((prev) => {
      const target = prev[index];
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleSave = async () => {
    const trimmed = content.trim();
    const totalMediaCount = retainedMedia.length + stagedFiles.length;

    if (!trimmed && totalMediaCount === 0) {
      setErrorMessage('Post must contain text or attached media');
      return;
    }

    setIsSaving(true);
    setErrorMessage('');

    try {
      let uploadedMedia: any[] = [];

      // 1. Upload newly staged files to AVIF via /api/media/upload-post-image
      if (stagedFiles.length > 0) {
        for (let i = 0; i < stagedFiles.length; i++) {
          const sf = stagedFiles[i];
          let fileToSend = sf.file;
          if (fileToSend.size > 4 * 1024 * 1024) {
            setStatusMessage(`Optimizing image ${i + 1}/${stagedFiles.length} (<4.5MB)...`);
            fileToSend = await prepareImageForUpload(sf.file);
          }

          setStatusMessage(`Converting image ${i + 1}/${stagedFiles.length} to AVIF...`);
          const fd = new FormData();
          fd.append('image', fileToSend, sf.file.name);

          const res = await fetch('/api/media/upload-post-image', {
            method: 'POST',
            body: fd,
          });

          const data = await res.json().catch(() => null);
          if (!res.ok || !data || !data.success) {
            const errMsg = (data && data.error) ? data.error : (res.statusText || `Upload failed with status ${res.status}`);
            throw new Error(errMsg || `Failed to process image "${sf.file.name}" to AVIF`);
          }

          uploadedMedia.push({
            url: data.url,
            category: 'media',
            media_type: 'image',
            width: data.width,
            height: data.height,
          });
        }
      }

      // 2. Combine retained media with newly uploaded media
      const combinedMedia = [
        ...retainedMedia.map((m) => ({
          url: m.url,
          category: m.category || 'media',
          media_type: m.media_type || 'image',
          width: m.width,
          height: m.height,
          alt_text: m.alt_text,
        })),
        ...uploadedMedia,
      ];

      setStatusMessage('Saving transmission updates...');

      const patchRes = await fetch('/api/posts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: post.id,
          content: trimmed,
          media: combinedMedia,
        }),
      });

      const patchData = await patchRes.json().catch(() => ({}));
      if (!patchRes.ok || !patchData.success) {
        throw new Error(patchData.error || 'Failed to update transmission');
      }

      if (onSaved) {
        onSaved(patchData.post);
      } else {
        window.location.reload();
      }
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Error occurred while saving transmission');
      setIsSaving(false);
      setStatusMessage('');
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to permanently delete this log transmission?')) {
      return;
    }

    setIsDeleting(true);
    setErrorMessage('');

    try {
      const res = await fetch(`/api/posts?id=${post.id}`, {
        method: 'DELETE',
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to delete transmission');
      }

      if (onDeleted) {
        onDeleted(post.id);
      } else {
        window.location.reload();
      }
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to delete transmission');
      setIsDeleting(false);
    }
  };

  return (
    <div
      className="cyber-modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      style={css("position: fixed; inset: 0; background: rgba(0, 0, 0, 0.85); backdrop-filter: blur(6px); z-index: 9999; display: flex; align-items: center; justify-content: center; padding: 20px;")}
    >
      <div
        className="cyber-modal bracket-card"
        style={css("background: var(--bg-1); border: 1px solid var(--accent); box-shadow: 0 0 30px rgba(196, 147, 104, 0.2); width: 100%; max-width: 640px; max-height: 90vh; overflow-y: auto; padding: 24px; position: relative;")}
      >
        {/* MODAL HEADER */}
        <div style={css("display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; border-bottom: 1px solid var(--border-subtle); padding-bottom: 12px;")}>
          <div>
            <div style={css("font-family: var(--mono); font-size: 0.72rem; color: var(--accent); letter-spacing: 1.5px; font-weight: 500;")}>
              // OPERATOR CONSOLE — EDIT TRANSMISSION
            </div>
            <div style={css("font-family: var(--mono); font-size: 0.6rem; color: var(--text-3); margin-top: 2px;")}>
              ID: {post.id}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={css("background: none; border: none; color: var(--text-3); cursor: pointer; padding: 4px; display: flex; align-items: center; justify-content: center;")}
            title="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* ERROR DISPLAY */}
        {errorMessage && (
          <div style={css("background: rgba(176, 80, 80, 0.15); border: 1px solid var(--red-soft); color: #ff8080; padding: 10px 14px; font-family: var(--mono); font-size: 0.72rem; margin-bottom: 14px; border-radius: 2px;")}>
            // ERROR: {errorMessage}
          </div>
        )}

        {/* STATUS DISPLAY */}
        {statusMessage && (
          <div style={css("background: var(--accent-dim); border: 1px solid var(--accent); color: var(--accent); padding: 10px 14px; font-family: var(--mono); font-size: 0.72rem; margin-bottom: 14px; border-radius: 2px;")}>
            // {statusMessage}
          </div>
        )}

        {/* TEXTAREA INPUT */}
        <div style={css("margin-bottom: 14px;")}>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            maxLength={5000}
            rows={5}
            placeholder="Edit transmission content... (supports #tags, YouTube URLs)"
            style={css("width: 100%; background: var(--bg-0); border: 1px solid var(--border); color: var(--text-0); font-family: var(--sans); font-size: 0.9rem; padding: 12px 14px; outline: none; resize: vertical; line-height: 1.6; border-radius: 2px;")}
          />
          <div style={css("display: flex; justify-content: space-between; align-items: center; margin-top: 6px;")}>
            <span style={css("font-family: var(--mono); font-size: 0.62rem; color: var(--text-3);")}>
              {post.category === 'anime' ? '// anime review log' : '// standard transmission'}
            </span>
            <span style={css("font-family: var(--mono); font-size: 0.62rem; color: var(--text-3);")}>
              {content.length} / 5000
            </span>
          </div>
        </div>

        {/* MEDIA SECTION */}
        <div style={css("margin-bottom: 20px;")}>
          <div style={css("display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;")}>
            <span style={css("font-family: var(--mono); font-size: 0.65rem; color: var(--text-2); letter-spacing: 1px;")}>
              ATTACHED MEDIA ({retainedMedia.length + stagedFiles.length} / 8)
            </span>
            <label
              htmlFor="editPostImageInput"
              style={css("font-family: var(--mono); font-size: 0.65rem; color: var(--accent); cursor: pointer; display: inline-flex; align-items: center; gap: 4px; border: 1px dashed var(--accent); padding: 3px 8px; border-radius: 2px;")}
              title="Attach new images (auto-converted to AVIF)"
            >
              <Paperclip size={12} />
              <span>+ ATTACH IMAGE</span>
            </label>
            <input
              type="file"
              id="editPostImageInput"
              ref={fileInputRef}
              accept="image/*"
              multiple
              style={{ display: 'none' }}
              onChange={handleFileSelect}
            />
          </div>

          {/* MEDIA THUMBNAILS GRID */}
          {retainedMedia.length === 0 && stagedFiles.length === 0 ? (
            <div style={css("border: 1px dashed var(--border-subtle); padding: 16px; text-align: center; color: var(--text-3); font-family: var(--mono); font-size: 0.65rem;")}>
              // No media attachments on this log
            </div>
          ) : (
            <div style={css("display: grid; grid-template-columns: repeat(auto-fill, minmax(90px, 1fr)); gap: 8px;")}>
              {/* Existing retained media */}
              {retainedMedia.map((m, idx) => (
                <div key={`ret-${m.id || idx}`} style={css("position: relative; aspect-ratio: 1; border: 1px solid var(--border); overflow: hidden; border-radius: 2px; background: var(--bg-0);")}>
                  <img
                    src={m.url}
                    alt={m.alt_text || 'Media attachment'}
                    style={css("width: 100%; height: 100%; object-fit: cover;")}
                  />
                  <span style={css("position: absolute; bottom: 2px; left: 2px; font-family: var(--mono); font-size: 0.55rem; background: rgba(0,0,0,0.7); color: var(--accent); padding: 1px 4px; border-radius: 2px;")}>
                    AVIF
                  </span>
                  <button
                    type="button"
                    onClick={() => removeRetainedMedia(idx)}
                    title="Remove media"
                    style={css("position: absolute; top: 2px; right: 2px; background: rgba(0,0,0,0.8); border: 1px solid var(--red-soft); color: var(--red-soft); border-radius: 50%; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; cursor: pointer; padding: 0;")}
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}

              {/* Newly staged files */}
              {stagedFiles.map((sf, idx) => (
                <div key={`staged-${idx}`} style={css("position: relative; aspect-ratio: 1; border: 1px dashed var(--accent); overflow: hidden; border-radius: 2px; background: var(--bg-0);")}>
                  <img
                    src={sf.previewUrl}
                    alt={sf.file.name}
                    style={css("width: 100%; height: 100%; object-fit: cover; opacity: 0.85;")}
                  />
                  <span style={css("position: absolute; bottom: 2px; left: 2px; font-family: var(--mono); font-size: 0.55rem; background: var(--accent); color: var(--bg-0); padding: 1px 4px; border-radius: 2px; font-weight: 600;")}>
                    NEW
                  </span>
                  <button
                    type="button"
                    onClick={() => removeStagedFile(idx)}
                    title="Remove new image"
                    style={css("position: absolute; top: 2px; right: 2px; background: rgba(0,0,0,0.8); border: 1px solid var(--red-soft); color: var(--red-soft); border-radius: 50%; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; cursor: pointer; padding: 0;")}
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* MODAL FOOTER ACTIONS */}
        <div style={css("display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--border-subtle); padding-top: 16px; margin-top: 10px; flex-wrap: wrap; gap: 10px;")}>
          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting || isSaving}
            style={css("background: none; border: 1px solid var(--red-soft); color: var(--red-soft); font-family: var(--mono); font-size: 0.68rem; padding: 7px 12px; cursor: pointer; border-radius: 2px; display: inline-flex; align-items: center; gap: 6px; transition: all 0.2s;")}
            title="Permanently delete this transmission"
          >
            <Trash2 size={13} />
            <span>{isDeleting ? 'DELETING...' : 'DELETE LOG'}</span>
          </button>

          <div style={css("display: flex; align-items: center; gap: 10px;")}>
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving || isDeleting}
              style={css("background: none; border: 1px solid var(--border); color: var(--text-2); font-family: var(--mono); font-size: 0.68rem; padding: 7px 14px; cursor: pointer; border-radius: 2px;")}
            >
              CANCEL
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving || isDeleting}
              className="post-btn"
              style={css("display: inline-flex; align-items: center; gap: 6px;")}
            >
              <span>{isSaving ? 'SAVING...' : 'SAVE TRANSMISSION →'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
