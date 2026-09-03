import React, { useState, useEffect, useContext } from 'react';
import * as XLSX from 'xlsx';
import apiService from '../services/api';
import { UserContext } from '../App';

const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const shortMonths = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const ReportsPage: React.FC = () => {
  const userCtx = useContext(UserContext);
  const [tab, setTab] = useState<'register' | 'bank' | 'projection' | 'nps' | 'tds' | 'dept' | 'ytd' | 'comparison'>('register');
  const [bankCategoryFilter, setBankCategoryFilter] = useState<'all' | 'faculty' | 'staff' | 'contract'>('all');
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [userId, setUserId] = useState<string>('');
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const tabList = [
    { key: 'register', label: '📋 Salary Register' },
    { key: 'bank', label: '💳 Bank Payment Sheet' },
    { key: 'projection', label: '📊 TDS Projection Statement' },
    { key: 'nps', label: '🏛️ NPS Schedule' },
    { key: 'tds', label: '📑 TDS Summary' },
    { key: 'dept', label: '🏢 Department-wise' },
    { key: 'ytd', label: '📈 My YTD Summary' },
    { key: 'comparison', label: '⚖️ Salary Comparison' },
  ] as const;

  const [signatures, setSignatures] = useState({
    preparedBy: 'S.SIRISHA',
    verifiedBy1: 'Y RAMA RAO',
    verifiedBy2: 'DR. B.MURALI KRISHNA',
    approvedBy: 'SHRI.RAM PHAL DWIVEDI'
  });

  useEffect(() => {
    apiService.getAllUsers().then(res => setEmployees(res)).catch(console.error);
  }, []);

  const loadReport = async () => {
    setLoading(true); setData(null); setMsg(null);
    try {
      let result: any;
      if (tab === 'register' || tab === 'bank') result = await apiService.getSalaryRegister(month, year);
      else if (tab === 'projection') result = await apiService.getAllTdsProjections(year);
      else if (tab === 'nps')  result = await apiService.getNPSReport(year);
      else if (tab === 'tds')  result = await apiService.getTDSReport(year);
      else if (tab === 'dept') result = await apiService.getDepartmentReport(month, year);
      else if (tab === 'ytd')  result = await apiService.getYTDReport(userId || 'all', year);
      else if (tab === 'comparison') {
        if (!userId) { setLoading(false); return; }
        result = await apiService.getSalaryComparison(userId);
      }
      // For register and bank, attach user details to payroll data
      if ((tab === 'register' || tab === 'bank') && (result?.data || result)) {
        const payload = result.data || result;
        payload.payrolls = payload.payrolls?.map((p: any) => {
          const emp = employees.find(e => e.employeeId === p.employeeId || e.id === p.userId);
          return { 
            ...p, 
            designation: emp?.designation || '', 
            payLevel: emp?.payLevel || '', 
            staffFunction: emp?.function || emp?.employeeType || '',
            bankName: emp?.bankName || 'State Bank of India',
            bankAccountNumber: emp?.bankAccountNumber || '',
            ifscCode: emp?.ifscCode || 'SBIN0003170'
          };
        });
        setData(payload);
      } else {
        setData(result?.data || result);
      }
    } catch (e: any) {
      setMsg(e.response?.data?.message || 'Failed to load report.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadReport(); }, [tab]);

  const fmt = (n: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);
  const fmtN = (n: number) => new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(n || 0);

  const exportSalaryRegisterToExcel = () => {
    if (!data || !data.payrolls) return;

    // Split payrolls by staff type
    const facultyPayrolls = data.payrolls.filter((p: any) => p.staffFunction === 'Faculty');
    const nonTeachingPayrolls = data.payrolls.filter((p: any) => p.staffFunction !== 'Faculty');

    const wb = XLSX.utils.book_new();

    // 1. Generate Faculty Sheet
    if (facultyPayrolls.length > 0) {
      const facultyData = facultyPayrolls.map((p: any, i: number) => ({
        'Sl.no': i + 1,
        'Pay level': p.payLevel || '10',
        'Basic': p.basicPay || 0,
        'DA 60%': p.da || 0,
        'TA( Rs.3600+ * DA@60%)': p.ta || 0,
        'HRA 20 %': p.hra || 0,
        'Dean / Warden Allowance': p.otherAllowances || 0,
        'NPS Employer share': p.npsEmployerShare || 0,
        'Gross Salary': p.grossSalary || 0,
        'PT': p.professionalTax || 0,
        'TDS': p.tds || 0,
        'NPS Employee share': p.npsEmployeeShare || 0,
        'NPS Employer share_1': p.npsEmployerShare || 0, // Duplicate name bypass in XLSX
        'CGHS Contribution': p.cghs || 0,
        'Other deductions': p.otherDeductions || 0,
        'Total Deductions': p.totalDeductions || 0,
        'Net Salary': p.netSalary || 0
      }));

      const facultyTotals = facultyData.reduce((acc: any, curr: any) => {
        Object.keys(curr).forEach(key => {
          if (key !== 'Sl.no' && key !== 'Pay level') {
            acc[key] = (acc[key] || 0) + (curr[key] || 0);
          }
        });
        return acc;
      }, { 'Sl.no': 'Total', 'Pay level': '' });
      facultyData.push(facultyTotals);

      // Fix duplicate column name for rendering
      const finalFacultyData = facultyData.map((row: any) => {
        const newRow: any = { ...row };
        newRow['NPS Employer share '] = newRow['NPS Employer share_1']; // Add trailing space to differentiate keys
        delete newRow['NPS Employer share_1'];
        return newRow;
      });

      // Append Signature Block
      finalFacultyData.push({}, {}, {}); // 3 empty rows
      finalFacultyData.push({
        'Sl.no': 'PREPARED BY',
        'DA 60%': 'VERIFIED BY',
        'Gross Salary': 'VERIFIED BY',
        'CGHS Contribution': 'APPROVED /NOT APPROVED'
      });
      finalFacultyData.push({
        'Sl.no': `(${signatures.preparedBy})`,
        'DA 60%': `(${signatures.verifiedBy1})`,
        'Gross Salary': `(${signatures.verifiedBy2})`,
        'CGHS Contribution': `(${signatures.approvedBy})`
      });
      finalFacultyData.push({
        'Sl.no': 'ACCOUNTS EXECUTIVE',
        'DA 60%': 'Jr SUPTD(ACTING ASSISTANT REGISTRAR (F&A))',
        'Gross Salary': 'JOINT REGISTRAR',
        'CGHS Contribution': 'REGISTRAR'
      });

      const wsFaculty = XLSX.utils.json_to_sheet(finalFacultyData);
      XLSX.utils.book_append_sheet(wb, wsFaculty, "Faculty");
    }

    // 2. Generate Non-Teaching Sheet
    if (nonTeachingPayrolls.length > 0) {
      const nonTeachingData = nonTeachingPayrolls.map((p: any) => ({
        'Designation': p.designation || 'Staff',
        'Pay Scale': `Level-${p.payLevel || '10'}`,
        'Basic': p.basicPay || 0,
        'DA 60%': p.da || 0,
        'TA': p.ta || 0,
        'HRA 20 %': p.hra || 0,
        'NPS Employer Share': p.npsEmployerShare || 0,
        'Gross salary': p.grossSalary || 0,
        'PT': p.professionalTax || 0,
        'TDS': p.tds || 0,
        'NPS Employee share': p.npsEmployeeShare || 0,
        'NPS Employer share': p.npsEmployerShare || 0,
        'CGHS Contribution': p.cghs || 0,
        'Other Recovery': p.otherDeductions || 0,
        'Total Deductions': p.totalDeductions || 0,
        'Net Salary': p.netSalary || 0
      }));

      const nonTeachingTotals = nonTeachingData.reduce((acc: any, curr: any) => {
        Object.keys(curr).forEach(key => {
          if (key !== 'Designation' && key !== 'Pay Scale') {
            acc[key] = (acc[key] || 0) + (curr[key] || 0);
          }
        });
        return acc;
      }, { 'Designation': 'TOTAL', 'Pay Scale': '' });
      nonTeachingData.push(nonTeachingTotals);

      // Fix duplicate column name
      const finalNTData = nonTeachingData.map((row: any) => {
        const newRow: any = { ...row };
        // Since XLSX handles duplicate keys in objects by overwriting, we need to ensure the JS objects have unique keys, but the excel sheet can have same headers. 
        // Wait, JSON objects can't have duplicate keys. So I need to use an array of arrays for custom headers, but this is fine (trailing space).
        newRow['NPS Employer share '] = newRow['NPS Employer share']; 
        return newRow;
      });

      // Append Signature Block
      finalNTData.push({}, {}, {}); // 3 empty rows
      finalNTData.push({
        'Designation': 'PREPARED BY',
        'DA 60%': 'VERIFIED BY',
        'Gross salary': 'VERIFIED BY',
        'CGHS Contribution': 'APPROVED /NOT APPROVED'
      });
      finalNTData.push({
        'Designation': `(${signatures.preparedBy})`,
        'DA 60%': `(${signatures.verifiedBy1})`,
        'Gross salary': `(${signatures.verifiedBy2})`,
        'CGHS Contribution': `(${signatures.approvedBy})`
      });
      finalNTData.push({
        'Designation': 'ACCOUNTS EXECUTIVE',
        'DA 60%': 'Jr SUPTD(ACTING ASSISTANT REGISTRAR (F&A))',
        'Gross salary': 'JOINT REGISTRAR',
        'CGHS Contribution': 'REGISTRAR'
      });

      const wsNT = XLSX.utils.json_to_sheet(finalNTData);
      XLSX.utils.book_append_sheet(wb, wsNT, "Non teaching Staff");
    }

    if (wb.SheetNames.length === 0) {
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([{ Message: "No data available" }]), "Sheet1");
    }

    XLSX.writeFile(wb, `INDIAN_INSTITUTE_OF_PETROLEUM_AND_ENERGY_Salary_${months[month-1]}_${year}.xlsx`);
  };

  const exportBankPaymentSheetToExcel = () => {
    if (!data || !data.payrolls) return;
    const wb = XLSX.utils.book_new();

    const filtered = data.payrolls.filter((p: any) => {
      const isContract = (p.employeeType || p.staffFunction || '').toLowerCase().includes('contract') || (p.payLevel || '').toLowerCase().includes('consolidated') || (p.employeeId || '').startsWith('CNT') || (p.employeeId || '').startsWith('CT') || (p.employeeId || '').startsWith('CMED');
      const isFaculty = (p.employeeId || '').startsWith('TS') && !isContract;
      if (bankCategoryFilter === 'faculty') return isFaculty;
      if (bankCategoryFilter === 'staff') return !isFaculty && !isContract;
      if (bankCategoryFilter === 'contract') return isContract;
      return true;
    });

    const exportRows = filtered.map((p: any, idx: number) => ({
      'Sl. No.': idx + 1,
      'Employee ID': p.employeeId,
      'Employee Name': p.employeeName || `${p.firstName || ''} ${p.lastName || ''}`.trim(),
      'Designation': p.designation || '-',
      'Bank Name': p.bankName || 'State Bank of India',
      'Bank Account Number': p.bankAccountNumber || '-',
      'IFSC Code': p.ifscCode || 'SBIN0003170',
      'Net Amount Payable (Rs.)': p.netSalary || 0,
    }));

    const totalNet = filtered.reduce((s: number, p: any) => s + (p.netSalary || 0), 0);
    exportRows.push({
      'Sl. No.': 'TOTAL',
      'Employee ID': '',
      'Employee Name': '',
      'Designation': '',
      'Bank Name': '',
      'Bank Account Number': '',
      'IFSC Code': '',
      'Net Amount Payable (Rs.)': totalNet,
    } as any);

    const ws = XLSX.utils.json_to_sheet(exportRows);
    XLSX.utils.book_append_sheet(wb, ws, `Bank_Advice_${shortMonths[month - 1]}_${year}`);
    XLSX.writeFile(wb, `IIPE_Bank_Payment_Advice_${months[month - 1]}_${year}.xlsx`);
  };

  const printBankAdviceLetter = () => {
    if (!data || !data.payrolls) return;
    const filtered = data.payrolls.filter((p: any) => {
      const isContract = (p.employeeType || p.staffFunction || '').toLowerCase().includes('contract') || (p.payLevel || '').toLowerCase().includes('consolidated') || (p.employeeId || '').startsWith('CNT') || (p.employeeId || '').startsWith('CT') || (p.employeeId || '').startsWith('CMED');
      const isFaculty = (p.employeeId || '').startsWith('TS') && !isContract;
      if (bankCategoryFilter === 'faculty') return isFaculty;
      if (bankCategoryFilter === 'staff') return !isFaculty && !isContract;
      if (bankCategoryFilter === 'contract') return isContract;
      return true;
    });
    const totalAmount = filtered.reduce((s: number, p: any) => s + (p.netSalary || 0), 0);
    const getLastWorkingDay = (yr: number, m: number): string => {
      const d = new Date(yr, m, 0);
      if (d.getDay() === 6) d.setDate(d.getDate() - 1);
      else if (d.getDay() === 0) d.setDate(d.getDate() - 2);
      const dd = String(d.getDate()).padStart(2, '0');
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      return `${dd}/${mm}/${d.getFullYear()}`;
    };

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Bank Payment Advice - ${months[month - 1]} ${year}</title>
        <style>
          body { font-family: 'Times New Roman', serif; font-size: 11pt; margin: 20mm 15mm; color: #000; }
          .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 8px; margin-bottom: 15px; }
          .title { font-size: 15pt; font-weight: bold; margin-bottom: 4px; }
          .subtitle { font-size: 10pt; }
          .ref-table { width: 100%; margin-bottom: 15px; font-size: 10.5pt; }
          .advice-table { width: 100%; border-collapse: collapse; margin: 15px 0; font-size: 9.5pt; }
          .advice-table th, .advice-table td { border: 1px solid #000; padding: 5px 6px; }
          .text-right { text-align: right; }
          .text-center { text-align: center; }
          .bold { font-weight: bold; }
          .sig-container { display: flex; justify-content: space-between; margin-top: 50px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="title">INDIAN INSTITUTE OF PETROLEUM AND ENERGY</div>
          <div class="subtitle">2nd Floor, AU Engg College Main Block, Andhra University, Visakhapatnam - 530003</div>
        </div>
        <table class="ref-table">
          <tr>
            <td>Ref No: IIPE/PAYROLL/${year}/${shortMonths[month - 1].toUpperCase()}</td>
            <td class="text-right">Date: ${getLastWorkingDay(year, month)}</td>
          </tr>
        </table>
        <p>To,<br><b>The Branch Manager,</b><br>State Bank of India,<br>AU College of Engineering Campus Branch,<br>Visakhapatnam - 530003</p>
        <p><b>Dear Sir,</b></p>
        <p>We authorize you to debit IIPE Revenue Current Account No. <b>39877553958</b> and remit the following net salary amounts to the respective bank accounts of our employees towards <b>${months[month - 1]} ${year}</b> Salaries:</p>
        <table class="advice-table">
          <thead>
            <tr style="background:#f2f2f2;">
              <th class="text-center" style="width:5%;">Sl.No</th>
              <th class="text-center" style="width:10%;">Emp ID</th>
              <th>Employee Name</th>
              <th>Bank Name</th>
              <th>Account Number</th>
              <th class="text-center">IFSC Code</th>
              <th class="text-right" style="width:15%;">Net Amount (Rs.)</th>
            </tr>
          </thead>
          <tbody>
            ${filtered.map((p: any, idx: number) => `
              <tr>
                <td class="text-center">${idx + 1}</td>
                <td class="text-center">${p.employeeId}</td>
                <td><b>${p.employeeName || (p.firstName + ' ' + p.lastName)}</b></td>
                <td>${p.bankName || 'State Bank of India'}</td>
                <td>${p.bankAccountNumber || '-'}</td>
                <td class="text-center">${p.ifscCode || 'SBIN0003170'}</td>
                <td class="text-right bold">${Number(p.netSalary || 0).toLocaleString('en-IN')}</td>
              </tr>
            `).join('')}
            <tr style="background:#f9f9f9;">
              <td colspan="6" class="bold text-center">TOTAL DISBURSEMENT AMOUNT</td>
              <td class="text-right bold" style="font-size:11pt;">₹ ${Number(totalAmount).toLocaleString('en-IN')}</td>
            </tr>
          </tbody>
        </table>
        <p style="margin-top:20px;">Yours Faithfully,<br><b>For Indian Institute of Petroleum and Energy</b></p>
        <div class="sig-container" style="margin-top:50px;">
          <div>_______________________<br><b>Prepared / Verified By</b><br>F&A Section</div>
          <div style="text-align:center;">_______________________<br><b>Finance & Accounts Officer</b></div>
          <div style="text-align:right;">_______________________<br><b>Registrar / Authorized Signatory</b></div>
        </div>
      </body>
      </html>
    `;
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(html);
      win.document.close();
      win.print();
    }
  };

  const exportTdsProjectionToExcel = () => {
    if (!data || !Array.isArray(data)) return;
    const wb = XLSX.utils.book_new();
    const rows = data.map((d: any, idx: number) => ({
      'Sl.No': idx + 1,
      'Emp ID': d.employeeId,
      'Employee Name': d.employeeName,
      'Designation': d.designation,
      'Department': d.department,
      'PAN': d.pan,
      'Tax Regime': d.taxRegime,
      'Projected Annual Gross (Rs.)': d.projectedAnnualGross || 0,
      'Standard Deduction (Rs.)': d.standardDeduction || 0,
      'Sec 80CCD(2) NPS Share (Rs.)': Math.round(d.deduction80CCD2 || 0),
      'Professional Tax (Rs.)': d.professionalTax || 0,
      'Other Chapter VI-A (Rs.)': d.otherChapterVIADeductions || 0,
      'Net Taxable Income (Rs.)': d.netTaxableIncome || 0,
      'Estimated Annual Tax (Rs.)': d.estimatedAnnualTax || 0,
      'TDS Deducted So Far (Rs.)': d.tdsDeductedSoFar || 0,
      'Balance Tax to Deduct (Rs.)': d.tdsRemainingToBeDeducted || 0,
      'Remaining Months': d.monthsRemainingCount || 0,
      'Monthly TDS for Next Months (Rs.)': d.monthlyTdsNextMonths || 0
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, `TDS_Projection_${year}`);
    XLSX.writeFile(wb, `IIPE_TDS_Projection_FY_${year}-${year + 1}.xlsx`);
  };

  return (
    <div className="page-container">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1>Reports</h1>
          <p>Salary register, NPS, TDS, department-wise, and Form 16 reports</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          {tab === 'register' && (
            <button className="btn-success-iipm" onClick={exportSalaryRegisterToExcel}>
              📊 Export to Excel
            </button>
          )}
          {tab === 'projection' && (
            <button className="btn-success-iipm" onClick={exportTdsProjectionToExcel}>
              📊 Export TDS Excel
            </button>
          )}
          <button className="btn-primary-iipm" onClick={() => window.print()}>
            🖨 Print / Export PDF
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--border)', marginBottom: '24px', overflowX: 'auto' }}>
        {tabList.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            padding: '10px 20px', background: 'none', border: 'none', whiteSpace: 'nowrap',
            borderBottom: `2px solid ${tab === t.key ? 'var(--accent)' : 'transparent'}`,
            color: tab === t.key ? 'var(--accent)' : 'var(--text-muted)',
            fontWeight: 600, cursor: 'pointer', fontSize: '0.88rem', fontFamily: 'var(--font)'
          }}>{t.label}</button>
        ))}
      </div>

      {/* Filters */}
      <div className="card-iipm" style={{ padding: '16px 20px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          {(tab === 'register' || tab === 'dept') && (
            <div>
              <label className="form-label-iipm">Month</label>
              <select className="form-control-iipm" value={month} onChange={e => setMonth(+e.target.value)} style={{ width: '150px' }}>
                {months.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
              </select>
            </div>
          )}
          {tab === 'comparison' && (
            <div>
              <label className="form-label-iipm">Select Employee</label>
              <select className="form-control-iipm" value={userId} onChange={e => setUserId(e.target.value)} style={{ width: '280px' }}>
                <option value="">-- Select Employee --</option>
                {employees.map(e => <option key={e.id} value={e.id}>{e.name} ({e.employeeId || e.id})</option>)}
              </select>
            </div>
          )}
          {tab === 'ytd' && (
            <div>
              <label className="form-label-iipm">Select Employee</label>
              <select className="form-control-iipm" value={userId} onChange={e => setUserId(e.target.value)} style={{ width: '280px' }}>
                <option value="">🏢 All Employees (Institute Consolidated)</option>
                {employees.map(e => <option key={e.id} value={e.id}>{e.name} ({e.employeeId || e.id})</option>)}
              </select>
            </div>
          )}
          {tab !== 'comparison' && (
            <div>
              <label className="form-label-iipm">Year</label>
              <input type="number" className="form-control-iipm" value={year} onChange={e => setYear(+e.target.value)} style={{ width: '100px' }} />
            </div>
          )}
          <button className="btn-primary-iipm" onClick={loadReport} disabled={loading || (tab === 'comparison' && !userId)}>
            {loading ? '⏳ Loading...' : '🔍 Generate Report'}
          </button>
        </div>
        {tab === 'register' && (
          <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border)' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '12px' }}>EXCEL EXPORT SIGNATURE BLOCK CONFIGURATION</div>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <div><label className="form-label-iipm">Prepared By</label><input className="form-control-iipm" value={signatures.preparedBy} onChange={e => setSignatures({...signatures, preparedBy: e.target.value})} style={{width: '200px'}} /></div>
              <div><label className="form-label-iipm">Verified By (1)</label><input className="form-control-iipm" value={signatures.verifiedBy1} onChange={e => setSignatures({...signatures, verifiedBy1: e.target.value})} style={{width: '200px'}} /></div>
              <div><label className="form-label-iipm">Verified By (2)</label><input className="form-control-iipm" value={signatures.verifiedBy2} onChange={e => setSignatures({...signatures, verifiedBy2: e.target.value})} style={{width: '200px'}} /></div>
              <div><label className="form-label-iipm">Approved By</label><input className="form-control-iipm" value={signatures.approvedBy} onChange={e => setSignatures({...signatures, approvedBy: e.target.value})} style={{width: '200px'}} /></div>
            </div>
          </div>
        )}
      </div>

      {msg && <div className="alert-iipm alert-danger">{msg}</div>}

      {/* ===== SALARY REGISTER ===== */}
      {tab === 'register' && data && (
        <>
          {/* Summary */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '20px' }}>
            {[
              { label: 'Total Employees', value: fmtN(data.totalEmployees), icon: '👥', color: '#3b82f6' },
              { label: 'Total Gross', value: fmt(data.totalGross), icon: '💰', color: '#c9a84c' },
              { label: 'Total Deductions', value: fmt(data.totalDeductions), icon: '➖', color: '#ef4444' },
              { label: 'Net Disbursement', value: fmt(data.totalNet), icon: '✅', color: '#22c55e' },
            ].map((s, i) => (
              <div className="stat-card" key={i}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div><div className="stat-label">{s.label}</div><div className="stat-value" style={{ fontSize: '1.4rem', color: s.color }}>{s.value}</div></div>
                  <div style={{ fontSize: '1.8rem', opacity: 0.4 }}>{s.icon}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="card-iipm" style={{ padding: 0 }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', fontWeight: 600 }}>
              Salary Register — {months[month - 1]} {year}
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table className="table-iipm">
                <thead>
                  <tr>
                    <th>#</th><th>Employee ID</th><th>Basic</th><th>DA</th><th>HRA</th><th>TA</th>
                    <th>Gross</th><th>TDS</th><th>NPS Emp</th><th>NPS Emp (14%)</th><th>PT</th><th>Total Ded.</th><th>Net Pay</th><th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {(data.payrolls || []).map((p: any, i: number) => (
                    <tr key={p.id}>
                      <td style={{ color: 'var(--text-muted)' }}>{i + 1}</td>
                      <td style={{ fontFamily: 'monospace', fontSize: '0.82rem' }}>{p.employeeId}</td>
                      <td>{fmt(p.basicPay)}</td><td>{fmt(p.da)}</td><td>{fmt(p.hra)}</td><td>{fmt(p.ta)}</td>
                      <td style={{ fontWeight: 600 }}>{fmt(p.grossSalary)}</td>
                      <td>{fmt(p.tds)}</td><td>{fmt(p.npsEmployeeShare)}</td><td>{fmt(p.npsEmployerShare)}</td>
                      <td>{fmt(p.professionalTax)}</td><td>{fmt(p.totalDeductions)}</td>
                      <td style={{ color: '#22c55e', fontWeight: 700 }}>{fmt(p.netSalary)}</td>
                      <td><span style={{ fontSize: '0.75rem', fontWeight: 700 }}>{p.status}</span></td>
                    </tr>
                  ))}
                  {!data.payrolls?.length && (
                    <tr><td colSpan={14} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>No payroll data for this period.</td></tr>
                  )}
                </tbody>
                <tfoot>
                  <tr style={{ background: 'var(--bg-hover)', fontWeight: 700 }}>
                    <td colSpan={6} style={{ padding: '12px 16px', color: 'var(--accent)' }}>TOTALS</td>
                    <td style={{ padding: '12px 16px', color: 'var(--accent)' }}>{fmt(data.totalGross)}</td>
                    <td colSpan={4}></td>
                    <td style={{ padding: '12px 16px', color: '#ef4444' }}>{fmt(data.totalDeductions)}</td>
                    <td style={{ padding: '12px 16px', color: '#22c55e' }}>{fmt(data.totalNet)}</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ===== BANK PAYMENT SHEET ===== */}
      {tab === 'bank' && data && (
        <div>
          {/* Header Action Bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              {(['all', 'faculty', 'staff', 'contract'] as const).map(cat => (
                <button
                  key={cat}
                  onClick={() => setBankCategoryFilter(cat)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '20px',
                    border: `1.5px solid ${bankCategoryFilter === cat ? '#0a3161' : '#e2e8f0'}`,
                    background: bankCategoryFilter === cat ? '#0a3161' : '#ffffff',
                    color: bankCategoryFilter === cat ? '#ffffff' : '#475569',
                    fontWeight: 600,
                    fontSize: '0.85rem',
                    cursor: 'pointer'
                  }}
                >
                  {cat === 'all' ? 'All Employees' : cat === 'faculty' ? 'Teaching Faculty' : cat === 'staff' ? 'Non-Teaching Staff' : 'Contract Staff'}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button className="btn-outline-iipm" onClick={exportBankPaymentSheetToExcel} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                📊 Export Bank Excel
              </button>
              <button className="btn-accent-iipm" onClick={printBankAdviceLetter} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                📄 Print Bank Advice Letter
              </button>
            </div>
          </div>

          {/* Bank Summary Cards */}
          {(() => {
            const filteredPayrolls = (data.payrolls || []).filter((p: any) => {
              const isContract = (p.employeeType || p.staffFunction || '').toLowerCase().includes('contract') || (p.payLevel || '').toLowerCase().includes('consolidated') || (p.employeeId || '').startsWith('CNT') || (p.employeeId || '').startsWith('CT') || (p.employeeId || '').startsWith('CMED');
              const isFaculty = (p.employeeId || '').startsWith('TS') && !isContract;
              if (bankCategoryFilter === 'faculty') return isFaculty;
              if (bankCategoryFilter === 'staff') return !isFaculty && !isContract;
              if (bankCategoryFilter === 'contract') return isContract;
              return true;
            });
            const totalDisbursement = filteredPayrolls.reduce((sum: number, p: any) => sum + (p.netSalary || 0), 0);
            const sbiCount = filteredPayrolls.filter((p: any) => (p.bankName || '').toLowerCase().includes('state bank') || (p.ifscCode || '').startsWith('SBIN')).length;
            const otherBankCount = filteredPayrolls.length - sbiCount;

            return (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '20px' }}>
                  <div className="stat-card">
                    <div className="stat-label">Total Beneficiaries</div>
                    <div className="stat-value" style={{ fontSize: '1.5rem', color: '#0a3161' }}>{filteredPayrolls.length} Employees</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-label">Total Net Salary Disbursement</div>
                    <div className="stat-value" style={{ fontSize: '1.5rem', color: '#16a34a' }}>{fmt(totalDisbursement)}</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-label">SBI AUCE Campus Remittance</div>
                    <div className="stat-value" style={{ fontSize: '1.5rem', color: '#3b82f6' }}>{sbiCount} Accounts</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-label">Other Bank Branches</div>
                    <div className="stat-value" style={{ fontSize: '1.5rem', color: '#f59e0b' }}>{otherBankCount} Accounts</div>
                  </div>
                </div>

                <div className="card-iipm" style={{ padding: '0', overflow: 'hidden' }}>
                  <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', background: '#f8fafc' }}>
                    <h3 style={{ margin: 0, fontSize: '1.05rem', color: '#0f172a' }}>
                      Bank Remittance Schedule — {months[month - 1]} {year}
                    </h3>
                    <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      Debit Account: IIPE Revenue Current Account (No. 39877553958) | State Bank of India
                    </p>
                  </div>

                  <div style={{ overflowX: 'auto' }}>
                    <table className="table-iipm" style={{ whiteSpace: 'nowrap', fontSize: '0.85rem' }}>
                      <thead>
                        <tr style={{ background: '#f1f5f9' }}>
                          <th>Sl. No.</th>
                          <th>Emp ID</th>
                          <th>Employee Name</th>
                          <th>Designation</th>
                          <th>Bank Name</th>
                          <th>Bank Account Number</th>
                          <th>IFSC Code</th>
                          <th style={{ textAlign: 'right' }}>Net Amount Payable (₹)</th>
                          <th style={{ textAlign: 'center' }}>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredPayrolls.map((p: any, i: number) => (
                          <tr key={p.employeeId || i}>
                            <td style={{ color: 'var(--text-muted)' }}>{i + 1}</td>
                            <td style={{ fontWeight: 600 }}>{p.employeeId}</td>
                            <td style={{ fontWeight: 600 }}>{p.employeeName || `${p.firstName || ''} ${p.lastName || ''}`.trim()}</td>
                            <td>{p.designation || '-'}</td>
                            <td>{p.bankName || 'State Bank of India'}</td>
                            <td style={{ fontFamily: 'monospace', fontWeight: 600, color: '#0f172a' }}>
                              {p.bankAccountNumber || <span style={{ color: '#ef4444' }}>Not Configured</span>}
                            </td>
                            <td style={{ fontFamily: 'monospace', color: 'var(--text-muted)' }}>{p.ifscCode || 'SBIN0003170'}</td>
                            <td style={{ textAlign: 'right', fontWeight: 700, color: '#16a34a' }}>{fmt(p.netSalary)}</td>
                            <td style={{ textAlign: 'center' }}>
                              <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '2px 8px', borderRadius: '12px', background: p.status === 'APPROVED' ? '#dcfce7' : '#fef3c7', color: p.status === 'APPROVED' ? '#166534' : '#92400e' }}>
                                {p.status || 'PROCESSED'}
                              </span>
                            </td>
                          </tr>
                        ))}
                        {!filteredPayrolls.length && (
                          <tr>
                            <td colSpan={9} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                              No bank payment records found for the selected category.
                            </td>
                          </tr>
                        )}
                      </tbody>
                      <tfoot>
                        <tr style={{ background: '#f8fafc', fontWeight: 700 }}>
                          <td colSpan={7} style={{ padding: '12px 16px', color: 'var(--accent)' }}>TOTAL DISBURSEMENT AMOUNT</td>
                          <td style={{ padding: '12px 16px', textAlign: 'right', color: '#16a34a', fontSize: '1rem' }}>{fmt(totalDisbursement)}</td>
                          <td></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              </>
            );
          })()}
        </div>
      )}

      {/* ===== TDS PROJECTION STATEMENT ===== */}
      {tab === 'projection' && data && Array.isArray(data) && (
        <div>
          {/* Summary Cards */}
          {(() => {
            const totalEmployees = data.length;
            const totalProjectedTax = data.reduce((s: number, d: any) => s + (d.estimatedAnnualTax || 0), 0);
            const totalTdsDeducted = data.reduce((s: number, d: any) => s + (d.tdsDeductedSoFar || 0), 0);
            const totalRemainingTax = data.reduce((s: number, d: any) => s + (d.tdsRemainingToBeDeducted || 0), 0);
            const totalMonthlyRemainingTds = data.reduce((s: number, d: any) => s + (d.monthlyTdsNextMonths || 0), 0);

            return (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '16px', marginBottom: '20px' }}>
                  <div className="stat-card">
                    <div className="stat-label">Total Employees</div>
                    <div className="stat-value" style={{ fontSize: '1.5rem', color: '#0a3161' }}>{totalEmployees} Staff</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-label">Total Estimated Annual Tax</div>
                    <div className="stat-value" style={{ fontSize: '1.5rem', color: '#c9a84c' }}>{fmt(totalProjectedTax)}</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-label">💰 TDS Deducted So Far (YTD)</div>
                    <div className="stat-value" style={{ fontSize: '1.5rem', color: '#16a34a' }}>{fmt(totalTdsDeducted)}</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-label">⚖️ Total Balance Tax to Deduct</div>
                    <div className="stat-value" style={{ fontSize: '1.5rem', color: '#dc2626' }}>{fmt(totalRemainingTax)}</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-label">📅 Monthly Projected TDS</div>
                    <div className="stat-value" style={{ fontSize: '1.5rem', color: '#2563eb' }}>{fmt(totalMonthlyRemainingTds)} / mo</div>
                  </div>
                </div>

                <div className="card-iipm" style={{ padding: '0', overflow: 'hidden' }}>
                  <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', background: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '1.05rem', color: '#0f172a' }}>
                        Annual TDS Projection & Deduction Statement — FY {year}-{year + 1}
                      </h3>
                      <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        Institutional summary of estimated annual tax, actual TDS collected so far, and monthly TDS to be deducted for next months
                      </p>
                    </div>
                    <button className="btn-success-iipm" onClick={exportTdsProjectionToExcel} style={{ fontSize: '0.85rem', padding: '6px 14px' }}>
                      📊 Export Excel Schedule
                    </button>
                  </div>

                  <div style={{ overflowX: 'auto' }}>
                    <table className="table-iipm" style={{ whiteSpace: 'nowrap', fontSize: '0.85rem' }}>
                      <thead>
                        <tr style={{ background: '#f1f5f9' }}>
                          <th>Sl. No.</th>
                          <th>Emp ID</th>
                          <th>Employee Name</th>
                          <th>Designation</th>
                          <th>PAN</th>
                          <th>Regime</th>
                          <th style={{ textAlign: 'right' }}>Projected Gross (₹)</th>
                          <th style={{ textAlign: 'right' }}>Sec 80CCD(2) NPS (₹)</th>
                          <th style={{ textAlign: 'right' }}>Net Taxable (₹)</th>
                          <th style={{ textAlign: 'right' }}>Est. Annual Tax (₹)</th>
                          <th style={{ textAlign: 'right', color: '#16a34a' }}>💰 TDS Deducted (₹)</th>
                          <th style={{ textAlign: 'right', color: '#dc2626' }}>⚖️ Balance Tax (₹)</th>
                          <th style={{ textAlign: 'right', color: '#2563eb' }}>📅 Monthly TDS (₹/mo)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.map((d: any, idx: number) => (
                          <tr key={d.userId || idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ textAlign: 'center' }}>{idx + 1}</td>
                            <td><strong>{d.employeeId}</strong></td>
                            <td>{d.employeeName}</td>
                            <td>{d.designation}</td>
                            <td><span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{d.pan}</span></td>
                            <td>
                              <span style={{
                                padding: '2px 8px', borderRadius: '10px', fontSize: '0.72rem', fontWeight: 700,
                                background: d.taxRegime === 'NEW' ? 'rgba(59,130,246,0.1)' : 'rgba(245,158,11,0.1)',
                                color: d.taxRegime === 'NEW' ? '#2563eb' : '#d97706'
                              }}>
                                {d.taxRegime}
                              </span>
                            </td>
                            <td style={{ textAlign: 'right' }}>{fmt(d.projectedAnnualGross)}</td>
                            <td style={{ textAlign: 'right' }}>{fmt(Math.round(d.deduction80CCD2 || 0))}</td>
                            <td style={{ textAlign: 'right' }}>{fmt(d.netTaxableIncome)}</td>
                            <td style={{ textAlign: 'right', fontWeight: 600 }}>{fmt(d.estimatedAnnualTax)}</td>
                            <td style={{ textAlign: 'right', fontWeight: 700, color: '#16a34a' }}>{fmt(d.tdsDeductedSoFar)}</td>
                            <td style={{ textAlign: 'right', fontWeight: 700, color: '#dc2626' }}>{fmt(d.tdsRemainingToBeDeducted)}</td>
                            <td style={{ textAlign: 'right', fontWeight: 700, color: '#2563eb', background: 'rgba(37,99,235,0.04)' }}>
                              {fmt(d.monthlyTdsNextMonths)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr style={{ background: '#f8fafc', fontWeight: 700 }}>
                          <td colSpan={6} style={{ padding: '12px 16px', color: 'var(--accent)' }}>INSTITUTIONAL TOTALS</td>
                          <td style={{ textAlign: 'right' }}>{fmt(data.reduce((s: number, d: any) => s + (d.projectedAnnualGross || 0), 0))}</td>
                          <td style={{ textAlign: 'right' }}>{fmt(data.reduce((s: number, d: any) => s + (d.deduction80CCD2 || 0), 0))}</td>
                          <td style={{ textAlign: 'right' }}>{fmt(data.reduce((s: number, d: any) => s + (d.netTaxableIncome || 0), 0))}</td>
                          <td style={{ textAlign: 'right' }}>{fmt(totalProjectedTax)}</td>
                          <td style={{ textAlign: 'right', color: '#16a34a' }}>{fmt(totalTdsDeducted)}</td>
                          <td style={{ textAlign: 'right', color: '#dc2626' }}>{fmt(totalRemainingTax)}</td>
                          <td style={{ textAlign: 'right', color: '#2563eb' }}>{fmt(totalMonthlyRemainingTds)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              </>
            );
          })()}
        </div>
      )}

      {/* ===== NPS REPORT ===== */}
      {tab === 'nps' && data && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '20px' }}>
            {[
              { label: 'Total NPS (Employee 10%)', value: fmt(data.totalNPSEmployee), color: '#3b82f6' },
              { label: 'Total NPS (Employer 14%)', value: fmt(data.totalNPSEmployer), color: '#8b5cf6' },
              { label: 'Total NPS Trust Contribution', value: fmt(data.totalNPS), color: '#c9a84c' },
            ].map((s, i) => (
              <div className="stat-card" key={i}>
                <div className="stat-label">{s.label}</div>
                <div className="stat-value" style={{ fontSize: '1.5rem', color: s.color }}>{s.value}</div>
              </div>
            ))}
          </div>
          <div className="card-iipm" style={{ padding: '20px' }}>
            <h3 style={{ marginBottom: '16px' }}>Monthly NPS Contribution — {year}</h3>
            <table className="table-iipm">
              <thead><tr><th>Month</th><th>NPS Contribution (Employee + Employer)</th></tr></thead>
              <tbody>
                {Object.entries(data.monthlyData || {}).sort().map(([m, v]: [string, any]) => (
                  <tr key={m}><td>{shortMonths[parseInt(m) - 1] || m}</td><td>{fmt(v)}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ===== TDS REPORT ===== */}
      {tab === 'tds' && data && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '20px' }}>
            {[
              { label: 'Total TDS (Annual)', value: fmt(data.totalTDS), color: '#ef4444' },
              { label: 'Average Monthly TDS', value: fmt(data.averageMonthlyTDS), color: '#f59e0b' },
              { label: 'Payroll Records', value: fmtN(data.payrollCount), color: '#3b82f6' },
            ].map((s, i) => (
              <div className="stat-card" key={i}>
                <div className="stat-label">{s.label}</div>
                <div className="stat-value" style={{ fontSize: '1.5rem', color: s.color }}>{s.value}</div>
              </div>
            ))}
          </div>
          <div className="card-iipm" style={{ padding: '20px' }}>
            <h3 style={{ marginBottom: '16px' }}>Monthly TDS — {year}</h3>
            <table className="table-iipm">
              <thead><tr><th>Month</th><th>TDS Deducted</th></tr></thead>
              <tbody>
                {Object.entries(data.monthlyTDS || {}).sort().map(([m, v]: [string, any]) => (
                  <tr key={m}><td>{shortMonths[parseInt(m) - 1] || m}</td><td style={{ color: '#ef4444' }}>{fmt(v)}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ===== DEPARTMENT WISE ===== */}
      {tab === 'dept' && data && (
        <div className="card-iipm" style={{ padding: '20px' }}>
          <h3 style={{ marginBottom: '16px' }}>Department-wise Salary — {months[month - 1]} {year}</h3>
          <table className="table-iipm">
            <thead><tr><th>Department</th><th>Employees</th><th>Total Gross</th><th>Avg. Gross</th><th>Total Net</th></tr></thead>
            <tbody>
              {Object.entries(data.departments || {}).map(([dept, d]: [string, any]) => (
                <tr key={dept}>
                  <td style={{ fontWeight: 600 }}>{dept}</td>
                  <td>{fmtN(d.employeeCount)}</td>
                  <td>{fmt(d.totalGross)}</td>
                  <td>{fmt(d.averageGross)}</td>
                  <td style={{ color: '#22c55e', fontWeight: 600 }}>{fmt(d.totalNet)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ===== YEAR TO DATE ===== */}
      {tab === 'ytd' && data && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '20px' }}>
            {[
              { label: 'Months Processed', value: `${fmtN(data.monthsProcessed)} Months`, color: '#3b82f6' },
              { label: 'Total Gross Salary', value: fmt(data.totalGrossSalary), color: '#c9a84c' },
              { label: 'Total TDS Deducted', value: fmt(data.totalTDS), color: '#ef4444' },
              { label: 'Total NPS (Employee)', value: fmt(data.totalNPS), color: '#8b5cf6' },
              { label: 'Total Net Disbursed', value: fmt(data.totalNetSalary), color: '#22c55e' },
              { label: 'Avg Monthly Gross', value: fmt(data.averageMonthly), color: '#f59e0b' },
            ].map((s, i) => (
              <div className="stat-card" key={i}>
                <div className="stat-label">{s.label}</div>
                <div className="stat-value" style={{ fontSize: '1.3rem', color: s.color }}>{s.value}</div>
              </div>
            ))}
          </div>
          <div className="card-iipm" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
              <div>
                <h3 style={{ margin: 0 }}>Year-to-Date Summary — {data.year}</h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  {data.employeeName} {data.employeeId && data.employeeId !== 'ALL' ? `(${data.employeeId})` : ''} • Cumulative earnings and deductions from April to current month
                </p>
              </div>
            </div>
            <table className="table-iipm">
              <thead>
                <tr>
                  <th>Salary Component</th>
                  <th>Category</th>
                  <th style={{ textAlign: 'right' }}>Annual Cumulative Total</th>
                  <th style={{ textAlign: 'right' }}>Monthly Average</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { label: 'Basic Pay', cat: 'Earning', annual: data.totalBasicPay || (data.totalGrossSalary * 0.45), key: 'bp', color: '#0f172a' },
                  { label: 'Dearness Allowance (DA)', cat: 'Earning', annual: data.totalDA, key: 'da', color: '#0f172a' },
                  { label: 'House Rent Allowance (HRA)', cat: 'Earning', annual: data.totalHRA, key: 'hra', color: '#0f172a' },
                  { label: 'Transport Allowance (TA + DA on TA)', cat: 'Earning', annual: data.totalTA, key: 'ta', color: '#0f172a' },
                  { label: 'Other Allowances / Dean Special Allowance', cat: 'Earning', annual: data.totalOtherAllowances, key: 'otherAllow', color: '#0f172a' },
                  { label: 'NPS Employer Contribution (14%)', cat: 'Earning', annual: data.totalNpsEmployer, key: 'npsEmployer', color: '#0f172a' },
                  { label: 'TOTAL GROSS SALARY', cat: 'Total Earning', annual: data.totalGrossSalary, key: 'gross', color: '#c9a84c', bold: true },
                  { label: 'Tax Deducted at Source (TDS)', cat: 'Deduction', annual: data.totalTDS, key: 'tds', color: '#ef4444' },
                  { label: 'NPS Employee Contribution (10%)', cat: 'Deduction', annual: data.totalNPS, key: 'nps', color: '#8b5cf6' },
                  { label: 'Professional Tax (PT)', cat: 'Deduction', annual: data.totalPT, key: 'pt', color: '#64748b' },
                  { label: 'CGHS / Medical Contribution', cat: 'Deduction', annual: data.totalCGHS, key: 'cghs', color: '#64748b' },
                  { label: 'Other Deductions / Salary Recovery', cat: 'Deduction', annual: data.totalOtherDeductions, key: 'otherDed', color: '#64748b' },
                  { label: 'TOTAL DEDUCTIONS', cat: 'Total Deduction', annual: data.totalDeductions, key: 'totDed', color: '#ef4444', bold: true },
                  { label: 'TOTAL NET SALARY DISBURSED', cat: 'Net Pay', annual: data.totalNetSalary, key: 'net', color: '#22c55e', bold: true },
                ].map(row => (
                  <tr key={row.key} style={{ background: row.bold ? '#f8fafc' : 'transparent', fontWeight: row.bold ? 700 : 400 }}>
                    <td>{row.label}</td>
                    <td><span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{row.cat}</span></td>
                    <td style={{ textAlign: 'right', color: row.color, fontWeight: row.bold ? 700 : 600 }}>{fmt(row.annual)}</td>
                    <td style={{ textAlign: 'right', color: 'var(--text-muted)' }}>{fmt((row.annual || 0) / Math.max(data.monthsProcessed, 1))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ===== YoY COMPARISON ===== */}
      {tab === 'comparison' && data && (
        <div className="card-iipm" style={{ padding: '20px' }}>
          <h3 style={{ marginBottom: '4px' }}>Year-over-Year Salary Comparison</h3>
          <p style={{ marginBottom: '20px', fontSize: '0.85rem' }}>Comparing current year ({data.currentYear}) with previous year ({data.previousYear})</p>
          <table className="table-iipm">
            <thead>
              <tr>
                <th>Component</th>
                <th style={{ textAlign: 'right' }}>{data.previousYear} Total</th>
                <th style={{ textAlign: 'right' }}>{data.currentYear} Total</th>
                <th style={{ textAlign: 'right' }}>% Change</th>
              </tr>
            </thead>
            <tbody>
              {[
                { label: 'Basic Pay', prev: data.previousYearTotals?.basicPay, curr: data.currentYearTotals?.basicPay },
                { label: 'Dearness Allowance (DA)', prev: data.previousYearTotals?.da, curr: data.currentYearTotals?.da },
                { label: 'House Rent Allowance (HRA)', prev: data.previousYearTotals?.hra, curr: data.currentYearTotals?.hra },
                { label: 'Transport Allowance (TA)', prev: data.previousYearTotals?.ta, curr: data.currentYearTotals?.ta },
                { label: 'Gross Salary', prev: data.previousYearTotals?.grossSalary, curr: data.currentYearTotals?.grossSalary },
                { label: 'NPS Deduction', prev: data.previousYearTotals?.npsEmployeeShare, curr: data.currentYearTotals?.npsEmployeeShare },
                { label: 'TDS Deducted', prev: data.previousYearTotals?.tds, curr: data.currentYearTotals?.tds },
                { label: 'Net Salary', prev: data.previousYearTotals?.netSalary, curr: data.currentYearTotals?.netSalary }
              ].map(row => {
                const prev = row.prev || 0;
                const curr = row.curr || 0;
                const pct = prev > 0 ? ((curr - prev) / prev) * 100 : (curr > 0 ? 100 : 0);
                return (
                  <tr key={row.label} style={{ fontWeight: row.label.includes('Salary') ? 700 : 400 }}>
                    <td>{row.label}</td>
                    <td style={{ textAlign: 'right' }}>{fmt(prev)}</td>
                    <td style={{ textAlign: 'right', color: curr > prev && row.label.includes('Salary') ? '#22c55e' : 'inherit' }}>{fmt(curr)}</td>
                    <td style={{ textAlign: 'right', color: pct > 0 ? '#22c55e' : (pct < 0 ? '#ef4444' : 'inherit') }}>
                      {pct > 0 ? '↑ ' : (pct < 0 ? '↓ ' : '')}{Math.abs(pct).toFixed(1)}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Form 16 Banner */}
      <div style={{ marginTop: '24px', padding: '20px 24px', background: 'linear-gradient(135deg, rgba(201,168,76,0.1), rgba(26,58,110,0.2))', borderRadius: 'var(--radius)', border: '1px solid rgba(201,168,76,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ fontWeight: 700, color: 'var(--accent)', marginBottom: '4px' }}>📋 Form 16 — Annual TDS Certificate & TRACES Statement</div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Generate official Form 16 (Part A & Part B) with quarterly TDS summaries and tax calculations</div>
          
          <div style={{ marginTop: '12px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <select className="form-control-iipm" id="form16EmployeeSelect" style={{ width: '300px', fontWeight: 600 }}>
              <option value="">-- Select Employee --</option>
              {employees.map(e => {
                const empName = e.name || `${e.firstName || ''} ${e.lastName || ''}`.trim() || e.employeeId;
                const empId = e.employeeId || e.id || e._id;
                const val = e.id || e._id || e.employeeId;
                return <option key={val} value={val}>{empName} ({empId})</option>;
              })}
            </select>
            <select className="form-control-iipm" id="form16YearSelect" defaultValue="2026" style={{ width: '150px' }}>
              <option value="2026">FY 2026-27</option>
              <option value="2025">FY 2025-26</option>
            </select>
          </div>
        </div>
        <button className="btn-accent-iipm" style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 20px', fontSize: '0.95rem' }} onClick={async () => {
          const selectEl = document.getElementById('form16EmployeeSelect') as HTMLSelectElement;
          const yearEl = document.getElementById('form16YearSelect') as HTMLSelectElement;
          const selectedUserId = selectEl?.value;
          const selectedYear = parseInt(yearEl?.value || '2026');
          if (!selectedUserId) { alert('Please select an employee first.'); return; }
          
          try {
            const data = await apiService.getForm16(selectedUserId, selectedYear);
            const html = `
              <html><head><title>Form 16 - TRACES Format</title>
              <style>
                body { font-family: 'Times New Roman', serif; font-size: 11px; margin: 20px; color: #000; }
                .container { max-width: 1000px; margin: 0 auto; }
                .header-row { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 10px; }
                .title { text-align: center; }
                .title h1 { margin: 0; font-size: 16px; font-weight: bold; }
                .title h2 { margin: 5px 0 0 0; font-size: 14px; font-weight: bold; }
                .title h3 { margin: 5px 0 0 0; font-size: 12px; font-weight: normal; }
                table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
                th, td { border: 1px solid #000; padding: 4px 6px; vertical-align: top; }
                .bg-light { background-color: #f5f5f5; font-weight: bold; }
                .text-center { text-align: center; }
                .text-right { text-align: right; }
                .bold { font-weight: bold; }
                .section-title { font-weight: bold; background: #e0e0e0; text-align: center; font-size: 12px; padding: 4px; }
                .page-break { page-break-after: always; }
                .small-text { font-size: 9px; }
              </style>
              </head><body>
              <div class="container">
                <!-- PART A -->
                <div class="header-row">
                  <div><h2 style="color:#00a65a; margin:0;">TDS</h2><span style="font-size:10px;">Centralized Processing Cell</span></div>
                  <div class="title">
                    <h1 style="color:#00509e;">TRACES</h1>
                    <span style="font-size:10px;">TDS Reconciliation Analysis and Correction Enabling System</span>
                  </div>
                  <div style="text-align:right;"><span style="font-size:10px;">Government of India<br/>Income Tax Department</span></div>
                </div>
                
                <table>
                  <tr><td class="section-title">FORM NO. 16</td></tr>
                  <tr><td class="text-center">[See rule 31(1)(a)]</td></tr>
                  <tr><td class="section-title" style="font-size:14px;">PART A</td></tr>
                  <tr><td class="text-center small-text">Certificate under Section 203 of the Income-tax Act, 1961 for tax deducted at source on salary paid to an employee under section 192 or pension/interest income of specified senior citizen under section 194P</td></tr>
                </table>

                <table>
                  <tr>
                    <td colspan="2"><span class="bold">Certificate No.</span> ACORZOA</td>
                    <td colspan="2" class="text-right"><span class="bold">Last updated on</span> 10-Jul-2026</td>
                  </tr>
                  <tr class="bg-light">
                    <td colspan="2">Name and address of the Employer/Specified Bank</td>
                    <td colspan="2">Name and address of the Employee/Specified senior citizen</td>
                  </tr>
                  <tr>
                    <td colspan="2" style="height: 60px;">${data.employerName}<br/>${data.employerAddress}</td>
                    <td colspan="2">${data.employeeName}<br/>${data.employeeAddress}</td>
                  </tr>
                  <tr class="bg-light text-center">
                    <td>PAN of the Deductor</td>
                    <td>TAN of the Deductor</td>
                    <td>PAN of the Employee</td>
                    <td>Employee Reference No.</td>
                  </tr>
                  <tr class="text-center">
                    <td>${data.employerPAN}</td>
                    <td>${data.employerTAN}</td>
                    <td>${data.employeePAN}</td>
                    <td>${data.employeeId}</td>
                  </tr>
                  <tr class="bg-light text-center">
                    <td colspan="2">CIT (TDS)</td>
                    <td>Assessment Year</td>
                    <td>Period with the Employer</td>
                  </tr>
                  <tr class="text-center">
                    <td colspan="2">The Commissioner of Income Tax (TDS)<br/>Hyderabad - 500004</td>
                    <td>${data.assessmentYear}</td>
                    <td><span class="bold">From:</span> 01-Apr-${year - 1} <br/> <span class="bold">To:</span> 31-Mar-${year}</td>
                  </tr>
                </table>

                <table class="text-center">
                  <tr><td colspan="5" class="bg-light">Summary of amount paid/credited and tax deducted at source thereon in respect of the employee</td></tr>
                  <tr class="bg-light">
                    <td>Quarter(s)</td>
                    <td>Receipt Numbers of original quarterly statements</td>
                    <td>Amount paid/credited</td>
                    <td>Amount of tax deducted (Rs.)</td>
                    <td>Amount of tax deposited / remitted (Rs.)</td>
                  </tr>
                  ${data.quarterlyTdsList.map((q: any) => `
                    <tr>
                      <td>${q.quarter}</td>
                      <td>${q.receiptNumber}</td>
                      <td class="text-right">${q.amountPaid.toFixed(2)}</td>
                      <td class="text-right">${q.taxDeducted.toFixed(2)}</td>
                      <td class="text-right">${q.taxDeposited.toFixed(2)}</td>
                    </tr>
                  `).join('')}
                  <tr class="bold">
                    <td colspan="2">Total (Rs.)</td>
                    <td class="text-right">${data.grossSalary.toFixed(2)}</td>
                    <td class="text-right">${data.totalTdsDeposited.toFixed(2)}</td>
                    <td class="text-right">${data.totalTdsDeposited.toFixed(2)}</td>
                  </tr>
                </table>

                <table>
                  <tr><td class="section-title">II. DETAILS OF TAX DEDUCTED AND DEPOSITED IN THE CENTRAL GOVERNMENT ACCOUNT THROUGH CHALLAN</td></tr>
                </table>
                <table class="text-center">
                  <tr class="bg-light">
                    <td rowspan="2">Sl. No.</td>
                    <td rowspan="2">Tax Deposited in respect of the deductee (Rs.)</td>
                    <td colspan="4">Challan Identification Number (CIN)</td>
                  </tr>
                  <tr class="bg-light">
                    <td>BSR Code of the Bank Branch</td>
                    <td>Date on which Tax deposited</td>
                    <td>Challan Serial Number</td>
                    <td>Status of matching with OLTAS*</td>
                  </tr>
                  ${data.challanDetails.map((c: any, i: number) => `
                    <tr>
                      <td>${i + 1}</td>
                      <td class="text-right">${c.amount.toFixed(2)}</td>
                      <td>${c.bsrCode}</td>
                      <td>${c.dateOfDeposit}</td>
                      <td>${c.challanSerialNumber}</td>
                      <td>F</td>
                    </tr>
                  `).join('')}
                </table>

                <div class="page-break"></div>

                <!-- PART B -->
                <table style="margin-top:20px;">
                  <tr><td class="section-title">FORM NO. 16</td></tr>
                  <tr><td class="section-title" style="font-size:14px;">PART B</td></tr>
                  <tr><td class="section-title">Annexure - I</td></tr>
                </table>

                <table>
                  <tr class="bg-light">
                    <td colspan="4">Details of Salary Paid and any other income and tax deducted</td>
                  </tr>
                  <tr>
                    <td width="5%">A</td>
                    <td width="55%">Whether opting out of taxation u/s 115BAC(1A)?</td>
                    <td colspan="2" class="text-center bold">${data.standardDeduction === 75000 ? 'No' : 'Yes'}</td>
                  </tr>
                  <tr>
                    <td>1.</td><td>Gross Salary</td><td class="text-center">Rs.</td><td class="text-center">Rs.</td>
                  </tr>
                  <tr>
                    <td>(a)</td><td>Salary as per provisions contained in section 17(1)</td>
                    <td class="text-right"></td><td class="text-right">${data.grossSalary.toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td>(d)</td><td class="bold">Total</td>
                    <td class="text-right"></td><td class="text-right bold">${data.grossSalary.toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td>2.</td><td colspan="3">Less: Allowances to the extent exempt under section 10</td>
                  </tr>
                  <tr>
                    <td>(e)</td><td>House rent allowance under section 10(13A)</td>
                    <td class="text-right"></td><td class="text-right">${data.allowancesExemptUpto10.toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td>3.</td><td class="bold">Total amount of salary received from current employer [1(d)-2(i)]</td>
                    <td class="text-right"></td><td class="text-right bold">${data.balance.toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td>4.</td><td colspan="3">Less: Deductions under section 16</td>
                  </tr>
                  <tr>
                    <td>(a)</td><td>Standard deduction under section 16(ia)</td>
                    <td class="text-right"></td><td class="text-right">${data.standardDeduction.toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td>(c)</td><td>Tax on employment under section 16(iii)</td>
                    <td class="text-right"></td><td class="text-right">${data.professionalTax.toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td>5.</td><td>Total amount of deductions under section 16 [4(a)+4(b)+4(c)]</td>
                    <td class="text-right"></td><td class="text-right">${(data.standardDeduction + data.professionalTax).toFixed(2)}</td>
                  </tr>
                  <tr class="bg-light">
                    <td>6.</td><td class="bold">Income chargeable under the head "Salaries" [(3+1(e)-5]</td>
                    <td class="text-right"></td><td class="text-right bold">${data.incomeChargeableUnderSalaries.toFixed(2)}</td>
                  </tr>
                  <tr class="bg-light">
                    <td>9.</td><td class="bold">Gross total income (6+8)</td>
                    <td class="text-right"></td><td class="text-right bold">${data.grossTotalIncome.toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td>10.</td><td class="bold">Deductions under Chapter VI-A</td>
                    <td class="text-center bold">Gross Amount</td><td class="text-center bold">Deductible Amount</td>
                  </tr>
                  <tr>
                    <td>(a)</td><td>Deduction in respect of life insurance premia, contributions to provident fund etc. under section 80C</td>
                    <td class="text-right">${data.deduction80C.toFixed(2)}</td><td class="text-right">${data.deduction80C.toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td>(f)</td><td>Deduction in respect of contribution by Employer to pension scheme under section 80CCD (2)</td>
                    <td class="text-right">${(data.deduction80CCD2 || data.deduction80CCD || 0).toFixed(2)}</td><td class="text-right">${(data.deduction80CCD2 || data.deduction80CCD || 0).toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td>(g)</td><td>Deduction in respect of health insurance premia under section 80D</td>
                    <td class="text-right">${data.deduction80D.toFixed(2)}</td><td class="text-right">${data.deduction80D.toFixed(2)}</td>
                  </tr>
                  <tr class="bg-light">
                    <td>11.</td><td class="bold">Aggregate of deductible amount under Chapter VI-A</td>
                    <td class="text-right"></td><td class="text-right bold">${data.totalChapterVIADeductions.toFixed(2)}</td>
                  </tr>
                  <tr class="bg-light">
                    <td>12.</td><td class="bold">Total taxable income (9-11)</td>
                    <td class="text-right"></td><td class="text-right bold">${data.totalTaxableIncome.toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td>13.</td><td>Tax on total income</td>
                    <td class="text-right"></td><td class="text-right">${data.taxOnTotalIncome.toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td>14.</td><td>Rebate under section 87A, if applicable</td>
                    <td class="text-right"></td><td class="text-right">${data.rebate87A.toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td>16.</td><td>Health and education cess</td>
                    <td class="text-right"></td><td class="text-right">${data.healthAndEducationCess.toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td>17.</td><td class="bold">Tax payable (13+15+16-14)</td>
                    <td class="text-right"></td><td class="text-right bold">${data.totalTaxPayable.toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td>19.</td><td>Less: Tax deducted at source</td>
                    <td class="text-right"></td><td class="text-right">${data.taxDeductedAtSource.toFixed(2)}</td>
                  </tr>
                  <tr class="bg-light">
                    <td>21.</td><td class="bold">Net tax payable (17-18-19-20)</td>
                    <td class="text-right"></td><td class="text-right bold">${Math.max(0, data.taxPayableOrRefundable).toFixed(2)}</td>
                  </tr>
                </table>

                <div style="border: 1px solid #000; padding: 10px; margin-top: 15px;">
                  <p class="text-center bold" style="margin: 0 0 10px 0;">Verification</p>
                  <p style="margin: 0;">I, <span class="bold">SHALIVAHAN</span>, son/daughter of SURESH PANDEY KUMAR SINHA working in the capacity of <span class="bold">AUTHORISED SIGNATORY</span> do hereby certify that the information given above is true, complete and correct and is based on the books of account, documents, TDS statements, and other available records.</p>
                  <br/>
                  <table style="border: none; margin: 0;">
                    <tr>
                      <td style="border: none; width: 50%;">Place: Visakhapatnam<br/>Date: 13-Jul-${year}</td>
                      <td style="border: none; text-align: right; vertical-align: bottom;">
                        (Signature of person responsible for deduction of tax)<br/><br/>
                        <span class="bold">SHALIVAHAN</span>
                      </td>
                    </tr>
                  </table>
                </div>
              </div>
              </body></html>
            `;
            const win = window.open('', '_blank');
            if (win) { win.document.write(html); win.document.close(); win.print(); }
          } catch(e: any) {
            alert('Failed to fetch Form 16. ' + e.message);
          }
        }}>
          Download Form 16
        </button>
      </div>
    </div>
  );
};

export default ReportsPage;
