import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import apiService from '../services/api';
import { UserContext } from '../App';

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
          // Sort descending by year and month
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

  const fmt = (num: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(num || 0);
  const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];

  if (loading) return (
    <div className="page-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
      <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
        <div className="spinner-iipm" style={{ margin: '0 auto 16px' }}></div>
        <p>Loading your dashboard...</p>
      </div>
    </div>
  );

  return (
    <div className="page-container">
      <div className="page-header" style={{ marginBottom: '30px' }}>
        <h1 style={{ fontSize: '2.2rem', color: 'var(--text-primary)' }}>Welcome back, {userCtx?.username}!</h1>
        <p style={{ fontSize: '1.1rem', color: 'var(--text-muted)' }}>Here is your current payroll overview and quick actions.</p>
      </div>

      <h2 style={{ fontSize: '1.2rem', marginBottom: '16px', color: 'var(--text-primary)' }}>Year to Date (YTD) Summary - {new Date().getFullYear()}</h2>
      {ytd && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '20px', marginBottom: '32px' }}>
          {[
            { label: 'Months Processed', value: ytd.monthsProcessed, color: '#3b82f6' },
            { label: 'Total Gross (YTD)', value: fmt(ytd.totalGrossSalary), color: '#c9a84c' },
            { label: 'Total TDS (YTD)', value: fmt(ytd.totalTDS), color: '#ef4444' },
            { label: 'Total Net (YTD)', value: fmt(ytd.totalNetSalary), color: '#22c55e' },
          ].map((s, i) => (
            <div className="stat-card" key={i} style={{ padding: '24px', borderRadius: '12px', background: '#fff', boxShadow: '0 4px 12px rgba(0,0,0,0.03)', border: '1px solid var(--border)' }}>
              <div className="stat-label" style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{s.label}</div>
              <div className="stat-value" style={{ fontSize: '1.6rem', color: s.color, fontWeight: 700 }}>{s.value}</div>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
        {/* Quick Links Card */}
        <div className="card-iipm">
          <h3 style={{ fontSize: '1.1rem', marginBottom: '16px', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>Quick Actions</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <button className="btn-primary-iipm" onClick={() => navigate('/payslips')} style={{ justifyContent: 'flex-start', padding: '12px 16px' }}>
               My Payslips
            </button>
            <button className="btn-secondary-iipm" onClick={() => navigate('/form16')} style={{ justifyContent: 'flex-start', padding: '12px 16px' }}>
               Download Form 16
            </button>
            <button className="btn-secondary-iipm" onClick={() => navigate('/it-declaration')} style={{ justifyContent: 'flex-start', padding: '12px 16px' }}>
               Update IT Declaration
            </button>
          </div>
        </div>

        {/* Recent Payslip Card */}
        <div className="card-iipm">
          <h3 style={{ fontSize: '1.1rem', marginBottom: '16px', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>Recent Payslip</h3>
          {recentPayslip ? (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--primary)', marginBottom: '8px' }}>
                  {months[recentPayslip.month - 1]} {recentPayslip.year}
                </p>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Net Salary:</span>
                  <span style={{ fontWeight: 600 }}>{fmt(recentPayslip.netSalary)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Status:</span>
                  <span style={{ fontWeight: 600, color: 'var(--success)' }}>Processed</span>
                </div>
              </div>
              <button className="btn-secondary-iipm" onClick={() => navigate('/payslips')} style={{ marginTop: '24px' }}>
                View Full Payslip
              </button>
            </div>
          ) : (
            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>
              No recent payslips available.
            </div>
          )}
        </div>
      </div>

    </div>
  );
};

export default EmployeeDashboard;
