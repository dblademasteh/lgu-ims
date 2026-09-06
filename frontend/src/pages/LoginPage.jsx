import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, ShieldCheck, LogIn, ArrowLeft, Landmark, CircleAlert } from 'lucide-react';
import api from '../api/client';
import useAuthStore from '../stores/authStore';
import { useToast } from '../components/Toast';

const DEMO_ACCOUNTS = [
  { u: 'admin', label: 'Administrator', role: 'Admin' },
  { u: 'warehouse', label: 'Warehouse Staff', role: 'Warehouse' },
  { u: 'custodian', label: 'Property Custodian', role: 'Custodian' },
  { u: 'auditor', label: 'Auditor', role: 'Auditor' },
];

const SYSTEM_NOTES = [
  'On-premises — all data remains within the LGU network.',
  'All actions are logged with user identity and timestamp.',
  'Access is restricted to authorized personnel only.',
];

export default function LoginPage() {
  return (
    <main style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface2)' }}>
      <div style={{ width: '100%', maxWidth: '28rem', padding: '3rem 1rem' }}>
        <Header />
        <LoginForm />
      </div>
    </main>
  );
}

function Header() {
  return (
    <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
      <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '4rem', height: '4rem', borderRadius: '9999px', marginBottom: '1.25rem', background: 'var(--ink)' }}>
        <Landmark size={28} strokeWidth={1.5} style={{ color: 'var(--on-ink)' }} />
      </div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6875rem', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: '0.5rem', color: 'var(--lgu-accent)' }}>Republic of the Philippines</div>
      <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 'var(--fs-xl)', fontWeight: 700, lineHeight: 1.2, color: 'var(--ink)' }}>
        Local Government Unit
      </h1>
      <p style={{ fontSize: '0.875rem', marginTop: '0.25rem', color: 'color-mix(in oklab, var(--ink) 55%, transparent)' }}>Property &amp; Supply Management System</p>
      <div style={{ marginTop: '1.25rem', height: '2px', width: '6rem', marginLeft: 'auto', marginRight: 'auto', background: 'var(--lgu-accent)', borderRadius: '2px' }} />
    </div>
  );
}

