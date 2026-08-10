import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import apiService from '../services/api';
import { UserContext } from '../App';
import { 
  Users, Banknote, FileCheck, CheckSquare, 
  Settings, FileText, IndianRupee, Ban, HandCoins
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import '../styles/Dashboard.css';

const AdminDashboard: React.FC = () => {
  const userCtx = useContext(UserContext);
  const [stats, setStats] = useState({
    totalEmployees: 0,
    activePayrolls: 0,
    pendingApprovals: 0,
    approvedPayrolls: 0,
    rejectedPayrolls: 0,
    totalNetThisMonth: 0,
    totalGrossThisMonth: 0,
  });
  const [recentPayrolls, setRecentPayrolls] = useState<any[]>([]);
  const [recentEmployees, setRecentEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  const monthName = now.toLocaleString('default', { month: 'long' });

  useEffect(() => {
    loadDashboard();
  }, []);

  const [barData, setBarData] = useState<any[]>([]);
  const [pieData, setPieData] = useState<any[]>([]);

  // Predefined colors for departments
  const pieColors = ['#153C7D', '#F47C20', '#388E3C', '#eab308', '#6366f1', '#ec4899', '#cbd5e1'];

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const [users, payrolls, deptReport, statsReport] = await Promise.allSettled([
        apiService.getAllUsers(),
        apiService.getPayrollsByMonth(currentMonth, currentYear),
        apiService.getDepartmentReport(currentMonth, currentYear),
        apiService.getPayrollStatistics(currentYear)
      ]);

      const userList = users.status === 'fulfilled' ? users.value : [];
      const payrollList = payrolls.status === 'fulfilled' ? payrolls.value : [];
      
      const deptData = deptReport.status === 'fulfilled' ? deptReport.value : null;
      const statsData = statsReport.status === 'fulfilled' ? statsReport.value : null;

      const totalNet = payrollList.reduce((s: number, p: any) => s + (p.netSalary || 0), 0);
      const totalGross = payrollList.reduce((s: number, p: any) => s + (p.grossSalary || 0), 0);

      setRecentEmployees(userList.slice(0, 5));
      setStats({
        totalEmployees: userList.length,
        activePayrolls: payrollList.length,
        pendingApprovals: payrollList.filter((p: any) => p.status === 'PENDING').length,
        approvedPayrolls: payrollList.filter((p: any) => p.status === 'APPROVED').length,
        rejectedPayrolls: payrollList.filter((p: any) => p.status === 'REJECTED').length,
        totalNetThisMonth: totalNet,
        totalGrossThisMonth: totalGross,
      });
      setRecentPayrolls(payrollList.slice(0, 5));

      // Build Bar Data
      if (statsData && statsData.monthlyCosts) {
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const newBarData = monthNames.map((name, index) => ({
          name,
          cost: statsData.monthlyCosts[index + 1] || 0
        }));
        setBarData(newBarData);
      } else {
        setBarData([]);
      }

      // Build Pie Data
      if (deptData && deptData.departments) {
        let colorIndex = 0;
        const newPieData = Object.keys(deptData.departments).map((deptName) => {
          const val = deptData.departments[deptName].employeeCount;
          const color = pieColors[colorIndex % pieColors.length];
          colorIndex++;
          return { name: deptName, value: val, color };
        });
        setPieData(newPieData);
      } else {
        setPieData([]);
      }

    } catch (e) {
      console.error('Dashboard load error:', e);
    } finally {
      setLoading(false);
    }
  };

  const fmt = (n: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

  const isSuperAdmin = userCtx?.role === 'SUPER_ADMIN';
  const isFaAdmin = userCtx?.role === 'FA_ADMIN';
  const isFaOp = userCtx?.role === 'FA_OPERATOR';
  const isAdminAdmin = userCtx?.role === 'ADMIN_ADMIN';
  const isAdminOp = userCtx?.role === 'ADMIN_OPERATOR';

  const statCards = isFaAdmin ? [
    { title: 'Pending Approvals', amount: stats.pendingApprovals.toString(), icon: <FileCheck size={24} />, color: '#f59e0b', trend: '', up: true, link: '/approvals' },
    { title: 'Approved Payrolls', amount: stats.approvedPayrolls.toString(), icon: <CheckSquare size={24} />, color: '#22c55e', trend: '', up: true, link: '/reports' },
    { title: 'Rejected Payrolls', amount: stats.rejectedPayrolls.toString(), icon: <Ban size={24} />, color: '#ef4444', trend: '', up: false, link: '/reports' },
  ] : [
    { title: 'Total Payrolls', amount: fmt(stats.totalNetThisMonth), icon: <Banknote size={24} />, color: '#153C7D', trend: '', up: true, link: '/reports' },
    { title: 'Pending Payments', amount: stats.pendingApprovals.toString(), icon: <FileCheck size={24} />, color: '#F47C20', trend: '', up: false, link: '/payroll' },
    { title: 'Total Employees', amount: stats.totalEmployees.toString(), icon: <Users size={24} />, color: '#388E3C', trend: '', up: true, link: '/users' },
  ];

  const quickActions = [
    { title: 'Process Payroll', desc: 'Create salary for this month', icon: <HandCoins size={24} />, link: '/payroll', color: '#153C7D', show: isSuperAdmin || isFaOp },
    { title: 'Approve Payroll', desc: 'Approve pending salaries', icon: <FileCheck size={24} />, link: '/approvals', color: '#153C7D', show: isSuperAdmin || isFaAdmin },
    { title: 'Manage Employees', desc: 'Add or update employee records', icon: <Users size={24} />, link: '/users', color: '#F47C20', show: isSuperAdmin || isAdminAdmin || isAdminOp },
    { title: 'Arrears', desc: 'DA & promotion arrears', icon: <IndianRupee size={24} />, link: '/arrears', color: '#388E3C', show: isSuperAdmin || isFaOp },
    { title: 'Settings', desc: 'Configure DA%, HRA%, NPS%', icon: <Settings size={24} />, link: '/settings', color: '#64748b', show: isSuperAdmin || isAdminAdmin },
    { title: 'Reports', desc: 'View and export reports', icon: <FileText size={24} />, link: '/reports', color: '#8b5cf6', show: isSuperAdmin || isFaAdmin || isFaOp },
  ].filter(q => q.show !== false);

  const getStatusBadge = (status: string) => {
    const map: Record<string, string> = { DRAFT: 'badge-warning', APPROVED: 'badge-success', REJECTED: 'badge-danger', LOCKED: 'badge-locked' };
    return `badge-iipm ${map[status] || 'badge-info'}`;
  };

  return (
    <div className="page-container" style={{ paddingTop: '24px' }}>
      
      {/* Welcome Banner */}
      <div className="welcome-banner">
        <div>
          <h1>Good Morning, {userCtx?.username || 'Admin'}!</h1>
          <p>Today is {now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}. You have {stats.pendingApprovals} pending tasks.</p>
        </div>
        <div style={{ background: 'rgba(255,255,255,0.2)', padding: '16px 24px', borderRadius: '16px', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.3)' }}>
          <div style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px', opacity: 0.9 }}>Next Payroll</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>28 {monthName}</div>
        </div>
      </div>

      {/* Top Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', marginBottom: '24px' }}>
        {statCards.map((s, i) => (
          <Link to={s.link} key={i} style={{ textDecoration: 'none' }}>
            <div className="stat-card-dribbble">
              <div className="stat-header">
                <div className="stat-icon-wrap" style={{ background: `${s.color}15`, color: s.color }}>
                  {s.icon}
                </div>
                {s.trend && (
                  <div className={`stat-trend ${s.up ? 'up' : 'down'}`}>
                    {s.up ? '↗' : '↘'} {s.trend}
                  </div>
                )}
              </div>
              <div>
                <div className="stat-title">{s.title}</div>
                <div className="stat-amount">{loading ? '...' : s.amount}</div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Main Grid: Charts */}
      {(isSuperAdmin || isFaAdmin || isFaOp) && (
        <div className="dashboard-grid">
          <div className="chart-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0 }}>Payroll Cost Overview</h3>
              <div style={{ background: 'var(--bg-hover)', padding: '6px 12px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 600 }}>2026</div>
            </div>
            <div style={{ height: '300px', width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--text-muted)' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--text-muted)' }} tickFormatter={(value) => `₹${value >= 1000 ? value / 1000 + 'k' : value}`} />
                  <Tooltip cursor={{ fill: 'var(--bg-hover)' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                  <Bar dataKey="cost" radius={[4, 4, 0, 0]} maxBarSize={40}>
                    {barData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={index === barData.length - 1 ? 'var(--primary)' : '#94a3b8'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="chart-card" style={{ display: 'flex', flexDirection: 'column' }}>
            <h3 style={{ marginBottom: '16px' }}>Department Distribution</h3>
            <div style={{ height: '180px', width: '100%', marginBottom: '16px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value" stroke="none">
                    {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', justifyContent: 'center' }}>
              {pieData.map((entry, index) => (
                <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: entry.color }}></div>
                  {entry.name}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Bottom Grid: Recent Payrolls + Quick Actions */}
      <div className="dashboard-grid">
        {(isSuperAdmin || isFaAdmin || isFaOp) && (
          <div className="card-iipm" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0 }}>Recent Payroll List</h3>
              <Link to="/payroll"><button className="btn-outline-iipm" style={{ fontSize: '0.8rem', padding: '6px 14px' }}>View All</button></Link>
            </div>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Loading...</div>
            ) : recentPayrolls.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                <p>No payrolls processed this month.</p>
              </div>
            ) : (
              <table className="table-iipm" style={{ border: 'none' }}>
                <thead>
                  <tr>
                    <th style={{ background: 'var(--bg-hover)' }}>Employee ID</th>
                    <th style={{ background: 'var(--bg-hover)' }}>Gross</th>
                    <th style={{ background: 'var(--bg-hover)' }}>Net Salary</th>
                    <th style={{ background: 'var(--bg-hover)' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentPayrolls.map((p) => (
                    <tr key={p.id}>
                      <td style={{ fontFamily: 'monospace', fontSize: '0.85rem', fontWeight: 600 }}>{p.employeeId}</td>
                      <td>{fmt(p.grossSalary || 0)}</td>
                      <td style={{ color: 'var(--success)', fontWeight: 700 }}>{fmt(p.netSalary || 0)}</td>
                      <td><span className={getStatusBadge(p.status)}>{p.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        <div className="card-iipm" style={{ padding: '24px' }}>
          <h3 style={{ marginBottom: '20px' }}>Quick Actions</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {quickActions.map((a, i) => (
              <Link to={a.link} key={i} style={{ textDecoration: 'none' }}>
                <div className="action-card-premium" style={{ '--color': a.color } as React.CSSProperties}>
                  <div className="action-icon">{a.icon}</div>
                  <div>
                    <div className="action-title">{a.title}</div>
                    <div className="action-desc">{a.desc}</div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Employee List Table */}
      <div className="dashboard-grid" style={{ marginTop: '24px' }}>
        <div className="card-iipm" style={{ padding: '24px', gridColumn: '1 / -1' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ margin: 0 }}>Employee List</h3>
            <Link to="/users"><button className="btn-outline-iipm" style={{ fontSize: '0.8rem', padding: '6px 14px' }}>View All</button></Link>
          </div>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Loading...</div>
          ) : recentEmployees.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
              <p>No employees found.</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="table-iipm" style={{ border: 'none' }}>
                <thead>
                  <tr>
                    <th style={{ background: 'var(--bg-hover)' }}>Employee ID</th>
                    <th style={{ background: 'var(--bg-hover)' }}>Name</th>
                    <th style={{ background: 'var(--bg-hover)' }}>Department</th>
                    <th style={{ background: 'var(--bg-hover)' }}>Designation</th>
                    <th style={{ background: 'var(--bg-hover)' }}>Role</th>
                    <th style={{ background: 'var(--bg-hover)' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentEmployees.map((u) => (
                    <tr key={u.id}>
                      <td style={{ fontFamily: 'monospace', fontSize: '0.85rem', fontWeight: 600 }}>{u.employeeId}</td>
                      <td>
                        <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{u.firstName} {u.lastName}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{u.email}</div>
                      </td>
                      <td>{u.department || '—'}</td>
                      <td>{u.designation || '—'}</td>
                      <td><span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '4px 8px', background: 'var(--bg-body)', borderRadius: '4px' }}>{u.role ? u.role.replace('_', ' ') : '—'}</span></td>
                      <td><span className={u.isActive ? 'badge-iipm badge-success' : 'badge-iipm badge-danger'}>{u.isActive ? 'ACTIVE' : 'INACTIVE'}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
