import React, { useState, useEffect, useContext } from 'react';
import apiService from '../services/api';
import { UserContext } from '../App';
import { Link } from 'react-router-dom';

const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];

const EmployeePortal: React.FC = () => {
  const userCtx = useContext(UserContext);
  const [payrolls, setPayrolls] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPayroll, setSelectedPayroll] = useState<any | null>(null);
  const [ytd, setYtd] = useState<any>(null);
  const currentYear = new Date().getFullYear();

  // IT Declaration State
  const [declaration, setDeclaration] = useState<any>({
    section80C: '', section80D: '', hraExemption: '', homeLoanInterest: '', status: ''
  });
  const [declLoading, setDeclLoading] = useState(false);
  const [declSaving, setDeclSaving] = useState(false);

  useEffect(() => {
    if (userCtx?.userId) {
      loadMyPayrolls();
      loadDeclaration();
    }
  }, [userCtx?.userId]);

  const loadDeclaration = async () => {
    try {
      setDeclLoading(true);
      const res = await apiService.getItDeclarations(userCtx!.userId!);
      if (res && res.length > 0) {
        setDeclaration(res[0]); // Get latest for the year
      }
    } catch { }
    finally { setDeclLoading(false); }
  };

  const handleDeclarationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setDeclSaving(true);
      const data = {
        userId: userCtx!.userId,
        financialYear: `${currentYear}-${currentYear + 1}`,
        section80C: Number(declaration.section80C) || 0,
        section80D: Number(declaration.section80D) || 0,
        hraExemption: Number(declaration.hraExemption) || 0,
        homeLoanInterest: Number(declaration.homeLoanInterest) || 0,
      };
      const res = await apiService.saveItDeclaration(data);
      setDeclaration(res);
      alert('IT Declaration submitted successfully!');
    } catch (err: any) {
      alert('Failed to submit: ' + err.message);
    } finally {
      setDeclSaving(false);
    }
  };

  const loadMyPayrolls = async () => {
    try {
      setLoading(true);
      const [payrollData, ytdData] = await Promise.allSettled([
        apiService.getPayrollsByUser(userCtx!.userId!),
        apiService.getYTDReport(userCtx!.userId!),
      ]);
      if (payrollData.status === 'fulfilled') setPayrolls(payrollData.value);
      if (ytdData.status === 'fulfilled')    setYtd(ytdData.value?.data || ytdData.value);
    } catch { }
    finally { setLoading(false); }
  };

  const fmt = (n: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);

  const statusColor: Record<string, string> = {
    DRAFT: '#f59e0b', APPROVED: '#22c55e', LOCKED: '#8b5cf6', REJECTED: '#ef4444'
  };

  const numberToWords = (num: number): string => {
    if (num === 0) return 'Zero';
    const a = ['','One ','Two ','Three ','Four ', 'Five ','Six ','Seven ','Eight ','Nine ','Ten ','Eleven ','Twelve ','Thirteen ','Fourteen ','Fifteen ','Sixteen ','Seventeen ','Eighteen ','Nineteen '];
    const b = ['', '', 'Twenty','Thirty','Forty','Fifty', 'Sixty','Seventy','Eighty','Ninety'];
    const inWords = (n: number): string => {
      if ((n = Math.floor(n)) === 0) return '';
      if (n < 20) return a[n];
      if (n < 100) return b[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + a[Math.floor(n % 10)] : '');
      if (n < 1000) return a[Math.floor(n / 100)] + 'Hundred ' + (n % 100 !== 0 ? 'and ' + inWords(n % 100) : '');
      if (n < 100000) return inWords(Math.floor(n / 1000)) + 'Thousand ' + (n % 1000 !== 0 ? inWords(n % 1000) : '');
      if (n < 10000000) return inWords(Math.floor(n / 100000)) + 'Lakh ' + (n % 100000 !== 0 ? inWords(n % 100000) : '');
      return inWords(Math.floor(n / 10000000)) + 'Crore ' + (n % 10000000 !== 0 ? inWords(n % 10000000) : '');
    };
    return inWords(num).trim();
  };

  const printPayslip = async () => {
    if (!selectedPayroll) return;
    const p = selectedPayroll;
    let u: any = null;
    try {
      if (userCtx?.userId) u = await apiService.getUserById(userCtx.userId);
    } catch (e) { console.error("Could not fetch user details", e); }

    const name = u ? `${u.firstName || ''} ${u.lastName || ''}`.trim() : '';
    const words = numberToWords(Math.round(p.netSalary || 0));
    const monthLabel = months[p.month - 1];
    const fmt = (n: number) => (n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const logoUrl = `${window.location.origin}/IIPMPayroll/logo.png`;
    const npsEmpE = p.npsEmployerShare || 0;
    const npsEmpD = p.npsEmployerShare || 0;
    const totalEarnings = (p.basicPay||0) + (p.da||0) + (p.hra||0) + (p.ta||0) + npsEmpE;
    const doj = u?.dateOfJoining
      ? new Date(u.dateOfJoining).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
      : '';

    const deductionPercentage = totalEarnings > 0 ? ((p.totalDeductions / totalEarnings) * 100).toFixed(2) : '0.00';
    const logoSrc = window.location.origin + process.env.PUBLIC_URL + '/logo.png';
    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"/>
<title>Pay Slip - ${monthLabel} ${p.year}</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>
  @page { size: A4; margin: 8mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Inter', sans-serif; }
  body { font-size: 10px; color: #1e293b; background:#f4f6f8; position:relative; }
  
  .page {
    max-width: 800px;
    margin: 20px auto;
    background: #fff;
    padding: 20px;
    box-shadow: 0 10px 25px rgba(0,0,0,0.05);
    border-radius: 8px;
    position: relative;
    min-height: 1000px;
  }

  /* --- HEADER --- */
  .header-box { display: flex; justify-content: space-between; margin-bottom: 12px; }
  .header-left { display: flex; align-items: center; gap: 15px; }
  .header-left img { width: 85px; height: 85px; object-fit: contain; }
  .header-text h1 { font-size: 18px; font-weight: 800; color: #0a3161; line-height: 1.2; margin-bottom: 6px; width: 350px;}
  .header-text p { font-size: 10px; color: #475569; margin-bottom: 2px; }
  .header-text p span { color: #0a3161; font-weight: 500; }
  
  .header-right { width: 220px; display: flex; flex-direction: column; gap: 6px; }
  .ps-badge { background: #0a3161; color: white; border-radius: 6px; text-align: center; padding: 10px; }
  .ps-badge .title { font-size: 16px; font-weight: 700; letter-spacing: 1px; }
  .ps-badge .subtitle { font-size: 10px; font-weight: 500; margin-top: 2px; }
  
  .pay-dates { background: #f0f4f8; border: 1px solid #c9d9eb; border-radius: 6px; padding: 8px; }
  .date-row { display: flex; align-items: center; margin-bottom: 6px; font-size: 10.5px;}
  .date-row:last-child { margin-bottom: 0; }
  .date-row .icon { width: 14px; height: 14px; margin-right: 8px; color: #0a3161; }
  .date-row .lbl { font-weight: 600; width: 70px; color: #0a3161; }
  .date-row .val { font-weight: 700; color: #0f172a; }

  /* --- DETAILS --- */
  .details-box { border: 1px solid #c9d9eb; border-radius: 6px; position: relative; padding: 25px 15px 15px 15px; margin-bottom: 15px; }
  .emp-name-badge { position: absolute; top: -10px; left: 50%; transform: translateX(-50%); background: #fff; padding: 0 15px; font-size: 14px; font-weight: 700; color: #0a3161; }
  
  .details-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px 40px; }
  .detail-row { display: flex; font-size: 10.5px; }
  .detail-row .lbl { width: 140px; color: #334155; font-weight: 500; }
  .detail-row .sep { width: 15px; font-weight: 500; color: #94a3b8; }
  .detail-row .val { flex: 1; font-weight: 600; color: #0f172a; }

  /* --- SALARY TABLES --- */
  .salary-container { position: relative; margin-bottom: -1px; } /* overlap with net pay */
  .watermark { position: absolute; top: 40%; left: 50%; transform: translate(-50%, -50%); width: 450px; opacity: 0.05; z-index: 0; pointer-events: none; }
  
  .tables-wrapper { display: flex; gap: 15px; position: relative; z-index: 1; }
  
  .sal-table { flex: 1; border: 1px solid #e2e8f0; border-radius: 6px; overflow: hidden; background: rgba(255,255,255,0.8); }
  .sal-table .header-row { display: flex; align-items: center; padding: 8px 12px; font-size: 12px; font-weight: 700; border-bottom: 1px solid #e2e8f0; }
  .sal-table.earn { border-color: #bbf7d0; }
  .sal-table.earn .header-row { color: #166534; background: #f0fdf4; border-bottom-color: #bbf7d0; }
  .sal-table.ded { border-color: #fecaca; }
  .sal-table.ded .header-row { color: #991b1b; background: #fef2f2; border-bottom-color: #fecaca; }
  
  .sal-table table { width: 100%; border-collapse: collapse; }
  .sal-table th { background: #fafafa; font-size: 9.5px; font-weight: 700; padding: 6px 12px; text-align: left; border-bottom: 1px solid #e2e8f0; color: #475569; }
  .sal-table th.amt-col { text-align: right; }
  .sal-table.earn th { color: #166534; }
  .sal-table.ded th { color: #991b1b; }

  .sal-table td { padding: 7px 12px; font-size: 10.5px; border-bottom: 1px dashed #e2e8f0; color: #334155; font-weight: 500; }
  .sal-table td.amt-col { text-align: right; color: #0f172a; font-weight: 600; }
  
  .total-row td { font-weight: 700 !important; font-size: 11px !important; border-top: 1px solid #e2e8f0; border-bottom: none !important; }
  .sal-table.earn .total-row td { color: #166534 !important; }
  .sal-table.ded .total-row td { color: #991b1b !important; }

  /* --- NET PAY --- */
  .net-pay-box { margin: 15px auto; width: 350px; text-align: center; border: 1px solid #0a3161; border-radius: 6px; overflow: hidden; position: relative; z-index: 2; box-shadow: 0 4px 10px rgba(0,0,0,0.05); background: #fff; }
  .net-pay-header { background: #0a3161; color: white; padding: 6px; font-weight: 700; font-size: 12px; letter-spacing: 1px; }
  .net-pay-body { padding: 12px; }
  .net-pay-amount { font-size: 24px; font-weight: 800; color: #0a3161; margin-bottom: 4px; }
  .net-pay-words { font-size: 9.5px; color: #475569; font-weight: 500; font-style: italic; }

  /* --- SUMMARY CARDS --- */
  .summary-cards { display: flex; justify-content: space-between; border: 1px solid #c9d9eb; border-radius: 6px; padding: 12px 20px; margin-bottom: 15px; }
  .card { display: flex; align-items: center; gap: 10px; }
  .card-icon { width: 36px; height: 36px; border-radius: 8px; display: flex; align-items: center; justify-content: center; }
  .card-icon svg { width: 20px; height: 20px; }
  .card.earn .card-icon { background: #f0fdf4; color: #166534; }
  .card.ded .card-icon { background: #fef2f2; color: #991b1b; }
  .card.net .card-icon { background: #f0f6ff; color: #0a3161; }
  .card.perc .card-icon { background: #faf5ff; color: #6b21a8; }
  .card-info .lbl { font-size: 9px; font-weight: 700; color: #64748b; margin-bottom: 2px; text-transform: uppercase; }
  .card-info .val { font-size: 13px; font-weight: 800; }
  .card.earn .val { color: #166534; }
  .card.ded .val { color: #991b1b; }
  .card.net .val { color: #0a3161; }
  .card.perc .val { color: #6b21a8; }
  .card-info .sub { font-size: 8px; color: #94a3b8; }

  /* --- FOOTER --- */
  .footer-row { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 20px; }
  .footer-words { font-size: 10px; font-weight: 600; color: #0f172a; }
  .footer-words span { font-weight: 500; color: #475569; display: block; margin-top: 4px; }
  
  .auth-box { border: 1px solid #cbd5e1; border-radius: 6px; padding: 10px 15px; display: flex; align-items: center; gap: 12px; background: #f8fafc; }
  .auth-box svg { width: 24px; height: 24px; color: #0ea5e9; }
  .auth-box div { font-size: 9.5px; color: #334155; font-weight: 500; }
  
  .bottom-note { text-align: center; margin-top: 30px; font-size: 10px; color: #64748b; display: flex; align-items: center; justify-content: center; gap: 6px; }
  .bottom-note svg { width: 14px; height: 14px; }

  @media print {
    body { background: #fff; }
    .page { margin: 0; padding: 0; box-shadow: none; max-width: none; min-height: auto; border-radius: 0; }
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
</style></head>
<body>
<div class="page">
  
  <!-- Header -->
  <div class="header-box">
    <div class="header-left">
      <img src="${logoSrc}" alt="Logo" onerror="this.style.display='none'"/>
      <div class="header-text">
        <h1>INDIAN INSTITUTE OF PETROLEUM AND ENERGY</h1>
        <p>FAB, Vangal, Sabbavaram, Anakapalle &ndash; 531035</p>
        <p>Visakhapatnam, Andhra Pradesh, India</p>
        <p style="margin-top:4px;"><span>E-mail:</span> pr@iipe.ac.in, fa@iipe.ac.in &nbsp;|&nbsp; <span>Website:</span> www.iipe.ac.in</p>
      </div>
    </div>
    <div class="header-right">
      <div class="ps-badge">
        <div class="title">PAY SLIP</div>
        <div class="subtitle">for ${monthLabel}-${p.year}</div>
      </div>
      <div class="pay-dates">
        <div class="date-row">
          <svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
          <div class="lbl">Pay Date</div>
          <div class="val">01-${months[p.month === 12 ? 0 : p.month].substring(0,3)}-${p.month === 12 ? p.year + 1 : p.year}</div>
        </div>
        <div class="date-row">
          <svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          <div class="lbl">Pay Period</div>
          <div class="val">01-${monthLabel.substring(0,3)}-${p.year} to ${new Date(p.year, p.month, 0).getDate()}-${monthLabel.substring(0,3)}-${p.year}</div>
        </div>
      </div>
    </div>
  </div>

  <!-- Details Box -->
  <div class="details-box">
    <div class="emp-name-badge">Mr/Ms. ${name}</div>
    <div class="details-grid">
      <!-- Col 1 -->
      <div class="detail-row"><div class="lbl">Employee Number</div><div class="sep">:</div><div class="val">${p.employeeId||'-'}</div></div>
      <div class="detail-row"><div class="lbl">PAN Number</div><div class="sep">:</div><div class="val">${u?.pan||'-'}</div></div>
      
      <div class="detail-row"><div class="lbl">Designation</div><div class="sep">:</div><div class="val">${u?.designation||'-'}</div></div>
      <div class="detail-row"><div class="lbl">PF Account Number</div><div class="sep">:</div><div class="val">${u?.pfAccountNumber||'-'}</div></div>
      
      <div class="detail-row"><div class="lbl">Department</div><div class="sep">:</div><div class="val">${u?.department||'-'}</div></div>
      <div class="detail-row"><div class="lbl">PRAN (PF) Number</div><div class="sep">:</div><div class="val">${u?.pranAccountNumber||'-'}</div></div>
      
      <div class="detail-row"><div class="lbl">Location</div><div class="sep">:</div><div class="val">${u?.location||'Visakhapatnam'}</div></div>
      <div class="detail-row"><div class="lbl">Tax Regime</div><div class="sep">:</div><div class="val">${u?.taxRegime||'Regular Tax Regime'}</div></div>
      
      <div class="detail-row"><div class="lbl">Date of Joining</div><div class="sep">:</div><div class="val">${doj||'-'}</div></div>
      <div class="detail-row"><div class="lbl">Income Tax Status</div><div class="sep">:</div><div class="val">${p.tds > 0 ? 'Taxable' : 'Non-Taxable'}</div></div>
      
      <div class="detail-row"><div class="lbl">Bank Details</div><div class="sep">:</div><div class="val">${u?.bankName?`${u.bankName} ${u.bankAccountNumber?'(****'+String(u.bankAccountNumber).slice(-4)+')':''}`:'-'}</div></div>
      <div class="detail-row"><div class="lbl">Pay Level</div><div class="sep">:</div><div class="val">Level-${u?.payLevel||p.payLevel||'-'}</div></div>
      
      <div class="detail-row"><div class="lbl">Payment Mode</div><div class="sep">:</div><div class="val">Bank Transfer</div></div>
      <div class="detail-row"><div class="lbl">PR Account Number (IPRAN)</div><div class="sep">:</div><div class="val">${u?.pranAccountNumber||'-'}</div></div>
    </div>
  </div>

  <!-- Salary Tables -->
  <div class="salary-container">
    <img src="${logoSrc}" class="watermark" onerror="this.style.display='none'"/>
    
    <div class="tables-wrapper">
      <!-- Earnings -->
      <div class="sal-table earn">
        <div class="header-row">
          <svg style="width:16px;height:16px;margin-right:8px;" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd"></path></svg>
          EARNINGS
        </div>
        <table>
          <thead><tr><th>Particulars</th><th class="amt-col">Amount (INR)</th></tr></thead>
          <tbody>
            <tr><td>Basic Pay</td><td class="amt-col">${fmt(p.basicPay)}</td></tr>
            <tr><td>Dearness Allowance (DA)</td><td class="amt-col">${fmt(p.da)}</td></tr>
            <tr><td>House Rent Allowance (HRA)</td><td class="amt-col">${fmt(p.hra)}</td></tr>
            <tr><td>Transport Allowance (TA)</td><td class="amt-col">${fmt(p.ta)}</td></tr>
            <tr><td>NPS (Employer)</td><td class="amt-col">${fmt(npsEmpE)}</td></tr>
            <tr class="total-row"><td>TOTAL EARNINGS</td><td class="amt-col">${fmt(totalEarnings)}</td></tr>
          </tbody>
        </table>
      </div>

      <!-- Deductions -->
      <div class="sal-table ded">
        <div class="header-row">
          <svg style="width:16px;height:16px;margin-right:8px;" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9a1 1 0 000 2h6a1 1 0 100-2H7z" clip-rule="evenodd"></path></svg>
          DEDUCTIONS
        </div>
        <table>
          <thead><tr><th>Particulars</th><th class="amt-col">Amount (INR)</th></tr></thead>
          <tbody>
            <tr><td>NPS (Employee)</td><td class="amt-col">${fmt(p.npsEmployeeShare)}</td></tr>
            <tr><td>Provident Fund (PF)</td><td class="amt-col">0.00</td></tr>
            <tr><td>NPS EMP D</td><td class="amt-col">${fmt(npsEmpD)}</td></tr>
            <tr><td>Professional Tax</td><td class="amt-col">${fmt(p.professionalTax)}</td></tr>
            <tr><td>CGHS</td><td class="amt-col">${fmt(p.cghs)}</td></tr>
            ${p.tds > 0 ? `<tr><td>Income Tax (TDS)</td><td class="amt-col">${fmt(p.tds)}</td></tr>` : ''}
            ${p.otherDeductions > 0 ? `<tr><td>Other Deductions</td><td class="amt-col">${fmt(p.otherDeductions)}</td></tr>` : ''}
            <tr class="total-row"><td>TOTAL DEDUCTIONS</td><td class="amt-col">${fmt(p.totalDeductions)}</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>

  <!-- Net Pay Box -->
  <div class="net-pay-box">
    <div class="net-pay-header">NET PAY</div>
    <div class="net-pay-body">
      <div class="net-pay-amount">₹ ${fmt(p.netSalary)}</div>
      <div class="net-pay-words">(${words} Only)</div>
    </div>
  </div>

  <!-- Summary Cards -->
  <div class="summary-cards">
    <div class="card earn">
      <div class="card-icon"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg></div>
      <div class="card-info"><div class="lbl">Total Earnings</div><div class="val">₹ ${fmt(totalEarnings)}</div></div>
    </div>
    <div class="card ded">
      <div class="card-icon"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4"></path></svg></div>
      <div class="card-info"><div class="lbl">Total Deductions</div><div class="val">₹ ${fmt(p.totalDeductions)}</div></div>
    </div>
    <div class="card net">
      <div class="card-icon"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg></div>
      <div class="card-info"><div class="lbl">Net Pay</div><div class="val">₹ ${fmt(p.netSalary)}</div></div>
    </div>
    <div class="card perc">
      <div class="card-icon"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z"></path></svg></div>
      <div class="card-info"><div class="lbl">Deductions (%)</div><div class="val">${deductionPercentage}%</div><div class="sub">of Gross Earnings</div></div>
    </div>
  </div>

  <!-- Footer Area -->
  <div class="footer-row">
    <div class="footer-words">
      Amount in words:
      <span>INR ${words} Only</span>
    </div>
    <div class="auth-box">
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
      <div>This is a computer generated pay slip<br>and does not require signature.</div>
    </div>
  </div>

  <div class="bottom-note">
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
    For any queries, please contact the Accounts Department.
  </div>

</div>
</body></html>`;

    const win = window.open('', '_blank', 'width=900,height=750');
    if (win) { win.document.write(html); win.document.close(); setTimeout(() => { win.focus(); win.print(); }, 800); }
  };



  const printForm16 = async () => {
    try {
      setLoading(true);
      const data = await apiService.getForm16(userCtx!.userId as string, currentYear - 1);
      
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
              <td><span class="bold">From:</span> 01-Apr-${currentYear - 1} <br/> <span class="bold">To:</span> 31-Mar-${currentYear}</td>
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
              <td class="text-right"></td><td class="text-right bold">${((data.grossSalary || 0) - (data.allowancesExemptUpto10 || 0)).toFixed(2)}</td>
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
              <td class="text-right"></td><td class="text-right bold">${(data.incomeChargeableUnderSalaries || 0).toFixed(2)}</td>
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
              <td class="text-right">${data.deduction80CCD?.toFixed(2) || '0.00'}</td><td class="text-right">${data.deduction80CCD?.toFixed(2) || '0.00'}</td>
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
              <td class="text-right"></td><td class="text-right">${(data.totalTdsDeposited || 0).toFixed(2)}</td>
            </tr>
            <tr class="bg-light">
              <td>21.</td><td class="bold">Net tax payable (17-18-19-20)</td>
              <td class="text-right"></td><td class="text-right bold">${Math.max(0, data.taxPayableOrRefundable || 0).toFixed(2)}</td>
            </tr>
          </table>

          <div style="border: 1px solid #000; padding: 10px; margin-top: 15px;">
            <p class="text-center bold" style="margin: 0 0 10px 0;">Verification</p>
            <p style="margin: 0;">I, <span class="bold">SHALIVAHAN</span>, son/daughter of SURESH PANDEY KUMAR SINHA working in the capacity of <span class="bold">AUTHORISED SIGNATORY</span> do hereby certify that the information given above is true, complete and correct and is based on the books of account, documents, TDS statements, and other available records.</p>
            <br/>
            <table style="border: none; margin: 0;">
              <tr>
                <td style="border: none; width: 50%;">Place: Visakhapatnam<br/>Date: 13-Jul-${currentYear + 1}</td>
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
    } catch (e: any) {
      alert("Error generating Form 16: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return (
    <div className="page-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
      <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
        <div className="spinner-iipm" style={{ margin: '0 auto 16px' }}></div>
        <p>Loading your payslips...</p>
      </div>
    </div>
  );

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>My Payslips</h1>
        <p>View and download your salary slips and Form 16</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: selectedPayroll ? '340px 1fr' : '1fr', gap: '24px' }}>
        {/* Payslip List */}
        <div>
          <div className="card-iipm" style={{ padding: 0 }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', fontWeight: 600 }}>
              Payslips — {currentYear}
            </div>
            {payrolls.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>📄</div>
                <p>No payslips available yet.</p>
              </div>
            ) : (
              <div>
                {payrolls.map(p => (
                  <div key={p.id} onClick={() => setSelectedPayroll(p)}
                    style={{
                      padding: '14px 20px', borderBottom: '1px solid var(--border)',
                      cursor: 'pointer', transition: 'all 0.15s ease',
                      background: selectedPayroll?.id === p.id ? 'rgba(201,168,76,0.08)' : 'transparent',
                      borderLeft: selectedPayroll?.id === p.id ? '3px solid var(--accent)' : '3px solid transparent',
                    }}
                    onMouseEnter={e => { if (selectedPayroll?.id !== p.id) e.currentTarget.style.background = 'var(--bg-hover)'; }}
                    onMouseLeave={e => { if (selectedPayroll?.id !== p.id) e.currentTarget.style.background = 'transparent'; }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{months[p.month - 1]} {p.year}</div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--success)' }}>{fmt(p.netSalary)}</div>
                      </div>
                      <span style={{ padding: '3px 8px', borderRadius: '20px', fontSize: '0.72rem', fontWeight: 700, background: `${statusColor[p.status]}20`, color: statusColor[p.status] }}>
                        {p.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Payslip Detail */}
        {selectedPayroll && (
          <div className="card-iipm" style={{ padding: '0' }}>
            <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3>Payslip — {months[selectedPayroll.month - 1]} {selectedPayroll.year}</h3>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={printPayslip} className="btn-primary-iipm" style={{ fontSize: '0.85rem', padding: '8px 16px' }}>🖨 Print Payslip</button>
                <button onClick={() => setSelectedPayroll(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.1rem' }}>✕</button>
              </div>
            </div>
            <div style={{ padding: '24px' }}>
              {/* Header info */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px', padding: '16px', background: 'var(--bg-hover)', borderRadius: '10px' }}>
                <div><div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Employee ID</div><div style={{ fontWeight: 600 }}>{selectedPayroll.employeeId}</div></div>
                <div><div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Pay Period</div><div style={{ fontWeight: 600 }}>{months[selectedPayroll.month - 1]} {selectedPayroll.year}</div></div>
                <div><div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Status</div>
                  <span style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 700, background: `${statusColor[selectedPayroll.status]}20`, color: statusColor[selectedPayroll.status] }}>{selectedPayroll.status}</span>
                </div>
                {selectedPayroll.approvedBy && <div><div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Approved By</div><div style={{ fontWeight: 600 }}>{selectedPayroll.approvedBy}</div></div>}
              </div>

              {/* Earnings vs Deductions */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                {/* Earnings */}
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--success)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>Earnings</div>
                  <table className="table-iipm">
                    <tbody>
                      {[
                        ['Basic Pay', selectedPayroll.basicPay],
                        ['DA (53%)', selectedPayroll.da],
                        ['HRA (20%)', selectedPayroll.hra],
                        ['Transport Allowance', selectedPayroll.ta],
                        ['Other Allowances', selectedPayroll.otherAllowances || 0],
                      ].map(([label, val]) => (
                        <tr key={String(label)}>
                          <td>{label}</td>
                          <td style={{ textAlign: 'right', fontWeight: 500 }}>{fmt(Number(val))}</td>
                        </tr>
                      ))}
                      <tr style={{ background: 'rgba(34,197,94,0.1)' }}>
                        <td style={{ fontWeight: 700, color: '#22c55e' }}>Gross Salary</td>
                        <td style={{ textAlign: 'right', fontWeight: 700, color: '#22c55e' }}>{fmt(selectedPayroll.grossSalary)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Deductions */}
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#ef4444', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>Deductions</div>
                  <table className="table-iipm">
                    <tbody>
                      {[
                        ['TDS', selectedPayroll.tds],
                        ['NPS (Employee 10%)', selectedPayroll.npsEmployeeShare],
                        ['NPS (Employer 14%)', selectedPayroll.npsEmployerShare],
                        ['Professional Tax', selectedPayroll.professionalTax || 200],
                        ['CGHS', selectedPayroll.cghs || 650],
                        ['Other Deductions', selectedPayroll.otherDeductions || 0],
                      ].map(([label, val]) => (
                        <tr key={String(label)}>
                          <td>{label}</td>
                          <td style={{ textAlign: 'right', fontWeight: 500, color: '#ef4444' }}>{fmt(Number(val))}</td>
                        </tr>
                      ))}
                      <tr style={{ background: 'rgba(239,68,68,0.1)' }}>
                        <td style={{ fontWeight: 700, color: '#ef4444' }}>Total Deductions</td>
                        <td style={{ textAlign: 'right', fontWeight: 700, color: '#ef4444' }}>{fmt(selectedPayroll.totalDeductions)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Net Salary */}
              <div style={{ marginTop: '24px', padding: '20px', textAlign: 'center', background: 'linear-gradient(135deg, rgba(34,197,94,0.1), rgba(26,58,110,0.2))', borderRadius: '12px', border: '1px solid rgba(34,197,94,0.3)' }}>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Net Salary Payable</div>
                <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#22c55e', marginTop: '4px' }}>{fmt(selectedPayroll.netSalary)}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>For {months[selectedPayroll.month - 1]} {selectedPayroll.year}</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Form 16 card */}
      <div style={{ marginTop: '24px', padding: '20px 24px', background: 'linear-gradient(135deg, rgba(201,168,76,0.1), rgba(26,58,110,0.2))', borderRadius: 'var(--radius)', border: '1px solid rgba(201,168,76,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontWeight: 700, color: 'var(--accent)' }}>📋 Form 16 — Annual TDS Certificate</div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '4px' }}>Download your income tax certificate for FY {currentYear - 1}-{currentYear}</div>
        </div>
        <button className="btn-accent-iipm" onClick={printForm16}>
          Download Form 16
        </button>
      </div>
      {/* IT Declaration link */}
      <div style={{ marginTop: '24px', padding: '20px 24px', background: 'var(--card-bg)', borderRadius: 'var(--radius)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)', display: 'flex', alignItems: 'center', justifyItems: 'space-between' }}>
        <div style={{ flexGrow: 1 }}>
          <div style={{ fontWeight: 700, color: 'var(--primary)' }}>💼 Submit IT Declaration</div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '4px' }}>Declare your investments for TDS calculations (Form 12BB / Form 16 setup).</div>
        </div>
        <Link to="/it-declaration" className="btn-primary-iipm" style={{ textDecoration: 'none' }}>Go to Declarations</Link>
      </div>

    </div>
  );
};

export default EmployeePortal;

