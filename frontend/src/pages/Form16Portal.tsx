import React, { useContext, useEffect, useState } from 'react';
import { UserContext } from '../App';
import api from '../services/api';

const Form16Portal: React.FC = () => {
  const userCtx = useContext(UserContext);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form16Data, setForm16Data] = useState<any>({});

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

  if (loading) return <div className="page-container">Loading...</div>;
  if (error) return <div className="page-container" style={{ color: 'red' }}>{error}</div>;

  return (
    <div className="page-container" style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <style>{`
        .form16-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 20px;
          font-size: 11px;
        }
        .form16-table th, .form16-table td {
          border: 1px solid #000;
          padding: 4px 8px;
        }
        .text-center { text-align: center; }
        .text-right { text-align: right; }
        .bold { font-weight: bold; }
        .form16-header {
          text-align: center;
          margin-bottom: 20px;
        }
        .form16-header h3 {
          margin: 0;
          font-size: 16px;
        }
        .a4-page {
          background: white;
          padding: 40px;
          box-shadow: 0 0 10px rgba(0,0,0,0.1);
          margin-bottom: 30px;
          color: black;
          font-family: Arial, sans-serif;
          min-height: 1123px; /* approximate A4 height */
        }
        @media print {
          body {
            background: white;
          }
          .page-container {
            margin: 0;
            padding: 0;
            max-width: none;
            box-shadow: none;
          }
          .a4-page {
            box-shadow: none;
            margin: 0;
            padding: 0;
            page-break-after: always;
            min-height: auto;
          }
          /* Hide app navigation/headers if they exist during print */
          header, nav, .sidebar, .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div className="no-print" style={{ textAlign: 'center', marginBottom: '20px' }}>
        <button onClick={() => window.print()} style={{ padding: '10px 20px', cursor: 'pointer', background: '#2563eb', color: 'white', border: 'none', borderRadius: '4px' }}>
          Print Form 16
        </button>
      </div>

      {/* PART A */}
      <div className="a4-page">
        <div className="form16-header">
          <h3>FORM NO. 16</h3>
          <p style={{ fontWeight: 'normal', margin: '5px 0' }}>[See rule 31(1)(a)]</p>
          <h3>PART A</h3>
          <p style={{ fontSize: '11px', marginTop: '10px' }}>Certificate under section 203 of the Income-tax Act, 1961 for tax deducted at source on salary</p>
        </div>

        <table className="form16-table">
          <tbody>
            <tr>
              <td colSpan={2} style={{ width: '50%', verticalAlign: 'top' }}>
                <div className="bold">Name and address of the Employer</div>
                <div style={{ marginTop: '10px', height: '40px' }}>{form16Data.employerName || 'IIPM'}<br/>{form16Data.employerAddress || 'Address'}</div>
              </td>
              <td colSpan={2} style={{ width: '50%', verticalAlign: 'top' }}>
                <div className="bold">Name and address of the Employee</div>
                <div style={{ marginTop: '10px', height: '40px' }}>{form16Data.employeeName || 'Employee Name'}<br/>{form16Data.employeeAddress || ''}</div>
              </td>
            </tr>
            <tr>
              <td style={{ width: '25%' }} className="bold">PAN of the Deductor</td>
              <td style={{ width: '25%' }} className="bold">TAN of the Deductor</td>
              <td colSpan={2} className="bold">PAN of the Employee</td>
            </tr>
            <tr>
              <td>{form16Data.employerPAN || '-'}</td>
              <td>{form16Data.employerTAN || '-'}</td>
              <td colSpan={2}>{form16Data.employeePAN || '-'}</td>
            </tr>
            <tr>
              <td colSpan={2}>
                <div className="bold">CIT (TDS)</div>
                <div style={{ marginTop: '10px' }}>-</div>
              </td>
              <td style={{ width: '25%' }}>
                <div className="bold">Assessment Year</div>
                <div style={{ marginTop: '10px' }}>{form16Data.assessmentYear || '2025-26'}</div>
              </td>
              <td style={{ width: '25%' }}>
                <div className="bold">Period with Employer</div>
                <div style={{ marginTop: '10px' }}>From: 01-Apr-2024 To: 31-Mar-2025</div>
              </td>
            </tr>
          </tbody>
        </table>

        <div className="bold" style={{ fontSize: '11px', marginBottom: '5px' }}>Summary of amount paid/credited and tax deducted at source thereon in respect of the employee</div>
        <table className="form16-table">
          <thead>
            <tr>
              <th className="text-center">Quarter(s)</th>
              <th className="text-center">Receipt Numbers of original statements of TDS under sub-section (3) of Section 200</th>
              <th className="text-center">Amount paid/credited (Rs.)</th>
              <th className="text-center">Amount of tax deducted (Rs.)</th>
              <th className="text-center">Amount of tax deposited/remitted (Rs.)</th>
            </tr>
          </thead>
          <tbody>
            {(form16Data.quarterlyTdsList || []).map((q: any, i: number) => (
              <tr key={i}>
                <td className="text-center">{q.quarter}</td>
                <td>{q.receiptNumber}</td>
                <td>{q.amountPaid}</td>
                <td>{q.taxDeducted}</td>
                <td>{q.taxDeposited}</td>
              </tr>
            ))}
            <tr>
              <td colSpan={2} className="bold text-right">Total (Rs.)</td>
              <td></td>
              <td></td>
              <td>{form16Data.totalTdsDeposited || 0}</td>
            </tr>
          </tbody>
        </table>

        <div className="bold" style={{ fontSize: '11px', marginBottom: '5px', marginTop: '20px' }}>I. DETAILS OF TAX DEDUCTED AND DEPOSITED IN THE CENTRAL GOVERNMENT ACCOUNT THROUGH CHALLAN</div>
        <table className="form16-table">
          <thead>
            <tr>
              <th rowSpan={2} className="text-center">Sl. No.</th>
              <th rowSpan={2} className="text-center">Tax Deposited in respect of the employee (Rs.)</th>
              <th colSpan={3} className="text-center">Challan Identification Number (CIN)</th>
            </tr>
            <tr>
              <th className="text-center">BSR Code of the Bank Branch</th>
              <th className="text-center">Date on which tax deposited</th>
              <th className="text-center">Challan Serial Number</th>
            </tr>
          </thead>
          <tbody>
            {(form16Data.challanDetails || []).map((c: any, i: number) => (
              <tr key={i}>
                <td className="text-center">{i + 1}</td>
                <td>{c.amount}</td>
                <td>{c.bsrCode}</td>
                <td>{c.dateOfDeposit}</td>
                <td>{c.challanSerialNumber}</td>
              </tr>
            ))}
            <tr>
              <td className="bold text-right" colSpan={1}>Total (Rs.)</td>
              <td className="bold">{form16Data.totalTdsDeposited || 0}</td>
              <td colSpan={3}></td>
            </tr>
          </tbody>
        </table>

        <div style={{ marginTop: '30px' }}>
          <div className="bold text-center" style={{ marginBottom: '10px' }}>Verification</div>
          <p>
            I, _________________________, son/daughter of _________________________ working in the capacity of _________________________ 
            (designation) do hereby certify that a sum of Rs. {form16Data.totalTdsDeposited || 0} [Rupees __________________________________________________ (in words)] 
            has been deducted and deposited to the credit of the Central Government. I further certify that the information given above is true, 
            complete and correct and is based on the books of account, documents, TDS statements, TDS deposited and other available records.
          </p>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '40px' }}>
            <div>
              Place: _________________________<br/><br/>
              Date: _________________________
            </div>
            <div className="text-center">
              ___________________________________________<br/>
              Signature of person responsible for deduction of tax<br/><br/>
              Full Name: _________________________
            </div>
          </div>
        </div>
      </div>

      {/* PART B */}
      <div className="a4-page">
        <div className="form16-header">
          <h3>PART B</h3>
          <p style={{ fontWeight: 'normal', margin: '5px 0' }}>Annexure to Form No. 16</p>
          <div className="bold" style={{ textAlign: 'left', marginTop: '10px' }}>Details of Salary paid and any other income and tax deducted</div>
        </div>

        <table className="form16-table">
          <tbody>
            <tr>
              <td style={{ width: '5%' }}>1.</td>
              <td style={{ width: '65%' }} className="bold">Gross Salary</td>
              <td style={{ width: '15%' }}></td>
              <td style={{ width: '15%' }}></td>
            </tr>
            <tr>
              <td></td>
              <td>(a) Salary as per provisions contained in sec. 17(1)</td>
              <td>Rs. {form16Data.grossSalary || 0}</td>
              <td></td>
            </tr>
            <tr>
              <td></td>
              <td>(b) Value of perquisites u/s 17(2)</td>
              <td>Rs. 0</td>
              <td></td>
            </tr>
            <tr>
              <td></td>
              <td>(c) Profits in lieu of salary u/s 17(3)</td>
              <td>Rs. 0</td>
              <td></td>
            </tr>
            <tr>
              <td></td>
              <td>(d) Total</td>
              <td></td>
              <td>Rs. {form16Data.grossSalary || 0}</td>
            </tr>
            <tr>
              <td>2.</td>
              <td>Less: Allowances to the extent exempt u/s 10 (HRA)</td>
              <td></td>
              <td>Rs. {form16Data.allowancesExemptUpto10 || 0}</td>
            </tr>
            <tr>
              <td>3.</td>
              <td className="bold">Balance (1-2)</td>
              <td></td>
              <td className="bold">Rs. {form16Data.balance || form16Data.grossSalary || 0}</td>
            </tr>
            <tr>
              <td>4.</td>
              <td>Deductions under Section 16</td>
              <td></td>
              <td></td>
            </tr>
            <tr>
              <td></td>
              <td>(a) Standard deduction u/s 16(ia)</td>
              <td>Rs. {form16Data.standardDeduction || 50000}</td>
              <td></td>
            </tr>
            <tr>
              <td></td>
              <td>(b) Entertainment allowance u/s 16(ii)</td>
              <td>Rs. 0</td>
              <td></td>
            </tr>
            <tr>
              <td></td>
              <td>(c) Tax on employment u/s 16(iii)</td>
              <td>Rs. {form16Data.professionalTax || 0}</td>
              <td></td>
            </tr>
            <tr>
              <td>5.</td>
              <td className="bold">Aggregate of 4 (a to c)</td>
              <td></td>
              <td>Rs. {(form16Data.standardDeduction || 50000) + (form16Data.professionalTax || 0)}</td>
            </tr>
            <tr>
              <td>6.</td>
              <td className="bold">Income chargeable under the head 'Salaries' (3-5)</td>
              <td></td>
              <td className="bold">Rs. {form16Data.incomeChargeableUnderSalaries || 0}</td>
            </tr>
            <tr>
              <td>7.</td>
              <td>Add: Any other income reported by the employee</td>
              <td></td>
              <td>Rs. {form16Data.anyOtherIncome || 0}</td>
            </tr>
            <tr>
              <td>8.</td>
              <td className="bold">Gross Total Income (6+7)</td>
              <td></td>
              <td className="bold">Rs. {form16Data.grossTotalIncome || form16Data.incomeChargeableUnderSalaries || 0}</td>
            </tr>
            <tr>
              <td>9.</td>
              <td>Deductions under Chapter VI-A</td>
              <td></td>
              <td></td>
            </tr>
            <tr>
              <td></td>
              <td>(a) Section 80C, 80CCC and 80CCD(1)</td>
              <td>Rs. {form16Data.deduction80C || 0}</td>
              <td></td>
            </tr>
            <tr>
              <td></td>
              <td>(b) Section 80D</td>
              <td>Rs. {form16Data.deduction80D || 0}</td>
              <td></td>
            </tr>
            <tr>
              <td>10.</td>
              <td className="bold">Aggregate of deductible amount under Chapter VI-A</td>
              <td></td>
              <td>Rs. {form16Data.totalChapterVIADeductions || 0}</td>
            </tr>
            <tr>
              <td>11.</td>
              <td className="bold">Total Income (8-10)</td>
              <td></td>
              <td className="bold">Rs. {form16Data.totalTaxableIncome || 0}</td>
            </tr>
            <tr>
              <td>12.</td>
              <td>Tax on total income</td>
              <td></td>
              <td>Rs. {form16Data.taxOnTotalIncome || 0}</td>
            </tr>
            <tr>
              <td>13.</td>
              <td>Rebate u/s 87A, if applicable</td>
              <td></td>
              <td>Rs. {form16Data.rebate87A || 0}</td>
            </tr>
            <tr>
              <td>14.</td>
              <td>Surcharge, wherever applicable</td>
              <td></td>
              <td>Rs. {form16Data.surcharge || 0}</td>
            </tr>
            <tr>
              <td>15.</td>
              <td>Health and Education Cess</td>
              <td></td>
              <td>Rs. {form16Data.healthAndEducationCess || 0}</td>
            </tr>
            <tr>
              <td>16.</td>
              <td className="bold">Tax Payable (12+14+15-13)</td>
              <td></td>
              <td className="bold">Rs. {form16Data.totalTaxPayable || 0}</td>
            </tr>
            <tr>
              <td>17.</td>
              <td>Less: Relief under section 89</td>
              <td></td>
              <td>Rs. 0</td>
            </tr>
            <tr>
              <td>18.</td>
              <td className="bold">Net tax payable (16-17)</td>
              <td></td>
              <td className="bold">Rs. {form16Data.taxPayableOrRefundable || 0}</td>
            </tr>
          </tbody>
        </table>
        
        <div style={{ marginTop: '30px' }}>
          <div className="bold text-center" style={{ marginBottom: '10px' }}>Verification</div>
          <p>
            I, _________________________, son/daughter of _________________________ working in the capacity of _________________________ 
            (designation) do hereby certify that the information given above is true, complete and correct and is based on the books of account, 
            documents, TDS statements, and other available records.
          </p>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '40px' }}>
            <div>
              Place: _________________________<br/><br/>
              Date: _________________________
            </div>
            <div className="text-center">
              ___________________________________________<br/>
              Signature of person responsible for deduction of tax<br/><br/>
              Full Name: _________________________
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Form16Portal;
