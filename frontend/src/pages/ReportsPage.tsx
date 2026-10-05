import React, { useState, useEffect, useContext } from 'react';
import * as XLSX from 'xlsx';
import apiService from '../services/api';
import { UserContext } from '../App';
import { formatEmployeeNameWithTitle } from '../utils/nameUtils';
import { printForm16Document } from '../utils/form16Print';

const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const shortMonths = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const numberToWordsINR = (num: number): string => {
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

const ReportsPage: React.FC = () => {
  const userCtx = useContext(UserContext);
  const [tab, setTab] = useState<'register' | 'bank' | 'projection' | 'nps' | 'tds' | 'dept' | 'ytd' | 'comparison'>('register');
  const [bankCategoryFilter, setBankCategoryFilter] = useState<'all' | 'teaching' | 'non_teaching' | 'contract'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'draft'>('all');
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [userId, setUserId] = useState<string>('');
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const getEmployeeCategory = (p: any): 'teaching' | 'non_teaching' | 'contract' => {
    const eid = (p.employeeId || '').toUpperCase().trim();
    const empType = (p.employeeType || p.staffFunction || p.function || '').toUpperCase();
    const desig = (p.designation || '').toUpperCase();
    const payLevel = (p.payLevel || '').toUpperCase();

    // 1) TS is ALWAYS Teaching (Regular - Teaching)
    if (eid.startsWith('TS')) {
      return 'teaching';
    }

    // 2) NT, NTS, DIR are ALWAYS Non-Teaching (Regular - Non Teaching)
    if (eid.startsWith('NT') || eid.startsWith('NTS') || eid.startsWith('DIR')) {
      return 'non_teaching';
    }

    // 3) Contract: CNT, CT, CMED prefixes or explicit contract employment
    if (
      eid.startsWith('CNT') || 
      eid.startsWith('CT') || 
      eid.startsWith('CMED') || 
      empType.includes('CONTRACT') || 
      desig.includes('CONTRACT') || 
      payLevel.includes('CONSOLIDATED') ||
      payLevel.includes('FIXED')
    ) {
      return 'contract';
    }

    // Fallback based on designation/function
    if (desig.includes('PROFESSOR') || empType.includes('TEACHING')) {
      return 'teaching';
    }

    return 'non_teaching';
  };

  const getCategoryLabel = (cat: 'teaching' | 'non_teaching' | 'contract' | 'all') => {
    if (cat === 'teaching') return '1) Regular - Teaching';
    if (cat === 'non_teaching') return '2) Regular - Non Teaching';
    if (cat === 'contract') return '3) Contract';
    return 'All Categories (Consolidated)';
  };

  const tabList = [
    { key: 'register', label: '📋 Salary Register' },
    { key: 'bank', label: '💳 Bank Payment Sheet' },
    { key: 'projection', label: '📊 TDS Projection Statement' },
    { key: 'nps', label: '🏛️ NPS Schedule' },
    { key: 'tds', label: '📑 TDS Summary' },
    { key: 'dept', label: '🏢 Department-wise' },
    { key: 'ytd', label: '📈 My YTD Summary' },
    { key: 'comparison', label: '⚖️ Salary Comparison' },
  ] as const;

  const [signatures, setSignatures] = useState({
    preparedBy: 'S.SIRISHA',
    verifiedBy1: 'Y RAMA RAO',
    verifiedBy2: 'DR. B.MURALI KRISHNA',
    approvedBy: 'SHRI.RAM PHAL DWIVEDI'
  });

  const normalizeBankName = (bank?: string) => {
    if (!bank) return 'State Bank of India';
    return bank.replace(/\s*\(India\)/gi, '').trim();
  };

  useEffect(() => {
    apiService.getAllUsers().then(res => setEmployees(res)).catch(console.error);
  }, []);

  const loadReport = async () => {
    setLoading(true); setData(null); setMsg(null);
    try {
      let userList = employees;
      if (!userList || userList.length === 0) {
        try {
          const res = await apiService.getAllUsers();
          if (Array.isArray(res) && res.length > 0) {
            userList = res;
            setEmployees(res);
          }
        } catch (err) {
          console.error('Error fetching users in loadReport:', err);
        }
      }

      let result: any;
      if (tab === 'register' || tab === 'bank') result = await apiService.getSalaryRegister(month, year);
      else if (tab === 'projection') result = await apiService.getAllTdsProjections(year);
      else if (tab === 'nps')  result = await apiService.getNPSReport(year);
      else if (tab === 'tds')  result = await apiService.getTDSReport(year);
      else if (tab === 'dept') result = await apiService.getDepartmentReport(month, year);
      else if (tab === 'ytd')  result = await apiService.getYTDReport(userId || 'all', year);
      else if (tab === 'comparison') {
        if (!userId) { setLoading(false); return; }
        result = await apiService.getSalaryComparison(userId);
      }
      // For register and bank, attach user details to payroll data
      if ((tab === 'register' || tab === 'bank') && (result?.data || result)) {
        const payload = result.data || result;
        payload.payrolls = payload.payrolls?.map((p: any) => {
          const emp = userList?.find((e: any) => e.employeeId === p.employeeId || e.id === p.userId);
          const fullName = formatEmployeeNameWithTitle(p, emp);
          const rawBank = p.bankName || emp?.bankName || 'State Bank of India';
          return { 
            ...p, 
            employeeName: fullName,
            designation: p.designation || emp?.designation || '-', 
            payLevel: p.payLevel || emp?.payLevel || '10', 
            staffFunction: p.staffFunction || emp?.function || emp?.employeeType || '',
            bankName: normalizeBankName(rawBank),
            bankAccountNumber: p.bankAccountNumber || emp?.bankAccountNumber || '-',
            ifscCode: p.ifscCode || emp?.ifscCode || 'SBIN0003170'
          };
        });
        setData(payload);
      } else {
        setData(result?.data || result);
      }
    } catch (e: any) {
      setMsg(e.response?.data?.message || 'Failed to load report.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadReport(); }, [tab]);

  const fmt = (n: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);
  const fmtN = (n: number) => new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(n || 0);

  const isStatusMatch = (status: string | undefined, filter: 'all' | 'pending' | 'approved' | 'draft') => {
    if (filter === 'all') return true;
    const s = (status || '').toUpperCase().trim();
    if (filter === 'pending') return s === 'PENDING' || s === 'SUBMITTED';
    if (filter === 'approved') return s === 'APPROVED' || s === 'RELEASED';
    if (filter === 'draft') return s === 'DRAFT';
    return true;
  };

  const getStatusBadge = (status: string | undefined) => {
    const s = (status || '').toUpperCase().trim();
    if (s === 'APPROVED' || s === 'RELEASED') {
      return (
        <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '3px 9px', borderRadius: '12px', background: '#dcfce7', color: '#166534', border: '1px solid #bbf7d0', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
          ✅ {s === 'RELEASED' ? 'Released' : 'Approved'}
        </span>
      );
    }
    if (s === 'PENDING' || s === 'SUBMITTED') {
      return (
        <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '3px 9px', borderRadius: '12px', background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
          ⏳ Submit For Approval
        </span>
      );
    }
    if (s === 'DRAFT') {
      return (
        <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '3px 9px', borderRadius: '12px', background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
          📝 Draft
        </span>
      );
    }
    if (s === 'REJECTED') {
      return (
        <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '3px 9px', borderRadius: '12px', background: '#fee2e2', color: '#991b1b', border: '1px solid #fecaca', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
          ❌ Rejected
        </span>
      );
    }
    return (
      <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '3px 9px', borderRadius: '12px', background: '#f1f5f9', color: '#64748b' }}>
        {status || 'PROCESSED'}
      </span>
    );
  };

  const exportSalaryRegisterToExcel = () => {
    if (!data || !data.payrolls) return;

    // Filter by selected status
    const targetPayrolls = data.payrolls.filter((p: any) => isStatusMatch(p.status, statusFilter));
    if (targetPayrolls.length === 0) {
      alert(`No records found for status: ${statusFilter === 'pending' ? 'Submit For Approval (Pending)' : statusFilter === 'approved' ? 'Approved' : statusFilter === 'draft' ? 'Drafts' : 'All'}`);
      return;
    }

    // Split payrolls by 3 categories
    const teachingPayrolls = targetPayrolls.filter((p: any) => getEmployeeCategory(p) === 'teaching');
    const nonTeachingPayrolls = targetPayrolls.filter((p: any) => getEmployeeCategory(p) === 'non_teaching');
    const contractPayrolls = targetPayrolls.filter((p: any) => getEmployeeCategory(p) === 'contract');

    const wb = XLSX.utils.book_new();

    // Helper for signature block
    const appendSignatureRows = (sheetData: any[], col1: string, col2: string, col3: string, col4: string) => {
      sheetData.push({}, {}, {});
      sheetData.push({
        [col1]: 'PREPARED BY',
        [col2]: 'VERIFIED BY',
        [col3]: 'VERIFIED BY',
        [col4]: 'APPROVED / NOT APPROVED'
      });
      sheetData.push({
        [col1]: `(${signatures.preparedBy})`,
        [col2]: `(${signatures.verifiedBy1})`,
        [col3]: `(${signatures.verifiedBy2})`,
        [col4]: `(${signatures.approvedBy})`
      });
      sheetData.push({
        [col1]: 'ACCOUNTS EXECUTIVE',
        [col2]: 'Jr SUPTD (ACTING AR F&A)',
        [col3]: 'JOINT REGISTRAR / DR (F&A)',
        [col4]: 'REGISTRAR'
      });
    };

    // 1. Generate Regular - Teaching Sheet
    if (teachingPayrolls.length > 0) {
      const teachingData = teachingPayrolls.map((p: any, i: number) => ({
        'Sl.no': i + 1,
        'Emp ID': p.employeeId,
        'Name of the Employee': p.employeeName || p.employeeId,
        'Designation': p.designation || 'Faculty',
        'Pay level': p.payLevel ? `Level-${p.payLevel}` : 'Level-10',
        'Basic': p.basicPay || 0,
        'DA 60%': p.da || 0,
        'TA( Rs.3600+ * DA@60%)': p.ta || 0,
        'HRA 20 %': p.hra || 0,
        'Dean / Warden Allowance': p.otherAllowances || 0,
        'NPS Employer share': p.npsEmployerShare || 0,
        'Deductable Pension': p.ignorablePension || 0,
        'Gross Salary': p.grossSalary || 0,
        'PT': p.professionalTax || 0,
        'TDS': p.tds || 0,
        'NPS Employee share': p.npsEmployeeShare || 0,
        'CGHS Contribution': p.cghs || 0,
        'Other deductions': p.otherDeductions || 0,
        'Total Deductions': p.totalDeductions || 0,
        'Net Salary': p.netSalary || 0
      }));

      const totals = teachingData.reduce((acc: any, curr: any) => {
        Object.keys(curr).forEach(key => {
          if (!['Sl.no', 'Emp ID', 'Name of the Employee', 'Designation', 'Pay level'].includes(key)) {
            acc[key] = (acc[key] || 0) + (curr[key] || 0);
          }
        });
        return acc;
      }, { 'Sl.no': 'Total', 'Emp ID': '', 'Name of the Employee': '', 'Designation': '', 'Pay level': '' });
      teachingData.push(totals);

      appendSignatureRows(teachingData, 'Sl.no', 'DA 60%', 'Gross Salary', 'Total Deductions');
      const wsTeaching = XLSX.utils.json_to_sheet(teachingData);
      XLSX.utils.book_append_sheet(wb, wsTeaching, "Regular - Teaching");
    }

    // 2. Generate Regular - Non Teaching Sheet
    if (nonTeachingPayrolls.length > 0) {
      const nonTeachingData = nonTeachingPayrolls.map((p: any, i: number) => ({
        'Sl.no': i + 1,
        'Emp ID': p.employeeId,
        'Name of the Employee': p.employeeName || p.employeeId,
        'Designation': p.designation || 'Staff',
        'Pay Scale': p.payLevel ? `Level-${p.payLevel}` : 'Level-10',
        'Basic': p.basicPay || 0,
        'DA 60%': p.da || 0,
        'TA': p.ta || 0,
        'HRA 20 %': p.hra || 0,
        'NPS Employer Share': p.npsEmployerShare || 0,
        'Deductable Pension': p.ignorablePension || 0,
        'Gross salary': p.grossSalary || 0,
        'PT': p.professionalTax || 0,
        'TDS': p.tds || 0,
        'NPS Employee share': p.npsEmployeeShare || 0,
        'CGHS Contribution': p.cghs || 0,
        'Other Recovery': p.otherDeductions || 0,
        'Total Deductions': p.totalDeductions || 0,
        'Net Salary': p.netSalary || 0
      }));

      const ntTotals = nonTeachingData.reduce((acc: any, curr: any) => {
        Object.keys(curr).forEach(key => {
          if (!['Sl.no', 'Emp ID', 'Name of the Employee', 'Designation', 'Pay Scale'].includes(key)) {
            acc[key] = (acc[key] || 0) + (curr[key] || 0);
          }
        });
        return acc;
      }, { 'Sl.no': 'TOTAL', 'Emp ID': '', 'Name of the Employee': '', 'Designation': '', 'Pay Scale': '' });
      nonTeachingData.push(ntTotals);

      appendSignatureRows(nonTeachingData, 'Sl.no', 'DA 60%', 'Gross salary', 'Total Deductions');
      const wsNT = XLSX.utils.json_to_sheet(nonTeachingData);
      XLSX.utils.book_append_sheet(wb, wsNT, "Regular - Non Teaching");
    }

    // 3. Generate Contract Sheet
    if (contractPayrolls.length > 0) {
      const daysInMonth = new Date(year, month, 0).getDate();
      const contractData = contractPayrolls.map((p: any, i: number) => {
        const emp = employees.find((e: any) => e.employeeId === p.employeeId || e.id === p.userId);
        const payableDays = (p.payableDays !== undefined && p.payableDays !== null) ? p.payableDays : (p.totalDaysInMonth || daysInMonth);
        const baseMonthly = (emp?.basicPay && emp.basicPay > 0) ? emp.basicPay : (p.basicPay || 0);
        const contractPeriod = emp?.contractPeriod || emp?.contractEndDate || '-';

        return {
          'Sl.no': i + 1,
          'Emp ID': p.employeeId,
          'Name of the Employee': p.employeeName || p.employeeId,
          'Designation': p.designation || 'Contract Staff',
          'Monthly Salary': baseMonthly,
          'Dean / Warden Allowance': p.otherAllowances || 0,
          'No.of Days Salary Payable': payableDays,
          'Gross Salary': p.grossSalary || 0,
          'PT': p.professionalTax || 0,
          'TDS': p.tds || 0,
          'PF': (p.otherDeductions && p.otherDeductions >= 1800) ? p.otherDeductions : 0,
          'Other deductions': (p.otherDeductions && p.otherDeductions < 1800) ? p.otherDeductions : 0,
          'Total Deductions': p.totalDeductions || 0,
          'Net Salary': p.netSalary || 0,
          'Contract Period': contractPeriod
        };
      });

      const cTotals = contractData.reduce((acc: any, curr: any) => {
        Object.keys(curr).forEach(key => {
          if (!['Sl.no', 'Emp ID', 'Name of the Employee', 'Designation', 'Contract Period', 'No.of Days Salary Payable'].includes(key)) {
            acc[key] = (acc[key] || 0) + (curr[key] || 0);
          }
        });
        return acc;
      }, { 'Sl.no': 'TOTAL', 'Emp ID': '', 'Name of the Employee': '', 'Designation': '', 'Contract Period': '', 'No.of Days Salary Payable': '' });
      contractData.push(cTotals);

      appendSignatureRows(contractData, 'Sl.no', 'Monthly Salary', 'Gross Salary', 'Total Deductions');
      const wsContract = XLSX.utils.json_to_sheet(contractData);
      XLSX.utils.book_append_sheet(wb, wsContract, "Contract");
    }

    // 4. Generate Consolidated Summary Sheet
    const daysInMonthSummary = new Date(year, month, 0).getDate();
    const summaryData = targetPayrolls.map((p: any, i: number) => {
      const cat = getEmployeeCategory(p);
      const catLabel = cat === 'teaching' ? 'Regular - Teaching' : cat === 'non_teaching' ? 'Regular - Non Teaching' : 'Contract';
      const payableDays = (p.payableDays !== undefined && p.payableDays !== null) ? p.payableDays : (p.totalDaysInMonth || daysInMonthSummary);
      return {
        'Sl.no': i + 1,
        'Emp ID': p.employeeId,
        'Name of the Employee': p.employeeName || p.employeeId,
        'Category': catLabel,
        'Designation': p.designation || '-',
        'Pay Scale': p.payLevel ? `Level-${p.payLevel}` : 'Consolidated',
        'Basic / Fixed Pay': p.basicPay || 0,
        'Days Paid': payableDays,
        'DA': p.da || 0,
        'TA': p.ta || 0,
        'HRA': p.hra || 0,
        'Dean / Warden Allowances': p.otherAllowances || 0,
        'NPS Employer': p.npsEmployerShare || 0,
        'Deductable Pension': p.ignorablePension || 0,
        'Gross Salary': p.grossSalary || 0,
        'PT': p.professionalTax || 0,
        'TDS': p.tds || 0,
        'NPS Employee': p.npsEmployeeShare || 0,
        'CGHS': p.cghs || 0,
        'Other Deductions': p.otherDeductions || 0,
        'Total Deductions': p.totalDeductions || 0,
        'Net Salary': p.netSalary || 0
      };
    });

    const sumTotals = summaryData.reduce((acc: any, curr: any) => {
      Object.keys(curr).forEach(key => {
        if (!['Sl.no', 'Emp ID', 'Name of the Employee', 'Category', 'Designation', 'Pay Scale'].includes(key)) {
          acc[key] = (acc[key] || 0) + (curr[key] || 0);
        }
      });
      return acc;
    }, { 'Sl.no': 'TOTAL', 'Emp ID': '', 'Name of the Employee': '', 'Category': '', 'Designation': '', 'Pay Scale': '' });
    summaryData.push(sumTotals);
    appendSignatureRows(summaryData, 'Sl.no', 'DA', 'Gross Salary', 'CGHS');
    const wsSummary = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, wsSummary, "Consolidated Summary");

    const statusSuffix = statusFilter === 'approved' ? '_Approved' : statusFilter === 'pending' ? '_Submitted_For_Approval' : statusFilter === 'draft' ? '_Drafts' : '';
    XLSX.writeFile(wb, `INDIAN_INSTITUTE_OF_PETROLEUM_AND_ENERGY_Salary_${months[month-1]}_${year}${statusSuffix}.xlsx`);
  };

  const exportBankPaymentSheetToExcel = () => {
    if (!data || !data.payrolls) return;
    const wb = XLSX.utils.book_new();

    const createSheetData = (list: any[], title: string) => {
      const exportRows = list.map((p: any, idx: number) => {
        const emp = employees.find((e: any) => e.employeeId === p.employeeId || e.id === p.userId);
        const name = formatEmployeeNameWithTitle(p, emp);
        const rawBank = p.bankName || emp?.bankName || 'State Bank of India';
        const bank = normalizeBankName(rawBank);
        const acc = p.bankAccountNumber || emp?.bankAccountNumber || '-';
        const ifsc = p.ifscCode || emp?.ifscCode || 'SBIN0003170';

        return {
          'Sl. No.': idx + 1,
          'Employee ID': p.employeeId,
          'Employee Name': name,
          'Bank Name': bank,
          'Bank Account Number': acc,
          'IFSC Code': ifsc,
          'Net Amount Payable (Rs.)': p.netSalary || 0,
        };
      });

      const totalNet = list.reduce((s: number, p: any) => s + (p.netSalary || 0), 0);
      exportRows.push({
        'Sl. No.': 'TOTAL',
        'Employee ID': '',
        'Employee Name': '',
        'Bank Name': '',
        'Bank Account Number': '',
        'IFSC Code': '',
        'Net Amount Payable (Rs.)': totalNet,
      } as any);

      // Append Signatures
      exportRows.push({} as any, {} as any);
      exportRows.push({
        'Sl. No.': 'PREPARED BY',
        'Bank Name': 'VERIFIED BY',
        'Bank Account Number': 'VERIFIED BY',
        'Net Amount Payable (Rs.)': 'AUTHORISED SIGNATORY'
      } as any);
      exportRows.push({
        'Sl. No.': `(${signatures.preparedBy})`,
        'Bank Name': `(${signatures.verifiedBy1})`,
        'Bank Account Number': `(${signatures.verifiedBy2})`,
        'Net Amount Payable (Rs.)': `(${signatures.approvedBy})`
      } as any);
      exportRows.push({
        'Sl. No.': 'Junior Superintendent (F&A)',
        'Bank Name': 'AR (F&A)',
        'Bank Account Number': 'Deputy Registrar (F&A)',
        'Net Amount Payable (Rs.)': 'Authorised Signatory'
      } as any);

      return XLSX.utils.json_to_sheet(exportRows);
    };

    const targetList = (data.payrolls || []).filter((p: any) => isStatusMatch(p.status, statusFilter));
    const teachingList = targetList.filter((p: any) => getEmployeeCategory(p) === 'teaching');
    const nonTeachingList = targetList.filter((p: any) => getEmployeeCategory(p) === 'non_teaching');
    const contractList = targetList.filter((p: any) => getEmployeeCategory(p) === 'contract');

    if (bankCategoryFilter === 'all') {
      if (teachingList.length > 0) XLSX.utils.book_append_sheet(wb, createSheetData(teachingList, 'Regular - Teaching'), 'Regular - Teaching');
      if (nonTeachingList.length > 0) XLSX.utils.book_append_sheet(wb, createSheetData(nonTeachingList, 'Regular - Non Teaching'), 'Regular - Non Teaching');
      if (contractList.length > 0) XLSX.utils.book_append_sheet(wb, createSheetData(contractList, 'Contract'), 'Contract');
      XLSX.utils.book_append_sheet(wb, createSheetData(targetList, 'Consolidated Bank Advice'), 'Consolidated Summary');
    } else if (bankCategoryFilter === 'teaching') {
      XLSX.utils.book_append_sheet(wb, createSheetData(teachingList, 'Regular - Teaching'), 'Regular - Teaching');
    } else if (bankCategoryFilter === 'non_teaching') {
      XLSX.utils.book_append_sheet(wb, createSheetData(nonTeachingList, 'Regular - Non Teaching'), 'Regular - Non Teaching');
    } else if (bankCategoryFilter === 'contract') {
      XLSX.utils.book_append_sheet(wb, createSheetData(contractList, 'Contract'), 'Contract');
    }

    const statusSuffix = statusFilter === 'approved' ? '_Approved' : statusFilter === 'pending' ? '_Submitted_For_Approval' : statusFilter === 'draft' ? '_Drafts' : '';
    XLSX.writeFile(wb, `IIPE_Bank_Payment_Advice_${months[month - 1]}_${year}${statusSuffix}.xlsx`);
  };

  const printBankAdviceLetter = () => {
    if (!data || !data.payrolls) return;
    const filtered = data.payrolls.filter((p: any) => {
      const matchCat = bankCategoryFilter === 'all' || getEmployeeCategory(p) === bankCategoryFilter;
      const matchStatus = isStatusMatch(p.status, statusFilter);
      return matchCat && matchStatus;
    });
    const totalAmount = filtered.reduce((s: number, p: any) => s + (p.netSalary || 0), 0);
    const categoryTitle = getCategoryLabel(bankCategoryFilter);
    const amountInWords = numberToWordsINR(Math.round(totalAmount));

    const getLastWorkingDay = (yr: number, m: number): string => {
      const d = new Date(yr, m, 0);
      if (d.getDay() === 6) d.setDate(d.getDate() - 1);
      else if (d.getDay() === 0) d.setDate(d.getDate() - 2);
      const dd = String(d.getDate()).padStart(2, '0');
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      return `${dd}/${mm}/${d.getFullYear()}`;
    };

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Bank Payment Advice - ${months[month - 1]} ${year} (${categoryTitle})</title>
        <style>
          body { font-family: 'Times New Roman', serif; font-size: 11pt; margin: 20mm 15mm; color: #000; line-height: 1.35; }
          .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 8px; margin-bottom: 15px; }
          .title { font-size: 15pt; font-weight: bold; margin-bottom: 4px; }
          .subtitle { font-size: 10pt; }
          .ref-table { width: 100%; margin-bottom: 15px; font-size: 10.5pt; }
          .advice-table { width: 100%; border-collapse: collapse; margin: 15px 0; font-size: 9.5pt; }
          .advice-table th, .advice-table td { border: 1px solid #000; padding: 5px 6px; }
          .text-right { text-align: right; }
          .text-center { text-align: center; }
          .bold { font-weight: bold; }
          .sig-container { display: flex; justify-content: space-between; margin-top: 55px; font-size: 10pt; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="title">INDIAN INSTITUTE OF PETROLEUM AND ENERGY</div>
          <div class="subtitle">(An Institute of National Importance) - Ministry of Petroleum and Natural Gas, Govt. of India</div>
          <div class="subtitle">Vangali, Sabbavaram, Anakapalle – 531035, Andhra Pradesh, India</div>
        </div>
        <table class="ref-table">
          <tr>
            <td>Ref No: IIPE/PAYROLL/${year}/${shortMonths[month - 1].toUpperCase()}/BANK</td>
            <td class="text-right">Date: ${getLastWorkingDay(year, month)}</td>
          </tr>
        </table>
        <p>To,<br><b>The Branch Manager,</b><br>State Bank of India, AU Campus Branch,<br>Visakhapatnam - 530003, Andhra Pradesh</p>
        <p><b>Dear Sir / Madam,</b></p>
        <p><b>Sub: Payment Advice towards ${months[month - 1]} ${year} Salaries — Category: <span style="text-decoration: underline;">${categoryTitle}</span></b></p>
        <p>We authorize you to debit IIPE Revenue Current Account No. <b>39877553958</b> and remit the total net salary amount of <b>₹ ${Number(totalAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</b> (<b>${amountInWords}</b>) to the respective bank accounts of our employees towards <b>${months[month - 1]} ${year}</b> Salaries as detailed below:</p>
        <table class="advice-table">
          <thead>
            <tr style="background:#f2f2f2;">
              <th class="text-center" style="width:5%;">Sl.No</th>
              <th class="text-center" style="width:10%;">Emp ID</th>
              <th>Employee Name</th>
              <th>Bank Name</th>
              <th>Account Number</th>
              <th class="text-center">IFSC Code</th>
              <th class="text-right" style="width:15%;">Net Amount (Rs.)</th>
            </tr>
          </thead>
          <tbody>
            ${filtered.map((p: any, idx: number) => {
              const emp = employees.find((e: any) => e.employeeId === p.employeeId || e.id === p.userId);
              const name = formatEmployeeNameWithTitle(p, emp);
              const rawBank = p.bankName || emp?.bankName || 'State Bank of India';
              const bank = normalizeBankName(rawBank);
              const acc = p.bankAccountNumber || emp?.bankAccountNumber || '-';
              const ifsc = p.ifscCode || emp?.ifscCode || 'SBIN0003170';

              return `
              <tr>
                <td class="text-center">${idx + 1}</td>
                <td class="text-center">${p.employeeId}</td>
                <td><b>${name}</b></td>
                <td>${bank}</td>
                <td>${acc}</td>
                <td class="text-center">${ifsc}</td>
                <td class="text-right bold">${Number(p.netSalary || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
              </tr>
            `;}).join('')}
            <tr style="background:#f9f9f9;">
              <td colspan="6" class="bold text-center">TOTAL DISBURSEMENT AMOUNT (${categoryTitle.toUpperCase()})</td>
              <td class="text-right bold" style="font-size:11pt;">₹ ${Number(totalAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
            </tr>
            <tr style="background:#fdfdfd;">
              <td colspan="7" class="bold" style="padding: 8px 10px; font-size: 10pt; background:#f8fafc; border-top: 1px solid #000;">
                Amount in Words: <span style="font-style: italic; color: #0f172a;">${amountInWords}</span>
              </td>
            </tr>
          </tbody>
        </table>
        <p style="margin-top:20px;">Yours Faithfully,<br><b>For Indian Institute of Petroleum and Energy</b></p>
        <div class="sig-container" style="margin-top:55px;">
          <div>_______________________<br><b>Prepared By</b><br>(${signatures.preparedBy})<br>Junior Superintendent (F&A)</div>
          <div style="text-align:center;">_______________________<br><b>Verified By</b><br>(${signatures.verifiedBy1} / ${signatures.verifiedBy2})<br>Deputy Registrar (F&A)</div>
          <div style="text-align:right;">_______________________<br><b>Authorised Signatory</b><br>(${signatures.approvedBy})<br>Registrar / Authorised Signatory</div>
        </div>
      </body>
      </html>
    `;
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(html);
      win.document.close();
      win.focus();
      setTimeout(() => win.print(), 250);
    }
  };

  const exportTdsProjectionToExcel = () => {
    if (!data || !Array.isArray(data)) return;
    const wb = XLSX.utils.book_new();
    const rows = data.map((d: any, idx: number) => ({
      'Sl.No': idx + 1,
      'Emp ID': d.employeeId,
      'Employee Name': formatEmployeeNameWithTitle(d),
      'Designation': d.designation,
      'Department': d.department,
      'PAN': d.pan,
      'Tax Regime': d.taxRegime,
      'Projected Annual Gross (Rs.)': d.projectedAnnualGross || 0,
      'Standard Deduction (Rs.)': d.standardDeduction || 0,
      'Sec 80CCD(2) NPS Share (Rs.)': Math.round(d.deduction80CCD2 || 0),
      'Professional Tax (Rs.)': d.professionalTax || 0,
      'Other Chapter VI-A (Rs.)': d.otherChapterVIADeductions || 0,
      'Net Taxable Income (Rs.)': d.netTaxableIncome || 0,
      'Estimated Annual Tax (Rs.)': d.estimatedAnnualTax || 0,
      'TDS Deducted So Far (Rs.)': d.tdsDeductedSoFar || 0,
      'Balance Tax to Deduct (Rs.)': d.tdsRemainingToBeDeducted || 0,
      'Remaining Months': d.monthsRemainingCount || 0,
      'Monthly TDS for Next Months (Rs.)': d.monthlyTdsNextMonths || 0
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, `TDS_Projection_${year}`);
    XLSX.writeFile(wb, `IIPE_TDS_Projection_FY_${year}-${year + 1}.xlsx`);
  };

  return (
    <div className="page-container">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1>Reports</h1>
          <p>Salary register, NPS, TDS, department-wise, and Form 16 reports</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          {tab === 'register' && (
            <button className="btn-success-iipm" onClick={exportSalaryRegisterToExcel}>
              📊 Export to Excel
            </button>
          )}
          {tab === 'bank' && (
            <button className="btn-success-iipm" onClick={exportBankPaymentSheetToExcel}>
              📊 Export Bank Excel
            </button>
          )}
          {tab === 'projection' && (
            <button className="btn-success-iipm" onClick={exportTdsProjectionToExcel}>
              📊 Export TDS Excel
            </button>
          )}
          <button className="btn-primary-iipm" onClick={() => window.print()}>
            🖨 Print / Export PDF
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="reports-tabs-wrapper">
        <div className="reports-tabs-container">
          {tabList.map(t => (
            <button 
              key={t.key} 
              onClick={() => setTab(t.key)} 
              className={`reports-tab ${tab === t.key ? 'active' : ''}`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="card-iipm" style={{ padding: '16px 20px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          {(tab === 'register' || tab === 'bank' || tab === 'dept') && (
            <div>
              <label className="form-label-iipm">Month</label>
              <select className="form-control-iipm" value={month} onChange={e => setMonth(+e.target.value)} style={{ width: '150px' }}>
                {months.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
              </select>
            </div>
          )}
          {tab === 'comparison' && (
            <div>
              <label className="form-label-iipm">Select Employee</label>
              <select className="form-control-iipm" value={userId} onChange={e => setUserId(e.target.value)} style={{ width: '280px' }}>
                <option value="">-- Select Employee --</option>
                {employees.map(e => <option key={e.id} value={e.id}>{e.name} ({e.employeeId || e.id})</option>)}
              </select>
            </div>
          )}
          {tab === 'ytd' && (
            <div>
              <label className="form-label-iipm">Select Employee</label>
              <select className="form-control-iipm" value={userId} onChange={e => setUserId(e.target.value)} style={{ width: '280px' }}>
                <option value="">🏢 All Employees (Institute Consolidated)</option>
                {employees.map(e => <option key={e.id} value={e.id}>{e.name} ({e.employeeId || e.id})</option>)}
              </select>
            </div>
          )}
          {tab !== 'comparison' && (
            <div>
              <label className="form-label-iipm">Year</label>
              <input type="number" className="form-control-iipm" value={year} onChange={e => setYear(+e.target.value)} style={{ width: '100px' }} />
            </div>
          )}
          {(tab === 'register' || tab === 'bank') && (
            <div>
              <label className="form-label-iipm">Approval Status</label>
              <select 
                className="form-control-iipm" 
                value={statusFilter} 
                onChange={e => setStatusFilter(e.target.value as any)} 
                style={{ width: '240px', fontWeight: 600, color: statusFilter === 'approved' ? '#166534' : statusFilter === 'pending' ? '#92400e' : statusFilter === 'draft' ? '#475569' : 'inherit' }}
              >
                <option value="all">🌐 All Records (Consolidated)</option>
                <option value="pending">⏳ Submit For Approval (Pending)</option>
                <option value="approved">✅ Approved / Finalized</option>
                <option value="draft">📝 Saved Drafts</option>
              </select>
            </div>
          )}
          <button className="btn-primary-iipm" onClick={loadReport} disabled={loading || (tab === 'comparison' && !userId)}>
            {loading ? '⏳ Loading...' : '🔍 Generate Report'}
          </button>
        </div>
        {tab === 'register' && (
          <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border)' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '12px' }}>EXCEL EXPORT SIGNATURE BLOCK CONFIGURATION</div>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <div><label className="form-label-iipm">Prepared By</label><input className="form-control-iipm" value={signatures.preparedBy} onChange={e => setSignatures({...signatures, preparedBy: e.target.value})} style={{width: '200px'}} /></div>
              <div><label className="form-label-iipm">Verified By (1)</label><input className="form-control-iipm" value={signatures.verifiedBy1} onChange={e => setSignatures({...signatures, verifiedBy1: e.target.value})} style={{width: '200px'}} /></div>
              <div><label className="form-label-iipm">Verified By (2)</label><input className="form-control-iipm" value={signatures.verifiedBy2} onChange={e => setSignatures({...signatures, verifiedBy2: e.target.value})} style={{width: '200px'}} /></div>
              <div><label className="form-label-iipm">Approved By</label><input className="form-control-iipm" value={signatures.approvedBy} onChange={e => setSignatures({...signatures, approvedBy: e.target.value})} style={{width: '200px'}} /></div>
            </div>
          </div>
        )}
      </div>

      {msg && <div className="alert-iipm alert-danger">{msg}</div>}

      {/* ===== SALARY REGISTER ===== */}
      {tab === 'register' && data && (() => {
        const allList: any[] = data.payrolls || [];
        const regFiltered = allList.filter((p: any) => isStatusMatch(p.status, statusFilter));
        const countAll = allList.length;
        const countPending = allList.filter((p: any) => isStatusMatch(p.status, 'pending')).length;
        const countApproved = allList.filter((p: any) => isStatusMatch(p.status, 'approved')).length;
        const countDraft = allList.filter((p: any) => isStatusMatch(p.status, 'draft')).length;

        const regTotals = regFiltered.reduce((acc: any, p: any) => ({
          basic: acc.basic + (p.basicPay || 0),
          da: acc.da + (p.da || 0),
          hra: acc.hra + (p.hra || 0),
          ta: acc.ta + (p.ta || 0),
          dean: acc.dean + (p.otherAllowances || 0),
          npsEmployer: acc.npsEmployer + (p.npsEmployerShare || 0),
          ignorablePension: acc.ignorablePension + (p.ignorablePension || 0),
          gross: acc.gross + (p.grossSalary || 0),
          tds: acc.tds + (p.tds || 0),
          npsEmp: acc.npsEmp + (p.npsEmployeeShare || 0),
          pt: acc.pt + (p.professionalTax || 0),
          otherDed: acc.otherDed + (p.otherDeductions || 0),
          totalDed: acc.totalDed + (p.totalDeductions || 0),
          net: acc.net + (p.netSalary || 0)
        }), {
          basic: 0, da: 0, hra: 0, ta: 0, dean: 0, npsEmployer: 0, ignorablePension: 0, gross: 0,
          tds: 0, npsEmp: 0, pt: 0, otherDed: 0, totalDed: 0, net: 0
        });

        const totalGross = regTotals.gross;
        const totalDeductions = regTotals.totalDed;
        const totalNet = regTotals.net;

        const statusLabel = statusFilter === 'pending' ? 'Submit For Approval (Pending)' : statusFilter === 'approved' ? 'Approved' : statusFilter === 'draft' ? 'Saved Drafts' : 'All Records';

        return (
          <>
            {/* Quick Status Filter Pill Bar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {[
                  { id: 'all', label: 'All Records', count: countAll, icon: '🌐' },
                  { id: 'pending', label: 'Submit For Approval', count: countPending, icon: '⏳' },
                  { id: 'approved', label: 'Approved', count: countApproved, icon: '✅' },
                  { id: 'draft', label: 'Saved Drafts', count: countDraft, icon: '📝' }
                ].map(item => (
                  <button
                    key={item.id}
                    onClick={() => setStatusFilter(item.id as any)}
                    style={{
                      padding: '7px 16px',
                      borderRadius: '20px',
                      border: `1.5px solid ${statusFilter === item.id ? '#0a3161' : '#cbd5e1'}`,
                      background: statusFilter === item.id ? '#0a3161' : '#ffffff',
                      color: statusFilter === item.id ? '#ffffff' : '#334155',
                      fontWeight: statusFilter === item.id ? 700 : 600,
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      boxShadow: statusFilter === item.id ? '0 2px 6px rgba(10,49,97,0.2)' : 'none',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <span>{item.icon}</span>
                    <span>{item.label}</span>
                    <span style={{
                      background: statusFilter === item.id ? 'rgba(255,255,255,0.25)' : '#f1f5f9',
                      color: statusFilter === item.id ? '#ffffff' : '#475569',
                      padding: '1px 8px',
                      borderRadius: '10px',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      marginLeft: '2px'
                    }}>
                      {item.count}
                    </span>
                  </button>
                ))}
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button className="btn-success-iipm" onClick={exportSalaryRegisterToExcel} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  📊 Export to Excel ({regFiltered.length})
                </button>
              </div>
            </div>

            {/* Summary Stat Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '20px' }}>
              {[
                { label: `Total Employees (${statusLabel})`, value: `${fmtN(regFiltered.length)} Staff`, icon: '👥', color: '#3b82f6' },
                { label: 'Total Gross', value: fmt(totalGross), icon: '💰', color: '#c9a84c' },
                { label: 'Total Deductions', value: fmt(totalDeductions), icon: '➖', color: '#ef4444' },
                { label: 'Net Disbursement', value: fmt(totalNet), icon: '✅', color: '#22c55e' },
              ].map((s, i) => (
                <div className="stat-card" key={i}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div className="stat-label">{s.label}</div>
                      <div className="stat-value" style={{ fontSize: '1.4rem', color: s.color }}>{s.value}</div>
                    </div>
                    <div style={{ fontSize: '1.8rem', opacity: 0.4 }}>{s.icon}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Salary Register Table */}
            <div className="card-iipm" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', background: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '1rem', color: '#0f172a' }}>
                    Salary Register — {months[month - 1]} {year}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    Showing: <strong style={{ color: '#0a3161' }}>{statusLabel}</strong> ({regFiltered.length} records)
                  </div>
                </div>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table className="table-iipm" style={{ whiteSpace: 'nowrap', fontSize: '0.84rem' }}>
                  <thead>
                    <tr style={{ background: '#f1f5f9' }}>
                      <th>#</th>
                      <th>Employee ID</th>
                      <th>Employee Name</th>
                      <th>Basic</th>
                      <th>DA (60%)</th>
                      <th>HRA (20%)</th>
                      <th>TA</th>
                      <th>Dean / Warden Allow.</th>
                      <th>NPS Employer (14%)</th>
                      <th style={{ color: '#b91c1c' }}>Deductable Pension</th>
                      <th style={{ textAlign: 'right' }}>Gross</th>
                      <th>TDS</th>
                      <th>NPS Emp (10%)</th>
                      <th>PT</th>
                      <th>Other Ded.</th>
                      <th style={{ textAlign: 'right' }}>Total Ded.</th>
                      <th style={{ textAlign: 'right' }}>Net Pay</th>
                      <th style={{ textAlign: 'center' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {regFiltered.map((p: any, i: number) => {
                      const emp = employees.find((e: any) => e.employeeId === p.employeeId || e.id === p.userId);
                      const name = formatEmployeeNameWithTitle(p, emp);

                      return (
                        <tr key={p.id || p.employeeId || i}>
                          <td style={{ color: 'var(--text-muted)' }}>{i + 1}</td>
                          <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{p.employeeId}</td>
                          <td style={{ fontWeight: 600, color: '#0f172a' }}>{name}</td>
                          <td>{fmt(p.basicPay)}</td>
                          <td>{fmt(p.da)}</td>
                          <td>{fmt(p.hra)}</td>
                          <td>{fmt(p.ta)}</td>
                          <td>{fmt(p.otherAllowances)}</td>
                          <td>{fmt(p.npsEmployerShare)}</td>
                          <td style={{ color: '#b91c1c', fontWeight: 600 }}>{p.ignorablePension ? `- ${fmt(p.ignorablePension)}` : '-'}</td>
                          <td style={{ textAlign: 'right', fontWeight: 600, background: '#f8fafc' }}>{fmt(p.grossSalary)}</td>
                          <td style={{ color: '#b45309' }}>{fmt(p.tds)}</td>
                          <td>{fmt(p.npsEmployeeShare)}</td>
                          <td>{fmt(p.professionalTax)}</td>
                          <td>{fmt(p.otherDeductions)}</td>
                          <td style={{ textAlign: 'right', color: '#ef4444', background: '#fef2f2', fontWeight: 600 }}>{fmt(p.totalDeductions)}</td>
                          <td style={{ textAlign: 'right', color: '#22c55e', background: '#f0fdf4', fontWeight: 700 }}>{fmt(p.netSalary)}</td>
                          <td style={{ textAlign: 'center' }}>
                            {getStatusBadge(p.status)}
                          </td>
                        </tr>
                      );
                    })}
                    {!regFiltered.length && (
                      <tr>
                        <td colSpan={18} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                          No payroll records found for <strong>{statusLabel}</strong> in {months[month - 1]} {year}.
                        </td>
                      </tr>
                    )}
                  </tbody>
                  {regFiltered.length > 0 && (
                    <tfoot>
                      <tr style={{ background: '#e2e8f0', fontWeight: 700, borderTop: '2px solid #cbd5e1' }}>
                        <td colSpan={3} style={{ padding: '12px 14px', color: 'var(--accent)', fontWeight: 800 }}>
                          TOTALS ({statusLabel.toUpperCase()} - {regFiltered.length})
                        </td>
                        <td style={{ padding: '12px 10px' }}>{fmt(regTotals.basic)}</td>
                        <td style={{ padding: '12px 10px' }}>{fmt(regTotals.da)}</td>
                        <td style={{ padding: '12px 10px' }}>{fmt(regTotals.hra)}</td>
                        <td style={{ padding: '12px 10px' }}>{fmt(regTotals.ta)}</td>
                        <td style={{ padding: '12px 10px' }}>{fmt(regTotals.dean)}</td>
                        <td style={{ padding: '12px 10px' }}>{fmt(regTotals.npsEmployer)}</td>
                        <td style={{ padding: '12px 10px', color: '#b91c1c' }}>{fmt(regTotals.ignorablePension)}</td>
                        <td style={{ padding: '12px 10px', textAlign: 'right', color: 'var(--accent)', background: '#d8e1eb', fontWeight: 800 }}>{fmt(regTotals.gross)}</td>
                        <td style={{ padding: '12px 10px', color: '#b45309' }}>{fmt(regTotals.tds)}</td>
                        <td style={{ padding: '12px 10px' }}>{fmt(regTotals.npsEmp)}</td>
                        <td style={{ padding: '12px 10px' }}>{fmt(regTotals.pt)}</td>
                        <td style={{ padding: '12px 10px' }}>{fmt(regTotals.otherDed)}</td>
                        <td style={{ padding: '12px 10px', textAlign: 'right', color: '#b91c1c', background: '#f8c2c2', fontWeight: 800 }}>{fmt(regTotals.totalDed)}</td>
                        <td style={{ padding: '12px 10px', textAlign: 'right', color: '#15803d', background: '#bbf7d0', fontSize: '0.95rem', fontWeight: 800 }}>{fmt(regTotals.net)}</td>
                        <td></td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>
          </>
        );
      })()}

      {/* ===== BANK PAYMENT SHEET ===== */}
      {tab === 'bank' && data && (
        <div>
          {/* Header Action Bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {(['teaching', 'non_teaching', 'contract', 'all'] as const).map(cat => (
                <button
                  key={cat}
                  onClick={() => setBankCategoryFilter(cat)}
                  style={{
                    padding: '7px 16px',
                    borderRadius: '20px',
                    border: `1.5px solid ${bankCategoryFilter === cat ? '#0a3161' : '#cbd5e1'}`,
                    background: bankCategoryFilter === cat ? '#0a3161' : '#ffffff',
                    color: bankCategoryFilter === cat ? '#ffffff' : '#334155',
                    fontWeight: bankCategoryFilter === cat ? 700 : 600,
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    boxShadow: bankCategoryFilter === cat ? '0 2px 4px rgba(10,49,97,0.2)' : 'none'
                  }}
                >
                  {cat === 'teaching' ? '👨‍🏫 1) Regular - Teaching' : cat === 'non_teaching' ? '👔 2) Regular - Non Teaching' : cat === 'contract' ? '📄 3) Contract' : '🌐 All Categories (Consolidated)'}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button className="btn-outline-iipm" onClick={exportBankPaymentSheetToExcel} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                📊 Export Bank Excel
              </button>
              <button className="btn-accent-iipm" onClick={printBankAdviceLetter} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                📄 Print Bank Advice Letter
              </button>
            </div>
          </div>

          {/* Bank Summary Cards */}
          {(() => {
            const filteredPayrolls = (data.payrolls || []).filter((p: any) => {
              const matchCat = bankCategoryFilter === 'all' || getEmployeeCategory(p) === bankCategoryFilter;
              const matchStatus = isStatusMatch(p.status, statusFilter);
              return matchCat && matchStatus;
            });
            const totalDisbursement = filteredPayrolls.reduce((sum: number, p: any) => sum + (p.netSalary || 0), 0);
            const sbiCount = filteredPayrolls.filter((p: any) => (p.bankName || '').toLowerCase().includes('state bank') || (p.ifscCode || '').startsWith('SBIN')).length;
            const otherBankCount = filteredPayrolls.length - sbiCount;
            const currentCatTitle = getCategoryLabel(bankCategoryFilter);

            return (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '20px' }}>
                  <div className="stat-card">
                    <div className="stat-label">Total Beneficiaries ({currentCatTitle})</div>
                    <div className="stat-value" style={{ fontSize: '1.5rem', color: '#0a3161' }}>{filteredPayrolls.length} Employees</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-label">Total Net Salary Disbursement</div>
                    <div className="stat-value" style={{ fontSize: '1.5rem', color: '#16a34a' }}>{fmt(totalDisbursement)}</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-label">SBI AUCE Campus Remittance</div>
                    <div className="stat-value" style={{ fontSize: '1.5rem', color: '#3b82f6' }}>{sbiCount} Accounts</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-label">Other Bank Branches</div>
                    <div className="stat-value" style={{ fontSize: '1.5rem', color: '#f59e0b' }}>{otherBankCount} Accounts</div>
                  </div>
                </div>

                <div className="card-iipm" style={{ padding: '0', overflow: 'hidden' }}>
                  <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', background: '#f8fafc' }}>
                    <h3 style={{ margin: 0, fontSize: '1.05rem', color: '#0f172a' }}>
                      Bank Remittance Schedule — {months[month - 1]} {year} ({currentCatTitle})
                    </h3>
                    <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      Debit Account: IIPE Revenue Current Account (No. 39877553958) | State Bank of India, AU Campus Branch
                    </p>
                  </div>

                  <div style={{ overflowX: 'auto' }}>
                    <table className="table-iipm" style={{ whiteSpace: 'nowrap', fontSize: '0.85rem' }}>
                      <thead>
                        <tr style={{ background: '#f1f5f9' }}>
                          <th>Sl. No.</th>
                          <th>Emp ID</th>
                          <th>Employee Name</th>
                          <th>Category</th>
                          <th>Designation</th>
                          <th>Bank Name</th>
                          <th>Bank Account Number</th>
                          <th>IFSC Code</th>
                          <th style={{ textAlign: 'right' }}>Net Amount Payable (₹)</th>
                          <th style={{ textAlign: 'center' }}>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredPayrolls.map((p: any, i: number) => {
                          const cat = getEmployeeCategory(p);
                          const badgeColor = cat === 'teaching' ? '#3b82f6' : cat === 'non_teaching' ? '#10b981' : '#f59e0b';
                          const badgeBg = cat === 'teaching' ? '#eff6ff' : cat === 'non_teaching' ? '#ecfdf5' : '#fffbeb';
                          const catText = cat === 'teaching' ? 'Regular - Teaching' : cat === 'non_teaching' ? 'Regular - Non Teaching' : 'Contract';
                          const emp = employees.find((e: any) => e.employeeId === p.employeeId || e.id === p.userId);
                          const name = formatEmployeeNameWithTitle(p, emp);
                          const rawBank = p.bankName || emp?.bankName || 'State Bank of India';
                          const bank = normalizeBankName(rawBank);
                          const isSbi = bank.toLowerCase().includes('state bank') || (p.ifscCode || '').startsWith('SBIN');
                          
                          return (
                            <tr key={p.employeeId || i}>
                              <td style={{ color: 'var(--text-muted)' }}>{i + 1}</td>
                              <td style={{ fontWeight: 600 }}>{p.employeeId}</td>
                              <td style={{ fontWeight: 600, color: '#0f172a' }}>{name}</td>
                              <td>
                                <span style={{ fontSize: '0.75rem', fontWeight: 600, padding: '2px 8px', borderRadius: '10px', background: badgeBg, color: badgeColor, border: `1px solid ${badgeColor}30` }}>
                                  {catText}
                                </span>
                              </td>
                              <td>{p.designation || emp?.designation || '-'}</td>
                              <td>
                                <span style={{ 
                                  fontSize: '0.78rem', 
                                  fontWeight: 600, 
                                  padding: '2px 8px', 
                                  borderRadius: '6px', 
                                  background: isSbi ? '#f0fdf4' : '#fff7ed', 
                                  color: isSbi ? '#166534' : '#c2410c',
                                  border: `1px solid ${isSbi ? '#bbf7d0' : '#fed7aa'}`
                                }}>
                                  🏦 {bank}
                                </span>
                              </td>
                              <td style={{ fontFamily: 'monospace', fontWeight: 600, color: '#0f172a' }}>
                                {p.bankAccountNumber || emp?.bankAccountNumber || <span style={{ color: '#ef4444' }}>Not Configured</span>}
                              </td>
                              <td style={{ fontFamily: 'monospace', color: 'var(--text-muted)' }}>{p.ifscCode || emp?.ifscCode || 'SBIN0003170'}</td>
                              <td style={{ textAlign: 'right', fontWeight: 700, color: '#16a34a' }}>{fmt(p.netSalary)}</td>
                              <td style={{ textAlign: 'center' }}>
                                {getStatusBadge(p.status)}
                              </td>
                            </tr>
                          );
                        })}
                        {!filteredPayrolls.length && (
                          <tr>
                            <td colSpan={10} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                              No bank payment records found for the selected filter.
                            </td>
                          </tr>
                        )}
                      </tbody>
                      <tfoot>
                        <tr style={{ background: '#f8fafc', fontWeight: 700 }}>
                          <td colSpan={8} style={{ padding: '12px 16px', color: 'var(--accent)' }}>TOTAL DISBURSEMENT AMOUNT</td>
                          <td style={{ padding: '12px 16px', textAlign: 'right', color: '#16a34a', fontSize: '1rem' }}>{fmt(totalDisbursement)}</td>
                          <td></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              </>
            );
          })()}
        </div>
      )}

      {/* ===== TDS PROJECTION STATEMENT ===== */}
      {tab === 'projection' && data && Array.isArray(data) && (
        <div>
          {/* Summary Cards */}
          {(() => {
            const totalEmployees = data.length;
            const totalProjectedTax = data.reduce((s: number, d: any) => s + (d.estimatedAnnualTax || 0), 0);
            const totalTdsDeducted = data.reduce((s: number, d: any) => s + (d.tdsDeductedSoFar || 0), 0);
            const totalRemainingTax = data.reduce((s: number, d: any) => s + (d.tdsRemainingToBeDeducted || 0), 0);
            const totalMonthlyRemainingTds = data.reduce((s: number, d: any) => s + (d.monthlyTdsNextMonths || 0), 0);

            return (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '16px', marginBottom: '20px' }}>
                  <div className="stat-card">
                    <div className="stat-label">Total Employees</div>
                    <div className="stat-value" style={{ fontSize: '1.5rem', color: '#0a3161' }}>{totalEmployees} Staff</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-label">Total Estimated Annual Tax</div>
                    <div className="stat-value" style={{ fontSize: '1.5rem', color: '#c9a84c' }}>{fmt(totalProjectedTax)}</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-label">💰 TDS Deducted So Far (YTD)</div>
                    <div className="stat-value" style={{ fontSize: '1.5rem', color: '#16a34a' }}>{fmt(totalTdsDeducted)}</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-label">⚖️ Total Balance Tax to Deduct</div>
                    <div className="stat-value" style={{ fontSize: '1.5rem', color: '#dc2626' }}>{fmt(totalRemainingTax)}</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-label">📅 Monthly Projected TDS</div>
                    <div className="stat-value" style={{ fontSize: '1.5rem', color: '#2563eb' }}>{fmt(totalMonthlyRemainingTds)} / mo</div>
                  </div>
                </div>

                <div className="card-iipm" style={{ padding: '0', overflow: 'hidden' }}>
                  <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', background: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '1.05rem', color: '#0f172a' }}>
                        Annual TDS Projection & Deduction Statement — FY {year}-{year + 1}
                      </h3>
                      <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        Institutional summary of estimated annual tax, actual TDS collected so far, and monthly TDS to be deducted for next months
                      </p>
                    </div>
                    <button className="btn-success-iipm" onClick={exportTdsProjectionToExcel} style={{ fontSize: '0.85rem', padding: '6px 14px' }}>
                      📊 Export Excel Schedule
                    </button>
                  </div>

                  <div style={{ overflowX: 'auto' }}>
                    <table className="table-iipm" style={{ whiteSpace: 'nowrap', fontSize: '0.85rem' }}>
                      <thead>
                        <tr style={{ background: '#f1f5f9' }}>
                          <th>Sl. No.</th>
                          <th>Emp ID</th>
                          <th>Employee Name</th>
                          <th>Designation</th>
                          <th>PAN</th>
                          <th>Regime</th>
                          <th style={{ textAlign: 'right' }}>Projected Gross (₹)</th>
                          <th style={{ textAlign: 'right' }}>Sec 80CCD(2) NPS (₹)</th>
                          <th style={{ textAlign: 'right' }}>Net Taxable (₹)</th>
                          <th style={{ textAlign: 'right' }}>Est. Annual Tax (₹)</th>
                          <th style={{ textAlign: 'right', color: '#16a34a' }}>💰 TDS Deducted (₹)</th>
                          <th style={{ textAlign: 'right', color: '#dc2626' }}>⚖️ Balance Tax (₹)</th>
                          <th style={{ textAlign: 'right', color: '#2563eb' }}>📅 Monthly TDS (₹/mo)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.map((d: any, idx: number) => (
                          <tr key={d.userId || idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ textAlign: 'center' }}>{idx + 1}</td>
                            <td><strong>{d.employeeId}</strong></td>
                            <td>{formatEmployeeNameWithTitle(d)}</td>
                            <td>{d.designation}</td>
                            <td><span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{d.pan}</span></td>
                            <td>
                              <span style={{
                                padding: '2px 8px', borderRadius: '10px', fontSize: '0.72rem', fontWeight: 700,
                                background: d.taxRegime === 'NEW' ? 'rgba(59,130,246,0.1)' : 'rgba(245,158,11,0.1)',
                                color: d.taxRegime === 'NEW' ? '#2563eb' : '#d97706'
                              }}>
                                {d.taxRegime}
                              </span>
                            </td>
                            <td style={{ textAlign: 'right' }}>{fmt(d.projectedAnnualGross)}</td>
                            <td style={{ textAlign: 'right' }}>{fmt(Math.round(d.deduction80CCD2 || 0))}</td>
                            <td style={{ textAlign: 'right' }}>{fmt(d.netTaxableIncome)}</td>
                            <td style={{ textAlign: 'right', fontWeight: 600 }}>{fmt(d.estimatedAnnualTax)}</td>
                            <td style={{ textAlign: 'right', fontWeight: 700, color: '#16a34a' }}>{fmt(d.tdsDeductedSoFar)}</td>
                            <td style={{ textAlign: 'right', fontWeight: 700, color: '#dc2626' }}>{fmt(d.tdsRemainingToBeDeducted)}</td>
                            <td style={{ textAlign: 'right', fontWeight: 700, color: '#2563eb', background: 'rgba(37,99,235,0.04)' }}>
                              {fmt(d.monthlyTdsNextMonths)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr style={{ background: '#f8fafc', fontWeight: 700 }}>
                          <td colSpan={6} style={{ padding: '12px 16px', color: 'var(--accent)' }}>INSTITUTIONAL TOTALS</td>
                          <td style={{ textAlign: 'right' }}>{fmt(data.reduce((s: number, d: any) => s + (d.projectedAnnualGross || 0), 0))}</td>
                          <td style={{ textAlign: 'right' }}>{fmt(data.reduce((s: number, d: any) => s + (d.deduction80CCD2 || 0), 0))}</td>
                          <td style={{ textAlign: 'right' }}>{fmt(data.reduce((s: number, d: any) => s + (d.netTaxableIncome || 0), 0))}</td>
                          <td style={{ textAlign: 'right' }}>{fmt(totalProjectedTax)}</td>
                          <td style={{ textAlign: 'right', color: '#16a34a' }}>{fmt(totalTdsDeducted)}</td>
                          <td style={{ textAlign: 'right', color: '#dc2626' }}>{fmt(totalRemainingTax)}</td>
                          <td style={{ textAlign: 'right', color: '#2563eb' }}>{fmt(totalMonthlyRemainingTds)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              </>
            );
          })()}
        </div>
      )}

      {/* ===== NPS REPORT ===== */}
      {tab === 'nps' && data && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '20px' }}>
            {[
              { label: 'Total NPS (Employee 10%)', value: fmt(data.totalNPSEmployee), color: '#3b82f6' },
              { label: 'Total NPS (Employer 14%)', value: fmt(data.totalNPSEmployer), color: '#8b5cf6' },
              { label: 'Total NPS Trust Contribution', value: fmt(data.totalNPS), color: '#c9a84c' },
            ].map((s, i) => (
              <div className="stat-card" key={i}>
                <div className="stat-label">{s.label}</div>
                <div className="stat-value" style={{ fontSize: '1.5rem', color: s.color }}>{s.value}</div>
              </div>
            ))}
          </div>
          <div className="card-iipm" style={{ padding: '20px' }}>
            <h3 style={{ marginBottom: '16px' }}>Monthly NPS Contribution — {year}</h3>
            <table className="table-iipm">
              <thead><tr><th>Month</th><th>NPS Contribution (Employee + Employer)</th></tr></thead>
              <tbody>
                {Object.entries(data.monthlyData || {}).sort().map(([m, v]: [string, any]) => (
                  <tr key={m}><td>{shortMonths[parseInt(m) - 1] || m}</td><td>{fmt(v)}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ===== TDS REPORT ===== */}
      {tab === 'tds' && data && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '20px' }}>
            {[
              { label: 'Total TDS (Annual)', value: fmt(data.totalTDS), color: '#ef4444' },
              { label: 'Average Monthly TDS', value: fmt(data.averageMonthlyTDS), color: '#f59e0b' },
              { label: 'Payroll Records', value: fmtN(data.payrollCount), color: '#3b82f6' },
            ].map((s, i) => (
              <div className="stat-card" key={i}>
                <div className="stat-label">{s.label}</div>
                <div className="stat-value" style={{ fontSize: '1.5rem', color: s.color }}>{s.value}</div>
              </div>
            ))}
          </div>
          <div className="card-iipm" style={{ padding: '20px' }}>
            <h3 style={{ marginBottom: '16px' }}>Monthly TDS — {year}</h3>
            <table className="table-iipm">
              <thead><tr><th>Month</th><th>TDS Deducted</th></tr></thead>
              <tbody>
                {Object.entries(data.monthlyTDS || {}).sort().map(([m, v]: [string, any]) => (
                  <tr key={m}><td>{shortMonths[parseInt(m) - 1] || m}</td><td style={{ color: '#ef4444' }}>{fmt(v)}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ===== DEPARTMENT WISE ===== */}
      {tab === 'dept' && data && (
        <div className="card-iipm" style={{ padding: '20px' }}>
          <h3 style={{ marginBottom: '16px' }}>Department-wise Salary — {months[month - 1]} {year}</h3>
          <table className="table-iipm">
            <thead><tr><th>Department</th><th>Employees</th><th>Total Gross</th><th>Avg. Gross</th><th>Total Net</th></tr></thead>
            <tbody>
              {Object.entries(data.departments || {}).map(([dept, d]: [string, any]) => (
                <tr key={dept}>
                  <td style={{ fontWeight: 600 }}>{dept}</td>
                  <td>{fmtN(d.employeeCount)}</td>
                  <td>{fmt(d.totalGross)}</td>
                  <td>{fmt(d.averageGross)}</td>
                  <td style={{ color: '#22c55e', fontWeight: 600 }}>{fmt(d.totalNet)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ===== YEAR TO DATE ===== */}
      {tab === 'ytd' && data && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '20px' }}>
            {[
              { label: 'Months Processed', value: `${fmtN(data.monthsProcessed)} Months`, color: '#3b82f6' },
              { label: 'Total Gross Salary', value: fmt(data.totalGrossSalary), color: '#c9a84c' },
              { label: 'Total TDS Deducted', value: fmt(data.totalTDS), color: '#ef4444' },
              { label: 'Total NPS (Employee)', value: fmt(data.totalNPS), color: '#8b5cf6' },
              { label: 'Total Net Disbursed', value: fmt(data.totalNetSalary), color: '#22c55e' },
              { label: 'Avg Monthly Gross', value: fmt(data.averageMonthly), color: '#f59e0b' },
            ].map((s, i) => (
              <div className="stat-card" key={i}>
                <div className="stat-label">{s.label}</div>
                <div className="stat-value" style={{ fontSize: '1.3rem', color: s.color }}>{s.value}</div>
              </div>
            ))}
          </div>
          <div className="card-iipm" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
              <div>
                <h3 style={{ margin: 0 }}>Year-to-Date Summary — {data.year}</h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  {data.employeeName} {data.employeeId && data.employeeId !== 'ALL' ? `(${data.employeeId})` : ''} • Cumulative earnings and deductions from April to current month
                </p>
              </div>
            </div>
            <table className="table-iipm">
              <thead>
                <tr>
                  <th>Salary Component</th>
                  <th>Category</th>
                  <th style={{ textAlign: 'right' }}>Annual Cumulative Total</th>
                  <th style={{ textAlign: 'right' }}>Monthly Average</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { label: 'Basic Pay', cat: 'Earning', annual: data.totalBasicPay || (data.totalGrossSalary * 0.45), key: 'bp', color: '#0f172a' },
                  { label: 'Dearness Allowance (DA)', cat: 'Earning', annual: data.totalDA, key: 'da', color: '#0f172a' },
                  { label: 'House Rent Allowance (HRA)', cat: 'Earning', annual: data.totalHRA, key: 'hra', color: '#0f172a' },
                  { label: 'Transport Allowance (TA + DA on TA)', cat: 'Earning', annual: data.totalTA, key: 'ta', color: '#0f172a' },
                  { label: 'Other Allowances / Dean Special Allowance', cat: 'Earning', annual: data.totalOtherAllowances, key: 'otherAllow', color: '#0f172a' },
                  { label: 'NPS Employer Contribution (14%)', cat: 'Earning', annual: data.totalNpsEmployer, key: 'npsEmployer', color: '#0f172a' },
                  { label: 'TOTAL GROSS SALARY', cat: 'Total Earning', annual: data.totalGrossSalary, key: 'gross', color: '#c9a84c', bold: true },
                  { label: 'Tax Deducted at Source (TDS)', cat: 'Deduction', annual: data.totalTDS, key: 'tds', color: '#ef4444' },
                  { label: 'NPS Employee Contribution (10%)', cat: 'Deduction', annual: data.totalNPS, key: 'nps', color: '#8b5cf6' },
                  { label: 'Professional Tax (PT)', cat: 'Deduction', annual: data.totalPT, key: 'pt', color: '#64748b' },
                  { label: 'CGHS / Medical Contribution', cat: 'Deduction', annual: data.totalCGHS, key: 'cghs', color: '#64748b' },
                  { label: 'Other Deductions / Salary Recovery', cat: 'Deduction', annual: data.totalOtherDeductions, key: 'otherDed', color: '#64748b' },
                  { label: 'TOTAL DEDUCTIONS', cat: 'Total Deduction', annual: data.totalDeductions, key: 'totDed', color: '#ef4444', bold: true },
                  { label: 'TOTAL NET SALARY DISBURSED', cat: 'Net Pay', annual: data.totalNetSalary, key: 'net', color: '#22c55e', bold: true },
                ].map(row => (
                  <tr key={row.key} style={{ background: row.bold ? '#f8fafc' : 'transparent', fontWeight: row.bold ? 700 : 400 }}>
                    <td>{row.label}</td>
                    <td><span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{row.cat}</span></td>
                    <td style={{ textAlign: 'right', color: row.color, fontWeight: row.bold ? 700 : 600 }}>{fmt(row.annual)}</td>
                    <td style={{ textAlign: 'right', color: 'var(--text-muted)' }}>{fmt((row.annual || 0) / Math.max(data.monthsProcessed, 1))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ===== YoY COMPARISON ===== */}
      {tab === 'comparison' && data && (
        <div className="card-iipm" style={{ padding: '20px' }}>
          <h3 style={{ marginBottom: '4px' }}>Year-over-Year Salary Comparison</h3>
          <p style={{ marginBottom: '20px', fontSize: '0.85rem' }}>Comparing current year ({data.currentYear}) with previous year ({data.previousYear})</p>
          <table className="table-iipm">
            <thead>
              <tr>
                <th>Component</th>
                <th style={{ textAlign: 'right' }}>{data.previousYear} Total</th>
                <th style={{ textAlign: 'right' }}>{data.currentYear} Total</th>
                <th style={{ textAlign: 'right' }}>% Change</th>
              </tr>
            </thead>
            <tbody>
              {[
                { label: 'Basic Pay', prev: data.previousYearTotals?.basicPay, curr: data.currentYearTotals?.basicPay },
                { label: 'Dearness Allowance (DA)', prev: data.previousYearTotals?.da, curr: data.currentYearTotals?.da },
                { label: 'House Rent Allowance (HRA)', prev: data.previousYearTotals?.hra, curr: data.currentYearTotals?.hra },
                { label: 'Transport Allowance (TA)', prev: data.previousYearTotals?.ta, curr: data.currentYearTotals?.ta },
                { label: 'Gross Salary', prev: data.previousYearTotals?.grossSalary, curr: data.currentYearTotals?.grossSalary },
                { label: 'NPS Deduction', prev: data.previousYearTotals?.npsEmployeeShare, curr: data.currentYearTotals?.npsEmployeeShare },
                { label: 'TDS Deducted', prev: data.previousYearTotals?.tds, curr: data.currentYearTotals?.tds },
                { label: 'Net Salary', prev: data.previousYearTotals?.netSalary, curr: data.currentYearTotals?.netSalary }
              ].map(row => {
                const prev = row.prev || 0;
                const curr = row.curr || 0;
                const pct = prev > 0 ? ((curr - prev) / prev) * 100 : (curr > 0 ? 100 : 0);
                return (
                  <tr key={row.label} style={{ fontWeight: row.label.includes('Salary') ? 700 : 400 }}>
                    <td>{row.label}</td>
                    <td style={{ textAlign: 'right' }}>{fmt(prev)}</td>
                    <td style={{ textAlign: 'right', color: curr > prev && row.label.includes('Salary') ? '#22c55e' : 'inherit' }}>{fmt(curr)}</td>
                    <td style={{ textAlign: 'right', color: pct > 0 ? '#22c55e' : (pct < 0 ? '#ef4444' : 'inherit') }}>
                      {pct > 0 ? '↑ ' : (pct < 0 ? '↓ ' : '')}{Math.abs(pct).toFixed(1)}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Form 16 Banner */}
      <div style={{ marginTop: '24px', padding: '20px 24px', background: 'linear-gradient(135deg, rgba(201,168,76,0.1), rgba(26,58,110,0.2))', borderRadius: 'var(--radius)', border: '1px solid rgba(201,168,76,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ fontWeight: 700, color: 'var(--accent)', marginBottom: '4px' }}>📋 Form 16 — Annual TDS Certificate & TRACES Statement</div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Generate official Form 16 (Part A & Part B) with quarterly TDS summaries and tax calculations</div>
          
          <div style={{ marginTop: '12px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <select className="form-control-iipm" id="form16EmployeeSelect" style={{ width: '300px', fontWeight: 600 }}>
              <option value="">-- Select Employee --</option>
              {employees.map(e => {
                const empName = formatEmployeeNameWithTitle(e);
                const empId = e.employeeId || e.id || e._id;
                const val = e.id || e._id || e.employeeId;
                return <option key={val} value={val}>{empName} ({empId})</option>;
              })}
            </select>
            <select className="form-control-iipm" id="form16YearSelect" defaultValue="2026" style={{ width: '150px' }}>
              <option value="2026">FY 2026-27</option>
              <option value="2025">FY 2025-26</option>
            </select>
          </div>
        </div>
        <button className="btn-accent-iipm" style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 20px', fontSize: '0.95rem' }} onClick={async () => {
          const selectEl = document.getElementById('form16EmployeeSelect') as HTMLSelectElement;
          const yearEl = document.getElementById('form16YearSelect') as HTMLSelectElement;
          const selectedUserId = selectEl?.value;
          const selectedYear = parseInt(yearEl?.value || '2026');
          if (!selectedUserId) { alert('Please select an employee first.'); return; }
          
          try {
            const data = await apiService.getForm16(selectedUserId, selectedYear);
            printForm16Document(data);
          } catch(e: any) {
            alert('Failed to fetch Form 16. ' + e.message);
          }
        }}>
          Download Form 16
        </button>
      </div>
    </div>
  );
};

export default ReportsPage;
