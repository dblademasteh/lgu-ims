import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, ShieldCheck, CircleAlert, MailCheck, X, LockKeyhole, User, Package, ClipboardList, BarChart3, Landmark, KeyRound, ArrowRight } from 'lucide-react';
import api from '../api/client';
import { createPortal } from 'react-dom';
import { useToast } from '../components/Toast';
import useAuthStore from '../stores/authStore';

const DEMO_ACCOUNTS =
  import.meta.env.VITE_SHOW_DEMO_ACCOUNTS === 'true'
    ? [
        { u: 'admin', label: 'Administrator', role: 'Admin' },
        { u: 'warehouse', label: 'Warehouse Staff', role: 'Warehouse' },
        { u: 'custodian', label: 'Property Custodian', role: 'Custodian' },
        { u: 'auditor', label: 'Auditor', role: 'Auditor' },
      ]
    : [];

const FEATURES = [
  { icon: Package, title: 'Stock & Inventory', desc: 'Track items, SKUs, and reorder points in real time.' },
  { icon: ClipboardList, title: 'Requisitions (RIS)', desc: 'Request → approve → issue workflow with printable slips.' },
  { icon: BarChart3, title: 'COA-Compliant Reports', desc: 'RSMI, ledger cards, and summaries in PDF & Excel.' },
  { icon: ShieldCheck, title: 'Full Audit Trail', desc: 'Every action logged with user, timestamp, and changes.' },
];

