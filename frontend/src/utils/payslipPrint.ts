import { IIPE_LOGO_BASE64 } from '../assets/logoBase64';
import { formatEmployeeNameWithTitle } from './nameUtils';

const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];

export function generateSinglePayslipCardHtml(p: any, u: any): string {
  const user = u || {};
  const name = formatEmployeeNameWithTitle(p, user) || 'Employee';
  const monthLabel = months[(p.month || 1) - 1];
  const fmt = (n: number) => (n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  
  const isContract = (p.employeeType || user?.employeeType || user?.function || '').toLowerCase().includes('contract') || 
                     (p.payLevel || user?.payLevel || '').toLowerCase().includes('consolidated') || 
                     (p.employeeId || '').startsWith('CNT') || 
                     (p.employeeId || '').startsWith('CT') || 
                     (p.employeeId || '').startsWith('CMED');
  const isFaculty = ((p.employeeId || '').startsWith('TS') || 
                     (user?.function || '').toLowerCase().includes('teaching') || 
                     (user?.department || '').toLowerCase().includes('academic') || 
                     (user?.designation || '').toLowerCase().includes('professor')) && !isContract;
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

  const totalDeductions = npsEmployeeShare + npsEmpD + professionalTax + cghs + tds + otherDeductions;
  const netSalary = Math.max(0, totalEarnings - totalDeductions);
  
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
  const taxRegime = rawRegime ? `${rawRegime} Tax Regime` : 'Regular Tax Regime';

  const department = (user?.department && user.department !== 'Non-Teaching' && user.department !== 'Teaching') 
    ? user.department 
    : ((p.employeeId || '').startsWith('TS') ? 'Faculty' : 'Finance & Accounts');

  const logoSrc = IIPE_LOGO_BASE64;
  const cleanLevelStr = (user?.payLevel || p.payLevel || '-').replace(/^Level-?/i, '');
  const displayLevel = cleanLevelStr !== '-' ? `Level-${cleanLevelStr}` : '-';

  // Earnings Items List
  const earningsList: { label: string; amount: string }[] = [];
  earningsList.push({ label: 'Basic Pay', amount: fmt(basicPay) });
  if (da > 0 || !isContract) earningsList.push({ label: 'Dearness Allowance', amount: fmt(da) });
  if (hra > 0 || !isContract) earningsList.push({ label: 'HRA', amount: fmt(hra) });
  if (npsEmpE > 0) earningsList.push({ label: 'NPS Employer Share E', amount: fmt(npsEmpE) });
  if (ta > 0 || !isContract) earningsList.push({ label: 'Transport Allowance', amount: fmt(ta) });
  if (otherAllowances > 0) earningsList.push({ label: 'Special / Dean Allowance', amount: fmt(otherAllowances) });
  if (daArrears > 0) earningsList.push({ label: 'DA&TA Arrears', amount: fmt(daArrears) });
  if (promotionArrears > 0) earningsList.push({ label: 'Promotional Arrears', amount: fmt(promotionArrears) });
  if (arrears > 0) earningsList.push({ label: 'Arrears', amount: fmt(arrears) });
  if (ignorablePension > 0) earningsList.push({ label: 'Less: Deductable Pension', amount: `- ${fmt(ignorablePension)}` });

  // Deductions Items List
  const deductionsList: { label: string; amount: string }[] = [];
  deductionsList.push({ label: 'CGHS', amount: fmt(cghs) });
  deductionsList.push({ label: 'NPS Employee Share', amount: fmt(npsEmployeeShare) });
  deductionsList.push({ label: 'NPS Employer Share D', amount: fmt(npsEmpD) });
  deductionsList.push({ label: 'Professional Tax', amount: fmt(professionalTax) });
  deductionsList.push({ label: 'Income Tax (TDS)', amount: fmt(tds) });
  if (otherDeductions > 0) deductionsList.push({ label: 'Other Deductions', amount: fmt(otherDeductions) });

  const maxRows = Math.max(earningsList.length, deductionsList.length);
  const tableRowsHtml = Array.from({ length: maxRows }, (_, idx) => {
    const e = earningsList[idx];
    const d = deductionsList[idx];
    return `
      <tr>
        <td>${e ? e.label : ''}</td>
        <td style="text-align: right;">${e ? e.amount : ''}</td>
        <td>${d ? d.label : ''}</td>
        <td style="text-align: right;">${d ? d.amount : ''}</td>
      </tr>
    `;
  }).join('');

  return `
  <div class="payslip-page-wrapper">
    <div class="page">
      <img src="${logoSrc}" class="watermark" alt="Watermark"/>
      
      <div class="payslip-inner">
        <!-- Header -->
        <div class="header-table-wrap">
          <table class="header-table">
            <tr>
              <td class="header-logo-cell">
                <img src="${logoSrc}" alt="Logo" class="header-logo" />
              </td>
              <td class="header-text-cell">
                <h1 class="inst-title">INDIAN INSTITUTE OF PETROLEUM AND ENERGY</h1>
                <div class="inst-sub">(An Institute of National Importance)</div>
                <div class="inst-min">Ministry of Petroleum and Natural Gas, Government of India</div>
                <div class="inst-addr">Vangali, Sabbavaram, Anakapalle &ndash; 531035, Andhra Pradesh, India</div>
                <div class="inst-contact">E-Mail : dr.finance@iipe.ac.in | Website: www.iipe.ac.in</div>
              </td>
            </tr>
          </table>
        </div>

        <!-- Pay Slip Title -->
        <div class="title-section">
          <div class="ps-title">Pay Slip</div>
          <div class="ps-period">for ${monthLabel} ${p.year}</div>
        </div>

        <!-- Employee Name -->
        <div class="emp-name-title">
          ${name}
        </div>

        <!-- Employee Info Table (No Border, 4 Columns) -->
        <table class="emp-info-table">
          <tr>
            <td class="lbl">Employee Number</td>
            <td class="val">: ${p.employeeId || '-'}</td>
            <td class="lbl">Date of Joining</td>
            <td class="val">: ${doj}</td>
          </tr>
          <tr>
            <td class="lbl">Designation</td>
            <td class="val">: ${user?.designation || p.designation || '-'}</td>
            <td class="lbl">Date of Next Increment</td>
            <td class="val">: ${dni}</td>
          </tr>
          <tr>
            <td class="lbl">Department</td>
            <td class="val">: ${department}</td>
            <td class="lbl">PAN Number</td>
            <td class="val">: ${user?.pan || '-'}</td>
          </tr>
          <tr>
            <td class="lbl">Category</td>
            <td class="val">: ${empCategory}</td>
            <td class="lbl">PRAN / EPF Number</td>
            <td class="val">: ${user?.pranAccountNumber || user?.pfAccountNumber || '-'}</td>
          </tr>
          <tr>
            <td class="lbl">Pay Level</td>
            <td class="val">: ${displayLevel}</td>
            <td class="lbl">Tax Regime</td>
            <td class="val">: ${taxRegime}</td>
          </tr>
          <tr>
            <td class="lbl">Bank Details</td>
            <td class="val">: ${user?.bankAccountNumber ? `****${String(user.bankAccountNumber).slice(-4)}` : '-'}</td>
            <td class="lbl">Pay Drawn (Days)</td>
            <td class="val">: ${paidDays} / ${daysInMonth} Days</td>
          </tr>
        </table>

        <!-- Salary Table (4 Columns, Bordered) -->
        <table class="salary-table">
          <thead>
            <tr>
              <th style="width: 32%;">Earnings</th>
              <th style="width: 18%; text-align: right;">Amount</th>
              <th style="width: 32%;">Deductions</th>
              <th style="width: 18%; text-align: right;">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${tableRowsHtml}
            <tr class="total-row">
              <td><strong>Total Earnings (Gross)</strong></td>
              <td style="text-align: right;"><strong>${fmt(totalEarnings)}</strong></td>
              <td><strong>Total Deductions</strong></td>
              <td style="text-align: right;"><strong>${fmt(totalDeductions)}</strong></td>
            </tr>
            <tr class="net-row">
              <td style="border: none;"></td>
              <td style="border: none; border-right: 1px solid #000;"></td>
              <td><strong>Net Amount</strong></td>
              <td style="text-align: right;"><strong>Rs ${fmt(netSalary)}</strong></td>
            </tr>
          </tbody>
        </table>

        ${ignorablePension > 0 ? `
        <div class="pension-note">
          * Note: Deductable Pension of Rs. ${fmt(ignorablePension)} has been adjusted from Gross Salary as per 7th CPC re-employment rules.
        </div>
        ` : ''}

        <!-- Footer -->
        <div class="footer-section">
          This is a Computer Generated Pay Slip
        </div>
      </div>
    </div>
  </div>
  `;
}

const payslipSharedCss = `
  @page { size: A4 portrait; margin: 1.5cm 1.0cm 1.5cm 1.5cm; }
  * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; }
  html, body { background: #f4f6f8; color: #000; font-size: 10pt; width: 100%; }
  
  .payslip-page-wrapper {
    page-break-after: always;
    page-break-inside: avoid;
    margin-bottom: 24px;
    width: 100%;
  }
  .payslip-page-wrapper:last-child {
    margin-bottom: 0;
  }
  
  .page {
    width: 100%;
    max-width: 820px;
    margin: 15px auto;
    background: #fff;
    padding: 1.5cm 1.0cm 1.5cm 1.5cm;
    box-shadow: 0 4px 15px rgba(0,0,0,0.06);
    position: relative;
    box-sizing: border-box;
    min-height: 275mm;
  }

  .watermark {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 320px;
    max-width: 65%;
    height: auto;
    object-fit: contain;
    opacity: 0.16;
    pointer-events: none;
    z-index: 0;
  }

  .payslip-inner {
    position: relative;
    z-index: 1;
    width: 100%;
  }

  .header-table-wrap { width: 100%; margin-bottom: 12px; }
  .header-table { width: 100%; border-collapse: collapse; }
  .header-logo-cell { width: 75px; vertical-align: middle; text-align: center; }
  .header-logo { width: 68px; height: 68px; object-fit: contain; }
  .header-text-cell { vertical-align: middle; text-align: center; }
  .inst-title { font-size: 13.5pt; font-weight: 800; color: #000; margin-bottom: 2px; line-height: 1.2; }
  .inst-sub { font-size: 10.5pt; font-weight: bold; color: #000; margin-bottom: 2px; }
  .inst-min { font-size: 10pt; font-weight: bold; color: #000; margin-bottom: 3px; }
  .inst-addr { font-size: 8.5pt; color: #333; margin-bottom: 2px; }
  .inst-contact { font-size: 8.5pt; color: #333; }

  .title-section { text-align: center; margin: 14px 0 12px 0; }
  .ps-title { font-size: 12pt; font-weight: bold; color: #000; margin-bottom: 2px; }
  .ps-period { font-size: 10pt; color: #000; }

  .emp-name-title { text-align: center; font-size: 11pt; font-weight: bold; color: #000; margin-bottom: 16px; }

  .emp-info-table { width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 9.5pt; }
  .emp-info-table td { padding: 3px 4px; vertical-align: middle; }
  .emp-info-table td.lbl { width: 22%; color: #000; font-weight: 500; }
  .emp-info-table td.val { width: 28%; color: #000; font-weight: 700; }

  .salary-table { width: 100%; border-collapse: collapse; margin-bottom: 25px; font-size: 9.5pt; }
  .salary-table th, .salary-table td { border: 1px solid #000; padding: 5px 8px; vertical-align: middle; }
  .salary-table th { font-weight: bold; color: #000; text-align: left; }
  .salary-table .total-row td { font-weight: bold; }
  .salary-table .net-row td { font-weight: bold; }

  .pension-note { font-size: 8.5pt; font-style: italic; color: #475569; margin-bottom: 15px; }

  .footer-section { text-align: center; font-size: 9pt; color: #000; margin-top: 35px; }

  @media print {
    html, body {
      background: #fff !important;
      margin: 0 !important;
      padding: 0 !important;
      width: 100% !important;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .payslip-page-wrapper {
      page-break-after: always !important;
      page-break-inside: avoid !important;
      margin: 0 !important;
      padding: 0 !important;
      width: 100% !important;
      height: 100% !important;
      min-height: 260mm !important;
    }
    .payslip-page-wrapper:last-child {
      page-break-after: auto !important;
    }
    .page {
      margin: 0 !important;
      padding: 0 !important;
      box-shadow: none !important;
      max-width: 100% !important;
      width: 100% !important;
      height: 100% !important;
      min-height: 260mm !important;
      border-radius: 0 !important;
      position: relative !important;
    }
    .watermark {
      position: absolute !important;
      top: 50% !important;
      left: 50% !important;
      transform: translate(-50%, -50%) !important;
      width: 320px !important;
      opacity: 0.16 !important;
      z-index: 0 !important;
    }
  }
`;

export function generateSinglePayslipHtml(payroll: any, user: any): string {
  const content = generateSinglePayslipCardHtml(payroll, user);
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>Pay Slip - ${months[(payroll.month || 1) - 1]} ${payroll.year} - ${payroll.employeeId || ''}</title>
  <style>
    ${payslipSharedCss}
  </style>
</head>
<body>
  ${content}
</body>
</html>`;
}

export function generateCombinedPayslipsHtml(
  items: Array<{ payroll: any, user?: any }> | any[],
  employeesOrTitle?: any[] | string,
  titleStr?: string
): string {
  let cards: string[] = [];
  let pageTitle = 'Employee Payslips';

  if (Array.isArray(employeesOrTitle)) {
    const payrolls = items as any[];
    const employees = employeesOrTitle;
    pageTitle = titleStr || 'Employee Payslips';
    cards = payrolls.map(p => {
      const u = employees.find(e => e.employeeId === p.employeeId || e.id === p.userId);
      return generateSinglePayslipCardHtml(p, u);
    });
  } else {
    const records = items as Array<{ payroll: any, user?: any }>;
    pageTitle = (typeof employeesOrTitle === 'string' ? employeesOrTitle : titleStr) || 'Employee Payslips';
    cards = records.map(r => {
      if (r && r.payroll) {
        return generateSinglePayslipCardHtml(r.payroll, r.user);
      }
      return generateSinglePayslipCardHtml(r, null);
    });
  }

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>${pageTitle}</title>
  <style>
    ${payslipSharedCss}
  </style>
</head>
<body>
  ${cards.join('\n')}
</body>
</html>`;
}

export function printPayslipHtml(htmlContent: string) {
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
}
