import React, { useContext, useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserContext } from '../App';
import api from '../services/api';
import { Menu } from 'lucide-react';
import '../styles/Topbar.css';

interface TopbarProps {
  onLogout: () => void;
  onToggleSidebar?: () => void;
}

const typeIcon: Record<string, string> = {
  IT_DECLARATION_SUBMITTED:  '📋',
  IT_DECLARATION_APPROVED:   '✅',
  IT_DECLARATION_REJECTED:   '❌',
  ARREAR_CREATED:            '💰',
  ARREAR_APPROVED:           '✅',
  ARREAR_REJECTED:           '❌',
  ARREAR_PAID:               '💸',
  PROMOTION_ARREAR:          '🎉',
  PAYROLL_PROCESSED:         '📊',
  LOGIN:                     '🔑',
  DEFAULT:                   '🔔',
};

const getIcon = (type: string) => typeIcon[type] || typeIcon.DEFAULT;

const Topbar: React.FC<TopbarProps> = ({ onLogout, onToggleSidebar }) => {
  const userCtx = useContext(UserContext);
  const navigate = useNavigate();
  const role = userCtx?.role || '';
  const username = userCtx?.username || 'User';

  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);

  const [profilePic, setProfilePic] = useState<string | null>(null);

  const getInitials = (name: string) => name.slice(0, 2).toUpperCase();
  const getRoleLabel = (r: string) => {
    if (r === 'SUPER_ADMIN') return 'Super Admin';
    if (r === 'FA_ADMIN') return 'F&A Admin';
    if (r === 'FA_OPERATOR') return 'F&A Operator';
    if (r === 'ADMIN_ADMIN') return 'Admin';
    if (r === 'ADMIN_OPERATOR') return 'Admin Operator';
    return 'Employee';
  };

  const loadNotifications = useCallback(async () => {
    if (!userCtx?.userId) return;
    try {
      const data = await api.getNotifications(userCtx.userId);
      setNotifications(Array.isArray(data) ? data : []);
    } catch (e) { console.error('Failed to load notifications', e); }
  }, [userCtx?.userId]);

  useEffect(() => {
    if (userCtx?.userId) {
      loadNotifications();
      api.getUserById(userCtx.userId).then(user => {
        if (user?.profilePicture) setProfilePic(user.profilePicture);
      }).catch(console.error);
    }
  }, [userCtx?.userId, loadNotifications]);

  // Poll for new notifications every 30 seconds
  useEffect(() => {
    if (!userCtx?.userId) return;
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, [userCtx?.userId, loadNotifications]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node)) {
        setShowProfileMenu(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadCount = notifications.filter(n => !n.read && !n.isRead).length;

  const handleNotificationClick = async (n: any) => {
    const isRead = n.read || n.isRead;
    if (!isRead) {
      try {
        await api.markNotificationRead(n.id);
        setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, read: true, isRead: true } : x));
      } catch (e) { console.error(e); }
    }
  };

  const handleDismiss = async (e: React.MouseEvent, n: any) => {
    e.stopPropagation();
    try {
      await api.dismissNotification(n.id);
      setNotifications(prev => prev.filter(x => x.id !== n.id));
    } catch (e) { console.error(e); }
  };

  const handleMarkAllRead = async () => {
    if (!userCtx?.userId) return;
    try {
      await api.markAllNotificationsRead(userCtx.userId);
      setNotifications(prev => prev.map(x => ({ ...x, read: true, isRead: true })));
    } catch (e) { console.error(e); }
  };

  const handleClearAll = async () => {
    if (!userCtx?.userId) return;
    try {
      await api.clearAllNotifications(userCtx.userId);
      setNotifications([]);
    } catch (e) { console.error(e); }
  };

  const handleLogout = () => {
    onLogout();
    navigate('/login');
  };

  const fmtTime = (val: any): string => {
    if (!val) return '';
    let d: Date;
    if (Array.isArray(val)) {
      d = new Date(val[0], (val[1] ?? 1) - 1, val[2] ?? 1, val[3] ?? 0, val[4] ?? 0, val[5] ?? 0);
    } else {
      d = new Date(val);
    }
    if (isNaN(d.getTime())) return '';
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHrs = Math.floor(diffMins / 60);
    if (diffHrs < 24) return `${diffHrs}h ago`;
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
  };

  return (
    <header className="topbar">
      <div className="topbar-left">
        {onToggleSidebar && (
          <button 
            className="topbar-hamburger-btn" 
            onClick={onToggleSidebar}
            aria-label="Toggle navigation menu"
            type="button"
          >
            <Menu size={22} />
          </button>
        )}
        <div className="topbar-title-mobile">IIPE Payroll</div>
      </div>

      <div className="topbar-right">
        {/* Notifications */}
        <div className="topbar-item" ref={notificationRef}>
          <button className="topbar-icon-btn" onClick={() => setShowNotifications(!showNotifications)}>
            🔔
            {unreadCount > 0 && <span className="topbar-badge">{unreadCount}</span>}
          </button>

          {showNotifications && (
            <div className="topbar-dropdown notifications-dropdown">
              <div className="dropdown-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid #e2e8f0' }}>
                <span style={{ fontWeight: 700, fontSize: '0.95rem', color: '#1e293b' }}>
                  Notifications {unreadCount > 0 && <span style={{ background: '#ef4444', color: '#fff', borderRadius: '10px', padding: '1px 7px', fontSize: '0.72rem', marginLeft: '6px' }}>{unreadCount}</span>}
                </span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {unreadCount > 0 && (
                    <button onClick={handleMarkAllRead} style={{ background: 'none', border: 'none', color: '#3b82f6', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 600 }}>
                      Mark all read
                    </button>
                  )}
                  {notifications.length > 0 && (
                    <button onClick={handleClearAll} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '0.75rem', cursor: 'pointer' }}>
                      Clear all
                    </button>
                  )}
                </div>
              </div>

              <div className="dropdown-body" style={{ maxHeight: '380px', overflowY: 'auto' }}>
                {notifications.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '32px 16px', color: '#94a3b8' }}>
                    <div style={{ fontSize: '2rem', marginBottom: '8px' }}>🔔</div>
                    <div style={{ fontSize: '0.85rem' }}>No notifications</div>
                  </div>
                ) : (
                  notifications.map(n => {
                    const isRead = n.read || n.isRead;
                    return (
                      <div
                        key={n.id}
                        onClick={() => handleNotificationClick(n)}
                        style={{
                          padding: '12px 16px',
                          borderBottom: '1px solid #f1f5f9',
                          cursor: 'pointer',
                          background: isRead ? '#ffffff' : '#eff6ff',
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '10px',
                          transition: 'background 0.15s',
                          position: 'relative',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = isRead ? '#f8fafc' : '#dbeafe'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = isRead ? '#ffffff' : '#eff6ff'; }}
                      >
                        <span style={{ fontSize: '1.3rem', flexShrink: 0, marginTop: '1px' }}>{getIcon(n.type)}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: isRead ? 500 : 700, fontSize: '0.83rem', color: '#1e293b', marginBottom: '2px' }}>{n.title}</div>
                          <div style={{ fontSize: '0.78rem', color: '#64748b', lineHeight: 1.4, wordBreak: 'break-word' }}>{n.message}</div>
                          <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '4px' }}>{fmtTime(n.createdAt)}</div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                          {!isRead && (
                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#3b82f6', flexShrink: 0 }} title="Unread" />
                          )}
                          <button
                            onClick={(e) => handleDismiss(e, n)}
                            title="Dismiss"
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#cbd5e1', fontSize: '0.85rem', padding: '0', lineHeight: 1 }}
                            onMouseEnter={e => { e.currentTarget.style.color = '#ef4444'; }}
                            onMouseLeave={e => { e.currentTarget.style.color = '#cbd5e1'; }}
                          >
                            ×
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Profile */}
        <div className="topbar-item" ref={profileMenuRef}>
          <div className="profile-trigger" onClick={() => setShowProfileMenu(!showProfileMenu)}>
            {profilePic ? (
              <img src={profilePic} alt="Profile" className="profile-avatar-img" />
            ) : (
              <div className="profile-avatar">{getInitials(username)}</div>
            )}
            <div className="profile-info">
              <span className="profile-name">{username}</span>
              <span className="profile-role">{getRoleLabel(role)}</span>
            </div>
            <span className="dropdown-arrow">▼</span>
          </div>

          {showProfileMenu && (
            <div className="topbar-dropdown profile-dropdown">
              <div className="dropdown-item" onClick={() => { setShowProfileMenu(false); navigate('/profile'); }}>
                👤 My Profile
              </div>
              {(role === 'SUPER_ADMIN' || role === 'ADMIN_ADMIN') && (
                <div className="dropdown-item" onClick={() => { setShowProfileMenu(false); navigate('/settings'); }}>
                  ⚙️ Settings
                </div>
              )}
              <div className="dropdown-divider"></div>
              <div className="dropdown-item text-danger" onClick={handleLogout}>
                🚪 Logout
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Topbar;
