import { useEffect, useState } from 'react';
import api from '../api/client';
import useAuthStore from '../stores/authStore';
import { useToast } from '../components/Toast';
import PageHeader, { Spinner } from '../components/ui';

const ROLE_LABELS = {
  ADMIN: 'Administrator',
  WAREHOUSE_STAFF: 'Warehouse Staff',
  PROPERTY_CUSTODIAN: 'Property Custodian',
  AUDITOR: 'Auditor',
  DEPARTMENT_HEAD: 'Department Head',
};

export default function ProfilePage() {
  const toast = useToast();
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState('profile');

  const [form, setForm] = useState({ fullName: '', email: '' });
  const [deptId, setDeptId] = useState('');
  const [departments, setDepartments] = useState([]);

  const [pwForm, setPwForm] = useState({ current: '', newPw: '', confirm: '' });
  const [pwSaving, setPwSaving] = useState(false);

  const [twoFaEnabled, setTwoFaEnabled] = useState(false);
  const [twoFaSetup, setTwoFaSetup] = useState(false);
  const [qr, setQr] = useState('');
  const [secret, setSecret] = useState('');
  const [verifyCode, setVerifyCode] = useState('');
  const [twoFaBusy, setTwoFaBusy] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get('/users/me'),
      api.get('/departments'),
    ]).then(([profRes, deptRes]) => {
      const u = profRes.data.data;
      setProfile(u);
      setForm({ fullName: u.fullName || '', email: u.email || '' });
      setDeptId(u.departmentId || '');
      setTwoFaEnabled(u.twoFactorEnabled || false);
      setDepartments(deptRes.data.data || []);
    }).catch(() => {
      toast.error('Unable to load profile.');
    }).finally(() => setLoading(false));
  }, []);

  const saveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api.patch('/users/me', { fullName: form.fullName, email: form.email, departmentId: deptId || null });
      setProfile(res.data.data);
      setUser(res.data.data);
      toast.success('Profile updated.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Unable to update profile.');
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async (e) => {
    e.preventDefault();
    if (pwForm.newPw !== pwForm.confirm) {
      toast.error('New passwords do not match.');
      return;
    }
    if (pwForm.newPw.length < 8) {
      toast.error('Password must be at least 8 characters.');
      return;
    }
    setPwSaving(true);
    try {
      await api.post('/auth/change-password', { currentPassword: pwForm.current, newPassword: pwForm.newPw });
      setPwForm({ current: '', newPw: '', confirm: '' });
      toast.success('Password changed successfully.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Unable to change password.');
    } finally {
      setPwSaving(false);
    }
  };

  const start2FASetup = async () => {
    setTwoFaBusy(true);
    try {
      const res = await api.post('/auth/2fa/setup');
      setSecret(res.data.secret);
      setQr(res.data.dataUrl);
      setTwoFaSetup(true);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Unable to start 2FA setup.');
    } finally {
      setTwoFaBusy(false);
    }
  };

  const enable2FA = async (e) => {
    e.preventDefault();
    setTwoFaBusy(true);
    try {
      await api.post('/auth/2fa/enable', { code: verifyCode });
      setTwoFaEnabled(true);
      setTwoFaSetup(false);
      setVerifyCode('');
      toast.success('Two-factor authentication enabled.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid code. Please try again.');
    } finally {
      setTwoFaBusy(false);
    }
  };

  const [disable2FaOpen, setDisable2FaOpen] = useState(false);
  const [disableCode, setDisableCode] = useState('');

  const disable2FA = async (e) => {
    e.preventDefault();
    if (!disableCode || disableCode.length < 6) return;
    setTwoFaBusy(true);
    try {
      await api.post('/auth/2fa/disable', { code: disableCode });
      setTwoFaEnabled(false);
      setDisable2FaOpen(false);
      setDisableCode('');
      toast.success('Two-factor authentication disabled.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Unable to disable 2FA.');
    } finally {
      setTwoFaBusy(false);
    }
  };

  if (loading) return <Spinner label="Loading profile..." />;

  return (
    <div>
      <PageHeader
        title="My Profile"
        subtitle="Manage your account information and security settings."
      />

      <div className="flex gap-6">
        <div className="w-56 shrink-0">
          <div className="card bg-base-100 shadow-sm">
            <div className="card-body p-4 items-center text-center">
              <div className="avatar placeholder">
                <div className="bg-primary text-primary-content rounded-full w-16">
                  <span className="text-xl font-bold">{profile?.fullName?.[0]?.toUpperCase() || profile?.username?.[0]?.toUpperCase() || '?'}</span>
                </div>
              </div>
              <div className="mt-3">
                <div className="font-semibold text-sm">{profile?.fullName || profile?.username}</div>
                <div className="text-xs text-base-content/60">@{profile?.username}</div>
                <span className="badge badge-ghost badge-sm mt-2">{ROLE_LABELS[profile?.role] || profile?.role}</span>
              </div>
              <div className="mt-4 w-full text-left text-xs space-y-1">
                {profile?.department && (
                  <div className="text-base-content/60">
                    <span className="opacity-60">Dept:</span> {profile.department.name}
                  </div>
                )}
                <div className="text-base-content/60">
                  <span className="opacity-60">Joined:</span> {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString() : '—'}
                </div>
                {profile?.lastLoginAt && (
                  <div className="text-base-content/60">
                    <span className="opacity-60">Last login:</span> {new Date(profile.lastLoginAt).toLocaleString()}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1">
          <div role="tablist" className="tabs tabs-box w-fit mb-4">
            <button role="tab" aria-selected={tab === 'profile'} className={`tab ${tab === 'profile' ? 'tab-active' : ''}`} onClick={() => setTab('profile')}>Profile</button>
            <button role="tab" aria-selected={tab === 'security'} className={`tab ${tab === 'security' ? 'tab-active' : ''}`} onClick={() => setTab('security')}>Security</button>
          </div>

          {tab === 'profile' && (
            <div className="card bg-base-100 shadow-sm">
              <div className="card-body">
                <h3 className="font-semibold mb-4">Profile Information</h3>
                <form onSubmit={saveProfile} className="space-y-4 max-w-lg">
                  <fieldset className="fieldset">
                    <legend className="fieldset-legend">Username</legend>
                    <input className="input" value={profile?.username || ''} disabled />
                  </fieldset>
                  <fieldset className="fieldset">
                    <legend className="fieldset-legend">Full Name *</legend>
                    <input className="input" required value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} placeholder="Enter your full name" />
                  </fieldset>
                  <fieldset className="fieldset">
                    <legend className="fieldset-legend">Email Address *</legend>
                    <input className="input" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@lgu.gov.ph" />
                  </fieldset>
                  <fieldset className="fieldset">
                    <legend className="fieldset-legend">Department</legend>
                    <select className="select" value={deptId} onChange={(e) => setDeptId(e.target.value)}>
                      <option value="">— No department —</option>
                      {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                  </fieldset>
                  <div>
                    <span className="text-xs text-base-content/60">Role: </span>
                    <span className="badge badge-ghost badge-sm">{ROLE_LABELS[profile?.role] || profile?.role}</span>
                    <span className="text-xs text-base-content/40 ml-1">(contact admin to change)</span>
                  </div>
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    {saving && <span className="loading loading-spinner loading-xs" />}
                    Save changes
                  </button>
                </form>
              </div>
            </div>
          )}

          {tab === 'security' && (
            <div className="space-y-4">
              <div className="card bg-base-100 shadow-sm">
                <div className="card-body">
                  <h3 className="font-semibold mb-4">Change Password</h3>
                  <form onSubmit={changePassword} className="space-y-4 max-w-md">
                    <fieldset className="fieldset">
                      <legend className="fieldset-legend">Current Password</legend>
                      <input className="input" type="password" required value={pwForm.current} onChange={(e) => setPwForm({ ...pwForm, current: e.target.value })} />
                    </fieldset>
                    <fieldset className="fieldset">
                      <legend className="fieldset-legend">New Password</legend>
                      <input className="input" type="password" required minLength={8} value={pwForm.newPw} onChange={(e) => setPwForm({ ...pwForm, newPw: e.target.value })} />
                      <p className="text-xs text-base-content/40 mt-1">Minimum 8 characters. Must not match any of your last {5} passwords.</p>
                    </fieldset>
                    <fieldset className="fieldset">
                      <legend className="fieldset-legend">Confirm New Password</legend>
                      <input className="input" type="password" required value={pwForm.confirm} onChange={(e) => setPwForm({ ...pwForm, confirm: e.target.value })} />
                    </fieldset>
                    <button type="submit" className="btn btn-primary" disabled={pwSaving}>
                      {pwSaving && <span className="loading loading-spinner loading-xs" />}
                      Change Password
                    </button>
                  </form>
                </div>
              </div>

              <div className="card bg-base-100 shadow-sm">
                <div className="card-body">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold">Two-Factor Authentication</h3>
                      <p className="text-sm text-base-content/60 mt-1">
                        {twoFaEnabled
                          ? 'Your account is protected with an authenticator app.'
                          : 'Add an extra layer of security with an authenticator app.'}
                      </p>
                    </div>
                    {twoFaEnabled ? (
                      <button className="btn btn-outline btn-sm" onClick={() => setDisable2FaOpen(true)} disabled={twoFaBusy}>
                        {twoFaBusy ? <span className="loading loading-spinner loading-xs" /> : null}
                        Disable 2FA
                      </button>
                    ) : (
                      <button className="btn btn-primary btn-sm" onClick={start2FASetup} disabled={twoFaBusy}>
                        {twoFaBusy ? <span className="loading loading-spinner loading-xs" /> : null}
                        Enable 2FA
                      </button>
                    )}
                  </div>

                  {twoFaSetup && (
                    <div className="mt-6 border-t border-base-200 pt-6">
                      <h4 className="font-medium text-sm mb-3">Set up authenticator app</h4>
                      <p className="text-xs text-base-content/60 mb-4">Scan the QR code below with your authenticator app (Google Authenticator, Authy, etc.).</p>
                      {qr && <img src={qr} alt="2FA QR" className="w-48 h-48 bg-white p-2 rounded border" />}
                      <div className="mt-3 text-xs text-base-content/60">
                        Or enter this secret manually: <span className="font-mono font-semibold">{secret}</span>
                      </div>
                      <form onSubmit={enable2FA} className="mt-4 flex items-end gap-3 max-w-xs">
                        <fieldset className="fieldset flex-1">
                          <legend className="fieldset-legend">Verification Code</legend>
                          <input
                            className="input font-mono text-center text-lg tracking-widest"
                            required maxLength={6} inputMode="numeric"
                            value={verifyCode}
                            onChange={(e) => setVerifyCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                            placeholder="000000"
                          />
                        </fieldset>
                        <button type="submit" className="btn btn-primary" disabled={twoFaBusy || verifyCode.length < 6}>
                          {twoFaBusy ? <span className="loading loading-spinner loading-xs" /> : null}
                          Verify & Enable
                        </button>
                      </form>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      {disable2FaOpen && (
        <dialog className="modal modal-open">
          <div className="modal-box max-w-sm">
            <h3 className="font-bold text-lg">Disable two-factor authentication</h3>
            <p className="text-sm text-base-content/60 mt-1">Enter the 6-digit code from your authenticator app to confirm.</p>
            <form onSubmit={disable2FA} className="mt-4 flex flex-col gap-4">
              <fieldset className="fieldset">
                <legend className="fieldset-legend">Verification code</legend>
                <input
                  className="input font-mono text-center text-lg tracking-widest"
                  required maxLength={6} inputMode="numeric"
                  value={disableCode}
                  onChange={(e) => setDisableCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                  placeholder="000000"
                  autoFocus
                />
              </fieldset>
              <div className="modal-action">
                <button type="button" className="btn" onClick={() => { setDisable2FaOpen(false); setDisableCode(''); }}>Cancel</button>
                <button type="submit" className="btn btn-error" disabled={twoFaBusy || disableCode.length < 6}>
                  {twoFaBusy ? <span className="loading loading-spinner loading-xs" /> : null}
                  Disable 2FA
                </button>
              </div>
            </form>
          </div>
          <form method="dialog" className="modal-backdrop"><button onClick={() => { setDisable2FaOpen(false); setDisableCode(''); }}>close</button></form>
        </dialog>
      )}
    </div>
  );
}
