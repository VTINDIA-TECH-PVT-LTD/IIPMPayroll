export function generateForm16PrintHtml(d: any): string {
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

  const isOldRegime = d.standardDeduction === 50000;
  const optedOut = isOldRegime ? 'Yes' : 'No';

  const ay = d.assessmentYear || '2026-2027';
  const ayStartYear = parseInt(ay.split('-')[0]) || 2026;
  const fromDate = d.periodFrom || `01-Apr-${ayStartYear - 1}`;
  const toDate = d.periodTo || `31-Mar-${ayStartYear}`;

  const quarterlyList = (d.quarterlyTdsList && d.quarterlyTdsList.length > 0) ? d.quarterlyTdsList : [
    { quarter: 'Q1', receiptNumber: '', amountPaid: 0, taxDeducted: 0, taxDeposited: 0 },
    { quarter: 'Q2', receiptNumber: '', amountPaid: 0, taxDeducted: 0, taxDeposited: 0 },
    { quarter: 'Q3', receiptNumber: '', amountPaid: 0, taxDeducted: 0, taxDeposited: 0 },
    { quarter: 'Q4', receiptNumber: '', amountPaid: 0, taxDeducted: 0, taxDeposited: 0 },
  ];

  const challanList = (d.challanDetails && d.challanDetails.length > 0) ? d.challanDetails : [
    { amount: 0, bsrCode: '-', dateOfDeposit: '-', challanSerialNumber: '-' },
    { amount: 0, bsrCode: '-', dateOfDeposit: '-', challanSerialNumber: '-' },
    { amount: 0, bsrCode: '-', dateOfDeposit: '-', challanSerialNumber: '-' },
    { amount: 0, bsrCode: '-', dateOfDeposit: '-', challanSerialNumber: '-' },
  ];

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <title>Form 16 - ${d.employeeName || 'TRACES Format'}</title>
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
          font-size: 10px;
          line-height: 1.25;
          color: #000;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        .f16-page {
          width: 100%;
          max-width: 210mm;
          min-height: 280mm;
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
        .f16-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 10px;
          line-height: 1.25;
          margin-bottom: 0;
        }
        .f16-table th, .f16-table td {
          border: 1px solid #000;
          padding: 2.5px 5px;
          vertical-align: middle;
        }
        .text-center { text-align: center; }
        .text-right { text-align: right; }
        .text-left { text-align: left; }
        .bold { font-weight: bold; }
        .bg-gray { background-color: #f8f9fa; }
        
        .header-section {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 6px;
          padding-bottom: 4px;
          border-bottom: 1.5px solid #000;
        }
        .header-tds { text-align: left; font-family: Arial, sans-serif; }
        .header-tds h2 { margin: 0; font-size: 16px; font-weight: 800; color: #166534; line-height: 1; }
        .header-tds p { margin: 2px 0 0; font-size: 8.5px; color: #444; }

        .header-traces { text-align: center; font-family: Arial, sans-serif; }
        .header-traces h1 { margin: 0; font-size: 22px; font-weight: 900; letter-spacing: 1px; color: #0056b3; line-height: 1; }
        .header-traces p { margin: 2px 0 0; font-size: 8.5px; color: #555; }
        
        .header-gov { text-align: right; font-family: Arial, sans-serif; }
        .header-gov h3 { margin: 0; font-size: 11px; font-weight: bold; color: #111; line-height: 1.1; }
        .header-gov p { margin: 2px 0 0; font-size: 9.5px; font-weight: 600; color: #333; }

        .f16-title-bar {
          text-align: center;
          font-size: 12.5px;
          font-weight: bold;
          padding: 3px;
          border: 1px solid #000;
          border-bottom: none;
          background: #fdfdfd;
        }
        .f16-subtitle-bar {
          text-align: center;
          font-size: 10.5px;
          padding: 2px;
          border: 1px solid #000;
          border-bottom: none;
        }
        .f16-cert-text {
          text-align: center;
          font-size: 9px;
          padding: 3px 6px;
          border: 1px solid #000;
          border-bottom: none;
          line-height: 1.2;
        }
      </style>
    </head>
    <body>
      <!-- ========================================= PART A (Page 1) ========================================= -->
      <div class="f16-page">
        <div class="header-section">
          <div class="header-tds">
            <h2>TDS</h2>
            <p>Centralized Processing Cell</p>
          </div>
          <div class="header-traces">
            <h1>TRACES</h1>
            <p>TDS Reconciliation Analysis and Correction Enabling System</p>
          </div>
          <div class="header-gov">
            <h3>Government of India</h3>
            <p>Income Tax Department</p>
          </div>
        </div>

        <div class="f16-title-bar">FORM NO. 16</div>
        <div class="f16-subtitle-bar">[See rule 31(1)(a)]</div>
        <div class="f16-title-bar" style="font-size: 13.5px;">PART A</div>
        <div class="f16-cert-text">
          Certificate under section 203 of the Income-tax Act, 1961 for tax deducted at source on salary paid to an employee under section 192 or pension/interest income of specified senior citizen under section 194P
        </div>

        <table class="f16-table">
          <tbody>
            <tr>
              <td colspan="2" style="width: 50%;"></td>
              <td colspan="2" class="bold text-right" style="width: 50%;">
                Last updated on <span style="margin-left: 10px; font-weight: normal;">${lastUpdatedOn}</span>
              </td>
            </tr>
            <tr class="bg-gray">
              <td colspan="2" class="bold text-center">Name and address of the Employer/Specified Bank</td>
              <td colspan="2" class="bold text-center">Name and address of the Employee/Specified senior citizen</td>
            </tr>
            <tr>
              <td colspan="2" style="height: 62px; vertical-align: top;">
                <span class="bold">${d.employerName || 'INDIAN INSTITUTE OF PETROLEUM & ENERGY'}</span><br />
                ${d.employerAddress || ''}<br />
                ${d.employerEmail ? `<span style="font-size: 9px; color: #444;">${d.employerEmail}</span>` : ''}
              </td>
              <td colspan="2" style="vertical-align: top;">
                <span class="bold">${d.employeeName || ''}</span><br />
                ${d.employeeAddress || 'Visakhapatnam'}
              </td>
            </tr>
            <tr class="bg-gray">
              <td class="bold text-center" style="width: 25%;">PAN of the Deductor</td>
              <td class="bold text-center" style="width: 25%;">TAN of the Deductor</td>
              <td class="bold text-center" style="width: 25%;">PAN of the Employee</td>
              <td class="bold text-center" style="width: 25%;">Employee Reference No.</td>
            </tr>
            <tr>
              <td class="text-center bold">${d.employerPAN || ''}</td>
              <td class="text-center bold">${d.employerTAN || ''}</td>
              <td class="text-center bold">${d.employeePAN || ''}</td>
              <td class="text-center bold">${d.employeeId || ''}</td>
            </tr>
            <tr class="bg-gray">
              <td colspan="2" class="bold text-center">CIT (TDS)</td>
              <td class="bold text-center">Assessment Year</td>
              <td class="bold text-center">Period with the Employer</td>
            </tr>
            <tr>
              <td colspan="2" class="text-center" style="font-size: 9.5px; white-space: pre-line;">
                ${d.citTds || 'The Commissioner of Income Tax (TDS)\nHyderabad - 500004'}
              </td>
              <td class="text-center bold" style="font-size: 11px;">${ay}</td>
              <td style="padding: 0;">
                <table style="width: 100%; border-collapse: collapse; border: none;">
                  <tbody>
                    <tr class="bg-gray">
                      <td class="bold text-center" style="border: none; border-right: 1px solid #000; border-bottom: 1px solid #000; width: 50%; padding: 2px;">From</td>
                      <td class="bold text-center" style="border: none; border-bottom: 1px solid #000; width: 50%; padding: 2px;">To</td>
                    </tr>
                    <tr>
                      <td class="text-center" style="border: none; border-right: 1px solid #000; height: 26px; padding: 2px;">${fromDate}</td>
                      <td class="text-center" style="border: none; padding: 2px;">${toDate}</td>
                    </tr>
                  </tbody>
                </table>
              </td>
            </tr>
          </tbody>
        </table>

        <div style="padding: 4px 6px; border: 1px solid #000; border-top: none; font-size: 10px; font-weight: bold; background: #f8f9fa;">
          Summary of amount paid/credited and tax deducted at source thereon in respect of the employee
        </div>
        <table class="f16-table" style="border-top: none;">
          <thead>
            <tr class="bg-gray">
              <th class="text-center" style="width: 12%;">Quarter(s)</th>
              <th class="text-center" style="width: 30%;">Receipt Numbers of original<br />quarterly statements</th>
              <th class="text-center" style="width: 20%;">Amount paid/credited</th>
              <th class="text-center" style="width: 19%;">Amount of tax deducted<br />(Rs.)</th>
              <th class="text-center" style="width: 19%;">Amount of tax deposited / remitted<br />(Rs.)</th>
            </tr>
          </thead>
          <tbody>
            ${['Q1', 'Q2', 'Q3', 'Q4'].map(q => {
              const qData = quarterlyList.find((x: any) => x.quarter === q);
              return `
                <tr>
                  <td class="text-center bold">${q}</td>
                  <td class="text-center">${qData?.receiptNumber && qData.receiptNumber.trim() !== '' ? qData.receiptNumber : '-'}</td>
                  <td class="text-right">${fmt(qData?.amountPaid)}</td>
                  <td class="text-right">${fmt(qData?.taxDeducted)}</td>
                  <td class="text-right">${fmt(qData?.taxDeposited)}</td>
                </tr>
              `;
            }).join('')}
            <tr class="bold bg-gray">
              <td colspan="2" class="text-center">Total (Rs.)</td>
              <td class="text-right">${fmt(d.grossSalary)}</td>
              <td class="text-right">${fmt(d.totalTdsDeposited)}</td>
              <td class="text-right">${fmt(d.totalTdsDeposited)}</td>
            </tr>
          </tbody>
        </table>

        <div style="padding: 4px 6px; border: 1px solid #000; border-top: none; font-size: 9.5px; font-weight: bold; text-transform: uppercase; background: #f8f9fa;">
          II. DETAILS OF TAX DEDUCTED AND DEPOSITED IN THE CENTRAL GOVERNMENT ACCOUNT THROUGH CHALLAN<br />
          <span style="font-weight: normal; text-transform: none; font-size: 8.5px;">(The deductor to provide payment wise details of tax deducted and deposited with respect to the deductee)</span>
        </div>
        <table class="f16-table" style="border-top: none;">
          <thead>
            <tr class="bg-gray">
              <th rowspan="2" class="text-center" style="width: 6%;">Sl. No.</th>
              <th rowspan="2" class="text-center" style="width: 22%;">Tax Deposited in respect of the<br />deductee (Rs.)</th>
              <th colspan="4" class="text-center">Challan Identification Number (CIN)</th>
            </tr>
            <tr class="bg-gray">
              <th class="text-center" style="width: 20%;">BSR Code of the<br />Bank Branch</th>
              <th class="text-center" style="width: 20%;">Date on which Tax<br />deposited (dd-mm-yyyy)</th>
              <th class="text-center" style="width: 18%;">Challan Serial<br />Number</th>
              <th class="text-center" style="width: 14%;">Status of matching<br />with OLTAS*</th>
            </tr>
          </thead>
          <tbody>
            ${challanList.map((c: any, i: number) => `
              <tr>
                <td class="text-center bold">${i + 1}</td>
                <td class="text-right">${fmt(c.amount)}</td>
                <td class="text-center">${c.bsrCode && c.bsrCode.trim() !== '' ? c.bsrCode : '-'}</td>
                <td class="text-center">${c.dateOfDeposit && c.dateOfDeposit.trim() !== '' ? c.dateOfDeposit : '-'}</td>
                <td class="text-center">${c.challanSerialNumber && c.challanSerialNumber.trim() !== '' ? c.challanSerialNumber : 'F'}</td>
                <td class="text-center">F</td>
              </tr>
            `).join('')}
            <tr class="bold bg-gray">
              <td class="text-center">Total (Rs.)</td>
              <td class="text-right">${fmt(d.totalTdsDeposited)}</td>
              <td colspan="4"></td>
            </tr>
          </tbody>
        </table>

        <div style="margin-top: 8px; display: flex; justify-content: space-between; font-size: 9px; color: #555;">
          <div>* Status F: Matched with OLTAS Records</div>
          <div>Page 1 of 2</div>
        </div>
      </div>

      <!-- ========================================= PART B (Page 2) ========================================= -->
      <div class="f16-page">
        <div class="f16-title-bar" style="border-top: 1px solid #000;">FORM NO. 16</div>
        <div class="f16-title-bar" style="font-size: 13.5px;">PART B</div>
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
              <td colspan="2" class="text-center bold">${optedOut}</td>
            </tr>
            <tr class="bg-gray">
              <td class="text-center bold">1.</td>
              <td class="bold">Gross Salary</td>
              <td class="text-center bold" style="width: 15%;">Rs.</td>
              <td class="text-center bold" style="width: 15%;">Rs.</td>
            </tr>
            <tr>
              <td class="text-center">(a)</td>
              <td>Salary as per provisions contained in section 17(1)</td>
              <td class="text-right">${fmt(d.grossSalary)}</td>
              <td></td>
            </tr>
            <tr>
              <td class="text-center bold">(d)</td>
              <td class="bold">Total</td>
              <td></td>
              <td class="text-right bold">${fmt(d.grossSalary)}</td>
            </tr>
            <tr class="bg-gray">
              <td class="text-center bold">2.</td>
              <td colspan="3" class="bold">Less: Allowances to the extent exempt under section 10</td>
            </tr>
            <tr>
              <td class="text-center">(e)</td>
              <td>House rent allowance under section 10(13A)</td>
              <td></td>
              <td class="text-right">${fmt(d.allowancesExemptUpto10)}</td>
            </tr>
            <tr>
              <td class="text-center bold">3.</td>
              <td class="bold">Total amount of salary received from current employer [1(d)-2(i)]</td>
              <td></td>
              <td class="text-right bold">${fmt(d.balance || ((d.grossSalary || 0) - (d.allowancesExemptUpto10 || 0)))}</td>
            </tr>
            <tr class="bg-gray">
              <td class="text-center bold">4.</td>
              <td colspan="3" class="bold">Less: Deductions under section 16</td>
            </tr>
            <tr>
              <td class="text-center">(a)</td>
              <td>Standard deduction under section 16(ia)</td>
              <td></td>
              <td class="text-right">${fmt(d.standardDeduction)}</td>
            </tr>
            <tr>
              <td class="text-center">(c)</td>
              <td>Tax on employment under section 16(iii)</td>
              <td></td>
              <td class="text-right">${fmt(d.professionalTax)}</td>
            </tr>
            <tr>
              <td class="text-center bold">5.</td>
              <td class="bold">Total amount of deductions under section 16 [4(a)+4(b)+4(c)]</td>
              <td></td>
              <td class="text-right bold">${fmt((d.standardDeduction || 0) + (d.professionalTax || 0))}</td>
            </tr>
            <tr class="bg-gray">
              <td class="text-center bold">6.</td>
              <td class="bold">Income chargeable under the head "Salaries" [(3+1(e)-5]</td>
              <td></td>
              <td class="text-right bold">${fmt(d.incomeChargeableUnderSalaries)}</td>
            </tr>
            <tr class="bg-gray">
              <td class="text-center bold">9.</td>
              <td class="bold">Gross total income (6+8)</td>
              <td></td>
              <td class="text-right bold">${fmt(d.grossTotalIncome || d.incomeChargeableUnderSalaries)}</td>
            </tr>
            <tr class="bg-gray">
              <td class="text-center bold">10.</td>
              <td class="bold">Deductions under Chapter VI-A</td>
              <td class="text-center bold">Gross Amount</td>
              <td class="text-center bold">Deductible Amount</td>
            </tr>
            <tr>
              <td class="text-center">(a)</td>
              <td>Deduction in respect of life insurance premia, contributions to provident fund etc. under section 80C</td>
              <td class="text-right">${fmt(d.deduction80C)}</td>
              <td class="text-right">${fmt(d.deduction80C)}</td>
            </tr>
            <tr>
              <td class="text-center">(f)</td>
              <td>Deduction in respect of contribution by Employer to pension scheme under section 80CCD (2)</td>
              <td class="text-right">${fmt(d.deduction80CCD2 || d.deduction80CCD)}</td>
              <td class="text-right">${fmt(d.deduction80CCD2 || d.deduction80CCD)}</td>
            </tr>
            <tr>
              <td class="text-center">(g)</td>
              <td>Deduction in respect of health insurance premia under section 80D</td>
              <td class="text-right">${fmt(d.deduction80D)}</td>
              <td class="text-right">${fmt(d.deduction80D)}</td>
            </tr>
            <tr class="bg-gray">
              <td class="text-center bold">11.</td>
              <td class="bold">Aggregate of deductible amount under Chapter VI-A</td>
              <td></td>
              <td class="text-right bold">${fmt(d.totalChapterVIADeductions)}</td>
            </tr>
            <tr class="bg-gray">
              <td class="text-center bold">12.</td>
              <td class="bold">Total taxable income (9-11)</td>
              <td></td>
              <td class="bold text-right">${fmt(d.totalTaxableIncome)}</td>
            </tr>
            <tr>
              <td class="text-center">13.</td>
              <td>Tax on total income</td>
              <td></td>
              <td class="text-right">${fmt(d.taxOnTotalIncome)}</td>
            </tr>
            <tr>
              <td class="text-center">14.</td>
              <td>Rebate under section 87A, if applicable</td>
              <td></td>
              <td class="text-right">${fmt(d.rebate87A)}</td>
            </tr>
            <tr>
              <td class="text-center">16.</td>
              <td>Health and education cess</td>
              <td></td>
              <td class="text-right">${fmt(d.healthAndEducationCess)}</td>
            </tr>
            <tr class="bg-gray">
              <td class="text-center bold">17.</td>
              <td class="bold">Tax payable (13+15+16-14)</td>
              <td></td>
              <td class="text-right bold">${fmt(d.totalTaxPayable)}</td>
            </tr>
            <tr>
              <td class="text-center">19.</td>
              <td>Less: Tax deducted at source</td>
              <td></td>
              <td class="text-right">${fmt(d.taxDeductedAtSource)}</td>
            </tr>
            <tr class="bg-gray">
              <td class="text-center bold">21.</td>
              <td class="bold">Net tax payable (17-18-19-20)</td>
              <td></td>
              <td class="bold text-right">${fmt(Math.max(0, d.taxPayableOrRefundable))}</td>
            </tr>
          </tbody>
        </table>

        <!-- Verification & Signature Block -->
        <div style="margin-top: 10px; font-size: 10px;">
          <div class="bold text-center" style="font-size: 11px; border: 1px solid #000; padding: 3px; background: #f8f9fa;">
            Verification
          </div>
          <div style="border: 1px solid #000; border-top: none; padding: 6px 8px;">
            <p style="text-align: justify; line-height: 1.4; margin: 0; font-size: 9.5px;">
              I, <span class="bold">${d.signatoryName && d.signatoryName.trim() !== '' ? d.signatoryName : '....................................................................'}</span>${d.signatoryFatherName && d.signatoryFatherName.trim() !== '' ? `, son/daughter of <span class="bold">${d.signatoryFatherName}</span>` : ''} working in the capacity of <span class="bold">${d.signatoryDesignation && d.signatoryDesignation.trim() !== '' ? d.signatoryDesignation : '....................................................................'}</span> do hereby certify that the information given above is true, complete and correct and is based on the books of account, documents, TDS statements, and other available records.
            </p>
          </div>
          <table style="width: 100%; border-collapse: collapse;">
            <tbody>
              <tr>
                <td style="width: 50%; border: 1px solid #000; border-top: none; padding: 6px 8px; vertical-align: top;">
                  <div style="margin-bottom: 14px;"><span class="bold">Place:</span> <span style="margin-left: 10px;">${d.place || 'Visakhapatnam'}</span></div>
                  <div><span class="bold">Date:</span> <span style="margin-left: 14px;">${issueDate}</span></div>
                </td>
                <td style="width: 50%; border: 1px solid #000; border-top: none; padding: 6px 8px; text-align: right; vertical-align: bottom;">
                  <div style="font-size: 9.5px; margin-bottom: 26px;">(Signature of person responsible for deduction of tax)</div>
                  <div style="border-top: 1px solid #000; padding-top: 4px; text-align: right; min-height: 28px;">
                    ${d.signatoryName && d.signatoryName.trim() !== '' ? `<span class="bold" style="font-size: 10.5px;">${d.signatoryName}</span><br />` : ''}
                    ${d.signatoryDesignation && d.signatoryDesignation.trim() !== '' ? `<div style="font-size: 9px; color: #333;">${d.signatoryDesignation}</div>` : ''}
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div style="margin-top: 8px; display: flex; justify-content: flex-end; font-size: 9px; color: #555;">
          <div>Page 2 of 2</div>
        </div>
      </div>
    </body>
    </html>
  `;
}

export function printForm16Document(data: any) {
  const html = generateForm16PrintHtml(data);
  const win = window.open('', '_blank');
  if (win) {
    win.document.write(html);
    win.document.close();
    setTimeout(() => {
      win.print();
    }, 250);
  }
}
