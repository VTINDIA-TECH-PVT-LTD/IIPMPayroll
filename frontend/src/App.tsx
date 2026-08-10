import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import apiService from './services/api';
import Navbar from './components/Navbar';
import Topbar from './components/Topbar';
import LoginPage from './pages/LoginPage';
import AdminDashboard from './pages/AdminDashboard';
import PayrollManagement from './pages/PayrollManagement';
import EmployeePortal from './pages/EmployeePortal';
import Form16Portal from './pages/Form16Portal';
import ITDeclarationPortal from './pages/ITDeclarationPortal';
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

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(apiService.isAuthenticated());
  const [role,     setRole]     = useState<string | null>(apiService.getRole());
  const [userId,   setUserId]   = useState<string | null>(apiService.getUserId());
  const [username, setUsername] = useState<string | null>(null);

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

  const handleLogout = () => {
    setIsAuthenticated(false);
    setRole(null);
    setUserId(null);
    setUsername(null);
    localStorage.removeItem('authToken');
  };

  const defaultRoute = () => {
    if (role === 'SUPER_ADMIN') return <AdminDashboard />;
    if (role === 'ADMIN_ADMIN' || role === 'ADMIN_OPERATOR') return <UserManagement />;
    if (role === 'FA_ADMIN') return <AdminDashboard />; // Pending Salary / Approvals screen later
    if (role === 'FA_OPERATOR') return <PayrollManagement />;
    return <EmployeePortal />;
  };

  return (
    <UserContext.Provider value={{ isAuthenticated, role, userId, username }}>
      <Router basename="/IIPMPayroll">
        <div className="App">
          {isAuthenticated && <Navbar onLogout={handleLogout} />}
          <div className={isAuthenticated ? 'main-content' : 'auth-wrapper'} style={!isAuthenticated ? { width: '100%', flex: 1 } : {}}>
            {isAuthenticated && <Topbar onLogout={handleLogout} />}
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
              <Route path="/arrears"    element={<RoleRoute allowedRoles={['SUPER_ADMIN', 'FA_OPERATOR']}><ArrearsCalculator /></RoleRoute>} />

              {/* Reports */}
              <Route path="/reports"  element={<RoleRoute allowedRoles={['SUPER_ADMIN', 'FA_OPERATOR', 'FA_ADMIN']}><ReportsPage /></RoleRoute>} />

              {/* Employee */}
              <Route path="/payslips" element={<ProtectedRoute><EmployeePortal /></ProtectedRoute>} />
              <Route path="/form16"   element={<ProtectedRoute><Form16Portal /></ProtectedRoute>} />
              <Route path="/it-declaration" element={<ProtectedRoute><ITDeclarationPortal /></ProtectedRoute>} />
              <Route path="/profile"  element={<ProtectedRoute><MyProfilePage /></ProtectedRoute>} />

              {/* Catch all */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </div>
      </Router>
    </UserContext.Provider>
  );
}

export default App;
