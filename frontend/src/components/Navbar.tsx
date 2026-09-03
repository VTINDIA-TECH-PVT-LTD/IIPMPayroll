import React, { useContext, useState, useEffect, useRef } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { UserContext } from '../App';
import api from '../services/api';
import iipeLogo from '../assets/logoBase64';
import '../styles/Navbar.css';
import { 
  LayoutDashboard, Users, Settings, Database,
  Banknote, FileCheck, CheckSquare, IndianRupee,
  FileText, Receipt, FileSignature
} from 'lucide-react';

interface NavbarProps {
  onLogout: () => void;
  isOpen?: boolean;
  onClose?: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ onLogout, isOpen = false, onClose }) => {
  const userCtx = useContext(UserContext);
  const navigate = useNavigate();
  const role = userCtx?.role || '';
  const username = userCtx?.username || 'User';

  const handleLogout = () => {
    onLogout();
    onClose?.();
    navigate('/login');
  };

  const handleLinkClick = () => {
    onClose?.();
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
    <>
      {isOpen && <div className="sidebar-backdrop" onClick={onClose} />}
      <aside className={`sidebar ${isOpen ? 'sidebar-open' : ''}`}>
        <div className="sidebar-brand">
          {isOpen && (
            <button className="sidebar-close-btn" onClick={onClose} aria-label="Close sidebar">✕</button>
          )}
          <img src={iipeLogo} alt="IIPE" className="sidebar-brand-logo" />
          <div className="sidebar-brand-text">
            <div className="sidebar-brand-name">IIPE Payroll</div>
            <div className="sidebar-brand-sub">Management System</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          <div className="sidebar-section-label">Overview</div>
          <NavLink to="/" className={({ isActive }) => `sidebar-nav-link${isActive ? ' active' : ''}`} end onClick={handleLinkClick}>
            <span className="sidebar-nav-icon"><LayoutDashboard size={20} /></span> Dashboard
          </NavLink>

          {(role === 'SUPER_ADMIN' || role === 'ADMIN_ADMIN' || role === 'ADMIN_OPERATOR') && (
            <>
              <div className="sidebar-section-label">Administration</div>
              <NavLink to="/users" className={({ isActive }) => `sidebar-nav-link${isActive ? ' active' : ''}`} onClick={handleLinkClick}>
                <span className="sidebar-nav-icon"><Users size={20} /></span> Employees
              </NavLink>
              {(role === 'SUPER_ADMIN' || role === 'ADMIN_ADMIN') && (
                <NavLink to="/settings" className={({ isActive }) => `sidebar-nav-link${isActive ? ' active' : ''}`} onClick={handleLinkClick}>
                  <span className="sidebar-nav-icon"><Settings size={20} /></span> Settings
                </NavLink>
              )}
              {(role === 'SUPER_ADMIN' || role === 'ADMIN_ADMIN') && (
                <NavLink to="/data" className={({ isActive }) => `sidebar-nav-link${isActive ? ' active' : ''}`} onClick={handleLinkClick}>
                  <span className="sidebar-nav-icon"><Database size={20} /></span> Data Management
                </NavLink>
              )}
            </>
          )}

          {(role === 'SUPER_ADMIN' || role === 'FA_OPERATOR') && (
            <>
              <div className="sidebar-section-label">Payroll Processing</div>
              <NavLink to="/payroll" className={({ isActive }) => `sidebar-nav-link${isActive ? ' active' : ''}`} onClick={handleLinkClick}>
                <span className="sidebar-nav-icon"><Banknote size={20} /></span> Salary Processing
              </NavLink>
            </>
          )}

          {(role === 'SUPER_ADMIN' || role === 'FA_ADMIN' || role === 'FA_OPERATOR') && (
            <>
              <div className="sidebar-section-label">Approvals</div>
              {(role === 'SUPER_ADMIN' || role === 'FA_ADMIN') && (
                <NavLink to="/approvals" className={({ isActive }) => `sidebar-nav-link${isActive ? ' active' : ''}`} onClick={handleLinkClick}>
                  <span className="sidebar-nav-icon"><FileCheck size={20} /></span> Pending Salary
                </NavLink>
              )}
              {(role === 'SUPER_ADMIN' || role === 'FA_OPERATOR') && (
                <NavLink to="/it-approvals" className={({ isActive }) => `sidebar-nav-link${isActive ? ' active' : ''}`} onClick={handleLinkClick}>
                  <span className="sidebar-nav-icon"><CheckSquare size={20} /></span> IT Approvals
                </NavLink>
              )}
            </>
          )}

          {(role === 'SUPER_ADMIN' || role === 'FA_OPERATOR' || role === 'FA_ADMIN') && (
            <>
              {(role === 'SUPER_ADMIN' || role === 'FA_OPERATOR') && (
                <NavLink to="/arrears" className={({ isActive }) => `sidebar-nav-link${isActive ? ' active' : ''}`} onClick={handleLinkClick}>
                  <span className="sidebar-nav-icon"><IndianRupee size={20} /></span> Arrears
                </NavLink>
              )}
              <div className="sidebar-section-label">Reports</div>
              <NavLink to="/reports" className={({ isActive }) => `sidebar-nav-link${isActive ? ' active' : ''}`} onClick={handleLinkClick}>
                <span className="sidebar-nav-icon"><FileText size={20} /></span> Reports
              </NavLink>
            </>
          )}

          {(role === 'EMPLOYEE' || role === 'SUPER_ADMIN') && (
            <>
              <div className="sidebar-section-label">My Payroll</div>
              <NavLink to="/payslips" className={({ isActive }) => `sidebar-nav-link${isActive ? ' active' : ''}`} onClick={handleLinkClick}>
                <span className="sidebar-nav-icon"><Receipt size={20} /></span> My Payslips
              </NavLink>
              <NavLink to="/form16" className={({ isActive }) => `sidebar-nav-link${isActive ? ' active' : ''}`} onClick={handleLinkClick}>
                <span className="sidebar-nav-icon"><FileText size={20} /></span> Form 16
              </NavLink>
              <NavLink to="/it-declaration" className={({ isActive }) => `sidebar-nav-link${isActive ? ' active' : ''}`} onClick={handleLinkClick}>
                <span className="sidebar-nav-icon"><FileSignature size={20} /></span> IT Declaration
              </NavLink>
              <NavLink to="/it-declaration-history" className={({ isActive }) => `sidebar-nav-link${isActive ? ' active' : ''}`} onClick={handleLinkClick}>
                <span className="sidebar-nav-icon"><FileText size={20} /></span> Declaration History
              </NavLink>
            </>
          )}

        </nav>
      </aside>
    </>
  );
};

export default Navbar;