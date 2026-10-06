import { IIPE_LOGO_BASE64 } from '../assets/logoBase64';
import { formatEmployeeNameWithTitle } from './nameUtils';

const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];

const numberToWords = (num: number): string => {
  if (!num || num === 0) return 'Rupees Zero Only';
  const a = [
    '', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ',
    'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '
  ];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const inWords = (n: number): string => {
    let str = '';
    if (n > 19) {
      str += b[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + a[n % 10] : ' ');
    } else {
      str += a[n];
    }
    return str;
  };

  let n = Math.floor(Math.abs(num));
  let output = '';

  const crore = Math.floor(n / 10000000);
  n %= 10000000;
  const lakh = Math.floor(n / 100000);
  n %= 100000;
  const thousand = Math.floor(n / 1000);
  n %= 1000;
  const hundred = Math.floor(n / 100);
  n %= 100;

  if (crore > 0) output += (crore > 99 ? inWords(crore) : inWords(crore)) + 'Crore ';
  if (lakh > 0) output += inWords(lakh) + 'Lakh ';
  if (thousand > 0) output += inWords(thousand) + 'Thousand ';
  if (hundred > 0) output += inWords(hundred) + 'Hundred ';
  if (n > 0) {
    if (output !== '') output += 'and ';
    output += inWords(n);
  }

  return `Rupees ${output.trim()} Only`;
};

const formatPayDate = (year: number, month: number): string => {
  const lastDay = new Date(year, month, 0).getDate();
  const dateObj = new Date(year, month - 1, lastDay);
  return dateObj.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-');
};

export function generateSinglePayslipCardHtml(p: any, u: any): string {
  const user = u || {};
  const name = formatEmployeeNameWithTitle(p, user) || 'Employee';
  const monthLabel = months[(p.month || 1) - 1];
  const payDateStr = formatPayDate(p.year || new Date().getFullYear(), p.month || 1);
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

  return `
  <div class="payslip-page-wrapper">
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
          <div class="detail-row"><div class="lbl">PAN Number</div><div class="sep">:</div><div class="val">${user?.pan||'-'}</div></div>
          
          <!-- Col 2 -->
          <div class="detail-row"><div class="lbl">Designation</div><div class="sep">:</div><div class="val">${user?.designation||p.designation||'-'}</div></div>
          <div class="detail-row"><div class="lbl">Date of Next Increment</div><div class="sep">:</div><div class="val">${dni}</div></div>
          <div class="detail-row"><div class="lbl">PRAN / EPF Number</div><div class="sep">:</div><div class="val">${user?.pranAccountNumber || user?.pfAccountNumber || '-'}</div></div>
          
          <!-- Col 3 -->
          <div class="detail-row"><div class="lbl">Department</div><div class="sep">:</div><div class="val">${department}</div></div>
          <div class="detail-row"><div class="lbl">Pay Level</div><div class="sep">:</div><div class="val">${displayLevel}</div></div>
          <div class="detail-row"><div class="lbl">Bank Name</div><div class="sep">:</div><div class="val">${user?.bankName||'State Bank of India'}</div></div>
          
          <!-- Col 4 -->
          <div class="detail-row"><div class="lbl">Category</div><div class="sep">:</div><div class="val"><span class="cat-badge">${empCategory}</span></div></div>
          <div class="detail-row"><div class="lbl">Pay Drawn (No. of Days)</div><div class="sep">:</div><div class="val">${paidDays} Days</div></div>
          <div class="detail-row"><div class="lbl">Bank Account No.</div><div class="sep">:</div><div class="val">${user?.bankAccountNumber?`(****${String(user.bankAccountNumber).slice(-4)})`:'-'}</div></div>
          
          <!-- Col 5 -->
          <div class="detail-row"><div class="lbl">Tax Regime</div><div class="sep">:</div><div class="val">${taxRegime}</div></div>
          <div class="detail-row"><div class="lbl">Income Tax Status</div><div class="sep">:</div><div class="val">${p.tds > 0 ? 'Taxable' : 'Non-Taxable'}</div></div>
          <div class="detail-row"><div class="lbl">IFSC Code</div><div class="sep">:</div><div class="val">${user?.ifscCode||'SBIN0003170'}</div></div>
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
  </div>
  `;
}

const payslipSharedCss = `
  @page { size: A4 portrait; margin: 6mm 10mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Inter', sans-serif; }
  body { font-size: 10px; color: #1e293b; background:#f4f6f8; position:relative; }
  
  .payslip-page-wrapper {
    page-break-after: always;
    page-break-inside: avoid;
    margin-bottom: 24px;
  }
  
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
    html, body { background: #fff !important; margin: 0 !important; padding: 0 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .payslip-page-wrapper { page-break-after: always !important; page-break-inside: avoid !important; margin: 0 !important; padding: 0 !important; }
    .payslip-page-wrapper:last-child { page-break-after: auto !important; }
    .page { margin: 0 auto !important; padding: 8px 14px !important; box-shadow: none !important; max-width: 100% !important; min-height: auto !important; border-radius: 0 !important; }
  }
`;

export function generateSinglePayslipHtml(payroll: any, user: any): string {
  const content = generateSinglePayslipCardHtml(payroll, user);
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>Pay Slip - ${months[(payroll.month || 1) - 1]} ${payroll.year} - ${payroll.employeeId || ''}</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
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
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
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
