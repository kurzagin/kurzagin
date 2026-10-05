'use client';

import { useEffect } from 'react';

export default function LoginClient() {
  useEffect(() => {
    const form = document.getElementById('loginForm') as HTMLFormElement | null;
    const statusEl = document.getElementById('loginStatus') as HTMLElement | null;
    const submitBtn = document.getElementById('submitBtn') as HTMLButtonElement | null;
    const logoutBtn = document.getElementById('logoutBtn');
    let redirectTimer: ReturnType<typeof setTimeout> | undefined;

    const onLogout = async () => {
      try {
        await fetch('/api/auth/logout', { method: 'POST' });
        window.location.reload();
      } catch {
        alert('Failed to log out');
      }
    };
    logoutBtn?.addEventListener('click', onLogout);

    const onSubmit = async (e: Event) => {
      e.preventDefault();
      if (!form || !statusEl || !submitBtn) return;
      const identifier = (form.elements.namedItem('identifier') as HTMLInputElement).value.trim();
      const password = (form.elements.namedItem('password') as HTMLInputElement).value;

      if (!password) return;

      submitBtn.disabled = true;
      submitBtn.style.opacity = '0.6';
      statusEl.style.color = 'var(--accent)';
      statusEl.textContent = '// status: handshaking with neon auth...';

      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ identifier, password }),
        });

        const data = await res.json();

        if (res.ok && data.success) {
          statusEl.style.color = '#7bc67a';
          statusEl.textContent = '// status: neon handshake verified. redirecting...';
          redirectTimer = setTimeout(() => {
            window.location.href = '/';
          }, 500);
        } else {
          statusEl.style.color = '#e06c75';
          statusEl.textContent = `// status: error — ${data.error || 'access denied'}`;
          submitBtn.disabled = false;
          submitBtn.style.opacity = '1';
        }
      } catch {
        statusEl.style.color = '#e06c75';
        statusEl.textContent = '// status: network error during handshake';
        submitBtn.disabled = false;
        submitBtn.style.opacity = '1';
      }
    };
    form?.addEventListener('submit', onSubmit);

    return () => {
      logoutBtn?.removeEventListener('click', onLogout);
      form?.removeEventListener('submit', onSubmit);
      if (redirectTimer) clearTimeout(redirectTimer);
    };
  }, []);

  return null;
}
