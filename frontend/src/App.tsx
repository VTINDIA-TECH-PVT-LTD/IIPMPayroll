import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import apiService from './services/api';
import Navbar from './components/Navbar';
import Topbar from './components/Topbar';
import LoginPage from './pages/LoginPage';
import AdminDashboard from './pages/AdminDashboard';
import PayrollManagement from './pages/PayrollManagement';
import EmployeePortal from './pages/EmployeePortal';
import EmployeeDashboard from './pages/EmployeeDashboard';
import Form16Portal from './pages/Form16Portal';
import ITDeclarationPortal from './pages/ITDeclarationPortal';
import ITDeclarationHistory from './pages/ITDeclarationHistory';
import ITApprovals from './pages/ITApprovals';
import ReportsPage from './pages/ReportsPage';
import SettingsPage from './pages/SettingsPage';
import UserManagement from './pages/UserManagement';
import ArrearsCalculator from './pages/ArrearsCalculator';
import DataManagementPage from './pages/DataManagementPage';
import MyProfilePage from './pages/MyProfilePage';
import './styles/App.css';

export interface UserContextType {
  isAuthenticated: boolean;
  role: string | null;
  userId: string | null;
  username: string | null;
}

export const UserContext = React.createContext<UserContextType | null>(null);

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  if (!apiService.isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

const RoleRoute = ({ children, allowedRoles }: { children: React.ReactNode, allowedRoles: string[] }) => {
  if (!apiService.isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }
  const role = apiService.getRole();
  if (!role || !allowedRoles.includes(role)) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
};

const AppContent: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(apiService.isAuthenticated());
  const [role,     setRole]     = useState<string | null>(apiService.getRole());
  const [userId,   setUserId]   = useState<string | null>(apiService.getUserId());
  const [username, setUsername] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    const stored = localStorage.getItem('authToken');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setIsAuthenticated(true);
        setRole(parsed.role);
        setUserId(parsed.userId);
        setUsername(parsed.username);
      } catch {
        localStorage.removeItem('authToken');
      }
    }
  }, []);

  const handleLogin = (token: any) => {
    setIsAuthenticated(true);
    setRole(token.role);
    setUserId(token.userId);
    setUsername(token.username);
  };

  const handleLogout = async () => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: 'You will be logged out!',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#3b82f6',
      confirmButtonText: 'Yes, Logout',
      customClass: { popup: 'rounded-xl' }
    });

    if (result.isConfirmed) {
      try {
        await apiService.logout();
      } catch (e) {
        console.error(e);
      }
      
      setIsAuthenticated(false);
      setRole(null);
      setUserId(null);
      setUsername(null);
      localStorage.removeItem('authToken');
      
      // Navigate to login page first so it appears in the background
      navigate('/login', { replace: true });

      await Swal.fire({
        icon: 'success',
        title: 'Logged Out!',
        text: 'You have been logged out.',
        confirmButtonColor: '#8b5cf6',
        customClass: { popup: 'rounded-xl' }
      });
    }
  };

  const defaultRoute = () => {
    if (role === 'SUPER_ADMIN' || role === 'ADMIN_ADMIN' || role === 'ADMIN_OPERATOR' || role === 'FA_ADMIN' || role === 'FA_OPERATOR') {
      return <AdminDashboard />;
    }
    return <EmployeeDashboard />;
  };

  return (
    <UserContext.Provider value={{ isAuthenticated, role, userId, username }}>
      <div className="App">
        {isAuthenticated && (
          <Navbar 
            onLogout={handleLogout} 
            isOpen={sidebarOpen} 
            onClose={() => setSidebarOpen(false)} 
          />
        )}
        <div className={isAuthenticated ? 'main-content' : 'auth-wrapper'} style={!isAuthenticated ? { width: '100%', flex: 1 } : {}}>
          {isAuthenticated && (
            <Topbar 
              onLogout={handleLogout} 
              onToggleSidebar={() => setSidebarOpen(prev => !prev)} 
            />
          )}
          <Routes>
            {/* Public */}
            <Route path="/login" element={isAuthenticated ? <Navigate to="/" replace /> : <LoginPage onLogin={handleLogin} />} />

            {/* Dashboard */}
            <Route path="/" element={<ProtectedRoute>{defaultRoute()}</ProtectedRoute>} />

            {/* Admin */}
            <Route path="/users"    element={<RoleRoute allowedRoles={['SUPER_ADMIN', 'ADMIN_ADMIN', 'ADMIN_OPERATOR']}><UserManagement /></RoleRoute>} />
            <Route path="/settings" element={<RoleRoute allowedRoles={['SUPER_ADMIN', 'ADMIN_ADMIN']}><SettingsPage /></RoleRoute>} />
            <Route path="/data"     element={<RoleRoute allowedRoles={['SUPER_ADMIN', 'ADMIN_ADMIN']}><DataManagementPage /></RoleRoute>} />

            {/* Payroll */}
            <Route path="/payroll"    element={<RoleRoute allowedRoles={['SUPER_ADMIN', 'FA_OPERATOR']}><PayrollManagement mode="process" /></RoleRoute>} />
            <Route path="/approvals"  element={<RoleRoute allowedRoles={['SUPER_ADMIN', 'FA_ADMIN']}><PayrollManagement mode="approve" /></RoleRoute>} />
            <Route path="/it-approvals" element={<RoleRoute allowedRoles={['SUPER_ADMIN', 'FA_OPERATOR']}><ITApprovals /></RoleRoute>} />
            <Route path="/arrears"    element={<RoleRoute allowedRoles={['SUPER_ADMIN', 'FA_OPERATOR', 'FA_ADMIN']}><ArrearsCalculator /></RoleRoute>} />

            {/* Reports */}
            <Route path="/reports"  element={<RoleRoute allowedRoles={['SUPER_ADMIN', 'FA_OPERATOR', 'FA_ADMIN']}><ReportsPage /></RoleRoute>} />

            {/* Employee */}
            <Route path="/payslips" element={<ProtectedRoute><EmployeePortal /></ProtectedRoute>} />
            <Route path="/form16"   element={<ProtectedRoute><Form16Portal /></ProtectedRoute>} />
            <Route path="/it-declaration" element={<ProtectedRoute><ITDeclarationPortal /></ProtectedRoute>} />
            <Route path="/it-declaration-history" element={<ProtectedRoute><ITDeclarationHistory /></ProtectedRoute>} />
            <Route path="/profile"  element={<ProtectedRoute><MyProfilePage /></ProtectedRoute>} />

            {/* Catch all */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </div>
    </UserContext.Provider>
  );
};

function App() {
  const getBasename = () => {
    const path = window.location.pathname;
    if (path.startsWith('/IIPEPayroll')) return '/IIPEPayroll';
    if (path.startsWith('/IIPE')) return '/IIPE';
    if (path.startsWith('/IIPMPayroll')) return '/IIPMPayroll';
    return '';
  };

  return (
    <Router basename={getBasename()}>
      <AppContent />
    </Router>
  );
}

export default App;
