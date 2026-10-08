// @ts-nocheck
'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { Upload, LogOut, Trash2 } from 'lucide-react';
import { css } from '../_ui/css';
import type { DbProfile } from '@/lib/db';
import type { SessionUser } from '@/lib/auth';

interface SettingsClientProps {
  authenticated: boolean;
  session: SessionUser | null;
  profile: DbProfile | null;
  isConfigured: boolean;
}

export default function SettingsClient({
  authenticated,
  session,
  profile,
  isConfigured,
}: SettingsClientProps) {
  const heroUrl = profile?.banner_url || '';
  const currentTheme = profile?.theme || 'default';
  const isOperator = authenticated;

  const inputStyle = {
    width: '100%',
    background: 'var(--bg-0)',
    border: '1px solid var(--border-subtle)',
    color: 'var(--text-0)',
    fontFamily: 'var(--mono)',
    fontSize: '0.85rem',
    padding: '10px 14px',
    outline: 'none',
    borderRadius: '2px',
  };
  const labelStyle = {
    display: 'block',
    fontFamily: 'var(--mono)',
    fontSize: '0.65rem',
    color: 'var(--text-3)',
    marginBottom: '6px',
    letterSpacing: '1px',
  };

  useEffect(() => {

    // ---- Operator-only NSFW preference ----
    (function initNsfwSettings() {
      if (!isOperator) return;
      const prefBlur = document.getElementById('prefBlur');
      const prefShow = document.getElementById('prefShow');
      const badge = document.getElementById('nsfwStatusBadge');
      const statusText = document.getElementById('nsfwSaveStatus');

      if (!prefBlur || !prefShow) return;

      const defaultMode = 'show';
      const current = localStorage.getItem('kurzagin_nsfw_mode') || defaultMode;

      if (current === 'show') {
        prefShow.checked = true;
        if (badge) {
          badge.textContent = isOperator ? 'MODE: OPEN ALL (OP)' : 'MODE: OPEN ALL (18+)';
          badge.style.borderColor = 'rgba(255, 71, 87, 0.4)';
          badge.style.color = '#ff6b81';
        }
      } else {
        prefBlur.checked = true;
        if (badge) {
          badge.textContent = 'MODE: BLURRED';
          badge.style.borderColor = 'var(--border-subtle)';
          badge.style.color = 'var(--text-3)';
        }
      }

      function setMode(mode) {
        localStorage.setItem('kurzagin_nsfw_mode', mode);
        if (mode === 'show') {
          if (badge) {
            badge.textContent = isOperator ? 'MODE: OPEN ALL (OP)' : 'MODE: OPEN ALL (18+)';
            badge.style.borderColor = 'rgba(255, 71, 87, 0.4)';
            badge.style.color = '#ff6b81';
          }
          if (statusText) {
            statusText.style.color = '#7bc67a';
            statusText.textContent = isOperator 
              ? '✓ Preference saved: All captures will display unblurred.'
              : '';
          }
        } else {
          if (badge) {
            badge.textContent = 'MODE: BLURRED';
            badge.style.borderColor = 'var(--border-subtle)';
            badge.style.color = 'var(--text-3)';
          }
          if (statusText) {
            statusText.style.color = 'var(--accent)';
            statusText.textContent = '✓ Preference saved: Sensitive captures will be blurred by default.';
          }
        }
      }

      prefBlur.addEventListener('change', () => {
        if (prefBlur.checked) setMode('blur');
      });

      prefShow.addEventListener('change', () => {
        if (prefShow.checked) {
          if (!isOperator) {
            if (!confirm('Age Verification (18+):\n\nDo you confirm that you are at least 18 years of age or the legal age of majority in your jurisdiction?')) {
              prefBlur.checked = true;
              setMode('blur');
              return;
            }
          }
          setMode('show');
        }
      });
    })();

    (function () {
      // ---- logged-out mode: login ----
      const form = document.getElementById('loginForm');
      if (form) {
        const statusEl = document.getElementById('loginStatus');
        const submitBtn = document.getElementById('submitBtn');
        form.addEventListener('submit', async (e) => {
          e.preventDefault();
          submitBtn.disabled = true;
          statusEl.style.color = 'var(--accent)';
          statusEl.textContent = '// status: handshaking with neon auth...';
          try {
            const res = await fetch('/api/auth/login', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ identifier: form.identifier.value.trim(), password: form.password.value }),
            });
            const data = await res.json();
            if (res.ok && data.success) {
              statusEl.style.color = '#7bc67a';
              statusEl.textContent = '// status: verified. loading settings...';
              window.location.reload();
            } else {
              statusEl.style.color = '#e06c75';
              statusEl.textContent = '// status: error — ' + (data.error || 'access denied');
              submitBtn.disabled = false;
            }
          } catch (err) {
            statusEl.style.color = '#e06c75';
            statusEl.textContent = '// status: network error during handshake';
            submitBtn.disabled = false;
          }
        });
        return;
      }

      // ---- logged-in mode: hero image ----
      const urlInput = document.getElementById('heroUrl');
      const preview = document.getElementById('heroPreview');
      const status = document.getElementById('settingsStatus');
      const fileInput = document.getElementById('heroUpload');
      const saveBtn = document.getElementById('heroSave');
      const clearBtn = document.getElementById('heroClear');
      const logoutBtn = document.getElementById('logoutBtn');
      const themeSelect = document.getElementById('themeSelect');
      const themeSave = document.getElementById('themeSave');
      const themeStatus = document.getElementById('themeStatus');
      if (themeSelect && themeSave) {
        themeSelect.value = currentTheme;
        themeSave.addEventListener('click', async () => {
          themeSave.disabled = true;
          themeStatus.textContent = '// applying skin...';
          try {
            const res = await fetch('/api/profile', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ ...profile, theme: themeSelect.value }),
            });
            if (!res.ok) throw new Error('failed to save skin');
            themeStatus.style.color = '#7bc67a';
            themeStatus.textContent = '// skin saved. reloading interface...';
            window.location.reload();
          } catch (err) {
            themeStatus.style.color = '#e06c75';
            themeStatus.textContent = '// error: ' + err.message;
            themeSave.disabled = false;
          }
        });
      }
      if (!urlInput) return;

      function say(msg, color) {
        status.style.color = color || 'var(--text-3)';
        status.textContent = msg;
      }

      function updatePreview() {
        const v = urlInput.value.trim();
        if (v) {
          preview.style.backgroundImage = "url('" + v.replace(/'/g, '%27') + "')";
          preview.textContent = '';
        } else {
          preview.style.backgroundImage = '';
          preview.textContent = 'NO HERO IMAGE';
        }
      }
      urlInput.addEventListener('input', updatePreview);

      clearBtn.addEventListener('click', () => {
        urlInput.value = '';
        updatePreview();
      });

      fileInput.addEventListener('change', async () => {
        const file = fileInput.files && fileInput.files[0];
        if (!file) return;
        say('// optimizing & uploading...', 'var(--accent)');
        const fd = new FormData();
        fd.append('file', file);
        fd.append('type', 'banner');
        try {
          const res = await fetch('/api/media/upload-profile-media', { method: 'POST', body: fd });
          const data = await res.json();
          if (res.ok && data.url) {
            urlInput.value = data.url;
            updatePreview();
            say('// uploaded. press SAVE to apply.', '#7bc67a');
          } else {
            say('// upload error: ' + (data.error || 'server error'), '#e06c75');
          }
        } catch (err) {
          say('// upload error: ' + err.message, '#e06c75');
        }
      });

      saveBtn.addEventListener('click', async () => {
        saveBtn.disabled = true;
        say('// saving...', 'var(--accent)');
        try {
          const res = await fetch('/api/profile', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ banner_url: urlInput.value.trim() }),
          });
          const data = await res.json();
          if (res.ok && data.success) {
            say('// hero image saved.', '#7bc67a');
          } else {
            say('// error: ' + (data.error || 'failed to save'), '#e06c75');
          }
        } catch (err) {
          say('// error: ' + err.message, '#e06c75');
        }
        saveBtn.disabled = false;
      });

      if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
          try {
            await fetch('/api/auth/logout', { method: 'POST' });
            window.location.reload();
          } catch (err) {
            alert('Failed to log out');
          }
        });
      }
    })();
  
  }, [isOperator]);

  return (
    <>
  <div className="page-header">
    <h1><span className="hl">preferences</span> & settings</h1>
    <div className="page-sub"><span className="jp-label">設定</span> — {authenticated ? 'operator controls & content preferences' : 'operator login'}</div>
  </div>

  <section className="section" style={css("max-width: 640px; margin: 0 auto; padding-top: 40px;")}>
    {/* NSFW preferences are intentionally unavailable outside an operator session. */}
    {authenticated && <div className="bracket-card" style={css("padding: 28px; margin-bottom: 24px;")}>
      <div style={css("display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; flex-wrap: wrap; gap: 8px;")}>
        <div style={css("font-family: var(--mono); font-size: 0.65rem; color: var(--accent); letter-spacing: 2px;")}>
          // CONTENT FILTERING • SENSITIVE MEDIA (18+)
        </div>
        <span id="nsfwStatusBadge" style={css("font-family: var(--mono); font-size: 0.62rem; padding: 2px 8px; border-radius: 2px; border: 1px solid var(--border-subtle); color: var(--text-3); background: rgba(0,0,0,0.2);")}>
          MODE: {authenticated ? 'OPEN ALL (DEFAULT)' : 'BLURRED (DEFAULT)'}
        </span>
      </div>

      <p style={css("font-family: var(--sans); font-size: 0.8rem; color: var(--text-2); line-height: 1.5; margin-bottom: 16px;")}>
        Configure how sensitive and adult captures in the gallery darkroom appear on your device.
        {authenticated 
          ? <span style={css("color: var(--accent); display: block; margin-top: 4px; font-size: 0.72rem; font-family: var(--mono);")}>• Operator session: Defaults to opening all captures, but you can toggle blur mode anytime to preview visitor experience.</span>
          : <span style={css("color: var(--text-3); display: block; margin-top: 4px; font-size: 0.72rem; font-family: var(--mono);")}>• Visitor mode: Sensitive captures are blurred by default until self-age verified.</span>
        }
      </p>

      <div style={css("display: flex; flex-direction: column; gap: 12px; background: var(--bg-0); padding: 14px 16px; border: 1px solid var(--border-subtle); border-radius: 4px;")}>
        <label style={css("display: flex; align-items: flex-start; gap: 10px; cursor: pointer;")}>
          <input type="radio" name="nsfwPreference" value="blur" id="prefBlur" style={css("margin-top: 3px; accent-color: var(--accent); cursor: pointer;")} />
          <div>
            <div style={css("font-family: var(--mono); font-size: 0.75rem; color: var(--text-0); font-weight: 500;")}>
              Blur sensitive & adult captures {authenticated ? '' : '(Default for visitors)'}
            </div>
            <div style={css("font-family: var(--sans); font-size: 0.68rem; color: var(--text-3); margin-top: 2px;")}>
              NSFW polaroids remain blurred until clicked or revealed.
            </div>
          </div>
        </label>

        <label style={css("display: flex; align-items: flex-start; gap: 10px; cursor: pointer; border-top: 1px solid var(--border-subtle); padding-top: 10px;")}>
          <input type="radio" name="nsfwPreference" value="show" id="prefShow" style={css("margin-top: 3px; accent-color: #ff4757; cursor: pointer;")} />
          <div>
            <div style={css("font-family: var(--mono); font-size: 0.75rem; color: #ff6b81; font-weight: 500;")}>
              Open all captures {authenticated ? '(Default for operator)' : '• Self-verified 18+'}
            </div>
            <div style={css("font-family: var(--sans); font-size: 0.68rem; color: var(--text-3); margin-top: 2px;")}>
              {authenticated 
                ? 'All captures are displayed unblurred without sensitive overlay.' 
                : 'I certify that I am at least 18 years of age or the legal age of majority in my jurisdiction.'}
            </div>
          </div>
        </label>
      </div>

      <div id="nsfwSaveStatus" style={css("font-family: var(--mono); font-size: 0.68rem; margin-top: 12px; min-height: 18px; color: var(--text-3);")}>
        // preference stored locally in your browser
      </div>
    </div>}
    {authenticated ? (
      <div className="bracket-card" style={css("padding: 32px;")}>
        <div className="bracket-card" style={css("padding: 20px; margin-bottom: 24px; background: var(--bg-0);")}>
          <div style={css("font-family: var(--mono); font-size: 0.65rem; color: var(--accent); letter-spacing: 2px; margin-bottom: 10px;")}>// SITE SKIN</div>
          <p style={css("font-size: 0.78rem; color: var(--text-2); margin-bottom: 14px;")}>Change the atmosphere of the entire site. This control is only available to the operator.</p>
          <div style={css("display: flex; gap: 8px; align-items: center; flex-wrap: wrap;")}>
            <select id="themeSelect" defaultValue={currentTheme} style={inputStyle}>
              <option value="default">default // kurzagin</option>
              <option value="citlali">citlali // obsidian opalstar</option>
            </select>
            <button type="button" id="themeSave" className="post-btn">APPLY →</button>
          </div>
          <div id="themeStatus" style={css("font-family: var(--mono); font-size: 0.68rem; min-height: 18px; margin-top: 10px; color: var(--text-3);")}>// current skin: {currentTheme}</div>
        </div>
        <div style={css("display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;")}>
          <div style={css("font-family: var(--mono); font-size: 0.65rem; color: var(--accent); letter-spacing: 2px;")}>// HERO IMAGE</div>
          <span style={css("font-family: var(--mono); font-size: 0.65rem; color: var(--text-3);")}>@{session?.username}</span>
        </div>

        <div
          id="heroPreview"
          style={{ height: '140px', border: '1px solid var(--border)', borderRadius: '4px', marginBottom: '16px', background: 'var(--bg-0) center / cover no-repeat', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--mono)', fontSize: '0.7rem', color: 'var(--text-3)', ...(heroUrl ? { backgroundImage: `url('${heroUrl}')` } : {}) }}
        >
          {!heroUrl && 'NO HERO IMAGE'}
        </div>

        <div style={css("margin-bottom: 12px;")}>
          <label htmlFor="heroUrl" style={labelStyle}>IMAGE URL</label>
          <input type="text" id="heroUrl" value={heroUrl} placeholder="https://... or upload below" style={inputStyle} />
        </div>

        <div style={css("display: flex; gap: 8px; flex-wrap: wrap; align-items: center;")}>
          <label htmlFor="heroUpload" className="btn-add-row" style={css("cursor: pointer; margin: 0; display: inline-flex; align-items: center; gap: 4px;")}>
            <Upload size={12} /> UPLOAD
          </label>
          <input type="file" id="heroUpload" accept="image/*" style={css("display: none;")} />
          <button type="button" id="heroClear" className="btn-add-row" style={css("margin: 0; display: inline-flex; align-items: center; gap: 4px;")}>
            <Trash2 size={12} /> REMOVE
          </button>
          <button type="button" id="heroSave" className="post-btn" style={css("margin-left: auto;")}>SAVE →</button>
        </div>
        <div id="settingsStatus" style={css("font-family: var(--mono); font-size: 0.7rem; min-height: 18px; margin-top: 12px; color: var(--text-3);")}></div>

        <div style={css("border-top: 1px solid var(--border); margin-top: 24px; padding-top: 16px; display: flex; justify-content: flex-end;")}>
          <button id="logoutBtn" className="post-btn" style={css("background: var(--bg-2); color: var(--text-2); border: 1px solid var(--border); display: inline-flex; align-items: center; gap: 6px;")}>
            <LogOut size={12} /> Logout
          </button>
        </div>
      </div>
    ) : (
      <div className="bracket-card" style={css("padding: 32px;")}>
        <div style={css("margin-bottom: 20px;")}>
          <div style={css("display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;")}>
            <div style={css("font-family: var(--mono); font-size: 0.65rem; color: var(--accent); letter-spacing: 2px;")}>// LOGIN • NEON AUTH</div>
            {!isConfigured && (
              <span style={css("font-family: var(--mono); font-size: 0.6rem; color: #e5c07b; border: 1px solid #e5c07b44; padding: 2px 6px; border-radius: 2px;")}>CONFIG PENDING</span>
            )}
          </div>
          <h2 style={css("font-family: var(--mono); font-size: 1.1rem; color: var(--text-0); font-weight: 400; margin: 0;")}>Log in to unlock settings</h2>
        </div>

        <form id="loginForm" style={css("display: flex; flex-direction: column; gap: 16px;")}>
          <div>
            <label htmlFor="identifier" style={labelStyle}>OPERATOR IDENTIFIER (EMAIL OR HANDLE)</label>
            <input type="text" id="identifier" name="identifier" autocomplete="username email" required style={inputStyle} />
          </div>
          <div>
            <label htmlFor="password" style={labelStyle}>SECURITY PASSPHRASE</label>
            <input type="password" id="password" name="password" autocomplete="current-password" required placeholder="••••••••••••" style={inputStyle} />
          </div>
          <div id="loginStatus" style={css("font-family: var(--mono); font-size: 0.7rem; min-height: 18px; color: var(--text-3);")}>// status: awaiting credentials</div>
          <button type="submit" id="submitBtn" className="post-btn" style={css("width: 100%; padding: 12px; font-size: 0.78rem;")}>VERIFY CREDENTIALS →</button>
        </form>
      </div>
    )}
  </section>

    </>
  );
}
