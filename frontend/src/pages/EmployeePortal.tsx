import React, { useState, useEffect, useContext } from 'react';
import apiService from '../services/api';
import { UserContext } from '../App';
import { Link } from 'react-router-dom';
import { IIPE_LOGO_BASE64 } from '../assets/logoBase64';
import { FileText, Download, CheckCircle, Clock, CreditCard, DollarSign, Calendar, Shield, PiggyBank, Receipt, Eye, Printer, X, FileCheck, Landmark, User, Hash, Info, Briefcase, Building, ChevronRight, AlertCircle } from 'lucide-react';
import { formatEmployeeNameWithTitle } from '../utils/nameUtils';
import { printForm16Document } from '../utils/form16Print';
import { generateSinglePayslipHtml, printPayslipHtml } from '../utils/payslipPrint';

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
    printPayslipHtml(htmlContent);
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
    return generateSinglePayslipHtml(p, u || userProfile);
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

