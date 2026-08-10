import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import apiService from '../services/api';
import { UserContext } from '../App';
import { FileText, Download, ClipboardList, ArrowRight, TrendingUp, DollarSign, Minus, CheckCircle } from 'lucide-react';

const EmployeeDashboard: React.FC = () => {
  const userCtx = useContext(UserContext);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [ytd, setYtd] = useState<any>(null);
  const [recentPayslip, setRecentPayslip] = useState<any>(null);

  useEffect(() => {
    if (userCtx?.userId) {
      loadDashboardData();
    }
  }, [userCtx?.userId]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [payrollData, ytdData] = await Promise.allSettled([
        apiService.getPayrollsByUser(userCtx!.userId!),
        apiService.getYTDReport(userCtx!.userId!),
      ]);

      if (ytdData.status === 'fulfilled') {
        setYtd(ytdData.value);
      }

      if (payrollData.status === 'fulfilled') {
        const payrolls = payrollData.value || [];
        if (payrolls.length > 0) {
          payrolls.sort((a: any, b: any) => {
            if (a.year !== b.year) return b.year - a.year;
            return b.month - a.month;
          });
          setRecentPayslip(payrolls[0]);
        }
      }
    } catch (err) {
      console.error('Failed to load dashboard data', err);
    } finally {
      setLoading(false);
    }
  };

  const fmt = (num: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(num || 0);
  const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];

  if (loading) return (
    <div className="page-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
      <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
        <div className="spinner-iipm" style={{ margin: '0 auto 16px' }}></div>
        <p>Loading your dashboard...</p>
      </div>
    </div>
  );

  const ytdStats = [
    { label: 'Months Processed', value: ytd?.monthsProcessed ?? 0, color: '#3b82f6', icon: <TrendingUp size={20} color="#3b82f6" />, bg: '#eff6ff' },
    { label: 'Total Gross (YTD)', value: fmt(ytd?.totalGrossSalary), color: '#c9a84c', icon: <DollarSign size={20} color="#c9a84c" />, bg: '#fffbeb' },
    { label: 'Total TDS (YTD)', value: fmt(ytd?.totalTDS), color: '#ef4444', icon: <Minus size={20} color="#ef4444" />, bg: '#fef2f2' },
    { label: 'Total Net (YTD)', value: fmt(ytd?.totalNetSalary), color: '#22c55e', icon: <CheckCircle size={20} color="#22c55e" />, bg: '#f0fdf4' },
  ];

  const quickActions = [
    { label: 'My Payslips', desc: 'View & download your payslips', icon: <FileText size={20} />, path: '/payslips', primary: true },
    { label: 'Download Form 16', desc: 'Annual TDS certificate', icon: <Download size={20} />, path: '/form16', primary: false },
    { label: 'Update IT Declaration', desc: 'Submit your deductions & regime', icon: <ClipboardList size={20} />, path: '/it-declaration', primary: false },
  ];

  return (
    <div className="page-container">
      {/* Page Header */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
          Welcome back, {userCtx?.username}! 👋
        </h1>
        <p style={{ fontSize: '1rem', color: 'var(--text-muted)', marginTop: '6px' }}>
          Here is your current payroll overview and quick actions.
        </p>
      </div>

      {/* YTD Summary */}
      <h2 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '14px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        Year to Date (YTD) Summary — {new Date().getFullYear()}
      </h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '36px' }}>
        {ytdStats.map((s, i) => (
          <div key={i} style={{
            padding: '20px 24px',
            borderRadius: '14px',
            background: '#fff',
            border: '1px solid var(--border)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {s.icon}
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>{s.label}</span>
            </div>
            <div style={{ fontSize: '1.6rem', color: s.color, fontWeight: 800, lineHeight: 1 }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Quick Actions + Recent Payslip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>

        {/* Quick Actions Card */}
        <div style={{
          background: '#fff',
          borderRadius: '16px',
          border: '1px solid var(--border)',
          boxShadow: '0 2px 12px rgba(0,0,0,0.05)',
          padding: '28px',
        }}>
          <h3 style={{ margin: '0 0 20px', fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)', paddingBottom: '14px', borderBottom: '1px solid var(--border)' }}>
            Quick Actions
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {quickActions.map((action, i) => (
              <button
                key={i}
                onClick={() => navigate(action.path)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                  padding: '14px 18px',
                  borderRadius: '12px',
                  border: action.primary ? 'none' : '1.5px solid var(--border)',
                  background: action.primary ? '#153C7D' : '#fff',
                  color: action.primary ? '#fff' : 'var(--text-main)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.18s ease',
                  boxShadow: action.primary ? '0 4px 14px rgba(21,60,125,0.25)' : 'none',
                  width: '100%',
                }}
              >
                <div style={{
                  width: '40px', height: '40px', borderRadius: '10px', flexShrink: 0,
                  background: action.primary ? 'rgba(255,255,255,0.2)' : '#f1f5f9',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {React.cloneElement(action.icon as React.ReactElement<any>, { color: action.primary ? '#fff' : '#153C7D' })}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{action.label}</div>
                  <div style={{ fontSize: '0.78rem', color: action.primary ? 'rgba(255,255,255,0.75)' : 'var(--text-muted)', marginTop: '2px' }}>
                    {action.desc}
                  </div>
                </div>
                <ArrowRight size={16} style={{ opacity: 0.6, flexShrink: 0 }} />
              </button>
            ))}
          </div>
        </div>

        {/* Recent Payslip Card */}
        <div style={{
          background: '#fff',
          borderRadius: '16px',
          border: '1px solid var(--border)',
          boxShadow: '0 2px 12px rgba(0,0,0,0.05)',
          padding: '28px',
          display: 'flex',
          flexDirection: 'column',
        }}>
          <h3 style={{ margin: '0 0 20px', fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)', paddingBottom: '14px', borderBottom: '1px solid var(--border)' }}>
            Recent Payslip
          </h3>
          {recentPayslip ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <span style={{
                display: 'inline-block', background: '#eff6ff', color: '#153C7D',
                borderRadius: '20px', padding: '5px 16px', fontSize: '0.82rem', fontWeight: 700, alignSelf: 'flex-start',
              }}>
                {months[recentPayslip.month - 1]} {recentPayslip.year}
              </span>
              <div style={{ marginTop: '18px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {[
                  { label: 'Gross Salary', value: fmt(recentPayslip.grossSalary), color: 'var(--text-main)' },
                  { label: 'TDS Deducted', value: fmt(recentPayslip.tds || 0), color: '#ef4444' },
                  { label: 'Net Salary', value: fmt(recentPayslip.netSalary), color: '#22c55e' },
                ].map((row, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: '#f8fafc', borderRadius: '10px' }}>
                    <span style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>{row.label}</span>
                    <span style={{ fontWeight: 700, fontSize: '0.95rem', color: row.color }}>{row.value}</span>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: '20px' }}>
                <button
                  onClick={() => navigate('/payslips')}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                    padding: '13px 20px', background: '#153C7D', color: '#fff',
                    border: 'none', borderRadius: '12px', fontWeight: 700, fontSize: '0.9rem',
                    cursor: 'pointer', boxShadow: '0 4px 14px rgba(21,60,125,0.2)',
                  }}
                >
                  <FileText size={16} /> View All Payslips
                </button>
              </div>
            </div>
          ) : (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 20px', textAlign: 'center' }}>
              <div style={{ width: '56px', height: '56px', background: '#f1f5f9', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '14px' }}>
                <FileText size={24} color="#94a3b8" />
              </div>
              <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.9rem', fontWeight: 500 }}>No recent payslips available.</p>
              <p style={{ color: 'var(--text-muted)', margin: '6px 0 0', fontSize: '0.8rem' }}>Your payslips will appear here once processed.</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default EmployeeDashboard;
