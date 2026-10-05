import { CheckCircle2 } from 'lucide-react';
import { getServerSession } from '@/lib/serverSession';
import { getNeonAuthConfig } from '@/lib/auth';
import LoginClient from './LoginClient';

export const metadata = { title: 'login — kurzagin.log' };

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
} as const;

const labelStyle = {
  display: 'block',
  fontFamily: 'var(--mono)',
  fontSize: '0.65rem',
  color: 'var(--text-3)',
  marginBottom: '6px',
  letterSpacing: '1px',
} as const;

export default async function LoginPage() {
  const session = await getServerSession();
  const authenticated = session !== null;
  const { isConfigured } = getNeonAuthConfig();

  return (
    <>
      <div className="page-header">
        <h1><span className="hl">operator</span> login</h1>
        <div className="page-sub"><span className="jp-label">認証</span> — terminal credentials verification via neon auth</div>
      </div>

      <section className="section" style={{ maxWidth: '640px', margin: '0 auto', paddingTop: '60px' }}>
        {authenticated ? (
          <div className="bracket-card" style={{ padding: '32px', textAlign: 'center' }}>
            <div style={{ color: 'var(--accent)', marginBottom: '12px', display: 'flex', justifyContent: 'center' }}><CheckCircle2 size={36} /></div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: '0.95rem', color: 'var(--text-0)', marginBottom: '8px' }}>
              AUTHENTICATED
            </div>
            <p style={{ fontFamily: 'var(--sans)', fontSize: '0.85rem', color: 'var(--text-2)', marginBottom: '24px' }}>
              Active session verified as <strong style={{ color: 'var(--accent)' }}>@{session?.username || 'kurzagin'}</strong>. Curator privileges are unlocked.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <a href="/" className="post-btn" style={{ textDecoration: 'none', display: 'inline-block' }}>Return to Terminal →</a>
              <button id="logoutBtn" className="post-btn" style={{ background: 'var(--bg-2)', color: 'var(--text-2)', border: '1px solid var(--border)' }}>Logout</button>
            </div>
          </div>
        ) : (
          <div className="bracket-card" style={{ padding: '32px' }}>
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <div style={{ fontFamily: 'var(--mono)', fontSize: '0.65rem', color: 'var(--accent)', letterSpacing: '2px' }}>
                  // ACCESS CONTROL • NEON AUTH
                </div>
                {!isConfigured && (
                  <span style={{ fontFamily: 'var(--mono)', fontSize: '0.6rem', color: '#e5c07b', border: '1px solid #e5c07b44', padding: '2px 6px', borderRadius: '2px' }}>
                    CONFIG PENDING
                  </span>
                )}
              </div>
              <h2 style={{ fontFamily: 'var(--mono)', fontSize: '1.1rem', color: 'var(--text-0)', fontWeight: 400, margin: 0 }}>
                Enter Operator Passphrase
              </h2>
            </div>

            {!isConfigured && (
              <div style={{ background: 'rgba(229, 192, 123, 0.08)', borderLeft: '2px solid #e5c07b', padding: '10px 14px', marginBottom: '16px', fontFamily: 'var(--mono)', fontSize: '0.72rem', color: '#e5c07b', lineHeight: 1.5 }}>
                // Notice: Set <code>NEON_AUTH_BASE_URL</code> &amp; <code>NEON_AUTH_COOKIE_SECRET</code> in your environment variables to activate live Neon Auth handshaking.
              </div>
            )}

            <form id="loginForm" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label htmlFor="identifier" style={labelStyle}>
                  OPERATOR IDENTIFIER (EMAIL OR HANDLE)
                </label>
                <input
                  type="text"
                  id="identifier"
                  name="identifier"
                  placeholder="operator@kurzagin.com or kurzagin"
                  autoComplete="username email"
                  required
                  style={inputStyle}
                />
              </div>

              <div>
                <label htmlFor="password" style={labelStyle}>
                  SECURITY PASSPHRASE
                </label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  autoComplete="current-password"
                  required
                  autoFocus
                  placeholder="••••••••••••"
                  style={inputStyle}
                />
              </div>

              <div id="loginStatus" style={{ fontFamily: 'var(--mono)', fontSize: '0.7rem', minHeight: '18px', color: 'var(--text-3)' }}>
                // status: awaiting credentials
              </div>

              <button
                type="submit"
                id="submitBtn"
                className="post-btn"
                style={{ width: '100%', padding: '12px', marginTop: '8px', fontSize: '0.78rem' }}
              >
                VERIFY CREDENTIALS →
              </button>
            </form>
          </div>
        )}
      </section>

      <LoginClient />
    </>
  );
}
