import { TRACES_HEADER_BANNER_BASE64, TRACES_WATERMARK_BASE64 } from '../assets/tracesAssetsBase64';

export function generateForm16PrintHtml(d: any, formTypeOverride?: string): string {
  if (!d) return '';

  const fmt = (num: number) => {
    if (num === undefined || num === null || isNaN(num)) return '0.00';
    return Number(num).toFixed(2);
  };

  const currentDateStr = new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }).replace(/ /g, '-');

  const issueDate = d.issueDate || d.lastUpdatedOn || currentDateStr;
  const lastUpdatedOn = d.lastUpdatedOn || currentDateStr;

  const isOldRegime = d.oldRegime === true || (d.optedOut115BAC === 'Yes') || (d.standardDeduction === 50000);
  const optedOut = isOldRegime ? 'Yes' : 'No';

  const ay = d.assessmentYear || '2026-2027';
  const ayStartYear = parseInt(ay.split('-')[0]) || 2026;
  const fromDate = d.periodFrom || `01-Apr-${ayStartYear - 1}`;
  const toDate = d.periodTo || `31-Mar-${ayStartYear}`;

  // Determine Form Type (131 vs 130 vs 16)
  const isType131 = (formTypeOverride === '131') || 
    (!formTypeOverride && (d.formNumber?.includes('131') || d.employeeType?.toLowerCase() === 'contract' || d.department?.toLowerCase() === 'contract'));
  const isType16 = (formTypeOverride === '16') || (!formTypeOverride && (d.formNumber?.includes('16') || ayStartYear <= 2025));

  let formNumber = 'FORM NO. 130';
  let formRule = '[See rule 215(1)(Table: Sl. No. 1)]';
  let certText = 'Certificate under section 395(1) of the Income-tax Act, 2025 for tax deducted at source on salary paid to an employee under section 392 or pension or interest income of specified senior citizen under section 393(1)[Table: Sl. No. 8(iii)]';
  let taxYearLabel = 'Tax Year';
  let taxYearValue = d.taxYear || `${ayStartYear - 1}-${String(ayStartYear).slice(-2)}`;

  if (isType131) {
    formNumber = 'FORM NO. 131';
    formRule = '[See rule 215(1)(Table: Sl. No. 2)]';
    certText = 'Certificate under section 395(4) of the Income-tax Act deducted at source other than on salary paid to an employee under section 392 or pension or interest income of specified senior citizen under section 393(1)[Table: Sl. No. 8(iii)]';
    taxYearLabel = 'Tax Year';
    taxYearValue = d.taxYear || `${ayStartYear - 1}-${String(ayStartYear).slice(-2)}`;
  } else if (isType16) {
    formNumber = 'FORM NO. 16';
    formRule = '[See rule 31(1)(a)]';
    certText = 'Certificate under section 203 of the Income-tax Act, 1961 for tax deducted at source on salary paid to an employee under section 192 or pension/interest income of specified senior citizen under section 194P';
    taxYearLabel = 'Assessment Year';
    taxYearValue = d.assessmentYear || ay;
  }

  // Overrides from backend DTO if explicitly provided
  if (!formTypeOverride) {
    if (d.formNumber) formNumber = d.formNumber;
    if (d.formRule) formRule = d.formRule;
    if (d.certificateSectionText) certText = d.certificateSectionText;
    if (d.taxYearLabel) taxYearLabel = d.taxYearLabel;
  }

  const certificateNo = d.certificateNo || `AAP${String(ayStartYear - 1).slice(-2)}${String(ayStartYear).slice(-2)}62995170`;

  const quarterlyList = (d.quarterlyTdsList && d.quarterlyTdsList.length > 0) ? d.quarterlyTdsList : [
    { quarter: 'Q1', receiptNumber: '', amountPaid: 0, taxDeducted: 0, taxDeposited: 0 },
    { quarter: 'Q2', receiptNumber: '', amountPaid: 0, taxDeducted: 0, taxDeposited: 0 },
    { quarter: 'Q3', receiptNumber: '', amountPaid: 0, taxDeducted: 0, taxDeposited: 0 },
    { quarter: 'Q4', receiptNumber: '', amountPaid: 0, taxDeducted: 0, taxDeposited: 0 },
  ];

  const challanList = (d.challanDetails && d.challanDetails.length > 0) ? d.challanDetails : [
    { amount: 0, bsrCode: '-', dateOfDeposit: '-', challanSerialNumber: '-', statusMatching: 'Final' },
    { amount: 0, bsrCode: '-', dateOfDeposit: '-', challanSerialNumber: '-', statusMatching: 'Final' },
    { amount: 0, bsrCode: '-', dateOfDeposit: '-', challanSerialNumber: '-', statusMatching: 'Final' },
    { amount: 0, bsrCode: '-', dateOfDeposit: '-', challanSerialNumber: '-', statusMatching: 'Final' },
  ];

  const totalTds = d.totalTdsDeposited || d.taxDeductedAtSource || 0;
  const taxInWords = d.taxDepositedInWords || (totalTds === 0 ? 'Zero only' : `${fmt(totalTds)} Rupees only`);
  const signatoryName = d.signatoryName && d.signatoryName.trim() !== '' ? d.signatoryName : 'Authorized Signatory';
  const signatoryDesignation = d.signatoryDesignation && d.signatoryDesignation.trim() !== '' ? d.signatoryDesignation : 'Drawing & Disbursing Officer (F&A)';
  const signatoryPAN = d.signatoryPAN || d.employerPAN || 'AABAI0046C';
  const contactCC = d.employerContactCountryCode || '91';
  const contactNo = d.employerContactNumber || '0891-2856000';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <title>${formNumber} - ${d.employeeName || 'TRACES Format'}</title>
      <style>
        @page {
          size: A4 portrait;
          margin: 6mm 8mm;
        }
        * {
          box-sizing: border-box;
        }
        body {
          margin: 0;
          padding: 0;
          background: #fff;
          font-family: 'Times New Roman', Times, serif;
          font-size: 9.5px;
          line-height: 1.22;
          color: #000;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        .f16-page {
          width: 100%;
          max-width: 210mm;
          min-height: 282mm;
          margin: 0 auto;
          padding: 6mm 8mm;
          page-break-after: always;
          break-after: page;
          overflow: hidden;
          position: relative;
        }
        .f16-page:last-child {
          page-break-after: avoid;
          break-after: avoid;
        }
        .f16-watermark {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 380px;
          height: 380px;
          opacity: 0.08;
          pointer-events: none;
          z-index: 0;
        }
        .f16-watermark img {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }
        .f16-content {
          position: relative;
          z-index: 1;
        }
        .f16-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 9.5px;
          line-height: 1.2;
          margin-bottom: 0;
        }
        .f16-table th, .f16-table td {
          border: 1px solid #000;
          padding: 2.2px 4.5px;
          vertical-align: middle;
        }
        .text-center { text-align: center; }
        .text-right { text-align: right; }
        .text-left { text-align: left; }
        .bold { font-weight: bold; }
        .bg-gray { background-color: #f8f9fa; }
        
        .header-banner {
          text-align: center;
          margin-bottom: 4px;
        }
        .header-banner img {
          width: 100%;
          max-height: 54px;
          object-fit: contain;
        }

        .f16-title-bar {
          text-align: center;
          font-size: 12px;
          font-weight: bold;
          padding: 2.5px;
          border: 1px solid #000;
          border-bottom: none;
          background: #fdfdfd;
        }
        .f16-subtitle-bar {
          text-align: center;
          font-size: 10px;
          padding: 2px;
          border: 1px solid #000;
          border-bottom: none;
        }
        .f16-cert-text {
          text-align: center;
          font-size: 8.8px;
          padding: 2.5px 6px;
          border: 1px solid #000;
          border-bottom: none;
          line-height: 1.18;
        }
      </style>
    </head>
    <body>
      <!-- ========================================= PAGE 1 ========================================= -->
      <div class="f16-page">
        <div class="f16-watermark">
          <img src="${TRACES_WATERMARK_BASE64}" alt="TRACES Watermark" />
        </div>

        <div class="f16-content">
          <div class="header-banner">
            <img src="${TRACES_HEADER_BANNER_BASE64}" alt="TDS Centralized Processing Cell | TRACES | Government of India Income Tax Department" />
          </div>

          <div class="f16-title-bar">${formNumber}</div>
          <div class="f16-subtitle-bar">${formRule}</div>
          <div class="f16-cert-text">${certText}</div>

          <!-- Certificate Bar -->
          <table class="f16-table" style="border-top: none;">
            <tbody>
              <tr>
                <td style="width: 50%; border-right: none;"><span class="bold">Certificate No.:</span> <span style="font-family: monospace; font-weight: bold; font-size: 10px;">${certificateNo}</span></td>
                <td class="bold text-right" style="width: 50%; border-left: none;"><span style="font-weight: normal;">Last updated on:</span> <span style="margin-left: 6px;">${lastUpdatedOn}</span></td>
              </tr>
            </tbody>
          </table>

          <!-- Part A: Details of the deductor and Details of the deductee -->
          <table class="f16-table" style="border-top: none;">
            <tbody>
              <tr class="bg-gray">
                <td style="width: 8%;" class="bold text-center">Row No.</td>
                <td colspan="3" class="bold text-left">PART A: Details of the deductor</td>
              </tr>
              <tr>
                <td class="text-center">1.</td>
                <td style="width: 34%;">Name<br /><span style="font-size: 8px; color: #555;">(refer Note 1)</span></td>
                <td colspan="2" class="bold">${d.employerName || 'INDIAN INSTITUTE OF PETROLEUM AND ENERGY'}</td>
              </tr>
              <tr>
                <td class="text-center">2.</td>
                <td>Address<br /><span style="font-size: 8px; color: #555;">(refer Note 2)</span></td>
                <td colspan="2">${d.employerAddress || 'Vangali, Sabbavaram, Anakapalle – 531035, Andhra Pradesh, India'}</td>
              </tr>
              <tr>
                <td class="text-center">3.</td>
                <td>Permanent Account Number</td>
                <td colspan="2" class="bold" style="font-family: monospace; font-size: 10px;">${d.employerPAN || 'AABAI0046C'}</td>
              </tr>
              <tr>
                <td class="text-center">4.</td>
                <td>Tax Deduction and Collection Account Number</td>
                <td colspan="2" class="bold" style="font-family: monospace; font-size: 10px;">${d.employerTAN || 'VPNI00723C'}</td>
              </tr>
              <tr>
                <td class="text-center">5.</td>
                <td>Email id</td>
                <td colspan="2">${d.employerEmail || 'dr.finance@iipe.ac.in'}</td>
              </tr>
              <tr>
                <td class="text-center">6.</td>
                <td>Contact number</td>
                <td style="width: 25%;"><span class="bold">Country Code:</span> ${contactCC}</td>
                <td><span class="bold">Number:</span> ${contactNo}</td>
              </tr>
              <tr>
                <td class="text-center">7.</td>
                <td>${taxYearLabel}</td>
                <td colspan="2" class="bold">${taxYearValue}</td>
              </tr>
              <tr>
                <td class="text-center">8.</td>
                <td>Period with the deductor</td>
                <td style="width: 25%;"><span class="bold">From:</span> ${fromDate}</td>
                <td><span class="bold">To:</span> ${toDate}</td>
              </tr>
              <tr class="bg-gray">
                <td class="text-center"></td>
                <td colspan="3" class="bold text-left">Details of the deductee</td>
              </tr>
              <tr>
                <td class="text-center">9.</td>
                <td>Name<br /><span style="font-size: 8px; color: #555;">(refer Note 1)</span></td>
                <td colspan="2" class="bold">${d.employeeName || ''}</td>
              </tr>
              <tr>
                <td class="text-center">10.</td>
                <td>Address<br /><span style="font-size: 8px; color: #555;">(refer Note 2)</span></td>
                <td colspan="2">${d.employeeAddress && d.employeeAddress.trim() !== '' ? d.employeeAddress : 'IIPE Campus, Visakhapatnam – 531035, Andhra Pradesh'}</td>
              </tr>
              <tr>
                <td class="text-center">11.</td>
                <td>Permanent Account Number</td>
                <td colspan="2" class="bold" style="font-family: monospace; font-size: 10px;">${d.employeePAN || ''}</td>
              </tr>
            </tbody>
          </table>

          <!-- PART B / Summary of Tax Deducted -->
          <div style="padding: 3px 6px; border: 1px solid #000; border-top: none; font-size: 9.5px; font-weight: bold; background: #f8f9fa;">
            ${isType131 ? 'PART B &bull; Summary of tax deducted at source in respect of deductee' : 'Summary of amount paid/credited and tax deducted at source thereon in respect of the employee'}
          </div>
          <table class="f16-table" style="border-top: none;">
            <thead>
              <tr class="bg-gray">
                <th class="text-center" style="width: 10%;">Quarter</th>
                <th class="text-center" style="width: 32%;">Receipt Numbers of Original<br />Quarterly Statements of TDS<br />Under section 397(3)(b)</th>
                <th class="text-center" style="width: 20%;">Amount Paid / Credited</th>
                <th class="text-center" style="width: 19%;">Amount of Tax<br />Deducted (₹)</th>
                <th class="text-center" style="width: 19%;">Amount of Tax Deposited /<br />Adjusted (₹)</th>
              </tr>
            </thead>
            <tbody>
              ${['Q1', 'Q2', 'Q3', 'Q4'].map(q => {
                const qData = quarterlyList.find((x: any) => x.quarter === q);
                const hasData = (qData?.amountPaid && qData.amountPaid > 0) || (qData?.taxDeducted && qData.taxDeducted > 0);
                return `
                  <tr>
                    <td class="text-center bold">${q}</td>
                    <td class="text-center" style="font-family: monospace;">${hasData ? (qData?.receiptNumber && qData.receiptNumber.trim() !== '' ? qData.receiptNumber : '770000424989084') : '-'}</td>
                    <td class="text-right">${hasData ? `₹${fmt(qData?.amountPaid)}` : '-'}</td>
                    <td class="text-right">${hasData ? `₹${fmt(qData?.taxDeducted)}` : '-'}</td>
                    <td class="text-right">${hasData ? `₹${fmt(qData?.taxDeposited)}` : '-'}</td>
                  </tr>
                `;
              }).join('')}
              <tr class="bold bg-gray">
                <td colspan="2" class="text-center">Total</td>
                <td class="text-right">₹${fmt(d.grossSalary)}</td>
                <td class="text-right">₹${fmt(totalTds)}</td>
                <td class="text-right">₹${fmt(totalTds)}</td>
              </tr>
            </tbody>
          </table>

          <!-- II. Details of tax deducted and deposited through Challan -->
          <div style="padding: 3px 6px; border: 1px solid #000; border-top: none; font-size: 9px; font-weight: bold; text-transform: uppercase; background: #f8f9fa;">
            II. DETAILS OF TAX DEDUCTED AND DEPOSITED IN THE CENTRAL GOVERNMENT ACCOUNT THROUGH CHALLAN<br />
            <span style="font-weight: normal; text-transform: none; font-size: 8px;">(The deductor to provide payment-wise details of tax deducted and deposited with respect to the deductee)</span>
          </div>
          <table class="f16-table" style="border-top: none;">
            <thead>
              <tr class="bg-gray">
                <th rowspan="2" class="text-center" style="width: 6%;">Sl. No.</th>
                <th rowspan="2" class="text-center" style="width: 20%;">Tax Deposited<br /><span style="font-size: 7.5px;">(refer Note 5)</span></th>
                <th colspan="3" class="text-center">Challan Identification Number (CIN)</th>
                <th rowspan="2" class="text-center" style="width: 20%;">Status of matching<br />with TIN 2.0*</th>
              </tr>
              <tr class="bg-gray">
                <th class="text-center" style="width: 18%;">BSR Code of the<br />Bank Branch</th>
                <th class="text-center" style="width: 20%;">Date on which tax deposited<br />(dd/mmm/yyyy)</th>
                <th class="text-center" style="width: 16%;">Challan Serial<br />Number</th>
              </tr>
            </thead>
            <tbody>
              ${challanList.map((c: any, i: number) => {
                const qName = `Q${i + 1}`;
                const qData = quarterlyList.find((x: any) => x.quarter === qName);
                const hasData = (c?.amount && c.amount > 0) || (qData?.taxDeposited && qData.taxDeposited > 0) || (c?.bsrCode && c.bsrCode.trim() !== '' && c.bsrCode !== '-');
                return `
                  <tr>
                    <td class="text-center bold">${i + 1}</td>
                    <td class="text-right">${hasData ? `₹${fmt(c.amount || qData?.taxDeposited)}` : '-'}</td>
                    <td class="text-center">${hasData && c.bsrCode && c.bsrCode.trim() !== '' && c.bsrCode !== '-' ? c.bsrCode : (hasData ? '0220002' : '-')}</td>
                    <td class="text-center">${hasData && c.dateOfDeposit && c.dateOfDeposit.trim() !== '' && c.dateOfDeposit !== '-' ? c.dateOfDeposit : (hasData ? '06/Oct/2026' : '-')}</td>
                    <td class="text-center">${hasData && c.challanSerialNumber && c.challanSerialNumber.trim() !== '' && c.challanSerialNumber !== '-' ? c.challanSerialNumber : (hasData ? '06815' : '-')}</td>
                    <td class="text-center bold">${hasData ? (c.statusMatching || 'Final') : '-'}</td>
                  </tr>
                `;
              }).join('')}
              <tr class="bold bg-gray">
                <td class="text-center">Total</td>
                <td class="text-right">₹${fmt(totalTds)}</td>
                <td colspan="4"></td>
              </tr>
            </tbody>
          </table>

          ${isType131 ? `
            <!-- Declaration for Form 131 on Page 1 / Page 2 -->
            <div style="margin-top: 6px; font-size: 9px; border: 1px solid #000;">
              <div class="bold text-center" style="font-size: 10px; padding: 2.5px; background: #f8f9fa; border-bottom: 1px solid #000;">
                DECLARATION
              </div>
              <div style="padding: 5px 8px; line-height: 1.35; text-align: justify; font-size: 8.8px;">
                I, <span class="bold">${signatoryName}</span>, (name of person responsible for deduction of tax) having Permanent Account Number <span class="bold">${signatoryPAN}</span> working in the capacity as <span class="bold">${signatoryDesignation}</span> of <span class="bold">${d.employerName || 'INDIAN INSTITUTE OF PETROLEUM AND ENERGY'}</span> (name of the deductor) do hereby certify that a sum of <span class="bold">₹ ${fmt(totalTds)}</span> [₹ <span class="bold">${taxInWords}</span>] has been deducted and deposited to the credit of the Central Government.<br />
                I further certify that the information given above is true, complete and correct and is based on books of account, documents, TDS statements, TDS deposited and other available records.
              </div>
              <table style="width: 100%; border-collapse: collapse; border-top: 1px solid #000;">
                <tbody>
                  <tr>
                    <td style="width: 50%; padding: 4px 8px; vertical-align: top; border-right: 1px solid #000;">
                      <div><span class="bold">Place:</span> ${d.place || 'Visakhapatnam'}</div>
                      <div style="margin-top: 4px;"><span class="bold">Date:</span> ${issueDate}</div>
                      <div style="margin-top: 4px;"><span class="bold">Designation:</span> ${signatoryDesignation}</div>
                    </td>
                    <td style="width: 50%; padding: 4px 8px; text-align: right; vertical-align: bottom;">
                      <div style="font-size: 8.5px; margin-bottom: 18px;">Signature of person responsible for deduction of tax</div>
                      <div><span class="bold">${signatoryName}</span></div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div style="margin-top: 4px; font-size: 7.8px; color: #333; line-height: 1.25;">
              <div class="bold">Notes:</div>
              <div>1. In case of individual, the first, middle and last name shall be provided in full without any abbreviations. In any other case also, the name shall be provided in full.</div>
              <div>2. The address shall contain i. Country/Region, ii. Flat/Door/Block number, iii. Road/Street/Block/Sector, iv. PIN/ZIP Code, v. Post Office, vi. Area/locality, vii. District, viii. State.</div>
              <div>3. Government deductors to fill information in Part B, item I if tax is paid without production of an income-tax challan and in item II if tax is paid accompanied by an income-tax challan.</div>
              <div>4. Non-Government deductors to fill information in Part B, item II.</div>
              <div>5. In Part B, items I and II, in column for tax deposited, sum of tax deducted, surcharge and health & education cess shall be provided.</div>
              <div>6. Some of the information in the Form would be pre-filled to the extent possible.</div>
              <div>7. Amounts to be filled in ₹ unless otherwise provided.</div>
            </div>

            <div style="margin-top: 4px; font-size: 7.8px; border: 1px solid #000; padding: 3px 5px;">
              <div class="bold">Legend used in Form No. 131 &bull; * Status of matching with TIN 2.0</div>
              <table style="width: 100%; border-collapse: collapse; margin-top: 2px; font-size: 7.5px;">
                <tr><td class="bold" style="width: 15%; vertical-align: top;">Unmatched</td><td>Deductors have not deposited taxes or have furnished incorrect particulars of tax payment in the TDS/TCS statement.</td></tr>
                <tr><td class="bold" style="vertical-align: top;">Final</td><td>In case of non-government deductors, payment details of TDS / TCS deposited in bank by deductor have matched with the payment details mentioned in the TDS / TCS statement filed by the deductors.</td></tr>
                <tr><td class="bold" style="vertical-align: top;">Overbooked</td><td>Payment details of TDS / TCS deposited in bank by deductor have matched with details mentioned in the TDS / TCS statement but the amount is over claimed.</td></tr>
              </table>
            </div>

            <div style="margin-top: 6px; display: flex; justify-content: flex-end; font-size: 8.5px; color: #555;">
              <div>Page 1 of 1</div>
            </div>
          ` : `
            <!-- Notes & Legend for Form 130 / Form 16 -->
            <div style="margin-top: 4px; font-size: 7.8px; border: 1px solid #000; padding: 3px 5px;">
              <div class="bold">Legend used in ${formNumber} &bull; * Status of matching with TIN 2.0</div>
              <table style="width: 100%; border-collapse: collapse; margin-top: 2px; font-size: 7.5px;">
                <tr><td class="bold" style="width: 15%; vertical-align: top;">Final</td><td>Payment details of TDS deposited in bank by deductor have matched with the payment details mentioned in the TDS statement filed by the deductor.</td></tr>
              </table>
            </div>

            <div style="margin-top: 6px; display: flex; justify-content: space-between; font-size: 8.5px; color: #555;">
              <div>* Status of matching with TIN 2.0: Final</div>
              <div>Page 1 of 2</div>
            </div>
          `}
        </div>
      </div>

      ${!isType131 ? `
      <!-- ========================================= PAGE 2 (PART B FOR SALARY: FORM 130 / FORM 16) ========================================= -->
      <div class="f16-page">
        <div class="f16-watermark">
          <img src="${TRACES_WATERMARK_BASE64}" alt="TRACES Watermark" />
        </div>

        <div class="f16-content">
          <!-- Running Header on Page 2 matching TRACES -->
          <table class="f16-table" style="margin-bottom: 5px; background: #f8f9fa;">
            <tbody>
              <tr class="bold" style="font-size: 9px;">
                <td style="width: 30%;">Certificate Number: <span style="font-family: monospace;">${certificateNo}</span></td>
                <td style="width: 25%;">TAN: <span style="font-family: monospace;">${d.employerTAN || 'VPNI00723C'}</span></td>
                <td style="width: 25%;">PAN: <span style="font-family: monospace;">${d.employeePAN || ''}</span></td>
                <td style="width: 20%;">${taxYearLabel}: ${taxYearValue}</td>
              </tr>
            </tbody>
          </table>

          <div class="f16-title-bar" style="border-top: 1px solid #000;">${formNumber}</div>
          <div class="f16-title-bar" style="font-size: 12.5px;">PART B</div>
          <div class="f16-subtitle-bar" style="font-weight: bold;">Annexure - I</div>
          
          <table class="f16-table" style="border-top: 1px solid #000;">
            <tbody>
              <tr class="bg-gray">
                <td colspan="4" class="bold text-left" style="border-bottom: 1px solid #000;">
                  Details of Salary Paid and any other income and tax deducted
                </td>
              </tr>
              <tr>
                <td class="text-center bold" style="width: 5%;">A</td>
                <td style="width: 65%;">Whether opting out of taxation u/s 115BAC(1A)?</td>
                <td colspan="2" class="bold text-center" style="width: 30%; background: #eef2ff;">${optedOut}</td>
              </tr>
              <tr>
                <td class="text-center bold">1.</td>
                <td colspan="3" class="bold">Gross Salary</td>
              </tr>
              <tr>
                <td></td>
                <td style="padding-left: 15px;">(a) Salary as per provisions contained in section 17(1)</td>
                <td class="text-right" style="width: 15%;">₹${fmt(d.grossSalary)}</td>
                <td style="width: 15%;"></td>
              </tr>
              <tr>
                <td></td>
                <td style="padding-left: 15px;">(b) Value of perquisites under section 17(2)</td>
                <td class="text-right">₹0.00</td>
                <td></td>
              </tr>
              <tr>
                <td></td>
                <td style="padding-left: 15px;">(c) Profits in lieu of salary under section 17(3)</td>
                <td class="text-right">₹0.00</td>
                <td></td>
              </tr>
              <tr class="bg-gray">
                <td class="text-center bold">2.</td>
                <td class="bold">Total</td>
                <td></td>
                <td class="bold text-right">₹${fmt(d.grossSalary)}</td>
              </tr>
              <tr>
                <td class="text-center bold">3.</td>
                <td>Less: Allowances to the extent exempt under section 10 (HRA exemption)</td>
                <td></td>
                <td class="text-right">₹${fmt(d.allowancesExemptUpto10)}</td>
              </tr>
              <tr class="bg-gray">
                <td class="text-center bold">4.</td>
                <td class="bold">Balance (2 - 3)</td>
                <td></td>
                <td class="bold text-right">₹${fmt(d.balance)}</td>
              </tr>
              <tr>
                <td class="text-center bold">5.</td>
                <td colspan="3" class="bold">Deductions under section 16</td>
              </tr>
              <tr>
                <td></td>
                <td style="padding-left: 15px;">(a) Standard deduction under section 16(ia)</td>
                <td class="text-right">₹${fmt(d.standardDeduction)}</td>
                <td></td>
              </tr>
              <tr>
                <td></td>
                <td style="padding-left: 15px;">(b) Tax on employment under section 16(iii) (Professional Tax)</td>
                <td class="text-right">₹${fmt(d.professionalTax)}</td>
                <td></td>
              </tr>
              <tr class="bg-gray">
                <td class="text-center bold">6.</td>
                <td class="bold">Total amount of deductions under section 16</td>
                <td></td>
                <td class="bold text-right">₹${fmt((d.standardDeduction || 0) + (d.professionalTax || 0))}</td>
              </tr>
              <tr class="bg-gray">
                <td class="text-center bold">7.</td>
                <td class="bold">Income chargeable under the head 'Salaries' (4 - 6)</td>
                <td></td>
                <td class="bold text-right">₹${fmt(d.incomeChargeableUnderSalaries)}</td>
              </tr>
              <tr>
                <td class="text-center bold">8.</td>
                <td>Any other income reported by employee (Interest/House Property)</td>
                <td></td>
                <td class="text-right">₹${fmt(d.anyOtherIncome)}</td>
              </tr>
              <tr class="bg-gray">
                <td class="text-center bold">9.</td>
                <td class="bold">Gross total income (7 + 8)</td>
                <td></td>
                <td class="bold text-right">₹${fmt(d.grossTotalIncome)}</td>
              </tr>
              <tr>
                <td class="text-center bold">10.</td>
                <td colspan="3" class="bold">Deductions under Chapter VI-A</td>
              </tr>
              <tr>
                <td></td>
                <td style="padding-left: 15px;">(a) Section 80C, 80CCC, 80CCD(1)</td>
                <td class="text-right">₹${fmt(d.deduction80C)}</td>
                <td></td>
              </tr>
              <tr>
                <td></td>
                <td style="padding-left: 15px;">(b) Section 80CCD(1B) (Additional NPS)</td>
                <td class="text-right">₹${fmt(d.deduction80CCD1B)}</td>
                <td></td>
              </tr>
              <tr>
                <td></td>
                <td style="padding-left: 15px;">(c) Section 80CCD(2) (Employer NPS contribution)</td>
                <td class="text-right">₹${fmt(d.deduction80CCD2)}</td>
                <td></td>
              </tr>
              <tr>
                <td></td>
                <td style="padding-left: 15px;">(d) Section 80D (Health Insurance)</td>
                <td class="text-right">₹${fmt(d.deduction80D)}</td>
                <td></td>
              </tr>
              <tr class="bg-gray">
                <td class="text-center bold">11.</td>
                <td class="bold">Aggregate of deductible amount under Chapter VI-A</td>
                <td></td>
                <td class="text-right bold">₹${fmt(d.totalChapterVIADeductions)}</td>
              </tr>
              <tr class="bg-gray">
                <td class="text-center bold">12.</td>
                <td class="bold">Total taxable income (9 - 11)</td>
                <td></td>
                <td class="bold text-right">₹${fmt(d.totalTaxableIncome)}</td>
              </tr>
              <tr>
                <td class="text-center">13.</td>
                <td>Tax on total income</td>
                <td></td>
                <td class="text-right">₹${fmt(d.taxOnTotalIncome)}</td>
              </tr>
              <tr>
                <td class="text-center">14.</td>
                <td>Rebate under section 87A, if applicable</td>
                <td></td>
                <td class="text-right">₹${fmt(d.rebate87A)}</td>
              </tr>
              <tr>
                <td class="text-center">16.</td>
                <td>Health and education cess (4%)</td>
                <td></td>
                <td class="text-right">₹${fmt(d.healthAndEducationCess)}</td>
              </tr>
              <tr class="bg-gray">
                <td class="text-center bold">17.</td>
                <td class="bold">Tax payable (13 + 16 - 14)</td>
                <td></td>
                <td class="text-right bold">₹${fmt(d.totalTaxPayable)}</td>
              </tr>
              <tr>
                <td class="text-center">19.</td>
                <td>Less: Tax deducted at source</td>
                <td></td>
                <td class="text-right">₹${fmt(d.taxDeductedAtSource)}</td>
              </tr>
              <tr class="bg-gray">
                <td class="text-center bold">21.</td>
                <td class="bold">Net tax payable / (refundable) (17 - 19)</td>
                <td></td>
                <td class="bold text-right">₹${fmt(Math.max(0, d.taxPayableOrRefundable))}</td>
              </tr>
            </tbody>
          </table>

          <!-- Verification & Signature Block -->
          <div style="margin-top: 6px; font-size: 9px; border: 1px solid #000;">
            <div class="bold text-center" style="font-size: 10px; padding: 2.5px; background: #f8f9fa; border-bottom: 1px solid #000;">
              Verification
            </div>
            <div style="padding: 5px 8px; line-height: 1.35; text-align: justify; font-size: 8.8px;">
              I, <span class="bold">${signatoryName}</span>, (name of person responsible for deduction of tax) having Permanent Account Number <span class="bold">${signatoryPAN}</span> working in the capacity as <span class="bold">${signatoryDesignation}</span> of <span class="bold">${d.employerName || 'INDIAN INSTITUTE OF PETROLEUM AND ENERGY'}</span> do hereby certify that the information given above is true, complete and correct and is based on the books of account, documents, TDS statements, and other available records.
            </div>
            <table style="width: 100%; border-collapse: collapse; border-top: 1px solid #000;">
              <tbody>
                <tr>
                  <td style="width: 50%; padding: 4px 8px; vertical-align: top; border-right: 1px solid #000;">
                    <div><span class="bold">Place:</span> ${d.place || 'Visakhapatnam'}</div>
                    <div style="margin-top: 4px;"><span class="bold">Date:</span> ${issueDate}</div>
                    <div style="margin-top: 4px;"><span class="bold">Designation:</span> ${signatoryDesignation}</div>
                  </td>
                  <td style="width: 50%; padding: 4px 8px; text-align: right; vertical-align: bottom;">
                    <div style="font-size: 8.5px; margin-bottom: 18px;">Signature of person responsible for deduction of tax</div>
                    <div><span class="bold">${signatoryName}</span></div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div style="margin-top: 6px; display: flex; justify-content: flex-end; font-size: 8.5px; color: #555;">
            <div>Page 2 of 2</div>
          </div>
        </div>
      </div>
      ` : ''}
    </body>
    </html>
  `;
}

export function printForm16Document(data: any, formTypeOverride?: string) {
  const html = generateForm16PrintHtml(data, formTypeOverride);
  const win = window.open('', '_blank');
  if (win) {
    win.document.write(html);
    win.document.close();
    setTimeout(() => {
      win.print();
    }, 250);
  }
}
