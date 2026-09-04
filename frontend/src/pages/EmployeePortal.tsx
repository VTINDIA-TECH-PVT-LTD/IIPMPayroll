import React, { useState, useEffect, useContext } from 'react';
import apiService from '../services/api';
import { UserContext } from '../App';
import { Link } from 'react-router-dom';
import { IIPE_LOGO_BASE64 } from '../assets/logoBase64';

const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];

const EmployeePortal: React.FC = () => {
  const userCtx = useContext(UserContext);
  const [payrolls, setPayrolls] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPayroll, setSelectedPayroll] = useState<any | null>(null);
  const [ytd, setYtd] = useState<any>(null);
  const currentYear = new Date().getFullYear();

  const [tdsProjection, setTdsProjection] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [showPayslipModal, setShowPayslipModal] = useState(false);
  const [activePayslipHtml, setActivePayslipHtml] = useState<string>('');

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
      const [payrollData, ytdData, tdsProjData, userData] = await Promise.allSettled([
        apiService.getPayrollsByUser(userCtx!.userId!),
        apiService.getYTDReport(userCtx!.userId!),
        apiService.getTdsProjection(userCtx!.userId!, 2026),
        apiService.getUserById(userCtx!.userId!),
      ]);
      if (payrollData.status === 'fulfilled') setPayrolls(payrollData.value);
      if (ytdData.status === 'fulfilled')    setYtd(ytdData.value?.data || ytdData.value);
      if (tdsProjData.status === 'fulfilled') setTdsProjection(tdsProjData.value);
      if (userData.status === 'fulfilled')   setUserProfile(userData.value);
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

  const getLastWorkingDayOfMonth = (year: number, month: number): Date => {
    const d = new Date(year, month, 0); // Last calendar day of month
    const dayOfWeek = d.getDay(); // 0 = Sun, 6 = Sat
    if (dayOfWeek === 0) { // Sunday -> Friday
      d.setDate(d.getDate() - 2);
    } else if (dayOfWeek === 6) { // Saturday -> Friday
      d.setDate(d.getDate() - 1);
    }
    return d;
  };

  const formatPayDate = (year: number, month: number): string => {
    const d = getLastWorkingDayOfMonth(year, month);
    const day = String(d.getDate()).padStart(2, '0');
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${day}-${monthNames[d.getMonth()]}-${d.getFullYear()}`;
  };

  const triggerPrint = (htmlContent: string) => {
    try {
      let iframe = document.getElementById('payslip-print-iframe') as HTMLIFrameElement;
      if (!iframe) {
        iframe = document.createElement('iframe');
        iframe.id = 'payslip-print-iframe';
        iframe.style.position = 'fixed';
        iframe.style.right = '0';
        iframe.style.bottom = '0';
        iframe.style.width = '0';
        iframe.style.height = '0';
        iframe.style.border = '0';
        document.body.appendChild(iframe);
      }
      const doc = iframe.contentWindow?.document || iframe.contentDocument;
      if (doc) {
        doc.open();
        doc.write(htmlContent);
        doc.close();
        setTimeout(() => {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
        }, 500);
        return;
      }
    } catch (e) {
      console.error("Iframe print fallback to window.open", e);
    }

    const win = window.open('', '_blank', 'width=900,height=750');
    if (win) {
      win.document.write(htmlContent);
      win.document.close();
      setTimeout(() => { win.focus(); win.print(); }, 800);
    }
  };

  const generatePayslipHtml = (p: any, u: any): string => {
    const user = u || userProfile;
    const rawName = (user?.name || (user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : '') || p.employeeName || 'Mr. Y Rama Rao').trim();
    const name = (rawName.startsWith('Mr.') || rawName.startsWith('Dr.') || rawName.startsWith('Prof.') || rawName.startsWith('Ms.') || rawName.startsWith('Mrs.')) ? rawName : `Mr. ${rawName}`;
    const words = numberToWords(Math.round(p.netSalary || 0));
    const monthLabel = months[p.month - 1];
    const payDateStr = formatPayDate(p.year, p.month);
    const fmt = (n: number) => (n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const npsEmpE = p.npsEmployerShare || 0;
    const npsEmpD = p.npsEmployerShare || 0;
    const totalEarnings = (p.basicPay || 0) + (p.da || 0) + (p.hra || 0) + (p.ta || 0) + (p.daArrears || 0) + (p.promotionArrears || 0) + (p.arrears || 0) + (p.otherAllowances || 0) + npsEmpE;
    
    const daysInMonth = new Date(p.year, p.month, 0).getDate();
    const paidDays = daysInMonth;

    const rawDoj = user?.dateOfJoining || user?.joiningDate || (p.employeeId === 'NT1005' ? '20-Jan-2020' : null);
    let doj = '-';
    if (rawDoj) {
      if (typeof rawDoj === 'string' && /^\d{1,2}-[A-Za-z]{3}-\d{4}$/.test(rawDoj.trim())) {
        doj = rawDoj.trim();
      } else {
        const d = new Date(rawDoj);
        doj = !isNaN(d.getTime()) ? d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-') : String(rawDoj);
      }
    }

    const dni = user?.dateOfNextIncrement 
      ? new Date(user.dateOfNextIncrement).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
      : (p.month < 7 ? `01-Jul-${p.year}` : `01-Jul-${p.year + 1}`);

    const isContract = (p.employeeType || user?.employeeType || user?.function || '').toLowerCase().includes('contract') || (p.payLevel || user?.payLevel || '').toLowerCase().includes('consolidated') || (p.employeeId || '').startsWith('CNT') || (p.employeeId || '').startsWith('CT') || (p.employeeId || '').startsWith('CMED');
    const isFaculty = (p.employeeId || '').startsWith('TS') && !isContract;
    const empCategory = isFaculty ? 'Teaching Faculty' : isContract ? 'Contractual Staff' : 'Non-Teaching Staff';

    const rawRegime = (user?.taxRegime || p.taxRegime || 'New').replace(/Tax\s*Regime/gi, '').trim();
    const taxRegime = rawRegime ? `${rawRegime} Tax Regime` : 'New Tax Regime (u/s 115BAC)';

    const department = (user?.department && user.department !== 'Non-Teaching' && user.department !== 'Teaching') 
      ? user.department 
      : ((p.employeeId || '').startsWith('TS') ? 'Academic & Research' : 'Finance & Accounts');

    const deductionPercentage = totalEarnings > 0 ? ((p.totalDeductions / totalEarnings) * 100).toFixed(2) : '0.00';
    const logoSrc = IIPE_LOGO_BASE64;
    const cleanLevel = (user?.payLevel || p.payLevel || '-').replace(/^Level-?/i, '');
    const displayLevel = cleanLevel !== '-' ? `Level-${cleanLevel}` : '-';
    
    return `<!DOCTYPE html>
<html><head><meta charset="utf-8"/>
<title>Pay Slip - ${monthLabel} ${p.year} - ${p.employeeId}</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>
  @page { size: A4 portrait; margin: 6mm 10mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Inter', sans-serif; }
  body { font-size: 10px; color: #1e293b; background:#f4f6f8; position:relative; }
  
  .page {
    max-width: 800px;
    margin: 10px auto;
    background: #fff;
    padding: 16px 20px;
    box-shadow: 0 10px 25px rgba(0,0,0,0.05);
    border-radius: 8px;
    position: relative;
    box-sizing: border-box;
  }

  .watermark {
    position: absolute;
    top: 53%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 500px;
    max-width: 85%;
    opacity: 0.34;
    pointer-events: none;
    z-index: 0;
  }

  /* --- HEADER --- */
  .header-box { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px; position: relative; z-index: 1; border-bottom: 2px solid #0a3161; padding-bottom: 8px; }
  .header-left { display: flex; align-items: center; gap: 14px; }
  .header-left img { width: 85px; height: 85px; object-fit: contain; }
  .header-text h1 { font-size: 15px; font-weight: 800; color: #0a3161; line-height: 1.2; margin-bottom: 3px; }
  .header-text .inst-sub { font-size: 9px; font-weight: 700; color: #b45309; margin-bottom: 2px; }
  .header-text .inst-min { font-size: 8.5px; font-weight: 600; color: #1e293b; margin-bottom: 2px; }
  .header-text .inst-addr { font-size: 8px; color: #475569; margin-bottom: 2px; }
  .header-text .inst-contact { font-size: 8px; color: #64748b; }
  .header-text span { color: #0a3161; font-weight: 600; }
  
  .header-right { width: 230px; display: flex; flex-direction: column; gap: 5px; }
  .ps-badge { background: #0a3161; color: white; border-radius: 6px; text-align: center; padding: 5px 10px; }
  .ps-badge .title { font-size: 13px; font-weight: 800; letter-spacing: 0.5px; }
  .ps-badge .subtitle { font-size: 8.5px; font-weight: 500; margin-top: 1px; }
  
  .pay-dates { background: rgba(248, 250, 252, 0.85); border: 1px solid #cbd5e1; border-radius: 6px; padding: 5px 8px; }
  .date-row { display: flex; align-items: center; margin-bottom: 3px; font-size: 8.5px; }
  .date-row:last-child { margin-bottom: 0; }
  .date-row .icon { width: 11px; height: 11px; margin-right: 5px; color: #0a3161; flex-shrink: 0; }
  .date-row .lbl { font-weight: 600; width: 75px; color: #475569; }
  .date-row .val { font-weight: 700; color: #0f172a; white-space: nowrap; }

  /* --- DETAILS BOX --- */
  .details-box { border: 1px solid #cbd5e1; border-radius: 6px; position: relative; padding: 14px 12px 8px 12px; margin-bottom: 8px; background: rgba(255, 255, 255, 0.4); z-index: 1; }
  .emp-name-badge { position: absolute; top: -9px; left: 16px; background: #0a3161; color: #fff; padding: 2px 10px; font-size: 10px; font-weight: 700; border-radius: 4px; letter-spacing: 0.3px; }
  
  .details-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 4px 12px; }
  .detail-row { display: flex; font-size: 8.5px; }
  .detail-row .lbl { width: 105px; color: #475569; font-weight: 500; flex-shrink: 0; }
  .detail-row .sep { width: 8px; font-weight: 500; color: #94a3b8; }
  .detail-row .val { flex: 1; font-weight: 700; color: #0f172a; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .cat-badge { background: #e0f2fe; color: #0369a1; padding: 1px 5px; border-radius: 3px; font-size: 8px; font-weight: 700; }

  /* --- SALARY TABLES --- */
  .salary-container { position: relative; margin-bottom: 8px; z-index: 1; }
  .tables-wrapper { display: flex; gap: 10px; position: relative; }
  
  .sal-table { flex: 1; border: 1px solid #cbd5e1; border-radius: 6px; overflow: hidden; background: rgba(255,255,255,0.35); }
  .sal-table .header-row { display: flex; align-items: center; padding: 5px 8px; font-size: 10px; font-weight: 700; border-bottom: 1px solid #e2e8f0; }
  .sal-table.earn { border-color: #86efac; }
  .sal-table.earn .header-row { color: #166534; background: rgba(240, 253, 244, 0.85); border-bottom-color: #86efac; }
  .sal-table.ded { border-color: #fca5a5; }
  .sal-table.ded .header-row { color: #991b1b; background: rgba(254, 242, 242, 0.85); border-bottom-color: #fca5a5; }
  
  .sal-table table { width: 100%; border-collapse: collapse; background: transparent; }
  .sal-table th { background: rgba(248, 250, 252, 0.75); font-size: 8.5px; font-weight: 700; padding: 4px 8px; text-align: left; border-bottom: 1px solid #cbd5e1; color: #475569; }
  .sal-table th.amt-col { text-align: right; }
  .sal-table.earn th { color: #166534; }
  .sal-table.ded th { color: #991b1b; }

  .sal-table td { padding: 4.5px 8px; font-size: 9px; border-bottom: 1px dashed rgba(203, 213, 225, 0.7); color: #1e293b; font-weight: 600; background: transparent; }
  .sal-table td.amt-col { text-align: right; color: #0f172a; font-weight: 700; font-family: monospace; font-size: 9.5px; }
  
  .total-row td { font-weight: 800 !important; font-size: 9.5px !important; border-top: 1px solid #cbd5e1; border-bottom: none !important; background: rgba(248, 250, 252, 0.85) !important; }
  .sal-table.earn .total-row td { color: #166534 !important; }
  .sal-table.ded .total-row td { color: #991b1b !important; }

  /* --- NET PAY --- */
  .net-pay-box { margin: 8px auto; width: 330px; text-align: center; border: 1.5px solid #0a3161; border-radius: 6px; overflow: hidden; position: relative; z-index: 1; box-shadow: 0 4px 10px rgba(0,0,0,0.04); background: rgba(255, 255, 255, 0.88); }
  .net-pay-header { background: #0a3161; color: white; padding: 4px; font-weight: 800; font-size: 10px; letter-spacing: 1px; }
  .net-pay-body { padding: 6px 10px; }
  .net-pay-amount { font-size: 20px; font-weight: 800; color: #0a3161; margin-bottom: 2px; font-family: monospace; }
  .net-pay-words { font-size: 8px; color: #475569; font-weight: 600; font-style: italic; }

  /* --- SUMMARY CARDS --- */
  .summary-cards { display: flex; justify-content: space-between; border: 1px solid #cbd5e1; border-radius: 6px; padding: 6px 14px; margin-bottom: 8px; position: relative; z-index: 1; background: rgba(248, 250, 252, 0.75); }
  .card { display: flex; align-items: center; gap: 8px; background: transparent; }
  .card-icon { width: 26px; height: 26px; border-radius: 5px; display: flex; align-items: center; justify-content: center; }
  .card-icon svg { width: 14px; height: 14px; }
  .card.earn .card-icon { background: #dcfce7; color: #166534; }
  .card.ded .card-icon { background: #fee2e2; color: #991b1b; }
  .card.net .card-icon { background: #dbeafe; color: #0a3161; }
  .card.perc .card-icon { background: #f3e8ff; color: #6b21a8; }
  .card-info .lbl { font-size: 7.5px; font-weight: 700; color: #64748b; margin-bottom: 1px; text-transform: uppercase; }
  .card-info .val { font-size: 10.5px; font-weight: 800; }
  .card.earn .val { color: #166534; }
  .card.ded .val { color: #991b1b; }
  .card.net .val { color: #0a3161; }
  .card.perc .val { color: #6b21a8; }
  .card-info .sub { font-size: 7px; color: #94a3b8; }

  /* --- FOOTER --- */
  .footer-row { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 8px; position: relative; z-index: 1; }
  .footer-words { font-size: 8.5px; font-weight: 700; color: #0f172a; max-width: 450px; }
  .footer-words span { font-weight: 500; color: #475569; display: block; margin-top: 2px; }
  
  .auth-box { border: 1px solid #cbd5e1; border-radius: 6px; padding: 5px 10px; display: flex; align-items: center; gap: 6px; background: rgba(248, 250, 252, 0.85); }
  .auth-box svg { width: 18px; height: 18px; color: #0284c7; flex-shrink: 0; }
  .auth-box div { font-size: 7.5px; color: #334155; font-weight: 600; line-height: 1.2; }
  
  .bottom-note { text-align: center; margin-top: 10px; font-size: 8px; color: #64748b; display: flex; align-items: center; justify-content: center; gap: 4px; position: relative; z-index: 1; border-top: 1px dashed #e2e8f0; padding-top: 5px; }
  .bottom-note svg { width: 11px; height: 11px; }

  @media print {
    html, body { background: #fff; margin: 0; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .page { margin: 0 !important; padding: 8px 14px !important; box-shadow: none !important; max-width: 100% !important; min-height: auto !important; border-radius: 0 !important; page-break-after: avoid !important; page-break-inside: avoid !important; }
  }
</style></head>
<body>
<div class="page">
  <img src="${logoSrc}" class="watermark" alt="Watermark"/>
  
  <!-- Header -->
  <div class="header-box">
    <div class="header-left">
      <img src="${logoSrc}" alt="Logo" style="width:85px;height:85px;object-fit:contain;"/>
      <div class="header-text">
        <h1>INDIAN INSTITUTE OF PETROLEUM AND ENERGY</h1>
        <div class="inst-sub">(An Institute of National Importance at par with IITs/IIMs)</div>
        <div class="inst-min">Ministry of Petroleum and Natural Gas, Government of India</div>
        <div class="inst-addr">EAB, Vangali, Sabbavaram, Anakapalle &ndash; 531035, Andhra Pradesh, India</div>
        <div class="inst-contact"><span>E-mail:</span> dr.finance@iipe.ac.in &nbsp;|&nbsp; <span>Website:</span> www.iipe.ac.in</div>
      </div>
    </div>
    <div class="header-right">
      <div class="ps-badge">
        <div class="title">PAY SLIP</div>
        <div class="subtitle">for ${monthLabel} ${p.year}</div>
      </div>
      <div class="pay-dates">
        <div class="date-row">
          <svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
          <div class="lbl">Pay Date:</div>
          <div class="val">${payDateStr}</div>
        </div>
        <div class="date-row">
          <svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          <div class="lbl">Pay Period:</div>
          <div class="val">01-${monthLabel.substring(0,3)}-${p.year} to ${daysInMonth}-${monthLabel.substring(0,3)}-${p.year}</div>
        </div>
        <div class="date-row">
          <svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          <div class="lbl">Pay Drawn:</div>
          <div class="val">${paidDays} / ${daysInMonth} Days</div>
        </div>
      </div>
    </div>
  </div>

  <!-- Details Box -->
  <div class="details-box">
    <div class="emp-name-badge">${name} (${p.employeeId || '-'})</div>
    <div class="details-grid">
      <!-- Col 1 -->
      <div class="detail-row"><div class="lbl">Employee Number</div><div class="sep">:</div><div class="val">${p.employeeId||'-'}</div></div>
      <div class="detail-row"><div class="lbl">Date of Joining</div><div class="sep">:</div><div class="val">${doj}</div></div>
      <div class="detail-row"><div class="lbl">PAN Number</div><div class="sep">:</div><div class="val">${u?.pan||'-'}</div></div>
      
      <!-- Col 2 -->
      <div class="detail-row"><div class="lbl">Designation</div><div class="sep">:</div><div class="val">${u?.designation||'-'}</div></div>
      <div class="detail-row"><div class="lbl">Date of Next Increment</div><div class="sep">:</div><div class="val">${dni}</div></div>
      <div class="detail-row"><div class="lbl">PRAN / NPS Number</div><div class="sep">:</div><div class="val">${u?.pranAccountNumber||'-'}</div></div>
      
      <!-- Col 3 -->
      <div class="detail-row"><div class="lbl">Department</div><div class="sep">:</div><div class="val">${department}</div></div>
      <div class="detail-row"><div class="lbl">Pay Level</div><div class="sep">:</div><div class="val">${displayLevel}</div></div>
      <div class="detail-row"><div class="lbl">Bank Name</div><div class="sep">:</div><div class="val">${u?.bankName||'State Bank of India'}</div></div>
      
      <!-- Col 4 -->
      <div class="detail-row"><div class="lbl">Category</div><div class="sep">:</div><div class="val"><span class="cat-badge">${empCategory}</span></div></div>
      <div class="detail-row"><div class="lbl">Pay Drawn (No. of Days)</div><div class="sep">:</div><div class="val">${paidDays} Days</div></div>
      <div class="detail-row"><div class="lbl">Bank Account No.</div><div class="sep">:</div><div class="val">${u?.bankAccountNumber?`(****${String(u.bankAccountNumber).slice(-4)})`:'-'}</div></div>
      
      <!-- Col 5 -->
      <div class="detail-row"><div class="lbl">Tax Regime</div><div class="sep">:</div><div class="val">${taxRegime}</div></div>
      <div class="detail-row"><div class="lbl">Income Tax Status</div><div class="sep">:</div><div class="val">${p.tds > 0 ? 'Taxable' : 'Non-Taxable'}</div></div>
      <div class="detail-row"><div class="lbl">IFSC Code</div><div class="sep">:</div><div class="val">${u?.ifscCode||'SBIN0003170'}</div></div>
    </div>
  </div>

  <!-- Salary Tables -->
  <div class="salary-container">
    <div class="tables-wrapper">
      <!-- Earnings -->
      <div class="sal-table earn">
        <div class="header-row">
          <svg style="width:14px;height:14px;margin-right:6px;" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd"></path></svg>
          EARNINGS
        </div>
        <table>
          <thead><tr><th>Particulars</th><th class="amt-col">Amount (INR)</th></tr></thead>
          <tbody>
            <tr><td>Basic Pay</td><td class="amt-col">${fmt(p.basicPay)}</td></tr>
            <tr><td>Dearness Allowance (DA)</td><td class="amt-col">${fmt(p.da)}</td></tr>
            <tr><td>House Rent Allowance (HRA)</td><td class="amt-col">${fmt(p.hra)}</td></tr>
            <tr><td>Transport Allowance (TA)</td><td class="amt-col">${fmt(p.ta)}</td></tr>
            ${(p.daArrears || 0) > 0 ? `<tr><td>DA&TA Arrears</td><td class="amt-col" style="color:#0a3161;font-weight:700;">${fmt(p.daArrears)}</td></tr>` : ''}
            ${(p.promotionArrears || 0) > 0 ? `<tr><td>Promotional Arrears</td><td class="amt-col" style="color:#0a3161;font-weight:700;">${fmt(p.promotionArrears)}</td></tr>` : ''}
            ${(p.arrears || 0) > 0 ? `<tr><td>Arrears</td><td class="amt-col" style="color:#0a3161;font-weight:700;">${fmt(p.arrears)}</td></tr>` : ''}
            ${(p.otherAllowances || 0) > 0 ? `<tr><td>Special / Dean Allowance</td><td class="amt-col">${fmt(p.otherAllowances)}</td></tr>` : ''}
            <tr><td>NPS Employer Contribution (14%)</td><td class="amt-col">${fmt(npsEmpE)}</td></tr>
            <tr class="total-row"><td>TOTAL EARNINGS (GROSS)</td><td class="amt-col">${fmt(totalEarnings)}</td></tr>
          </tbody>
        </table>
      </div>

      <!-- Deductions -->
      <div class="sal-table ded">
        <div class="header-row">
          <svg style="width:14px;height:14px;margin-right:6px;" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9a1 1 0 000 2h6a1 1 0 100-2H7z" clip-rule="evenodd"></path></svg>
          DEDUCTIONS
        </div>
        <table>
          <thead><tr><th>Particulars</th><th class="amt-col">Amount (INR)</th></tr></thead>
          <tbody>
            <tr><td>NPS Employee Contribution (10%)</td><td class="amt-col">${fmt(p.npsEmployeeShare)}</td></tr>
            <tr><td>NPS Employer Share (Deduction)</td><td class="amt-col">${fmt(npsEmpD)}</td></tr>
            <tr><td>Professional Tax (PT)</td><td class="amt-col">${fmt(p.professionalTax)}</td></tr>
            <tr><td>CGHS / Medical Contribution</td><td class="amt-col">${fmt(p.cghs)}</td></tr>
            ${p.tds > 0 ? `<tr><td>Income Tax (TDS)</td><td class="amt-col">${fmt(p.tds)}</td></tr>` : '<tr><td>Income Tax (TDS)</td><td class="amt-col">0.00</td></tr>'}
            ${p.otherDeductions > 0 ? `<tr><td>Other Deductions / Salary Recovery</td><td class="amt-col">${fmt(p.otherDeductions)}</td></tr>` : ''}
            <tr class="total-row"><td>TOTAL DEDUCTIONS</td><td class="amt-col">${fmt(p.totalDeductions)}</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>

  <!-- Net Pay Box -->
  <div class="net-pay-box">
    <div class="net-pay-header">NET PAYABLE AMOUNT</div>
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
      <div>This is a computer generated pay slip<br>and does not require physical signature.</div>
    </div>
  </div>

  <div class="bottom-note">
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
    For any payroll queries, please contact the Finance &amp; Accounts Section (dr.finance@iipe.ac.in).
  </div>

</div>
</body></html>`;
  };

  const handleOpenPayslip = async (p: any) => {
    setSelectedPayroll(p);
    let u: any = null;
    try {
      if (userCtx?.userId) u = await apiService.getUserById(userCtx.userId);
    } catch (e) { console.error("Could not fetch user details", e); }
    const html = generatePayslipHtml(p, u);
    setActivePayslipHtml(html);
    setShowPayslipModal(true);
  };

  const printPayslip = async () => {
    if (!selectedPayroll) return;
    let u: any = null;
    try {
      if (userCtx?.userId) u = await apiService.getUserById(userCtx.userId);
    } catch (e) { console.error("Could not fetch user details", e); }
    const html = generatePayslipHtml(selectedPayroll, u);
    setActivePayslipHtml(html);
    triggerPrint(html);
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

      <div style={{ display: 'grid', gridTemplateColumns: selectedPayroll ? 'repeat(auto-fit, minmax(320px, 1fr))' : '1fr', gap: '24px' }}>
        {/* Payslip List */}
        <div>
          <div className="card-iipm" style={{ padding: 0 }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', fontWeight: 600, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Payslips — {currentYear}</span>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{payrolls.length} Months</span>
            </div>
            {payrolls.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>📄</div>
                <p>No payslips available yet.</p>
              </div>
            ) : (
              <div>
                {payrolls.map(p => (
                  <div key={p.id}
                    style={{
                      padding: '14px 20px', borderBottom: '1px solid var(--border)',
                      cursor: 'pointer', transition: 'all 0.15s ease',
                      background: selectedPayroll?.id === p.id ? 'rgba(201,168,76,0.08)' : 'transparent',
                      borderLeft: selectedPayroll?.id === p.id ? '3px solid var(--accent)' : '3px solid transparent',
                    }}
                    onClick={() => { setSelectedPayroll(p); }}
                    onMouseEnter={e => { if (selectedPayroll?.id !== p.id) e.currentTarget.style.background = 'var(--bg-hover)'; }}
                    onMouseLeave={e => { if (selectedPayroll?.id !== p.id) e.currentTarget.style.background = 'transparent'; }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                      <div>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.95rem' }}>{months[p.month - 1]} {p.year}</div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--success)', fontWeight: 600 }}>{fmt(p.netSalary)}</div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ padding: '3px 8px', borderRadius: '20px', fontSize: '0.72rem', fontWeight: 700, background: `${statusColor[p.status]}20`, color: statusColor[p.status] }}>
                          {p.status}
                        </span>
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleOpenPayslip(p); }}
                          style={{
                            background: '#0a3161', color: '#fff', border: 'none',
                            padding: '6px 12px', borderRadius: '6px', fontSize: '0.78rem',
                            fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px'
                          }}>
                          📄 View / Print
                        </button>
                      </div>
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
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
              <h3 style={{ margin: 0 }}>Payslip — {months[selectedPayroll.month - 1]} {selectedPayroll.year}</h3>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button onClick={() => selectedPayroll && handleOpenPayslip(selectedPayroll)} className="btn-primary-iipm" style={{ fontSize: '0.82rem', padding: '6px 14px' }}>
                  📄 View Full Slip
                </button>
                <button onClick={printPayslip} className="btn-primary-iipm" style={{ fontSize: '0.82rem', padding: '6px 14px', background: '#c9a84c', color: '#0a3161' }}>
                  🖨 Print / PDF
                </button>
                <button onClick={() => setSelectedPayroll(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.1rem', padding: '0 4px' }}>
                  ✕
                </button>
              </div>
            </div>
            <div style={{ padding: '18px 20px' }}>
              {/* Header info */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px', marginBottom: '20px', padding: '14px', background: 'var(--bg-hover)', borderRadius: '10px' }}>
                <div><div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Employee ID</div><div style={{ fontWeight: 600 }}>{selectedPayroll.employeeId}</div></div>
                <div><div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Pay Period</div><div style={{ fontWeight: 600 }}>{months[selectedPayroll.month - 1]} {selectedPayroll.year}</div></div>
                <div><div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Status</div>
                  <span style={{ padding: '2px 8px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700, background: `${statusColor[selectedPayroll.status]}20`, color: statusColor[selectedPayroll.status] }}>{selectedPayroll.status}</span>
                </div>
                {userProfile?.pan && <div><div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>PAN Number</div><div style={{ fontWeight: 600 }}>{userProfile.pan}</div></div>}
                {userProfile?.pranAccountNumber && <div><div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>PRAN Number</div><div style={{ fontWeight: 600 }}>{userProfile.pranAccountNumber}</div></div>}
                {(userProfile?.dateOfJoining || userProfile?.joiningDate) && <div><div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Date of Joining</div><div style={{ fontWeight: 600 }}>{userProfile.dateOfJoining || userProfile.joiningDate}</div></div>}
                {userProfile?.designation && <div><div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Designation</div><div style={{ fontWeight: 600 }}>{userProfile.designation}</div></div>}
                {userProfile?.bankAccountNumber && <div><div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Bank A/C</div><div style={{ fontWeight: 600 }}>{userProfile.bankName || 'SBI'} (****{String(userProfile.bankAccountNumber).slice(-4)})</div></div>}
                {selectedPayroll.approvedBy && <div><div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Approved By</div><div style={{ fontWeight: 600 }}>{selectedPayroll.approvedBy}</div></div>}
              </div>

              {/* Earnings vs Deductions */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px' }}>
                {/* Earnings */}
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--success)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px' }}>Earnings</div>
                  <table className="table-iipm">
                    <tbody>
                      {[
                        ['Basic Pay', selectedPayroll.basicPay],
                        ['DA (53%)', selectedPayroll.da],
                        ['HRA (20%)', selectedPayroll.hra],
                        ['Transport Allowance', selectedPayroll.ta],
                        selectedPayroll.daArrears ? ['DA Arrears', selectedPayroll.daArrears] : null,
                        selectedPayroll.promotionArrears ? ['Promotional Arrears', selectedPayroll.promotionArrears] : null,
                        selectedPayroll.arrears ? ['Arrears', selectedPayroll.arrears] : null,
                        ['Other Allowances', selectedPayroll.otherAllowances || 0],
                        ['NPS Employer (14%)', selectedPayroll.npsEmployerShare || 0],
                      ].filter(Boolean).map(([label, val]: any) => (
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
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#ef4444', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px' }}>Deductions</div>
                  <table className="table-iipm">
                    <tbody>
                      {[
                        ['NPS (Employee 10%)', selectedPayroll.npsEmployeeShare],
                        ['NPS (Employer 14%)', selectedPayroll.npsEmployerShare],
                        ['Professional Tax', selectedPayroll.professionalTax || 200],
                        ['CGHS / Medical', selectedPayroll.cghs || 450],
                        ['TDS / Income Tax', selectedPayroll.tds || 0],
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
              <div style={{ marginTop: '20px', padding: '16px', textAlign: 'center', background: 'linear-gradient(135deg, rgba(34,197,94,0.1), rgba(26,58,110,0.2))', borderRadius: '12px', border: '1px solid rgba(34,197,94,0.3)' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Net Salary Payable</div>
                <div style={{ fontSize: '2.2rem', fontWeight: 800, color: '#22c55e', marginTop: '2px' }}>{fmt(selectedPayroll.netSalary)}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>For {months[selectedPayroll.month - 1]} {selectedPayroll.year}</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* TDS & Income Tax Projection Section */}
      {tdsProjection && (
        <div className="card-iipm" style={{ marginTop: '24px', padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '18px' }}>
            <div>
              <h3 style={{ margin: 0, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                📊 Annual TDS & Income Tax Projection (FY {tdsProjection.financialYear})
              </h3>
              <p style={{ margin: '4px 0 0 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                Calculated under <strong>{tdsProjection.taxRegime} Tax Regime</strong> (Standard Deduction: ₹{tdsProjection.standardDeduction?.toLocaleString('en-IN')} | Sec 80CCD(2) NPS: ₹{Math.round(tdsProjection.deduction80CCD2 || 0).toLocaleString('en-IN')})
              </p>
            </div>
            <span style={{ padding: '6px 14px', borderRadius: '20px', background: 'rgba(201,168,76,0.15)', color: 'var(--accent)', fontWeight: 700, fontSize: '0.85rem', border: '1px solid rgba(201,168,76,0.3)' }}>
              PAN: {tdsProjection.pan}
            </span>
          </div>

          {/* 4 Key Metric Summary Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
            <div style={{ padding: '16px', background: 'var(--bg-hover)', borderRadius: '10px', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Estimated Total Annual Tax</div>
              <div style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--primary)', marginTop: '4px' }}>
                {fmt(tdsProjection.estimatedAnnualTax)}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                Net Taxable: {fmt(tdsProjection.netTaxableIncome)}
              </div>
            </div>

            <div style={{ padding: '16px', background: 'rgba(34,197,94,0.08)', borderRadius: '10px', border: '1px solid rgba(34,197,94,0.25)' }}>
              <div style={{ fontSize: '0.78rem', color: '#15803d', textTransform: 'uppercase', fontWeight: 700 }}>💰 TDS Deducted So Far</div>
              <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#16a34a', marginTop: '4px' }}>
                {fmt(tdsProjection.tdsDeductedSoFar)}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#15803d', marginTop: '2px' }}>
                Paid across {tdsProjection.monthsDeductedCount} months
              </div>
            </div>

            <div style={{ padding: '16px', background: 'rgba(239,68,68,0.08)', borderRadius: '10px', border: '1px solid rgba(239,68,68,0.25)' }}>
              <div style={{ fontSize: '0.78rem', color: '#b91c1c', textTransform: 'uppercase', fontWeight: 700 }}>⚖️ Balance Tax to be Deducted</div>
              <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#dc2626', marginTop: '4px' }}>
                {fmt(tdsProjection.tdsRemainingToBeDeducted)}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#b91c1c', marginTop: '2px' }}>
                Remaining over {tdsProjection.monthsRemainingCount} months
              </div>
            </div>

            <div style={{ padding: '16px', background: 'rgba(201,168,76,0.12)', borderRadius: '10px', border: '1px solid rgba(201,168,76,0.35)' }}>
              <div style={{ fontSize: '0.78rem', color: 'var(--accent)', textTransform: 'uppercase', fontWeight: 700 }}>📅 TDS for Next Months</div>
              <div style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--accent)', marginTop: '4px' }}>
                {fmt(tdsProjection.monthlyTdsNextMonths)} <span style={{ fontSize: '0.8rem', fontWeight: 500 }}>/ mo</span>
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                Estimated monthly deduction
              </div>
            </div>
          </div>

          {/* Month-by-Month TDS Schedule Table */}
          <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '10px', fontSize: '0.95rem' }}>
            📅 Month-by-Month TDS Schedule & Status (April {currentYear} – March {currentYear + 1})
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="table-iipm">
              <thead>
                <tr>
                  <th>Month</th>
                  <th style={{ textAlign: 'right' }}>Gross Income</th>
                  <th style={{ textAlign: 'center' }}>Deduction Status</th>
                  <th style={{ textAlign: 'right' }}>Monthly TDS</th>
                  <th style={{ textAlign: 'right' }}>Cumulative TDS</th>
                </tr>
              </thead>
              <tbody>
                {tdsProjection.monthlySchedule?.map((s: any, idx: number) => {
                  const isDeducted = s.status === 'DEDUCTED';
                  return (
                    <tr key={idx} style={{ background: isDeducted ? 'rgba(34,197,94,0.03)' : 'transparent' }}>
                      <td style={{ fontWeight: 600 }}>{s.monthName}</td>
                      <td style={{ textAlign: 'right' }}>{fmt(s.grossSalary)}</td>
                      <td style={{ textAlign: 'center' }}>
                        <span style={{
                          padding: '3px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 700,
                          background: isDeducted ? 'rgba(34,197,94,0.15)' : 'rgba(245,158,11,0.15)',
                          color: isDeducted ? '#16a34a' : '#d97706',
                          border: `1px solid ${isDeducted ? 'rgba(34,197,94,0.3)' : 'rgba(245,158,11,0.3)'}`
                        }}>
                          {isDeducted ? '✓ DEDUCTED' : '⏳ PROJECTED'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: isDeducted ? '#16a34a' : 'var(--accent)' }}>
                        {fmt(s.tdsAmount)}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {fmt(s.cumulativeTds)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

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

      {/* Full Screen Interactive Mobile / Desktop Payslip Preview Modal */}
      {showPayslipModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(4px)',
          zIndex: 99999, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', padding: '10px'
        }}>
          <div style={{
            width: '100%', maxWidth: '880px', height: '94vh',
            background: '#fff', borderRadius: '12px', overflow: 'hidden',
            display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.4)'
          }}>
            {/* Modal Top Bar */}
            <div style={{
              padding: '12px 18px', background: '#0a3161', color: '#fff',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              borderBottom: '1px solid rgba(255,255,255,0.1)'
            }}>
              <div style={{ fontWeight: 700, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>📄</span> Official Payslip Preview {selectedPayroll ? `— ${months[selectedPayroll.month - 1]} ${selectedPayroll.year}` : ''}
              </div>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <button 
                  onClick={() => triggerPrint(activePayslipHtml)}
                  style={{
                    background: '#c9a84c', color: '#0a3161', border: 'none',
                    padding: '7px 16px', borderRadius: '6px', fontWeight: 700,
                    fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px'
                  }}>
                  🖨 Print / Save PDF
                </button>
                <button 
                  onClick={() => setShowPayslipModal(false)}
                  style={{
                    background: 'rgba(255,255,255,0.15)', color: '#fff', border: 'none',
                    width: '32px', height: '32px', borderRadius: '50%', fontWeight: 700,
                    fontSize: '1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                  ✕
                </button>
              </div>
            </div>
            
            {/* Iframe View */}
            <iframe 
              title="Payslip Preview"
              srcDoc={activePayslipHtml}
              style={{ width: '100%', height: '100%', border: 'none', background: '#f8fafc' }}
            />
          </div>
        </div>
      )}

    </div>
  );
};

export default EmployeePortal;

