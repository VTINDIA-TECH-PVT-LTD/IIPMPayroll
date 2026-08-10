import React, { useState, useEffect, useContext, useRef } from 'react';
import apiService from '../services/api';
import { UserContext } from '../App';

interface Employee {
  id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  department: string;
  designation: string;
  payLevel: string;
  payIndex: number;
  basicPay: number;
}

interface PayrollRow {
  user: Employee;
  tds: number | string;
  otherDeductions: number;
  remark: string;
}

const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const payLevelBands = ['1 to 5', '6 to 9', '10 to 17'];

interface PayrollManagementProps {
  mode?: 'process' | 'approve';
}

const PayrollManagement: React.FC<PayrollManagementProps> = ({ mode = 'process' }) => {
  const userCtx = useContext(UserContext);
  const [tab, setTab] = useState<'process' | 'view'>(mode === 'process' ? 'process' : 'view');

  // Filters
  const [department, setDepartment] = useState('');
  const [payLevelBand, setPayLevelBand] = useState('');
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());

  // Employees & Payroll rows
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [rows, setRows] = useState<PayrollRow[]>([]);
  const [payrolls, setPayrolls] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [selectedPayrolls, setSelectedPayrolls] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Reject / Forward Modal
  const [rejectModal, setRejectModal] = useState<{ id: string } | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const departments = ['Academic', 'Finance', 'Administration', 'Research', 'Library', 'IT', 'Maintenance', 'Security'];

  // Settings state
  const [settings, setSettings] = useState<Record<string, number>>({});
  const [userMap, setUserMap] = useState<Record<string, string>>({});

  useEffect(() => { loadPayrolls(); }, [month, year, tab]);
  useEffect(() => {
    // Load settings once when component mounts
    apiService.getAllPayrollSettings().then(data => {
      setSettings(data);
    }).catch(err => console.error('Failed to load settings', err));
    
    // Load all users to map employeeId to payLevel
    apiService.getAllUsers().then(users => {
      const map: Record<string, string> = {};
      users.forEach((u: any) => {
        if (u.employeeId) map[u.employeeId] = u.payLevel;
      });
      setUserMap(map);
    }).catch(err => console.error('Failed to load users', err));
  }, []);

  const matchesBand = (level: string, band: string) => {
    const l = parseInt(level, 10);
    if (isNaN(l)) return false;
    if (band === '1 to 5') return l >= 1 && l <= 5;
    if (band === '6 to 9') return l >= 6 && l <= 9;
    if (band === '10 to 17') return l >= 10 && l <= 17;
    return true;
  };

  const loadEmployees = async () => {
    try {
      setLoading(true);
      const all = await apiService.getAllUsers();
      const filtered = all.filter((u: any) => {
        if (!u.isActive || !u.basicPay) return false;
        if (department && u.department !== department) return false;
        if (payLevelBand && !matchesBand(u.payLevel, payLevelBand)) return false;
        return true;
      });
      setEmployees(filtered);
      setRows(filtered.map((u: any) => ({ user: u, tds: '', otherDeductions: 0, remark: '' })));
      if (filtered.length === 0) setMsg({ type: 'error', text: 'No active employees found matching your filters.' });
    } catch {
      setMsg({ type: 'error', text: 'Failed to load employees.' });
    } finally {
      setLoading(false);
    }
  };

  const loadPayrolls = async () => {
    try {
      const data = await apiService.getPayrollsByMonth(month, year);
      setPayrolls(data);
        setCurrentPage(1);
    } catch { setPayrolls([]); }
  };

  const updateRow = (userId: string, field: keyof PayrollRow, value: any) => {
    setRows(prev => prev.map(r => r.user.id === userId ? { ...r, [field]: value } : r));
  };

  const submitBulkPayroll = async () => {
    if (rows.length === 0) { setMsg({ type: 'error', text: 'Load employees first.' }); return; }
    setLoading(true);
    setMsg(null);
    try {
      const tdsMap: Record<string, number> = {};
      const remarksMap: Record<string, string> = {};
      rows.forEach(r => { 
        if (r.tds !== '') tdsMap[r.user.id] = Number(r.tds);
        remarksMap[r.user.id] = r.remark;
      });
      
      const payload = {
        department,
        payLevel: payLevelBand,
        month,
        year,
        tdsMap,
        remarksMap
      };
      
      await apiService.api.post('/payroll/bulk', payload);
      setMsg({ type: 'success', text: `✓ Payroll records submitted for approval successfully!` });
      loadPayrolls();
      setTab('view');
    } catch (e: any) {
      setMsg({ type: 'error', text: e.response?.data?.message || 'Error processing payroll.' });
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      await apiService.approvePayroll(id);
      setMsg({ type: 'success', text: 'Salary Released successfully.' });
      loadPayrolls();
    } catch { setMsg({ type: 'error', text: 'Error releasing salary.' }); }
  };

  const handleReject = async () => {
    if (!rejectModal) return;
    try {
      const formData = new FormData();
      formData.append('reason', rejectReason);
      attachments.forEach(file => formData.append('files', file));

      await apiService.api.put(`/payroll/${rejectModal.id}/reject`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      setMsg({ type: 'success', text: 'Payroll forwarded back to operator with attachments.' });
      setRejectModal(null);
      setRejectReason('');
      setAttachments([]);
      loadPayrolls();
    } catch { setMsg({ type: 'error', text: 'Error rejecting payroll.' }); }
  };

  const fmt = (n: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);

  const statusBadge: Record<string, string> = {
    PENDING: '#f59e0b', APPROVED: '#22c55e', REJECTED: '#ef4444', LOCKED: '#8b5cf6', SUBMITTED: '#3b82f6'
  };

  const totalPages = Math.max(1, Math.ceil(payrolls.length / itemsPerPage));
  const currentPayrolls = payrolls.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleSelectAllPayrolls = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) setSelectedPayrolls(payrolls.map(p => p.id));
    else setSelectedPayrolls([]);
  };

  const handleSelectPayroll = (id: string) => {
    if (selectedPayrolls.includes(id)) setSelectedPayrolls(selectedPayrolls.filter(p => p !== id));
    else setSelectedPayrolls([...selectedPayrolls, id]);
  };

  const handleBulkApprove = async () => {
    if (!window.confirm(`Approve ${selectedPayrolls.length} payroll records?`)) return;
    try {
      setLoading(true);
      await apiService.api.post('/payroll/bulk-approve', selectedPayrolls);
      setMsg({ type: 'success', text: `Approved ${selectedPayrolls.length} records.` });
      setSelectedPayrolls([]);
      loadPayrolls();
    } catch (err: any) {
      setMsg({ type: 'error', text: 'Bulk approve failed: ' + (err.response?.data?.message || err.message) });
    } finally {
      setLoading(false);
    }
  };

  const handleBulkReject = async () => {
    const reason = window.prompt(`Reject ${selectedPayrolls.length} payroll records. Please enter a reason:`);
    if (reason === null) return;
    try {
      setLoading(true);
      await apiService.api.post(`/payroll/bulk-reject?reason=${encodeURIComponent(reason)}`, selectedPayrolls);
      setMsg({ type: 'success', text: `Rejected ${selectedPayrolls.length} records.` });
      setSelectedPayrolls([]);
      loadPayrolls();
    } catch (err: any) {
      setMsg({ type: 'error', text: 'Bulk reject failed: ' + (err.response?.data?.message || err.message) });
    } finally {
      setLoading(false);
    }
  };

  const exportPayrolls = () => {
    const data = payrolls.map(p => ({
      'Employee ID': p.employeeId,
      'Month': p.month,
      'Year': p.year,
      'Gross Salary': p.grossSalary,
      'Net Salary': p.netSalary,
      'Status': p.status,
      'TDS': p.tds,
      'Other Deductions': p.otherDeductions,
      'Remark': p.remark || ''
    }));
    import('xlsx').then(XLSX => {
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Payrolls");
      XLSX.writeFile(wb, `Payrolls_${months[month - 1]}_${year}.xlsx`);
    });
  };

  const handleExportApprovalSheet = async () => {
    try {
      setLoading(true);
      const blob = await apiService.exportApprovalSheet(month, year);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Approval_Sheet_${months[month - 1]}_${year}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      setMsg({ type: 'error', text: 'Error generating approval sheet.' });
    } finally {
      setLoading(false);
    }
  };

  const isAdmin = apiService.isSuperAdmin() || apiService.isFAAdmin();

  return (
    <div className="page-container">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1>Salary Processing</h1>
          <p>Process and verify payroll — {months[month - 1]} {year}</p>
        </div>
      </div>

      {msg && (
        <div className={`alert-iipm ${msg.type === 'success' ? 'alert-success' : 'alert-danger'}`}
          style={{ marginBottom: '20px' }}>
          {msg.text}
          <button onClick={() => setMsg(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontSize: '1rem' }}>✕</button>
        </div>
      )}

      {mode === 'process' && (
        <div style={{ display: 'flex', gap: '0', marginBottom: '24px', borderBottom: '1px solid var(--border)' }}>
          <button onClick={() => setTab('process')} style={{
            padding: '10px 24px', background: 'none', border: 'none',
            borderBottom: `2px solid ${tab === 'process' ? 'var(--accent)' : 'transparent'}`,
            color: tab === 'process' ? 'var(--accent)' : 'var(--text-muted)',
            fontWeight: 600, cursor: 'pointer', fontSize: '0.9rem', fontFamily: 'var(--font)'
          }}>
            ⊕ Salary Process
          </button>
          <button onClick={() => setTab('view')} style={{
            padding: '10px 24px', background: 'none', border: 'none',
            borderBottom: `2px solid ${tab === 'view' ? 'var(--accent)' : 'transparent'}`,
            color: tab === 'view' ? 'var(--accent)' : 'var(--text-muted)',
            fontWeight: 600, cursor: 'pointer', fontSize: '0.9rem', fontFamily: 'var(--font)'
          }}>
            📋 Sent for Approval ({payrolls.length})
          </button>
        </div>
      )}

      {tab === 'process' && (
        <>
          <div className="card-iipm" style={{ padding: '20px', marginBottom: '20px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '16px', alignItems: 'flex-end' }}>
              <div>
                <label className="form-label-iipm">Select Department</label>
                <select className="form-control-iipm" value={department} onChange={e => setDepartment(e.target.value)}>
                  <option value="">All Departments</option>
                  {departments.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label-iipm">Pay Level</label>
                <select className="form-control-iipm" value={payLevelBand} onChange={e => setPayLevelBand(e.target.value)}>
                  <option value="">All Levels</option>
                  {payLevelBands.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label-iipm">Month</label>
                <select className="form-control-iipm" value={month} onChange={e => setMonth(+e.target.value)}>
                  {months.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label-iipm">Year</label>
                <input type="number" className="form-control-iipm" value={year} onChange={e => setYear(+e.target.value)} min="2020" max="2030" />
              </div>
              <div>
                <button className="btn-primary-iipm" onClick={loadEmployees} disabled={loading} style={{ width: '100%' }}>
                  {loading ? 'Loading...' : '🔍 Fetch List'}
                </button>
              </div>
            </div>
          </div>

          {rows.length > 0 && (
            <div className="card-iipm" style={{ padding: '0', maxWidth: '100%', overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontWeight: 600 }}>{rows.length} employees</div>
                <button className="btn-accent-iipm" onClick={submitBulkPayroll} disabled={loading}>
                  {loading ? 'Processing...' : 'Submit For Approval & Export'}
                </button>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table className="table-iipm" style={{ whiteSpace: 'nowrap', fontSize: '0.8rem' }}>
                <thead>
                  <tr style={{ background: '#f8fafc' }}>
                    <th>Sl.no</th>
                    <th>Emp ID</th>
                    <th>Employee Name</th>
                    <th>Designation</th>
                    <th>Pay Scale</th>
                    <th>Basic</th>
                    <th>DA {settings.DA_PERCENTAGE || 62}%</th>
                    <th>TA</th>
                    <th>HRA {settings.HRA_PERCENTAGE || 20}%</th>
                    <th>Dean / Warden Allowance</th>
                    <th>NPS Employer Share</th>
                    <th style={{ background: '#e2e8f0' }}>Gross Salary</th>
                    <th>PT</th>
                    <th style={{ color: 'var(--warning)' }}>TDS</th>
                    <th>NPS Employee share</th>
                    <th>NPS Employer share</th>
                    <th>CGHS Contribution</th>
                    <th>Other Recovery</th>
                    <th style={{ background: '#fee2e2' }}>Total Deductions</th>
                    <th style={{ background: '#dcfce7', color: 'var(--success)' }}>Net Salary</th>
                    <th>Remark</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => {
                    const u = row.user;
                    const bp = u.basicPay || 0;
                    const daPct = (settings.DA_PERCENTAGE || 62) / 100;
                    const hraPct = (settings.HRA_PERCENTAGE || 20) / 100;
                    const npsEmpPct = (settings.NPS_EMPLOYEE_PERCENTAGE || 10) / 100;
                    const npsEmployerPct = (settings.NPS_EMPLOYER_PERCENTAGE || 10) / 100;

                    const da = Math.round(bp * daPct);
                    const hra = Math.round(bp * hraPct);
                    const level = parseInt(u.payLevel || '10');
                    const taBase = level >= 10 ? (settings.TA_FIXED_AMOUNT || 3600) : (settings.TA_FIXED_AMOUNT ? settings.TA_FIXED_AMOUNT / 2 : 1800);
                    const taDaPct = (settings.TA_DA_PERCENTAGE || 62) / 100;
                    const ta = Math.round(taBase * (1 + taDaPct));
                    
                    const npsEmp = Math.round((bp + da) * npsEmpPct);
                    const npsEmployer = Math.round((bp + da) * npsEmployerPct);
                    const gross = bp + da + hra + ta + npsEmployer; 
                    
                    const pt = settings.PT_AMOUNT || 200;
                    const baseCghs = settings.CGHS_AMOUNT || 1000;
                    const cghs = level >= 12 ? baseCghs : (level >= 7 ? baseCghs * 0.65 : (level === 6 ? baseCghs * 0.45 : baseCghs * 0.25));
                    
                    const tdsVal = row.tds === '' ? 0 : Number(row.tds);
                    const totalDed = tdsVal + npsEmp + pt + cghs + row.otherDeductions + npsEmployer;
                    const net = gross - totalDed;
                    
                    return (
                      <tr key={u.id}>
                        <td style={{ color: 'var(--text-muted)' }}>{i + 1}</td>
                        <td>{u.employeeId || '-'}</td>
                        <td style={{ fontWeight: 600 }}>{u.firstName} {u.lastName}</td>
                        <td>{u.designation || '-'}</td>
                        <td>Level-{u.payLevel}</td>
                        <td>{fmt(bp)}</td>
                        <td>{fmt(da)}</td>
                        <td>{fmt(ta)}</td>
                        <td>{fmt(hra)}</td>
                        <td>{fmt(0)}</td> {/* Dean/Warden Allowance - can be updated later if needed */}
                        <td>{fmt(npsEmployer)}</td>
                        <td style={{ fontWeight: 600, background: '#f8fafc' }}>{fmt(gross)}</td>
                        <td>{fmt(pt)}</td>
                        <td>
                          <input type={row.tds === '' ? 'text' : 'number'} value={row.tds} placeholder="Auto"
                            onChange={e => updateRow(u.id, 'tds', e.target.value)}
                            style={{ width: '70px', padding: '4px', fontSize: '0.8rem' }} />
                        </td>
                        <td>{fmt(npsEmp)}</td>
                        <td>{fmt(npsEmployer)}</td>
                        <td>{fmt(cghs)}</td>
                        <td>
                          <input type="number" value={row.otherDeductions}
                            onChange={e => updateRow(u.id, 'otherDeductions', +e.target.value)}
                            style={{ width: '70px', padding: '4px', fontSize: '0.8rem' }} />
                        </td>
                        <td style={{ color: '#ef4444', background: '#fef2f2' }}>{fmt(totalDed)}</td>
                        <td style={{ color: 'var(--success)', fontWeight: 700, background: '#f0fdf4' }}>{fmt(net)}</td>
                        <td>
                          <input type="text" value={row.remark} placeholder="Enter remark..."
                            onChange={e => updateRow(u.id, 'remark', e.target.value)}
                            style={{ width: '120px', padding: '4px', fontSize: '0.8rem' }} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr style={{ fontWeight: 'bold', background: '#e2e8f0' }}>
                    <td colSpan={5} style={{ textAlign: 'right', paddingRight: '20px' }}>Total</td>
                    <td>{fmt(rows.reduce((sum, row) => sum + (row.user.basicPay || 0), 0))}</td>
                    <td>{fmt(rows.reduce((sum, row) => sum + Math.round((row.user.basicPay || 0) * ((settings.DA_PERCENTAGE || 62) / 100)), 0))}</td>
                    <td>{fmt(rows.reduce((sum, row) => {
                      const level = parseInt(row.user.payLevel || '10');
                      const taBase = level >= 10 ? (settings.TA_FIXED_AMOUNT || 3600) : (settings.TA_FIXED_AMOUNT ? settings.TA_FIXED_AMOUNT / 2 : 1800);
                      return sum + Math.round(taBase * (1 + ((settings.TA_DA_PERCENTAGE || 62) / 100)));
                    }, 0))}</td>
                    <td>{fmt(rows.reduce((sum, row) => sum + Math.round((row.user.basicPay || 0) * ((settings.HRA_PERCENTAGE || 20) / 100)), 0))}</td>
                    <td>{fmt(0)}</td>
                    <td>{fmt(rows.reduce((sum, row) => sum + Math.round(((row.user.basicPay || 0) + Math.round((row.user.basicPay || 0) * ((settings.DA_PERCENTAGE || 62) / 100))) * ((settings.NPS_EMPLOYER_PERCENTAGE || 10) / 100)), 0))}</td>
                    <td>{fmt(rows.reduce((sum, row) => {
                      const bp = row.user.basicPay || 0;
                      const da = Math.round(bp * ((settings.DA_PERCENTAGE || 62) / 100));
                      const hra = Math.round(bp * ((settings.HRA_PERCENTAGE || 20) / 100));
                      const level = parseInt(row.user.payLevel || '10');
                      const taBase = level >= 10 ? (settings.TA_FIXED_AMOUNT || 3600) : (settings.TA_FIXED_AMOUNT ? settings.TA_FIXED_AMOUNT / 2 : 1800);
                      const ta = Math.round(taBase * (1 + ((settings.TA_DA_PERCENTAGE || 62) / 100)));
                      const npsEmp = Math.round((bp + da) * ((settings.NPS_EMPLOYER_PERCENTAGE || 10) / 100));
                      return sum + bp + da + hra + ta + npsEmp;
                    }, 0))}</td>
                    <td>{fmt(rows.length * (settings.PT_AMOUNT || 200))}</td>
                    <td>{fmt(rows.reduce((sum, row) => sum + (row.tds === '' ? 0 : Number(row.tds)), 0))}</td>
                    <td>{fmt(rows.reduce((sum, row) => sum + Math.round(((row.user.basicPay || 0) + Math.round((row.user.basicPay || 0) * ((settings.DA_PERCENTAGE || 62) / 100))) * ((settings.NPS_EMPLOYEE_PERCENTAGE || 10) / 100)), 0))}</td>
                    <td>{fmt(rows.reduce((sum, row) => sum + Math.round(((row.user.basicPay || 0) + Math.round((row.user.basicPay || 0) * ((settings.DA_PERCENTAGE || 62) / 100))) * ((settings.NPS_EMPLOYER_PERCENTAGE || 10) / 100)), 0))}</td>
                    <td>{fmt(rows.reduce((sum, row) => {
                      const level = parseInt(row.user.payLevel || '10');
                      const baseCghs = settings.CGHS_AMOUNT || 1000;
                      const cghs = level >= 12 ? baseCghs : (level >= 7 ? baseCghs * 0.65 : (level === 6 ? baseCghs * 0.45 : baseCghs * 0.25));
                      return sum + cghs;
                    }, 0))}</td>
                    <td>{fmt(rows.reduce((sum, row) => sum + row.otherDeductions, 0))}</td>
                    <td>{fmt(rows.reduce((sum, row) => {
                      const bp = row.user.basicPay || 0;
                      const da = Math.round(bp * ((settings.DA_PERCENTAGE || 62) / 100));
                      const pt = settings.PT_AMOUNT || 200;
                      const tds = row.tds === '' ? 0 : Number(row.tds);
                      const npsEmp = Math.round((bp + da) * ((settings.NPS_EMPLOYEE_PERCENTAGE || 10) / 100));
                      const npsEmployer = Math.round((bp + da) * ((settings.NPS_EMPLOYER_PERCENTAGE || 10) / 100));
                      const level = parseInt(row.user.payLevel || '10');
                      const baseCghs = settings.CGHS_AMOUNT || 1000;
                      const cghs = level >= 12 ? baseCghs : (level >= 7 ? baseCghs * 0.65 : (level === 6 ? baseCghs * 0.45 : baseCghs * 0.25));
                      return sum + tds + pt + npsEmp + npsEmployer + cghs + row.otherDeductions;
                    }, 0))}</td>
                    <td>{fmt(rows.reduce((sum, row) => {
                      const bp = row.user.basicPay || 0;
                      const da = Math.round(bp * ((settings.DA_PERCENTAGE || 62) / 100));
                      const hra = Math.round(bp * ((settings.HRA_PERCENTAGE || 20) / 100));
                      const level = parseInt(row.user.payLevel || '10');
                      const taBase = level >= 10 ? (settings.TA_FIXED_AMOUNT || 3600) : (settings.TA_FIXED_AMOUNT ? settings.TA_FIXED_AMOUNT / 2 : 1800);
                      const ta = Math.round(taBase * (1 + ((settings.TA_DA_PERCENTAGE || 62) / 100)));
                      const npsEmp = Math.round((bp + da) * ((settings.NPS_EMPLOYER_PERCENTAGE || 10) / 100));
                      const gross = bp + da + hra + ta + npsEmp;
                      const pt = settings.PT_AMOUNT || 200;
                      const tds = row.tds === '' ? 0 : Number(row.tds);
                      const npsEmployee = Math.round((bp + da) * ((settings.NPS_EMPLOYEE_PERCENTAGE || 10) / 100));
                      const baseCghs = settings.CGHS_AMOUNT || 1000;
                      const cghs = level >= 12 ? baseCghs : (level >= 7 ? baseCghs * 0.65 : (level === 6 ? baseCghs * 0.45 : baseCghs * 0.25));
                      const ded = tds + pt + npsEmployee + npsEmp + cghs + row.otherDeductions;
                      return sum + (gross - ded);
                    }, 0))}</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
              </div>
            </div>
          )}

          {rows.length === 0 && !loading && (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: '3rem', marginBottom: '16px' }}>₹</div>
              <h3 style={{ color: 'var(--text-secondary)' }}>Select Filters & Load Employees</h3>
              <p>Choose department and pay level, then click "Fetch List" to start salary processing.</p>
            </div>
          )}
        </>
      )}

      {tab === 'view' && (
        <>
          <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', alignItems: 'flex-end' }}>
            <div>
              <label className="form-label-iipm">Month</label>
              <select className="form-control-iipm" value={month} onChange={e => { setMonth(+e.target.value); }} style={{ width: '160px' }}>
                {months.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label-iipm">Year</label>
              <input type="number" className="form-control-iipm" value={year} onChange={e => setYear(+e.target.value)} style={{ width: '100px' }} />
            </div>
            <button className="btn-outline-iipm" onClick={loadPayrolls}>Refresh</button>
          </div>

          <div className="card-iipm" style={{ padding: '0', maxWidth: '100%', overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3>{mode === 'process' ? 'Records Sent for Approval' : 'Pending Salary Approvals'} — {months[month - 1]} {year}</h3>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{payrolls.length} records</span>
                {isAdmin && selectedPayrolls.length > 0 && (
                  <>
                    <button className="btn-accent-iipm" onClick={handleBulkApprove} style={{ padding: '6px 12px', fontSize: '0.8rem' }}>
                      Approve Selected ({selectedPayrolls.length})
                    </button>
                    <button className="btn-iipm" onClick={handleBulkReject} style={{ background: '#ef4444', color: 'white', padding: '6px 12px', fontSize: '0.8rem', border: 'none' }}>
                      Reject Selected
                    </button>
                  </>
                )}
                <button className="btn-accent-iipm" onClick={handleExportApprovalSheet} style={{ padding: '6px 12px', fontSize: '0.8rem' }}>📄 Print Approval Sheet</button>
                <button className="btn-outline-iipm" onClick={exportPayrolls} style={{ padding: '6px 12px', fontSize: '0.8rem' }}>Export Excel</button>
              </div>
            </div>
            {payrolls.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                No pending salary records found for {months[month - 1]} {year}
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="table-iipm">
                  <thead>
                    <tr>
                      <th style={{ width: '40px' }}>
                        <input type="checkbox" onChange={handleSelectAllPayrolls} checked={selectedPayrolls.length === payrolls.length && payrolls.length > 0} />
                      </th>
                      <th>Employee Name</th>
                      <th>Level</th>
                      <th>Gross</th>
                      <th>Net Salary</th>
                      <th>Status</th>
                      <th>Remark</th>
                      <th>Attachments</th>
                      {isAdmin && <th>Actions (Admin)</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {currentPayrolls.map((p: any) => (
                      <tr key={p.id} style={{ background: selectedPayrolls.includes(p.id) ? 'var(--bg-hover)' : '' }}>
                        <td>
                          <input type="checkbox" checked={selectedPayrolls.includes(p.id)} onChange={() => handleSelectPayroll(p.id)} />
                        </td>
                        <td style={{ fontWeight: 600 }}>{p.employeeId}</td>
                        <td>{userMap[p.employeeId] || p.payLevel || '-'}</td>
                        <td>{fmt(p.grossSalary)}</td>
                        <td style={{ color: 'var(--success)', fontWeight: 700 }}>{fmt(p.netSalary)}</td>
                        <td>
                          <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700, background: `${statusBadge[p.status]}20`, color: statusBadge[p.status] }}>
                            {p.status}
                          </span>
                        </td>
                      <td style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.85rem', maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {p.remark || '-'}
                      </td>
                      <td>
                          {p.attachments && p.attachments.length > 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              {p.attachments.map((att: string, idx: number) => {
                                const firstPipe = att.indexOf('|');
                                if (firstPipe === -1) {
                                  return <span key={idx} style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>📎 {att}</span>;
                                }
                                const filename = att.substring(0, firstPipe);
                                const data = att.substring(firstPipe + 1);
                                
                                const handleDownload = (e: React.MouseEvent) => {
                                  e.preventDefault();
                                  try {
                                    // Extract mime type and base64 string
                                    const match = data.match(/^data:(.*?);base64,(.*)$/);
                                    if (match && match.length === 3) {
                                      const mime = match[1];
                                      const b64 = match[2];
                                      const byteCharacters = atob(b64);
                                      const byteNumbers = new Array(byteCharacters.length);
                                      for (let i = 0; i < byteCharacters.length; i++) {
                                        byteNumbers[i] = byteCharacters.charCodeAt(i);
                                      }
                                      const byteArray = new Uint8Array(byteNumbers);
                                      const blob = new Blob([byteArray], {type: mime});
                                      const blobUrl = URL.createObjectURL(blob);
                                      
                                      const a = document.createElement('a');
                                      a.href = blobUrl;
                                      a.download = filename;
                                      document.body.appendChild(a);
                                      a.click();
                                      document.body.removeChild(a);
                                      URL.revokeObjectURL(blobUrl);
                                    } else {
                                      // Fallback for simple data urls
                                      const a = document.createElement('a');
                                      a.href = data;
                                      a.download = filename;
                                      document.body.appendChild(a);
                                      a.click();
                                      document.body.removeChild(a);
                                    }
                                  } catch (err) {
                                    console.error("Error downloading file", err);
                                  }
                                };
                                
                                return (
                                  <a key={idx} href="#" onClick={handleDownload} style={{ fontSize: '0.75rem', color: 'var(--primary)', textDecoration: 'none', background: '#e0e7ff', padding: '2px 6px', borderRadius: '4px', display: 'inline-block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '120px' }} title={filename}>
                                    📎 {filename}
                                  </a>
                                );
                              })}
                            </div>
                          ) : '-'}
                        </td>
                        {isAdmin && (
                          <td style={{ whiteSpace: 'nowrap' }}>
                            {p.status === 'PENDING' && (
                              <>
                                <button onClick={() => handleApprove(p.id)} style={{ padding: '6px 12px', borderRadius: '6px', border: 'none', background: 'rgba(34,197,94,0.15)', color: '#22c55e', cursor: 'pointer', marginRight: '6px', fontSize: '0.8rem', fontWeight: 600, fontFamily: 'var(--font)' }}>
                                  Release Salary
                                </button>
                                <button onClick={() => { setRejectModal({ id: p.id }); }} style={{ padding: '6px 12px', borderRadius: '6px', border: 'none', background: 'rgba(239,68,68,0.15)', color: '#ef4444', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, fontFamily: 'var(--font)' }}>
                                  Forward to Operator
                                </button>
                              </>
                            )}
                            {p.status === 'APPROVED' && <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Released</span>}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {rejectModal && (
        <div className="modal-iipm-overlay" onClick={() => { setRejectModal(null); setAttachments([]); }}>
          <div className="modal-iipm" onClick={e => e.stopPropagation()}>
            <div className="modal-header-iipm">
              <h3>Forward to Operator for Correction</h3>
              <button onClick={() => { setRejectModal(null); setAttachments([]); }} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
            </div>
            <div className="modal-body-iipm">
              <div style={{ marginBottom: '16px' }}>
                <label className="form-label-iipm">Changes Required / Remarks</label>
                <textarea className="form-control-iipm" rows={3} value={rejectReason}
                  onChange={e => setRejectReason(e.target.value)}
                  placeholder="Specify what needs to be changed..." />
              </div>
              
              <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
                <label className="form-label-iipm" style={{ color: 'var(--primary)' }}>📎 Attach Documents (Mandatory for changes)</label>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '12px' }}>Upload multiple files to support the required changes.</p>
                <input 
                  type="file" 
                  multiple 
                  ref={fileInputRef}
                  onChange={(e) => {
                    if (e.target.files) {
                      setAttachments(Array.from(e.target.files));
                    }
                  }}
                  className="form-control-iipm"
                  style={{ background: 'white' }}
                />
                {attachments.length > 0 && (
                  <div style={{ marginTop: '10px', fontSize: '0.85rem', color: 'var(--success)' }}>
                    ✓ {attachments.length} file(s) selected
                  </div>
                )}
              </div>
            </div>
            <div className="modal-footer-iipm">
              <button className="btn-outline-iipm" onClick={() => { setRejectModal(null); setAttachments([]); }}>Cancel</button>
              <button onClick={handleReject} disabled={!rejectReason || attachments.length === 0} style={{ padding: '8px 20px', background: (!rejectReason || attachments.length === 0) ? '#e2e8f0' : 'var(--accent)', border: 'none', color: (!rejectReason || attachments.length === 0) ? '#94a3b8' : 'white', borderRadius: '8px', cursor: (!rejectReason || attachments.length === 0) ? 'not-allowed' : 'pointer', fontWeight: 600, fontFamily: 'var(--font)' }}>
                Forward to Operator
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PayrollManagement;
