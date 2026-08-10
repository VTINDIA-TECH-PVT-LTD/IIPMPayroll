import React, { useState, useEffect, useContext } from 'react';
import apiService from '../services/api';
import { UserContext } from '../App';

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
    
    let u = null;
    try {
      if (userCtx?.userId) {
        u = await apiService.getUserById(userCtx.userId);
      }
    } catch (e) {
      console.error("Could not fetch user details for payslip", e);
    }

    const name = u ? `${u.firstName} ${u.lastName}` : '';
    const netAmount = Math.round(p.netSalary || 0);
    const words = numberToWords(netAmount);

    const html = `
      <html><head><title>Pay Slip - ${months[p.month - 1]} ${p.year}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap');
        body { font-family: 'Roboto', Arial, sans-serif; font-size: 13px; margin: 40px auto; max-width: 800px; color: #111; position: relative; }
        .watermark { position: fixed; top: 30%; left: 15%; width: 70%; opacity: 0.04; z-index: -1; pointer-events: none; }
        .header { text-align: center; margin-bottom: 24px; line-height: 1.4; }
        .header h1 { margin: 0; font-size: 20px; font-weight: 700; color: #000; }
        .header p { margin: 2px 0; font-size: 13px; }
        .header .payslip-title { margin-top: 15px; font-weight: 700; font-size: 16px; border-bottom: 1px solid #ccc; display: inline-block; padding-bottom: 2px; }
        .emp-name { text-align: center; font-size: 16px; font-weight: 700; margin: 15px 0 20px 0; }
        
        .details-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-bottom: 20px; }
        .detail-row { display: flex; margin-bottom: 6px; }
        .detail-label { width: 150px; color: #444; }
        .detail-value { font-weight: 500; }
        
        table { width: 100%; border-collapse: collapse; margin-bottom: 10px; border: 1px solid #000; }
        th, td { padding: 8px 12px; border: 1px solid #000; }
        th { text-align: left; background: #fff; font-weight: 700; }
        .amt-col { text-align: right; width: 120px; }
        .total-row td { font-weight: 700; }
        .net-row { font-weight: 700; font-size: 14px; }
        .amount-words { margin-top: 15px; font-size: 13px; line-height: 1.5; }
        .footer { text-align: center; margin-top: 40px; font-size: 12px; color: #333; }
      </style></head>
      <body>
        <img src={process.env.PUBLIC_URL + "/logo.png"} class="watermark" />
        <div class="header">
          <h1>Indian Institute of Petroleum and Energy</h1>
          <p>EAB, Vangali</p>
          <p>Sabbavaram</p>
          <p>Anakapalle</p>
          <p>531035</p>
          <p>E-Mail : js@iipe.ac.in, fo@iipe.ac.in</p>
          <div class="payslip-title">Pay Slip<br/>for ${months[p.month - 1]}-${p.year}</div>
        </div>
        
        <div class="emp-name">${name}</div>
        
        <div class="details-grid">
          <div>
            <div class="detail-row"><div class="detail-label">Employee Number</div><div class="detail-value">: ${p.employeeId}</div></div>
            <div class="detail-row"><div class="detail-label">Function</div><div class="detail-value">: ${u?.function || 'Regular'}</div></div>
            <div class="detail-row"><div class="detail-label">Designation</div><div class="detail-value">: ${u?.designation || ''}</div></div>
            <div class="detail-row"><div class="detail-label">Location</div><div class="detail-value">: ${u?.location || 'Visakhapatnam'}</div></div>
            <div class="detail-row"><div class="detail-label">Bank Details</div><div class="detail-value">: ${u?.bankAccountNumber || ''}, ${u?.bankName || ''}</div></div>
            <div class="detail-row"><div class="detail-label">Date of joining</div><div class="detail-value">: ${u?.dateOfJoining ? new Date(u.dateOfJoining).toLocaleDateString('en-GB', {day:'2-digit', month:'short', year:'2-digit'}).replace(/ /g, '-') : ''}</div></div>
          </div>
          <div>
            <div class="detail-row"><div class="detail-label">Tax Regime</div><div class="detail-value">: ${u?.taxRegime || 'Regular Tax Regime'}</div></div>
            <div class="detail-row"><div class="detail-label">Income Tax Number (PAN)</div><div class="detail-value">: ${u?.pan || ''}</div></div>
            <div class="detail-row"><div class="detail-label">Pay Level</div><div class="detail-value">: ${u?.payLevel || ''}</div></div>
            <div class="detail-row"><div class="detail-label">PF account number</div><div class="detail-value">: ${u?.pfAccountNumber || ''}</div></div>
            <div class="detail-row"><div class="detail-label">Department</div><div class="detail-value">: ${u?.department || ''}</div></div>
            <div class="detail-row"><div class="detail-label">PR Account Number (PRAN)</div><div class="detail-value">: ${u?.pranAccountNumber || ''}</div></div>
          </div>
        </div>
        
        <table>
          <tr>
            <th>Earnings</th><th class="amt-col">Amount</th>
            <th>Deductions</th><th class="amt-col">Amount</th>
          </tr>
          <tr>
            <td>Basic Pay</td><td class="amt-col">${(p.basicPay||0).toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
            <td>CGHS</td><td class="amt-col">${(p.cghs||0).toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
          </tr>
          <tr>
            <td>Dearness Allowance</td><td class="amt-col">${(p.da||0).toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
            <td>NPS Employee Share</td><td class="amt-col">${(p.npsEmployeeShare||0).toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
          </tr>
          <tr>
            <td>HRA</td><td class="amt-col">${(p.hra||0).toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
            <td>NPS Employer Share D</td><td class="amt-col">${(p.npsEmployerShare||0).toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
          </tr>
          <tr>
            <td>NPS Employer Share E</td><td class="amt-col">${(p.npsEmployerShare||0).toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
            <td>Professional Tax</td><td class="amt-col">${(p.professionalTax||0).toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
          </tr>
          <tr>
            <td>Transport Allowance</td><td class="amt-col">${(p.ta||0).toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
            ${p.tds > 0 ? `<td>TDS</td><td class="amt-col">${(p.tds).toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>` : `<td></td><td></td>`}
          </tr>
          ${p.otherDeductions > 0 && p.tds === 0 ? `<tr><td></td><td></td><td>Other Deductions</td><td class="amt-col">${(p.otherDeductions).toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td></tr>` : ''}
          ${p.otherDeductions > 0 && p.tds > 0 ? `<tr><td></td><td></td><td>Other Deductions</td><td class="amt-col">${(p.otherDeductions).toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td></tr>` : ''}
          <tr class="total-row">
            <td>Total Earnings</td><td class="amt-col">${(p.grossSalary||0).toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
            <td>Total Deductions</td><td class="amt-col">${(p.totalDeductions||0).toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
          </tr>
          <tr class="net-row">
            <td colspan="2" style="border-right: none;"></td>
            <td style="border-left: none;">Net Amount</td>
            <td class="amt-col">₹ ${(p.netSalary||0).toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
          </tr>
        </table>
        
        <div class="amount-words">
          Amount (in words):<br/>
          INR ${words} Only
        </div>
        
        <div class="footer">
          This is a Computer Generated Pay Slip
        </div>
      </body></html>
    `;
    const win = window.open('', '_blank');
    if (win) { win.document.write(html); win.document.close(); win.print(); }
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

      {/* YTD Summary */}
      {ytd && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '16px', marginBottom: '24px' }}>
          {[
            { label: 'Months Processed', value: ytd.monthsProcessed, color: '#3b82f6', prefix: '' },
            { label: 'Total Gross (YTD)', value: fmt(ytd.totalGrossSalary), color: '#c9a84c', prefix: '' },
            { label: 'Total TDS (YTD)', value: fmt(ytd.totalTDS), color: '#ef4444', prefix: '' },
            { label: 'Total Net (YTD)', value: fmt(ytd.totalNetSalary), color: '#22c55e', prefix: '' },
          ].map((s, i) => (
            <div className="stat-card" key={i}>
              <div className="stat-label">{s.label}</div>
              <div className="stat-value" style={{ fontSize: '1.3rem', color: s.color }}>{s.value}</div>
            </div>
          ))}
        </div>
      )}

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
        <a href="/form16" className="btn-primary-iipm" style={{ textDecoration: 'none' }}>Go to Declarations</a>
      </div>

    </div>
  );
};

export default EmployeePortal;
