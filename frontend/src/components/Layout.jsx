import { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  Landmark,
  ClipboardList,
  BookOpen,
  BarChart3,
  Bell,
  ShieldCheck,
  Users,
  Settings,
  LogOut,
  Sun,
  Moon,
  Check,
  Menu,
  KeyRound,
  FileText,
} from 'lucide-react';
import useAuthStore from '../stores/authStore';
import { useThemeStore, THEMES } from '../stores/themeStore';
import api from '../api/client';
import { useToast } from './Toast';

const MENU = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, group: 'ops', index: null },
  { to: '/items', label: 'Items & Stock', icon: Package, group: 'ops', index: '01' },
  { to: '/receiving', label: 'Receiving / Purchases', icon: Landmark, group: 'ops', index: '01b' },
  { to: '/purchase-orders', label: 'Purchase Orders', icon: FileText, group: 'ops', index: '01c' },
  { to: '/suppliers', label: 'Suppliers', icon: Users, group: 'ops', index: '01d' },
  { to: '/physical-counts', label: 'Physical Count', icon: ClipboardList, group: 'ops', index: '01e' },
  { to: '/ris', label: 'Requisitions (RIS)', icon: ClipboardList, group: 'ops', index: '02' },
  { to: '/ledger', label: 'Ledger Cards', icon: BookOpen, group: 'ops', index: '03' },
  { to: '/reports', label: 'Reports', icon: BarChart3, group: 'oversight', index: null },
  { to: '/notifications', label: 'Notifications', icon: Bell, group: 'oversight', index: null },
  { to: '/audit', label: 'Audit Trail', icon: ShieldCheck, group: 'oversight', index: null },
  { to: '/users', label: 'User Accounts', icon: Users, group: 'admin', index: null },
  { to: '/settings', label: 'Reference Data', icon: Settings, group: 'admin', index: null },
];

const NAV_GROUPS = [
  { key: 'ops', label: 'Operations' },
  { key: 'oversight', label: 'Oversight' },
  { key: 'admin', label: 'Administration' },
];

const ROLE_MENU = {
  ADMIN: ['dashboard', 'items', 'receiving', 'purchase-orders', 'suppliers', 'physical-counts', 'ris', 'ledger', 'reports', 'notifications', 'audit', 'users', 'settings'].map(find),
  WAREHOUSE_STAFF: ['dashboard', 'items', 'receiving', 'purchase-orders', 'suppliers', 'physical-counts', 'ris', 'ledger', 'reports', 'notifications', 'settings'].map(find),
  PROPERTY_CUSTODIAN: ['dashboard', 'items', 'ris', 'purchase-orders', 'physical-counts', 'ledger', 'reports', 'notifications'].map(find),
  AUDITOR: ['dashboard', 'items', 'ris', 'purchase-orders', 'physical-counts', 'ledger', 'reports', 'notifications', 'audit'].map(find),
  DEPARTMENT_HEAD: ['dashboard', 'items', 'ris', 'purchase-orders', 'physical-counts', 'notifications'].map(find),
};

function find(key) {
  return MENU.find((m) => m.to.replace('/', '') === key);
}

function RoleBadge({ role }) {
  const labels = {
    ADMIN: 'Admin',
    WAREHOUSE_STAFF: 'Warehouse Staff',
    PROPERTY_CUSTODIAN: 'Property Custodian',
    AUDITOR: 'Auditor',
    DEPARTMENT_HEAD: 'Department Head',
  };
  return <span className="badge badge-ghost badge-sm">{labels[role] || role}</span>;
}

