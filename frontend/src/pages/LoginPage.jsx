import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Landmark, User, Lock, Eye, EyeOff, LogIn, CircleAlert, ShieldCheck, KeyRound } from 'lucide-react';
import api from '../api/client';
import useAuthStore from '../stores/authStore';
import { useToast } from '../components/Toast';

const DEMO_ROLES = [
  { u: 'admin', label: 'Administrator' },
  { u: 'warehouse', label: 'Warehouse Staff' },
  { u: 'custodian', label: 'Property Custodian' },
  { u: 'auditor', label: 'Auditor' },
  { u: 'cho.head', label: 'Department Head' },
  { u: 'eo.head', label: 'Engineering Head' },
];

const NOTES = [
  'On-premises — data stays inside the LGU network.',
  'Role-based access — warehouse, custodian, auditor, heads.',
  'Audit trail and reports — full accountability.',
];

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotUser, setForgotUser] = useState('');
  const [forgotBusy, setForgotBusy] = useState(false);
  const [forgotMsg, setForgotMsg] = useState('');
  const navigate = useNavigate();
  const setSession = useAuthStore((s) => s.setSession);
  const toast = useToast();

  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      const res = await api.post('/auth/login', { username, password });
      setSession(res.data);
      toast.success(`Welcome back, ${res.data.user.fullName}.`);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to sign in. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const prefill = (u) => {
    setUsername(u);
    setPassword('Password123!');
    setError('');
  };

  const submitForgot = async (e) => {
    e.preventDefault();
    setForgotBusy(true);
    setForgotMsg('');
    try {
      await api.post('/auth/forgot-password', { username: forgotUser });
      setForgotMsg('If an account matches, a reset link has been sent.');
      setForgotUser('');
    } catch (err) {
      setForgotMsg(err.response?.data?.message || 'Unable to process request.');
    } finally {
      setForgotBusy(false);
    }
  };

  return (
    <main className="flex min-h-dvh items-center justify-center bg-base-200 px-4 py-10">
      <div className="form-block w-full max-w-4xl overflow-hidden rounded-3xl border border-base-300 bg-base-100 shadow-2xl">
        <div className="box-header no-print px-8 pt-6">
          <strong>Official Block</strong>
          <span>Account Access Record</span>
          <span className="ml-auto">On-premises · v1.0</span>
        </div>
        <div className="grid lg:grid-cols-2">
        <section className="hidden flex-col justify-between border-r border-base-300 bg-base-200/60 p-10 lg:flex">
          <div>
            <div className="grid h-14 w-14 place-items-center rounded-2xl bg-primary text-primary-content shadow-lg shadow-primary/20">
              <Landmark className="h-7 w-7" strokeWidth={1.8} />
            </div>
            <h1 className="mt-6 text-3xl font-bold tracking-tight">
              LGU Inventory
              <br />
              Management
            </h1>
            <p className="mt-2 text-sm text-base-content/60">Property &amp; Supply Office</p>
          </div>

          <ul className="mb-12 mt-12 flex flex-col gap-4 text-sm text-base-content/75">
            {NOTES.map((n) => (
              <li key={n} className="flex items-start gap-3">
                <span aria-hidden="true" className="mt-[9px] h-px w-6 shrink-0 bg-primary" />
                <span className="leading-relaxed">{n}</span>
              </li>
            ))}
          </ul>

          <p className="text-xs text-base-content/45">Property &amp; Supply Office · v1.0</p>
        </section>

        <section className="p-8 sm:p-10">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-primary text-primary-content shadow-md shadow-primary/20">
              <Landmark className="h-6 w-6" strokeWidth={1.8} />
            </span>
            <span>
              <span className="block text-base font-bold leading-tight">LGU Inventory Management</span>
              <span className="block text-xs text-base-content/60">Property &amp; Supply Office</span>
            </span>
          </div>

          <div className="hidden lg:block">
            <h2 className="text-2xl font-semibold tracking-tight text-base-content">Sign in</h2>
            <p className="mt-1.5 text-sm text-base-content/60">Use your assigned system credentials.</p>
          </div>

          {error && (
            <div role="alert" className="alert alert-error mt-6 py-2.5 text-sm">
              <CircleAlert className="h-5 w-5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={submit} className="mt-6 flex flex-col gap-5" noValidate>
            <label htmlFor="lgu-username" className="block">
              <span className="mb-2 block font-mono text-[11px] uppercase tracking-[0.12em] text-base-content/60">Username</span>
              <span className="input flex h-12 items-center gap-3 py-0 transition-[border-color,box-shadow] duration-200 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/25">
                <User className="h-4 w-4 shrink-0 opacity-50" />
                <input
                  id="lgu-username"
                  type="text"
                  required
                  autoComplete="username"
                  autoFocus
                  placeholder="e.g. admin"
                  className="h-12 w-full bg-transparent text-base"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </span>
            </label>

            <label htmlFor="lgu-password" className="block">
              <span className="mb-2 block font-mono text-[11px] uppercase tracking-[0.12em] text-base-content/60">Password</span>
              <span className="input flex h-12 items-center gap-3 py-0 transition-[border-color,box-shadow] duration-200 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/25">
                <Lock className="h-4 w-4 shrink-0 opacity-50" />
                <input
                  id="lgu-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="h-12 w-full bg-transparent text-base"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="btn btn-ghost btn-circle btn-sm opacity-60 hover:opacity-100"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </span>
            </label>

            <button type="submit" className="btn btn-primary h-12 mt-1" disabled={busy}>
              {busy ? (
                <>
                  <span className="loading loading-spinner loading-sm" />
                  Signing in…
                </>
              ) : (
                <>
                  <LogIn className="h-5 w-5" />
                  Sign in
                </>
              )}
            </button>
            <div className="text-right">
              <button type="button" className="link link-primary text-xs" onClick={() => setForgotOpen(true)}>Forgot password?</button>
            </div>
          </form>

          <div className="divider mt-7 text-xs font-medium text-base-content/45">Demo accounts</div>
          <div className="grid grid-cols-2 gap-2">
            {DEMO_ROLES.map((r) => (
              <button
                key={r.u}
                type="button"
                onClick={() => prefill(r.u)}
                className="btn btn-outline btn-sm justify-start gap-2 px-3"
              >
                <span className="font-mono text-xs">{r.u}</span>
                <span className="ml-auto hidden truncate text-[11px] opacity-60 sm:block">{r.label}</span>
              </button>
            ))}
          </div>

          <p className="mt-6 flex items-center justify-center gap-1.5 text-xs text-base-content/45">
            <ShieldCheck className="h-4 w-4" />
            Credentials are issued by the system administrator
          </p>
        </section>
        </div>
      </div>

      {forgotOpen && (
        <dialog className="modal modal-open">
          <div className="modal-box max-w-md">
            <h3 className="font-bold text-lg">Reset password</h3>
            <p className="text-sm text-base-content/60 mt-1">Enter your username or email and we will send a reset link if the account exists.</p>
            <form onSubmit={submitForgot} className="mt-4 flex flex-col gap-4">
              <label className="block">
                <span className="mb-2 block font-mono text-[11px] uppercase tracking-[0.12em] text-base-content/60">Username or email</span>
                <span className="input flex h-12 items-center gap-3 py-0">
                  <User className="h-4 w-4 shrink-0 opacity-50" />
                  <input className="h-12 w-full bg-transparent" required value={forgotUser} onChange={(e) => setForgotUser(e.target.value)} placeholder="e.g. admin" />
                </span>
              </label>
              {forgotMsg && <div className="alert alert-info py-2 text-sm"><span>{forgotMsg}</span></div>}
              <div className="modal-action">
                <button type="button" className="btn" onClick={() => { setForgotOpen(false); setForgotMsg(''); }}>Close</button>
                <button type="submit" className="btn btn-primary" disabled={forgotBusy}>
                  {forgotBusy ? <><span className="loading loading-spinner loading-sm" /> Sending…</> : 'Send reset link'}
                </button>
              </div>
            </form>
          </div>
          <form method="dialog" className="modal-backdrop"><button onClick={() => setForgotOpen(false)}>close</button></form>
        </dialog>
      )}
    </main>
  );
}