export default function LoginPage() {
  return (
    <main className="gov-login">
      <div className="gov-login-shell">
        {/* Branding panel */}
        <aside className="gov-login-brand">
          <div className="gov-login-brand-inner">
            <div className="gov-login-seal">
              <ShieldCheck size={30} strokeWidth={1.5} />
            </div>
            <p className="gov-login-agency">Republic of the Philippines</p>
            <h1 className="gov-login-title">LGU Property &amp; Supply Office</h1>
            <p className="gov-login-subtitle">Inventory Management System</p>
            <div className="gov-login-divider" />
            <p className="gov-login-brand-desc">
              A secure, on-premise platform for managing government property,
              supplies, and inventory — built for transparency and accountability.
            </p>
            <ul className="gov-login-features">
              {FEATURES.map((f) => (
                <li key={f.title} className="gov-login-feature">
                  <span className="gov-login-feature-icon">
                    <f.icon size={15} strokeWidth={2} />
                  </span>
                  <span className="gov-login-feature-text">
                    <strong>{f.title}</strong>
                    <span>{f.desc}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <div className="gov-login-brand-foot">
            <Landmark size={12} />
            <span>On-premise · Secure · COA-compliant</span>
          </div>
        </aside>

        {/* Form panel */}
        <div className="gov-login-form-panel">
          <div className="gov-login-form-inner">
            <LoginForm />
          </div>
        </div>
      </div>
    </main>
  );
}

function LoginForm() {
  const navigate = useNavigate();
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
  const [forgotError, setForgotError] = useState('');
  const [forgotSent, setForgotSent] = useState(false);

  const openForgot = () => {
    setForgotOpen(true);
    setForgotUser('');
    setForgotBusy(false);
    setForgotMsg('');
    setForgotError('');
    setForgotSent(false);
  };
  const closeForgot = () => setForgotOpen(false);

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
      useAuthStore.getState().setSession({
        token: res.data.token,
        refreshToken: res.data.refreshToken,
        user: res.data.user,
      });
      toast.success(`Welcome, ${res.data.user.fullName}.`);
      navigate('/dashboard');
    } catch (err) {
      const msg = err?.response?.data?.message || 'Invalid username or password.';
      setError(msg);
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
      const res = await api.post('/auth/login/2fa', { tempToken, code });
      useAuthStore.getState().setSession({
        token: res.data.token,
        refreshToken: res.data.refreshToken,
        user: res.data.user,
      });
      toast.success(`Welcome, ${res.data.user.fullName}.`);
      navigate('/dashboard');
    } catch (err) {
      const msg = err?.response?.data?.message || 'Invalid verification code.';
      setError(msg);
    } finally {
      setBusy(false);
    }
  };

  const submitPasswordChange = async (e) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      const res = await api.post('/auth/accept-invite', {
        tempToken,
        password: newPassword,
        code,
      });
      useAuthStore.getState().setSession({
        token: res.data.token,
        refreshToken: res.data.refreshToken,
        user: res.data.user,
      });
      toast.success(`Welcome, ${res.data.user.fullName}.`);
      navigate('/dashboard');
    } catch (err) {
      setError(err?.response?.data?.message || 'Could not set password.');
    } finally {
      setBusy(false);
    }
  };

  const submitForgot = async (e) => {
    e.preventDefault();
    if (forgotBusy || !forgotUser.trim()) return;
    setForgotBusy(true);
    setForgotError('');
    try {
      const res = await api.post('/auth/forgot-password', {
        username: forgotUser,
      });
      const msg =
        res.data.message ||
        'If an account exists, a reset link has been sent to the registered email address.';
      setForgotMsg(msg);
      setForgotSent(true);
    } catch (err) {
      console.error(err);
      setForgotError(
        err?.response?.data?.message ||
          'Something went wrong. Please try again.'
      );
    } finally {
      setForgotBusy(false);
    }
  };

  if (step === 'password-change') {
    return (
      <>
        <form onSubmit={submitPasswordChange} className="gov-form" noValidate>
          <div className="gov-form-group">
            <label htmlFor="2fa-code" className="gov-label">Verification code</label>
            <div className="gov-field">
              <LockKeyhole size={17} className="gov-field-icon" />
              <input
                id="2fa-code"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                name="code"
                autoFocus
                placeholder="e.g. 482910"
                className="gov-input"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="gov-form-group">
            <label htmlFor="new-password" className="gov-label">New password</label>
            <div className="gov-input-wrap">
              <LockKeyhole size={17} className="gov-field-icon" />
              <input
                id="new-password"
                type={showPw ? 'text' : 'password'}
                autoComplete="new-password"
                name="password"
                required
                minLength={8}
                placeholder="Min. 8 characters"
                className="gov-input"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
              <button
                type="button"
                className="gov-toggle-pw"
                aria-label={showPw ? 'Hide password' : 'Show password'}
                onClick={() => setShowPw((s) => !s)}
              >
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {error && (
            <div className="gov-error">
              <CircleAlert size={14} />
              <span>{error}</span>
            </div>
          )}

          <button type="submit" className="gov-btn gov-btn-primary" disabled={busy}>
            {busy ? (
              <span className="loading" style={{ width: '1.125rem', height: '1.125rem', borderWidth: '2px' }} />
            ) : (
              'Set password'
            )}
          </button>
        </form>
        <div className="gov-form-alt">
          <button type="button" className="gov-link" onClick={() => setStep('credentials')}>
            Back to sign in
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="gov-login-welcome">
        <h2 className="gov-login-welcome-title">Welcome back</h2>
        <p className="gov-login-welcome-sub">Sign in to your account to continue.</p>
      </div>

      <form onSubmit={submit} className="gov-form">
        <div className="gov-form-group">
          <label htmlFor="username" className="gov-label">Username</label>
          <div className="gov-field">
            <User size={17} className="gov-field-icon" />
            <input
              id="username"
              type="text"
              autoComplete="off"
              name="username"
              autoFocus
              placeholder="Enter your username"
              className="gov-input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
        </div>

        <div className="gov-form-group">
          <label htmlFor="password" className="gov-label">Password</label>
          <div className="gov-input-wrap">
            <LockKeyhole size={17} className="gov-field-icon" />
            <input
              id="password"
              type={showPw ? 'text' : 'password'}
              autoComplete="current-password"
              name="password"
              required
              minLength={8}
              placeholder="Enter your password"
              className="gov-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              className="gov-toggle-pw"
              aria-label={showPw ? 'Hide password' : 'Show password'}
              onClick={() => setShowPw((s) => !s)}
            >
              {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        {error && (
          <div className="gov-error">
            <CircleAlert size={14} />
            <span>{error}</span>
          </div>
        )}

        <button type="submit" className="gov-btn gov-btn-primary" disabled={busy}>
          {busy ? (
            <span className="loading" style={{ width: '1.125rem', height: '1.125rem', borderWidth: '2px' }} />
          ) : (
            'Sign in'
          )}
        </button>
      </form>

      <div className="gov-form-alt">
        <button type="button" className="gov-link" onClick={openForgot}>
          Forgot password?
        </button>
      </div>

      {DEMO_ACCOUNTS.length > 0 && (
        <>
          <div className="gov-demo-divider">
            <span>Quick demo access</span>
          </div>
          <div className="gov-demo-grid">
            {DEMO_ACCOUNTS.map((a) => (
              <button
                key={a.u}
                type="button"
                className="gov-demo-btn"
                onClick={() => prefill(a.u)}
              >
                <span className="gov-demo-label">{a.label}</span>
                <span className="gov-demo-meta">{a.role} &middot; {a.u}</span>
              </button>
            ))}
          </div>
        </>
      )}

      {forgotOpen && (
        <ForgotPasswordModal
          user={forgotUser}
          setUser={setForgotUser}
          busy={forgotBusy}
          msg={forgotMsg}
          error={forgotError}
          sent={forgotSent}
          onSubmit={submitForgot}
          onClose={closeForgot}
        />
      )}
    </>
  );
}

function ForgotPasswordModal({
  user,
  setUser,
  busy,
  msg,
  error,
  sent,
  onSubmit,
  onClose,
}) {
  return (
    <Portal>
      <div
        className="modal-backdrop"
        role="dialog"
        aria-modal="true"
        aria-label="Reset password"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div className="gov-modal">
          <button className="gov-modal-close" onClick={onClose} aria-label="Close">
            <X size={16} />
          </button>

          {!sent ? (
            <div className="gov-modal-inner">
              <div className="gov-modal-icon gov-modal-icon--info">
                <KeyRound size={22} strokeWidth={1.8} />
              </div>
              <h3 className="gov-modal-title">Reset your password</h3>
              <p className="gov-modal-desc">
                Enter your username or email and we&apos;ll send a secure
                reset link to the registered address.
              </p>

              <form onSubmit={onSubmit} className="gov-form" style={{ marginTop: '0.25rem' }}>
                <div className="gov-form-group">
                  <label htmlFor="forgot-user" className="gov-label">
                    Username or email
                  </label>
                  <div className="gov-field">
                    <User size={17} className="gov-field-icon" />
                    <input
                      id="forgot-user"
                      type="text"
                      required
                      autoComplete="off"
                      name="forgot-user"
                      autoFocus
                      placeholder="Enter username or email"
                      className="gov-input"
                      value={user}
                      onChange={(e) => setUser(e.target.value)}
                    />
                  </div>
                </div>

                {error && (
                  <div className="gov-error">
                    <CircleAlert size={14} />
                    <span>{error}</span>
                  </div>
                )}

                <div className="gov-modal-actions">
                  <button type="button" className="gov-btn gov-btn-ghost" onClick={onClose}>
                    Cancel
                  </button>
                  <button type="submit" className="gov-btn gov-btn-primary" disabled={busy}>
                    {busy ? (
                      <span className="loading" style={{ width: '1.125rem', height: '1.125rem', borderWidth: '2px' }} />
                    ) : (
                      <>
                        Send reset link
                        <ArrowRight size={15} />
                      </>
                    )}
                  </button>
                </div>
              </form>

              <div className="gov-modal-back">
                <button type="button" className="gov-link" onClick={onClose}>
                  Back to sign in
                </button>
              </div>
            </div>
          ) : (
            <div className="gov-modal-inner">
              <div className="gov-modal-icon gov-modal-icon--success">
                <MailCheck size={24} strokeWidth={1.8} />
              </div>
              <h3 className="gov-modal-title">Check your inbox</h3>
              <p className="gov-modal-desc">{msg}</p>

              <div className="gov-modal-success-card">
                <p className="gov-modal-success-title">Next steps</p>
                <ol className="gov-modal-steps">
                  <li>Open the reset email in your inbox</li>
                  <li>Click the secure link provided</li>
                  <li>Set a new strong password</li>
                </ol>
              </div>

              <button type="button" className="gov-btn gov-btn-primary" onClick={onClose} style={{ marginTop: '0.25rem' }}>
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </Portal>
  );
}

function Portal({ children }) {
  return createPortal(children, document.body);
}
