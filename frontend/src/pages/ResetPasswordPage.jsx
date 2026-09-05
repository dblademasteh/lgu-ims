import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../api/client';
import { useToast } from '../components/Toast';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const toast = useToast();

  useEffect(() => {
    if (!token) setError('Missing or invalid reset token.');
  }, [token]);

  const submit = async (e) => {
    e.preventDefault();
    if (password !== confirm) return setError('Passwords do not match.');
    setBusy(true);
    setError('');
    try {
      await api.post('/auth/reset-password', { token, newPassword: password });
      toast.success('Password reset. You may now sign in.');
      navigate('/login', { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to reset password. The link may have expired.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-dvh items-center justify-center bg-base-200 px-4 py-10">
      <div className="form-block w-full max-w-md overflow-hidden rounded-3xl border border-base-300 bg-base-100 shadow-2xl">
        <div className="box-header no-print px-8 pt-6">
          <strong>Official Block</strong>
          <span>Password Reset</span>
        </div>
        <div className="p-8 sm:p-10">
          <h2 className="text-2xl font-semibold tracking-tight">Reset your password</h2>
          <p className="mt-1.5 text-sm text-base-content/60">Choose a new password for your account.</p>

          {error && (
            <div role="alert" className="alert alert-error mt-6 py-2.5 text-sm">
              <span>{error}</span>
            </div>
          )}

          {token ? (
            <form onSubmit={submit} className="mt-6 flex flex-col gap-5" noValidate>
              <label className="block">
                <span className="mb-2 block font-mono text-[11px] uppercase tracking-[0.12em] text-base-content/60">New password</span>
                <span className="input flex h-12 items-center gap-3 py-0">
                  <input type="password" required minLength={8} className="h-12 w-full bg-transparent" placeholder="Min. 8 characters" value={password} onChange={(e) => setPassword(e.target.value)} />
                </span>
              </label>
              <label className="block">
                <span className="mb-2 block font-mono text-[11px] uppercase tracking-[0.12em] text-base-content/60">Confirm new password</span>
                <span className="input flex h-12 items-center gap-3 py-0">
                  <input type="password" required minLength={8} className="h-12 w-full bg-transparent" placeholder="Repeat password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
                </span>
              </label>
              <button type="submit" className="btn btn-primary h-12 mt-1" disabled={busy}>
                {busy ? <><span className="loading loading-spinner loading-sm" /> Resetting…</> : 'Reset password'}
              </button>
            </form>
          ) : (
            <p className="mt-6 text-sm text-base-content/60">
              This link is invalid or missing a token. Please request a new reset link from the sign-in screen.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
