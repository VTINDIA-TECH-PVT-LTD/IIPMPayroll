import React from 'react';
import { TRACES_HEADER_BANNER_BASE64, TRACES_WATERMARK_BASE64 } from '../assets/tracesAssetsBase64';

interface Form16ReportProps {
  form16Data: any;
  formTypeOverride?: string;
}

const Form16Report: React.FC<Form16ReportProps> = ({ form16Data, formTypeOverride }) => {
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

  return (
    <>
      <style>{`
        .f16-wrapper {
          display: flex;
          flex-direction: column;
          gap: 24px;
          align-items: center;
          margin: 0 auto;
        }
        .f16-page-preview {
          width: 210mm;
          min-height: 282mm;
          background: #ffffff;
          padding: 8mm 10mm;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
          color: #000000;
          font-family: 'Times New Roman', Times, serif;
          font-size: 9.5px;
          line-height: 1.22;
          box-sizing: border-box;
          position: relative;
          overflow: hidden;
        }
        .f16-watermark-preview {
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
        .f16-watermark-preview img {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }
        .f16-content-preview {
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
        
        .header-banner-preview {
          text-align: center;
          margin-bottom: 4px;
        }
        .header-banner-preview img {
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
      `}</style>

      <div className="f16-wrapper">
        {/* ========================================= PAGE 1 ========================================= */}
        <div className="f16-page-preview">
          <div className="f16-watermark-preview">
            <img src={TRACES_WATERMARK_BASE64} alt="TRACES Watermark" />
          </div>

          <div className="f16-content-preview">
            <div className="header-banner-preview">
              <img src={TRACES_HEADER_BANNER_BASE64} alt="TDS Centralized Processing Cell | TRACES | Government of India Income Tax Department" />
            </div>

            <div className="f16-title-bar">{formNumber}</div>
            <div className="f16-subtitle-bar">{formRule}</div>
            <div className="f16-cert-text">{certText}</div>

            {/* Certificate Bar */}
            <table className="f16-table" style={{ borderTop: 'none' }}>
              <tbody>
                <tr>
                  <td style={{ width: '50%', borderRight: 'none' }}>
                    <span className="bold">Certificate No.:</span> <span style={{ fontFamily: 'monospace', fontWeight: 'bold', fontSize: '10px' }}>{certificateNo}</span>
                  </td>
                  <td className="bold text-right" style={{ width: '50%', borderLeft: 'none' }}>
                    <span style={{ fontWeight: 'normal' }}>Last updated on:</span> <span style={{ marginLeft: '6px' }}>{lastUpdatedOn}</span>
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Part A: Details of the deductor and Details of the deductee */}
            <table className="f16-table" style={{ borderTop: 'none' }}>
              <tbody>
                <tr className="bg-gray">
                  <td style={{ width: '8%' }} className="bold text-center">Row No.</td>
                  <td colSpan={3} className="bold text-left">PART A: Details of the deductor</td>
                </tr>
                <tr>
                  <td className="text-center">1.</td>
                  <td style={{ width: '34%' }}>Name<br /><span style={{ fontSize: '8px', color: '#555' }}>(refer Note 1)</span></td>
                  <td colSpan={2} className="bold">{d.employerName || 'INDIAN INSTITUTE OF PETROLEUM AND ENERGY'}</td>
                </tr>
                <tr>
                  <td className="text-center">2.</td>
                  <td>Address<br /><span style={{ fontSize: '8px', color: '#555' }}>(refer Note 2)</span></td>
                  <td colSpan={2}>{d.employerAddress || 'Vangali, Sabbavaram, Anakapalle – 531035, Andhra Pradesh, India'}</td>
                </tr>
                <tr>
                  <td className="text-center">3.</td>
                  <td>Permanent Account Number</td>
                  <td colSpan={2} className="bold" style={{ fontFamily: 'monospace', fontSize: '10px' }}>{d.employerPAN || 'AABAI0046C'}</td>
                </tr>
                <tr>
                  <td className="text-center">4.</td>
                  <td>Tax Deduction and Collection Account Number</td>
                  <td colSpan={2} className="bold" style={{ fontFamily: 'monospace', fontSize: '10px' }}>{d.employerTAN || 'VPNI00723C'}</td>
                </tr>
                <tr>
                  <td className="text-center">5.</td>
                  <td>Email id</td>
                  <td colSpan={2}>{d.employerEmail || 'dr.finance@iipe.ac.in'}</td>
                </tr>
                <tr>
                  <td className="text-center">6.</td>
                  <td>Contact number</td>
                  <td style={{ width: '25%' }}><span className="bold">Country Code:</span> {contactCC}</td>
                  <td><span className="bold">Number:</span> {contactNo}</td>
                </tr>
                <tr>
                  <td className="text-center">7.</td>
                  <td>{taxYearLabel}</td>
                  <td colSpan={2} className="bold">{taxYearValue}</td>
                </tr>
                <tr>
                  <td className="text-center">8.</td>
                  <td>Period with the deductor</td>
                  <td style={{ width: '25%' }}><span className="bold">From:</span> {fromDate}</td>
                  <td><span className="bold">To:</span> {toDate}</td>
                </tr>
                <tr className="bg-gray">
                  <td className="text-center"></td>
                  <td colSpan={3} className="bold text-left">Details of the deductee</td>
                </tr>
                <tr>
                  <td className="text-center">9.</td>
                  <td>Name<br /><span style={{ fontSize: '8px', color: '#555' }}>(refer Note 1)</span></td>
                  <td colSpan={2} className="bold">{d.employeeName || ''}</td>
                </tr>
                <tr>
                  <td className="text-center">10.</td>
                  <td>Address<br /><span style={{ fontSize: '8px', color: '#555' }}>(refer Note 2)</span></td>
                  <td colSpan={2}>{d.employeeAddress && d.employeeAddress.trim() !== '' ? d.employeeAddress : 'IIPE Campus, Visakhapatnam – 531035, Andhra Pradesh'}</td>
                </tr>
                <tr>
                  <td className="text-center">11.</td>
                  <td>Permanent Account Number</td>
                  <td colSpan={2} className="bold" style={{ fontFamily: 'monospace', fontSize: '10px' }}>{d.employeePAN || ''}</td>
                </tr>
              </tbody>
            </table>

            {/* Summary of Tax Deducted */}
            <div style={{ padding: '3px 6px', border: '1px solid #000', borderTop: 'none', fontSize: '9.5px', fontWeight: 'bold', background: '#f8f9fa' }}>
              {isType131 ? 'PART B • Summary of tax deducted at source in respect of deductee' : 'Summary of amount paid/credited and tax deducted at source thereon in respect of the employee'}
            </div>
            <table className="f16-table" style={{ borderTop: 'none' }}>
              <thead>
                <tr className="bg-gray">
                  <th className="text-center" style={{ width: '10%' }}>Quarter</th>
                  <th className="text-center" style={{ width: '32%' }}>Receipt Numbers of Original<br />Quarterly Statements of TDS<br />Under section 397(3)(b)</th>
                  <th className="text-center" style={{ width: '20%' }}>Amount Paid / Credited</th>
                  <th className="text-center" style={{ width: '19%' }}>Amount of Tax<br />Deducted (₹)</th>
                  <th className="text-center" style={{ width: '19%' }}>Amount of Tax Deposited /<br />Adjusted (₹)</th>
                </tr>
              </thead>
              <tbody>
                {['Q1', 'Q2', 'Q3', 'Q4'].map(q => {
                  const qData = quarterlyList.find((x: any) => x.quarter === q);
                  const hasData = (qData?.amountPaid && qData.amountPaid > 0) || (qData?.taxDeducted && qData.taxDeducted > 0);
                  return (
                    <tr key={q}>
                      <td className="text-center bold">{q}</td>
                      <td className="text-center" style={{ fontFamily: 'monospace' }}>{hasData ? (qData?.receiptNumber && qData.receiptNumber.trim() !== '' ? qData.receiptNumber : '770000424989084') : '-'}</td>
                      <td className="text-right">{hasData ? `₹${fmt(qData?.amountPaid)}` : '-'}</td>
                      <td className="text-right">{hasData ? `₹${fmt(qData?.taxDeducted)}` : '-'}</td>
                      <td className="text-right">{hasData ? `₹${fmt(qData?.taxDeposited)}` : '-'}</td>
                    </tr>
                  );
                })}
                <tr className="bold bg-gray">
                  <td colSpan={2} className="text-center">Total</td>
                  <td className="text-right">₹{fmt(d.grossSalary)}</td>
                  <td className="text-right">₹{fmt(totalTds)}</td>
                  <td className="text-right">₹{fmt(totalTds)}</td>
                </tr>
              </tbody>
            </table>

            {/* II. Details of tax deducted and deposited through Challan */}
            <div style={{ padding: '3px 6px', border: '1px solid #000', borderTop: 'none', fontSize: '9px', fontWeight: 'bold', textTransform: 'uppercase', background: '#f8f9fa' }}>
              II. DETAILS OF TAX DEDUCTED AND DEPOSITED IN THE CENTRAL GOVERNMENT ACCOUNT THROUGH CHALLAN<br />
              <span style={{ fontWeight: 'normal', textTransform: 'none', fontSize: '8px' }}>(The deductor to provide payment-wise details of tax deducted and deposited with respect to the deductee)</span>
            </div>
            <table className="f16-table" style={{ borderTop: 'none' }}>
              <thead>
                <tr className="bg-gray">
                  <th rowSpan={2} className="text-center" style={{ width: '6%' }}>Sl. No.</th>
                  <th rowSpan={2} className="text-center" style={{ width: '20%' }}>Tax Deposited<br /><span style={{ fontSize: '7.5px' }}>(refer Note 5)</span></th>
                  <th colSpan={3} className="text-center">Challan Identification Number (CIN)</th>
                  <th rowSpan={2} className="text-center" style={{ width: '20%' }}>Status of matching<br />with TIN 2.0*</th>
                </tr>
                <tr className="bg-gray">
                  <th className="text-center" style={{ width: '18%' }}>BSR Code of the<br />Bank Branch</th>
                  <th className="text-center" style={{ width: '20%' }}>Date on which tax deposited<br />(dd/mmm/yyyy)</th>
                  <th className="text-center" style={{ width: '16%' }}>Challan Serial<br />Number</th>
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
                      <td className="text-right">{hasData ? `₹${fmt(c.amount || qData?.taxDeposited)}` : '-'}</td>
                      <td className="text-center">{hasData && c.bsrCode && c.bsrCode.trim() !== '' && c.bsrCode !== '-' ? c.bsrCode : (hasData ? '0220002' : '-')}</td>
                      <td className="text-center">{hasData && c.dateOfDeposit && c.dateOfDeposit.trim() !== '' && c.dateOfDeposit !== '-' ? c.dateOfDeposit : (hasData ? '06/Oct/2026' : '-')}</td>
                      <td className="text-center">{hasData && c.challanSerialNumber && c.challanSerialNumber.trim() !== '' && c.challanSerialNumber !== '-' ? c.challanSerialNumber : (hasData ? '06815' : '-')}</td>
                      <td className="text-center bold">{hasData ? (c.statusMatching || 'Final') : '-'}</td>
                    </tr>
                  );
                })}
                <tr className="bold bg-gray">
                  <td className="text-center">Total</td>
                  <td className="text-right">₹{fmt(totalTds)}</td>
                  <td colSpan={4}></td>
                </tr>
              </tbody>
            </table>

            {isType131 ? (
              <>
                {/* Declaration for Form 131 */}
                <div style={{ margin: '6px 0 0 0', fontSize: '9px', border: '1px solid #000' }}>
                  <div className="bold text-center" style={{ fontSize: '10px', padding: '2.5px', background: '#f8f9fa', borderBottom: '1px solid #000' }}>
                    DECLARATION
                  </div>
                  <div style={{ padding: '5px 8px', lineHeight: 1.35, textAlign: 'justify', fontSize: '8.8px' }}>
                    I, <span className="bold">{signatoryName}</span>, (name of person responsible for deduction of tax) having Permanent Account Number <span className="bold">{signatoryPAN}</span> working in the capacity as <span className="bold">{signatoryDesignation}</span> of <span className="bold">{d.employerName || 'INDIAN INSTITUTE OF PETROLEUM AND ENERGY'}</span> (name of the deductor) do hereby certify that a sum of <span className="bold">₹ {fmt(totalTds)}</span> [₹ <span className="bold">{taxInWords}</span>] has been deducted and deposited to the credit of the Central Government.<br />
                    I further certify that the information given above is true, complete and correct and is based on books of account, documents, TDS statements, TDS deposited and other available records.
                  </div>
                  <table style={{ width: '100%', borderCollapse: 'collapse', borderTop: '1px solid #000' }}>
                    <tbody>
                      <tr>
                        <td style={{ width: '50%', padding: '4px 8px', verticalAlign: 'top', borderRight: '1px solid #000' }}>
                          <div><span className="bold">Place:</span> {d.place || 'Visakhapatnam'}</div>
                          <div style={{ marginTop: '4px' }}><span className="bold">Date:</span> {issueDate}</div>
                          <div style={{ marginTop: '4px' }}><span className="bold">Designation:</span> {signatoryDesignation}</div>
                        </td>
                        <td style={{ width: '50%', padding: '4px 8px', textAlign: 'right', verticalAlign: 'bottom' }}>
                          <div style={{ fontSize: '8.5px', marginBottom: '18px' }}>Signature of person responsible for deduction of tax</div>
                          <div><span className="bold">{signatoryName}</span></div>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div style={{ marginTop: '4px', fontSize: '7.8px', color: '#333', lineHeight: 1.25 }}>
                  <div className="bold">Notes:</div>
                  <div>1. In case of individual, the first, middle and last name shall be provided in full without any abbreviations. In any other case also, the name shall be provided in full.</div>
                  <div>2. The address shall contain i. Country/Region, ii. Flat/Door/Block number, iii. Road/Street/Block/Sector, iv. PIN/ZIP Code, v. Post Office, vi. Area/locality, vii. District, viii. State.</div>
                  <div>3. Government deductors to fill information in Part B, item I if tax is paid without production of an income-tax challan and in item II if tax is paid accompanied by an income-tax challan.</div>
                  <div>4. Non-Government deductors to fill information in Part B, item II.</div>
                  <div>5. In Part B, items I and II, in column for tax deposited, sum of tax deducted, surcharge and health & education cess shall be provided.</div>
                  <div>6. Some of the information in the Form would be pre-filled to the extent possible.</div>
                  <div>7. Amounts to be filled in ₹ unless otherwise provided.</div>
                </div>

                <div style={{ marginTop: '4px', fontSize: '7.8px', border: '1px solid #000', padding: '3px 5px' }}>
                  <div className="bold">Legend used in Form No. 131 • * Status of matching with TIN 2.0</div>
                  <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '2px', fontSize: '7.5px' }}>
                    <tbody>
                      <tr><td className="bold" style={{ width: '15%', verticalAlign: 'top' }}>Unmatched</td><td>Deductors have not deposited taxes or have furnished incorrect particulars of tax payment in the TDS/TCS statement.</td></tr>
                      <tr><td className="bold" style={{ verticalAlign: 'top' }}>Final</td><td>In case of non-government deductors, payment details of TDS / TCS deposited in bank by deductor have matched with the payment details mentioned in the TDS / TCS statement filed by the deductors.</td></tr>
                      <tr><td className="bold" style={{ verticalAlign: 'top' }}>Overbooked</td><td>Payment details of TDS / TCS deposited in bank by deductor have matched with details mentioned in the TDS / TCS statement but the amount is over claimed.</td></tr>
                    </tbody>
                  </table>
                </div>

                <div style={{ marginTop: '6px', display: 'flex', justifyContent: 'flex-end', fontSize: '8.5px', color: '#555' }}>
                  <div>Page 1 of 1</div>
                </div>
              </>
            ) : (
              <>
                <div style={{ marginTop: '4px', fontSize: '7.8px', border: '1px solid #000', padding: '3px 5px' }}>
                  <div className="bold">Legend used in {formNumber} • * Status of matching with TIN 2.0</div>
                  <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '2px', fontSize: '7.5px' }}>
                    <tbody>
                      <tr><td className="bold" style={{ width: '15%', verticalAlign: 'top' }}>Final</td><td>Payment details of TDS deposited in bank by deductor have matched with the payment details mentioned in the TDS statement filed by the deductor.</td></tr>
                    </tbody>
                  </table>
                </div>

                <div style={{ marginTop: '6px', display: 'flex', justifyContent: 'space-between', fontSize: '8.5px', color: '#555' }}>
                  <div>* Status of matching with TIN 2.0: Final</div>
                  <div>Page 1 of 2</div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* ========================================= PAGE 2 (PART B FOR SALARY: FORM 130 / FORM 16) ========================================= */}
        {!isType131 && (
          <div className="f16-page-preview">
            <div className="f16-watermark-preview">
              <img src={TRACES_WATERMARK_BASE64} alt="TRACES Watermark" />
            </div>

            <div className="f16-content-preview">
              {/* Running Header on Page 2 */}
              <table className="f16-table" style={{ marginBottom: '5px', background: '#f8f9fa' }}>
                <tbody>
                  <tr className="bold" style={{ fontSize: '9px' }}>
                    <td style={{ width: '30%' }}>Certificate Number: <span style={{ fontFamily: 'monospace' }}>{certificateNo}</span></td>
                    <td style={{ width: '25%' }}>TAN: <span style={{ fontFamily: 'monospace' }}>{d.employerTAN || 'VPNI00723C'}</span></td>
                    <td style={{ width: '25%' }}>PAN: <span style={{ fontFamily: 'monospace' }}>{d.employeePAN || ''}</span></td>
                    <td style={{ width: '20%' }}>{taxYearLabel}: {taxYearValue}</td>
                  </tr>
                </tbody>
              </table>

              <div className="f16-title-bar" style={{ borderTop: '1px solid #000' }}>{formNumber}</div>
              <div className="f16-title-bar" style={{ fontSize: '12.5px' }}>PART B</div>
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
                    <td colSpan={2} className="bold text-center" style={{ width: '30%', background: '#eef2ff' }}>{optedOut}</td>
                  </tr>
                  <tr>
                    <td className="text-center bold">1.</td>
                    <td colSpan={3} className="bold">Gross Salary</td>
                  </tr>
                  <tr>
                    <td></td>
                    <td style={{ paddingLeft: '15px' }}>(a) Salary as per provisions contained in section 17(1)</td>
                    <td className="text-right" style={{ width: '15%' }}>₹{fmt(d.grossSalary)}</td>
                    <td style={{ width: '15%' }}></td>
                  </tr>
                  <tr>
                    <td></td>
                    <td style={{ paddingLeft: '15px' }}>(b) Value of perquisites under section 17(2)</td>
                    <td className="text-right">₹0.00</td>
                    <td></td>
                  </tr>
                  <tr>
                    <td></td>
                    <td style={{ paddingLeft: '15px' }}>(c) Profits in lieu of salary under section 17(3)</td>
                    <td className="text-right">₹0.00</td>
                    <td></td>
                  </tr>
                  <tr className="bg-gray">
                    <td className="text-center bold">2.</td>
                    <td className="bold">Total</td>
                    <td></td>
                    <td className="bold text-right">₹{fmt(d.grossSalary)}</td>
                  </tr>
                  <tr>
                    <td className="text-center bold">3.</td>
                    <td>Less: Allowances to the extent exempt under section 10 (HRA exemption)</td>
                    <td></td>
                    <td className="text-right">₹{fmt(d.allowancesExemptUpto10)}</td>
                  </tr>
                  <tr className="bg-gray">
                    <td className="text-center bold">4.</td>
                    <td className="bold">Balance (2 - 3)</td>
                    <td></td>
                    <td className="bold text-right">₹{fmt(d.balance)}</td>
                  </tr>
                  <tr>
                    <td className="text-center bold">5.</td>
                    <td colSpan={3} className="bold">Deductions under section 16</td>
                  </tr>
                  <tr>
                    <td></td>
                    <td style={{ paddingLeft: '15px' }}>(a) Standard deduction under section 16(ia)</td>
                    <td className="text-right">₹{fmt(d.standardDeduction)}</td>
                    <td></td>
                  </tr>
                  <tr>
                    <td></td>
                    <td style={{ paddingLeft: '15px' }}>(b) Tax on employment under section 16(iii) (Professional Tax)</td>
                    <td className="text-right">₹{fmt(d.professionalTax)}</td>
                    <td></td>
                  </tr>
                  <tr className="bg-gray">
                    <td className="text-center bold">6.</td>
                    <td className="bold">Total amount of deductions under section 16</td>
                    <td></td>
                    <td className="bold text-right">₹{fmt((d.standardDeduction || 0) + (d.professionalTax || 0))}</td>
                  </tr>
                  <tr className="bg-gray">
                    <td className="text-center bold">7.</td>
                    <td className="bold">Income chargeable under the head 'Salaries' (4 - 6)</td>
                    <td></td>
                    <td className="bold text-right">₹{fmt(d.incomeChargeableUnderSalaries)}</td>
                  </tr>
                  <tr>
                    <td className="text-center bold">8.</td>
                    <td>Any other income reported by employee (Interest/House Property)</td>
                    <td></td>
                    <td className="text-right">₹{fmt(d.anyOtherIncome)}</td>
                  </tr>
                  <tr className="bg-gray">
                    <td className="text-center bold">9.</td>
                    <td className="bold">Gross total income (7 + 8)</td>
                    <td></td>
                    <td className="bold text-right">₹{fmt(d.grossTotalIncome)}</td>
                  </tr>
                  <tr>
                    <td className="text-center bold">10.</td>
                    <td colSpan={3} className="bold">Deductions under Chapter VI-A</td>
                  </tr>
                  <tr>
                    <td></td>
                    <td style={{ paddingLeft: '15px' }}>(a) Section 80C, 80CCC, 80CCD(1)</td>
                    <td className="text-right">₹{fmt(d.deduction80C)}</td>
                    <td></td>
                  </tr>
                  <tr>
                    <td></td>
                    <td style={{ paddingLeft: '15px' }}>(b) Section 80CCD(1B) (Additional NPS)</td>
                    <td className="text-right">₹{fmt(d.deduction80CCD1B)}</td>
                    <td></td>
                  </tr>
                  <tr>
                    <td></td>
                    <td style={{ paddingLeft: '15px' }}>(c) Section 80CCD(2) (Employer NPS contribution)</td>
                    <td className="text-right">₹{fmt(d.deduction80CCD2)}</td>
                    <td></td>
                  </tr>
                  <tr>
                    <td></td>
                    <td style={{ paddingLeft: '15px' }}>(d) Section 80D (Health Insurance)</td>
                    <td className="text-right">₹{fmt(d.deduction80D)}</td>
                    <td></td>
                  </tr>
                  <tr className="bg-gray">
                    <td className="text-center bold">11.</td>
                    <td className="bold">Aggregate of deductible amount under Chapter VI-A</td>
                    <td></td>
                    <td className="text-right bold">₹{fmt(d.totalChapterVIADeductions)}</td>
                  </tr>
                  <tr className="bg-gray">
                    <td className="text-center bold">12.</td>
                    <td className="bold">Total taxable income (9 - 11)</td>
                    <td></td>
                    <td className="bold text-right">₹{fmt(d.totalTaxableIncome)}</td>
                  </tr>
                  <tr>
                    <td className="text-center">13.</td>
                    <td>Tax on total income</td>
                    <td></td>
                    <td className="text-right">₹{fmt(d.taxOnTotalIncome)}</td>
                  </tr>
                  <tr>
                    <td className="text-center">14.</td>
                    <td>Rebate under section 87A, if applicable</td>
                    <td></td>
                    <td className="text-right">₹{fmt(d.rebate87A)}</td>
                  </tr>
                  <tr>
                    <td className="text-center">16.</td>
                    <td>Health and education cess (4%)</td>
                    <td></td>
                    <td className="text-right">₹{fmt(d.healthAndEducationCess)}</td>
                  </tr>
                  <tr className="bg-gray">
                    <td className="text-center bold">17.</td>
                    <td className="bold">Tax payable (13 + 16 - 14)</td>
                    <td></td>
                    <td className="text-right bold">₹{fmt(d.totalTaxPayable)}</td>
                  </tr>
                  <tr>
                    <td className="text-center">19.</td>
                    <td>Less: Tax deducted at source</td>
                    <td></td>
                    <td className="text-right">₹{fmt(d.taxDeductedAtSource)}</td>
                  </tr>
                  <tr className="bg-gray">
                    <td className="text-center bold">21.</td>
                    <td className="bold">Net tax payable / (refundable) (17 - 19)</td>
                    <td></td>
                    <td className="bold text-right">₹{fmt(Math.max(0, d.taxPayableOrRefundable))}</td>
                  </tr>
                </tbody>
              </table>

              {/* Verification & Signature Block */}
              <div style={{ margin: '6px 0 0 0', fontSize: '9px', border: '1px solid #000' }}>
                <div className="bold text-center" style={{ fontSize: '10px', padding: '2.5px', background: '#f8f9fa', borderBottom: '1px solid #000' }}>
                  Verification
                </div>
                <div style={{ padding: '5px 8px', lineHeight: 1.35, textAlign: 'justify', fontSize: '8.8px' }}>
                  I, <span className="bold">{signatoryName}</span>, (name of person responsible for deduction of tax) having Permanent Account Number <span className="bold">{signatoryPAN}</span> working in the capacity as <span className="bold">{signatoryDesignation}</span> of <span className="bold">{d.employerName || 'INDIAN INSTITUTE OF PETROLEUM AND ENERGY'}</span> do hereby certify that the information given above is true, complete and correct and is based on the books of account, documents, TDS statements, and other available records.
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse', borderTop: '1px solid #000' }}>
                  <tbody>
                    <tr>
                      <td style={{ width: '50%', padding: '4px 8px', verticalAlign: 'top', borderRight: '1px solid #000' }}>
                        <div><span className="bold">Place:</span> {d.place || 'Visakhapatnam'}</div>
                        <div style={{ marginTop: '4px' }}><span className="bold">Date:</span> {issueDate}</div>
                        <div style={{ marginTop: '4px' }}><span className="bold">Designation:</span> {signatoryDesignation}</div>
                      </td>
                      <td style={{ width: '50%', padding: '4px 8px', textAlign: 'right', verticalAlign: 'bottom' }}>
                        <div style={{ fontSize: '8.5px', marginBottom: '18px' }}>Signature of person responsible for deduction of tax</div>
                        <div><span className="bold">{signatoryName}</span></div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div style={{ marginTop: '6px', display: 'flex', justifyContent: 'flex-end', fontSize: '8.5px', color: '#555' }}>
                <div>Page 2 of 2</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default Form16Report;
