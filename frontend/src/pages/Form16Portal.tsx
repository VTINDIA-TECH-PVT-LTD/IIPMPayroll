import React, { useContext, useEffect, useState } from 'react';
import { UserContext } from '../App';
import api from '../services/api';

const Form16Portal: React.FC = () => {
  const userCtx = useContext(UserContext);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form16Data, setForm16Data] = useState<any>(null);

  // Fetch Form 16 data
  useEffect(() => {
    if (userCtx?.userId) {
      setLoading(true);
      const year = new Date().getFullYear();
      api.getForm16(userCtx.userId, year)
        .then(res => {
          if (res) setForm16Data(res);
        })
        .catch(err => {
          console.error(err);
          setError('Could not load Form 16 data. Please try again.');
        })
        .finally(() => setLoading(false));
    }
  }, [userCtx?.userId]);

  if (loading) return <div className="page-container" style={{ textAlign: 'center', marginTop: '50px' }}>Loading Form 16...</div>;
  if (error) return <div className="page-container" style={{ color: 'red', textAlign: 'center', marginTop: '50px' }}>{error}</div>;
  if (!form16Data) return null;

  const d = form16Data;
  const isOldRegime = d.standardDeduction === 50000;
  // If opting out of 115BAC(1A), it means OLD regime. So NEW regime = No, OLD regime = Yes.
  const optedOut = isOldRegime ? 'Yes' : 'No';

  const fmt = (num: number) => {
    if (!num) return '0.00';
    return Number(num).toFixed(2);
  };

  return (
    <div className="page-container" style={{ maxWidth: '1000px', margin: '0 auto', background: '#e5e7eb', padding: '20px' }}>
      <style>{`
        .f16-page {
          background: #fff;
          width: 210mm;
          min-height: 297mm;
          margin: 0 auto 30px auto;
          box-shadow: 0 0 10px rgba(0,0,0,0.2);
          padding: 10mm;
          font-family: 'Times New Roman', Times, serif;
          color: #000;
          box-sizing: border-box;
          position: relative;
        }
        .f16-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 11px;
          margin-bottom: 0;
        }
        .f16-table th, .f16-table td {
          border: 1px solid #000;
          padding: 4px 6px;
          vertical-align: top;
        }
        .f16-table td.valign-middle { vertical-align: middle; }
        .text-center { text-align: center; }
        .text-right { text-align: right; }
        .text-left { text-align: left; }
        .bold { font-weight: bold; }
        
        .header-section {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 10px;
        }
        
        .header-traces {
          color: #0056b3;
          font-family: Arial, sans-serif;
        }
        .header-traces h1 { margin: 0; font-size: 28px; font-weight: 800; letter-spacing: 1px; }
        .header-traces p { margin: 2px 0 0; font-size: 10px; color: #555; }
        
        .header-gov {
          text-align: right;
          font-family: Arial, sans-serif;
        }
        .header-gov h3 { margin: 0; font-size: 14px; }
        .header-gov p { margin: 2px 0 0; font-size: 11px; font-weight: bold; }

        .f16-title-bar {
          text-align: center;
          font-size: 14px;
          font-weight: bold;
          padding: 5px;
          border: 1px solid #000;
          border-bottom: none;
        }
        .f16-subtitle-bar {
          text-align: center;
          font-size: 12px;
          padding: 3px;
          border: 1px solid #000;
          border-bottom: none;
        }
        .f16-cert-text {
          text-align: center;
          font-size: 11px;
          font-weight: bold;
          padding: 4px;
          border: 1px solid #000;
          border-bottom: none;
        }

        @media print {
          body { background: #fff !important; }
          .page-container { background: #fff !important; padding: 0 !important; margin: 0 !important; max-width: none !important; }
          .f16-page {
            box-shadow: none !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            min-height: auto !important;
            page-break-after: always;
          }
          .no-print { display: none !important; }
        }
      `}</style>

      <div className="no-print" style={{ textAlign: 'center', marginBottom: '20px' }}>
        <button onClick={() => window.print()} style={{ padding: '10px 24px', cursor: 'pointer', background: '#153C7D', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '16px' }}>
          🖨️ Print / Download Form 16
        </button>
      </div>

      {/* ========================================= PART A ========================================= */}
      <div className="f16-page">
        <div className="header-section">
          <div className="header-traces">
            <h1>TRACES</h1>
            <p>TDS Reconciliation Analysis and Correction Enabling System</p>
          </div>
          <div className="header-gov">
            <h3>Government of India</h3>
            <p>Income Tax Department</p>
          </div>
        </div>

        <div className="f16-title-bar">FORM NO. 16</div>
        <div className="f16-subtitle-bar">[See rule 31(1)(a)]</div>
        <div className="f16-title-bar">PART A</div>
        <div className="f16-cert-text">
          Certificate under section 203 of the Income-tax Act, 1961 for tax deducted at source on salary paid to an employee under section 192 or pension/interest income of specified senior citizen under section 194P
        </div>

        <table className="f16-table">
          <tbody>
            <tr>
              <td colSpan={2} className="bold" style={{ width: '50%' }}>Certificate No. <span style={{ marginLeft: '10px', fontWeight: 'normal' }}>ACORZOA</span></td>
              <td colSpan={2} className="bold text-right" style={{ width: '50%' }}>Last updated on <span style={{ marginLeft: '10px', fontWeight: 'normal' }}>10-Jul-2026</span></td>
            </tr>
            <tr>
              <td colSpan={2} className="bold text-center">Name and address of the Employer/Specified Bank</td>
              <td colSpan={2} className="bold text-center">Name and address of the Employee/Specified senior citizen</td>
            </tr>
            <tr>
              <td colSpan={2} style={{ height: '80px' }}>
                {d.employerName}<br />
                {d.employerAddress}<br />
                <br />
                fo@iipe.ac.in
              </td>
              <td colSpan={2}>
                {d.employeeName}<br />
                {d.employeeAddress}
              </td>
            </tr>
            <tr>
              <td className="bold text-center" style={{ width: '25%' }}>PAN of the Deductor</td>
              <td className="bold text-center" style={{ width: '25%' }}>TAN of the Deductor</td>
              <td colSpan={2} className="bold text-center" style={{ width: '50%' }}>PAN of the Employee/Specified senior citizen</td>
            </tr>
            <tr>
              <td className="text-center">{d.employerPAN}</td>
              <td className="text-center">{d.employerTAN}</td>
              <td colSpan={2} className="text-center">{d.employeePAN}</td>
            </tr>
            <tr>
              <td colSpan={2} className="bold text-center">CIT (TDS)</td>
              <td className="bold text-center">Assessment Year</td>
              <td className="bold text-center">Period with the Employer</td>
            </tr>
            <tr>
              <td colSpan={2} className="text-center valign-middle">
                The Commissioner of Income Tax (TDS)<br />
                Room No. 411, Income Tax Towers, 10-2-3 A.C. Guard,<br />
                Hyderabad - 500004
              </td>
              <td className="text-center valign-middle">{d.assessmentYear}</td>
              <td style={{ padding: 0 }}>
                <table style={{ width: '100%', height: '100%', borderCollapse: 'collapse', border: 'none' }}>
                  <tbody>
                    <tr>
                      <td className="bold text-center" style={{ border: 'none', borderRight: '1px solid #000', borderBottom: '1px solid #000', width: '50%' }}>From</td>
                      <td className="bold text-center" style={{ border: 'none', borderBottom: '1px solid #000', width: '50%' }}>To</td>
                    </tr>
                    <tr>
                      <td className="text-center valign-middle" style={{ border: 'none', borderRight: '1px solid #000', height: '40px' }}>01-Apr-{d.assessmentYear?.split('-')[0] ? parseInt(d.assessmentYear.split('-')[0]) - 1 : '2025'}</td>
                      <td className="text-center valign-middle" style={{ border: 'none' }}>31-Mar-{d.assessmentYear?.split('-')[0] || '2026'}</td>
                    </tr>
                  </tbody>
                </table>
              </td>
            </tr>
          </tbody>
        </table>

        <div style={{ padding: '6px', border: '1px solid #000', borderTop: 'none', fontSize: '11px', fontWeight: 'bold' }}>
          Summary of amount paid/credited and tax deducted at source thereon in respect of the employee
        </div>
        <table className="f16-table" style={{ borderTop: 'none' }}>
          <thead>
            <tr>
              <th className="text-center">Quarter(s)</th>
              <th className="text-center">Receipt Numbers of original<br />quarterly statements of TDS<br />under sub-section (3) of<br />Section 200</th>
              <th className="text-center">Amount paid/credited</th>
              <th className="text-center">Amount of tax deducted<br />(Rs.)</th>
              <th className="text-center">Amount of tax deposited / remitted<br />(Rs.)</th>
            </tr>
          </thead>
          <tbody>
            {['Q1', 'Q2', 'Q3', 'Q4'].map((q, i) => {
              const qData = d.quarterlyTdsList?.find((x: any) => x.quarter === q);
              return (
                <tr key={i}>
                  <td className="text-center">{q}</td>
                  <td className="text-center">{qData?.receiptNumber || '-'}</td>
                  <td className="text-right">{fmt(qData?.amountPaid)}</td>
                  <td className="text-right">{fmt(qData?.taxDeducted)}</td>
                  <td className="text-right">{fmt(qData?.taxDeposited)}</td>
                </tr>
              );
            })}
            <tr>
              <td colSpan={2} className="bold text-center">Total (Rs.)</td>
              <td className="bold text-right">{fmt(d.grossSalary)}</td>
              <td className="bold text-right">{fmt(d.totalTdsDeposited)}</td>
              <td className="bold text-right">{fmt(d.totalTdsDeposited)}</td>
            </tr>
          </tbody>
        </table>

        <div style={{ padding: '6px', border: '1px solid #000', borderTop: 'none', fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase' }}>
          I. DETAILS OF TAX DEDUCTED AND DEPOSITED IN THE CENTRAL GOVERNMENT ACCOUNT THROUGH BOOK ADJUSTMENT<br />
          <span style={{ fontWeight: 'normal', textTransform: 'none' }}>(The deductor to provide payment wise details of tax deducted and deposited with respect to the deductee)</span>
        </div>
        <table className="f16-table" style={{ borderTop: 'none' }}>
          <thead>
            <tr>
              <th rowSpan={2} className="text-center valign-middle" style={{ width: '8%' }}>Sl. No.</th>
              <th rowSpan={2} className="text-center valign-middle" style={{ width: '22%' }}>Tax Deposited in respect of the<br />deductee<br />(Rs.)</th>
              <th colSpan={3} className="text-center">Book Identification Number (BIN)</th>
            </tr>
            <tr>
              <th className="text-center">Receipt Numbers of Form<br />No. 24G</th>
              <th className="text-center">DDO serial number in Form no.<br />24G</th>
              <th className="text-center">Date of transfer voucher<br />(dd/mm/yyyy)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={5} className="text-center" style={{ height: '30px' }}>-</td>
            </tr>
            <tr>
              <td className="bold text-center">Total (Rs.)</td>
              <td className="bold text-right">0.00</td>
              <td colSpan={3}></td>
            </tr>
          </tbody>
        </table>

        <div style={{ padding: '6px', border: '1px solid #000', borderTop: 'none', fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase' }}>
          II. DETAILS OF TAX DEDUCTED AND DEPOSITED IN THE CENTRAL GOVERNMENT ACCOUNT THROUGH CHALLAN<br />
          <span style={{ fontWeight: 'normal', textTransform: 'none' }}>(The deductor to provide payment wise details of tax deducted and deposited with respect to the deductee)</span>
        </div>
        <table className="f16-table" style={{ borderTop: 'none' }}>
          <thead>
            <tr>
              <th rowSpan={2} className="text-center valign-middle" style={{ width: '8%' }}>Sl. No.</th>
              <th rowSpan={2} className="text-center valign-middle" style={{ width: '22%' }}>Tax Deposited in respect of the<br />deductee<br />(Rs.)</th>
              <th colSpan={3} className="text-center">Challan Identification Number (CIN)</th>
            </tr>
            <tr>
              <th className="text-center">BSR Code of the Bank<br />Branch</th>
              <th className="text-center">Date on which Tax deposited<br />(dd/mm/yyyy)</th>
              <th className="text-center">Challan Serial Number</th>
            </tr>
          </thead>
          <tbody>
            {d.challanDetails?.map((c: any, i: number) => (
              <tr key={i}>
                <td className="text-center">{i + 1}</td>
                <td className="text-right">{fmt(c.amount)}</td>
                <td className="text-center">{c.bsrCode}</td>
                <td className="text-center">{c.dateOfDeposit}</td>
                <td className="text-center">{c.challanSerialNumber}</td>
              </tr>
            ))}
            <tr>
              <td className="bold text-center">Total (Rs.)</td>
              <td className="bold text-right">{fmt(d.totalTdsDeposited)}</td>
              <td colSpan={3}></td>
            </tr>
          </tbody>
        </table>
        
        <div style={{ marginTop: '30px', fontSize: '11px' }}>
          <div className="bold text-center" style={{ marginBottom: '10px', fontSize: '12px' }}>Verification</div>
          <p style={{ textAlign: 'justify', lineHeight: '1.5' }}>
            I, <span className="bold">SHALIVAHAN</span>, son / daughter of <span className="bold">SURESH PANDEY KUMAR SINHA</span> working in the capacity of <span className="bold">AUTHORISED SIGNATORY</span> (designation) do hereby certify that a sum of Rs. {fmt(d.totalTdsDeposited)} [Rs. ........................................................................ (in words)] has been deducted and a sum of Rs. {fmt(d.totalTdsDeposited)} [Rs. ........................................................................] has been deposited to the credit of the Central Government. I further certify that the information given above is true, complete and correct and is based on the books of account, documents, TDS statements, TDS deposited and other available records.
          </p>
          <table style={{ width: '100%', marginTop: '30px', borderCollapse: 'collapse' }}>
            <tbody>
              <tr>
                <td style={{ width: '50%', border: '1px solid #000', padding: '8px' }}>
                  <div style={{ marginBottom: '20px' }}><span className="bold">Place</span><span style={{ marginLeft: '40px' }}>Visakhapatnam</span></div>
                  <div><span className="bold">Date</span><span style={{ marginLeft: '45px' }}>10-Jul-2026</span></div>
                </td>
                <td style={{ width: '50%', border: '1px solid #000', padding: '8px', textAlign: 'center', verticalAlign: 'bottom' }}>
                  <div style={{ marginBottom: '5px' }}>(Signature of person responsible for deduction of Tax)</div>
                  <div style={{ borderTop: '1px solid #000', paddingTop: '5px', textAlign: 'left' }}>
                    <span className="bold">Designation: </span>AUTHORISED SIGNATORY
                    <span className="bold" style={{ marginLeft: '40px' }}>Full Name: </span>SHALIVAHAN
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================= PART B (Page 1) ========================================= */}
      <div className="f16-page">
        <div className="f16-title-bar" style={{ borderTop: '1px solid #000' }}>FORM NO. 16</div>
        <div className="f16-title-bar">PART B</div>
        <div className="f16-cert-text">
          Certificate under section 203 of the Income-tax Act, 1961 for tax deducted at source on salary paid to an employee under section 192 or pension/interest income of specified senior citizen under section 194P
        </div>
        
        <table className="f16-table">
          <tbody>
            <tr>
              <td colSpan={2} className="bold" style={{ width: '50%' }}>Certificate No. <span style={{ marginLeft: '10px', fontWeight: 'normal' }}>ACORZOA</span></td>
              <td colSpan={2} className="bold text-right" style={{ width: '50%' }}>Last updated on <span style={{ marginLeft: '10px', fontWeight: 'normal' }}>10-Jul-2026</span></td>
            </tr>
            <tr>
              <td colSpan={2} className="bold text-center">Name and address of the Employer/Specified Bank</td>
              <td colSpan={2} className="bold text-center">Name and address of the Employee/Specified senior citizen</td>
            </tr>
            <tr>
              <td colSpan={2} style={{ height: '80px' }}>
                {d.employerName}<br />
                {d.employerAddress}<br />
                <br />
                fo@iipe.ac.in
              </td>
              <td colSpan={2}>
                {d.employeeName}<br />
                {d.employeeAddress}
              </td>
            </tr>
            <tr>
              <td className="bold text-center" style={{ width: '25%' }}>PAN of the Deductor</td>
              <td className="bold text-center" style={{ width: '25%' }}>TAN of the Deductor</td>
              <td colSpan={2} className="bold text-center" style={{ width: '50%' }}>PAN of the Employee/Specified senior citizen</td>
            </tr>
            <tr>
              <td className="text-center">{d.employerPAN}</td>
              <td className="text-center">{d.employerTAN}</td>
              <td colSpan={2} className="text-center">{d.employeePAN}</td>
            </tr>
            <tr>
              <td colSpan={2} className="bold text-center">CIT (TDS)</td>
              <td className="bold text-center">Assessment Year</td>
              <td className="bold text-center">Period with the Employer</td>
            </tr>
            <tr>
              <td colSpan={2} className="text-center valign-middle">
                The Commissioner of Income Tax (TDS)<br />
                Room No. 411, Income Tax Towers, 10-2-3 A.C. Guard,<br />
                Hyderabad - 500004
              </td>
              <td className="text-center valign-middle">{d.assessmentYear}</td>
              <td style={{ padding: 0 }}>
                <table style={{ width: '100%', height: '100%', borderCollapse: 'collapse', border: 'none' }}>
                  <tbody>
                    <tr>
                      <td className="bold text-center" style={{ border: 'none', borderRight: '1px solid #000', borderBottom: '1px solid #000', width: '50%' }}>From</td>
                      <td className="bold text-center" style={{ border: 'none', borderBottom: '1px solid #000', width: '50%' }}>To</td>
                    </tr>
                    <tr>
                      <td className="text-center valign-middle" style={{ border: 'none', borderRight: '1px solid #000', height: '40px' }}>01-Apr-{d.assessmentYear?.split('-')[0] ? parseInt(d.assessmentYear.split('-')[0]) - 1 : '2025'}</td>
                      <td className="text-center valign-middle" style={{ border: 'none' }}>31-Mar-{d.assessmentYear?.split('-')[0] || '2026'}</td>
                    </tr>
                  </tbody>
                </table>
              </td>
            </tr>
          </tbody>
        </table>

        <div className="text-right" style={{ fontSize: '11px', margin: '5px 0' }}>Annexure - I</div>
        <table className="f16-table" style={{ borderTop: '1px solid #000' }}>
          <tbody>
            <tr>
              <td colSpan={4} className="bold text-left" style={{ borderBottom: '1px solid #000' }}>Details of Salary Paid and any other income and tax deducted</td>
            </tr>
            <tr>
              <td className="text-center" style={{ width: '5%' }}>A</td>
              <td style={{ width: '65%' }}>Whether opting out of taxation u/s 115BAC(1A)?</td>
              <td colSpan={2} className="text-center">{optedOut}</td>
            </tr>
            <tr>
              <td className="text-center">1.</td>
              <td>Gross Salary</td>
              <td className="text-center" style={{ width: '15%' }}>Rs.</td>
              <td className="text-center" style={{ width: '15%' }}>Rs.</td>
            </tr>
            <tr>
              <td className="text-center">(a)</td>
              <td>Salary as per provisions contained in section 17(1)</td>
              <td className="text-right">{fmt(d.grossSalary)}</td>
              <td></td>
            </tr>
            <tr>
              <td className="text-center">(b)</td>
              <td>Value of perquisites under section 17(2) (as per Form No. 12BA, wherever applicable)</td>
              <td className="text-right">0.00</td>
              <td></td>
            </tr>
            <tr>
              <td className="text-center">(c)</td>
              <td>Profits in lieu of salary under section 17(3) (as per Form No. 12BA, wherever applicable)</td>
              <td className="text-right">0.00</td>
              <td></td>
            </tr>
            <tr>
              <td className="text-center">(d)</td>
              <td>Total</td>
              <td></td>
              <td className="text-right">{fmt(d.grossSalary)}</td>
            </tr>
            <tr>
              <td className="text-center">(e)</td>
              <td>Reported total amount of salary received from other employer(s)</td>
              <td></td>
              <td className="text-right">0.00</td>
            </tr>
            <tr>
              <td className="text-center">2.</td>
              <td colSpan={3}>Less: Allowances to the extent exempt under section 10</td>
            </tr>
            <tr>
              <td className="text-center">(a)</td>
              <td>Travel concession or assistance under section 10(5)</td>
              <td className="text-right">0.00</td>
              <td></td>
            </tr>
            <tr>
              <td className="text-center">(b)</td>
              <td>Death-cum-retirement gratuity under section 10(10)</td>
              <td className="text-right">0.00</td>
              <td></td>
            </tr>
            <tr>
              <td className="text-center">(c)</td>
              <td>Commuted value of pension under section 10(10A)</td>
              <td className="text-right">0.00</td>
              <td></td>
            </tr>
            <tr>
              <td className="text-center">(d)</td>
              <td>Cash equivalent of leave salary encashment under section 10 (10AA)</td>
              <td className="text-right">0.00</td>
              <td></td>
            </tr>
            <tr>
              <td className="text-center">(e)</td>
              <td>House rent allowance under section 10(13A)</td>
              <td className="text-right">{fmt(d.allowancesExemptUpto10)}</td>
              <td></td>
            </tr>
            <tr>
              <td className="text-center">(f)</td>
              <td>Other special allowances under section 10(14)</td>
              <td className="text-right">0.00</td>
              <td></td>
            </tr>
            <tr>
              <td className="text-center">(g)</td>
              <td>Amount of any other exemption under section 10<br/><span className="bold">[Note: Break-up to be prepared by employer and issued to the employee, where applicable, before furnishing of Part B to the employee]</span></td>
              <td className="text-right">0.00</td>
              <td></td>
            </tr>
            <tr>
              <td className="text-center">(h)</td>
              <td>Total amount of any other exemption under section 10</td>
              <td className="text-right">0.00</td>
              <td></td>
            </tr>
            <tr>
              <td className="text-center">(i)</td>
              <td>Total amount of exemption claimed under section 10<br/>[2(a)+2(b)+2(c)+2(d)+2(e)+2(f)+2(h)]</td>
              <td></td>
              <td className="text-right">{fmt(d.allowancesExemptUpto10)}</td>
            </tr>
            <tr>
              <td className="text-center">3.</td>
              <td>Total amount of salary received from current employer<br/>[1(d)-2(i)]</td>
              <td></td>
              <td className="text-right">{fmt((d.grossSalary || 0) - (d.allowancesExemptUpto10 || 0))}</td>
            </tr>
          </tbody>
        </table>
        <div className="text-center" style={{ fontSize: '11px', marginTop: '10px' }}>Page 1 of 3</div>
      </div>

      {/* ========================================= PART B (Page 2) ========================================= */}
      <div className="f16-page">
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', marginBottom: '5px' }}>
          <div><span className="bold">Certificate Number: </span>ACORZOA</div>
          <div><span className="bold">TAN of Employer: </span>{d.employerTAN}</div>
          <div><span className="bold">PAN of Employee: </span>{d.employeePAN}</div>
          <div><span className="bold">Assessment Year: </span>{d.assessmentYear}</div>
        </div>
        <table className="f16-table">
          <tbody>
            <tr>
              <td className="text-center" style={{ width: '5%' }}>4.</td>
              <td colSpan={3}>Less: Deductions under section 16</td>
            </tr>
            <tr>
              <td className="text-center">(a)</td>
              <td style={{ width: '65%' }}>Standard deduction under section 16(ia)</td>
              <td className="text-right" style={{ width: '15%' }}>{fmt(d.standardDeduction)}</td>
              <td style={{ width: '15%' }}></td>
            </tr>
            <tr>
              <td className="text-center">(b)</td>
              <td>Entertainment allowance under section 16(ii)</td>
              <td className="text-right">0.00</td>
              <td></td>
            </tr>
            <tr>
              <td className="text-center">(c)</td>
              <td>Tax on employment under section 16(iii)</td>
              <td className="text-right">{fmt(d.professionalTax)}</td>
              <td></td>
            </tr>
            <tr>
              <td className="text-center">5.</td>
              <td>Total amount of deductions under section 16 [4(a)+4(b)+4(c)]</td>
              <td></td>
              <td className="text-right">{fmt((d.standardDeduction || 0) + (d.professionalTax || 0))}</td>
            </tr>
            <tr>
              <td className="text-center">6.</td>
              <td>Income chargeable under the head "Salaries" [(3+1(e)-5]</td>
              <td></td>
              <td className="text-right">{fmt(d.incomeChargeableUnderSalaries)}</td>
            </tr>
            <tr>
              <td className="text-center">7.</td>
              <td colSpan={3}>Add: Any other income reported by the employee under as per section 192 (2B)</td>
            </tr>
            <tr>
              <td className="text-center">(a)</td>
              <td>Income (or admissible loss) from house property reported by employee offered for TDS</td>
              <td className="text-right">0.00</td>
              <td></td>
            </tr>
            <tr>
              <td className="text-center">(b)</td>
              <td>Income under the head Other Sources offered for TDS</td>
              <td className="text-right">0.00</td>
              <td></td>
            </tr>
            <tr>
              <td className="text-center">8.</td>
              <td>Total amount of other income reported by the employee<br/>[7(a)+7(b)]</td>
              <td></td>
              <td className="text-right">0.00</td>
            </tr>
            <tr>
              <td className="text-center">9.</td>
              <td className="bold">Gross total income (6+8)</td>
              <td></td>
              <td className="bold text-right">{fmt(d.incomeChargeableUnderSalaries)}</td>
            </tr>
            <tr>
              <td className="text-center">10.</td>
              <td>Deductions under Chapter VI-A</td>
              <td className="text-center">Gross Amount</td>
              <td className="text-center">Deductible Amount</td>
            </tr>
            <tr>
              <td className="text-center">(a)</td>
              <td>Deduction in respect of life insurance premia, contributions to provident fund etc. under section 80C</td>
              <td className="text-right">{fmt(d.deduction80C)}</td>
              <td className="text-right">{fmt(d.deduction80C)}</td>
            </tr>
            <tr>
              <td className="text-center">(b)</td>
              <td>Deduction in respect of contribution to certain pension funds under section 80CCC</td>
              <td className="text-right">0.00</td>
              <td className="text-right">0.00</td>
            </tr>
            <tr>
              <td className="text-center">(c)</td>
              <td>Deduction in respect of contribution by taxpayer to pension scheme under section 80CCD (1)</td>
              <td className="text-right">0.00</td>
              <td className="text-right">0.00</td>
            </tr>
            <tr>
              <td className="text-center">(d)</td>
              <td>Total deduction under section 80C, 80CCC and 80CCD(1)</td>
              <td className="text-right">{fmt(d.deduction80C)}</td>
              <td className="text-right">{fmt(d.deduction80C)}</td>
            </tr>
            <tr>
              <td className="text-center">(e)</td>
              <td>Deductions in respect of amount paid/deposited to notified pension scheme under section 80CCD (1B)</td>
              <td className="text-right">0.00</td>
              <td className="text-right">0.00</td>
            </tr>
            <tr>
              <td className="text-center">(f)</td>
              <td>Deduction in respect of contribution by Employer to pension scheme under section 80CCD (2)</td>
              <td className="text-right">0.00</td>
              <td className="text-right">0.00</td>
            </tr>
            <tr>
              <td className="text-center">(g)</td>
              <td>Deduction in respect of health insurance premia under section 80D</td>
              <td className="text-right">{fmt(d.deduction80D)}</td>
              <td className="text-right">{fmt(d.deduction80D)}</td>
            </tr>
            <tr>
              <td className="text-center">(h)</td>
              <td>Deduction in respect of interest on loan taken for higher education under section 80E</td>
              <td className="text-right">0.00</td>
              <td className="text-right">0.00</td>
            </tr>
            <tr>
              <td className="text-center">(i)</td>
              <td>Deduction in respect of contribution by the employee to Agnipath Scheme under section 80CCH</td>
              <td className="text-right">0.00</td>
              <td className="text-right">0.00</td>
            </tr>
            <tr>
              <td className="text-center">(j)</td>
              <td>Deduction in respect of contribution by the Central Government to Agnipath Scheme under section 80CCH</td>
              <td className="text-right">0.00</td>
              <td className="text-right">0.00</td>
            </tr>
          </tbody>
        </table>
        <div className="text-center" style={{ fontSize: '11px', marginTop: '10px' }}>Page 2 of 3</div>
      </div>

      {/* ========================================= PART B (Page 3) ========================================= */}
      <div className="f16-page">
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', marginBottom: '5px' }}>
          <div><span className="bold">Certificate Number: </span>ACORZOA</div>
          <div><span className="bold">TAN of Employer: </span>{d.employerTAN}</div>
          <div><span className="bold">PAN of Employee: </span>{d.employeePAN}</div>
          <div><span className="bold">Assessment Year: </span>{d.assessmentYear}</div>
        </div>
        <table className="f16-table">
          <tbody>
            <tr>
              <td className="text-center" style={{ width: '5%', borderTop: 'none' }}></td>
              <td style={{ width: '65%', borderTop: 'none' }}></td>
              <td className="text-center" style={{ width: '15%' }}>Gross Amount</td>
              <td className="text-center" style={{ width: '15%' }}>Qualifying Amount</td>
              <td className="text-center" style={{ width: '15%' }}>Deductible Amount</td>
            </tr>
            <tr>
              <td className="text-center">(k)</td>
              <td>Total Deduction in respect of donations to certain funds, charitable institutions, etc. under section 80G</td>
              <td className="text-right">0.00</td>
              <td className="text-right">0.00</td>
              <td className="text-right">0.00</td>
            </tr>
            <tr>
              <td className="text-center">(l)</td>
              <td>Deduction in respect of interest on deposits in savings account under section 80TTA</td>
              <td className="text-right">0.00</td>
              <td className="text-right">0.00</td>
              <td className="text-right">0.00</td>
            </tr>
            <tr>
              <td className="text-center">(m)</td>
              <td colSpan={4}>Amount Deductible under any other provision (s) of Chapter VI-A<br/><span className="bold">[Note: Break-up to be prepared by employer and issued to the employee, where applicable , before furnishing of Part B to the employee]</span></td>
            </tr>
            <tr>
              <td className="text-center">(n)</td>
              <td>Total of amount deductible under any other provision(s) of Chapter VI-A</td>
              <td className="text-right">0.00</td>
              <td className="text-right">0.00</td>
              <td className="text-right">0.00</td>
            </tr>
            <tr>
              <td className="text-center">11.</td>
              <td colSpan={3}>Aggregate of deductible amount under Chapter VI-A<br/>[10(d)+10(e)+10(f)+10(g)+10(h)+10(i)+10(j)+10(k)+10(l)+10(n)]</td>
              <td className="text-right">{fmt(d.totalChapterVIADeductions)}</td>
            </tr>
            <tr>
              <td className="text-center">12.</td>
              <td colSpan={3} className="bold">Total taxable income (9-11)</td>
              <td className="bold text-right">{fmt(d.totalTaxableIncome)}</td>
            </tr>
            <tr>
              <td className="text-center">13.</td>
              <td colSpan={3}>Tax on total income</td>
              <td className="text-right">{fmt(d.taxOnTotalIncome)}</td>
            </tr>
            <tr>
              <td className="text-center">14.</td>
              <td colSpan={3}>Rebate under section 87A, if applicable</td>
              <td className="text-right">{fmt(d.rebate87A)}</td>
            </tr>
            <tr>
              <td className="text-center">15.</td>
              <td colSpan={3}>Surcharge, wherever applicable</td>
              <td className="text-right">{fmt(d.surcharge)}</td>
            </tr>
            <tr>
              <td className="text-center">16.</td>
              <td colSpan={3}>Health and education cess</td>
              <td className="text-right">{fmt(d.healthAndEducationCess)}</td>
            </tr>
            <tr>
              <td className="text-center">17.</td>
              <td colSpan={3}>Tax payable (13+15+16-14)</td>
              <td className="text-right">{fmt(d.totalTaxPayable)}</td>
            </tr>
            <tr>
              <td className="text-center">18.</td>
              <td colSpan={3}>Less: Relief under section 89 (attach details)</td>
              <td className="text-right">0.00</td>
            </tr>
            <tr>
              <td className="text-center">19.</td>
              <td colSpan={3}>Less: Tax deducted at source as per Form No. 12BAA submitted under provisions of section 192(2B)</td>
              <td className="text-right" rowSpan={2} style={{ verticalAlign: 'middle' }}>0.00</td>
            </tr>
            <tr>
              <td className="text-center">20.</td>
              <td colSpan={3}>Less: Tax collected at source as per Form No. 12BAA submitted under provisions of section 192(2B)</td>
            </tr>
            <tr>
              <td className="text-center">21.</td>
              <td colSpan={3} className="bold">Net tax payable (17-18-19-20)</td>
              <td className="bold text-right">{fmt(d.taxPayableOrRefundable)}</td>
            </tr>
          </tbody>
        </table>

        <div style={{ marginTop: '30px', fontSize: '11px' }}>
          <div className="bold text-center" style={{ marginBottom: '10px', fontSize: '12px', border: '1px solid #000', padding: '4px' }}>Verification</div>
          <div style={{ border: '1px solid #000', borderTop: 'none', padding: '8px' }}>
            <p style={{ textAlign: 'justify', lineHeight: '1.5', margin: 0 }}>
              I, <span className="bold">SHALIVAHAN</span>, son/daughter of <span className="bold">SURESH PANDEY KUMAR SINHA</span> .Working in the capacity of <span className="bold">AUTHORISED SIGNATORY</span> (Designation) do hereby certify that the information given above is true, complete and correct and is based on the books of account, documents, TDS statements, and other available records.
            </p>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              <tr>
                <td style={{ width: '50%', border: '1px solid #000', borderTop: 'none', padding: '8px', verticalAlign: 'top' }}>
                  <div style={{ marginBottom: '20px' }}><span className="bold">Place</span><span style={{ marginLeft: '40px' }}>Visakhapatnam</span></div>
                  <div><span className="bold">Date</span><span style={{ marginLeft: '45px' }}>10-Jul-2026</span></div>
                </td>
                <td style={{ width: '50%', border: '1px solid #000', borderTop: 'none', padding: '8px', textAlign: 'center', verticalAlign: 'bottom' }}>
                  <div style={{ marginBottom: '5px' }}>(Signature of person responsible for deduction of tax)</div>
                  <div style={{ borderTop: '1px solid #000', paddingTop: '5px', textAlign: 'left' }}>
                    <span className="bold">Full<br/>Name: </span><span style={{ marginLeft: '20px' }}>SHALIVAHAN</span>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="text-center" style={{ fontSize: '11px', marginTop: '10px' }}>Page 3 of 3</div>
      </div>

    </div>
  );
};

export default Form16Portal;
