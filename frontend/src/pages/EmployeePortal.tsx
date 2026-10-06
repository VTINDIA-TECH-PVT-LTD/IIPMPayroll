import React, { useState, useEffect, useContext } from 'react';
import apiService from '../services/api';
import { UserContext } from '../App';
import { Link } from 'react-router-dom';
import { IIPE_LOGO_BASE64 } from '../assets/logoBase64';
import { FileText, Download, CheckCircle, Clock, CreditCard, DollarSign, Calendar, Shield, PiggyBank, Receipt, Eye, Printer, X, FileCheck, Landmark, User, Hash, Info, Briefcase, Building, ChevronRight, AlertCircle } from 'lucide-react';
import { formatEmployeeNameWithTitle } from '../utils/nameUtils';
import { printForm16Document } from '../utils/form16Print';

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

  const getCalculatedNet = (p: any): number => {
    if (!p) return 0;
    const isContract = (p.employeeType || '').toLowerCase().includes('contract') || (p.payLevel || '').toLowerCase().includes('consolidated') || (p.employeeId || '').startsWith('CNT') || (p.employeeId || '').startsWith('CT') || (p.employeeId || '').startsWith('CMED');
    const isDirector = (p.employeeId === 'DIR001') || (p.payLevel && String(p.payLevel).includes('17'));

    const basic = p.basicPay || 0;
    const da = p.da || 0;
    const hra = p.hra || 0;
    const ta = p.ta || 0;
    const arrears = (p.daArrears || 0) + (p.promotionArrears || 0) + (p.arrears || 0);
    const otherAllowances = p.otherAllowances || 0;
    const npsEmpE = p.npsEmployerShare !== undefined && p.npsEmployerShare !== null ? p.npsEmployerShare : ((isContract || isDirector) ? 0 : Math.round((basic + da) * 0.14));
    const ignorablePension = p.ignorablePension || 0;
    const gross = Math.max(0, (basic + da + hra + ta + arrears + otherAllowances + npsEmpE) - ignorablePension);

    const npsEmp = p.npsEmployeeShare !== undefined && p.npsEmployeeShare !== null ? p.npsEmployeeShare : ((isContract || isDirector) ? 0 : Math.round((basic + da) * 0.10));
    const pt = p.professionalTax !== undefined && p.professionalTax !== null ? p.professionalTax : (basic >= 20000 ? 200 : 0);
    const cleanLvl = (p.payLevel || '10').replace(/\D/g, '');
    const numLvl = parseInt(cleanLvl || '10', 10);
    const cghs = p.cghs !== undefined && p.cghs !== null ? p.cghs : (isContract ? 0 : (numLvl >= 12 ? 1000 : (numLvl >= 7 ? 650 : (numLvl === 6 ? 450 : 250))));
    const tds = p.tds || 0;
    const otherDed = p.otherDeductions || 0;
    const totalDed = npsEmp + npsEmpE + pt + cghs + tds + otherDed;
    return Math.max(0, gross - totalDed);
  };

  const generatePayslipHtml = (p: any, u: any): string => {
    const user = u || userProfile;
    const name = formatEmployeeNameWithTitle(p, user) || 'Mr. Y Rama Rao';
    const monthLabel = months[p.month - 1];
    const payDateStr = formatPayDate(p.year, p.month);
    const fmt = (n: number) => (n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    
    const isContract = (p.employeeType || user?.employeeType || user?.function || '').toLowerCase().includes('contract') || (p.payLevel || user?.payLevel || '').toLowerCase().includes('consolidated') || (p.employeeId || '').startsWith('CNT') || (p.employeeId || '').startsWith('CT') || (p.employeeId || '').startsWith('CMED');
    const isFaculty = ((p.employeeId || '').startsWith('TS') || (user?.function || '').toLowerCase().includes('teaching') || (user?.department || '').toLowerCase().includes('academic') || (user?.designation || '').toLowerCase().includes('professor')) && !isContract;
    const isDirector = (p.employeeId === 'DIR001') || (user?.employeeId === 'DIR001') || (user?.payLevel && String(user.payLevel).includes('17')) || (user?.designation && user.designation.toLowerCase().includes('director'));
    const empCategory = isFaculty ? 'Regular - Teaching' : isContract ? 'Contract' : 'Regular - Non Teaching';

    const basicPay = p.basicPay || 0;
    const da = p.da || 0;
    const hra = p.hra || 0;
    const ta = p.ta || 0;
    const daArrears = p.daArrears || 0;
    const promotionArrears = p.promotionArrears || 0;
    const arrears = p.arrears || 0;
    const otherAllowances = p.otherAllowances || 0;
    const ignorablePension = p.ignorablePension || u?.ignorablePension || user?.ignorablePension || 0;

    const npsEmpE = p.npsEmployerShare !== undefined && p.npsEmployerShare !== null
      ? p.npsEmployerShare
      : ((isContract || isDirector) ? 0 : Math.round((basicPay + da) * 0.14));
    const npsEmpD = npsEmpE;

    // Line items sum for Gross Earnings
    const totalEarnings = Math.max(0, (basicPay + da + hra + ta + daArrears + promotionArrears + arrears + otherAllowances + npsEmpE) - ignorablePension);

    const npsEmployeeShare = p.npsEmployeeShare !== undefined && p.npsEmployeeShare !== null
      ? p.npsEmployeeShare
      : ((isContract || isDirector) ? 0 : Math.round((basicPay + da) * 0.10));
    const professionalTax = p.professionalTax !== undefined && p.professionalTax !== null
      ? p.professionalTax
      : (basicPay >= 20000 ? 200 : 0);

    const cleanLevel = (user?.payLevel || p.payLevel || '10').replace(/\D/g, '');
    const numLevel = parseInt(cleanLevel || '10', 10);
    const cghs = p.cghs !== undefined && p.cghs !== null
      ? p.cghs
      : (isContract ? 0 : (numLevel >= 12 ? 1000 : (numLevel >= 7 ? 650 : (numLevel === 6 ? 450 : 250))));
    const tds = p.tds || 0;
    const otherDeductions = p.otherDeductions || 0;

    // Exact computed total deductions (sum of all displayed lines)
    const totalDeductions = npsEmployeeShare + npsEmpD + professionalTax + cghs + tds + otherDeductions;

    // Net payable amount
    const netSalary = Math.max(0, totalEarnings - totalDeductions);
    const words = numberToWords(Math.round(netSalary));
    const deductionPercentage = totalEarnings > 0 ? ((totalDeductions / totalEarnings) * 100).toFixed(2) : '0.00';
    
    const daysInMonth = p.totalDaysInMonth || new Date(p.year, p.month, 0).getDate();
    const paidDays = (p.payableDays !== undefined && p.payableDays !== null) ? p.payableDays : daysInMonth;

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

    const rawRegime = (user?.taxRegime || p.taxRegime || 'New').replace(/Tax\s*Regime/gi, '').trim();
    const taxRegime = rawRegime ? `${rawRegime} Tax Regime` : 'New Tax Regime (u/s 115BAC)';

    const department = (user?.department && user.department !== 'Non-Teaching' && user.department !== 'Teaching') 
      ? user.department 
      : ((p.employeeId || '').startsWith('TS') ? 'Academic & Research' : 'Finance & Accounts');

    const logoSrc = IIPE_LOGO_BASE64;
    const cleanLevelStr = (user?.payLevel || p.payLevel || '-').replace(/^Level-?/i, '');
    const displayLevel = cleanLevelStr !== '-' ? `Level-${cleanLevelStr}` : '-';
    
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
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 250px;
    max-width: 45%;
    height: auto;
    object-fit: contain;
    opacity: 0.12;
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
        <div class="inst-sub">(An Institute of National Importance)</div>
        <div class="inst-min">Ministry of Petroleum and Natural Gas, Government of India</div>
        <div class="inst-addr">Vangali, Sabbavaram, Anakapalle &ndash; 531035, Andhra Pradesh, India</div>
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
      <div class="detail-row"><div class="lbl">PRAN / EPF Number</div><div class="sep">:</div><div class="val">${u?.pranAccountNumber || u?.pfAccountNumber || '-'}</div></div>
      
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

  ${ignorablePension > 0 ? `
  <!-- Deductable Pension Warning Banner -->
  <div style="margin-bottom: 8px; padding: 6px 10px; background: #fffbeb; border: 1px solid #fde68a; border-left: 4px solid #d97706; border-radius: 4px; font-size: 8.5px; color: #92400e; display: flex; align-items: center; gap: 8px; position: relative; z-index: 1;">
    <span style="font-size: 13px; line-height: 1;">⚠️</span>
    <div>
      <strong>Notice on Deductable Pension:</strong> Deductable Pension of <strong>Rs. ${fmt(ignorablePension)}</strong> has been deducted from Gross Salary as per applicable 7th CPC / Government re-employment rules.
    </div>
  </div>
  ` : ''}

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
            <tr><td>Basic Pay</td><td class="amt-col">${fmt(basicPay)}</td></tr>
            ${(da > 0 || !isContract) ? `<tr><td>Dearness Allowance (DA)</td><td class="amt-col">${fmt(da)}</td></tr>` : ''}
            ${(hra > 0 || !isContract) ? `<tr><td>House Rent Allowance (HRA)</td><td class="amt-col">${fmt(hra)}</td></tr>` : ''}
            ${(ta > 0 || !isContract) ? `<tr><td>Transport Allowance (TA)</td><td class="amt-col">${fmt(ta)}</td></tr>` : ''}
            ${daArrears > 0 ? `<tr><td>DA&TA Arrears</td><td class="amt-col" style="color:#0a3161;font-weight:700;">${fmt(daArrears)}</td></tr>` : ''}
            ${promotionArrears > 0 ? `<tr><td>Promotional Arrears</td><td class="amt-col" style="color:#0a3161;font-weight:700;">${fmt(promotionArrears)}</td></tr>` : ''}
            ${arrears > 0 ? `<tr><td>Arrears</td><td class="amt-col" style="color:#0a3161;font-weight:700;">${fmt(arrears)}</td></tr>` : ''}
            ${otherAllowances > 0 ? `<tr><td>Special / Dean Allowance</td><td class="amt-col">${fmt(otherAllowances)}</td></tr>` : ''}
            ${npsEmpE > 0 ? `<tr><td>NPS Employer Contribution (14%)</td><td class="amt-col">${fmt(npsEmpE)}</td></tr>` : ''}
            ${ignorablePension > 0 ? `<tr><td style="color:#b91c1c;font-weight:600;">Less: Deductable Pension</td><td class="amt-col" style="color:#b91c1c;font-weight:700;">- ${fmt(ignorablePension)}</td></tr>` : ''}
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
            ${(npsEmployeeShare > 0 || !isContract) ? `<tr><td>NPS Employee Contribution (10%)</td><td class="amt-col">${fmt(npsEmployeeShare)}</td></tr>` : ''}
            ${npsEmpD > 0 ? `<tr><td>NPS Employer Share (Deduction)</td><td class="amt-col">${fmt(npsEmpD)}</td></tr>` : ''}
            <tr><td>Professional Tax (PT)</td><td class="amt-col">${fmt(professionalTax)}</td></tr>
            ${(cghs > 0 || !isContract) ? `<tr><td>CGHS / Medical Contribution</td><td class="amt-col">${fmt(cghs)}</td></tr>` : ''}
            <tr><td>Income Tax (TDS)</td><td class="amt-col">${fmt(tds)}</td></tr>
            ${otherDeductions > 0 ? `<tr><td>Other Deductions / Salary Recovery</td><td class="amt-col">${fmt(otherDeductions)}</td></tr>` : ''}
            <tr class="total-row"><td>TOTAL DEDUCTIONS</td><td class="amt-col">${fmt(totalDeductions)}</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>

  <!-- Net Pay Box -->
  <div class="net-pay-box">
    <div class="net-pay-header">NET PAYABLE AMOUNT</div>
    <div class="net-pay-body">
      <div class="net-pay-amount">Rs. ${fmt(netSalary)}</div>
      <div class="net-pay-words">(${words})</div>
    </div>
  </div>

  <!-- Summary Cards -->
  <div class="summary-cards">
    <div class="card earn">
      <div class="card-icon"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg></div>
      <div class="card-info"><div class="lbl">Total Earnings</div><div class="val">Rs. ${fmt(totalEarnings)}</div></div>
    </div>
    <div class="card ded">
      <div class="card-icon"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4"></path></svg></div>
      <div class="card-info"><div class="lbl">Total Deductions</div><div class="val">Rs. ${fmt(totalDeductions)}</div></div>
    </div>
    <div class="card net">
      <div class="card-icon"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg></div>
      <div class="card-info"><div class="lbl">Net Pay</div><div class="val">Rs. ${fmt(netSalary)}</div></div>
    </div>
    <div class="card perc">
      <div class="card-icon"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z"></path></svg></div>
      <div class="card-info"><div class="lbl">Deductions (%)</div><div class="val">${deductionPercentage}%</div><div class="sub">of Gross Earnings</div></div>
    </div>
  </div>

  <!-- Footer Area -->
  <div class="footer-row">
    <div></div>
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
      printForm16Document(data);
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
    <div className="page-container" style={{ paddingBottom: '60px', animation: 'fadeIn 0.5s ease' }}>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', background: '#ffffff', padding: '24px 28px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03)', border: '1px solid var(--border)', marginBottom: '24px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)' }}>My Payslips</h1>
          <p style={{ margin: '8px 0 0 0', color: 'var(--text-muted)', fontSize: '0.95rem' }}>Securely view, download, and print your official salary slips and tax documents.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg-hover)', padding: '8px 16px', borderRadius: '8px', border: '1px solid var(--border)' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Current Year:</span>
          <span style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--primary)' }}>{currentYear}</span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: selectedPayroll ? '360px 1fr' : '1fr', gap: '28px', alignItems: 'start', transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)' }}>
        {/* Payslip List */}
        <div style={{ background: 'var(--bg-card)', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 8px 30px rgba(0,0,0,0.06)', border: '1px solid var(--border)' }}>
          <div style={{ padding: '20px 24px', background: 'linear-gradient(to right, rgba(10,49,97,0.05), transparent)', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 700, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.1rem' }}>
              <Calendar size={20} /> Monthly Statements
            </span>
            <span style={{ fontSize: '0.8rem', color: '#fff', background: 'var(--accent)', padding: '4px 10px', borderRadius: '20px', fontWeight: 700 }}>
              {payrolls.length} Total
            </span>
          </div>
          {payrolls.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
              <Receipt size={48} style={{ opacity: 0.3, marginBottom: '16px' }} />
              <p style={{ margin: 0, fontSize: '1.1rem' }}>No payslips generated yet.</p>
            </div>
          ) : (
            <div style={{ maxHeight: selectedPayroll ? '700px' : 'auto', overflowY: selectedPayroll ? 'auto' : 'visible' }}>
              {payrolls.map(p => {
                const isSelected = selectedPayroll?.id === p.id;
                return (
                  <div key={p.id}
                    style={{
                      padding: '20px 24px', borderBottom: '1px solid var(--border)',
                      cursor: 'pointer', transition: 'all 0.25s ease',
                      background: isSelected ? 'rgba(201,168,76,0.06)' : 'transparent',
                      borderLeft: isSelected ? '5px solid var(--accent)' : '5px solid transparent',
                      position: 'relative'
                    }}
                    onClick={() => { setSelectedPayroll(p); }}
                    onMouseEnter={e => { if (!isSelected) { e.currentTarget.style.background = 'var(--bg-hover)'; e.currentTarget.style.paddingLeft = '30px'; } }}
                    onMouseLeave={e => { if (!isSelected) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.paddingLeft = '24px'; } }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ background: isSelected ? 'var(--accent)' : 'var(--bg-card)', color: isSelected ? '#fff' : 'var(--primary)', width: '40px', height: '40px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '1.1rem', boxShadow: isSelected ? '0 4px 10px rgba(201,168,76,0.3)' : 'none', transition: '0.3s' }}>
                          {months[p.month - 1].substring(0,3)}
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '1.1rem' }}>{months[p.month - 1]} {p.year}</div>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 8px', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 700, background: p.status === 'APPROVED' ? 'rgba(34,197,94,0.1)' : 'rgba(245,158,11,0.1)', color: p.status === 'APPROVED' ? '#16a34a' : '#d97706', marginTop: '4px' }}>
                            {p.status === 'APPROVED' ? <CheckCircle size={10} /> : <Clock size={10} />} {p.status}
                          </span>
                        </div>
                      </div>
                      {isSelected && <ChevronRight size={20} color="var(--accent)" style={{ position: 'absolute', right: '16px', top: '30px' }} />}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingLeft: '50px' }}>
                      <div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Net Salary</div>
                        <div style={{ fontSize: '1.1rem', color: '#16a34a', fontWeight: 800 }}>{fmt(getCalculatedNet(p))}</div>
                      </div>
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleOpenPayslip(p); }}
                        style={{
                          background: 'var(--primary)', color: '#fff', border: 'none',
                          padding: '6px 14px', borderRadius: '8px', fontSize: '0.8rem',
                          fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s',
                          boxShadow: '0 2px 5px rgba(0,0,0,0.1)'
                        }}
                        onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)'; }}
                        onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 2px 5px rgba(0,0,0,0.1)'; }}>
                        <Eye size={14} /> View
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Payslip Detail */}
        {selectedPayroll && (
          <div style={{ background: 'var(--bg-card)', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 8px 30px rgba(0,0,0,0.06)', border: '1px solid var(--border)', animation: 'slideInRight 0.4s ease' }}>
            <div style={{ padding: '24px 32px', background: 'linear-gradient(to right, rgba(201,168,76,0.1), transparent)', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
              <div>
                <h3 style={{ margin: 0, color: 'var(--primary)', fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <FileText size={24} color="var(--accent)" /> Salary Details
                </h3>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '4px', fontWeight: 500 }}>
                  For the month of {months[selectedPayroll.month - 1]} {selectedPayroll.year}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <button onClick={() => selectedPayroll && handleOpenPayslip(selectedPayroll)} 
                  style={{ background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: '8px', padding: '10px 18px', fontSize: '0.9rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', transition: '0.2s' }}
                  onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'} onMouseLeave={e => e.currentTarget.style.transform = 'none'}>
                  <Eye size={16} /> Full Preview
                </button>
                <button onClick={printPayslip} 
                  style={{ background: 'var(--accent)', color: '#0a3161', border: 'none', borderRadius: '8px', padding: '10px 18px', fontSize: '0.9rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', transition: '0.2s' }}
                  onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'} onMouseLeave={e => e.currentTarget.style.transform = 'none'}>
                  <Printer size={16} /> Print / PDF
                </button>
                <button onClick={() => setSelectedPayroll(null)} 
                  style={{ background: 'rgba(0,0,0,0.05)', border: 'none', color: 'var(--text-primary)', width: '40px', height: '40px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: '0.2s' }} 
                  onMouseEnter={e => e.currentTarget.style.background='rgba(0,0,0,0.1)'} onMouseLeave={e => e.currentTarget.style.background='rgba(0,0,0,0.05)'}>
                  <X size={20} />
                </button>
              </div>
            </div>
            
            <div style={{ padding: '32px' }}>
              {/* Header info */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '20px', marginBottom: '40px', padding: '24px', background: 'var(--bg-hover)', borderRadius: '14px', border: '1px solid rgba(0,0,0,0.05)' }}>
                {[
                  { icon: <User size={16}/>, label: 'Employee ID', value: selectedPayroll.employeeId },
                  { icon: <Briefcase size={16}/>, label: 'Designation', value: userProfile?.designation },
                  { icon: <Building size={16}/>, label: 'Department', value: userProfile?.department || 'Finance & Accounts' },
                  { icon: <CreditCard size={16}/>, label: 'PAN Number', value: userProfile?.pan },
                  { icon: <Shield size={16}/>, label: 'PRAN / EPF Number', value: userProfile?.pranAccountNumber || userProfile?.pfAccountNumber },
                  { icon: <Landmark size={16}/>, label: 'Bank A/C', value: userProfile?.bankAccountNumber ? `****${String(userProfile.bankAccountNumber).slice(-4)}` : null },
                  { icon: <Calendar size={16}/>, label: 'Date of Joining', value: userProfile?.dateOfJoining || userProfile?.joiningDate },
                  { icon: <CheckCircle size={16}/>, label: 'Approved By', value: selectedPayroll.approvedBy },
                ].filter(i => i.value).map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                    <div style={{ color: 'var(--accent)', marginTop: '2px' }}>{item.icon}</div>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px', fontWeight: 600 }}>{item.label}</div>
                      <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.95rem' }}>{item.value}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Earnings vs Deductions */}
              {(() => {
                const isSelContract = (selectedPayroll.employeeType || userProfile?.employeeType || userProfile?.function || '').toLowerCase().includes('contract') || (selectedPayroll.payLevel || userProfile?.payLevel || '').toLowerCase().includes('consolidated') || (selectedPayroll.employeeId || '').startsWith('CNT') || (selectedPayroll.employeeId || '').startsWith('CT') || (selectedPayroll.employeeId || '').startsWith('CMED');
                const isSelDirector = (selectedPayroll.employeeId === 'DIR001') || (userProfile?.employeeId === 'DIR001');

                const inBasic = selectedPayroll.basicPay || 0;
                const inDa = selectedPayroll.da || 0;
                const inHra = selectedPayroll.hra || 0;
                const inTa = selectedPayroll.ta || 0;
                const inDaArrears = selectedPayroll.daArrears || 0;
                const inPromotionArrears = selectedPayroll.promotionArrears || 0;
                const inArrears = selectedPayroll.arrears || 0;
                const inOtherAllowances = selectedPayroll.otherAllowances || 0;
                const inNpsEmpE = selectedPayroll.npsEmployerShare !== undefined && selectedPayroll.npsEmployerShare !== null
                  ? selectedPayroll.npsEmployerShare
                  : ((isSelContract || isSelDirector) ? 0 : Math.round((inBasic + inDa) * 0.14));
                const inIgnorablePension = selectedPayroll.ignorablePension || userProfile?.ignorablePension || 0;
                const inGross = Math.max(0, (inBasic + inDa + inHra + inTa + inDaArrears + inPromotionArrears + inArrears + inOtherAllowances + inNpsEmpE) - inIgnorablePension);

                const inNpsEmpShare = selectedPayroll.npsEmployeeShare !== undefined && selectedPayroll.npsEmployeeShare !== null
                  ? selectedPayroll.npsEmployeeShare
                  : ((isSelContract || isSelDirector) ? 0 : Math.round((inBasic + inDa) * 0.10));
                const inNpsEmpD = inNpsEmpE;
                const inPt = selectedPayroll.professionalTax !== undefined && selectedPayroll.professionalTax !== null
                  ? selectedPayroll.professionalTax
                  : (inBasic >= 20000 ? 200 : 0);
                const cleanLvl = (userProfile?.payLevel || selectedPayroll.payLevel || '10').replace(/\D/g, '');
                const numLvl = parseInt(cleanLvl || '10', 10);
                const inCghs = selectedPayroll.cghs !== undefined && selectedPayroll.cghs !== null
                  ? selectedPayroll.cghs
                  : (isSelContract ? 0 : (numLvl >= 12 ? 1000 : (numLvl >= 7 ? 650 : (numLvl === 6 ? 450 : 250))));
                const inTds = selectedPayroll.tds || 0;
                const inOtherDed = selectedPayroll.otherDeductions || 0;
                const inTotalDed = inNpsEmpShare + inNpsEmpD + inPt + inCghs + inTds + inOtherDed;
                const inNet = Math.max(0, inGross - inTotalDed);

                return (
                  <>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '40px' }}>
                      {/* Earnings */}
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px', paddingBottom: '12px', borderBottom: '2px solid rgba(34,197,94,0.4)' }}>
                          <div style={{ background: 'rgba(34,197,94,0.15)', color: '#15803d', padding: '6px', borderRadius: '8px' }}><DollarSign size={20} /></div>
                          <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#15803d', textTransform: 'uppercase', letterSpacing: '1px' }}>Earnings</div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                          {[
                            ['Basic Pay', inBasic],
                            (inDa > 0 || !isSelContract) ? ['Dearness Allowance (DA)', inDa] : null,
                            (inHra > 0 || !isSelContract) ? ['House Rent Allowance (HRA)', inHra] : null,
                            (inTa > 0 || !isSelContract) ? ['Transport Allowance (TA)', inTa] : null,
                            inDaArrears ? ['DA&TA Arrears', inDaArrears] : null,
                            inPromotionArrears ? ['Promotional Arrears', inPromotionArrears] : null,
                            inArrears ? ['Arrears', inArrears] : null,
                            inOtherAllowances ? ['Special / Dean Allowance', inOtherAllowances] : null,
                            inNpsEmpE > 0 ? ['NPS Employer (14%)', inNpsEmpE] : null,
                            inIgnorablePension > 0 ? ['Less: Deductable Pension', -inIgnorablePension] : null,
                          ].filter(Boolean).map(([label, val]: any, idx) => (
                            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1rem', paddingBottom: '8px', borderBottom: '1px dashed rgba(0,0,0,0.05)' }}>
                              <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{label}</span>
                              <span style={{ fontWeight: 600, color: (val < 0 ? '#b91c1c' : 'var(--text-primary)') }}>{fmt(Number(val))}</span>
                            </div>
                          ))}
                        </div>
                        <div style={{ marginTop: '20px', padding: '16px', background: 'rgba(34,197,94,0.05)', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid rgba(34,197,94,0.2)' }}>
                          <span style={{ fontWeight: 800, color: '#15803d', fontSize: '1.1rem' }}>Gross Salary</span>
                          <span style={{ fontWeight: 800, color: '#16a34a', fontSize: '1.25rem' }}>{fmt(inGross)}</span>
                        </div>
                      </div>

                      {/* Deductions */}
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px', paddingBottom: '12px', borderBottom: '2px solid rgba(239,68,68,0.4)' }}>
                          <div style={{ background: 'rgba(239,68,68,0.15)', color: '#b91c1c', padding: '6px', borderRadius: '8px' }}><Hash size={20} /></div>
                          <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#b91c1c', textTransform: 'uppercase', letterSpacing: '1px' }}>Deductions</div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                          {[
                            (inNpsEmpShare > 0 || !isSelContract) ? ['NPS (Employee 10%)', inNpsEmpShare] : null,
                            inNpsEmpD > 0 ? ['NPS (Employer 14%)', inNpsEmpD] : null,
                            ['Professional Tax', inPt],
                            (inCghs > 0 || !isSelContract) ? ['CGHS / Medical', inCghs] : null,
                            ['TDS / Income Tax', inTds],
                            inOtherDed > 0 ? ['Other Deductions', inOtherDed] : null,
                          ].filter(Boolean).map(([label, val]: any, idx) => (
                            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1rem', paddingBottom: '8px', borderBottom: '1px dashed rgba(0,0,0,0.05)' }}>
                              <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{label}</span>
                              <span style={{ fontWeight: 600, color: '#dc2626' }}>{fmt(Number(val))}</span>
                            </div>
                          ))}
                        </div>
                        <div style={{ marginTop: '20px', padding: '16px', background: 'rgba(239,68,68,0.05)', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid rgba(239,68,68,0.2)' }}>
                          <span style={{ fontWeight: 800, color: '#b91c1c', fontSize: '1.1rem' }}>Total Deductions</span>
                          <span style={{ fontWeight: 800, color: '#dc2626', fontSize: '1.25rem' }}>{fmt(inTotalDed)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Net Salary */}
                    <div style={{ marginTop: '40px', padding: '32px', textAlign: 'center', background: 'linear-gradient(135deg, rgba(34,197,94,0.1), rgba(26,58,110,0.05))', borderRadius: '16px', border: '1px solid rgba(34,197,94,0.3)', boxShadow: '0 10px 30px -10px rgba(34,197,94,0.2)' }}>
                      <div style={{ fontSize: '0.9rem', color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '2px', fontWeight: 800, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
                        <CheckCircle size={18} /> Net Salary Payable
                      </div>
                      <div style={{ fontSize: '3rem', fontWeight: 900, color: '#16a34a', margin: '12px 0', textShadow: '0 2px 10px rgba(22,163,74,0.2)' }}>
                        {fmt(inNet)}
                      </div>
                      <div style={{ fontSize: '1rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                        Transferred to your bank account for the month of {months[selectedPayroll.month - 1]} {selectedPayroll.year}.
                      </div>
                    </div>
                  </>
                );
              })()}
              </div>
            </div>
        )}
      </div>

      {/* TDS & Income Tax Projection Section */}
      {tdsProjection && (
        <div style={{ marginTop: '40px', background: 'var(--bg-card)', padding: '40px', borderRadius: '16px', boxShadow: '0 8px 30px rgba(0,0,0,0.06)', border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px', marginBottom: '32px' }}>
            <div>
              <h3 style={{ margin: 0, color: 'var(--primary)', fontSize: '1.6rem', display: 'flex', alignItems: 'center', gap: '12px', fontWeight: 800 }}>
                <Landmark size={28} color="var(--accent)" /> Annual TDS & Income Tax Projection
              </h3>
              <p style={{ margin: '8px 0 0 0', color: 'var(--text-muted)', fontSize: '1.05rem' }}>
                Financial Year {tdsProjection.financialYear} • <strong style={{ color: 'var(--primary)' }}>{tdsProjection.taxRegime} Tax Regime</strong>
              </p>
            </div>
            <div style={{ padding: '10px 20px', borderRadius: '12px', background: 'rgba(201,168,76,0.1)', color: 'var(--primary)', fontWeight: 700, fontSize: '1rem', border: '1px solid rgba(201,168,76,0.3)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CreditCard size={18} /> PAN: {tdsProjection.pan}
            </div>
          </div>

          {/* 4 Key Metric Summary Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '24px', marginBottom: '40px' }}>
            <div style={{ padding: '24px', background: '#fff', borderRadius: '16px', border: '1px solid rgba(0,0,0,0.08)', boxShadow: '0 4px 15px rgba(0,0,0,0.03)', transition: '0.3s', position: 'relative', overflow: 'hidden' }} onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-4px)'} onMouseLeave={e => e.currentTarget.style.transform = 'none'}>
              <div style={{ position: 'absolute', right: '-10px', top: '-10px', opacity: 0.05 }}><Landmark size={100} /></div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '12px' }}>
                <Info size={16} color="var(--primary)" /> Total Annual Tax
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--primary)' }}>
                {fmt(tdsProjection.estimatedAnnualTax)}
              </div>
              <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: '12px', fontWeight: 500 }}>
                Net Taxable: {fmt(tdsProjection.netTaxableIncome)}
              </div>
            </div>

            <div style={{ padding: '24px', background: 'rgba(34,197,94,0.03)', borderRadius: '16px', border: '1px solid rgba(34,197,94,0.2)', boxShadow: '0 4px 15px rgba(34,197,94,0.05)', transition: '0.3s', position: 'relative', overflow: 'hidden' }} onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-4px)'} onMouseLeave={e => e.currentTarget.style.transform = 'none'}>
              <div style={{ position: 'absolute', right: '-10px', top: '-10px', opacity: 0.05 }}><CheckCircle size={100} color="#16a34a" /></div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: '#15803d', textTransform: 'uppercase', fontWeight: 700, marginBottom: '12px' }}>
                <CheckCircle size={16} /> TDS Deducted
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 900, color: '#16a34a' }}>
                {fmt(tdsProjection.tdsDeductedSoFar)}
              </div>
              <div style={{ fontSize: '0.9rem', color: '#15803d', marginTop: '12px', fontWeight: 500 }}>
                Across {tdsProjection.monthsDeductedCount} months
              </div>
            </div>

            <div style={{ padding: '24px', background: 'rgba(239,68,68,0.03)', borderRadius: '16px', border: '1px solid rgba(239,68,68,0.2)', boxShadow: '0 4px 15px rgba(239,68,68,0.05)', transition: '0.3s', position: 'relative', overflow: 'hidden' }} onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-4px)'} onMouseLeave={e => e.currentTarget.style.transform = 'none'}>
              <div style={{ position: 'absolute', right: '-10px', top: '-10px', opacity: 0.05 }}><AlertCircle size={100} color="#dc2626" /></div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: '#b91c1c', textTransform: 'uppercase', fontWeight: 700, marginBottom: '12px' }}>
                <AlertCircle size={16} /> Balance to Deduct
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 900, color: '#dc2626' }}>
                {fmt(tdsProjection.tdsRemainingToBeDeducted)}
              </div>
              <div style={{ fontSize: '0.9rem', color: '#b91c1c', marginTop: '12px', fontWeight: 500 }}>
                Over remaining {tdsProjection.monthsRemainingCount} months
              </div>
            </div>

            <div style={{ padding: '24px', background: 'linear-gradient(135deg, rgba(201,168,76,0.1), rgba(10,49,97,0.05))', borderRadius: '16px', border: '1px solid rgba(201,168,76,0.3)', boxShadow: '0 4px 15px rgba(201,168,76,0.1)', transition: '0.3s', position: 'relative', overflow: 'hidden' }} onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-4px)'} onMouseLeave={e => e.currentTarget.style.transform = 'none'}>
              <div style={{ position: 'absolute', right: '-10px', top: '-10px', opacity: 0.05 }}><Calendar size={100} color="var(--primary)" /></div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: 'var(--primary)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '12px' }}>
                <Calendar size={16} /> Projected Monthly TDS
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--accent)' }}>
                {fmt(tdsProjection.monthlyTdsNextMonths)} <span style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--primary)' }}>/ mo</span>
              </div>
              <div style={{ fontSize: '0.9rem', color: 'var(--primary)', marginTop: '12px', fontWeight: 500 }}>
                Estimated for next months
              </div>
            </div>
          </div>

          {/* Month-by-Month TDS Schedule Table */}
          <div style={{ fontWeight: 800, color: 'var(--primary)', marginBottom: '16px', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileText size={20} /> Month-by-Month Schedule (April {currentYear} – March {currentYear + 1})
          </div>
          <div style={{ overflowX: 'auto', borderRadius: '12px', border: '1px solid var(--border)', boxShadow: '0 4px 15px rgba(0,0,0,0.03)' }}>
            <table className="table-iipm" style={{ margin: 0, width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ background: 'var(--bg-hover)' }}>
                <tr>
                  <th style={{ padding: '16px 20px', color: 'var(--text-muted)', fontWeight: 700, fontSize: '0.9rem' }}>Month</th>
                  <th style={{ padding: '16px 20px', textAlign: 'right', color: 'var(--text-muted)', fontWeight: 700, fontSize: '0.9rem' }}>Gross Income</th>
                  <th style={{ padding: '16px 20px', textAlign: 'center', color: 'var(--text-muted)', fontWeight: 700, fontSize: '0.9rem' }}>Status</th>
                  <th style={{ padding: '16px 20px', textAlign: 'right', color: 'var(--text-muted)', fontWeight: 700, fontSize: '0.9rem' }}>Monthly TDS</th>
                  <th style={{ padding: '16px 20px', textAlign: 'right', color: 'var(--text-muted)', fontWeight: 700, fontSize: '0.9rem' }}>Cumulative TDS</th>
                </tr>
              </thead>
              <tbody>
                {tdsProjection.monthlySchedule?.map((s: any, idx: number) => {
                  const isDeducted = s.status === 'DEDUCTED';
                  return (
                    <tr key={idx} style={{ background: isDeducted ? 'rgba(34,197,94,0.02)' : '#fff', borderBottom: '1px solid var(--border)', transition: '0.2s' }} onMouseEnter={e => e.currentTarget.style.background='var(--bg-hover)'} onMouseLeave={e => e.currentTarget.style.background=isDeducted ? 'rgba(34,197,94,0.02)' : '#fff'}>
                      <td style={{ padding: '16px 20px', fontWeight: 700, color: 'var(--text-primary)', fontSize: '1rem' }}>{s.monthName}</td>
                      <td style={{ padding: '16px 20px', textAlign: 'right', color: 'var(--text-primary)', fontWeight: 500, fontSize: '1rem' }}>{fmt(s.grossSalary)}</td>
                      <td style={{ padding: '16px 20px', textAlign: 'center' }}>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: '6px',
                          padding: '6px 14px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 700,
                          background: isDeducted ? 'rgba(34,197,94,0.1)' : 'rgba(0,0,0,0.05)',
                          color: isDeducted ? '#15803d' : 'var(--text-muted)',
                          border: isDeducted ? '1px solid rgba(34,197,94,0.2)' : '1px solid transparent'
                        }}>
                          {isDeducted ? <CheckCircle size={14} /> : <Clock size={14} />}
                          {isDeducted ? 'Deducted' : 'Projected'}
                        </span>
                      </td>
                      <td style={{ padding: '16px 20px', textAlign: 'right', fontWeight: 800, color: isDeducted ? '#15803d' : 'var(--primary)', fontSize: '1.05rem' }}>
                        {fmt(s.tdsAmount)}
                      </td>
                      <td style={{ padding: '16px 20px', textAlign: 'right', color: 'var(--text-muted)', fontWeight: 600, fontSize: '1rem' }}>
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

      {/* Action Cards (Form 16 & IT Declaration) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '32px', marginTop: '40px' }}>
        {/* Form 16 card */}
        <div style={{ padding: '32px', background: 'linear-gradient(135deg, rgba(10,49,97,0.02) 0%, rgba(201,168,76,0.1) 100%)', borderRadius: '16px', border: '1px solid rgba(201,168,76,0.3)', boxShadow: '0 8px 30px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', transition: '0.3s' }} onMouseEnter={e => e.currentTarget.style.transform='translateY(-4px)'} onMouseLeave={e => e.currentTarget.style.transform='none'}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '1.4rem', fontWeight: 800, color: 'var(--primary)', marginBottom: '12px' }}>
              <FileCheck size={28} color="var(--accent)" /> Form 16 Certificate
            </div>
            <div style={{ color: 'var(--text-muted)', fontSize: '1.05rem', marginBottom: '32px', lineHeight: 1.6, fontWeight: 500 }}>
              Download your official annual TDS certificate for the financial year {currentYear - 1}-{currentYear}. Contains Part A and Part B.
            </div>
          </div>
          <button onClick={printForm16} style={{ width: '100%', padding: '16px', fontSize: '1.1rem', fontWeight: 700, background: 'var(--accent)', color: 'var(--primary)', border: 'none', borderRadius: '12px', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px', transition: '0.2s', boxShadow: '0 4px 15px rgba(201,168,76,0.3)' }} onMouseEnter={e => e.currentTarget.style.background='#b89842'} onMouseLeave={e => e.currentTarget.style.background='var(--accent)'}>
            <Download size={20} /> Download Form 16
          </button>
        </div>

        {/* IT Declaration link */}
        <div style={{ padding: '32px', background: '#fff', borderRadius: '16px', border: '1px solid var(--border)', boxShadow: '0 8px 30px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', transition: '0.3s' }} onMouseEnter={e => e.currentTarget.style.transform='translateY(-4px)'} onMouseLeave={e => e.currentTarget.style.transform='none'}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '1.4rem', fontWeight: 800, color: 'var(--primary)', marginBottom: '12px' }}>
              <PiggyBank size={28} color="var(--primary)" /> IT Declarations
            </div>
            <div style={{ color: 'var(--text-muted)', fontSize: '1.05rem', marginBottom: '32px', lineHeight: 1.6, fontWeight: 500 }}>
              Declare your tax-saving investments (Section 80C, HRA, etc.) to optimize your monthly TDS deductions.
            </div>
          </div>
          <Link to="/it-declaration" style={{ width: '100%', textDecoration: 'none', padding: '16px', fontSize: '1.1rem', fontWeight: 700, background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: '12px', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px', transition: '0.2s', boxShadow: '0 4px 15px rgba(10,49,97,0.3)' }} onMouseEnter={e => e.currentTarget.style.background='#08254c'} onMouseLeave={e => e.currentTarget.style.background='var(--primary)'}>
            <Briefcase size={20} /> Manage Declarations
          </Link>
        </div>
      </div>

      {/* Full Screen Interactive Mobile / Desktop Payslip Preview Modal */}
      {showPayslipModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(10,49,97, 0.8)', backdropFilter: 'blur(8px)',
          zIndex: 99999, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', padding: '24px',
          animation: 'fadeIn 0.3s ease'
        }}>
          <div style={{
            width: '100%', maxWidth: '900px', height: '100%', maxHeight: '90vh',
            background: '#fff', borderRadius: '16px', overflow: 'hidden',
            display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)'
          }}>
            {/* Modal Top Bar */}
            <div style={{
              padding: '20px 32px', background: 'var(--primary)', color: '#fff',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <div style={{ fontWeight: 700, fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Receipt size={22} color="var(--accent)" /> Official Payslip Preview {selectedPayroll ? `— ${months[selectedPayroll.month - 1]} ${selectedPayroll.year}` : ''}
              </div>
              <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                <button 
                  onClick={() => triggerPrint(activePayslipHtml)}
                  style={{ background: 'var(--accent)', color: 'var(--primary)', padding: '10px 20px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.95rem', fontWeight: 700, borderRadius: '8px', border: 'none', cursor: 'pointer', transition: '0.2s' }}
                  onMouseEnter={e => e.currentTarget.style.transform='scale(1.05)'} onMouseLeave={e => e.currentTarget.style.transform='none'}>
                  <Printer size={18} /> Print / Save PDF
                </button>
                <button 
                  onClick={() => setShowPayslipModal(false)}
                  style={{
                    background: 'rgba(255,255,255,0.1)', color: '#fff', border: 'none',
                    width: '40px', height: '40px', borderRadius: '50%', fontWeight: 700,
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: '0.2s'
                  }}
                  onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,0.2)'}
                  onMouseLeave={e => e.currentTarget.style.background='rgba(255,255,255,0.1)'}>
                  <X size={24} />
                </button>
              </div>
            </div>
            
            {/* Iframe View */}
            <iframe 
              title="Payslip Preview"
              srcDoc={activePayslipHtml}
              style={{ width: '100%', flex: 1, border: 'none', background: '#f8fafc' }}
            />
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideInRight { from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: translateX(0); } }
      `}</style>
    </div>
  );
};

export default EmployeePortal;

