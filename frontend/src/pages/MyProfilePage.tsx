import React, { useContext, useState, useEffect } from 'react';
import { UserContext } from '../App';
import api from '../services/api';

const MyProfilePage: React.FC = () => {
  const userCtx = useContext(UserContext);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const [formData, setFormData] = useState({
    username: '',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    designation: '',
    profilePicture: ''
  });

  const [passwords, setPasswords] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    if (userCtx?.userId) {
      loadUserProfile();
    }
  }, [userCtx?.userId]);

  const loadUserProfile = async () => {
    if (!userCtx?.userId) return;
    try {
      setLoading(true);
      const user = await api.getUserById(userCtx.userId);
      if (user) {
        setFormData({
          username: user.username || '',
          firstName: user.firstName || '',
          lastName: user.lastName || '',
          email: user.email || '',
          phone: user.phone || '',
          designation: user.designation || '',
          profilePicture: user.profilePicture || ''
        });
      }
    } catch (e) {
      setMsg({ type: 'error', text: 'Failed to load profile details.' });
    } finally {
      setLoading(false);
    }
  };

  const handleProfilePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev: any) => {
        setFormData({ ...formData, profilePicture: ev.target.result });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userCtx?.userId) return;
    try {
      setLoading(true);
      // We do a PUT request to update the user details
      const user = await api.getUserById(userCtx.userId); // get old details to satisfy all required fields if needed
      await api.updateUser(userCtx.userId, {
        ...user,
        ...formData
      });
      setMsg({ type: 'success', text: 'Profile updated successfully!' });
      // Notify App.tsx to reload the profile picture if necessary, or just rely on reload
      setTimeout(() => window.location.reload(), 1500);
    } catch (e: any) {
      setMsg({ type: 'error', text: 'Failed to update profile: ' + (e.response?.data?.message || e.message) });
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userCtx?.userId) return;
    if (passwords.newPassword !== passwords.confirmPassword) {
      setMsg({ type: 'error', text: 'New passwords do not match!' });
      return;
    }
    try {
      setLoading(true);
      await api.api.post(`/users/${userCtx.userId}/change-password`, {
        oldPassword: passwords.oldPassword,
        newPassword: passwords.newPassword
      });
      setMsg({ type: 'success', text: 'Password changed successfully!' });
      setPasswords({ oldPassword: '', newPassword: '', confirmPassword: '' });
    } catch (e: any) {
      setMsg({ type: 'error', text: 'Failed to change password: ' + (e.response?.data?.message || e.message) });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container">
      <div className="page-header-iipm">
        <h1 className="page-title-iipm">My Profile</h1>
        <p className="page-subtitle-iipm">View and update your personal information and settings</p>
      </div>

      {msg && (
        <div className={`alert-iipm ${msg.type === 'success' ? 'alert-success' : 'alert-danger'}`} style={{ marginBottom: '20px' }}>
          {msg.text}
          <button onClick={() => setMsg(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontSize: '1rem' }}>✕</button>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px' }}>
        
        {/* Profile Card */}
        <div className="card-iipm" style={{ textAlign: 'center', padding: '32px 24px' }}>
          <div style={{ position: 'relative', display: 'inline-block', marginBottom: '16px' }}>
            {formData.profilePicture ? (
              <img src={formData.profilePicture} alt="Profile" style={{ width: '120px', height: '120px', borderRadius: '50%', objectFit: 'cover', border: '4px solid white', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
            ) : (
              <div style={{ width: '120px', height: '120px', borderRadius: '50%', background: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.5rem', fontWeight: 600, margin: '0 auto', border: '4px solid white', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                {userCtx?.username?.slice(0, 2).toUpperCase()}
              </div>
            )}
            <label style={{ position: 'absolute', bottom: '0', right: '0', background: 'var(--accent)', color: 'white', width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.2)' }}>
              📷
              <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleProfilePhotoUpload} />
            </label>
          </div>
          <h2 style={{ margin: '0 0 8px 0', fontSize: '1.4rem' }}>{formData.firstName} {formData.lastName}</h2>
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontWeight: 500 }}>{formData.designation || 'Employee'}</p>
          <div style={{ marginTop: '24px', paddingTop: '24px', borderTop: '1px solid var(--border)' }}>
            <p style={{ margin: '0 0 8px 0', color: 'var(--text-muted)' }}>Role</p>
            <span className="badge-iipm badge-info">{userCtx?.role}</span>
          </div>
        </div>

        {/* Edit Forms */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Profile Details Form */}
          <div className="card-iipm" style={{ padding: '24px' }}>
            <h3 style={{ marginBottom: '24px', borderBottom: '1px solid var(--border)', paddingBottom: '16px' }}>Personal Details</h3>
            <form onSubmit={handleProfileSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div className="form-group-iipm">
                  <label className="form-label-iipm">First Name</label>
                  <input type="text" className="form-control-iipm" value={formData.firstName} onChange={e => setFormData({...formData, firstName: e.target.value})} required />
                </div>
                <div className="form-group-iipm">
                  <label className="form-label-iipm">Last Name</label>
                  <input type="text" className="form-control-iipm" value={formData.lastName} onChange={e => setFormData({...formData, lastName: e.target.value})} />
                </div>
                <div className="form-group-iipm">
                  <label className="form-label-iipm">Username</label>
                  <input type="text" className="form-control-iipm" value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} required />
                </div>
                <div className="form-group-iipm">
                  <label className="form-label-iipm">Email Address</label>
                  <input type="email" className="form-control-iipm" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                </div>
                <div className="form-group-iipm">
                  <label className="form-label-iipm">Phone Number</label>
                  <input type="text" className="form-control-iipm" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                </div>
                <div className="form-group-iipm">
                  <label className="form-label-iipm">Designation</label>
                  <input type="text" className="form-control-iipm" value={formData.designation} onChange={e => setFormData({...formData, designation: e.target.value})} />
                </div>
              </div>
              <div style={{ marginTop: '24px', textAlign: 'right' }}>
                <button type="submit" className="btn-primary-iipm" disabled={loading}>
                  {loading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>

          {/* Change Password Form */}
          <div className="card-iipm" style={{ padding: '24px' }}>
            <h3 style={{ marginBottom: '24px', borderBottom: '1px solid var(--border)', paddingBottom: '16px' }}>Change Password</h3>
            <form onSubmit={handlePasswordSubmit}>
              {/* Hidden username field to help browser password managers trigger autofill */}
              <input type="text" name="username" value={formData.username} autoComplete="username" style={{ display: 'none' }} readOnly />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px', maxWidth: '400px' }}>
                  <div className="form-group-iipm">
                    <label className="form-label-iipm">Current Password</label>
                    <div style={{ position: 'relative' }}>
                      <input type={showOldPassword ? "text" : "password"} className="form-control-iipm" value={passwords.oldPassword} onChange={e => setPasswords({...passwords, oldPassword: e.target.value})} autoComplete="current-password" required style={{ paddingRight: '40px' }} />
                      <button type="button" onClick={() => setShowOldPassword(!showOldPassword)} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', color: 'var(--text-muted)' }}>
                        {showOldPassword ? '🙈' : '👁'}
                      </button>
                    </div>
                  </div>
                  <div className="form-group-iipm">
                    <label className="form-label-iipm">New Password</label>
                    <div style={{ position: 'relative' }}>
                      <input type={showNewPassword ? "text" : "password"} className="form-control-iipm" value={passwords.newPassword} onChange={e => setPasswords({...passwords, newPassword: e.target.value})} autoComplete="new-password" required style={{ paddingRight: '40px' }} />
                      <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', color: 'var(--text-muted)' }}>
                        {showNewPassword ? '🙈' : '👁'}
                      </button>
                    </div>
                  </div>
                  <div className="form-group-iipm">
                    <label className="form-label-iipm">Confirm New Password</label>
                    <div style={{ position: 'relative' }}>
                      <input type={showConfirmPassword ? "text" : "password"} className="form-control-iipm" value={passwords.confirmPassword} onChange={e => setPasswords({...passwords, confirmPassword: e.target.value})} autoComplete="new-password" required style={{ paddingRight: '40px' }} />
                      <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', color: 'var(--text-muted)' }}>
                        {showConfirmPassword ? '🙈' : '👁'}
                      </button>
                    </div>
                  </div>
              </div>
              <div style={{ marginTop: '24px' }}>
                <button type="submit" className="btn-primary-iipm" disabled={loading}>
                  {loading ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>

        </div>
      </div>
    </div>
  );
};

export default MyProfilePage;
