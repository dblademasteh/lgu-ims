import { useState, useEffect, useRef } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Package, Landmark, ClipboardList, BookOpen, BarChart3,
  Bell, ShieldCheck, Users, Settings, LogOut, Menu, KeyRound, FileText, UserRound,
  ChevronRight, Moon, Sun, PanelLeftClose, PanelLeftOpen, Wallet,
} from 'lucide-react';
import useAuthStore from '../stores/authStore';
import { useThemeStore } from '../stores/themeStore';
import api from '../api/client';
import { useToast } from './Toast';

const MENU = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, group: 'ops' },
  { to: '/items', label: 'Items & Stock', icon: Package, group: 'ops' },
  { to: '/receiving', label: 'Receiving', icon: Landmark, group: 'ops' },
  { to: '/purchase-orders', label: 'Purchase Orders', icon: FileText, group: 'ops' },
  { to: '/suppliers', label: 'Suppliers', icon: Users, group: 'ops' },
  { to: '/physical-counts', label: 'Physical Count', icon: ClipboardList, group: 'ops' },
  { to: '/ris', label: 'Requisitions (RIS)', icon: ClipboardList, group: 'ops' },
  { to: '/ledger', label: 'Ledger Cards', icon: BookOpen, group: 'ops' },
  { to: '/reports', label: 'Reports', icon: BarChart3, group: 'oversight' },
  { to: '/budgets', label: 'Budgets', icon: Wallet, group: 'oversight' },
  { to: '/notifications', label: 'Notifications', icon: Bell, group: 'oversight' },
  { to: '/audit', label: 'Audit Trail', icon: ShieldCheck, group: 'oversight' },
  { to: '/users', label: 'User Accounts', icon: Users, group: 'admin' },
  { to: '/settings', label: 'Reference Data', icon: Settings, group: 'admin' },
];

const NAV_GROUPS = [
  { key: 'ops', label: 'Operations' },
  { key: 'oversight', label: 'Oversight' },
  { key: 'admin', label: 'Administration' },
];

const ROLE_MENU = {
  ADMIN: ['dashboard', 'items', 'receiving', 'purchase-orders', 'suppliers', 'physical-counts', 'ris', 'ledger', 'reports', 'budgets', 'notifications', 'audit', 'users', 'settings', 'profile'],
  WAREHOUSE_STAFF: ['dashboard', 'items', 'receiving', 'purchase-orders', 'suppliers', 'physical-counts', 'ris', 'ledger', 'reports', 'notifications', 'settings', 'profile'],
  PROPERTY_CUSTODIAN: ['dashboard', 'items', 'ris', 'purchase-orders', 'physical-counts', 'ledger', 'reports', 'budgets', 'notifications', 'profile'],
  AUDITOR: ['dashboard', 'items', 'ris', 'purchase-orders', 'physical-counts', 'ledger', 'reports', 'budgets', 'notifications', 'audit', 'profile'],
  DEPARTMENT_HEAD: ['dashboard', 'items', 'ris', 'purchase-orders', 'physical-counts', 'notifications', 'profile'],
};

function buildMenu(role) {
  return (ROLE_MENU[role] || []).map(k => MENU.find(m => m.to.replace('/', '') === k)).filter(Boolean);
}