function LoginForm() {
  const navigate = useNavigate();
  const setSession = useAuthStore((s) => s.setSession);
  const toast = useToast();

  const [step, setStep] = useState('credentials');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const [tempToken, setTempToken] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotUser, setForgotUser] = useState('');
  const [forgotBusy, setForgotBusy] = useState(false);
  const [forgotMsg, setForgotMsg] = useState('');

  const prefill = (u) => {
    setUsername(u);
    setPassword('LguIms2026!');
    setError('');
  };

  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      const res = await api.post('/auth/login', { username, password });
      if (res.data.requiresPasswordChange) {
        setTempToken(res.data.tempToken);
        setStep('password-change');
        return;
      }
      if (res.data.requires2FA) {
        setTempToken(res.data.tempToken);
        setStep('2fa');
        return;
      }
      setSession(res.data);
      toast.success(`Welcome, ${res.data.user.fullName}.`);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      const data = err.response?.data;
      if (data?.details?.unlockVia === 'forgot-password') {
        setError(data.message || 'Account is locked. Use the forgot-password flow to unlock it.');
        setForgotOpen(true);
      } else {
        setError(data?.message || 'Sign in failed. Check your credentials.');
      }
    } finally {
      setBusy(false);
    }
  };

  const submitPasswordChange = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api.post('/auth/change-password', { newPassword }, {
        headers: { Authorization: `Bearer ${tempToken}` },
      });
      toast.success('Password updated. Sign in with your new password.');
      setStep('credentials');
      setPassword('');
      setNewPassword('');
      setTempToken('');
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to update password.');
    } finally {
      setBusy(false);
    }
  };

  const submit2FA = async (e) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      const res = await api.post('/auth/2fa/login', { tempToken, code });
      setSession(res.data);
      toast.success(`Welcome, ${res.data.user.fullName}.`);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid code. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const submitForgot = async (e) => {
    e.preventDefault();
    setForgotBusy(true);
    setForgotMsg('');
    try {
      await api.post('/auth/forgot-password', { username: forgotUser });
      setForgotMsg('If an account matches, a reset link will be sent to the registered email.');
    } catch (err) {
      setForgotMsg(err.response?.data?.message || 'Unable to process request.');
    } finally {
      setForgotBusy(false);
    }
  };

  return (
    <>
      <div className="card" style={{ overflow: 'hidden' }}>
        <div style={{ padding: '1.25rem 2rem', borderBottom: '1.5px solid var(--line)' }}>
          <p className="lbl">
            {step === 'credentials' ? 'Registered User Access' :
             step === '2fa' ? 'Two-Factor Verification' :
             'Password Update Required'}
          </p>
        </div>

        <div style={{ padding: '1.5rem 2rem' }}>
          {error && (
            <div className="alert alert-error" style={{ marginBottom: '1.25rem' }}>
              <CircleAlert size={16} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          {step === 'credentials' && (
            <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }} noValidate>
              <Field label="Username" id="lgu-username">
                <input
                  id="lgu-username"
                  type="text"
                  required
                  autoComplete="username"
                  autoFocus
                  placeholder="Enter username"
                  className="form-input"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </Field>

              <Field label="Password" id="lgu-password">
                <div style={{ position: 'relative' }}>
                  <input
                    id="lgu-password"
                    type={showPw ? 'text' : 'password'}
                    required
                    autoComplete="current-password"
                    placeholder="Enter password"
                    className="form-input"
                    style={{ paddingRight: '2.75rem' }}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((s) => !s)}
                    style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink)', padding: '0.25rem', display: 'grid', placeItems: 'center', borderRadius: '4px', transition: 'opacity 140ms' }}
                    aria-label={showPw ? 'Hide password' : 'Show password'}
                  >
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </Field>

              <button type="submit" className="btn btn-primary w-full" disabled={busy} style={{ marginTop: '0.25rem' }}>
                {busy ? (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span className="loading loading-spinner loading-xs" />
                    Signing in…
                  </span>
                ) : (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <LogIn size={16} />
                    Sign in
                  </span>
                )}
              </button>

              <div style={{ textAlign: 'right' }}>
                <button type="button" style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8125rem', color: 'var(--lgu-accent)', textDecoration: 'underline', textDecorationColor: 'transparent', transition: 'text-decoration-color 140ms', padding: 0 }}
                  onClick={() => setForgotOpen(true)}
                  onMouseEnter={e => e.currentTarget.style.textDecorationColor = 'var(--lgu-accent)'}
                  onMouseLeave={e => e.currentTarget.style.textDecorationColor = 'transparent'}>
                  Forgot password?
                </button>
              </div>
            </form>
          )}

          {step === '2fa' && (
            <form onSubmit={submit2FA} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }} noValidate>
              <p style={{ fontSize: '0.9375rem', lineHeight: 1.6, color: 'color-mix(in oklab, var(--ink) 60%, transparent)' }}>
                Enter the 6-digit code from your authenticator app.
              </p>
              <Field label="Verification code" id="lgu-2fa-code">
                <input
                  id="lgu-2fa-code"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  required
                  autoFocus
                  placeholder="000000"
                  className="form-input"
                  style={{ textAlign: 'center', fontSize: '1.25rem', letterSpacing: '0.35em', fontFamily: 'var(--font-mono)' }}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                />
              </Field>
              <button type="submit" className="btn btn-primary w-full" disabled={busy || code.length < 6}>
                {busy ? <span className="loading loading-spinner loading-xs" /> : 'Verify and sign in'}
              </button>
              <button type="button" className="btn w-full" style={{ fontSize: '0.8125rem', color: 'var(--lgu-accent)' }}
                onClick={() => { setStep('credentials'); setCode(''); setTempToken(''); }}>
                ← Back to sign in
              </button>
            </form>
          )}

          {step === 'password-change' && (
            <form onSubmit={submitPasswordChange} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }} noValidate>
              <p style={{ fontSize: '0.9375rem', lineHeight: 1.6, color: 'color-mix(in oklab, var(--ink) 60%, transparent)' }}>
                Your password has expired. Choose a new password to continue.
              </p>
              <Field label="New password" id="new-pw">
                <input
                  id="new-pw"
                  type="password"
                  required
                  minLength={8}
                  autoFocus
                  placeholder="Minimum 8 characters"
                  className="form-input"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </Field>
              <button type="submit" className="btn btn-primary w-full" disabled={busy}>
                {busy ? <span className="loading loading-spinner loading-xs" /> : 'Update and sign in'}
              </button>
              <button type="button" className="btn w-full" style={{ fontSize: '0.8125rem', color: 'var(--lgu-accent)' }}
                onClick={() => { setStep('credentials'); setNewPassword(''); }}>
                ← Back to sign in
              </button>
            </form>
          )}
        </div>

        {step === 'credentials' && (
          <>
            {import.meta.env.VITE_SHOW_DEMO_ACCOUNTS === 'true' && (
              <div style={{ padding: '0 2rem 1.5rem' }}>
                <div style={{ borderTop: '1.5px solid var(--line)', paddingTop: '1.25rem' }}>
                  <p className="lbl" style={{ marginBottom: '0.75rem' }}>Demo access</p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                    {DEMO_ACCOUNTS.map((a) => (
                      <button key={a.u} type="button" onClick={() => prefill(a.u)}
                        style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', padding: '0.625rem', borderRadius: '8px', border: '1.5px solid var(--line)', background: 'var(--surface)', cursor: 'pointer', transition: 'border-color 140ms, background 140ms', textAlign: 'left' }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--ink)'; e.currentTarget.style.background = 'color-mix(in oklab, var(--ink) 4%, var(--surface))'; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--line)'; e.currentTarget.style.background = 'var(--surface)'; }}>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', fontWeight: 600, color: 'var(--ink)' }}>{a.u}</span>
                        <span style={{ fontSize: '0.6875rem', marginTop: '0.125rem', color: 'color-mix(in oklab, var(--ink) 50%, transparent)' }}>{a.role}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {SYSTEM_NOTES.map((n) => (
          <div key={n} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.625rem' }}>
            <ShieldCheck size={14} style={{ color: 'var(--lgu-accent)', marginTop: '2px', flexShrink: 0 }} />
            <span style={{ fontSize: '0.8125rem', lineHeight: 1.6, color: 'color-mix(in oklab, var(--ink) 50%, transparent)' }}>{n}</span>
          </div>
        ))}
      </div>

      {forgotOpen && (
        <dialog className="modal modal-open" aria-label="Reset password">
          <div className="modal-box" style={{ maxWidth: '24rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
              <button onClick={() => setForgotOpen(false)} className="btn btn-ghost btn-sm btn-square -ml-2" aria-label="Go back">
                <ArrowLeft size={16} />
              </button>
              <h3 style={{ fontWeight: 600, fontSize: '1rem' }}>Reset password</h3>
            </div>
            <p style={{ fontSize: '0.9375rem', marginTop: '0.25rem', marginBottom: '1rem', color: 'color-mix(in oklab, var(--ink) 60%, transparent)' }}>
              Enter your username. If an account exists, a reset link will be sent to the registered email.
            </p>
            <form onSubmit={submitForgot} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <Field label="Username or email" id="forgot-user">
                <input
                  id="forgot-user"
                  type="text"
                  required
                  autoFocus
                  placeholder="e.g. admin"
                  className="form-input"
                  value={forgotUser}
                  onChange={(e) => setForgotUser(e.target.value)}
                />
              </Field>
              {forgotMsg && (
                <div className="alert alert-info">
                  <span>{forgotMsg}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', paddingTop: '0.25rem' }}>
                <button type="button" className="btn btn-sm" onClick={() => setForgotOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-sm btn-primary" disabled={forgotBusy}>
                  {forgotBusy ? <><span className="loading loading-spinner loading-xs" /> Sending…</> : 'Send reset link'}
                </button>
              </div>
            </form>
          </div>
          <form method="dialog" className="modal-backdrop"><button aria-label="Close dialog" onClick={() => setForgotOpen(false)}>close</button></form>
        </dialog>
      )}
    </>
  );
}

function Field({ label, id, children }) {
  return (
    <div>
      <label htmlFor={id} className="login-label">
        {label}
      </label>
      {children}
    </div>
  );
}
