import React, { useContext, useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserContext } from '../App';
import api from '../services/api';
import '../styles/Topbar.css';

interface TopbarProps {
  onLogout: () => void;
}

const Topbar: React.FC<TopbarProps> = ({ onLogout }) => {
  const userCtx = useContext(UserContext);
  const navigate = useNavigate();
  const role = userCtx?.role || '';
  const username = userCtx?.username || 'User';

  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);

  const getInitials = (name: string) => name.slice(0, 2).toUpperCase();
  const getRoleLabel = (r: string) => {
    if (r === 'ADMIN') return 'Administrator';
    if (r === 'PAYROLL_OFFICER') return 'Payroll Officer';
    return 'Employee';
  };

  const [profilePic, setProfilePic] = useState<string | null>(null);

  useEffect(() => {
    if (userCtx?.userId) {
      api.getNotifications(userCtx.userId).then(data => setNotifications(data || [])).catch(console.error);
      api.getUserById(userCtx.userId).then(user => {
        if (user?.profilePicture) setProfilePic(user.profilePicture);
      }).catch(console.error);
    }
  }, [userCtx?.userId]);

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

  const handleLogout = () => {
    onLogout();
    navigate('/login');
  };

  return (
    <header className="topbar">
      <div className="topbar-left">
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
              <div className="dropdown-header">Notifications</div>
              <div className="dropdown-body">
                {notifications.length === 0 ? (
                  <div className="empty-msg">No notifications</div>
                ) : (
                  notifications.map(n => (
                    <div key={n.id} className={`notification-item ${!n.read ? 'unread' : ''}`} onClick={() => handleNotificationClick(n)}>
                      <div className="notification-title">{n.title}</div>
                      <div className="notification-msg">{n.message}</div>
                    </div>
                  ))
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
