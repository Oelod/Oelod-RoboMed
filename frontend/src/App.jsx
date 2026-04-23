import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';

// Pages (stubbed — filled out in Phase 7)
import AuthPage          from './pages/AuthPage';
import PatientDashboard  from './pages/PatientDashboard';
import DoctorDashboard   from './pages/DoctorDashboard';
import AdminDashboard    from './pages/AdminDashboard';
import CaseDetailPage    from './pages/CaseDetailPage';
import NewCasePage       from './pages/NewCasePage';
import SearchPage        from './pages/SearchPage';
import LabDashboard      from './pages/LabDashboard';
import PharmacyDashboard from './pages/PharmacyDashboard';
import AdminReportsPage from './pages/AdminReportsPage';
import NotFoundPage      from './pages/NotFoundPage';
import AiSandbox         from './ai-playground/AiSandbox';

// Guards
// Guards
import ProtectedRoute    from './components/ProtectedRoute';
import GlobalNotifications from './components/GlobalNotifications';
import GlobalSignalReceiver from './components/GlobalSignalReceiver';
import RestorationOverlay from './components/RestorationOverlay';
import DashboardLayout from './components/layout/DashboardLayout';

export default function App() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      <GlobalNotifications />
      <GlobalSignalReceiver />
      <RestorationOverlay />
      <div className="flex-1 overflow-auto">
        <Routes>
          {/* Public Manifolds */}
          <Route path="/login"    element={<AuthPage mode="login" />} />
          <Route path="/register" element={<AuthPage mode="register" />} />
          <Route path="/forgot-password" element={<AuthPage mode="forgot" />} />
          <Route path="/reset-password/:token" element={<AuthPage mode="reset" />} />
          <Route path="/ai-playground" element={<AiSandbox />} />

          {/* Sovereign Authenticated Manifolds */}
          <Route element={<ProtectedRoute roles={['patient', 'doctor', 'admin', 'lab', 'pharmacist']}><DashboardLayout /></ProtectedRoute>}>
            <Route path="/dashboard" element={
              user?.activeRole === 'doctor' ? <DoctorDashboard /> :
              user?.activeRole === 'admin'  ? <AdminDashboard />  :
              user?.activeRole === 'lab'    ? <LabDashboard />    :
              user?.activeRole === 'pharmacist' ? <PharmacyDashboard /> :
                                              <PatientDashboard />
            } />
            
            <Route path="/admin"      element={<ProtectedRoute roles={['admin']}><AdminDashboard /></ProtectedRoute>} />
            <Route path="/lab"        element={<ProtectedRoute roles={['lab', 'admin']}><LabDashboard /></ProtectedRoute>} />
            <Route path="/pharmacy"   element={<ProtectedRoute roles={['pharmacist', 'admin']}><PharmacyDashboard /></ProtectedRoute>} />
            <Route path="/admin/reports" element={<ProtectedRoute roles={['admin']}><AdminReportsPage /></ProtectedRoute>} />
            
            <Route path="/cases/new" element={
              <ProtectedRoute roles={['patient']}><NewCasePage /></ProtectedRoute>
            } />
            
            <Route path="/cases/:caseId" element={
              <ProtectedRoute roles={['patient', 'doctor', 'admin']}><CaseDetailPage /></ProtectedRoute>
            } />
            
            <Route path="/search" element={
              <ProtectedRoute roles={['patient', 'doctor', 'admin']}><SearchPage /></ProtectedRoute>
            } />
          </Route>

          {/* Terminal Redirects */}
          <Route path="/"  element={<Navigate to={user ? '/dashboard' : '/login'} replace />} />
          <Route path="*"  element={<NotFoundPage />} />
        </Routes>
      </div>
    </div>
  );
}
