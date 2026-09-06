import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import DashboardPage from './pages/DashboardPage';
import ItemsPage from './pages/ItemsPage';
import RISPage from './pages/RISPage';
import LedgerPage from './pages/LedgerPage';
import ReportsPage from './pages/ReportsPage';
import NotificationsPage from './pages/NotificationsPage';
import AuditLogPage from './pages/AuditLogPage';
import COACompliancePage from './pages/COACompliancePage';
import UsersPage from './pages/UsersPage';
import SettingsPage from './pages/SettingsPage';
import ReceivingPage from './pages/ReceivingPage';
import SuppliersPage from './pages/SuppliersPage';
import PurchaseOrdersPage from './pages/PurchaseOrdersPage';
import PhysicalCountPage from './pages/PhysicalCountPage';
import BudgetPage from './pages/BudgetPage';
import ProfilePage from './pages/ProfilePage';

function NotFound() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem', padding: '6rem 1rem' }}>
      <h1 style={{ fontSize: '3rem', fontWeight: 800, color: 'var(--ink)' }}>404</h1>
      <p style={{ color: 'color-mix(in oklab, var(--ink) 55%, transparent)', fontSize: '0.9375rem' }}>The page you are looking for does not exist.</p>
      <a className="btn btn-primary" href="/dashboard">Go to Dashboard</a>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="items" element={<ItemsPage />} />
        <Route path="receiving" element={<ProtectedRoute roles={['ADMIN', 'WAREHOUSE_STAFF']}><ReceivingPage /></ProtectedRoute>} />
        <Route path="suppliers" element={<ProtectedRoute roles={['ADMIN', 'WAREHOUSE_STAFF']}><SuppliersPage /></ProtectedRoute>} />
        <Route path="purchase-orders" element={<ProtectedRoute roles={['ADMIN', 'WAREHOUSE_STAFF', 'PROPERTY_CUSTODIAN']}><PurchaseOrdersPage /></ProtectedRoute>} />
        <Route path="physical-counts" element={<ProtectedRoute roles={['ADMIN', 'WAREHOUSE_STAFF', 'PROPERTY_CUSTODIAN']}><PhysicalCountPage /></ProtectedRoute>} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="ris" element={<RISPage />} />
        <Route path="ledger" element={<LedgerPage />} />
        <Route path="reports" element={<ProtectedRoute roles={['ADMIN', 'WAREHOUSE_STAFF', 'PROPERTY_CUSTODIAN', 'AUDITOR']}><ReportsPage /></ProtectedRoute>} />
        <Route path="budgets" element={<ProtectedRoute roles={['ADMIN', 'PROPERTY_CUSTODIAN', 'AUDITOR']}><BudgetPage /></ProtectedRoute>} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="audit" element={<ProtectedRoute roles={['ADMIN', 'AUDITOR']}><AuditLogPage /></ProtectedRoute>} />
        <Route path="coa-compliance" element={<ProtectedRoute roles={['ADMIN', 'AUDITOR']}><COACompliancePage /></ProtectedRoute>} />
        <Route path="users" element={<ProtectedRoute roles={['ADMIN']}><UsersPage /></ProtectedRoute>} />
        <Route path="settings" element={<ProtectedRoute roles={['ADMIN', 'WAREHOUSE_STAFF']}><SettingsPage /></ProtectedRoute>} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
