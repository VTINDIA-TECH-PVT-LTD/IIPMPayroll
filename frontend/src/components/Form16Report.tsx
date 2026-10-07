import React from 'react';

const Form16Report: React.FC<{ form16Data: any }> = ({ form16Data }) => {
  if (!form16Data) return null;

  const d = form16Data;
  const isOldRegime = d.oldRegime === true || (d.optedOut115BAC === 'Yes') || (d.standardDeduction === 50000);
  const optedOut = isOldRegime ? 'Yes' : 'No';

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

  const ay = d.assessmentYear || '2026-2027';
  const ayStartYear = parseInt(ay.split('-')[0]) || 2026;
  const fromDate = d.periodFrom || `01-Apr-${ayStartYear - 1}`;
  const toDate = d.periodTo || `31-Mar-${ayStartYear}`;

  const formNumber = d.formNumber || (ayStartYear >= 2026 ? 'FORM NO. 130' : 'FORM NO. 16');
  const formRule = d.formRule || '[See rule 31(1)(a)]';
  const certText = d.certificateSectionText || (ayStartYear >= 2026
    ? 'Certificate under section 203 of the Income-tax Act, 2025 for tax deducted at source on salary paid to an employee under section 192 or pension/interest income of specified senior citizen under section 194P'
    : 'Certificate under section 203 of the Income-tax Act, 1961 for tax deducted at source on salary paid to an employee under section 192 or pension/interest income of specified senior citizen under section 194P');
  const taxYearLabel = d.taxYearLabel || (ayStartYear >= 2026 ? 'Tax Year' : 'Assessment Year');
  const taxYearValue = d.taxYear || d.assessmentYear || (ayStartYear >= 2026 ? `${ayStartYear - 1}-${ayStartYear}` : ay);

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

  return (
    <>
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 6mm 8mm;
          }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: #fff !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .f16-page {
            box-shadow: none !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            min-height: auto !important;
            max-height: 285mm !important;
            page-break-after: always !important;
            break-after: page !important;
            overflow: hidden !important;
          }
          .f16-page:last-child {
            page-break-after: avoid !important;
            break-after: avoid !important;
          }
          .no-print {
            display: none !important;
          }
        }

        .f16-page {
          background: #fff;
          width: 210mm;
          min-height: 297mm;
          margin: 0 auto 30px auto;
          box-shadow: 0 0 10px rgba(0,0,0,0.2);
          padding: 8mm 10mm;
          font-family: 'Times New Roman', Times, serif;
          color: #000;
          box-sizing: border-box;
          position: relative;
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
          text-align: center;
          margin-bottom: 6px;
          padding-bottom: 4px;
          border-bottom: 1.5px solid #000;
        }

        .header-traces { text-align: center; font-family: Arial, sans-serif; }
        .header-traces h1 { margin: 0; font-size: 22px; font-weight: 900; letter-spacing: 1px; color: #0056b3; line-height: 1; }
        .header-traces p { margin: 2px 0 0; font-size: 8.5px; color: #555; }

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
      `}</style>

      {/* ========================================= PART A (Page 1) ========================================= */}
      <div className="f16-page">
        <div className="header-section">
          <div className="header-traces">
            <h1>TRACES</h1>
            <p>TDS Reconciliation Analysis and Correction Enabling System</p>
          </div>
        </div>

        <div className="f16-title-bar">{formNumber}</div>
        <div className="f16-subtitle-bar">{formRule}</div>
        <div className="f16-title-bar" style={{ fontSize: '13.5px' }}>PART A</div>
        <div className="f16-cert-text">
          {certText}
        </div>

        <table className="f16-table">
          <tbody>
            <tr>
              <td colSpan={2} style={{ width: '50%' }}></td>
              <td colSpan={2} className="bold text-right" style={{ width: '50%' }}>
                Last updated on <span style={{ marginLeft: '10px', fontWeight: 'normal' }}>{lastUpdatedOn}</span>
              </td>
            </tr>
            <tr className="bg-gray">
              <td colSpan={2} className="bold text-center">Name and address of the Employer/Specified Bank</td>
              <td colSpan={2} className="bold text-center">Name and address of the Employee/Specified senior citizen</td>
            </tr>
            <tr>
              <td colSpan={2} style={{ height: '58px', verticalAlign: 'top' }}>
                <span className="bold">{d.employerName || 'INDIAN INSTITUTE OF PETROLEUM AND ENERGY'}</span><br />
                {d.employerAddress || 'Vangali, Sabbavaram, Anakapalle – 531035, Andhra Pradesh, India'}<br />
                {d.employerEmail && <span style={{ fontSize: '9px', color: '#444' }}>{d.employerEmail}</span>}
              </td>
              <td colSpan={2} style={{ verticalAlign: 'top', height: '58px' }}>
                <span className="bold">{d.employeeName || ''}</span>
              </td>
            </tr>
            <tr className="bg-gray">
              <td className="bold text-center" style={{ width: '25%' }}>PAN of the Deductor</td>
              <td className="bold text-center" style={{ width: '25%' }}>TAN of the Deductor</td>
              <td className="bold text-center" style={{ width: '25%' }}>PAN of the Employee</td>
              <td className="bold text-center" style={{ width: '25%' }}>Employee Reference No.</td>
            </tr>
            <tr>
              <td className="text-center bold">{d.employerPAN || 'AABAI0046C'}</td>
              <td className="text-center bold">{d.employerTAN || 'VPNI00723C'}</td>
              <td className="text-center bold">{d.employeePAN || ''}</td>
              <td className="text-center bold">{d.employeeId || ''}</td>
            </tr>
            <tr className="bg-gray">
              <td colSpan={2} className="bold text-center">CIT (TDS)</td>
              <td className="bold text-center">{taxYearLabel}</td>
              <td className="bold text-center">Period with the Employer</td>
            </tr>
            <tr>
              <td colSpan={2} className="text-center" style={{ fontSize: '9.5px', whiteSpace: 'pre-line' }}>
                {d.citTds || 'The Commissioner of Income Tax (TDS)\nHyderabad - 500004'}
              </td>
              <td className="text-center bold" style={{ fontSize: '11px' }}>{taxYearValue}</td>
              <td style={{ padding: 0 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', border: 'none' }}>
                  <tbody>
                    <tr className="bg-gray">
                      <td className="bold text-center" style={{ border: 'none', borderRight: '1px solid #000', borderBottom: '1px solid #000', width: '50%', padding: '2px' }}>From</td>
                      <td className="bold text-center" style={{ border: 'none', borderBottom: '1px solid #000', width: '50%', padding: '2px' }}>To</td>
                    </tr>
                    <tr>
                      <td className="text-center" style={{ border: 'none', borderRight: '1px solid #000', height: '26px', padding: '2px' }}>{fromDate}</td>
                      <td className="text-center" style={{ border: 'none', padding: '2px' }}>{toDate}</td>
                    </tr>
                  </tbody>
                </table>
              </td>
            </tr>
          </tbody>
        </table>

        <div style={{ padding: '4px 6px', border: '1px solid #000', borderTop: 'none', fontSize: '10px', fontWeight: 'bold', background: '#f8f9fa' }}>
          Summary of amount paid/credited and tax deducted at source thereon in respect of the employee
        </div>
        <table className="f16-table" style={{ borderTop: 'none' }}>
          <thead>
            <tr className="bg-gray">
              <th className="text-center" style={{ width: '12%' }}>Quarter(s)</th>
              <th className="text-center" style={{ width: '30%' }}>Receipt Numbers of original<br />quarterly statements</th>
              <th className="text-center" style={{ width: '20%' }}>Amount paid/credited</th>
              <th className="text-center" style={{ width: '19%' }}>Amount of tax deducted<br />(Rs.)</th>
              <th className="text-center" style={{ width: '19%' }}>Amount of tax deposited / remitted<br />(Rs.)</th>
            </tr>
          </thead>
          <tbody>
            {['Q1', 'Q2', 'Q3', 'Q4'].map(q => {
              const qData = quarterlyList.find((x: any) => x.quarter === q);
              const hasData = (qData?.amountPaid && qData.amountPaid > 0) || (qData?.taxDeducted && qData.taxDeducted > 0);
              return (
                <tr key={q}>
                  <td className="text-center bold">{q}</td>
                  <td className="text-center">{hasData ? (qData?.receiptNumber && qData.receiptNumber.trim() !== '' ? qData.receiptNumber : '-') : '-'}</td>
                  <td className="text-right">{hasData ? fmt(qData?.amountPaid) : '-'}</td>
                  <td className="text-right">{hasData ? fmt(qData?.taxDeducted) : '-'}</td>
                  <td className="text-right">{hasData ? fmt(qData?.taxDeposited) : '-'}</td>
                </tr>
              );
            })}
            <tr className="bold bg-gray">
              <td colSpan={2} className="text-center">Total (Rs.)</td>
              <td className="text-right">{fmt(d.grossSalary)}</td>
              <td className="text-right">{fmt(d.totalTdsDeposited)}</td>
              <td className="text-right">{fmt(d.totalTdsDeposited)}</td>
            </tr>
          </tbody>
        </table>

        <div style={{ padding: '4px 6px', border: '1px solid #000', borderTop: 'none', fontSize: '9.5px', fontWeight: 'bold', textTransform: 'uppercase', background: '#f8f9fa' }}>
          II. DETAILS OF TAX DEDUCTED AND DEPOSITED IN THE CENTRAL GOVERNMENT ACCOUNT THROUGH CHALLAN<br />
          <span style={{ fontWeight: 'normal', textTransform: 'none', fontSize: '8.5px' }}>(The deductor to provide payment wise details of tax deducted and deposited with respect to the deductee)</span>
        </div>
        <table className="f16-table" style={{ borderTop: 'none' }}>
          <thead>
            <tr className="bg-gray">
              <th rowSpan={2} className="text-center" style={{ width: '6%' }}>Sl. No.</th>
              <th rowSpan={2} className="text-center" style={{ width: '22%' }}>Tax Deposited in respect of the<br />deductee (Rs.)</th>
              <th colSpan={4} className="text-center">Challan Identification Number (CIN)</th>
            </tr>
            <tr className="bg-gray">
              <th className="text-center" style={{ width: '20%' }}>BSR Code of the<br />Bank Branch</th>
              <th className="text-center" style={{ width: '20%' }}>Date on which Tax<br />deposited (dd-mm-yyyy)</th>
              <th className="text-center" style={{ width: '18%' }}>Challan Serial<br />Number</th>
              <th className="text-center" style={{ width: '14%' }}>Status of matching<br />with OLTAS*</th>
            </tr>
          </thead>
          <tbody>
            {challanList.map((c: any, i: number) => {
              const qName = `Q${i + 1}`;
              const qData = quarterlyList.find((x: any) => x.quarter === qName);
              const hasData = (c?.amount && c.amount > 0) || (qData?.taxDeposited && qData.taxDeposited > 0) || (c?.bsrCode && c.bsrCode.trim() !== '' && c.bsrCode !== '-');
              return (
                <tr key={i}>
                  <td className="text-center bold">{i + 1}</td>
                  <td className="text-right">{hasData ? fmt(c.amount || qData?.taxDeposited) : '-'}</td>
                  <td className="text-center">{hasData && c.bsrCode && c.bsrCode.trim() !== '' ? c.bsrCode : '-'}</td>
                  <td className="text-center">{hasData && c.dateOfDeposit && c.dateOfDeposit.trim() !== '' ? c.dateOfDeposit : '-'}</td>
                  <td className="text-center">{hasData && c.challanSerialNumber && c.challanSerialNumber.trim() !== '' ? c.challanSerialNumber : (hasData ? 'F' : '-')}</td>
                  <td className="text-center">{hasData ? 'F' : '-'}</td>
                </tr>
              );
            })}
            <tr className="bold bg-gray">
              <td className="text-center">Total (Rs.)</td>
              <td className="text-right">{fmt(d.totalTdsDeposited)}</td>
              <td colSpan={4}></td>
            </tr>
          </tbody>
        </table>

        <div style={{ marginTop: '8px', display: 'flex', justifyContent: 'space-between', fontSize: '9px', color: '#555' }}>
          <div>* Status F: Matched with OLTAS Records</div>
          <div>Page 1 of 2</div>
        </div>
      </div>

      {/* ========================================= PART B (Page 2) ========================================= */}
      <div className="f16-page">
        <div className="f16-title-bar" style={{ borderTop: '1px solid #000' }}>{formNumber}</div>
        <div className="f16-title-bar" style={{ fontSize: '13.5px' }}>PART B</div>
        <div className="f16-subtitle-bar" style={{ fontWeight: 'bold' }}>Annexure - I</div>
        
        <table className="f16-table" style={{ borderTop: '1px solid #000' }}>
          <tbody>
            <tr className="bg-gray">
              <td colSpan={4} className="bold text-left" style={{ borderBottom: '1px solid #000' }}>
                Details of Salary Paid and any other income and tax deducted
              </td>
            </tr>
            <tr>
              <td className="text-center bold" style={{ width: '5%' }}>A</td>
              <td style={{ width: '65%' }}>Whether opting out of taxation u/s 115BAC(1A)?</td>
              <td colSpan={2} className="text-center bold">{optedOut}</td>
            </tr>
            <tr className="bg-gray">
              <td className="text-center bold">1.</td>
              <td className="bold">Gross Salary</td>
              <td className="text-center bold" style={{ width: '15%' }}>Rs.</td>
              <td className="text-center bold" style={{ width: '15%' }}>Rs.</td>
            </tr>
            <tr>
              <td className="text-center">(a)</td>
              <td>Salary as per provisions contained in section 17(1)</td>
              <td className="text-right">{fmt(d.grossSalary)}</td>
              <td></td>
            </tr>
            <tr>
              <td className="text-center bold">(d)</td>
              <td className="bold">Total</td>
              <td></td>
              <td className="text-right bold">{fmt(d.grossSalary)}</td>
            </tr>
            <tr className="bg-gray">
              <td className="text-center bold">2.</td>
              <td colSpan={3} className="bold">Less: Allowances to the extent exempt under section 10</td>
            </tr>
            {isOldRegime ? (
              <tr>
                <td className="text-center">(e)</td>
                <td>House rent allowance under section 10(13A)</td>
                <td></td>
                <td className="text-right">{fmt(d.allowancesExemptUpto10)}</td>
              </tr>
            ) : (
              <tr>
                <td className="text-center">(e)</td>
                <td style={{ color: '#666' }}>House rent allowance under section 10(13A)</td>
                <td></td>
                <td className="text-right" style={{ color: '#666' }}>0.00</td>
              </tr>
            )}
            <tr>
              <td className="text-center bold">3.</td>
              <td className="bold">Total amount of salary received from current employer [1(d)-2]</td>
              <td></td>
              <td className="text-right bold">{fmt(d.balance || ((d.grossSalary || 0) - (isOldRegime ? (d.allowancesExemptUpto10 || 0) : 0)))}</td>
            </tr>
            <tr className="bg-gray">
              <td className="text-center bold">4.</td>
              <td colSpan={3} className="bold">Less: Deductions under section 16</td>
            </tr>
            <tr>
              <td className="text-center">(a)</td>
              <td>Standard deduction under section 16(ia)</td>
              <td></td>
              <td className="text-right">{fmt(d.standardDeduction)}</td>
            </tr>
            <tr>
              <td className="text-center">(c)</td>
              <td>Tax on employment under section 16(iii)</td>
              <td></td>
              <td className="text-right">{fmt(d.professionalTax)}</td>
            </tr>
            <tr>
              <td className="text-center bold">5.</td>
              <td className="bold">Total amount of deductions under section 16 [4(a)+4(b)+4(c)]</td>
              <td></td>
              <td className="text-right bold">{fmt((d.standardDeduction || 0) + (d.professionalTax || 0))}</td>
            </tr>
            <tr className="bg-gray">
              <td className="text-center bold">6.</td>
              <td className="bold">Income chargeable under the head "Salaries" [(3+1(e)-5]</td>
              <td></td>
              <td className="text-right bold">{fmt(d.incomeChargeableUnderSalaries)}</td>
            </tr>
            <tr className="bg-gray">
              <td className="text-center bold">9.</td>
              <td className="bold">Gross total income (6+8)</td>
              <td></td>
              <td className="text-right bold">{fmt(d.grossTotalIncome || d.incomeChargeableUnderSalaries)}</td>
            </tr>
            <tr className="bg-gray">
              <td className="text-center bold">10.</td>
              <td className="bold">Deductions under Chapter VI-A</td>
              <td className="text-center bold">Gross Amount</td>
              <td className="text-center bold">Deductible Amount</td>
            </tr>
            {isOldRegime ? (
              <>
                <tr>
                  <td className="text-center">(a)</td>
                  <td>Deduction in respect of life insurance premia, contributions to provident fund etc. under section 80C</td>
                  <td className="text-right">{fmt(d.deduction80C)}</td>
                  <td className="text-right">{fmt(d.deduction80C)}</td>
                </tr>
                <tr>
                  <td className="text-center">(e)</td>
                  <td>Deduction in respect of interest on housing loan under section 24(b) / 80EEA (Home Loan)</td>
                  <td className="text-right">{fmt(d.homeLoanInterest)}</td>
                  <td className="text-right">{fmt(d.homeLoanInterest)}</td>
                </tr>
                <tr>
                  <td className="text-center">(f)</td>
                  <td>Deduction in respect of contribution by Employer to pension scheme under section 80CCD (2)</td>
                  <td className="text-right">{fmt(d.deduction80CCD2 || d.deduction80CCD)}</td>
                  <td className="text-right">{fmt(d.deduction80CCD2 || d.deduction80CCD)}</td>
                </tr>
                <tr>
                  <td className="text-center">(g)</td>
                  <td>Deduction in respect of health insurance premia under section 80D</td>
                  <td className="text-right">{fmt(d.deduction80D)}</td>
                  <td className="text-right">{fmt(d.deduction80D)}</td>
                </tr>
              </>
            ) : (
              <tr>
                <td className="text-center">(f)</td>
                <td>Deduction in respect of contribution by Employer to pension scheme under section 80CCD (2)</td>
                <td className="text-right">{fmt(d.deduction80CCD2 || d.deduction80CCD)}</td>
                <td className="text-right">{fmt(d.deduction80CCD2 || d.deduction80CCD)}</td>
              </tr>
            )}
            <tr className="bold bg-gray">
              <td className="text-center bold">11.</td>
              <td className="bold">Aggregate of deductible amount under Chapter VI-A</td>
              <td></td>
              <td className="text-right bold">{fmt(d.totalChapterVIADeductions)}</td>
            </tr>
            <tr className="bg-gray">
              <td className="text-center bold">12.</td>
              <td className="bold">Total taxable income (9-11)</td>
              <td></td>
              <td className="bold text-right">{fmt(d.totalTaxableIncome)}</td>
            </tr>
            <tr>
              <td className="text-center">13.</td>
              <td>Tax on total income</td>
              <td></td>
              <td className="text-right">{fmt(d.taxOnTotalIncome)}</td>
            </tr>
            <tr>
              <td className="text-center">14.</td>
              <td>Rebate under section 87A, if applicable</td>
              <td></td>
              <td className="text-right">{fmt(d.rebate87A)}</td>
            </tr>
            <tr>
              <td className="text-center">16.</td>
              <td>Health and education cess</td>
              <td></td>
              <td className="text-right">{fmt(d.healthAndEducationCess)}</td>
            </tr>
            <tr className="bg-gray">
              <td className="text-center bold">17.</td>
              <td className="bold">Tax payable (13+15+16-14)</td>
              <td></td>
              <td className="text-right bold">{fmt(d.totalTaxPayable)}</td>
            </tr>
            <tr>
              <td className="text-center">19.</td>
              <td>Less: Tax deducted at source</td>
              <td></td>
              <td className="text-right">{fmt(d.taxDeductedAtSource)}</td>
            </tr>
            <tr className="bg-gray">
              <td className="text-center bold">21.</td>
              <td className="bold">Net tax payable (17-18-19-20)</td>
              <td></td>
              <td className="bold text-right">{fmt(Math.max(0, d.taxPayableOrRefundable))}</td>
            </tr>
          </tbody>
        </table>

        {/* Verification & Signature Block */}
        <div style={{ marginTop: '10px', fontSize: '10px' }}>
          <div className="bold text-center" style={{ fontSize: '11px', border: '1px solid #000', padding: '3px', background: '#f8f9fa' }}>
            Verification
          </div>
          <div style={{ border: '1px solid #000', borderTop: 'none', padding: '6px 8px' }}>
            <p style={{ textAlign: 'justify', lineHeight: '1.4', margin: 0, fontSize: '9.5px' }}>
              I, <span className="bold">{d.signatoryName && d.signatoryName.trim() !== '' ? d.signatoryName : '....................................................................'}</span>{d.signatoryFatherName && d.signatoryFatherName.trim() !== '' ? `, son/daughter of <span className="bold">${d.signatoryFatherName}</span>` : ''} working in the capacity of <span className="bold">{d.signatoryDesignation && d.signatoryDesignation.trim() !== '' ? d.signatoryDesignation : '....................................................................'}</span> do hereby certify that the information given above is true, complete and correct and is based on the books of account, documents, TDS statements, and other available records.
            </p>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              <tr>
                <td style={{ width: '50%', border: '1px solid #000', borderTop: 'none', padding: '6px 8px', verticalAlign: 'top' }}>
                  <div style={{ marginBottom: '14px' }}><span className="bold">Place:</span> <span style={{ marginLeft: '10px' }}>{d.place || 'Visakhapatnam'}</span></div>
                  <div><span className="bold">Date:</span> <span style={{ marginLeft: '14px' }}>{issueDate}</span></div>
                </td>
                <td style={{ width: '50%', border: '1px solid #000', borderTop: 'none', padding: '6px 8px', textAlign: 'right', verticalAlign: 'bottom' }}>
                  <div style={{ fontSize: '9.5px', marginBottom: '26px' }}>(Signature of person responsible for deduction of tax)</div>
                  <div style={{ borderTop: '1px solid #000', paddingTop: '4px', textAlign: 'right', minHeight: '28px' }}>
                    {d.signatoryName && d.signatoryName.trim() !== '' && <span className="bold" style={{ fontSize: '10.5px' }}>{d.signatoryName}<br /></span>}
                    {d.signatoryDesignation && d.signatoryDesignation.trim() !== '' && <div style={{ fontSize: '9px', color: '#333' }}>{d.signatoryDesignation}</div>}
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div style={{ marginTop: '8px', display: 'flex', justifyContent: 'flex-end', fontSize: '9px', color: '#555' }}>
          <div>Page 2 of 2</div>
        </div>
      </div>
    </>
  );
};

export default Form16Report;