export default function Layout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const [unread, setUnread] = useState(0);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('lgu_sidebar_collapsed') === '1');
  const theme = useThemeStore(s => s.theme);
  const setTheme = useThemeStore(s => s.setTheme);

  const [pwModalOpen, setPwModalOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);

  const menu = user ? buildMenu(user.role) : [];
  const canAudit = user?.role === 'ADMIN' || user?.role === 'AUDITOR';
  const current = menu.find(m => location.pathname.startsWith(m.to));

  useEffect(() => {
    api.get('/notifications/unread-count').then(r => setUnread(r.data.unreadCount)).catch(() => {});
    const id = setInterval(() => {
      api.get('/notifications/unread-count').then(r => setUnread(r.data.unreadCount)).catch(() => {});
    }, 60000);
    return () => clearInterval(id);
  }, [location.pathname]);

  const closeDrawer = () => setDrawerOpen(false);
  useEffect(() => { closeDrawer(); }, [location.pathname]);

  useEffect(() => {
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }
    window.scrollTo(0, 0);
  }, [location.pathname]);

  useEffect(() => {
    localStorage.setItem('lgu_sidebar_collapsed', collapsed ? '1' : '0');
  }, [collapsed]);

  const handleLogout = async () => {
    try {
      const refreshToken = localStorage.getItem('lgu_refresh_token');
      await api.post('/auth/logout', { refreshToken });
    } catch { /* best-effort */ }
    logout();
    navigate('/login', { replace: true });
  };

  const handleLogoutAll = async () => {
    try { await api.post('/auth/logout-all'); } catch { /* best-effort */ }
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className={`drawer lg:drawer-open${collapsed ? ' collapsed' : ''}`}>
      {/* ── Overlay ── */}
      {drawerOpen && (
        <div
          className="drawer-overlay drawer-open"
          onClick={closeDrawer}
          aria-label="Close sidebar"
        />
      )}

      {/* ── Sidebar ── */}
      <aside className={`drawer-side${drawerOpen ? ' drawer-open' : ''}`} style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--surface)' }}>
          {/* Brand */}
          <div className="sidebar-brand" title={collapsed ? 'LGU Inventory Management System' : undefined}>
            <div className="sidebar-brand-icon">
              <Landmark size={16} strokeWidth={2} />
            </div>
            <div>
              <div className="sidebar-brand-text">LGU Inventory</div>
              <div className="sidebar-brand-sub">Management System</div>
            </div>
          </div>

          {/* Nav */}
          <nav style={{ flex: 1, overflowY: 'auto', padding: '0.75rem 0' }}>
            {NAV_GROUPS.map(g => {
              const items = menu.filter(m => m.group === g.key);
              if (!items.length) return null;
              return (
                <div key={g.key} style={{ marginBottom: '0.25rem' }}>
                  <div className="sidebar-section-label">{g.label}</div>
                  <div className="sidebar-section">
                    {items.map(item => (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        title={collapsed ? item.label : undefined}
                        className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
                        onClick={closeDrawer}
                      >
                        <item.icon size={16} strokeWidth={1.8} />
                        <span style={{ flex: 1 }}>{item.label}</span>
                        {item.to === '/notifications' && unread > 0 && (
                          <span style={{ minWidth: '1.25rem', height: '1.25rem', padding: '0 0.3125rem', background: 'var(--lgu-error)', color: '#fff', borderRadius: '9999px', fontSize: '0.5625rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {unread > 99 ? '99+' : unread}
                          </span>
                        )}
                      </NavLink>
                    ))}
                  </div>
                </div>
              );
            })}
          </nav>
        </aside>

      {/* ── Main ── */}
      <div className="drawer-content" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'var(--surface2)' }}>
        {/* Topbar */}
        <header className="topbar">
          {/* Mobile hamburger */}
          <button
            onClick={() => setDrawerOpen(true)}
            className="btn btn-ghost btn-sm lg:hidden"
            style={{ border: 'none' }}
            aria-label="Open navigation menu"
          >
            <Menu size={18} />
          </button>

          {/* Sidebar collapse toggle (desktop) — leftmost */}
          <button
            onClick={() => setCollapsed(c => !c)}
            className="btn btn-ghost btn-sm btn-square hidden lg:inline-flex"
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            style={{ border: 'none' }}
          >
            {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
          </button>

          <nav className="topbar-breadcrumb">
            <span>LGU IMS</span>
            {current && (
              <>
                <ChevronRight size={12} style={{ opacity: 0.4 }} />
                <span className="topbar-breadcrumb-current">{current.label}</span>
              </>
            )}
          </nav>

          <div className="topbar-actions">
            {/* Theme toggle */}
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="btn btn-ghost btn-sm btn-square"
              title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
              style={{ border: 'none' }}
            >
              {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
            </button>

            {/* Notifications */}
            <NavLink to="/notifications" className="btn btn-ghost btn-sm btn-square" title="Notifications" style={{ border: 'none', position: 'relative' }}>
              <Bell size={15} strokeWidth={1.8} />
              {unread > 0 && (
                <span style={{ position: 'absolute', top: '2px', right: '2px', width: '14px', height: '14px', background: 'var(--lgu-error)', color: '#fff', borderRadius: '9999px', fontSize: '0.5625rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {unread > 9 ? '9+' : unread}
                </span>
              )}
            </NavLink>

            {/* User menu */}
            <div className="dropdown">
              <div tabIndex={0} role="button" className="avatar" style={{ cursor: 'pointer' }}>
                <div style={{ background: 'var(--ink)', color: 'var(--on-ink)', width: '100%', height: '100%', display: 'grid', placeItems: 'center', borderRadius: '9999px' }}>
                  <span style={{ fontWeight: 700, fontSize: '0.75rem' }}>{user?.fullName?.charAt(0) || 'U'}</span>
                </div>
              </div>
              <div className="dropdown-content" style={{ width: '14rem' }}>
                <div style={{ padding: '0.5rem 0.75rem', borderBottom: '1px solid var(--line)', marginBottom: '0.25rem' }}>
                  <div style={{ fontWeight: 600, fontSize: '0.8125rem' }}>{user?.fullName}</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.5625rem', letterSpacing: '0.06em', color: 'color-mix(in oklab, var(--ink) 50%, transparent)', marginTop: '0.125rem' }}>
                    @{user?.username} · {user?.role?.replace(/_/g, ' ').toLowerCase()}
                  </div>
                </div>
                <button onClick={() => setPwModalOpen(true)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%', padding: '0.4375rem 0.75rem', borderRadius: '6px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8125rem', color: 'var(--ink)', transition: 'background 100ms' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'none'}
                  onFocus={e => e.currentTarget.style.background = 'var(--surface2)'}
                  onBlur={e => e.currentTarget.style.background = 'none'}
                >
                  <KeyRound size={14} /> Change password
                </button>
                {canAudit && (
                  <>
                    <NavLink to="/audit" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.4375rem 0.75rem', borderRadius: '6px', fontSize: '0.8125rem', color: 'var(--ink)', textDecoration: 'none', transition: 'background 100ms' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'none'}
                      onFocus={e => e.currentTarget.style.background = 'var(--surface2)'}
                      onBlur={e => e.currentTarget.style.background = 'none'}
                    >
                      <ShieldCheck size={14} /> Audit trail
                    </NavLink>
                    <NavLink to="/coa-compliance" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.4375rem 0.75rem', borderRadius: '6px', fontSize: '0.8125rem', color: 'var(--ink)', textDecoration: 'none', transition: 'background 100ms' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'none'}
                      onFocus={e => e.currentTarget.style.background = 'var(--surface2)'}
                      onBlur={e => e.currentTarget.style.background = 'none'}
                    >
                      <ShieldCheck size={14} /> COA compliance
                    </NavLink>
                  </>
                )}
                <div style={{ borderTop: '1px solid var(--line)', marginTop: '0.25rem', paddingTop: '0.25rem' }}>
                  <button onClick={handleLogout} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%', padding: '0.4375rem 0.75rem', borderRadius: '6px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8125rem', color: 'var(--lgu-error)', transition: 'background 100ms' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'color-mix(in oklab, var(--lgu-error) 8%, transparent)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'none'}
                    onFocus={e => e.currentTarget.style.background = 'color-mix(in oklab, var(--lgu-error) 8%, transparent)'}
                    onBlur={e => e.currentTarget.style.background = 'none'}
                  >
                    <LogOut size={14} /> Sign out
                  </button>
                  <button onClick={() => setLogoutOpen(true)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%', padding: '0.4375rem 0.75rem', borderRadius: '6px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8125rem', color: 'var(--lgu-error)', transition: 'background 100ms' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'color-mix(in oklab, var(--lgu-error) 8%, transparent)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'none'}
                    onFocus={e => e.currentTarget.style.background = 'color-mix(in oklab, var(--lgu-error) 8%, transparent)'}
                    onBlur={e => e.currentTarget.style.background = 'none'}
                  >
                    <LogOut size={14} /> Sign out all sessions
                  </button>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="page-content" style={{ flex: 1 }}>
          <div className="page-inner"><Outlet /></div>
        </main>

        {/* Footer */}
        <footer style={{ borderTop: '1px solid var(--line)', padding: '0.875rem 1.5rem', display: 'flex', justifyContent: 'center', fontFamily: 'var(--font-mono)', fontSize: '0.5625rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'color-mix(in oklab, var(--ink) 35%, transparent)' }}>
          LGU Inventory Management System · On-premise · v1.0
        </footer>
      </div>

      {/* ── Modals ── */}
      {pwModalOpen && <ChangePasswordModal onClose={() => setPwModalOpen(false)} />}

      {logoutOpen && (
        <dialog className="modal modal-open" aria-label="Sign out all sessions">
          <div className="modal-box">
            <h3 style={{ fontWeight: 600, fontSize: '1rem' }}>Sign out of all sessions?</h3>
            <p style={{ marginTop: '0.5rem', color: 'color-mix(in oklab, var(--ink) 60%, transparent)', fontSize: '0.9375rem' }}>
              You will be signed out from all devices.
            </p>
            <div className="modal-action">
              <button className="btn" onClick={() => setLogoutOpen(false)}>Cancel</button>
              <button className="btn btn-error" onClick={() => { setLogoutOpen(false); handleLogoutAll(); }}>Sign out all</button>
            </div>
          </div>
          <form method="dialog" className="modal-backdrop"><button aria-label="Close dialog" onClick={() => setLogoutOpen(false)}>close</button></form>
        </dialog>
      )}
    </div>
  );
}

function ChangePasswordModal({ onClose }) {
  const toast = useToast();
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [busy, setBusy] = useState(false);
  const dialogRef = useRef(null);

  useEffect(() => { dialogRef.current?.showModal(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    if (form.newPassword !== form.confirm) { toast.error('New passwords do not match.'); return; }
    setBusy(true);
    try {
      await api.post('/auth/change-password', { currentPassword: form.currentPassword, newPassword: form.newPassword });
      toast.success('Password updated.');
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Unable to change password.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <dialog ref={dialogRef} className="modal" aria-label="Change password" onClose={onClose}>
      <div className="modal-box">
        <h3 style={{ fontWeight: 600, fontSize: '1rem', marginBottom: '1rem' }}>Change password</h3>
        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="fieldset">
            <span className="fieldset-legend">Current password</span>
            <input type="password" required className="input" value={form.currentPassword} onChange={e => setForm({ ...form, currentPassword: e.target.value })} />
          </div>
          <div className="fieldset">
            <span className="fieldset-legend">New password (min. 8 chars)</span>
            <input type="password" required className="input" value={form.newPassword} onChange={e => setForm({ ...form, newPassword: e.target.value })} />
          </div>
          <div className="fieldset">
            <span className="fieldset-legend">Confirm new password</span>
            <input type="password" required className="input" value={form.confirm} onChange={e => setForm({ ...form, confirm: e.target.value })} />
          </div>
          <div className="modal-action">
            <button type="button" className="btn" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={busy}>
              {busy && <span className="loading loading-spinner loading-xs" />}
              Update
            </button>
          </div>
        </form>
      </div>
    </dialog>
  );
}
