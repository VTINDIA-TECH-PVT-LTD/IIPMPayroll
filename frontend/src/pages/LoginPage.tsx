import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { User, Lock, Eye, EyeOff, ArrowRight, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import apiService from '../services/api';
import iipeLogo from '../assets/logoBase64';
import '../styles/LoginPage.css';

interface LoginPageProps {
  onLogin: (token: any) => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Active focus states for inputs to animate labels/borders
  const [activeInput, setActiveInput] = useState<'username' | 'password' | null>(null);

  const navigate = useNavigate();

  // Handle subtle background animation or mouse movement if needed
  useEffect(() => {
    // Add a class to body or container when mounted for entrance animation
    document.body.classList.add('login-mounted');
    return () => document.body.classList.remove('login-mounted');
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() && !password.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'Missing Details',
        text: 'Please fill in both the username and password.',
        confirmButtonColor: '#f59e0b',
        background: '#ffffff',
        customClass: { popup: 'rounded-xl' }
      });
      return;
    }
    if (!username.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'Missing Username',
        text: 'Please fill in your username.',
        confirmButtonColor: '#f59e0b',
        background: '#ffffff',
        customClass: { popup: 'rounded-xl' }
      });
      return;
    }
    if (!password.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'Missing Password',
        text: 'Please fill in your password.',
        confirmButtonColor: '#f59e0b',
        background: '#ffffff',
        customClass: { popup: 'rounded-xl' }
      });
      return;
    }
    setLoading(true);
    try {
      const response = await apiService.login(username.trim(), password);
      
      // Success Alert
      await Swal.fire({
        icon: 'success',
        title: 'Login Successful',
        text: 'Welcome to your Payroll Management System!',
        timer: 1500,
        showConfirmButton: false,
        background: '#ffffff',
        customClass: { popup: 'rounded-xl' }
      });

      onLogin(response);
      navigate('/');
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Invalid credentials. Please try again.';
      
      // Error Alert
      Swal.fire({
        icon: 'error',
        title: 'Login Failed',
        text: errorMsg,
        confirmButtonColor: '#ef4444',
        background: '#ffffff',
        customClass: { popup: 'rounded-xl' }
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      {/* Left Panel */}
      <div className="login-left">
        <div className="login-left-bg-grid"></div>
        <div className="particles-container">
          <div className="particle p-1">$</div>
          <div className="particle p-2">%</div>
          <div className="particle p-3">{`{ }`}</div>
          <div className="particle p-4">#</div>
          <div className="particle p-5">+</div>
          <div className="particle p-6">&lt;/&gt;</div>
        </div>
        <div className="login-left-content">
          <div className="logo-wrapper">
            <img src={iipeLogo} alt="IIPE Logo" className="login-logo" />
          </div>
          <div className="login-tagline">
            <h1>Indian Institute of<br />Petroleum & Energy</h1>
            <h2>Visakhapatnam</h2>
            <div className="divider-glow" />
          </div>
          
          <div className="features-container">
            <ul className="login-features">
              <li><CheckCircle2 className="feature-icon" size={18} /> <span>7th CPC Pay Matrix Integration</span></li>
              <li><CheckCircle2 className="feature-icon" size={18} /> <span>Automated NPS & TDS Calculations</span></li>
              <li><CheckCircle2 className="feature-icon" size={18} /> <span>Bulk Payroll Processing</span></li>
              <li><CheckCircle2 className="feature-icon" size={18} /> <span>PDF Payslips & Form 16</span></li>
              <li><CheckCircle2 className="feature-icon" size={18} /> <span>Salary Register & Reports</span></li>
              <li><CheckCircle2 className="feature-icon" size={18} /> <span>Role-Based Access Control</span></li>
            </ul>
          </div>
        </div>
      </div>

      {/* Right Panel */}
      <div className="login-right">
        <div className="login-right-bg-grid"></div>
        <div className="particles-container">
          <div className="particle p-1">@</div>
          <div className="particle p-2">₹</div>
          <div className="particle p-3">()</div>
          <div className="particle p-4">&amp;</div>
          <div className="particle p-5">*</div>
          <div className="particle p-6">/&gt;</div>
        </div>
        <div className="login-form-container">
            <div className="login-form-header">
              <img src={iipeLogo} alt="IIPE Logo" className="login-logo-mobile" />
              <h3>Welcome Back</h3>
              <p>Sign in to the Payroll Management System</p>
            </div>

            <form onSubmit={handleLogin} className="login-form">
              <div className={`login-form-group ${activeInput === 'username' || username ? 'active' : ''}`}>
                <div className="login-input-wrap">
                  <User className={`login-input-icon ${activeInput === 'username' ? 'text-accent' : ''}`} size={20} />
                  <div className="input-divider"></div>
                  <input
                    id="username"
                    type="text"
                    className="login-input"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    onFocus={() => setActiveInput('username')}
                    onBlur={() => setActiveInput(null)}
                    disabled={loading}
                    autoComplete="username"
                    autoFocus
                    placeholder=" "
                  />
                  <label htmlFor="username" className="floating-label">Username</label>
                </div>
              </div>

              <div className={`login-form-group ${activeInput === 'password' || password ? 'active' : ''}`}>
                <div className="login-input-wrap">
                  <Lock className={`login-input-icon ${activeInput === 'password' ? 'text-accent' : ''}`} size={20} />
                  <div className="input-divider"></div>
                  <input
                    id="password"
                    type={showPwd ? 'text' : 'password'}
                    className="login-input"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    onFocus={() => setActiveInput('password')}
                    onBlur={() => setActiveInput(null)}
                    disabled={loading}
                    autoComplete="current-password"
                    placeholder=" "
                  />
                  <label htmlFor="password" className="floating-label">Password</label>
                  <button
                    type="button"
                    className="password-toggle-btn"
                    onClick={() => setShowPwd(p => !p)}
                    tabIndex={-1}
                  >
                    {showPwd ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <button type="submit" className="login-btn" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="spinner" size={20} />
                    <span>Authenticating...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In</span>
                    <ArrowRight className="btn-icon" size={20} />
                  </>
                )}
                <div className="btn-glow"></div>
              </button>
            </form>
            
            <div className="login-footer">
              <p>Secure connection. <Lock size={12} className="inline-icon" /> encrypted data.</p>
            </div>
          </div>
        </div>
    </div>
  );
};

export default LoginPage;
