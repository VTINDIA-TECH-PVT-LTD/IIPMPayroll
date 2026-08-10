import React, { useContext, useState, useEffect, useRef } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { UserContext } from '../App';
import api from '../services/api';
import '../styles/Navbar.css';

interface NavbarProps {
  onLogout: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ onLogout }) => {
  const userCtx = useContext(UserContext);
  const navigate = useNavigate();
  const role = userCtx?.role || '';
  const username = userCtx?.username || 'User';

  const handleLogout = () => {
    onLogout();
    navigate('/login');
  };

  const getInitials = (name: string) => name.slice(0, 2).toUpperCase();

  const getRoleLabel = (r: string) => {
    const map: Record<string, string> = {
      SUPER_ADMIN: 'Super Administrator',
      FA_ADMIN: 'F&A Admin',
      FA_OPERATOR: 'F&A Operator',
      ADMIN_ADMIN: 'Administration Admin',
      ADMIN_OPERATOR: 'Administration Operator',
      EMPLOYEE: 'Employee'
    };
    return map[r] || 'Employee';
  };

  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (userCtx?.userId) {
      api.getNotifications(userCtx.userId).then(data => setNotifications(data || [])).catch(console.error);
    }
  }, [userCtx?.userId]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleNotificationClick = async (n: any) => {
    if (!n.read) {
      try {
        await api.markNotificationRead(n.id);
        setNotifications(notifications.map(x => x.id === n.id ? { ...x, read: true } : x));
      } catch (e) {
        console.error(e);
      }
    }
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <img src="/logo.png" alt="IIPM" className="sidebar-brand-logo" onError={(e) => {
          (e.target as HTMLImageElement).style.display = 'none';
        }} />
        <div className="sidebar-brand-text">
          <div className="sidebar-brand-name">IIPM Payroll</div>
          <div className="sidebar-brand-sub">Management System</div>
        </div>
      </div>

      <nav className="sidebar-nav">
        <div className="sidebar-section-label">Overview</div>
        <NavLink to="/" className={({ isActive }) => `sidebar-nav-link${isActive ? ' active' : ''}`} end>
          <span className="sidebar-nav-icon">🏠</span> Dashboard
        </NavLink>

        {(role === 'SUPER_ADMIN' || role === 'ADMIN_ADMIN' || role === 'ADMIN_OPERATOR') && (
          <>
            <div className="sidebar-section-label">Administration</div>
            <NavLink to="/users" className={({ isActive }) => `sidebar-nav-link${isActive ? ' active' : ''}`}>
              <span className="sidebar-nav-icon">👥</span> Employees
            </NavLink>
            {(role === 'SUPER_ADMIN' || role === 'ADMIN_ADMIN') && (
              <NavLink to="/settings" className={({ isActive }) => `sidebar-nav-link${isActive ? ' active' : ''}`}>
                <span className="sidebar-nav-icon">⚙️</span> Settings
              </NavLink>
            )}
            {(role === 'SUPER_ADMIN' || role === 'ADMIN_ADMIN') && (
              <NavLink to="/data" className={({ isActive }) => `sidebar-nav-link${isActive ? ' active' : ''}`}>
                <span className="sidebar-nav-icon">💾</span> Data Management
              </NavLink>
            )}
          </>
        )}

        {(role === 'SUPER_ADMIN' || role === 'FA_OPERATOR') && (
          <>
            <div className="sidebar-section-label">Payroll Processing</div>
            <NavLink to="/payroll" className={({ isActive }) => `sidebar-nav-link${isActive ? ' active' : ''}`}>
              <span className="sidebar-nav-icon">₹</span> Salary Processing
            </NavLink>
          </>
        )}

        {(role === 'SUPER_ADMIN' || role === 'FA_ADMIN' || role === 'FA_OPERATOR') && (
          <>
            <div className="sidebar-section-label">Approvals</div>
            {(role === 'SUPER_ADMIN' || role === 'FA_ADMIN') && (
              <NavLink to="/approvals" className={({ isActive }) => `sidebar-nav-link${isActive ? ' active' : ''}`}>
                <span className="sidebar-nav-icon">✓</span> Pending Salary
              </NavLink>
            )}
            {(role === 'SUPER_ADMIN' || role === 'FA_OPERATOR') && (
              <NavLink to="/it-approvals" className={({ isActive }) => `sidebar-nav-link${isActive ? ' active' : ''}`}>
                <span className="sidebar-nav-icon">✓</span> IT Approvals
              </NavLink>
            )}
          </>
        )}

        {(role === 'SUPER_ADMIN' || role === 'FA_OPERATOR' || role === 'FA_ADMIN') && (
          <>
            {(role === 'SUPER_ADMIN' || role === 'FA_OPERATOR') && (
              <NavLink to="/arrears" className={({ isActive }) => `sidebar-nav-link${isActive ? ' active' : ''}`}>
                <span className="sidebar-nav-icon">⇌</span> Arrears
              </NavLink>
            )}
            <div className="sidebar-section-label">Reports</div>
            <NavLink to="/reports" className={({ isActive }) => `sidebar-nav-link${isActive ? ' active' : ''}`}>
              <span className="sidebar-nav-icon">📊</span> Reports
            </NavLink>
          </>
        )}

        {(role === 'EMPLOYEE' || role === 'SUPER_ADMIN') && (
          <>
            <div className="sidebar-section-label">My Payroll</div>
            <NavLink to="/payslips" className={({ isActive }) => `sidebar-nav-link${isActive ? ' active' : ''}`}>
              <span className="sidebar-nav-icon">📄</span> My Payslips
            </NavLink>
            <NavLink to="/form16" className={({ isActive }) => `sidebar-nav-link${isActive ? ' active' : ''}`}>
              <span className="sidebar-nav-icon">📑</span> Form 16
            </NavLink>
            <NavLink to="/it-declaration" className={({ isActive }) => `sidebar-nav-link${isActive ? ' active' : ''}`}>
              <span className="sidebar-nav-icon">📋</span> IT Declaration
            </NavLink>
          </>
        )}

      </nav>
    </aside>
  );
};

export default Navbar;