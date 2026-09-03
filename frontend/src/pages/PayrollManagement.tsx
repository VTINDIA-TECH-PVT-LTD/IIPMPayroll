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
  employeeType?: string;
  deanAllowance?: number;
  specialAllowance?: number;
  otherDeductions?: number;
  taOverride?: number;
  cghsOverride?: number;
  tds?: number;
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
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'regular' | 'contract'>('all');
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());

  const isContractUser = (u: any) => {
    const et = (u?.employeeType || '').toLowerCase();
    const pl = (u?.payLevel || '').toLowerCase();
    const fn = (u?.function || '').toLowerCase();
    const dept = (u?.department || '').toLowerCase();
    return et.includes('contract') || pl.includes('consolidated') || pl.includes('contract') || pl.includes('fixed') || fn.includes('contract') || dept.includes('contract');
  };

  // Employees & Payroll rows
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [rows, setRows] = useState<PayrollRow[]>([]);
  const [payrolls, setPayrolls] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error' | 'warning'; text: string } | null>(null);
  const [selectedPayrolls, setSelectedPayrolls] = useState<string[]>([]);
  const [employeeFilter, setEmployeeFilter] = useState<'all' | 'pending' | 'processed'>('all');
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

  // Derived filter values — computed fresh on every render
  const filteredRows = rows.filter(row => {
    const hasPayroll = payrolls.some((p: any) => p.userId === row.user.id || p.employeeId === row.user.employeeId);
    if (employeeFilter === 'pending') return !hasPayroll;
    if (employeeFilter === 'processed') return hasPayroll;
    return true;
  });
  const pendingCount = rows.filter(row => !payrolls.some((p: any) => p.userId === row.user.id || p.employeeId === row.user.employeeId)).length;
  const processedCount = rows.filter(row => payrolls.some((p: any) => p.userId === row.user.id || p.employeeId === row.user.employeeId)).length;

  const filteredPayrolls = payrolls.filter((p: any) => {
    if (categoryFilter === 'regular') return !isContractUser(p);
    if (categoryFilter === 'contract') return isContractUser(p);
    return true;
  });

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
    if (!level) return false;
    const cleanLevel = String(level).replace(/\D/g, '');
    const l = parseInt(cleanLevel, 10);
    if (isNaN(l)) return false;
    if (band === '1 to 5') return l >= 1 && l <= 5;
    if (band === '6 to 9') return l >= 6 && l <= 9;
    if (band === '10 to 17') return l >= 10 && l <= 17;
    return true;
  };

  const getOfficialDeanAllowance = (u: any): number => {
    if (u.deanAllowance !== undefined && u.deanAllowance !== null && u.deanAllowance > 0) return u.deanAllowance;
    if (u.specialAllowance !== undefined && u.specialAllowance !== null && u.specialAllowance > 0) return u.specialAllowance;
    const empId = (u.employeeId || '').toUpperCase();
    const mapping: Record<string, number> = {
      'TS1029': 3000,
      'TS1027': 3000,
      'TS1011': 3000,
      'TS1012': 3000,
      'TS1013': 3000,
      'TS1014': 3000,
      'TS1017': 3000,
      'TS1033': 5000,
      'CT002': 5000,
    };
    return mapping[empId] || 0;
  };

  const getOfficialOtherDeductions = (u: any): number => {
    if (u.otherDeductions !== undefined && u.otherDeductions !== null && u.otherDeductions > 0) return u.otherDeductions;
    const empId = (u.employeeId || '').toUpperCase();
    const isDirector = (empId === 'DIR001') || (u.payLevel && String(u.payLevel).includes('17')) || (u.designation && u.designation.toLowerCase().includes('director'));
    if (isDirector) return 52501; // 700 (Car) + 9521 (LIC) + 280 (GIS) + 42000 (GPF)
    const mapping: Record<string, number> = {
      'NT1016': 40,
      'NT1018': 94,
      'NT1012': 80,
      'TS1026': 40,
      'CNT001': 1800,
      'CNT002': 1800,
      'CNT003': 1800,
      'CNT004': 1800,
      'CT001': 650,
      'CT002': 650,
      'CT003': 650,
      'CT004': 650,
      'CT005': 650,
      'CT006': 650,
    };
    return mapping[empId] || 0;
  };

  const calculateAutoTds = (u: any) => {
    if (u.tds && u.tds > 0) return u.tds;
    const bp = u.basicPay || 0;
    if (bp <= 0) return 0;
    const isContract = (u.employeeType || '').toLowerCase().includes('contract') || (u.payLevel || '').toLowerCase().includes('consolidated');
    if (isContract) return 0;
    
    // Director Level 17
    if (String(u.payLevel).includes('17') || (u.designation || '').toLowerCase().includes('director')) return 90000;
    
    const da = Math.round(bp * ((settings.DA_PERCENTAGE || 60) / 100));
    const hra = Math.round(bp * ((settings.HRA_PERCENTAGE || 20) / 100));
    const level = parseInt(String(u.payLevel).replace(/\D/g, '') || '10', 10);
    const taBase = level >= 10 ? (settings.TA_FIXED_AMOUNT || 3600) : 1800;
    const ta = Math.round(taBase * (1 + ((settings.TA_DA_PERCENTAGE || 60) / 100)));
    const annualGross = (bp + da + hra + ta) * 12;
    
    const taxableIncome = Math.max(0, annualGross - 200000);
    if (taxableIncome <= 300000) return 0;
    
    let annualTax = 0;
    if (taxableIncome > 1500000) {
      annualTax = 150000 + (taxableIncome - 1500000) * 0.30;
    } else if (taxableIncome > 1200000) {
      annualTax = 90000 + (taxableIncome - 1200000) * 0.20;
    } else if (taxableIncome > 900000) {
      annualTax = 45000 + (taxableIncome - 900000) * 0.15;
    } else if (taxableIncome > 600000) {
      annualTax = 15000 + (taxableIncome - 600000) * 0.10;
    } else if (taxableIncome > 300000) {
      annualTax = (taxableIncome - 300000) * 0.05;
    }
    const monthlyTds = Math.round((annualTax * 1.04) / 12);
    return Math.round(monthlyTds / 100) * 100;
  };

  const loadEmployees = async () => {
    try {
      setLoading(true);
      const all = (await apiService.getAllUsers()) || [];
      const filtered = all.filter((u: any) => {
        if (!u.isActive || !u.basicPay) return false;
        if (department && u.department !== department) return false;
        if (payLevelBand && !matchesBand(u.payLevel, payLevelBand)) return false;
        if (categoryFilter === 'regular' && isContractUser(u)) return false;
        if (categoryFilter === 'contract' && !isContractUser(u)) return false;
        return true;
      });
      setEmployees(filtered);
      setRows(filtered.map((u: any) => ({
        user: u,
        tds: calculateAutoTds(u),
        otherDeductions: getOfficialOtherDeductions(u),
        remark: ''
      })));
      
      const currentPayrolls = Array.isArray(payrolls) ? payrolls : [];
      const alreadyApprovedCount = filtered.filter((u: any) => 
        currentPayrolls.some((p: any) => (p.userId === u.id || p.employeeId === u.employeeId) && (p.status === 'APPROVED' || p.status === 'RELEASED'))
      ).length;

      if (alreadyApprovedCount > 0) {
        setMsg({ type: 'warning', text: `Warning: ${alreadyApprovedCount} loaded employee(s) are already APPROVED for this month. The system will safely skip them when you submit.` });
      } else if (filtered.length === 0) {
        setMsg({ type: 'error', text: 'No active employees found matching your filters.' });
      } else {
        setMsg(null); // Clear previous messages
      }
    } catch (err: any) {
      console.error(err);
      setMsg({ type: 'error', text: err?.response?.data?.message || err?.message || 'Failed to load employees.' });
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
      const otherDeductionsMap: Record<string, number> = {};
      const remarksMap: Record<string, string> = {};
      
      rows.forEach(r => { 
        if (r.tds !== '') tdsMap[r.user.id] = Number(r.tds);
        if (r.otherDeductions !== undefined) otherDeductionsMap[r.user.id] = Number(r.otherDeductions);
        remarksMap[r.user.id] = r.remark;
      });
      
      const payload = {
        department,
        payLevel: payLevelBand,
        month,
        year,
        tdsMap,
        otherDeductionsMap,
        remarksMap
      };
      
      const res = await apiService.api.post('/payroll/bulk', payload);
      const count = res.data?.data?.length || rows.length;
      setMsg({ type: 'success', text: `✓ ${count} payroll records submitted for approval successfully!` });

      await loadPayrolls();
      setTab('view');
    } catch (e: any) {
      setMsg({ type: 'error', text: e.response?.data?.message || 'Error processing payroll.' });
    } finally {
      setLoading(false);
    }
  };

  const exportGridToExcel = () => {
    if (filteredRows.length === 0) {
      setMsg({ type: 'error', text: 'No rows to export. Please click "Fetch List" first.' });
      return;
    }
    
    const exportData = filteredRows.map((row, i) => {
      const u = row.user;
      const isContract = isContractUser(u);
      const isDirector = (u.employeeId === 'DIR001') || (u.payLevel && String(u.payLevel).includes('17')) || (u.designation && u.designation.toLowerCase().includes('director'));
      const isRegistrar = u.employeeId === 'NT1022';
      const bp = u.basicPay || 0;
      const daPct = (settings.DA_PERCENTAGE || 60) / 100;
      const hraPct = (settings.HRA_PERCENTAGE || 20) / 100;
      const npsEmpPct = (settings.NPS_EMPLOYEE_PERCENTAGE || 10) / 100;
      const npsEmployerPct = (settings.NPS_EMPLOYER_PERCENTAGE || 14) / 100;

      const da = isContract ? 0 : Math.round(bp * daPct);
      const hra = (isContract || isDirector || isRegistrar) ? 0 : Math.round(bp * hraPct);
      
      const level = parseInt(String(u.payLevel).replace(/\D/g, '') || '10', 10);
      let ta = 0;
      if (u.taOverride !== undefined && u.taOverride !== null) {
        ta = u.taOverride;
      } else if (isContract || isDirector || isRegistrar) {
        ta = 0;
      } else if (level >= 10) {
        const taBase = settings.TA_FIXED_AMOUNT || 3600;
        const taDaPct = (settings.TA_DA_PERCENTAGE || 60) / 100;
        ta = Math.round(taBase * (1 + taDaPct));
      } else if (level >= 1 && level <= 9) {
        const taBase = 1800;
        const taDaPct = (settings.TA_DA_PERCENTAGE || 60) / 100;
        ta = Math.round(taBase * (1 + taDaPct));
      }
      
      const deanAllowance = u.deanAllowance || u.specialAllowance || 0;
      const npsEmp = (isContract || isDirector) ? 0 : Math.round((bp + da) * npsEmpPct);
      const npsEmployer = (isContract || isDirector) ? 0 : Math.round((bp + da) * npsEmployerPct);
      const gross = isContract ? (bp + deanAllowance) : (bp + da + hra + ta + npsEmployer + deanAllowance); 
      
      const pt = settings.PT_AMOUNT || 200;
      const cghs = isContract ? 0 : (level >= 12 ? 1000 : (level >= 7 ? 650 : (level === 6 ? 450 : 250)));
      
      const tdsVal = row.tds === '' ? 0 : Number(row.tds);
      const otherDed = row.otherDeductions !== undefined ? Number(row.otherDeductions) : (u.otherDeductions || 0);
      const totalDed = tdsVal + npsEmp + pt + cghs + otherDed + ((isContract || isDirector) ? 0 : npsEmployer);
      const net = gross - totalDed;

      return {
        'Sl.No': i + 1,
        'Employee ID': u.employeeId || '',
        'Name of the Employee': `${u.firstName || ''} ${u.lastName || ''}`.trim(),
        'Designation': u.designation || '',
        'Pay Level': `Level-${u.payLevel || ''}`,
        'Basic Pay (Rs.)': bp,
        'DA 60% (Rs.)': da,
        'TA (Rs.)': ta,
        'HRA 20% (Rs.)': hra,
        'Dean / Warden Allowance (Rs.)': deanAllowance,
        'NPS Employer Share (Rs.)': npsEmployer,
        'Gross Salary (Rs.)': gross,
        'Professional Tax (Rs.)': pt,
        'TDS (Rs.)': tdsVal,
        'NPS Employee Share (Rs.)': npsEmp,
        'CGHS Contribution (Rs.)': cghs,
        'Other Deductions (Rs.)': otherDed,
        'Total Deductions (Rs.)': totalDed,
        'Net Salary (Rs.)': net,
        'Remark': row.remark || ''
      };
    });

    import('xlsx').then(XLSX => {
      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, `Salary_${months[month - 1]}_${year}`);
      XLSX.writeFile(wb, `IIPE_Salary_Statement_${months[month - 1]}_${year}.xlsx`);
      setMsg({ type: 'success', text: `✓ Salary register exported to Excel successfully!` });
    }).catch(() => {
      setMsg({ type: 'error', text: 'Error generating Excel export.' });
    });
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

  const totalPages = Math.max(1, Math.ceil(filteredPayrolls.length / itemsPerPage));
  const currentPayrolls = filteredPayrolls.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

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
    if (payrolls.length === 0) {
      setMsg({ type: 'error', text: 'No records to export.' });
      return;
    }
    const data = payrolls.map((p, i) => ({
      'Sl.No': i + 1,
      'Employee ID': p.employeeId,
      'Employee Name': userMap[p.employeeId] || p.employeeName || '',
      'Month': months[p.month - 1] || p.month,
      'Year': p.year,
      'Basic Pay (Rs.)': p.basicPay || 0,
      'DA (Rs.)': p.da || 0,
      'TA (Rs.)': p.ta || 0,
      'HRA (Rs.)': p.hra || 0,
      'Dean/Warden Allowance (Rs.)': p.otherAllowances || 0,
      'NPS Employer Share (Rs.)': p.npsEmployerShare || 0,
      'Gross Salary (Rs.)': p.grossSalary || 0,
      'Professional Tax (Rs.)': p.professionalTax || 0,
      'TDS (Rs.)': p.tds || 0,
      'NPS Employee Share (Rs.)': p.npsEmployeeShare || 0,
      'CGHS (Rs.)': p.cghs || 0,
      'Other Deductions (Rs.)': p.otherDeductions || 0,
      'Total Deductions (Rs.)': p.totalDeductions || 0,
      'Net Salary (Rs.)': p.netSalary || 0,
      'Status': p.status || '',
      'Remark': p.remark || ''
    }));
    import('xlsx').then(XLSX => {
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Payroll Register");
      XLSX.writeFile(wb, `IIPE_Payroll_Register_${months[month - 1]}_${year}.xlsx`);
      setMsg({ type: 'success', text: `✓ Payroll register exported to Excel successfully!` });
    }).catch(() => {
      setMsg({ type: 'error', text: 'Error generating Excel export.' });
    });
  };

  const isAdmin = apiService.isSuperAdmin() || apiService.isFAAdmin();

  return (
    <div className="page-container" style={{ padding: '24px 32px', width: '100%', overflowX: 'hidden' }}>
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
                <label className="form-label-iipm">Category</label>
                <select className="form-control-iipm" value={categoryFilter} onChange={e => setCategoryFilter(e.target.value as any)}>
                  <option value="all">All Personnel</option>
                  <option value="regular">👔 Regular Staff & Faculty</option>
                  <option value="contract">📄 Contract Staff</option>
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
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                {/* Filter Tabs */}
                <div style={{ display: 'flex', gap: '6px' }}>
                  {(['all', 'pending', 'processed'] as const).map(f => {
                    const count = f === 'all' ? rows.length : f === 'pending' ? pendingCount : processedCount;
                    const colors: Record<string, {bg: string, color: string, border: string}> = {
                      all: { bg: employeeFilter === 'all' ? '#0a3161' : '#f1f5f9', color: employeeFilter === 'all' ? '#fff' : '#475569', border: '#0a3161' },
                      pending: { bg: employeeFilter === 'pending' ? '#f59e0b' : '#fffbeb', color: employeeFilter === 'pending' ? '#fff' : '#92400e', border: '#f59e0b' },
                      processed: { bg: employeeFilter === 'processed' ? '#16a34a' : '#f0fdf4', color: employeeFilter === 'processed' ? '#fff' : '#166534', border: '#16a34a' },
                    };
                    const c = colors[f];
                    return (
                      <button key={f} onClick={() => setEmployeeFilter(f)}
                        style={{ padding: '6px 14px', borderRadius: '20px', border: `1.5px solid ${c.border}`, background: c.bg, color: c.color, fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer', transition: 'all 0.2s' }}>
                        {f.charAt(0).toUpperCase() + f.slice(1)} <span style={{ background: 'rgba(0,0,0,0.12)', borderRadius: '10px', padding: '1px 7px', marginLeft: '4px', fontSize: '0.75rem' }}>{count}</span>
                      </button>
                    );
                  })}
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <button className="btn-outline-iipm" onClick={exportGridToExcel} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 16px', fontWeight: 600, fontSize: '0.85rem' }}>
                    📊 Export to Excel
                  </button>
                  <button className="btn-accent-iipm" onClick={submitBulkPayroll} disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 18px', fontWeight: 600, fontSize: '0.85rem' }}>
                    {loading ? 'Submitting...' : '📤 Submit For Approval'}
                  </button>
                </div>
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
                  {filteredRows.map((row, i) => {
                    const u = row.user;
                    const isContract = isContractUser(u);
                    const isDirector = (u.employeeId === 'DIR001') || (u.payLevel && String(u.payLevel).includes('17')) || (u.designation && u.designation.toLowerCase().includes('director'));
                    const isRegistrar = u.employeeId === 'NT1022';
                    const bp = u.basicPay || 0;
                    const daPct = (settings.DA_PERCENTAGE || 60) / 100;
                    const hraPct = (settings.HRA_PERCENTAGE || 20) / 100;
                    const npsEmpPct = (settings.NPS_EMPLOYEE_PERCENTAGE || 10) / 100;
                    const npsEmployerPct = (settings.NPS_EMPLOYER_PERCENTAGE || 14) / 100;

                    const da = isContract ? 0 : Math.round(bp * daPct);
                    const hra = (isContract || isDirector || isRegistrar) ? 0 : Math.round(bp * hraPct);
                    
                    const level = parseInt(String(u.payLevel).replace(/\D/g, '') || '10', 10);
                    let ta = 0;
                    if (u.taOverride !== undefined && u.taOverride !== null) {
                      ta = u.taOverride;
                    } else if (isContract || isDirector || isRegistrar) {
                      ta = 0;
                    } else if (level >= 10) {
                      const taBase = settings.TA_FIXED_AMOUNT || 3600;
                      const taDaPct = (settings.TA_DA_PERCENTAGE || 60) / 100;
                      ta = Math.round(taBase * (1 + taDaPct));
                    } else if (level >= 1 && level <= 9) {
                      const taBase = 1800;
                      const taDaPct = (settings.TA_DA_PERCENTAGE || 60) / 100;
                      ta = Math.round(taBase * (1 + taDaPct));
                    }
                    
                    const deanAllowance = u.deanAllowance || u.specialAllowance || 0;
                    const npsEmp = (isContract || isDirector) ? 0 : Math.round((bp + da) * npsEmpPct);
                    const npsEmployer = (isContract || isDirector) ? 0 : Math.round((bp + da) * npsEmployerPct);
                    const gross = isContract ? (bp + deanAllowance) : (bp + da + hra + ta + npsEmployer + deanAllowance); 
                    
                    const pt = settings.PT_AMOUNT || 200;
                    const cghs = isContract ? 0 : (level >= 12 ? 1000 : (level >= 7 ? 650 : (level === 6 ? 450 : 250)));
                    
                    const tdsVal = row.tds === '' ? 0 : Number(row.tds);
                    const otherDed = row.otherDeductions !== undefined ? Number(row.otherDeductions) : (u.otherDeductions || 0);
                    const totalDed = tdsVal + npsEmp + pt + cghs + otherDed + ((isContract || isDirector) ? 0 : npsEmployer);
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
                        <td style={{ color: deanAllowance > 0 ? 'var(--primary)' : 'inherit', fontWeight: deanAllowance > 0 ? 600 : 400 }}>
                          {fmt(deanAllowance)}
                        </td>
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
                    <td colSpan={5} style={{ textAlign: 'right', paddingRight: '20px' }}>Total ({filteredRows.length})</td>
                    <td>{fmt(filteredRows.reduce((sum, row) => sum + (row.user.basicPay || 0), 0))}</td>
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

            <div style={{ marginLeft: 'auto', display: 'flex', gap: '6px' }}>
              <button
                type="button"
                onClick={() => setCategoryFilter('all')}
                className={`btn-iipm ${categoryFilter === 'all' ? 'btn-accent-iipm' : 'btn-outline-iipm'}`}
                style={{ padding: '6px 14px', fontSize: '0.8rem' }}
              >
                All ({payrolls.length})
              </button>
              <button
                type="button"
                onClick={() => setCategoryFilter('regular')}
                className={`btn-iipm ${categoryFilter === 'regular' ? 'btn-accent-iipm' : 'btn-outline-iipm'}`}
                style={{ padding: '6px 14px', fontSize: '0.8rem' }}
              >
                👔 Regular ({payrolls.filter(p => !isContractUser(p)).length})
              </button>
              <button
                type="button"
                onClick={() => setCategoryFilter('contract')}
                className={`btn-iipm ${categoryFilter === 'contract' ? 'btn-accent-iipm' : 'btn-outline-iipm'}`}
                style={{ padding: '6px 14px', fontSize: '0.8rem' }}
              >
                📄 Contract ({payrolls.filter(p => isContractUser(p)).length})
              </button>
            </div>
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
                <button className="btn-accent-iipm" onClick={exportPayrolls} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 16px', fontSize: '0.85rem', fontWeight: 600 }}>
                  📊 Export to Excel
                </button>
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
                      <th>Emp ID</th>
                      <th>Employee Name</th>
                      <th>Level</th>
                      <th>Gross</th>
                      <th>Net Salary</th>
                      <th>Status</th>
                      <th>Remark</th>
                      <th>Attachments</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentPayrolls.map((p: any) => (
                      <tr key={p.id}>
                        <td style={{ fontWeight: 600 }}>{p.employeeId}</td>
                        <td>{userMap[p.employeeId] || p.employeeName || '-'}</td>
                        <td>{p.payLevel ? `Level-${p.payLevel}` : '-'}</td>
                        <td>{fmt(p.grossSalary)}</td>
                        <td style={{ color: 'var(--success)', fontWeight: 700 }}>{fmt(p.netSalary)}</td>
                        <td>
                          <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700, background: `${statusBadge[p.status] || '#94a3b8'}20`, color: statusBadge[p.status] || '#94a3b8' }}>
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
                        <td style={{ whiteSpace: 'nowrap' }}>
                          {(p.status === 'PENDING' || p.status === 'DRAFT') && isAdmin && (
                            <>
                              <button onClick={() => handleApprove(p.id)} style={{ padding: '5px 10px', borderRadius: '6px', border: 'none', background: 'rgba(34,197,94,0.15)', color: '#22c55e', cursor: 'pointer', marginRight: '4px', fontSize: '0.78rem', fontWeight: 600, fontFamily: 'var(--font)' }}>
                                ✓ Approve
                              </button>
                              <button onClick={() => { setRejectModal({ id: p.id }); }} style={{ padding: '5px 10px', borderRadius: '6px', border: 'none', background: 'rgba(239,68,68,0.15)', color: '#ef4444', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600, fontFamily: 'var(--font)' }}>
                                ✗ Reject
                              </button>
                            </>
                          )}
                          {p.status === 'APPROVED' && <span style={{ color: '#22c55e', fontSize: '0.8rem', fontWeight: 600 }}>✓ Released</span>}
                          {p.status === 'REJECTED' && isAdmin && (
                            <button onClick={() => handleApprove(p.id)} style={{ padding: '5px 10px', borderRadius: '6px', border: 'none', background: 'rgba(34,197,94,0.15)', color: '#22c55e', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600, fontFamily: 'var(--font)' }}>
                              ✓ Re-Approve
                            </button>
                          )}
                        </td>
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
