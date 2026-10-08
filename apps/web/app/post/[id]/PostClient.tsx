// @ts-nocheck
'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Heart, MessageSquare, Pencil } from 'lucide-react';
import { css } from '../../_ui/css';
import { processYouTubePost, formatBody } from '@/lib/youtube';
import type { DbPost, DbComment, DbPostMedia, DbProfile } from '@/lib/db';
import EditPostModal from '@/components/EditPostModal';
import './post.css';

function formatPostTime(dateVal: string | Date) {
  try {
    const d = new Date(dateVal);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffHours < 1) {
      const diffMins = Math.max(1, Math.floor(diffMs / (1000 * 60)));
      return `${diffMins}m ago`;
    }
    if (diffHours < 24) return `${diffHours}h ago`;
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const yyyy = d.getFullYear();
    const hh = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${yyyy}.${mm}.${dd} ${hh}:${min}`;
  } catch {
    return 'recently';
  }
}

interface PostClientProps {
  post: DbPost;
  postComments: DbComment[];
  mediaItems: DbPostMedia[];
  profile: DbProfile;
  isPostLiked: boolean;
  authenticated?: boolean;
  operatorName?: string;
}

export default function PostClient({
  post,
  postComments,
  mediaItems,
  profile,
  isPostLiked,
  authenticated = false,
  operatorName = '',
}: PostClientProps) {
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [comments, setComments] = useState(postComments);
  const [replyingTo, setReplyingTo] = useState(null);
  const { cleanedContent, videos: postYouTubeVideos } = processYouTubePost(post.content || '');

  const submitReply = async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const content = form.content.value.trim();
    const authorName = form.authorName.value.trim();
    if (!content) return;
    const button = form.querySelector('button[type="submit"]');
    button.disabled = true;
    try {
      const response = await fetch('/api/comments', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId: post.id, parentCommentId: replyingTo?.id || null, content, authorName }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || 'Failed to submit reply');
      setComments((current) => [...current, data.comment]);
      form.content.value = '';
      setReplyingTo(null);
    } catch (error) {
      alert(error.message || 'Network error while posting reply');
    } finally {
      button.disabled = false;
    }
  };

  const renderComments = (parentId = null, depth = 0) => comments
    .filter((comment) => (comment.parent_comment_id || null) === parentId)
    .map((comment) => (
      <div key={comment.id} className="comment-branch" style={css(`margin-left: ${Math.min(depth, 5) * 22}px;`)}>
        <div className="comment-item bracket-card" style={css("padding: 14px 16px;")}>
          <div className="comment-head" style={css("margin-bottom: 8px;")}>
            <span className={`comment-author ${comment.author_name === 'guest' ? 'guest' : ''}`} style={css("font-size: 0.72rem;")}>{comment.author_name === 'guest' ? '[guest]' : `[@${comment.author_name}]`}</span>
            <span className="comment-time">{formatPostTime(comment.created_at)}</span>
          </div>
          <div className="comment-body" style={css("font-size: 0.85rem; line-height: 1.6;")}>{comment.content}</div>
          <button type="button" className="comment-reply-btn" onClick={() => { setReplyingTo(comment); setTimeout(() => document.getElementById('commentInput')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 0); }}>REPLY</button>
        </div>
        {renderComments(comment.id, depth + 1)}
      </div>
    ));

  return (
    <>
  <div className="thread-wrapper" style={css("padding-top: 30px; max-width: 720px; margin: 0 auto;")}>
    
    {/* TOP NAVIGATION: BACK TO FEED */}
    <div style={css("margin-bottom: 20px; display: flex; align-items: center; justify-content: space-between;")}>
      <a href="/#blog" className="back-feed-link">
        ← back to feed
      </a>
      <span style={css("font-family: var(--mono); font-size: 0.65rem; color: var(--text-3); letter-spacing: 1px;")}>
        // THREAD TRANSMISSION
      </span>
    </div>

    {/* MAIN THREAD POST */}
    <article className="post bracket-card thread-main-post" id={`post-${post.id}`} style={css("margin-bottom: 24px;")}>
      <div className="post-head">
        <div className="avatar">
          {profile.avatar_url ? (
            <img src={profile.avatar_url} alt={post.author_name} loading="eager" />
          ) : (
            post.author_name.charAt(0).toUpperCase()
          )}
        </div>
        <div>
          <div className="post-user">{post.author_name}</div>
          <div className="post-handle">{post.author_handle}</div>
        </div>
        <div style={css("margin-left: auto; display: flex; align-items: center; gap: 8px;")}>
          {post.has_media && (
            <span className="post-media-tag" title="Contains AVIF media attachment">MEDIA</span>
          )}
          <div className="post-time">{formatPostTime(post.created_at)}</div>
        </div>
      </div>

      {cleanedContent && (
        <div className="post-body" style={css("font-size: 1rem; line-height: 1.7; padding: 12px 0 16px 0;")} dangerouslySetInnerHTML={{ __html: formatBody(cleanedContent) }} />
      )}

      {postYouTubeVideos.length > 0 && (
        <div className="post-youtube-embeds" style={css("margin-bottom: 16px;")}>
          {postYouTubeVideos.map((video) => (
            <div className="post-youtube-player">
              <iframe
                src={video.embedUrl}
                title="YouTube video player"
                loading="lazy"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerpolicy="strict-origin-when-cross-origin"
                allowfullscreen
              ></iframe>
            </div>
          ))}
        </div>
      )}

      {mediaItems.length > 0 && (
        <div className={`post-media-grid count-${Math.min(mediaItems.length, 4)}`} style={css("margin-bottom: 16px;")}>
          {mediaItems.map((m) => (
            <div className="post-media-card">
              <a href={m.url} target="_blank" rel="noopener noreferrer" className="post-media-link" title="Open full AVIF media">
                <img
                  src={m.url}
                  alt={m.alt_text || 'Post attachment'}
                  loading="lazy"
                  className="post-media-img"
                />
                <span className="media-format-pill">AVIF</span>
              </a>
            </div>
          ))}
        </div>
      )}

      <div className="post-actions" style={css("border-top: 1px solid var(--border-subtle); padding-top: 14px; margin-top: 8px;")}>
        <button
          className={`post-act like-btn ${isPostLiked ? 'liked' : ''}`}
          data-post-id={post.id}
          data-liked={isPostLiked ? 'true' : 'false'}
          onClick={(e) => { toggleLike(e.currentTarget); }}
          title={isPostLiked ? "You already liked this log" : "Like this log"}
          aria-label={`Like log (${post.likes_count} likes)`}
        >
          <Heart className="like-icon" size={14} fill={isPostLiked ? "currentColor" : "none"} />
          <span>{post.likes_count}</span>
        </button>
        <button className="post-act" onClick={() => { document.getElementById('commentInput')?.focus(); }} style={css("display: inline-flex; align-items: center; gap: 4px")}>
          <MessageSquare size={13} /> <span>{comments.length}</span>
        </button>
        {authenticated && (
          <button
            type="button"
            className="post-act edit-btn"
            onClick={() => setIsEditOpen(true)}
            title="Operator: Edit transmission"
            style={css("margin-left: auto; color: var(--accent); opacity: 0.85; display: inline-flex; align-items: center; gap: 4px;")}
          >
            <Pencil size={12} />
            <span>EDIT</span>
          </button>
        )}
      </div>
    </article>

    {/* CLEAR COMMENT / REPLY SECTION (TWITTER STYLE) */}
    <section className="bracket-card reply-composer-box" style={css("margin-bottom: 32px; padding: 20px 24px; background: var(--bg-1);")}>
      <div style={css("display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;")}>
        <div style={css("font-family: var(--mono); font-size: 0.68rem; color: var(--accent); letter-spacing: 1.5px;")}>
          // LEAVE A COMMENT
        </div>
        <div className="replying-to" style={css("font-family: var(--mono); font-size: 0.65rem; color: var(--text-3);")}>
          Replying to <span style={css("color: var(--accent);")}>{replyingTo ? `@${replyingTo.author_name}` : post.author_handle}</span>
          {replyingTo && <button type="button" onClick={() => setReplyingTo(null)} style={css("margin-left: 8px; color: var(--text-3); background: none; border: 0; cursor: pointer;")}>cancel</button>}
        </div>
      </div>

      <form className="comment-form" onSubmit={submitReply} style={css("background: transparent; border: none; padding: 0")}>
        <input type="text" name="honeypot" style={css("display: none;")} tabindex="-1" autocomplete="off" />

        <div style={css("display: flex; flex-direction: column; gap: 12px;")}>
          {/* Handle Input */}
          <div style={css("display: flex; align-items: center; gap: 8px;")}>
            {!authenticated && <label htmlFor="authorNameInput" style={css("font-family: var(--mono); font-size: 0.65rem; color: var(--text-3); text-transform: uppercase; letter-spacing: 1px; min-width: 70px;")}>
              Your Name:
            </label>}
            {!authenticated && <input
              type="text"
              id="authorNameInput"
              name="authorName"
              className="comment-input-name"
              placeholder="e.g. alice (leave empty for [guest])"
              maxlength="50"
              style={css("width: 100%; max-width: 280px;")}
            />}
            {authenticated && <span style={css("font-family: var(--mono); font-size: 0.65rem; color: var(--accent);")}>Operator: @{operatorName}</span>}
          </div>

          {/* Comment Textarea */}
          <div>
            <textarea
              id="commentInput"
              name="content"
              className="comment-input-content"
              placeholder={`Post your reply to ${replyingTo ? `@${replyingTo.author_name}` : post.author_handle}...`}
              required
              rows="3"
              maxlength="1000"
              style={css("width: 100%; resize: vertical; min-height: 70px; line-height: 1.5;")}
            ></textarea>
          </div>

          {/* Bottom Action Row */}
          <div style={css("display: flex; justify-content: space-between; align-items: center; padding-top: 4px;")}>
            <span style={css("font-family: var(--mono); font-size: 0.6rem; color: var(--text-3);")}>
              Public transmission • max 1,000 chars
            </span>
            <button type="submit" className="comment-submit-btn" style={css("padding: 8px 18px; font-weight: 500; letter-spacing: 1px;")}>
              REPLY ↵
            </button>
          </div>
        </div>
      </form>
    </section>

    {/* COMMENTS FEED */}
    <section className="comments-thread-section">
      <div style={css("display: flex; align-items: center; gap: 10px; margin-bottom: 16px;")}>
        <h3 style={css("font-family: var(--mono); font-size: 0.85rem; color: var(--text-0); margin: 0; font-weight: 500; letter-spacing: 1px;")}>
          REPLIES ({comments.length})
        </h3>
        <div style={css("flex: 1; height: 1px; background: var(--border-subtle);")}></div>
      </div>

      <div className="comments-list" id={`comments-list-${post.id}`} style={css("display: flex; flex-direction: column; gap: 12px;")}>
        {comments.length === 0 ? (
          <div className="comments-empty-notice" style={css("font-family: var(--mono); font-size: 0.75rem; color: var(--text-3); padding: 24px; text-align: center; border: 1px dashed var(--border-subtle); border-radius: 2px;")}>
            // No replies yet. Be the first to leave a comment on this thread.
          </div>
        ) : (
          renderComments()
        )}
      </div>
    </section>

    {/* OPERATOR EDIT POST MODAL */}
    {authenticated && (
      <EditPostModal
        isOpen={isEditOpen}
        post={post}
        initialMedia={mediaItems}
        onClose={() => setIsEditOpen(false)}
        onSaved={() => window.location.reload()}
        onDeleted={() => { window.location.href = '/#blog'; }}
      />
    )}

  </div>


    </>
  );
}