export default function Layout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const [unread, setUnread] = useState(0);
  const theme = useThemeStore((s) => s.theme);
  const setTheme = useThemeStore((s) => s.setTheme);
  const currentTheme = THEMES.find((t) => t.id === theme) || THEMES[0];

  const menu = user ? ROLE_MENU[user.role] || [] : [];
  const canAudit = user?.role === 'ADMIN' || user?.role === 'AUDITOR';

  useEffect(() => {
    api.get('/notifications/unread-count').then((r) => setUnread(r.data.unreadCount)).catch(() => {});
    const id = setInterval(() => {
      api.get('/notifications/unread-count').then((r) => setUnread(r.data.unreadCount)).catch(() => {});
    }, 60000);
    return () => clearInterval(id);
  }, [location.pathname]);

  const handleLogout = async () => {
    try {
      const refreshToken = localStorage.getItem('lgu_refresh_token');
      await api.post('/auth/logout', { refreshToken });
    } catch { /* best-effort */ }
    logout();
    navigate('/login', { replace: true });
  };

  const handleLogoutAll = async () => {
    try {
      await api.post('/auth/logout-all');
      toast.success('Signed out from all sessions');
    } catch { /* best-effort */ }
    logout();
    navigate('/login', { replace: true });
  };


  const current = menu.find((m) => location.pathname.startsWith(m.to));

  return (
    <div className="drawer lg:drawer-open">
      <input id="app-drawer" type="checkbox" className="drawer-toggle" />
      <div className="drawer-content flex flex-col min-h-screen bg-base-200">
        <div className="navbar bg-base-200 border-b border-base-300 sticky top-0 z-40">
          <div className="navbar-start">
            <label htmlFor="app-drawer" className="btn btn-ghost drawer-button lg:hidden" aria-label="Open menu">
              <Menu className="h-5 w-5" />
            </label>
            <span className="hidden truncate text-sm font-semibold sm:block">
              {current?.label || 'LGU Inventory Management System'}
            </span>
          </div>

          <div className="navbar-end gap-2">
            {user?.role === 'DEPARTMENT_HEAD' && <RoleBadge role={user.role} />}
            <div className="dropdown dropdown-end">
              <div
                tabIndex={0}
                role="button"
                className="btn btn-ghost btn-circle"
                aria-label={`Change theme (current: ${currentTheme.label})`}
                title="Theme"
              >
                {currentTheme.family === 'dark' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
              </div>
              <ul tabIndex={0} className="dropdown-content menu z-50 w-56 p-1.5">
                <li className="menu-title">
                  <div className="text-xs">Appearance</div>
                </li>
                {THEMES.map((t) => (
                  <li key={t.id}>
                    <button
                      className={t.id === theme ? 'bg-primary/10 text-primary font-semibold' : ''}
                      onClick={() => setTheme(t.id)}
                    >
                      <span
                        aria-hidden="true"
                        className="h-3 w-3 rounded-full border border-base-300"
                        style={{ background: t.swatch }}
                      />
                      <span className="flex-1">{t.label}</span>
                      {t.id === theme && <Check className="h-4 w-4" />}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            <NavLink to="/notifications" className="btn btn-ghost btn-circle relative" aria-label="Notifications">
              <Bell className="h-5 w-5" strokeWidth={1.6} />
              {unread > 0 && <span className="badge badge-error badge-sm absolute -top-1 -right-1">{unread}</span>}
            </NavLink>

            <div className="dropdown dropdown-end">
              <div tabIndex={0} role="button" className="btn btn-ghost flex items-center gap-2 px-2">
                <div className="avatar">
                  <div className="bg-primary text-primary-content w-8">
                    <span>{user?.fullName?.charAt(0) || 'U'}</span>
                  </div>
                </div>
                <span className="hidden md:block max-w-40 truncate">{user?.fullName}</span>
              </div>
              <ul tabIndex={0} className="dropdown-content menu z-50 w-64 p-1.5">
                <li className="menu-title">
                  <div>
                    <div className="font-bold">{user?.fullName}</div>
                    <div className="text-xs opacity-60">@{user?.username} · {user?.role.replace(/_/g, ' ').toLowerCase()}</div>
                  </div>
                </li>
                <li>
                  <button
                    onClick={() => {
                      document.getElementById('pw-modal')?.showModal();
                    }}
                  >
                    <KeyRound className="h-4 w-4" />
                    Change password
                  </button>
                </li>
                {canAudit && (
                  <li>
                    <NavLink to="/audit">
                      <ShieldCheck className="h-4 w-4" />
                      Audit trail
                    </NavLink>
                  </li>
                  <li>
                    <NavLink to="/coa-compliance">
                      <ShieldCheck className="h-4 w-4" />
                      COA compliance
                    </NavLink>
                  </li>
                )}
                <div className="divider my-1" />
                <li>
                  <button onClick={handleLogout} className="text-error">
                    <LogOut className="h-4 w-4" />
                    Sign out
                  </button>
                </li>
                <li>
                  <button onClick={handleLogoutAll} className="text-error">
                    <LogOut className="h-4 w-4" />
                    Sign out from all sessions
                  </button>
                </li>

              </ul>
            </div>
          </div>
        </div>

        <main className="flex-1 w-full max-w-[1400px] mx-auto p-4 sm:p-6">
          <Outlet />
        </main>

        <footer className="footer footer-center bg-base-200 border-t border-base-300 p-4 font-mono text-[10px] uppercase tracking-[0.14em] text-base-content/50">
          <div>LGU Inventory Management System · Requisition and Issue Slip · On-premise deployment · v1.0</div>
        </footer>
      </div>

      <div className="drawer-side z-50">
        <label htmlFor="app-drawer" aria-label="close sidebar" className="drawer-overlay" />
        <aside className="flex min-h-full w-72 flex-col bg-base-100">
          <div className="flex items-center gap-3 px-5 pb-5 pt-6">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary text-primary-content shadow-sm">
              <Landmark className="h-5 w-5" strokeWidth={2} />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold tracking-tight text-base-content">LGU Inventory</p>
              <p className="lgu-mono text-[10px] tracking-[0.08em] text-base-content/45">MANAGEMENT SYSTEM · V1.0</p>
            </div>
          </div>

          <nav className="flex-1 overflow-y-auto px-3 pb-4">
            {NAV_GROUPS.map((g) => {
              const items = menu.filter((m) => m.group === g.key);
              if (!items.length) return null;
              return (
                <div key={g.key} className="mt-1">
                  <p className="px-3 pb-1.5 pt-4 text-[10px] font-semibold uppercase tracking-[0.14em] text-base-content/40">
                    {g.label}
                  </p>
                  <ul className="space-y-0.5">
                    {items.map((item) => (
                      <li key={item.to}>
                        <NavLink
                          to={item.to}
                          className={({ isActive }) =>
                            `relative flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium transition-colors ${
                              isActive
                                ? 'bg-primary/10 font-semibold text-primary'
                                : 'text-base-content/70 hover:bg-base-200 hover:text-base-content'
                            }`
                          }
                        >
                          {({ isActive }) => (
                            <>
                              <item.icon
                                className={`h-[18px] w-[18px] shrink-0 ${isActive ? 'text-primary' : 'text-base-content/45'}`}
                                strokeWidth={1.8}
                              />
                              <span className="flex-1 truncate">{item.label}</span>
                              {item.to === '/notifications' && unread > 0 && (
                                <span className="badge border-0 bg-error text-error-content text-[10px] font-bold">{unread}</span>
                              )}
                              {isActive && (
                                <span className="absolute inset-y-0 left-0 w-[3px] rounded-r-full bg-primary" aria-hidden="true" />
                              )}
                            </>
                          )}
                        </NavLink>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </nav>

          <div className="border-t border-base-300 p-3">
            <div className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-base-200">
              <div className="avatar">
                <div className="bg-primary text-primary-content">
                  <span>{user?.fullName?.charAt(0) || 'U'}</span>
                </div>
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold text-base-content">{user?.fullName}</div>
                <div className="truncate text-xs capitalize text-base-content/50">{user?.role.replace(/_/g, ' ').toLowerCase()}</div>
              </div>
              <button
                onClick={handleLogout}
                aria-label="Sign out"
                title="Sign out"
                className="btn btn-ghost btn-square btn-sm text-base-content/50 hover:text-error"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </aside>
      </div>

      <ChangePasswordModal />
    </div>
  );
}

function ChangePasswordModal() {
  const toast = useToast();
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (form.newPassword !== form.confirm) {
      toast.error('New passwords do not match.');
      return;
    }
    setBusy(true);
    try {
      await api.post('/auth/change-password', { currentPassword: form.currentPassword, newPassword: form.newPassword });
      toast.success('Password updated successfully.');
      document.getElementById('pw-modal').close();
      setForm({ currentPassword: '', newPassword: '', confirm: '' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Unable to change password.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <dialog id="pw-modal" className="modal">
      <div className="modal-box">
        <h3 className="font-bold text-lg">Change password</h3>
        <form onSubmit={submit} className="mt-4 flex flex-col gap-4">
          <label className="fieldset">
            <span className="fieldset-legend">Current password</span>
            <input type="password" required className="input" placeholder="••••••••"
              value={form.currentPassword} onChange={(e) => setForm({ ...form, currentPassword: e.target.value })} />
          </label>
          <label className="fieldset">
            <span className="fieldset-legend">New password (min. 8 characters)</span>
            <input type="password" required className="input" placeholder="••••••••"
              value={form.newPassword} onChange={(e) => setForm({ ...form, newPassword: e.target.value })} />
          </label>
          <label className="fieldset">
            <span className="fieldset-legend">Confirm new password</span>
            <input type="password" required className="input" placeholder="••••••••"
              value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })} />
          </label>
          <div className="modal-action">
            <button type="button" className="btn" onClick={() => document.getElementById('pw-modal').close()}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={busy}>
              {busy && <span className="loading loading-spinner loading-xs" />}
              Update password
            </button>
          </div>
        </form>
      </div>
    </dialog>
  );
}





