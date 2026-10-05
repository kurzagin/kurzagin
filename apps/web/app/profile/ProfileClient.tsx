// @ts-nocheck
'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { Settings, Upload, X, Plus, Globe, ExternalLink } from 'lucide-react';
import { css } from '../_ui/css';
import type { DbProfile, ProjectEntry, SocialLinkEntry, ContactDetailEntry } from '@/lib/db';
import type { SessionUser } from '@/lib/auth';

interface ProfileClientProps {
  profile: DbProfile;
  authenticated: boolean;
  session: SessionUser | null;
}

export default function ProfileClient({
  profile,
  authenticated,
  session,
}: ProfileClientProps) {
  const currentlyBuilding: ProjectEntry[] = (profile.currently_building as ProjectEntry[]) || [];
  const techStack: string[] = (profile.tech_stack as string[]) || [];
  const socialLinks: SocialLinkEntry[] = (profile.social_links as SocialLinkEntry[]) || [];
  const contactDetails: ContactDetailEntry[] = (profile.contact_details as ContactDetailEntry[]) || [];

  useEffect(() => {
  function toggleProfileEditor() {
    const editor = document.getElementById('profileEditor');
    if (!editor) return;
    const isHidden = editor.style.display === 'none' || editor.style.display === '';
    editor.style.display = isHidden ? 'block' : 'none';
    if (isHidden) {
      editor.scrollIntoView({ behavior: 'smooth' });
    }
  }

  function addProjectRow() {
    const container = document.getElementById('projectsRepeater');
    if (!container) return;
    const row = document.createElement('div');
    row.className = 'repeater-row project-row';
    row.innerHTML = `
      <input type="text" class="editor-input proj-title" placeholder="Project Title" style="width: 25%;" />
      <input type="text" class="editor-input proj-desc" placeholder="Description" style="width: 40%;" />
      <input type="text" class="editor-input proj-url" placeholder="URL (optional)" style="width: 20%;" />
      <input type="text" class="editor-input proj-badge" placeholder="Badge" value="Active" style="width: 15%;" />
      <button type="button" class="btn-remove-row" onclick="this.parentElement.remove()" style="display:inline-flex;align-items:center;justify-content:center;"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg></button>
    `;
    container.appendChild(row);
  }

  function addSocialRow() {
    const container = document.getElementById('socialsRepeater');
    if (!container) return;
    const row = document.createElement('div');
    row.className = 'repeater-row social-row';
    row.innerHTML = `
      <input type="text" class="editor-input soc-platform" placeholder="Platform (e.g. Bluesky)" style="width: 30%;" />
      <input type="text" class="editor-input soc-label" placeholder="Handle/Label" style="width: 30%;" />
      <input type="text" class="editor-input soc-url" placeholder="Target URL" style="width: 35%;" />
      <button type="button" class="btn-remove-row" onclick="this.parentElement.remove()" style="display:inline-flex;align-items:center;justify-content:center;"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg></button>
    `;
    container.appendChild(row);
  }

  function addContactRow() {
    const container = document.getElementById('contactsRepeater');
    if (!container) return;
    const row = document.createElement('div');
    row.className = 'repeater-row contact-row';
    row.innerHTML = `
      <input type="text" class="editor-input con-method" placeholder="Method (e.g. Discord)" style="width: 30%;" />
      <input type="text" class="editor-input con-value" placeholder="Address/Handle" style="width: 35%;" />
      <input type="text" class="editor-input con-link" placeholder="Link (optional)" style="width: 30%;" />
      <button type="button" class="btn-remove-row" onclick="this.parentElement.remove()" style="display:inline-flex;align-items:center;justify-content:center;"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg></button>
    `;
    container.appendChild(row);
  }

  function updateMediaPreviews() {
    const avatarVal = document.getElementById('editAvatar')?.value?.trim();
    const avatarImg = document.getElementById('avatarEditPreview');
    const avatarFallback = document.getElementById('avatarEditFallback');
    if (avatarImg && avatarFallback) {
      if (avatarVal) {
        avatarImg.src = avatarVal;
        avatarImg.style.display = 'block';
        avatarFallback.style.display = 'none';
      } else {
        avatarImg.style.display = 'none';
        avatarFallback.style.display = 'block';
      }
    }

    const bannerVal = document.getElementById('editBanner')?.value?.trim();
    const bannerImg = document.getElementById('bannerEditPreview');
    const bannerFallback = document.getElementById('bannerEditFallback');
    if (bannerImg && bannerFallback) {
      if (bannerVal) {
        bannerImg.src = bannerVal;
        bannerImg.style.display = 'block';
        bannerFallback.style.display = 'none';
      } else {
        bannerImg.style.display = 'none';
        bannerFallback.style.display = 'block';
      }
    }
  }

  async function uploadProfileMedia(event, mediaType) {
    const file = event.target.files?.[0];
    if (!file) return;

    const statusEl = document.getElementById('saveStatus');
    if (statusEl) {
      statusEl.style.color = 'var(--accent)';
      statusEl.textContent = `Optimizing ${mediaType} to AVIF & uploading to Cloudflare R2...`;
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', mediaType);

    try {
      const res = await fetch('/api/media/upload-profile-media', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (res.ok && data.url) {
        if (mediaType === 'banner') {
          const bannerInput = document.getElementById('editBanner');
          if (bannerInput) bannerInput.value = data.url;
        } else {
          const avatarInput = document.getElementById('editAvatar');
          if (avatarInput) avatarInput.value = data.url;
        }
        updateMediaPreviews();
        if (statusEl) {
          statusEl.style.color = 'var(--green-soft)';
          statusEl.textContent = `// ${mediaType.toUpperCase()} transcoded to AVIF and uploaded to R2!`;
        }
      } else {
        alert('Upload failed: ' + (data.error || 'Server error'));
        if (statusEl) {
          statusEl.style.color = 'var(--red-soft)';
          statusEl.textContent = '// Upload error: ' + (data.error || 'Server error');
        }
      }
    } catch (err) {
      alert('Error uploading image: ' + err.message);
      if (statusEl) {
        statusEl.style.color = 'var(--red-soft)';
        statusEl.textContent = '// Upload error: ' + err.message;
      }
    }
  }

  async function saveProfile() {
    const btn = document.getElementById('saveProfileBtn');
    const statusEl = document.getElementById('saveStatus');
    if (btn) btn.disabled = true;
    if (statusEl) {
      statusEl.style.color = 'var(--accent)';
      statusEl.textContent = 'Saving changes to Neon database...';
    }

    try {
      const name = document.getElementById('editName')?.value || '';
      const handle = document.getElementById('editHandle')?.value || '';
      const headline = document.getElementById('editHeadline')?.value || '';
      const bio = document.getElementById('editBio')?.value || '';
      const location = document.getElementById('editLocation')?.value || '';
      const status_message = document.getElementById('editStatus')?.value || '';
      const avatar_url = document.getElementById('editAvatar')?.value || '';
      const banner_url = document.getElementById('editBanner')?.value || '';
      const contact_email = document.getElementById('editContactEmail')?.value || '';
      const contact_note = document.getElementById('editContactNote')?.value || '';

      const techStackStr = document.getElementById('editTechStack')?.value || '';
      const tech_stack = techStackStr
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      const projectRows = document.querySelectorAll('.project-row');
      const currently_building = [];
      projectRows.forEach((row) => {
        const title = row.querySelector('.proj-title')?.value?.trim();
        const description = row.querySelector('.proj-desc')?.value?.trim() || '';
        const url = row.querySelector('.proj-url')?.value?.trim() || '';
        const badge = row.querySelector('.proj-badge')?.value?.trim() || 'Active';
        if (title) {
          currently_building.push({ title, description, url, badge });
        }
      });

      const socialRows = document.querySelectorAll('.social-row');
      const social_links = [];
      socialRows.forEach((row) => {
        const platform = row.querySelector('.soc-platform')?.value?.trim();
        const label = row.querySelector('.soc-label')?.value?.trim() || '';
        const url = row.querySelector('.soc-url')?.value?.trim() || '';
        if (platform && url) {
          social_links.push({ platform, label, url });
        }
      });

      const contactRows = document.querySelectorAll('.contact-row');
      const contact_details = [];
      contactRows.forEach((row) => {
        const method = row.querySelector('.con-method')?.value?.trim();
        const value = row.querySelector('.con-value')?.value?.trim() || '';
        const link = row.querySelector('.con-link')?.value?.trim() || '';
        if (method && value) {
          contact_details.push({ method, value, link });
        }
      });

      const payload = {
        name,
        handle,
        headline,
        bio,
        location,
        status_message,
        avatar_url,
        banner_url,
        contact_email,
        contact_note,
        tech_stack,
        currently_building,
        social_links,
        contact_details,
      };

      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        if (statusEl) {
          statusEl.style.color = 'var(--green-soft)';
          statusEl.textContent = '// Profile saved successfully! Reloading...';
        }
        setTimeout(() => {
          window.location.reload();
        }, 600);
      } else {
        throw new Error(data.error || 'Failed to save');
      }
    } catch (err) {
      console.error(err);
      if (statusEl) {
        statusEl.style.color = 'var(--red-soft)';
        statusEl.textContent = '// ERROR: ' + err.message;
      }
      if (btn) btn.disabled = false;
    }
  }


    window.toggleProfileEditor = toggleProfileEditor;
    window.addProjectRow = addProjectRow;
    window.addSocialRow = addSocialRow;
    window.addContactRow = addContactRow;
    window.updateMediaPreviews = updateMediaPreviews;
    window.uploadProfileMedia = uploadProfileMedia;
    window.saveProfile = saveProfile;

    return () => {
      delete window.toggleProfileEditor;
      delete window.addProjectRow;
      delete window.addSocialRow;
      delete window.addContactRow;
      delete window.updateMediaPreviews;
      delete window.uploadProfileMedia;
      delete window.saveProfile;
    };
  }, []);

  return (
    <>
  <div className="page-header">
    <div style={css("display: flex; align-items: flex-end; justify-content: space-between; flex-wrap: wrap; gap: 16px;")}>
      <div>
        <h1><span className="hl">operator</span> dossier</h1>
        <div className="page-sub"><span className="jp-label">人物・経歴</span> — architecture, systems, projects & contact</div>
      </div>
      {authenticated && (
        <button id="toggleEditBtn" className="post-btn" onClick={(e) => { const w = window as any; toggleProfileEditor() }} style={css("padding: 6px 14px; font-size: 0.75rem; display: inline-flex; align-items: center; gap: 6px;")}>
          <Settings size={13} /> EDIT DOSSIER
        </button>
      )}
    </div>
  </div>

  <section className="section">
    {/* OPERATOR EDIT CONSOLE (HIDDEN BY DEFAULT, TOGGLED BY OPERATOR) */}
    {authenticated && (
      <div id="profileEditor" className="profile-editor-card reveal" style={css("display: none;")}>
        <div style={css("display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; border-bottom: 1px solid var(--border); padding-bottom: 8px;")}>
          <span style={css("font-family: var(--mono); font-size: 0.75rem; color: var(--accent); letter-spacing: 1.5px;")}>
            // DOSSIER CONSOLE — EDIT OPERATOR PROFILE
          </span>
          <span style={css("font-family: var(--mono); font-size: 0.65rem; color: var(--text-3);")}>
            authenticated: @{session?.username}
          </span>
        </div>

        <form id="editProfileForm" onSubmit={(e) => { const w = window as any; event.preventDefault(); saveProfile(); }}>
          <div className="editor-row-grid">
            <div className="editor-field">
              <label htmlFor="editName">Operator Name</label>
              <input type="text" id="editName" className="editor-input" value={profile.name} required />
            </div>
            <div className="editor-field">
              <label htmlFor="editHandle">Handle</label>
              <input type="text" id="editHandle" className="editor-input" value={profile.handle} required />
            </div>
          </div>

          <div className="editor-row-grid">
            <div className="editor-field">
              <label htmlFor="editLocation">Coordinates / Location</label>
              <input type="text" id="editLocation" className="editor-input" value={profile.location || ''} />
            </div>
            <div className="editor-field">
              <label htmlFor="editStatus">Status Message</label>
              <input type="text" id="editStatus" className="editor-input" value={profile.status_message || ''} />
            </div>
          </div>

          <div className="editor-field">
            <label htmlFor="editHeadline">Headline / Role Summary</label>
            <input type="text" id="editHeadline" className="editor-input" value={profile.headline || ''} />
          </div>

          <div className="editor-field">
            <label htmlFor="editBio">Extended Bio (Markdown Supported)</label>
            <textarea id="editBio" className="editor-textarea" rows="6">{profile.bio || ''}</textarea>
          </div>

          <div className="editor-row-grid">
            <div className="editor-field">
              <label htmlFor="editAvatar">Avatar (1:1 AVIF • R2)</label>
              <div style={css("display: flex; gap: 8px; align-items: center;")}>
                <div id="avatarEditPreviewWrap" style={css("width: 42px; height: 42px; border-radius: 4px; border: 1px solid var(--border); overflow: hidden; background: var(--bg-0); flex-shrink: 0; display: flex; align-items: center; justify-content: center;")}>
                  <img id="avatarEditPreview" src={profile.avatar_url || ''} style={profile.avatar_url ? { width: '100%', height: '100%', objectFit: 'cover' } : { display: 'none' }} />
                  <span id="avatarEditFallback" style={!profile.avatar_url ? { fontSize: '1.2rem', color: 'var(--accent)' } : { display: 'none' }}>𒀭</span>
                </div>
                <input type="text" id="editAvatar" className="editor-input" value={profile.avatar_url || ''} placeholder="https://... or upload AVIF to R2" onInput={(e) => { const w = window as any; updateMediaPreviews() }} />
                <label htmlFor="avatarUploadInput" className="btn-add-row" style={css("cursor: pointer; margin: 0; white-space: nowrap; font-size: 0.7rem; padding: 7px 10px; display: inline-flex; align-items: center; gap: 4px;")}>
                  <Upload size={12} /> UPLOAD
                </label>
                <input type="file" id="avatarUploadInput" accept="image/*" style={css("display: none;")} onChange={(e) => { const w = window as any; uploadProfileMedia(event, 'avatar') }} />
              </div>
            </div>
            <div className="editor-field">
              <label htmlFor="editBanner">Banner (Wide AVIF • R2)</label>
              <div style={css("display: flex; gap: 8px; align-items: center;")}>
                <div id="bannerEditPreviewWrap" style={css("width: 70px; height: 42px; border-radius: 4px; border: 1px solid var(--border); overflow: hidden; background: var(--bg-0); flex-shrink: 0; display: flex; align-items: center; justify-content: center;")}>
                  <img id="bannerEditPreview" src={profile.banner_url || ''} style={profile.banner_url ? { width: '100%', height: '100%', objectFit: 'cover' } : { display: 'none' }} />
                  <span id="bannerEditFallback" style={!profile.banner_url ? { fontSize: '0.65rem', color: 'var(--text-3)', fontFamily: 'var(--mono)' } : { display: 'none' }}>NO BANNER</span>
                </div>
                <input type="text" id="editBanner" className="editor-input" value={profile.banner_url || ''} placeholder="https://... or upload AVIF to R2" onInput={(e) => { const w = window as any; updateMediaPreviews() }} />
                <label htmlFor="bannerUploadInput" className="btn-add-row" style={css("cursor: pointer; margin: 0; white-space: nowrap; font-size: 0.7rem; padding: 7px 10px; display: inline-flex; align-items: center; gap: 4px;")}>
                  <Upload size={12} /> UPLOAD
                </label>
                <input type="file" id="bannerUploadInput" accept="image/*" style={css("display: none;")} onChange={(e) => { const w = window as any; uploadProfileMedia(event, 'banner') }} />
              </div>
            </div>
          </div>

          <div className="editor-row-grid">
            <div className="editor-field">
              <label htmlFor="editContactEmail">Primary Contact Email</label>
              <input type="email" id="editContactEmail" className="editor-input" value={profile.contact_email || ''} />
            </div>
            <div className="editor-field">
              <label htmlFor="editContactNote">Contact Note / Collaboration Note</label>
              <input type="text" id="editContactNote" className="editor-input" value={profile.contact_note || ''} />
            </div>
          </div>

          {/* TECH STACK */}
          <div className="editor-field" style={css("margin-top: 16px;")}>
            <label htmlFor="editTechStack">Tech Stack & Tools (Comma-separated)</label>
            <input
              type="text"
              id="editTechStack"
              className="editor-input"
              value={techStack.join(', ')}
              placeholder="TypeScript, Python, Rust, Astro, PostgreSQL"
            />
          </div>

          {/* CURRENTLY BUILDING REPEATER */}
          <div className="editor-field" style={css("margin-top: 20px;")}>
            <label>Currently Building (Projects & Initiatives)</label>
            <div id="projectsRepeater">
              {currentlyBuilding.map((item, idx) => (
                <div className="repeater-row project-row" data-idx={idx}>
                  <input type="text" className="editor-input proj-title" placeholder="Project Title" value={item.title} style={css("width: 25%;")} />
                  <input type="text" className="editor-input proj-desc" placeholder="Description" value={item.description} style={css("width: 40%;")} />
                  <input type="text" className="editor-input proj-url" placeholder="URL (optional)" value={item.url || ''} style={css("width: 20%;")} />
                  <input type="text" className="editor-input proj-badge" placeholder="Badge" value={item.badge || 'Active'} style={css("width: 15%;")} />
                  <button type="button" className="btn-remove-row" onClick={(e) => { const w = window as any; this.parentElement.remove() }} style={css("display: inline-flex; align-items: center; justify-content: center;")}><X size={12} /></button>
                </div>
              ))}
            </div>
            <button type="button" className="btn-add-row" onClick={(e) => { const w = window as any; addProjectRow() }} style={css("display: inline-flex; align-items: center; gap: 4px;")}><Plus size={12} /> Add Project</button>
          </div>

          {/* SOCIAL MEDIA & LINKS REPEATER */}
          <div className="editor-field" style={css("margin-top: 20px;")}>
            <label>Social Media & Links</label>
            <div id="socialsRepeater">
              {socialLinks.map((link, idx) => (
                <div className="repeater-row social-row" data-idx={idx}>
                  <input type="text" className="editor-input soc-platform" placeholder="Platform (e.g. GitHub, X)" value={link.platform} style={css("width: 30%;")} />
                  <input type="text" className="editor-input soc-label" placeholder="Handle/Label (e.g. @kurzagin)" value={link.label} style={css("width: 30%;")} />
                  <input type="text" className="editor-input soc-url" placeholder="Target URL" value={link.url} style={css("width: 35%;")} />
                  <button type="button" className="btn-remove-row" onClick={(e) => { const w = window as any; this.parentElement.remove() }} style={css("display: inline-flex; align-items: center; justify-content: center;")}><X size={12} /></button>
                </div>
              ))}
            </div>
            <button type="button" className="btn-add-row" onClick={(e) => { const w = window as any; addSocialRow() }} style={css("display: inline-flex; align-items: center; gap: 4px;")}><Plus size={12} /> Add Link</button>
          </div>

          {/* CONTACT DETAILS REPEATER */}
          <div className="editor-field" style={css("margin-top: 20px;")}>
            <label>Contact Channels & Methods</label>
            <div id="contactsRepeater">
              {contactDetails.map((contact, idx) => (
                <div className="repeater-row contact-row" data-idx={idx}>
                  <input type="text" className="editor-input con-method" placeholder="Method (e.g. Email, DM)" value={contact.method} style={css("width: 30%;")} />
                  <input type="text" className="editor-input con-value" placeholder="Address/Value" value={contact.value} style={css("width: 35%;")} />
                  <input type="text" className="editor-input con-link" placeholder="Link (mailto: / https://)" value={contact.link || ''} style={css("width: 30%;")} />
                  <button type="button" className="btn-remove-row" onClick={(e) => { const w = window as any; this.parentElement.remove() }} style={css("display: inline-flex; align-items: center; justify-content: center;")}><X size={12} /></button>
                </div>
              ))}
            </div>
            <button type="button" className="btn-add-row" onClick={(e) => { const w = window as any; addContactRow() }} style={css("display: inline-flex; align-items: center; gap: 4px;")}><Plus size={12} /> Add Channel</button>
          </div>

          <div className="editor-actions">
            <button type="button" className="btn-remove-row" onClick={(e) => { const w = window as any; toggleProfileEditor() }} style={css("color: var(--text-2); border-color: var(--border);")}>
              CANCEL
            </button>
            <button type="submit" id="saveProfileBtn" className="post-btn">
              SAVE CHANGES →
            </button>
          </div>
          <div id="saveStatus" style={css("font-family: var(--mono); font-size: 0.75rem; text-align: right; margin-top: 8px;")}></div>
        </form>
      </div>
    )}

    {/* PROFILE HERO DOSSIER CARD */}
    <div className="profile-hero bracket-card reveal">
      <div
        className="profile-banner"
        style={profile.banner_url ? { backgroundImage: `url('${profile.banner_url}')`, backgroundSize: 'cover' } : undefined}
      >
        <div className="profile-banner-grid"></div>
      </div>

      <div className="profile-hero-content">
        <div className="profile-avatar-wrap">
          <div className="profile-avatar">
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt={profile.name} loading="eager" />
            ) : (
              <span>𒀭</span>
            )}
          </div>
        </div>

        <div className="profile-info">
          <div className="profile-name-row">
            <h2 className="profile-name">{profile.name}</h2>
            <span className="profile-handle">{profile.handle}</span>
            {profile.status_message && (
              <div className="profile-status-badge">
                <span className="dot"></span>
                <span>{profile.status_message}</span>
              </div>
            )}
          </div>

          {profile.headline && (
            <p className="profile-headline">{profile.headline}</p>
          )}

          {profile.location && (
            <div className="profile-coords">
              <span>COORD: {profile.location}</span>
            </div>
          )}
        </div>
      </div>
    </div>

    {/* DOSSIER DETAIL SECTIONS */}
    <div className="profile-meta-grid reveal">
      {/* BIO & PHILOSOPHY BLOCK */}
      <div className="profile-block">
        <div className="profile-block-title">
          <span>// 01. IDENTITY & BIO</span>
          <span className="jp-label" style={css("font-size: 0.65rem;")}>概要</span>
        </div>
        <div className="profile-bio-text">
          {profile.bio}
        </div>
      </div>

      {/* CURRENTLY BUILDING BLOCK */}
      <div className="profile-block">
        <div className="profile-block-title">
          <span>// 02. CURRENTLY BUILDING</span>
          <span className="jp-label" style={css("font-size: 0.65rem;")}>開発中</span>
        </div>
        <div>
          {currentlyBuilding.length === 0 ? (
            <div style={css("font-family: var(--mono); font-size: 0.75rem; color: var(--text-3);")}>
              // no active projects listed
            </div>
          ) : (
            currentlyBuilding.map((item) => (
              <a
                href={item.url || '#'}
                target={item.url ? "_blank" : undefined}
                rel={item.url ? "noopener noreferrer" : undefined}
                className="project-item"
                style={!item.url ? { pointerEvents: 'none' } : undefined}
              >
                <div className="project-header">
                  <span className="project-title">{item.title}</span>
                  {item.badge && (
                    <span className={`project-badge ${item.badge.toLowerCase()}`}>
                      {item.badge}
                    </span>
                  )}
                </div>
                <div className="project-desc">{item.description}</div>
              </a>
            ))
          )}
        </div>
      </div>
    </div>

    {/* STACK, SOCIAL MEDIA & CONTACT GRID */}
    <div className="profile-meta-grid reveal" style={css("margin-top: 20px;")}>
      {/* TOOLS & TECH STACK */}
      <div className="profile-block">
        <div className="profile-block-title">
          <span>// 03. TOOLS & ARCHITECTURE</span>
          <span className="jp-label" style={css("font-size: 0.65rem;")}>技術スタック</span>
        </div>
        <div className="stack-pills">
          {techStack.map((tech) => (
            <span className="stack-pill">{tech}</span>
          ))}
        </div>
      </div>

      {/* SOCIAL MEDIA & CHANNELS */}
      <div className="profile-block">
        <div className="profile-block-title">
          <span>// 04. SOCIAL & LINKS</span>
          <span className="jp-label" style={css("font-size: 0.65rem;")}>通信網</span>
        </div>
        <div>
          {socialLinks.map((link) => (
            <a
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="social-item-row"
            >
              <div className="social-platform-label" style={css("display: flex; align-items: center; gap: 6px;")}>
                <Globe size={13} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                <span style={css("font-weight: 500;")}>{link.platform}</span>
                <span style={css("font-family: var(--mono); font-size: 0.75rem; color: var(--text-2);")}>({link.label})</span>
              </div>
              <ExternalLink size={12} className="social-arrow" />
            </a>
          ))}
        </div>
      </div>
    </div>

    {/* CONTACT BLOCK */}
    <div className="profile-block reveal" style={css("margin-top: 20px;")}>
      <div className="profile-block-title">
        <span>// 05. CONTACT & COLLABORATION</span>
        <span className="jp-label" style={css("font-size: 0.65rem;")}>連絡先</span>
      </div>

      {profile.contact_note && (
        <p style={css("font-size: 0.9rem; color: var(--text-1); margin-bottom: 16px;")}>
          {profile.contact_note}
        </p>
      )}

      <div className="contact-box">
        {contactDetails.map((c) => (
          <div className="contact-method-row">
            <span className="contact-label">{c.method.toUpperCase()}</span>
            <span className="contact-val">
              {c.link ? (
                <a href={c.link} target={c.link.startsWith('http') ? "_blank" : undefined} rel="noopener noreferrer">
                  {c.value}
                </a>
              ) : (
                <span style={css("color: var(--text-0); font-family: var(--mono);")}>{c.value}</span>
              )}
            </span>
          </div>
        ))}
        {profile.contact_email && !contactDetails.some((d) => d.value === profile.contact_email) && (
          <div className="contact-method-row">
            <span className="contact-label">DIRECT EMAIL</span>
            <span className="contact-val">
              <a href={`mailto:${profile.contact_email}`}>{profile.contact_email}</a>
            </span>
          </div>
        )}
      </div>
    </div>
  </section>


    </>
  );
}
