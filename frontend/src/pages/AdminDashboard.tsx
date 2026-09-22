import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import apiService from '../services/api';
import { UserContext } from '../App';
import { 
  Users, Banknote, FileCheck, CheckSquare, 
  Settings, FileText, IndianRupee, Ban, HandCoins,
  Sun, Calendar, ChevronRight, CreditCard, MoreVertical,
  TrendingUp, TrendingDown, AlertCircle, ChevronDown, Activity
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
  const [userMap, setUserMap] = useState<Record<string, string>>({});
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
  const pieColors = ['#4f46e5', '#ec4899', '#06b6d4', '#f59e0b', '#8b5cf6', '#10b981', '#f43f5e'];

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
      
      const uMap: Record<string, string> = {};
      userList.forEach((u: any) => {
        if (u.employeeId) uMap[u.employeeId] = `${u.firstName} ${u.lastName}`.trim();
      });
      setUserMap(uMap);

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
      setRecentPayrolls(payrollList.slice(0, 8));

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

  const statCards = [
    { title: 'TOTAL PAYROLLS', amount: fmt(stats.totalNetThisMonth), icon: <CreditCard size={20} />, color: '#8b5cf6', trend: '+12% vs. last month', up: true, link: '/reports', bg: '#f5f3ff', sparkColor: '#a78bfa' },
    { title: 'PENDING PAYMENTS', amount: stats.pendingApprovals.toString(), icon: <FileText size={20} />, color: '#f97316', trend: 'Requires attention', up: null, link: '/payroll', bg: '#fff7ed', sparkColor: '#fb923c' },
    { title: 'TOTAL EMPLOYEES', amount: stats.totalEmployees.toString(), icon: <Users size={20} />, color: '#10b981', trend: '+8% vs. last month', up: true, link: '/users', bg: '#f0fdf4', sparkColor: '#34d399' },
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
    <div className="page-container">
      
      {/* 1. Welcome Banner */}
      <div className="welcome-banner">
        <div className="welcome-banner-left">
          <div className="welcome-title">
            <h1>Good Morning, {userCtx?.username || 'IIPMAdmin'}!</h1>
          </div>
          <div className="welcome-subtitle">
            Today is {now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}. You have {stats.pendingApprovals} pending tasks.
          </div>
        </div>
        <div className="next-payroll-card">
          <div className="next-payroll-label">NEXT PAYROLL</div>
          <div className="next-payroll-date">28 {monthName}</div>
        </div>
      </div>

      {/* 2. KPI Cards */}
      <div className="kpi-grid">
        {statCards.map((s, i) => (
          <Link to={s.link} key={i} style={{ textDecoration: 'none' }}>
            <div className="kpi-card">
              <div className="kpi-header">
                <div className="kpi-icon-box" style={{ background: s.bg, color: s.color }}>
                  {s.icon}
                </div>
                <div className="kpi-title">{s.title}</div>
              </div>
              <div className="kpi-value">{loading ? '...' : s.amount}</div>
              <div className="kpi-footer">
                <div className="kpi-trend">
                  {s.up === true && <TrendingUp size={16} color={s.color} />}
                  {s.up === false && <TrendingDown size={16} color={s.color} />}
                  {s.up === null && <AlertCircle size={16} color={s.color} />}
                  <span className="kpi-trend-text" style={{ color: s.up === null ? '#f97316' : s.color }}>{s.trend}</span>
                </div>
                <svg className="kpi-sparkline" viewBox="0 0 100 30" preserveAspectRatio="none">
                  <path d={i === 0 ? "M0,25 C20,25 30,10 50,15 C70,20 80,5 100,5" : i === 1 ? "M0,20 L20,25 L40,15 L60,20 L80,5 L100,0" : "M0,30 Q25,25 50,20 T100,5"} fill="none" stroke={s.sparkColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* 3. Charts Grid */}
      {(isSuperAdmin || isFaAdmin || isFaOp) && (
        <div className="charts-grid">
          <div className="chart-card">
            <div className="chart-header">
              <div className="chart-title-wrap">
                <div className="chart-icon"><Activity size={18} /></div>
                <h3 className="chart-title">Payroll Cost Overview</h3>
              </div>
              <div className="chart-dropdown">
                <Calendar size={14} /> This Year <ChevronDown size={14} />
              </div>
            </div>
            <div style={{ height: '300px', width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8', fontWeight: 600 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8', fontWeight: 600 }} tickFormatter={(val) => `₹${val >= 1000 ? val / 1000 + 'k' : val}`} />
                  <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }} />
                  <Bar dataKey="cost" fill="#8b5cf6" radius={[4, 4, 0, 0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="chart-card">
            <div className="chart-header" style={{ marginBottom: '0px' }}>
              <div className="chart-title-wrap">
                <div className="chart-icon"><Activity size={18} /></div>
                <h3 className="chart-title">Department Distribution</h3>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
              <div style={{ height: '200px', width: '100%', position: 'relative' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={85} paddingAngle={2} dataKey="value" stroke="none">
                      {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }} />
                  </PieChart>
                </ResponsiveContainer>
                {/* Custom Center Label */}
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' }}>{stats.totalEmployees}</div>
                  <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Employees</div>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%', marginTop: '20px' }}>
                {pieData.map((entry, index) => (
                  <div key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', color: '#475569', fontWeight: 600 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: entry.color }}></div>
                      {entry.name}
                    </div>
                    <div>{entry.value} ({stats.totalEmployees ? Math.round((entry.value / stats.totalEmployees) * 100) : 0}%)</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. Bottom Grid */}
      <div className="bottom-grid">
        {(isSuperAdmin || isFaAdmin || isFaOp) && (
          <div className="recent-table-wrap">
            <div className="recent-header">
              <div className="chart-title-wrap">
                <div className="chart-icon"><FileText size={18} color="#4f46e5" /></div>
                <h3 className="chart-title">Recent Payroll List</h3>
              </div>
              <Link to="/payroll" className="view-all-link">View All <ChevronRight size={14} /></Link>
            </div>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>Loading...</div>
            ) : recentPayrolls.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>No payrolls processed this month.</div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="mockup-table">
                  <thead>
                    <tr>
                      <th>Employee ID</th>
                      <th>Gross</th>
                      <th>Net Salary</th>
                      <th>Status</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentPayrolls.map((p) => (
                      <tr key={p.id}>
                        <td>{p.employeeId}</td>
                        <td style={{ color: '#64748b', fontWeight: 500 }}>{fmt(p.grossSalary || 0)}</td>
                        <td style={{ color: '#10b981' }}>{fmt(p.netSalary || 0)}</td>
                        <td>
                          <span className={`status-pill ${p.status.toLowerCase()}`}>{p.status}</span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <MoreVertical size={16} color="#cbd5e1" style={{ cursor: 'pointer' }} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        <div className="quick-actions-wrap">
          <div className="recent-table-wrap" style={{ padding: '24px' }}>
            <div className="chart-title-wrap" style={{ marginBottom: '20px' }}>
              <div className="chart-icon"><Activity size={18} color="#8b5cf6" /></div>
              <h3 className="chart-title">Quick Actions</h3>
            </div>
            <div className="quick-actions-wrap">
              {quickActions.map((a, i) => (
                <Link to={a.link} key={i} className="quick-action-item">
                  <div className="qa-icon" style={{ background: `${a.color}15`, color: a.color }}>
                    {a.icon}
                  </div>
                  <div className="qa-text">
                    <div className="qa-title">{a.title}</div>
                    <div className="qa-desc">{a.desc}</div>
                  </div>
                  <ChevronRight size={18} className="qa-arrow" />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 5. Employee List */}
      <div className="bottom-grid" style={{ marginTop: '24px', gridTemplateColumns: '1fr' }}>
        <div className="recent-table-wrap">
          <div className="recent-header">
            <div className="chart-title-wrap">
              <div className="chart-icon"><Users size={18} color="#10b981" /></div>
              <h3 className="chart-title">Employee List</h3>
            </div>
            <Link to="/users" className="view-all-link">View All <ChevronRight size={14} /></Link>
          </div>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>Loading...</div>
          ) : recentEmployees.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>No employees found.</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="mockup-table">
                <thead>
                  <tr>
                    <th>Employee ID</th>
                    <th>Name</th>
                    <th>Department</th>
                    <th>Designation</th>
                    <th>Role</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentEmployees.map((u) => (
                    <tr key={u.id}>
                      <td>{u.employeeId}</td>
                      <td>
                        <div style={{ fontWeight: 600, color: '#334155' }}>{u.firstName} {u.lastName}</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{u.email}</div>
                      </td>
                      <td>{u.department || '—'}</td>
                      <td>{u.designation || '—'}</td>
                      <td>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '4px 8px', background: '#f1f5f9', color: '#475569', borderRadius: '6px', whiteSpace: 'nowrap' }}>
                          {u.role ? u.role.replace('_', ' ') : '—'}
                        </span>
                      </td>
                      <td>
                        <span className={`status-pill ${u.isActive ? 'approved' : 'rejected'}`}>{u.isActive ? 'ACTIVE' : 'INACTIVE'}</span>
                      </td>
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
