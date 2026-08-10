import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiService from '../services/api';
import '../styles/LoginPage.css';

interface LoginPageProps {
  onLogin: (token: any) => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('Please enter username and password.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const response = await apiService.login(username.trim(), password);
      onLogin(response);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      {/* Left Panel */}
      <div className="login-left">
        <img src={process.env.PUBLIC_URL + "/logo.png"} alt="IIPM Logo" className="login-logo"
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
        <div className="login-tagline">
          <h1>Indian Institute of<br />Petroleum & Energy</h1>
          <h2>Visakhapatnam</h2>
          <div className="divider-gold" />
        </div>
        <ul className="login-features">
          <li>7th CPC Pay Matrix Integration</li>
          <li>Automated NPS &amp; TDS Calculations</li>
          <li>Bulk Payroll Processing</li>
          <li>PDF Payslips &amp; Form 16</li>
          <li>Salary Register &amp; Reports</li>
          <li>Role-Based Access Control</li>
        </ul>
      </div>

      {/* Right Panel */}
      <div className="login-right">
        <div className="login-form-container">
          <div className="login-form-header" style={{ textAlign: 'center' }}>
            <img src={process.env.PUBLIC_URL + "/logo.png"} alt="IIPM Logo" className="login-logo-mobile"
                 onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            <h3>Welcome back</h3>
            <p>Sign in to access the Payroll Management System</p>
          </div>

          {error && (
            <div className="login-error">
              <span>⚠</span> {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="login-form-group">
              <label className="login-label">Username</label>
              <div className="login-input-wrap">
                <span className="login-input-icon">👤</span>
                <input
                  id="username"
                  type="text"
                  className="login-input"
                  placeholder="Enter your username"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  disabled={loading}
                  autoComplete="username"
                  autoFocus
                />
              </div>
            </div>

            <div className="login-form-group">
              <label className="login-label">Password</label>
              <div className="login-input-wrap">
                <span className="login-input-icon">🔒</span>
                <input
                  id="password"
                  type={showPwd ? 'text' : 'password'}
                  className="login-input"
                  placeholder="Enter your password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  disabled={loading}
                  autoComplete="current-password"
                  style={{ paddingRight: '42px' }}
                />
                <span
                  onClick={() => setShowPwd(p => !p)}
                  style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', color: 'var(--text-muted)', userSelect: 'none' }}
                >
                  {showPwd ? '🙈' : '👁'}
                </span>
              </div>
            </div>

            <button type="submit" className="login-btn" disabled={loading}>
              {loading ? (
                <><span className="spinner-border spinner-border-sm" style={{ width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.3)', borderTop: '2px solid #fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'inline-block' }}></span> Signing in...</>
              ) : (
                <><span>→</span> Sign In</>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
