import React, { useState, useEffect, useContext, useRef } from 'react';
import apiService from '../services/api';
import { UserContext } from '../App';
import { formatEmployeeNameWithTitle } from '../utils/nameUtils';

interface Employee {
  id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  department: string;
  designation: string;
  payLevel: string;
  payIndex: number;
  basicPay: number;
  employeeType?: string;
  deanAllowance?: number;
  specialAllowance?: number;
  ignorablePension?: number;
  otherDeductions?: number;
  taOverride?: number;
  cghsOverride?: number;
  tds?: number;
}

interface PayrollRow {
  user: Employee;
  deanAllowance: number | string;
  ignorablePension: number | string;
  tds: number | string;
  otherDeductions: number;
  remark: string;
}

const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const payLevelBands = ['1 to 5', '6 to 9', '10 to 17'];

interface PayrollManagementProps {
  mode?: 'process' | 'approve';
}

const PayrollManagement: React.FC<PayrollManagementProps> = ({ mode = 'process' }) => {
  const userCtx = useContext(UserContext);
  const [tab, setTab] = useState<'process' | 'drafts' | 'view'>(mode === 'process' ? 'process' : 'view');

  // Filters
  const [staffType, setStaffType] = useState<'all' | 'academic' | 'non_academic'>('all');
  const [department, setDepartment] = useState('');
  const [payLevelBand, setPayLevelBand] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'teaching' | 'non_teaching' | 'contract'>('all');
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());

  const getEmployeeCategory = (u: any): 'teaching' | 'non_teaching' | 'contract' => {
    const eid = (u?.employeeId || '').toUpperCase().trim();
    const et = (u?.employeeType || '').toUpperCase();
    const fn = (u?.function || u?.staffFunction || '').toUpperCase();
    const pl = (u?.payLevel || '').toUpperCase();
    const desig = (u?.designation || '').toUpperCase();

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
      et.includes('CONTRACT') || 
      fn.includes('CONTRACT') || 
      pl.includes('CONSOLIDATED') || 
      pl.includes('FIXED') ||
      desig.includes('CONTRACT')
    ) {
      return 'contract';
    }

    // Fallback based on designation/function
    if (desig.includes('PROFESSOR') || fn.includes('TEACHING')) {
      return 'teaching';
    }

    return 'non_teaching';
  };

  const isContractUser = (u: any) => getEmployeeCategory(u) === 'contract';

  const calculateRowComponents = (row: PayrollRow, currentSettings: Record<string, number>) => {
    const u = row.user;
    const isContract = isContractUser(u);
    const isDirector = (u.employeeId === 'DIR001') || (u.payLevel && String(u.payLevel).includes('17')) || (u.designation && u.designation.toLowerCase().includes('director'));
    const isRegistrar = u.employeeId === 'NT1022';
    
    const bp = (isDirector && (!u.basicPay || u.basicPay <= 0)) ? 225000 : (u.basicPay || 0);
    const daPct = (currentSettings.DA_PERCENTAGE || 60) / 100;
    const hraPct = (currentSettings.HRA_PERCENTAGE || 20) / 100;
    const npsEmpPct = (currentSettings.NPS_EMPLOYEE_PERCENTAGE || 10) / 100;
    const npsEmployerPct = (currentSettings.NPS_EMPLOYER_PERCENTAGE || 14) / 100;

    const da = isContract ? 0 : Math.round(bp * daPct);
    const hra = (isContract || isDirector || isRegistrar) ? 0 : Math.round(bp * hraPct);
    
    const level = parseInt(String(u.payLevel).replace(/\D/g, '') || '10', 10);
    let ta = 0;
    if (u.taOverride !== undefined && u.taOverride !== null) {
      ta = u.taOverride;
    } else if (isContract || isDirector || isRegistrar) {
      ta = 0;
    } else if (level >= 10) {
      const taBase = currentSettings.TA_FIXED_AMOUNT || 3600;
      const taDaPct = (currentSettings.TA_DA_PERCENTAGE || 60) / 100;
      ta = Math.round(taBase * (1 + taDaPct));
    } else if (level >= 1 && level <= 9) {
      const taBase = 1800;
      const taDaPct = (currentSettings.TA_DA_PERCENTAGE || 60) / 100;
      ta = Math.round(taBase * (1 + taDaPct));
    }
    
    const deanAllowance = (row.deanAllowance !== undefined && row.deanAllowance !== '') ? Number(row.deanAllowance) : (u.deanAllowance || u.specialAllowance || 0);
    const ignorablePension = (row.ignorablePension !== undefined && row.ignorablePension !== '') ? Number(row.ignorablePension) : (u.ignorablePension || 0);
    const npsEmp = (isContract || isDirector) ? 0 : Math.round((bp + da) * npsEmpPct);
    const npsEmployer = (isContract || isDirector) ? 0 : Math.round((bp + da) * npsEmployerPct);
    const gross = isContract 
      ? Math.max(0, (bp + deanAllowance) - ignorablePension) 
      : Math.max(0, (bp + da + hra + ta + npsEmployer + deanAllowance) - ignorablePension); 
    
    const pt = currentSettings.PT_AMOUNT || 200;
    const cghs = isContract ? 0 : (level >= 12 ? 1000 : (level >= 7 ? 650 : (level === 6 ? 450 : 250)));
    
    const tdsVal = row.tds === '' ? 0 : Number(row.tds);
    const otherDed = row.otherDeductions !== undefined ? Number(row.otherDeductions) : (u.otherDeductions || 0);
    const totalDed = tdsVal + npsEmp + pt + cghs + otherDed + ((isContract || isDirector) ? 0 : npsEmployer);
    const net = Math.max(0, gross - totalDed);

    return {
      bp,
      da,
      ta,
      hra,
      deanAllowance,
      ignorablePension,
      npsEmployer,
      gross,
      pt,
      tdsVal,
      npsEmp,
      cghs,
      otherDed,
      totalDed,
      net
    };
  };

  // Employees & Payroll rows
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [rows, setRows] = useState<PayrollRow[]>([]);
  const [payrolls, setPayrolls] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [submittingBulk, setSubmittingBulk] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error' | 'warning'; text: string } | null>(null);
  const [selectedPayrolls, setSelectedPayrolls] = useState<string[]>([]);
  const [selectedProcessRowIds, setSelectedProcessRowIds] = useState<string[]>([]);
  const [selectedDraftIds, setSelectedDraftIds] = useState<string[]>([]);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showDraftExportMenu, setShowDraftExportMenu] = useState(false);
  const [showSentExportMenu, setShowSentExportMenu] = useState(false);
  const [employeeFilter, setEmployeeFilter] = useState<'all' | 'pending' | 'processed'>('all');
  const [expandedColumns, setExpandedColumns] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Reject / Forward Modal
  const [rejectModal, setRejectModal] = useState<{ id: string } | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const academicDepartments = [
    'Petroleum Engineering & Earth Sciences',
    'Chemical Engineering',
    'Humanities and Sciences',
    'Mechanical Engineering'
  ];

  const nonAcademicDepartments = [
    'Administration',
    'Finance & Accounts',
    'Lab Assistant',
    'Stores and Purchase',
    'Establishment',
    'Library'
  ];

  const departments = [
    ...academicDepartments,
    ...nonAcademicDepartments,
    'Faculty',
    'Non-Teaching',
    'Academic',
    'Finance',
    'IT',
    'Laboratory',
    'Maintenance',
    'Research',
    'Security'
  ];

  const isAcademicStaff = (u: any): boolean => {
    const cat = getEmployeeCategory(u);
    if (cat === 'teaching') return true;
    const dept = (u?.department || '').trim().toLowerCase();
    if (
      academicDepartments.some(d => d.toLowerCase() === dept) || 
      dept === 'faculty' || 
      dept === 'academic'
    ) {
      return true;
    }
    const desig = (u?.designation || '').toUpperCase();
    if (desig.includes('PROFESSOR') || desig.includes('FACULTY') || desig.includes('LECTURER')) {
      return true;
    }
    const eid = (u?.employeeId || '').toUpperCase().trim();
    if (eid.startsWith('CT') && !eid.startsWith('CNT')) return true;
    return false;
  };

  const isNonAcademicStaff = (u: any): boolean => {
    return !isAcademicStaff(u);
  };

  // Settings state
  const [settings, setSettings] = useState<Record<string, number>>({});
  const [userMap, setUserMap] = useState<Record<string, any>>({});

  // Derived draft and sent payroll lists
  const draftPayrolls = payrolls.filter((p: any) => p.status === 'DRAFT');
  const sentPayrolls = payrolls.filter((p: any) => p.status !== 'DRAFT');

  // Derived filter values — computed fresh on every render
  const filteredRows = rows.filter(row => {
    const u = row.user;
    if (staffType === 'academic' && !isAcademicStaff(u)) return false;
    if (staffType === 'non_academic' && !isNonAcademicStaff(u)) return false;
    if (categoryFilter === 'teaching' && getEmployeeCategory(u) !== 'teaching') return false;
    if (categoryFilter === 'non_teaching' && getEmployeeCategory(u) !== 'non_teaching') return false;
    if (categoryFilter === 'contract' && getEmployeeCategory(u) !== 'contract') return false;
    const hasPayroll = payrolls.some((p: any) => p.userId === row.user.id || p.employeeId === row.user.employeeId);
    if (employeeFilter === 'pending') return !hasPayroll;
    if (employeeFilter === 'processed') return hasPayroll;
    return true;
  });
  const pendingCount = rows.filter(row => {
    const u = row.user;
    if (staffType === 'academic' && !isAcademicStaff(u)) return false;
    if (staffType === 'non_academic' && !isNonAcademicStaff(u)) return false;
    if (categoryFilter === 'teaching' && getEmployeeCategory(u) !== 'teaching') return false;
    if (categoryFilter === 'non_teaching' && getEmployeeCategory(u) !== 'non_teaching') return false;
    if (categoryFilter === 'contract' && getEmployeeCategory(u) !== 'contract') return false;
    return !payrolls.some((p: any) => p.userId === u.id || p.employeeId === u.employeeId);
  }).length;
  const processedCount = rows.filter(row => {
    const u = row.user;
    if (staffType === 'academic' && !isAcademicStaff(u)) return false;
    if (staffType === 'non_academic' && !isNonAcademicStaff(u)) return false;
    if (categoryFilter === 'teaching' && getEmployeeCategory(u) !== 'teaching') return false;
    if (categoryFilter === 'non_teaching' && getEmployeeCategory(u) !== 'non_teaching') return false;
    if (categoryFilter === 'contract' && getEmployeeCategory(u) !== 'contract') return false;
    return payrolls.some((p: any) => p.userId === u.id || p.employeeId === u.employeeId);
  }).length;

  const teachingDraftsCount = draftPayrolls.filter(p => getEmployeeCategory(p) === 'teaching').length;
  const nonTeachingDraftsCount = draftPayrolls.filter(p => getEmployeeCategory(p) === 'non_teaching').length;
  const contractDraftsCount = draftPayrolls.filter(p => getEmployeeCategory(p) === 'contract').length;

  const teachingSentCount = sentPayrolls.filter(p => getEmployeeCategory(p) === 'teaching').length;
  const nonTeachingSentCount = sentPayrolls.filter(p => getEmployeeCategory(p) === 'non_teaching').length;
  const contractSentCount = sentPayrolls.filter(p => getEmployeeCategory(p) === 'contract').length;

  const filteredDrafts = draftPayrolls.filter((p: any) => {
    if (categoryFilter === 'teaching') return getEmployeeCategory(p) === 'teaching';
    if (categoryFilter === 'non_teaching') return getEmployeeCategory(p) === 'non_teaching';
    if (categoryFilter === 'contract') return getEmployeeCategory(p) === 'contract';
    return true;
  });

  const filteredSentPayrolls = sentPayrolls.filter((p: any) => {
    if (categoryFilter === 'teaching') return getEmployeeCategory(p) === 'teaching';
    if (categoryFilter === 'non_teaching') return getEmployeeCategory(p) === 'non_teaching';
    if (categoryFilter === 'contract') return getEmployeeCategory(p) === 'contract';
    return true;
  });

  useEffect(() => { loadPayrolls(); }, [month, year, tab]);
  useEffect(() => {
    // Load settings once when component mounts
    apiService.getAllPayrollSettings().then(data => {
      setSettings(data);
    }).catch(err => console.error('Failed to load settings', err));
    
    // Load all users to map user IDs and employeeIds to full user details
    apiService.getAllUsers().then(users => {
      const map: Record<string, any> = {};
      users.forEach((u: any) => {
        if (u.employeeId) map[u.employeeId] = u;
        if (u.id) map[u.id] = u;
      });
      setUserMap(map);
    }).catch(err => console.error('Failed to load users', err));

    const closeMenus = () => {
      setShowExportMenu(false);
      setShowDraftExportMenu(false);
      setShowSentExportMenu(false);
    };
    window.addEventListener('click', closeMenus);
    return () => window.removeEventListener('click', closeMenus);
  }, []);

  const matchesBand = (level: string, band: string) => {
    if (!level) return false;
    const cleanLevel = String(level).replace(/\D/g, '');
    const l = parseInt(cleanLevel, 10);
    if (isNaN(l)) return false;
    if (band === '1 to 5') return l >= 1 && l <= 5;
    if (band === '6 to 9') return l >= 6 && l <= 9;
    if (band === '10 to 17') return l >= 10 && l <= 17;
    return true;
  };

  const getOfficialDeanAllowance = (u: any): number => {
    if (u.deanAllowance !== undefined && u.deanAllowance !== null && u.deanAllowance > 0) return u.deanAllowance;
    if (u.specialAllowance !== undefined && u.specialAllowance !== null && u.specialAllowance > 0) return u.specialAllowance;
    const empId = (u.employeeId || '').toUpperCase();
    const mapping: Record<string, number> = {
      'TS1029': 3000,
      'TS1027': 3000,
      'TS1011': 3000,
      'TS1012': 3000,
      'TS1013': 3000,
      'TS1014': 3000,
      'TS1017': 3000,
      'TS1033': 5000,
      'CT002': 5000,
    };
    return mapping[empId] || 0;
  };

  const getOfficialOtherDeductions = (u: any): number => {
    if (u.otherDeductions !== undefined && u.otherDeductions !== null && u.otherDeductions > 0) return u.otherDeductions;
    const empId = (u.employeeId || '').toUpperCase();
    const isDirector = (empId === 'DIR001') || (u.payLevel && String(u.payLevel).includes('17')) || (u.designation && u.designation.toLowerCase().includes('director'));
    if (isDirector) return 10501; // official other deductions for Director (700 Car + 9521 LIC + 280 GIS)
    const mapping: Record<string, number> = {
      'NT1016': 40,
      'NT1018': 94,
      'NT1012': 80,
      'TS1026': 40,
      'CNT001': 1800,
      'CNT002': 1800,
      'CNT003': 1800,
      'CNT004': 1800,
      'CT001': 650,
      'CT002': 650,
      'CT003': 650,
      'CT004': 650,
      'CT005': 650,
      'CT006': 650,
    };
    return mapping[empId] || 0;
  };

  const getOfficialTds = (u: any): number => {
    if (u.tds !== undefined && u.tds !== null && u.tds > 0) return u.tds;
    const empId = (u.employeeId || '').toUpperCase().trim();
    const mapping: Record<string, number> = {
      // Faculty Sheet
      'TS1029': 90000,
      'TS1027': 70000,
      'TS1002': 50000,
      'TS1003': 50000,
      'TS1004': 60000,
      'TS1005': 30000,
      'TS1006': 60000,
      'TS1007': 60000,
      'TS1008': 20000,
      'TS1009': 60000,
      'TS1010': 45000,
      'TS1011': 42500,
      'TS1012': 50000,
      'TS1013': 52000,
      'TS1014': 51000,
      'TS1016': 45000,
      'TS1017': 48000,
      'TS1019': 42000,
      'TS1020': 52000,
      'NT1008': 45000,
      'TS1021': 29000,
      'TS1022': 30000,
      'TS1023': 32000,
      'TS1024': 26000,
      'TS1025': 30000,
      'TS1026': 36000,
      'TS1028': 29500,
      'TS1030': 25000,
      'TS1032': 28000,
      'TS1036': 30000,
      'TS1033': 20000,
      'TS1034': 15000,
      'TS1037': 30000,
      'TS1038': 20000,
      // Staff Sheet
      'NT1022': 60000,
      'NT1001': 35000,
      'NT1024': 50000,
      'NTS1027': 10000,
      'NT1002': 5000,
      'NT1023': 0,
      'NT1004': 0,
      'NT1025': 0,
      'NT1026': 0,
      'NT1006': 0,
      'NT1007': 0,
      'NT1005': 0,
      'NT1013': 0,
      'NT1014': 0,
      'NT1015': 0,
      'NT1016': 0,
      'NT1018': 0,
      'NT1019': 0,
      'NT1011': 0,
      'NT1012': 0,
      // Director
      'DIR001': 90000,
    };
    if (mapping[empId] !== undefined) return mapping[empId];
    if (u.tds !== undefined && u.tds !== null) return u.tds;
    return 0;
  };

  const calculateAutoTds = (u: any) => {
    if (u.tds !== undefined && u.tds !== null && u.tds > 0) return u.tds;
    const officialTds = getOfficialTds(u);
    if (officialTds > 0) return officialTds;
    
    const bp = u.basicPay || 0;
    if (bp <= 0) return 0;
    const isContract = isContractUser(u);
    if (isContract) return 0;
    
    // Director Level 17
    const isDirector = (u.employeeId === 'DIR001') || (u.payLevel && String(u.payLevel).includes('17')) || (u.designation && u.designation.toLowerCase().includes('director'));
    if (isDirector) return 90000;
    
    const isRegistrar = u.employeeId === 'NT1022';
    const da = Math.round(bp * ((settings.DA_PERCENTAGE || 60) / 100));
    const hra = (isDirector || isRegistrar) ? 0 : Math.round(bp * ((settings.HRA_PERCENTAGE || 20) / 100));
    const level = parseInt(String(u.payLevel).replace(/\D/g, '') || '10', 10);
    const taBase = level >= 10 ? (settings.TA_FIXED_AMOUNT || 3600) : 1800;
    const ta = (isDirector || isRegistrar) ? 0 : Math.round(taBase * (1 + ((settings.TA_DA_PERCENTAGE || 60) / 100)));
    const deanAllowance = getOfficialDeanAllowance(u);
    const npsEmployer = Math.round((bp + da) * ((settings.NPS_EMPLOYER_PERCENTAGE || 14) / 100));
    
    const monthlyGross = bp + da + hra + ta + deanAllowance + npsEmployer;
    const annualGross = monthlyGross * 12;
    
    // Deductions under Sec 16 & Chapter VI-A (New Tax Regime):
    const stdDeduction = 75000;
    const sec80CCD2 = npsEmployer * 12;
    const ptAnnual = (settings.PT_AMOUNT || 200) * 12;
    
    const taxableIncome = Math.max(0, annualGross - stdDeduction - sec80CCD2 - ptAnnual);
    if (taxableIncome <= 700000) return 0;
    
    let annualTax = 0;
    if (taxableIncome > 1500000) {
      annualTax = 140000 + (taxableIncome - 1500000) * 0.30;
    } else if (taxableIncome > 1200000) {
      annualTax = 80000 + (taxableIncome - 1200000) * 0.20;
    } else if (taxableIncome > 1000000) {
      annualTax = 50000 + (taxableIncome - 1000000) * 0.15;
    } else if (taxableIncome > 700000) {
      annualTax = 20000 + (taxableIncome - 700000) * 0.10;
    }
    const monthlyTds = Math.round((annualTax * 1.04) / 12);
    return Math.round(monthlyTds / 100) * 100;
  };

  const loadEmployees = async () => {
    try {
      setLoading(true);
      const [all, monthPayrolls] = await Promise.all([
        apiService.getAllUsers() || [],
        apiService.getPayrollsByMonth(month, year) || []
      ]);
      setPayrolls(monthPayrolls);

      const filtered = (all || []).filter((u: any) => {
        if (!u.isActive || !u.basicPay) return false;
        if (staffType === 'academic' && !isAcademicStaff(u)) return false;
        if (staffType === 'non_academic' && !isNonAcademicStaff(u)) return false;
        if (department) {
          const uDept = (u.department || '').toLowerCase().trim();
          const sDept = department.toLowerCase().trim();
          if (uDept !== sDept) return false;
        }
        if (payLevelBand && !matchesBand(u.payLevel, payLevelBand)) return false;
        if (categoryFilter === 'teaching' && getEmployeeCategory(u) !== 'teaching') return false;
        if (categoryFilter === 'non_teaching' && getEmployeeCategory(u) !== 'non_teaching') return false;
        if (categoryFilter === 'contract' && getEmployeeCategory(u) !== 'contract') return false;
        return true;
      });
      setEmployees(filtered);

      const payrollMap: Record<string, any> = {};
      (monthPayrolls || []).forEach((p: any) => {
        if (p.userId) payrollMap[p.userId] = p;
        if (p.employeeId) payrollMap[p.employeeId] = p;
      });

      setRows(filtered.map((u: any) => {
        const existingP = payrollMap[u.id] || payrollMap[u.employeeId];
        const defaultDean = (existingP && existingP.otherAllowances !== undefined && existingP.otherAllowances !== null)
          ? existingP.otherAllowances
          : (u.deanAllowance !== undefined && u.deanAllowance !== null ? u.deanAllowance : (u.specialAllowance || getOfficialDeanAllowance(u) || 0));
        const defaultPension = (existingP && existingP.ignorablePension !== undefined && existingP.ignorablePension !== null)
          ? existingP.ignorablePension
          : (u.ignorablePension !== undefined && u.ignorablePension !== null ? u.ignorablePension : 0);
        return {
          user: u,
          deanAllowance: defaultDean,
          ignorablePension: defaultPension,
          tds: (existingP && existingP.tds !== undefined && existingP.tds !== null) ? existingP.tds : calculateAutoTds(u),
          otherDeductions: (existingP && existingP.otherDeductions !== undefined && existingP.otherDeductions !== null) ? existingP.otherDeductions : getOfficialOtherDeductions(u),
          remark: (existingP && existingP.remark) ? existingP.remark : ''
        };
      }));
      
      const currentPayrolls = Array.isArray(monthPayrolls) ? monthPayrolls : [];
      const alreadyApprovedCount = filtered.filter((u: any) => 
        currentPayrolls.some((p: any) => (p.userId === u.id || p.employeeId === u.employeeId) && (p.status === 'APPROVED' || p.status === 'RELEASED'))
      ).length;

      const restoredDraftCount = filtered.filter((u: any) => 
        currentPayrolls.some((p: any) => (p.userId === u.id || p.employeeId === u.employeeId) && p.status === 'DRAFT')
      ).length;

      if (alreadyApprovedCount > 0) {
        setMsg({ type: 'warning', text: `Warning: ${alreadyApprovedCount} loaded employee(s) are already APPROVED for this month. The system will safely skip them when you submit.` });
      } else if (restoredDraftCount > 0) {
        setMsg({ type: 'success', text: `💾 Restored saved draft values for ${restoredDraftCount} employee(s) for ${months[month - 1]} ${year}.` });
      } else if (filtered.length === 0) {
        setMsg({ type: 'error', text: 'No active employees found matching your filters.' });
      } else {
        setMsg(null); // Clear previous messages
      }
    } catch (err: any) {
      console.error(err);
      setMsg({ type: 'error', text: err?.response?.data?.message || err?.message || 'Failed to load employees.' });
    } finally {
      setLoading(false);
    }
  };

  const loadPayrolls = async () => {
    try {
      const data = await apiService.getPayrollsByMonth(month, year);
      setPayrolls(data || []);
      setCurrentPage(1);
    } catch { setPayrolls([]); }
  };

  const updateRow = (userId: string, field: keyof PayrollRow, value: any) => {
    setRows(prev => prev.map(r => r.user.id === userId ? { ...r, [field]: value } : r));
  };

  const saveDraftPayroll = async () => {
    if (rows.length === 0) { setMsg({ type: 'error', text: 'Load employees first.' }); return; }
    setSavingDraft(true);
    setMsg(null);
    try {
      const deanAllowanceMap: Record<string, number> = {};
      const ignorablePensionMap: Record<string, number> = {};
      const tdsMap: Record<string, number> = {};
      const otherDeductionsMap: Record<string, number> = {};
      const remarksMap: Record<string, string> = {};
      
      rows.forEach(r => { 
        const deanVal = (r.deanAllowance !== undefined && r.deanAllowance !== '') ? Number(r.deanAllowance) : (r.user.deanAllowance || r.user.specialAllowance || 0);
        deanAllowanceMap[r.user.id] = deanVal;
        const pensionVal = (r.ignorablePension !== undefined && r.ignorablePension !== '') ? Number(r.ignorablePension) : (r.user.ignorablePension || 0);
        ignorablePensionMap[r.user.id] = pensionVal;
        if (r.tds !== '') tdsMap[r.user.id] = Number(r.tds);
        if (r.otherDeductions !== undefined) otherDeductionsMap[r.user.id] = Number(r.otherDeductions);
        remarksMap[r.user.id] = r.remark;
      });
      
      const payload = {
        department,
        payLevel: payLevelBand,
        month,
        year,
        status: 'DRAFT',
        deanAllowanceMap,
        otherAllowancesMap: deanAllowanceMap,
        ignorablePensionMap,
        tdsMap,
        otherDeductionsMap,
        remarksMap
      };
      
      const res = await apiService.api.post('/payroll/bulk', payload);
      const count = res.data?.data?.length || rows.length;
      setMsg({ type: 'success', text: `💾 ${count} payroll records saved as DRAFT successfully! Data is persisted across logout/login and can be submitted anytime.` });

      await loadPayrolls();
    } catch (e: any) {
      setMsg({ type: 'error', text: e.response?.data?.message || 'Error saving draft payroll.' });
    } finally {
      setSavingDraft(false);
    }
  };

  const submitBulkPayroll = async () => {
    if (rows.length === 0) { setMsg({ type: 'error', text: 'Load employees first.' }); return; }
    setSubmittingBulk(true);
    setMsg(null);
    try {
      const deanAllowanceMap: Record<string, number> = {};
      const ignorablePensionMap: Record<string, number> = {};
      const tdsMap: Record<string, number> = {};
      const otherDeductionsMap: Record<string, number> = {};
      const remarksMap: Record<string, string> = {};
      
      rows.forEach(r => { 
        const deanVal = (r.deanAllowance !== undefined && r.deanAllowance !== '') ? Number(r.deanAllowance) : (r.user.deanAllowance || r.user.specialAllowance || 0);
        deanAllowanceMap[r.user.id] = deanVal;
        const pensionVal = (r.ignorablePension !== undefined && r.ignorablePension !== '') ? Number(r.ignorablePension) : (r.user.ignorablePension || 0);
        ignorablePensionMap[r.user.id] = pensionVal;
        if (r.tds !== '') tdsMap[r.user.id] = Number(r.tds);
        if (r.otherDeductions !== undefined) otherDeductionsMap[r.user.id] = Number(r.otherDeductions);
        remarksMap[r.user.id] = r.remark;
      });
      
      const payload = {
        department,
        payLevel: payLevelBand,
        month,
        year,
        status: 'PENDING',
        deanAllowanceMap,
        otherAllowancesMap: deanAllowanceMap,
        ignorablePensionMap,
        tdsMap,
        otherDeductionsMap,
        remarksMap
      };
      
      const res = await apiService.api.post('/payroll/bulk', payload);
      const count = res.data?.data?.length || rows.length;
      setMsg({ type: 'success', text: `✓ ${count} payroll records submitted for approval successfully!` });

      await loadPayrolls();
      setTab('view');
    } catch (e: any) {
      setMsg({ type: 'error', text: e.response?.data?.message || 'Error processing payroll.' });
    } finally {
      setSubmittingBulk(false);
    }
  };

  const submitDraftPayrolls = async (ids?: string[]) => {
    const targetIds = ids && ids.length > 0 ? ids : draftPayrolls.map(p => p.id);
    if (targetIds.length === 0) {
      setMsg({ type: 'warning', text: 'No draft records to submit.' });
      return;
    }
    if (!window.confirm(`Submit ${targetIds.length} draft payroll record(s) for approval?`)) return;
    setLoading(true);
    setMsg(null);
    try {
      await apiService.bulkSubmitPayroll(targetIds);
      setMsg({ type: 'success', text: `✓ ${targetIds.length} draft payroll record(s) submitted for approval successfully!` });
      await loadPayrolls();
      setTab('view');
    } catch (e: any) {
      setMsg({ type: 'error', text: e.response?.data?.message || 'Error submitting drafts for approval.' });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAllProcessRows = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedProcessRowIds(filteredRows.map(r => r.user.id));
    } else {
      setSelectedProcessRowIds([]);
    }
  };

  const handleToggleProcessRow = (userId: string) => {
    setSelectedProcessRowIds(prev => 
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const handleToggleAllDrafts = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedDraftIds(filteredDrafts.map((d: any) => d.id));
    } else {
      setSelectedDraftIds([]);
    }
  };

  const handleToggleDraft = (draftId: string) => {
    setSelectedDraftIds(prev => 
      prev.includes(draftId) ? prev.filter(id => id !== draftId) : [...prev, draftId]
    );
  };

  const printSalaryRegisterPdf = (title: string, subtitle: string, data: any[]) => {
    const totalBasic = data.reduce((s, r) => s + (r['Basic Pay (Rs.)'] || 0), 0);
    const totalDa = data.reduce((s, r) => s + (r['DA (Rs.)'] || r['DA 60% (Rs.)'] || 0), 0);
    const totalTa = data.reduce((s, r) => s + (r['TA (Rs.)'] || 0), 0);
    const totalHra = data.reduce((s, r) => s + (r['HRA (Rs.)'] || r['HRA 20% (Rs.)'] || 0), 0);
    const totalDean = data.reduce((s, r) => s + (r['Dean / Warden (Rs.)'] || r['Dean / Warden Allowance (Rs.)'] || r['Dean/Warden Allowance (Rs.)'] || 0), 0);
    const totalNpsEmployer = data.reduce((s, r) => s + (r['NPS Employer Share (Rs.)'] || 0), 0);
    const totalIgnorablePension = data.reduce((s, r) => s + (r['Deductable Pension (Rs.)'] || r['Ignorable Pension (Rs.)'] || 0), 0);
    const totalGross = data.reduce((s, r) => s + (r['Gross Salary (Rs.)'] || 0), 0);
    const totalPt = data.reduce((s, r) => s + (r['Professional Tax (Rs.)'] || 0), 0);
    const totalTds = data.reduce((s, r) => s + (r['TDS (Rs.)'] || 0), 0);
    const totalNpsEmp = data.reduce((s, r) => s + (r['NPS Employee Share (Rs.)'] || 0), 0);
    const totalCghs = data.reduce((s, r) => s + (r['CGHS Contribution (Rs.)'] || r['CGHS (Rs.)'] || 0), 0);
    const totalOtherDed = data.reduce((s, r) => s + (r['Other Deductions (Rs.)'] || 0), 0);
    const totalDed = data.reduce((s, r) => s + (r['Total Deductions (Rs.)'] || 0), 0);
    const totalNet = data.reduce((s, r) => s + (r['Net Salary (Rs.)'] || 0), 0);
    const fmtInr = (n: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${title}</title>
        <style>
          @page { size: landscape; margin: 8mm; }
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; font-size: 8pt; color: #0f172a; margin: 0; padding: 10px; background: #fff; }
          .header { text-align: center; border-bottom: 2px solid #0a3161; padding-bottom: 8px; margin-bottom: 10px; }
          .logo-title { font-size: 13pt; font-weight: 800; color: #0a3161; letter-spacing: 0.5px; }
          .subtitle { font-size: 10pt; font-weight: 700; color: #b45309; margin-top: 3px; }
          .meta-info { font-size: 8pt; color: #475569; margin-top: 5px; display: flex; justify-content: space-between; }
          table { width: 100%; border-collapse: collapse; margin-top: 6px; font-size: 7.5pt; }
          th, td { border: 1px solid #cbd5e1; padding: 4px 5px; text-align: left; }
          th { background-color: #f1f5f9; color: #0a3161; font-weight: 700; text-align: center; }
          .num { text-align: right; font-variant-numeric: tabular-nums; }
          .bold { font-weight: 700; }
          .gross-cell { background-color: #f8fafc; font-weight: 600; }
          .net-cell { background-color: #f0fdf4; color: #15803d; font-weight: 700; }
          .ded-cell { background-color: #fef2f2; color: #b91c1c; }
          tfoot tr { background-color: #e2e8f0; font-weight: 800; }
          .signatures { display: flex; justify-content: space-between; margin-top: 35px; padding: 0 25px; font-size: 8.5pt; font-weight: 600; }
          .sig-line { border-top: 1px solid #334155; width: 170px; text-align: center; padding-top: 5px; }
          @media print {
            body { padding: 0; }
            .no-print { display: none !important; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo-title">INDIAN INSTITUTE OF PETROLEUM AND ENERGY</div>
          <div class="subtitle">${title.toUpperCase()} (${subtitle.toUpperCase()})</div>
          <div class="meta-info">
            <span><strong>Total Records:</strong> ${data.length}</span>
            <span><strong>Generated Date:</strong> ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th style="width: 22px;">#</th>
              <th>Emp ID</th>
              <th>Employee Name</th>
              <th>Designation</th>
              <th>Level</th>
              <th>Basic</th>
              <th>DA</th>
              <th>TA</th>
              <th>HRA</th>
              <th>Dean/Warden</th>
              <th>NPS (Emp'r)</th>
              <th style="color: #b91c1c;">Deductable Pension</th>
              <th>Gross</th>
              <th>PT</th>
              <th>TDS</th>
              <th>NPS (Emp)</th>
              <th>CGHS</th>
              <th>Other Ded.</th>
              <th>Total Ded.</th>
              <th>Net Salary</th>
            </tr>
          </thead>
          <tbody>
            ${data.map((r, idx) => `
              <tr>
                <td style="text-align: center;">${idx + 1}</td>
                <td class="bold">${r['Employee ID']}</td>
                <td>${r['Name of the Employee']}</td>
                <td>${r['Designation']}</td>
                <td>${r['Pay Level']}</td>
                <td class="num">${fmtInr(r['Basic Pay (Rs.)'])}</td>
                <td class="num">${fmtInr(r['DA (Rs.)'] || r['DA 60% (Rs.)'])}</td>
                <td class="num">${fmtInr(r['TA (Rs.)'])}</td>
                <td class="num">${fmtInr(r['HRA (Rs.)'] || r['HRA 20% (Rs.)'])}</td>
                <td class="num">${fmtInr(r['Dean / Warden (Rs.)'] || r['Dean / Warden Allowance (Rs.)'] || r['Dean/Warden Allowance (Rs.)'])}</td>
                <td class="num">${fmtInr(r['NPS Employer Share (Rs.)'])}</td>
                <td class="num" style="color: #b91c1c;">${fmtInr(r['Deductable Pension (Rs.)'] || r['Ignorable Pension (Rs.)'])}</td>
                <td class="num gross-cell">${fmtInr(r['Gross Salary (Rs.)'])}</td>
                <td class="num">${fmtInr(r['Professional Tax (Rs.)'])}</td>
                <td class="num" style="color: #b45309;">${fmtInr(r['TDS (Rs.)'])}</td>
                <td class="num">${fmtInr(r['NPS Employee Share (Rs.)'])}</td>
                <td class="num">${fmtInr(r['CGHS Contribution (Rs.)'] || r['CGHS (Rs.)'])}</td>
                <td class="num">${fmtInr(r['Other Deductions (Rs.)'])}</td>
                <td class="num ded-cell">${fmtInr(r['Total Deductions (Rs.)'])}</td>
                <td class="num net-cell">${fmtInr(r['Net Salary (Rs.)'])}</td>
              </tr>
            `).join('')}
          </tbody>
          <tfoot>
            <tr>
              <td colspan="5" style="text-align: right; font-weight: 800; padding-right: 10px;">TOTAL (${data.length} Records):</td>
              <td class="num bold">${fmtInr(totalBasic)}</td>
              <td class="num bold">${fmtInr(totalDa)}</td>
              <td class="num bold">${fmtInr(totalTa)}</td>
              <td class="num bold">${fmtInr(totalHra)}</td>
              <td class="num bold">${fmtInr(totalDean)}</td>
              <td class="num bold">${fmtInr(totalNpsEmployer)}</td>
              <td class="num bold" style="color: #b91c1c;">${fmtInr(totalIgnorablePension)}</td>
              <td class="num gross-cell bold">${fmtInr(totalGross)}</td>
              <td class="num bold">${fmtInr(totalPt)}</td>
              <td class="num bold" style="color: #b45309;">${fmtInr(totalTds)}</td>
              <td class="num bold">${fmtInr(totalNpsEmp)}</td>
              <td class="num bold">${fmtInr(totalCghs)}</td>
              <td class="num bold">${fmtInr(totalOtherDed)}</td>
              <td class="num ded-cell bold">${fmtInr(totalDed)}</td>
              <td class="num net-cell bold" style="font-size: 8.5pt;">${fmtInr(totalNet)}</td>
            </tr>
          </tfoot>
        </table>
        <div class="signatures">
          <div class="sig-line">Prepared By (F&A Operator)</div>
          <div class="sig-line">Checked By (AR / DR Finance)</div>
          <div class="sig-line">Approved By (Registrar / Director)</div>
        </div>
      </body>
      </html>
    `;

    const win = window.open('', '_blank');
    if (win) {
      win.document.write(html);
      win.document.close();
      setTimeout(() => {
        win.focus();
        win.print();
      }, 500);
    }
    setMsg({ type: 'success', text: `✓ Generated PDF print statement for ${data.length} record(s).` });
  };

  const exportProcessData = (format: 'excel' | 'csv' | 'pdf') => {
    const targetRows = selectedProcessRowIds.length > 0 
      ? filteredRows.filter(r => selectedProcessRowIds.includes(r.user.id)) 
      : filteredRows;
    
    if (targetRows.length === 0) {
      setMsg({ type: 'error', text: 'No rows available to export. Please click "Fetch List" first.' });
      return;
    }

    const exportData = targetRows.map((row, i) => {
      const u = row.user;
      const calc = calculateRowComponents(row, settings);

      return {
        'Sl.No': i + 1,
        'Employee ID': u.employeeId || '',
        'Name of the Employee': formatEmployeeNameWithTitle(u),
        'Designation': u.designation || '',
        'Pay Level': `Level-${u.payLevel || ''}`,
        'Basic Pay (Rs.)': calc.bp,
        'DA (Rs.)': calc.da,
        'TA (Rs.)': calc.ta,
        'HRA (Rs.)': calc.hra,
        'Dean / Warden (Rs.)': calc.deanAllowance,
        'NPS Employer Share (Rs.)': calc.npsEmployer,
        'Deductable Pension (Rs.)': calc.ignorablePension || 0,
        'Gross Salary (Rs.)': calc.gross,
        'Professional Tax (Rs.)': calc.pt,
        'TDS (Rs.)': calc.tdsVal,
        'NPS Employee Share (Rs.)': calc.npsEmp,
        'CGHS Contribution (Rs.)': calc.cghs,
        'Other Deductions (Rs.)': calc.otherDed,
        'Total Deductions (Rs.)': calc.totalDed,
        'Net Salary (Rs.)': calc.net,
        'Remark': row.remark || ''
      };
    });

    const filePrefix = `IIPE_Salary_Statement_${months[month - 1]}_${year}${selectedProcessRowIds.length > 0 ? '_Selected' : ''}`;

    if (format === 'excel') {
      import('xlsx').then(XLSX => {
        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, `Salary_${months[month - 1]}_${year}`);
        XLSX.writeFile(wb, `${filePrefix}.xlsx`);
        setMsg({ type: 'success', text: `✓ Exported ${targetRows.length} record(s) to Excel successfully!` });
      }).catch(() => setMsg({ type: 'error', text: 'Error generating Excel export.' }));
    } else if (format === 'csv') {
      import('xlsx').then(XLSX => {
        const ws = XLSX.utils.json_to_sheet(exportData);
        const csv = XLSX.utils.sheet_to_csv(ws);
        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.setAttribute('download', `${filePrefix}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setMsg({ type: 'success', text: `✓ Exported ${targetRows.length} record(s) to CSV successfully!` });
      }).catch(() => setMsg({ type: 'error', text: 'Error generating CSV export.' }));
    } else if (format === 'pdf') {
      const catTitle = categoryFilter === 'all' ? 'All Personnel' : categoryFilter === 'teaching' ? 'Regular - Teaching' : categoryFilter === 'non_teaching' ? 'Regular - Non Teaching' : 'Contract';
      printSalaryRegisterPdf(`Salary Statement — ${months[month - 1]} ${year}`, catTitle, exportData);
    }
  };

  const exportDraftsData = (format: 'excel' | 'csv' | 'pdf') => {
    const targetDrafts = selectedDraftIds.length > 0 
      ? filteredDrafts.filter((d: any) => selectedDraftIds.includes(d.id))
      : filteredDrafts;

    if (targetDrafts.length === 0) {
      setMsg({ type: 'error', text: 'No draft records available to export.' });
      return;
    }

    const data = targetDrafts.map((p: any, i: number) => {
      const u = userMap[p.employeeId] || userMap[p.userId] || {};
      const empName = formatEmployeeNameWithTitle(p, u);
      return {
        'Sl.No': i + 1,
        'Employee ID': p.employeeId,
        'Name of the Employee': empName,
        'Designation': u.designation || p.designation || '',
        'Pay Level': p.payLevel ? `Level-${p.payLevel}` : (u.payLevel ? `Level-${u.payLevel}` : ''),
        'Month': months[p.month - 1] || p.month,
        'Year': p.year,
        'Basic Pay (Rs.)': p.basicPay || 0,
        'DA (Rs.)': p.da || 0,
        'TA (Rs.)': p.ta || 0,
        'HRA (Rs.)': p.hra || 0,
        'Dean / Warden (Rs.)': p.otherAllowances || 0,
        'NPS Employer Share (Rs.)': p.npsEmployerShare || 0,
        'Deductable Pension (Rs.)': p.ignorablePension || 0,
        'Gross Salary (Rs.)': p.grossSalary || 0,
        'Professional Tax (Rs.)': p.professionalTax || 0,
        'TDS (Rs.)': p.tds || 0,
        'NPS Employee Share (Rs.)': p.npsEmployeeShare || 0,
        'CGHS Contribution (Rs.)': p.cghs || 0,
        'Other Deductions (Rs.)': p.otherDeductions || 0,
        'Total Deductions (Rs.)': p.totalDeductions || 0,
        'Net Salary (Rs.)': p.netSalary || 0,
        'Status': 'DRAFT',
        'Remark': p.remark || ''
      };
    });

    const filePrefix = `IIPE_Draft_Payrolls_${months[month - 1]}_${year}${selectedDraftIds.length > 0 ? '_Selected' : ''}`;

    if (format === 'excel') {
      import('xlsx').then(XLSX => {
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, `Draft_Payrolls_${months[month - 1]}_${year}`);
        XLSX.writeFile(wb, `${filePrefix}.xlsx`);
        setMsg({ type: 'success', text: `✓ Draft payrolls exported to Excel successfully!` });
      }).catch(() => setMsg({ type: 'error', text: 'Error generating Excel export.' }));
    } else if (format === 'csv') {
      import('xlsx').then(XLSX => {
        const ws = XLSX.utils.json_to_sheet(data);
        const csv = XLSX.utils.sheet_to_csv(ws);
        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.setAttribute('download', `${filePrefix}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setMsg({ type: 'success', text: `✓ Draft payrolls exported to CSV successfully!` });
      }).catch(() => setMsg({ type: 'error', text: 'Error generating CSV export.' }));
    } else if (format === 'pdf') {
      printSalaryRegisterPdf(`Draft Payroll Records — ${months[month - 1]} ${year}`, 'Drafts', data);
    }
  };

  const exportSentData = (format: 'excel' | 'csv' | 'pdf') => {
    const targetList = selectedPayrolls.length > 0
      ? filteredSentPayrolls.filter((p: any) => selectedPayrolls.includes(p.id))
      : filteredSentPayrolls;

    if (targetList.length === 0) {
      setMsg({ type: 'error', text: 'No records available to export.' });
      return;
    }

    const data = targetList.map((p: any, i: number) => {
      const u = userMap[p.employeeId] || userMap[p.userId] || {};
      const empName = formatEmployeeNameWithTitle(p, u);
      return {
        'Sl.No': i + 1,
        'Employee ID': p.employeeId,
        'Name of the Employee': empName,
        'Designation': u.designation || p.designation || '',
        'Pay Level': p.payLevel ? `Level-${p.payLevel}` : (u.payLevel ? `Level-${u.payLevel}` : ''),
        'Month': months[p.month - 1] || p.month,
        'Year': p.year,
        'Basic Pay (Rs.)': p.basicPay || 0,
        'DA (Rs.)': p.da || 0,
        'TA (Rs.)': p.ta || 0,
        'HRA (Rs.)': p.hra || 0,
        'Dean / Warden (Rs.)': p.otherAllowances || 0,
        'NPS Employer Share (Rs.)': p.npsEmployerShare || 0,
        'Deductable Pension (Rs.)': p.ignorablePension || 0,
        'Gross Salary (Rs.)': p.grossSalary || 0,
        'Professional Tax (Rs.)': p.professionalTax || 0,
        'TDS (Rs.)': p.tds || 0,
        'NPS Employee Share (Rs.)': p.npsEmployeeShare || 0,
        'CGHS Contribution (Rs.)': p.cghs || 0,
        'Other Deductions (Rs.)': p.otherDeductions || 0,
        'Total Deductions (Rs.)': p.totalDeductions || 0,
        'Net Salary (Rs.)': p.netSalary || 0,
        'Status': p.status || '',
        'Remark': p.remark || ''
      };
    });

    const filePrefix = `IIPE_Payroll_Register_${months[month - 1]}_${year}${selectedPayrolls.length > 0 ? '_Selected' : ''}`;

    if (format === 'excel') {
      import('xlsx').then(XLSX => {
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Payroll Register");
        XLSX.writeFile(wb, `${filePrefix}.xlsx`);
        setMsg({ type: 'success', text: `✓ Payroll register exported to Excel successfully!` });
      }).catch(() => setMsg({ type: 'error', text: 'Error generating Excel export.' }));
    } else if (format === 'csv') {
      import('xlsx').then(XLSX => {
        const ws = XLSX.utils.json_to_sheet(data);
        const csv = XLSX.utils.sheet_to_csv(ws);
        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.setAttribute('download', `${filePrefix}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setMsg({ type: 'success', text: `✓ Payroll register exported to CSV successfully!` });
      }).catch(() => setMsg({ type: 'error', text: 'Error generating CSV export.' }));
    } else if (format === 'pdf') {
      printSalaryRegisterPdf(`Payroll Statement / Register — ${months[month - 1]} ${year}`, 'Sent Records', data);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      await apiService.approvePayroll(id);
      setMsg({ type: 'success', text: 'Salary Released successfully.' });
      loadPayrolls();
    } catch { setMsg({ type: 'error', text: 'Error releasing salary.' }); }
  };

  const handleReject = async () => {
    if (!rejectModal) return;
    try {
      const formData = new FormData();
      formData.append('reason', rejectReason);
      attachments.forEach(file => formData.append('files', file));

      await apiService.api.put(`/payroll/${rejectModal.id}/reject`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      setMsg({ type: 'success', text: 'Payroll forwarded back to operator with attachments.' });
      setRejectModal(null);
      setRejectReason('');
      setAttachments([]);
      loadPayrolls();
    } catch { setMsg({ type: 'error', text: 'Error rejecting payroll.' }); }
  };

  const fmt = (n: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);

  const statusBadge: Record<string, string> = {
    PENDING: '#f59e0b', APPROVED: '#22c55e', REJECTED: '#ef4444', LOCKED: '#8b5cf6', SUBMITTED: '#3b82f6'
  };

  const totalPages = Math.max(1, Math.ceil(filteredSentPayrolls.length / itemsPerPage));
  const currentPayrolls = filteredSentPayrolls.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleSelectAllPayrolls = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) setSelectedPayrolls(filteredSentPayrolls.map(p => p.id));
    else setSelectedPayrolls([]);
  };

  const handleSelectPayroll = (id: string) => {
    if (selectedPayrolls.includes(id)) setSelectedPayrolls(selectedPayrolls.filter(p => p !== id));
    else setSelectedPayrolls([...selectedPayrolls, id]);
  };

  const handleBulkApprove = async () => {
    if (!window.confirm(`Approve ${selectedPayrolls.length} payroll records?`)) return;
    try {
      setLoading(true);
      await apiService.api.post('/payroll/bulk-approve', selectedPayrolls);
      setMsg({ type: 'success', text: `Approved ${selectedPayrolls.length} records.` });
      setSelectedPayrolls([]);
      loadPayrolls();
    } catch (err: any) {
      setMsg({ type: 'error', text: 'Bulk approve failed: ' + (err.response?.data?.message || err.message) });
    } finally {
      setLoading(false);
    }
  };

  const handleBulkReject = async () => {
    const reason = window.prompt(`Reject ${selectedPayrolls.length} payroll records. Please enter a reason:`);
    if (reason === null) return;
    try {
      setLoading(true);
      await apiService.api.post(`/payroll/bulk-reject?reason=${encodeURIComponent(reason)}`, selectedPayrolls);
      setMsg({ type: 'success', text: `Rejected ${selectedPayrolls.length} records.` });
      setSelectedPayrolls([]);
      loadPayrolls();
    } catch (err: any) {
      setMsg({ type: 'error', text: 'Bulk reject failed: ' + (err.response?.data?.message || err.message) });
    } finally {
      setLoading(false);
    }
  };

  const isAdmin = apiService.isSuperAdmin() || apiService.isFAAdmin();

  return (
    <div className="page-container" style={{ padding: '24px 32px', width: '100%', overflowX: 'hidden' }}>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', background: '#ffffff', padding: '24px 28px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03)', border: '1px solid var(--border)', marginBottom: '24px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)' }}>Salary Processing</h1>
          <p style={{ margin: '8px 0 0 0', color: 'var(--text-muted)', fontSize: '0.95rem' }}>Process and verify payroll — {months[month - 1]} {year}</p>
        </div>
      </div>

      {msg && (
        <div className={`alert-iipm ${msg.type === 'success' ? 'alert-success' : 'alert-danger'}`}
          style={{ marginBottom: '20px' }}>
          {msg.text}
          <button onClick={() => setMsg(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontSize: '1rem' }}>✕</button>
        </div>
      )}

      {mode === 'process' && (
        <div style={{ display: 'flex', gap: '0', marginBottom: '24px', borderBottom: '1px solid var(--border)' }}>
          <button onClick={() => setTab('process')} style={{
            padding: '10px 24px', background: 'none', border: 'none',
            borderBottom: `2px solid ${tab === 'process' ? 'var(--accent)' : 'transparent'}`,
            color: tab === 'process' ? 'var(--accent)' : 'var(--text-muted)',
            fontWeight: 600, cursor: 'pointer', fontSize: '0.9rem', fontFamily: 'var(--font)'
          }}>
            ⊕ Salary Process
          </button>
          <button onClick={() => setTab('drafts')} style={{
            padding: '10px 24px', background: 'none', border: 'none',
            borderBottom: `2px solid ${tab === 'drafts' ? 'var(--accent)' : 'transparent'}`,
            color: tab === 'drafts' ? 'var(--accent)' : 'var(--text-muted)',
            fontWeight: 600, cursor: 'pointer', fontSize: '0.9rem', fontFamily: 'var(--font)'
          }}>
            💾 Saved Drafts ({draftPayrolls.length})
          </button>
          <button onClick={() => setTab('view')} style={{
            padding: '10px 24px', background: 'none', border: 'none',
            borderBottom: `2px solid ${tab === 'view' ? 'var(--accent)' : 'transparent'}`,
            color: tab === 'view' ? 'var(--accent)' : 'var(--text-muted)',
            fontWeight: 600, cursor: 'pointer', fontSize: '0.9rem', fontFamily: 'var(--font)'
          }}>
            📋 Sent for Approval ({sentPayrolls.length})
          </button>
        </div>
      )}

      {tab === 'process' && (
        <>
          <div className="card-iipm" style={{ padding: '20px', marginBottom: '20px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px', alignItems: 'flex-end' }}>
              <div>
                <label className="form-label-iipm">Staff Classification</label>
                <select 
                  className="form-control-iipm" 
                  value={staffType} 
                  onChange={e => {
                    const val = e.target.value as 'all' | 'academic' | 'non_academic';
                    setStaffType(val);
                    setDepartment('');
                    if (val === 'academic') {
                      if (categoryFilter === 'non_teaching') setCategoryFilter('all');
                    } else if (val === 'non_academic') {
                      if (categoryFilter === 'teaching') setCategoryFilter('all');
                    }
                  }}
                >
                  <option value="all">All Staff</option>
                  <option value="academic">🎓 Academic Staff</option>
                  <option value="non_academic">🏢 Non-Academic Staff</option>
                </select>
              </div>
              <div>
                <label className="form-label-iipm">Select Department</label>
                <select className="form-control-iipm" value={department} onChange={e => setDepartment(e.target.value)}>
                  <option value="">
                    {staffType === 'academic' ? 'All Academic Departments' : staffType === 'non_academic' ? 'All Non-Academic Departments' : 'All Departments'}
                  </option>
                  {staffType === 'academic' && (
                    academicDepartments.map(d => <option key={d} value={d}>{d}</option>)
                  )}
                  {staffType === 'non_academic' && (
                    nonAcademicDepartments.map(d => <option key={d} value={d}>{d}</option>)
                  )}
                  {staffType === 'all' && (
                    <>
                      <optgroup label="Academic Departments">
                        {academicDepartments.map(d => <option key={d} value={d}>{d}</option>)}
                      </optgroup>
                      <optgroup label="Non-Academic Departments">
                        {nonAcademicDepartments.map(d => <option key={d} value={d}>{d}</option>)}
                      </optgroup>
                      <optgroup label="Other / Legacy">
                        {['Faculty', 'Non-Teaching', 'Finance', 'IT', 'Laboratory', 'Maintenance', 'Research', 'Security'].map(d => <option key={d} value={d}>{d}</option>)}
                      </optgroup>
                    </>
                  )}
                </select>
              </div>
              <div>
                <label className="form-label-iipm">Category</label>
                <select className="form-control-iipm" value={categoryFilter} onChange={e => setCategoryFilter(e.target.value as any)}>
                  {staffType === 'academic' ? (
                    <>
                      <option value="all">All Academic Personnel</option>
                      <option value="teaching">👨‍🏫 Regular - Teaching</option>
                      <option value="contract">📄 Contract (Faculty)</option>
                    </>
                  ) : staffType === 'non_academic' ? (
                    <>
                      <option value="all">All Non-Academic Personnel</option>
                      <option value="non_teaching">👔 Regular - Non Teaching</option>
                      <option value="contract">📄 Contract (Staff)</option>
                    </>
                  ) : (
                    <>
                      <option value="all">All Personnel</option>
                      <option value="teaching">👨‍🏫 1) Regular - Teaching</option>
                      <option value="non_teaching">👔 2) Regular - Non Teaching</option>
                      <option value="contract">📄 3) Contract</option>
                    </>
                  )}
                </select>
              </div>
              <div>
                <label className="form-label-iipm">Pay Level</label>
                <select className="form-control-iipm" value={payLevelBand} onChange={e => setPayLevelBand(e.target.value)}>
                  <option value="">All Levels</option>
                  {payLevelBands.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label-iipm">Month</label>
                <select className="form-control-iipm" value={month} onChange={e => setMonth(+e.target.value)}>
                  {months.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label-iipm">Year</label>
                <input type="number" className="form-control-iipm" value={year} onChange={e => setYear(+e.target.value)} min="2020" max="2030" />
              </div>
              <div>
                <button className="btn-primary-iipm" onClick={loadEmployees} disabled={loading} style={{ width: '100%' }}>
                  {loading ? 'Loading...' : '🔍 Fetch List'}
                </button>
              </div>
            </div>
          </div>

          {rows.length > 0 && (
            <div className="card-iipm" style={{ padding: '0', maxWidth: '100%', overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                {/* Filter Tabs */}
                <div style={{ display: 'flex', gap: '6px' }}>
                  {(['all', 'pending', 'processed'] as const).map(f => {
                    const count = f === 'all' ? rows.length : f === 'pending' ? pendingCount : processedCount;
                    const colors: Record<string, {bg: string, color: string, border: string}> = {
                      all: { bg: employeeFilter === 'all' ? '#0a3161' : '#f1f5f9', color: employeeFilter === 'all' ? '#fff' : '#475569', border: '#0a3161' },
                      pending: { bg: employeeFilter === 'pending' ? '#f59e0b' : '#fffbeb', color: employeeFilter === 'pending' ? '#fff' : '#92400e', border: '#f59e0b' },
                      processed: { bg: employeeFilter === 'processed' ? '#16a34a' : '#f0fdf4', color: employeeFilter === 'processed' ? '#fff' : '#166534', border: '#16a34a' },
                    };
                    const c = colors[f];
                    return (
                      <button key={f} onClick={() => setEmployeeFilter(f)}
                        style={{ padding: '6px 14px', borderRadius: '20px', border: `1.5px solid ${c.border}`, background: c.bg, color: c.color, fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer', transition: 'all 0.2s' }}>
                        {f.charAt(0).toUpperCase() + f.slice(1)} <span style={{ background: 'rgba(0,0,0,0.12)', borderRadius: '10px', padding: '1px 7px', marginLeft: '4px', fontSize: '0.75rem' }}>{count}</span>
                      </button>
                    );
                  })}
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                  {selectedProcessRowIds.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setSelectedProcessRowIds([])}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '6px',
                        border: '1px solid #cbd5e1',
                        background: '#f8fafc',
                        color: '#64748b',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      ✕ Clear Selection ({selectedProcessRowIds.length})
                    </button>
                  )}
                  <button
                    onClick={() => setExpandedColumns(!expandedColumns)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '7px 14px',
                      borderRadius: '6px',
                      border: `1.5px solid ${expandedColumns ? 'var(--primary)' : 'var(--border)'}`,
                      background: expandedColumns ? '#e0f2fe' : '#ffffff',
                      color: expandedColumns ? '#0369a1' : 'var(--text-secondary)',
                      fontWeight: 600,
                      fontSize: '0.82rem',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    title="Click to expand/collapse Name and Designation columns to view full text"
                  >
                    {expandedColumns ? '⤡ Compact View' : '⤢ Expand Names & Designations'}
                  </button>
                  
                  {/* Multi-Format Export Dropdown */}
                  <div style={{ position: 'relative', display: 'inline-block' }} onClick={e => e.stopPropagation()}>
                    <button 
                      type="button"
                      className="btn-outline-iipm" 
                      onClick={() => setShowExportMenu(!showExportMenu)} 
                      style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 16px', fontWeight: 600, fontSize: '0.85rem' }}
                      title="Export filtered or selected rows to Excel, CSV, or PDF"
                    >
                      <span>📊 Export {selectedProcessRowIds.length > 0 ? `(${selectedProcessRowIds.length} Selected)` : 'All'}</span>
                      <span style={{ fontSize: '0.7rem' }}>▼</span>
                    </button>
                    {showExportMenu && (
                      <div style={{
                        position: 'absolute',
                        top: 'calc(100% + 4px)',
                        right: 0,
                        background: '#ffffff',
                        borderRadius: '8px',
                        boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
                        border: '1px solid var(--border)',
                        zIndex: 100,
                        minWidth: '190px',
                        overflow: 'hidden',
                        padding: '4px 0'
                      }}>
                        <div style={{ padding: '6px 12px', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', borderBottom: '1px solid #f1f5f9' }}>
                          {selectedProcessRowIds.length > 0 ? `EXPORT ${selectedProcessRowIds.length} SELECTED` : `EXPORT ALL (${filteredRows.length})`}
                        </div>
                        <button
                          type="button"
                          onClick={() => { setShowExportMenu(false); exportProcessData('excel'); }}
                          style={{ width: '100%', padding: '8px 14px', border: 'none', background: 'none', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: '#1e293b' }}
                          onMouseEnter={e => (e.currentTarget.style.background = '#f8fafc')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                        >
                          <span style={{ color: '#16a34a', fontWeight: 'bold' }}>📊</span> Excel (.xlsx)
                        </button>
                        <button
                          type="button"
                          onClick={() => { setShowExportMenu(false); exportProcessData('csv'); }}
                          style={{ width: '100%', padding: '8px 14px', border: 'none', background: 'none', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: '#1e293b' }}
                          onMouseEnter={e => (e.currentTarget.style.background = '#f8fafc')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                        >
                          <span style={{ color: '#0284c7', fontWeight: 'bold' }}>📄</span> CSV (.csv)
                        </button>
                        <button
                          type="button"
                          onClick={() => { setShowExportMenu(false); exportProcessData('pdf'); }}
                          style={{ width: '100%', padding: '8px 14px', border: 'none', background: 'none', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: '#1e293b' }}
                          onMouseEnter={e => (e.currentTarget.style.background = '#f8fafc')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                        >
                          <span style={{ color: '#dc2626', fontWeight: 'bold' }}>🖨️</span> PDF / Print (.pdf)
                        </button>
                      </div>
                    )}
                  </div>

                  <button 
                    type="button" 
                    onClick={saveDraftPayroll} 
                    disabled={loading || savingDraft || submittingBulk} 
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '6px', 
                      padding: '7px 18px', 
                      fontWeight: 600, 
                      fontSize: '0.85rem',
                      borderRadius: '8px',
                      border: '1.5px solid #0284c7',
                      background: '#f0f9ff',
                      color: '#0284c7',
                      cursor: (loading || savingDraft || submittingBulk) ? 'not-allowed' : 'pointer',
                      transition: 'all 0.2s',
                      opacity: (loading || savingDraft || submittingBulk) ? 0.7 : 1
                    }}
                    title="Save current values as Draft without submitting. You can revisit and edit anytime."
                  >
                    {savingDraft ? 'Saving...' : '💾 Save Draft'}
                  </button>
                  <button 
                    className="btn-accent-iipm" 
                    onClick={submitBulkPayroll} 
                    disabled={loading || savingDraft || submittingBulk} 
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '6px', 
                      padding: '7px 18px', 
                      fontWeight: 600, 
                      fontSize: '0.85rem',
                      cursor: (loading || savingDraft || submittingBulk) ? 'not-allowed' : 'pointer',
                      opacity: (loading || savingDraft || submittingBulk) ? 0.7 : 1
                    }}
                  >
                    {submittingBulk ? 'Submitting...' : '📤 Submit For Approval'}
                  </button>
                </div>
              </div>
              {(() => {
                const calculatedRows = filteredRows.map((row, i) => {
                  const calc = calculateRowComponents(row, settings);
                  return { row, idx: i, calc };
                });

                const processTotals = calculatedRows.reduce((acc, { calc }) => ({
                  bp: acc.bp + calc.bp,
                  da: acc.da + calc.da,
                  ta: acc.ta + calc.ta,
                  hra: acc.hra + calc.hra,
                  deanAllowance: acc.deanAllowance + calc.deanAllowance,
                  npsEmployer: acc.npsEmployer + calc.npsEmployer,
                  ignorablePension: acc.ignorablePension + calc.ignorablePension,
                  gross: acc.gross + calc.gross,
                  pt: acc.pt + calc.pt,
                  tds: acc.tds + calc.tdsVal,
                  npsEmp: acc.npsEmp + calc.npsEmp,
                  cghs: acc.cghs + calc.cghs,
                  otherDed: acc.otherDed + calc.otherDed,
                  totalDed: acc.totalDed + calc.totalDed,
                  net: acc.net + calc.net
                }), {
                  bp: 0, da: 0, ta: 0, hra: 0, deanAllowance: 0, npsEmployer: 0, ignorablePension: 0, gross: 0,
                  pt: 0, tds: 0, npsEmp: 0, cghs: 0, otherDed: 0, totalDed: 0, net: 0
                });

                return (
                  <div style={{ overflowX: 'auto', maxHeight: '600px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                    <table className={`table-iipm table-sticky-freeze ${expandedColumns ? 'table-expanded' : ''}`} style={{ whiteSpace: 'nowrap', fontSize: '0.85rem', width: '100%', minWidth: expandedColumns ? '2400px' : '2200px' }}>
                      <thead style={{ position: 'sticky', top: 0, zIndex: 40, boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                        <tr style={{ background: '#f8fafc' }}>
                          <th className="sticky-col sticky-col-check" style={{ padding: '12px 6px', textAlign: 'center' }}>
                            <input 
                              type="checkbox"
                              checked={filteredRows.length > 0 && selectedProcessRowIds.length === filteredRows.length}
                              onChange={handleToggleAllProcessRows}
                              title={selectedProcessRowIds.length === filteredRows.length ? "Deselect All Rows" : "Select All Rows"}
                              style={{ cursor: 'pointer', width: '15px', height: '15px' }}
                            />
                          </th>
                          <th className="sticky-col sticky-col-1" style={{ padding: '12px 6px', textAlign: 'center' }}>Sl.no</th>
                          <th className="sticky-col sticky-col-2" style={{ padding: '12px 8px' }}>Emp ID</th>
                          <th className="sticky-col sticky-col-3" onClick={() => setExpandedColumns(!expandedColumns)} style={{ padding: '12px 10px', cursor: 'pointer', userSelect: 'none' }} title="Click to Expand/Compact Name column">
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '4px' }}>
                              <span>Employee Name</span>
                              <span style={{ fontSize: '0.75rem', opacity: 0.7 }}>{expandedColumns ? '⤡' : '⤢'}</span>
                            </div>
                          </th>
                          <th className="sticky-col sticky-col-4" style={{ padding: '12px 8px' }}>Category</th>
                          <th className="sticky-col sticky-col-5" onClick={() => setExpandedColumns(!expandedColumns)} style={{ padding: '12px 10px', cursor: 'pointer', userSelect: 'none' }} title="Click to Expand/Compact Designation column">
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '4px' }}>
                              <span>Designation</span>
                              <span style={{ fontSize: '0.75rem', opacity: 0.7 }}>{expandedColumns ? '⤡' : '⤢'}</span>
                            </div>
                          </th>
                          <th style={{ padding: '12px 16px' }}>Pay Scale</th>
                          <th style={{ padding: '12px 16px' }}>Basic</th>
                          <th style={{ padding: '12px 16px' }}>DA {settings.DA_PERCENTAGE || 60}%</th>
                          <th style={{ padding: '12px 16px' }}>TA</th>
                          <th style={{ padding: '12px 16px' }}>HRA {settings.HRA_PERCENTAGE || 20}%</th>
                          <th style={{ padding: '12px 16px' }}>Dean / Warden</th>
                          <th style={{ padding: '12px 16px' }}>NPS (Employer)</th>
                          <th style={{ padding: '12px 16px', color: '#b91c1c' }}>Deductable Pension</th>
                          <th style={{ padding: '12px 16px', background: '#e2e8f0' }}>Gross Salary</th>
                          <th style={{ padding: '12px 16px' }}>PT</th>
                          <th style={{ padding: '12px 16px', color: 'var(--warning)' }}>TDS</th>
                          <th style={{ padding: '12px 16px' }}>NPS (Employee)</th>
                          <th style={{ padding: '12px 16px' }}>NPS (Employer)</th>
                          <th style={{ padding: '12px 16px' }}>CGHS</th>
                          <th style={{ padding: '12px 16px' }}>Other Recovery</th>
                          <th style={{ padding: '12px 16px', background: '#fee2e2' }}>Total Deductions</th>
                          <th style={{ padding: '12px 16px', background: '#dcfce7', color: 'var(--success)' }}>Net Salary</th>
                          <th style={{ padding: '12px 16px' }}>Remark</th>
                        </tr>
                      </thead>
                      <tbody>
                        {calculatedRows.map(({ row, idx, calc }) => {
                          const u = row.user;
                          const cat = getEmployeeCategory(u);
                          const catLabel = cat === 'teaching' ? 'Regular - Teaching' : cat === 'non_teaching' ? 'Regular - Non Teaching' : 'Contract';
                          const catBadge = cat === 'teaching'
                            ? { bg: '#e0f2fe', color: '#0369a1', border: '#bae6fd' }
                            : cat === 'non_teaching'
                            ? { bg: '#ecfdf5', color: '#047857', border: '#a7f3d0' }
                            : { bg: '#fff7ed', color: '#c2410c', border: '#fed7aa' };

                          return (
                            <tr key={u.id} style={{ background: selectedProcessRowIds.includes(u.id) ? '#eff6ff' : undefined }}>
                              <td className="sticky-col sticky-col-check" style={{ padding: '10px 6px', textAlign: 'center' }}>
                                <input 
                                  type="checkbox"
                                  checked={selectedProcessRowIds.includes(u.id)}
                                  onChange={() => handleToggleProcessRow(u.id)}
                                  style={{ cursor: 'pointer', width: '15px', height: '15px' }}
                                />
                              </td>
                              <td className="sticky-col sticky-col-1" style={{ padding: '10px 6px', color: 'var(--text-muted)', textAlign: 'center' }}>
                                {idx + 1}
                              </td>
                              <td className="sticky-col sticky-col-2" style={{ padding: '10px 8px', fontWeight: 600 }} title={u.employeeId || '-'}>
                                <div style={{ maxWidth: '69px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {u.employeeId || '-'}
                                </div>
                              </td>
                              <td className="sticky-col sticky-col-3" style={{ padding: '10px 10px', fontWeight: 600 }} title={formatEmployeeNameWithTitle(u)}>
                                <div style={{ maxWidth: expandedColumns ? '230px' : '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {formatEmployeeNameWithTitle(u)}
                                </div>
                              </td>
                              <td className="sticky-col sticky-col-4" style={{ padding: '10px 8px' }}>
                                <span style={{ display: 'inline-block', maxWidth: '139px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', padding: '3px 8px', borderRadius: '12px', fontSize: '0.72rem', fontWeight: 700, background: catBadge.bg, color: catBadge.color, border: `1px solid ${catBadge.border}` }} title={catLabel}>
                                  {catLabel}
                                </span>
                              </td>
                              <td className="sticky-col sticky-col-5" style={{ padding: '10px 10px' }} title={u.designation || '-'}>
                                <div style={{ maxWidth: expandedColumns ? '280px' : '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {u.designation || '-'}
                                </div>
                              </td>
                              <td style={{ padding: '10px 16px' }}>Level-{u.payLevel}</td>
                              <td style={{ padding: '10px 16px' }}>{fmt(calc.bp)}</td>
                              <td style={{ padding: '10px 16px' }}>{fmt(calc.da)}</td>
                              <td style={{ padding: '10px 16px' }}>{fmt(calc.ta)}</td>
                              <td style={{ padding: '10px 16px' }}>{fmt(calc.hra)}</td>
                              <td style={{ padding: '10px 16px' }}>
                                <input 
                                  type={row.deanAllowance === '' ? 'text' : 'number'} 
                                  value={row.deanAllowance} 
                                  placeholder="0"
                                  min="0"
                                  step="500"
                                  onChange={e => updateRow(u.id, 'deanAllowance', e.target.value === '' ? '' : (isNaN(+e.target.value) ? '' : +e.target.value))}
                                  style={{ 
                                    width: '85px', 
                                    padding: '6px 8px', 
                                    fontSize: '0.85rem', 
                                    borderRadius: '4px', 
                                    border: '1px solid var(--border)',
                                    fontWeight: (Number(row.deanAllowance) > 0) ? 600 : 400,
                                    color: (Number(row.deanAllowance) > 0) ? 'var(--primary)' : 'inherit',
                                    backgroundColor: (Number(row.deanAllowance) > 0) ? '#f0f9ff' : '#ffffff'
                                  }} 
                                />
                              </td>
                              <td style={{ padding: '10px 16px' }}>{fmt(calc.npsEmployer)}</td>
                              <td style={{ padding: '10px 16px' }}>
                                <input 
                                  type={row.ignorablePension === '' ? 'text' : 'number'} 
                                  value={row.ignorablePension} 
                                  placeholder="0"
                                  min="0"
                                  onChange={e => updateRow(u.id, 'ignorablePension', e.target.value === '' ? '' : (isNaN(+e.target.value) ? '' : +e.target.value))}
                                  style={{ 
                                    width: '85px', 
                                    padding: '6px 8px', 
                                    fontSize: '0.85rem', 
                                    borderRadius: '4px', 
                                    border: '1px solid var(--border)',
                                    fontWeight: (Number(row.ignorablePension) > 0) ? 600 : 400,
                                    color: (Number(row.ignorablePension) > 0) ? '#b91c1c' : 'inherit',
                                    backgroundColor: (Number(row.ignorablePension) > 0) ? '#fef2f2' : '#ffffff'
                                  }} 
                                />
                              </td>
                              <td style={{ padding: '10px 16px', fontWeight: 600, background: '#f8fafc' }}>{fmt(calc.gross)}</td>
                              <td style={{ padding: '10px 16px' }}>{fmt(calc.pt)}</td>
                              <td style={{ padding: '10px 16px' }}>
                                <input type={row.tds === '' ? 'text' : 'number'} value={row.tds} placeholder="Auto"
                                  onChange={e => updateRow(u.id, 'tds', e.target.value)}
                                  style={{ width: '80px', padding: '6px 8px', fontSize: '0.85rem', borderRadius: '4px', border: '1px solid var(--border)' }} />
                              </td>
                              <td style={{ padding: '10px 16px' }}>{fmt(calc.npsEmp)}</td>
                              <td style={{ padding: '10px 16px' }}>{fmt(calc.npsEmployer)}</td>
                              <td style={{ padding: '10px 16px' }}>{fmt(calc.cghs)}</td>
                              <td style={{ padding: '10px 16px' }}>
                                <input type="number" value={row.otherDeductions}
                                  onChange={e => updateRow(u.id, 'otherDeductions', +e.target.value)}
                                  style={{ width: '90px', padding: '6px 8px', fontSize: '0.85rem', borderRadius: '4px', border: '1px solid var(--border)' }} />
                              </td>
                              <td style={{ padding: '10px 16px', color: '#ef4444', background: '#fef2f2', fontWeight: 600 }}>{fmt(calc.totalDed)}</td>
                              <td style={{ padding: '10px 16px', color: 'var(--success)', fontWeight: 700, background: '#f0fdf4', fontSize: '0.9rem' }}>{fmt(calc.net)}</td>
                              <td style={{ padding: '10px 16px' }}>
                                <input type="text" value={row.remark} placeholder="Enter remark..."
                                  onChange={e => updateRow(u.id, 'remark', e.target.value)}
                                  style={{ width: '140px', padding: '6px 8px', fontSize: '0.85rem', borderRadius: '4px', border: '1px solid var(--border)' }} />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot>
                        <tr style={{ fontWeight: '700', background: '#e2e8f0', position: 'sticky', bottom: 0, zIndex: 40, boxShadow: '0 -2px 10px rgba(0,0,0,0.05)', fontSize: '0.9rem' }}>
                          <td className="sticky-col sticky-col-check" style={{ padding: '14px 6px', borderTop: '2px solid #cbd5e1' }}></td>
                          <td className="sticky-col sticky-col-1" style={{ padding: '14px 6px', borderTop: '2px solid #cbd5e1' }}></td>
                          <td className="sticky-col sticky-col-2" style={{ padding: '14px 8px', borderTop: '2px solid #cbd5e1' }}></td>
                          <td className="sticky-col sticky-col-3" style={{ padding: '14px 10px', borderTop: '2px solid #cbd5e1' }}></td>
                          <td className="sticky-col sticky-col-4" style={{ padding: '14px 8px', borderTop: '2px solid #cbd5e1' }}></td>
                          <td className="sticky-col sticky-col-5" style={{ textAlign: 'right', padding: '14px 10px', borderTop: '2px solid #cbd5e1', fontWeight: 700 }}>Total ({filteredRows.length})</td>
                          <td style={{ padding: '14px 16px', borderTop: '2px solid #cbd5e1' }}>-</td>
                          <td style={{ padding: '14px 16px', borderTop: '2px solid #cbd5e1' }}>{fmt(processTotals.bp)}</td>
                          <td style={{ padding: '14px 16px', borderTop: '2px solid #cbd5e1' }}>{fmt(processTotals.da)}</td>
                          <td style={{ padding: '14px 16px', borderTop: '2px solid #cbd5e1' }}>{fmt(processTotals.ta)}</td>
                          <td style={{ padding: '14px 16px', borderTop: '2px solid #cbd5e1' }}>{fmt(processTotals.hra)}</td>
                          <td style={{ padding: '14px 16px', borderTop: '2px solid #cbd5e1' }}>{fmt(processTotals.deanAllowance)}</td>
                          <td style={{ padding: '14px 16px', borderTop: '2px solid #cbd5e1' }}>{fmt(processTotals.npsEmployer)}</td>
                          <td style={{ padding: '14px 16px', borderTop: '2px solid #cbd5e1', color: '#b91c1c' }}>{fmt(processTotals.ignorablePension)}</td>
                          <td style={{ padding: '14px 16px', borderTop: '2px solid #cbd5e1', background: '#d8e1eb' }}>{fmt(processTotals.gross)}</td>
                          <td style={{ padding: '14px 16px', borderTop: '2px solid #cbd5e1' }}>{fmt(processTotals.pt)}</td>
                          <td style={{ padding: '14px 16px', borderTop: '2px solid #cbd5e1', color: '#b45309' }}>{fmt(processTotals.tds)}</td>
                          <td style={{ padding: '14px 16px', borderTop: '2px solid #cbd5e1' }}>{fmt(processTotals.npsEmp)}</td>
                          <td style={{ padding: '14px 16px', borderTop: '2px solid #cbd5e1' }}>{fmt(processTotals.npsEmployer)}</td>
                          <td style={{ padding: '14px 16px', borderTop: '2px solid #cbd5e1' }}>{fmt(processTotals.cghs)}</td>
                          <td style={{ padding: '14px 16px', borderTop: '2px solid #cbd5e1' }}>{fmt(processTotals.otherDed)}</td>
                          <td style={{ padding: '14px 16px', borderTop: '2px solid #cbd5e1', color: '#b91c1c', background: '#f8c2c2' }}>{fmt(processTotals.totalDed)}</td>
                          <td style={{ padding: '14px 16px', borderTop: '2px solid #cbd5e1', color: '#15803d', background: '#bbf7d0', fontSize: '1rem', fontWeight: 800 }}>{fmt(processTotals.net)}</td>
                          <td style={{ padding: '14px 16px', borderTop: '2px solid #cbd5e1' }}></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                );
              })()}
            </div>
          )}

          {rows.length === 0 && !loading && (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: '3rem', marginBottom: '16px' }}>₹</div>
              <h3 style={{ color: 'var(--text-secondary)' }}>Select Filters & Load Employees</h3>
              <p>Choose department and pay level, then click "Fetch List" to start salary processing.</p>
            </div>
          )}
        </>
      )}

      {tab === 'drafts' && (
        <>
          <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div>
              <label className="form-label-iipm">Month</label>
              <select className="form-control-iipm" value={month} onChange={e => { setMonth(+e.target.value); }} style={{ width: '160px' }}>
                {months.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label-iipm">Year</label>
              <input type="number" className="form-control-iipm" value={year} onChange={e => setYear(+e.target.value)} style={{ width: '100px' }} />
            </div>
            <button className="btn-outline-iipm" onClick={loadPayrolls}>🔄 Refresh</button>

            <div style={{ marginLeft: 'auto', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => { setCategoryFilter('all'); setCurrentPage(1); }}
                className={`btn-iipm ${categoryFilter === 'all' ? 'btn-accent-iipm' : 'btn-outline-iipm'}`}
                style={{ padding: '6px 14px', fontSize: '0.8rem' }}
              >
                All Drafts ({draftPayrolls.length})
              </button>
              <button
                type="button"
                onClick={() => { setCategoryFilter('teaching'); setCurrentPage(1); }}
                className={`btn-iipm ${categoryFilter === 'teaching' ? 'btn-accent-iipm' : 'btn-outline-iipm'}`}
                style={{ padding: '6px 14px', fontSize: '0.8rem' }}
              >
                👨‍🏫 Regular - Teaching ({teachingDraftsCount})
              </button>
              <button
                type="button"
                onClick={() => { setCategoryFilter('non_teaching'); setCurrentPage(1); }}
                className={`btn-iipm ${categoryFilter === 'non_teaching' ? 'btn-accent-iipm' : 'btn-outline-iipm'}`}
                style={{ padding: '6px 14px', fontSize: '0.8rem' }}
              >
                👔 Regular - Non Teaching ({nonTeachingDraftsCount})
              </button>
              <button
                type="button"
                onClick={() => { setCategoryFilter('contract'); setCurrentPage(1); }}
                className={`btn-iipm ${categoryFilter === 'contract' ? 'btn-accent-iipm' : 'btn-outline-iipm'}`}
                style={{ padding: '6px 14px', fontSize: '0.8rem' }}
              >
                📄 Contract ({contractDraftsCount})
              </button>
            </div>
          </div>

          <div className="card-iipm" style={{ padding: '0', maxWidth: '100%', overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-primary)' }}>
                  💾 Saved Draft Records — {months[month - 1]} {year}
                </h3>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  {filteredDrafts.length} draft record(s) ready for review or submission
                </span>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                {selectedDraftIds.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedDraftIds([])}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      background: '#f8fafc',
                      color: '#64748b',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    ✕ Clear Selection ({selectedDraftIds.length})
                  </button>
                )}
                <button 
                  type="button" 
                  className="btn-outline-iipm" 
                  onClick={() => {
                    setTab('process');
                    loadEmployees();
                  }}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 16px', fontSize: '0.85rem', fontWeight: 600 }}
                >
                  ✏️ Edit in Salary Process
                </button>

                {/* Multi-Format Export for Drafts */}
                <div style={{ position: 'relative', display: 'inline-block' }} onClick={e => e.stopPropagation()}>
                  <button 
                    type="button" 
                    className="btn-outline-iipm" 
                    onClick={() => setShowDraftExportMenu(!showDraftExportMenu)} 
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 16px', fontSize: '0.85rem', fontWeight: 600 }}
                  >
                    <span>📊 Export Drafts {selectedDraftIds.length > 0 ? `(${selectedDraftIds.length})` : 'All'}</span>
                    <span style={{ fontSize: '0.7rem' }}>▼</span>
                  </button>
                  {showDraftExportMenu && (
                    <div style={{
                      position: 'absolute',
                      top: 'calc(100% + 4px)',
                      right: 0,
                      background: '#ffffff',
                      borderRadius: '8px',
                      boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
                      border: '1px solid var(--border)',
                      zIndex: 100,
                      minWidth: '190px',
                      overflow: 'hidden',
                      padding: '4px 0'
                    }}>
                      <div style={{ padding: '6px 12px', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', borderBottom: '1px solid #f1f5f9' }}>
                        {selectedDraftIds.length > 0 ? `EXPORT ${selectedDraftIds.length} SELECTED` : `EXPORT ALL (${filteredDrafts.length})`}
                      </div>
                      <button
                        type="button"
                        onClick={() => { setShowDraftExportMenu(false); exportDraftsData('excel'); }}
                        style={{ width: '100%', padding: '8px 14px', border: 'none', background: 'none', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: '#1e293b' }}
                        onMouseEnter={e => (e.currentTarget.style.background = '#f8fafc')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                      >
                        <span style={{ color: '#16a34a', fontWeight: 'bold' }}>📊</span> Excel (.xlsx)
                      </button>
                      <button
                        type="button"
                        onClick={() => { setShowDraftExportMenu(false); exportDraftsData('csv'); }}
                        style={{ width: '100%', padding: '8px 14px', border: 'none', background: 'none', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: '#1e293b' }}
                        onMouseEnter={e => (e.currentTarget.style.background = '#f8fafc')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                      >
                        <span style={{ color: '#0284c7', fontWeight: 'bold' }}>📄</span> CSV (.csv)
                      </button>
                      <button
                        type="button"
                        onClick={() => { setShowDraftExportMenu(false); exportDraftsData('pdf'); }}
                        style={{ width: '100%', padding: '8px 14px', border: 'none', background: 'none', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: '#1e293b' }}
                        onMouseEnter={e => (e.currentTarget.style.background = '#f8fafc')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                      >
                        <span style={{ color: '#dc2626', fontWeight: 'bold' }}>🖨️</span> PDF / Print (.pdf)
                      </button>
                    </div>
                  )}
                </div>

                {filteredDrafts.length > 0 && (
                  <button 
                    type="button" 
                    className="btn-accent-iipm" 
                    onClick={() => submitDraftPayrolls(selectedDraftIds.length > 0 ? selectedDraftIds : filteredDrafts.map((p: any) => p.id))} 
                    disabled={loading}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 18px', fontSize: '0.85rem', fontWeight: 600 }}
                  >
                    {loading ? 'Submitting...' : selectedDraftIds.length > 0 ? `📤 Submit Selected Drafts (${selectedDraftIds.length})` : `📤 Submit All Drafts for Approval (${filteredDrafts.length})`}
                  </button>
                )}
              </div>
            </div>

            {filteredDrafts.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '50px 20px', color: 'var(--text-muted)' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>💾</div>
                <h3 style={{ color: 'var(--text-secondary)', marginBottom: '8px' }}>No Saved Drafts Found</h3>
                <p style={{ maxWidth: '500px', margin: '0 auto 16px auto', fontSize: '0.9rem' }}>
                  You don't have any saved draft payroll records for {months[month - 1]} {year}. Go to the Salary Process tab, fetch the list, adjust values, and click <strong>"Save Draft"</strong>.
                </p>
                <button 
                  className="btn-primary-iipm" 
                  onClick={() => { setTab('process'); loadEmployees(); }}
                  style={{ padding: '8px 20px' }}
                >
                  ⊕ Go to Salary Process
                </button>
              </div>
            ) : (
              <div style={{ maxHeight: '600px', overflowY: 'auto', overflowX: 'auto', background: '#fff' }}>
                <table className="table-iipm table-sticky-freeze" style={{ width: '100%', minWidth: '1200px' }}>
                  <thead>
                    <tr style={{ position: 'sticky', top: 0, zIndex: 40, background: '#f8fafc', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                      <th className="sticky-col sticky-view-col-check" style={{ padding: '12px 6px', textAlign: 'center' }}>
                        <input 
                          type="checkbox"
                          checked={filteredDrafts.length > 0 && selectedDraftIds.length === filteredDrafts.length}
                          onChange={handleToggleAllDrafts}
                          title={selectedDraftIds.length === filteredDrafts.length ? "Deselect All Drafts" : "Select All Drafts"}
                          style={{ cursor: 'pointer', width: '15px', height: '15px' }}
                        />
                      </th>
                      <th className="sticky-col sticky-view-col-1" style={{ padding: '12px 10px', fontWeight: 600, color: 'var(--text-secondary)' }}>Emp ID</th>
                      <th className="sticky-col sticky-view-col-2" style={{ padding: '12px 12px', fontWeight: 600, color: 'var(--text-secondary)' }}>Employee Name</th>
                      <th className="sticky-col sticky-view-col-3" style={{ padding: '12px 10px', fontWeight: 600, color: 'var(--text-secondary)' }}>Category</th>
                      <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-secondary)' }}>Level</th>
                      <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-secondary)' }}>Basic</th>
                      <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-secondary)' }}>Gross</th>
                      <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-secondary)' }}>TDS</th>
                      <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-secondary)' }}>Deductions</th>
                      <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-secondary)' }}>Net Salary</th>
                      <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-secondary)' }}>Status</th>
                      <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-secondary)' }}>Remark</th>
                      <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-secondary)' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDrafts.map((p: any) => {
                      const u = userMap[p.employeeId] || userMap[p.userId] || {};
                      const empName = formatEmployeeNameWithTitle(p, u);
                      const payLevel = u.payLevel || p.payLevel || '';
                      const cat = getEmployeeCategory(u.employeeId ? u : p);
                      const catLabel = cat === 'teaching' ? 'Regular - Teaching' : cat === 'non_teaching' ? 'Regular - Non Teaching' : 'Contract';
                      const catBadge = cat === 'teaching'
                        ? { bg: '#e0f2fe', color: '#0369a1', border: '#bae6fd' }
                        : cat === 'non_teaching'
                        ? { bg: '#ecfdf5', color: '#047857', border: '#a7f3d0' }
                        : { bg: '#fff7ed', color: '#c2410c', border: '#fed7aa' };

                      return (
                        <tr key={p.id} style={{ borderBottom: '1px solid var(--border)', background: selectedDraftIds.includes(p.id) ? '#eff6ff' : undefined }}>
                          <td className="sticky-col sticky-view-col-check" style={{ padding: '12px 6px', textAlign: 'center' }}>
                            <input 
                              type="checkbox"
                              checked={selectedDraftIds.includes(p.id)}
                              onChange={() => handleToggleDraft(p.id)}
                              style={{ cursor: 'pointer', width: '15px', height: '15px' }}
                            />
                          </td>
                          <td className="sticky-col sticky-view-col-1" style={{ padding: '12px 10px', fontWeight: 600 }} title={p.employeeId || '-'}>
                            <div style={{ maxWidth: '70px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {p.employeeId}
                            </div>
                          </td>
                          <td className="sticky-col sticky-view-col-2" style={{ padding: '12px 12px' }} title={empName}>
                            <div style={{ maxWidth: '161px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {empName}
                            </div>
                          </td>
                          <td className="sticky-col sticky-view-col-3" style={{ padding: '12px 10px' }}>
                            <span style={{ display: 'inline-block', maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', padding: '3px 8px', borderRadius: '12px', fontSize: '0.72rem', fontWeight: 700, background: catBadge.bg, color: catBadge.color, border: `1px solid ${catBadge.border}` }} title={catLabel}>
                              {catLabel}
                            </span>
                          </td>
                          <td style={{ padding: '12px 16px' }}>{payLevel ? `Level-${payLevel}` : '-'}</td>
                          <td style={{ padding: '12px 16px' }}>{fmt(p.basicPay)}</td>
                          <td style={{ padding: '12px 16px', fontWeight: 600, background: '#f8fafc' }}>{fmt(p.grossSalary)}</td>
                          <td style={{ padding: '12px 16px', color: '#b45309', fontWeight: 600 }}>{fmt(p.tds)}</td>
                          <td style={{ padding: '12px 16px', color: '#ef4444', background: '#fef2f2' }}>{fmt(p.totalDeductions)}</td>
                          <td style={{ padding: '12px 16px', color: 'var(--success)', fontWeight: 700, background: '#f0fdf4', fontSize: '0.9rem' }}>{fmt(p.netSalary)}</td>
                          <td style={{ padding: '12px 16px' }}>
                            <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700, background: '#fef3c7', color: '#d97706', border: '1px solid #fde68a' }}>
                              💾 DRAFT
                            </span>
                          </td>
                          <td style={{ padding: '12px 16px', color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.85rem', maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {p.remark || '-'}
                          </td>
                          <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                            <button
                              type="button"
                              onClick={() => submitDraftPayrolls([p.id])}
                              style={{
                                padding: '5px 12px',
                                borderRadius: '4px',
                                border: '1px solid var(--accent)',
                                background: 'var(--accent)',
                                color: '#ffffff',
                                cursor: 'pointer',
                                fontSize: '0.8rem',
                                fontWeight: 600,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px'
                              }}
                              title="Submit this draft record for approval"
                            >
                              📤 Submit for Approval
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  {filteredDrafts.length > 0 && (() => {
                    const draftTotals = filteredDrafts.reduce((acc: any, p: any) => ({
                      basic: acc.basic + (p.basicPay || 0),
                      gross: acc.gross + (p.grossSalary || 0),
                      tds: acc.tds + (p.tds || 0),
                      totalDed: acc.totalDed + (p.totalDeductions || 0),
                      net: acc.net + (p.netSalary || 0)
                    }), { basic: 0, gross: 0, tds: 0, totalDed: 0, net: 0 });

                    return (
                      <tfoot>
                        <tr style={{ background: '#e2e8f0', fontWeight: '700', borderTop: '2px solid #cbd5e1', fontSize: '0.88rem' }}>
                          <td className="sticky-col sticky-view-col-check" style={{ padding: '12px 6px' }}></td>
                          <td className="sticky-col sticky-view-col-1" style={{ padding: '12px 10px' }}></td>
                          <td className="sticky-col sticky-view-col-2" style={{ padding: '12px 12px' }}></td>
                          <td className="sticky-col sticky-view-col-3" style={{ padding: '12px 10px', fontWeight: 800 }}>Total ({filteredDrafts.length})</td>
                          <td style={{ padding: '12px 16px' }}>-</td>
                          <td style={{ padding: '12px 16px' }}>{fmt(draftTotals.basic)}</td>
                          <td style={{ padding: '12px 16px', background: '#d8e1eb', fontWeight: 800 }}>{fmt(draftTotals.gross)}</td>
                          <td style={{ padding: '12px 16px', color: '#b45309' }}>{fmt(draftTotals.tds)}</td>
                          <td style={{ padding: '12px 16px', color: '#b91c1c', background: '#f8c2c2', fontWeight: 800 }}>{fmt(draftTotals.totalDed)}</td>
                          <td style={{ padding: '12px 16px', color: '#15803d', background: '#bbf7d0', fontSize: '0.95rem', fontWeight: 800 }}>{fmt(draftTotals.net)}</td>
                          <td colSpan={3} style={{ padding: '12px 16px' }}></td>
                        </tr>
                      </tfoot>
                    );
                  })()}
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {tab === 'view' && (
        <>
          <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div>
              <label className="form-label-iipm">Month</label>
              <select className="form-control-iipm" value={month} onChange={e => { setMonth(+e.target.value); }} style={{ width: '160px' }}>
                {months.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label-iipm">Year</label>
              <input type="number" className="form-control-iipm" value={year} onChange={e => setYear(+e.target.value)} style={{ width: '100px' }} />
            </div>
            <button className="btn-outline-iipm" onClick={loadPayrolls}>🔄 Refresh</button>

            <div style={{ marginLeft: 'auto', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => { setCategoryFilter('all'); setCurrentPage(1); }}
                className={`btn-iipm ${categoryFilter === 'all' ? 'btn-accent-iipm' : 'btn-outline-iipm'}`}
                style={{ padding: '6px 14px', fontSize: '0.8rem' }}
              >
                All Sent ({sentPayrolls.length})
              </button>
              <button
                type="button"
                onClick={() => { setCategoryFilter('teaching'); setCurrentPage(1); }}
                className={`btn-iipm ${categoryFilter === 'teaching' ? 'btn-accent-iipm' : 'btn-outline-iipm'}`}
                style={{ padding: '6px 14px', fontSize: '0.8rem' }}
              >
                👨‍🏫 Regular - Teaching ({teachingSentCount})
              </button>
              <button
                type="button"
                onClick={() => { setCategoryFilter('non_teaching'); setCurrentPage(1); }}
                className={`btn-iipm ${categoryFilter === 'non_teaching' ? 'btn-accent-iipm' : 'btn-outline-iipm'}`}
                style={{ padding: '6px 14px', fontSize: '0.8rem' }}
              >
                👔 Regular - Non Teaching ({nonTeachingSentCount})
              </button>
              <button
                type="button"
                onClick={() => { setCategoryFilter('contract'); setCurrentPage(1); }}
                className={`btn-iipm ${categoryFilter === 'contract' ? 'btn-accent-iipm' : 'btn-outline-iipm'}`}
                style={{ padding: '6px 14px', fontSize: '0.8rem' }}
              >
                📄 Contract ({contractSentCount})
              </button>
            </div>
          </div>

          <div className="card-iipm" style={{ padding: '0', maxWidth: '100%', overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3>{mode === 'process' ? 'Records Sent for Approval' : 'Pending Salary Approvals'} — {months[month - 1]} {year}</h3>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{filteredSentPayrolls.length} records</span>
                {selectedPayrolls.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedPayrolls([])}
                    style={{
                      padding: '5px 10px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      background: '#f8fafc',
                      color: '#64748b',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    ✕ Clear ({selectedPayrolls.length})
                  </button>
                )}
                {isAdmin && selectedPayrolls.length > 0 && (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={handleBulkApprove} style={{ padding: '6px 14px', borderRadius: '4px', border: '1px solid #198754', background: '#198754', color: '#ffffff', cursor: 'pointer', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <i className="fas fa-check-double"></i> Approve Selected ({selectedPayrolls.length})
                    </button>
                    <button onClick={handleBulkReject} style={{ padding: '6px 14px', borderRadius: '4px', border: '1px solid #dc3545', background: '#ffffff', color: '#dc3545', cursor: 'pointer', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <i className="fas fa-ban"></i> Reject Selected
                    </button>
                  </div>
                )}

                {/* Multi-Format Export for Sent Records */}
                <div style={{ position: 'relative', display: 'inline-block' }} onClick={e => e.stopPropagation()}>
                  <button 
                    type="button"
                    className="btn-accent-iipm" 
                    onClick={() => setShowSentExportMenu(!showSentExportMenu)} 
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 16px', fontSize: '0.85rem', fontWeight: 600 }}
                  >
                    <span>📊 Export {selectedPayrolls.length > 0 ? `(${selectedPayrolls.length} Selected)` : 'All'}</span>
                    <span style={{ fontSize: '0.7rem' }}>▼</span>
                  </button>
                  {showSentExportMenu && (
                    <div style={{
                      position: 'absolute',
                      top: 'calc(100% + 4px)',
                      right: 0,
                      background: '#ffffff',
                      borderRadius: '8px',
                      boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
                      border: '1px solid var(--border)',
                      zIndex: 100,
                      minWidth: '190px',
                      overflow: 'hidden',
                      padding: '4px 0'
                    }}>
                      <div style={{ padding: '6px 12px', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', borderBottom: '1px solid #f1f5f9' }}>
                        {selectedPayrolls.length > 0 ? `EXPORT ${selectedPayrolls.length} SELECTED` : `EXPORT ALL (${filteredSentPayrolls.length})`}
                      </div>
                      <button
                        type="button"
                        onClick={() => { setShowSentExportMenu(false); exportSentData('excel'); }}
                        style={{ width: '100%', padding: '8px 14px', border: 'none', background: 'none', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: '#1e293b' }}
                        onMouseEnter={e => (e.currentTarget.style.background = '#f8fafc')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                      >
                        <span style={{ color: '#16a34a', fontWeight: 'bold' }}>📊</span> Excel (.xlsx)
                      </button>
                      <button
                        type="button"
                        onClick={() => { setShowSentExportMenu(false); exportSentData('csv'); }}
                        style={{ width: '100%', padding: '8px 14px', border: 'none', background: 'none', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: '#1e293b' }}
                        onMouseEnter={e => (e.currentTarget.style.background = '#f8fafc')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                      >
                        <span style={{ color: '#0284c7', fontWeight: 'bold' }}>📄</span> CSV (.csv)
                      </button>
                      <button
                        type="button"
                        onClick={() => { setShowSentExportMenu(false); exportSentData('pdf'); }}
                        style={{ width: '100%', padding: '8px 14px', border: 'none', background: 'none', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: '#1e293b' }}
                        onMouseEnter={e => (e.currentTarget.style.background = '#f8fafc')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                      >
                        <span style={{ color: '#dc2626', fontWeight: 'bold' }}>🖨️</span> PDF / Print (.pdf)
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
            {filteredSentPayrolls.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                No submitted salary records found for {months[month - 1]} {year}
              </div>
            ) : (
              <div style={{ maxHeight: '600px', overflowY: 'auto', overflowX: 'auto', background: '#fff' }}>
                <table className="table-iipm table-sticky-freeze" style={{ width: '100%', minWidth: '1200px' }}>
                  <thead>
                    <tr style={{ position: 'sticky', top: 0, zIndex: 40, background: '#f8fafc', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                      <th className="sticky-col sticky-view-col-check" style={{ padding: '12px 6px', textAlign: 'center' }}>
                        <input 
                          type="checkbox"
                          checked={filteredSentPayrolls.length > 0 && selectedPayrolls.length === filteredSentPayrolls.length}
                          onChange={handleSelectAllPayrolls}
                          title={selectedPayrolls.length === filteredSentPayrolls.length ? "Deselect All" : "Select All"}
                          style={{ cursor: 'pointer', width: '15px', height: '15px' }}
                        />
                      </th>
                      <th className="sticky-col sticky-view-col-1" style={{ padding: '12px 10px', fontWeight: 600, color: 'var(--text-secondary)' }}>Emp ID</th>
                      <th className="sticky-col sticky-view-col-2" style={{ padding: '12px 12px', fontWeight: 600, color: 'var(--text-secondary)' }}>Employee Name</th>
                      <th className="sticky-col sticky-view-col-3" style={{ padding: '12px 10px', fontWeight: 600, color: 'var(--text-secondary)' }}>Category</th>
                      <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-secondary)' }}>Level</th>
                      <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-secondary)' }}>Gross</th>
                      <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-secondary)' }}>Net Salary</th>
                      <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-secondary)' }}>Status</th>
                      <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-secondary)' }}>Remark</th>
                      <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-secondary)' }}>Attachments</th>
                      <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-secondary)' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSentPayrolls.map((p: any) => {
                      const u = userMap[p.employeeId] || userMap[p.userId] || {};
                      const empName = formatEmployeeNameWithTitle(p, u);
                      const payLevel = u.payLevel || p.payLevel || '';
                      const cat = getEmployeeCategory(u.employeeId ? u : p);
                      const catLabel = cat === 'teaching' ? 'Regular - Teaching' : cat === 'non_teaching' ? 'Regular - Non Teaching' : 'Contract';
                      const catBadge = cat === 'teaching'
                        ? { bg: '#e0f2fe', color: '#0369a1', border: '#bae6fd' }
                        : cat === 'non_teaching'
                        ? { bg: '#ecfdf5', color: '#047857', border: '#a7f3d0' }
                        : { bg: '#fff7ed', color: '#c2410c', border: '#fed7aa' };

                      return (
                      <tr key={p.id} style={{ borderBottom: '1px solid var(--border)', background: selectedPayrolls.includes(p.id) ? '#eff6ff' : undefined }}>
                        <td className="sticky-col sticky-view-col-check" style={{ padding: '12px 6px', textAlign: 'center' }}>
                          <input 
                            type="checkbox"
                            checked={selectedPayrolls.includes(p.id)}
                            onChange={() => handleSelectPayroll(p.id)}
                            style={{ cursor: 'pointer', width: '15px', height: '15px' }}
                          />
                        </td>
                        <td className="sticky-col sticky-view-col-1" style={{ padding: '12px 10px', fontWeight: 600 }} title={p.employeeId || '-'}>
                          <div style={{ maxWidth: '70px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {p.employeeId}
                          </div>
                        </td>
                        <td className="sticky-col sticky-view-col-2" style={{ padding: '12px 12px' }} title={empName}>
                          <div style={{ maxWidth: '161px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {empName}
                          </div>
                        </td>
                        <td className="sticky-col sticky-view-col-3" style={{ padding: '12px 10px' }}>
                          <span style={{ display: 'inline-block', maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', padding: '3px 8px', borderRadius: '12px', fontSize: '0.72rem', fontWeight: 700, background: catBadge.bg, color: catBadge.color, border: `1px solid ${catBadge.border}` }} title={catLabel}>
                            {catLabel}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px' }}>{payLevel ? `Level-${payLevel}` : '-'}</td>
                        <td style={{ padding: '12px 16px', fontWeight: 600, background: '#f8fafc' }}>{fmt(p.grossSalary)}</td>
                        <td style={{ padding: '12px 16px', color: 'var(--success)', fontWeight: 700, background: '#f0fdf4', fontSize: '0.9rem' }}>{fmt(p.netSalary)}</td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700, background: `${statusBadge[p.status] || '#94a3b8'}20`, color: statusBadge[p.status] || '#94a3b8' }}>
                            {p.status}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px', color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.85rem', maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {p.remark || '-'}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          {p.attachments && p.attachments.length > 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              {p.attachments.map((att: string, idx: number) => {
                                const firstPipe = att.indexOf('|');
                                if (firstPipe === -1) {
                                  return <span key={idx} style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>📎 {att}</span>;
                                }
                                const filename = att.substring(0, firstPipe);
                                const data = att.substring(firstPipe + 1);
                                
                                const handleDownload = (e: React.MouseEvent) => {
                                  e.preventDefault();
                                  try {
                                    // Extract mime type and base64 string
                                    const match = data.match(/^data:(.*?);base64,(.*)$/);
                                    if (match && match.length === 3) {
                                      const mime = match[1];
                                      const b64 = match[2];
                                      const byteCharacters = atob(b64);
                                      const byteNumbers = new Array(byteCharacters.length);
                                      for (let i = 0; i < byteCharacters.length; i++) {
                                        byteNumbers[i] = byteCharacters.charCodeAt(i);
                                      }
                                      const byteArray = new Uint8Array(byteNumbers);
                                      const blob = new Blob([byteArray], {type: mime});
                                      const blobUrl = URL.createObjectURL(blob);
                                      
                                      const a = document.createElement('a');
                                      a.href = blobUrl;
                                      a.download = filename;
                                      document.body.appendChild(a);
                                      a.click();
                                      document.body.removeChild(a);
                                      URL.revokeObjectURL(blobUrl);
                                    } else {
                                      // Fallback for simple data urls
                                      const a = document.createElement('a');
                                      a.href = data;
                                      a.download = filename;
                                      document.body.appendChild(a);
                                      a.click();
                                      document.body.removeChild(a);
                                    }
                                  } catch (err) {
                                    console.error("Error downloading file", err);
                                  }
                                };
                                
                                return (
                                  <a key={idx} href="#" onClick={handleDownload} style={{ fontSize: '0.75rem', color: 'var(--primary)', textDecoration: 'none', background: '#e0e7ff', padding: '2px 6px', borderRadius: '4px', display: 'inline-block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '120px' }} title={filename}>
                                    📎 {filename}
                                  </a>
                                );
                              })}
                            </div>
                          ) : '-'}
                        </td>
                        <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                          {(p.status === 'PENDING' || p.status === 'DRAFT') && isAdmin && (
                            <div style={{ display: 'flex', gap: '6px' }}>
                              <button onClick={() => handleApprove(p.id)} style={{ padding: '5px 12px', borderRadius: '4px', border: '1px solid #198754', background: '#198754', color: '#ffffff', cursor: 'pointer', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <i className="fas fa-check"></i> Approve
                              </button>
                              <button onClick={() => { setRejectModal({ id: p.id }); }} style={{ padding: '5px 12px', borderRadius: '4px', border: '1px solid #dc3545', background: '#ffffff', color: '#dc3545', cursor: 'pointer', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <i className="fas fa-times"></i> Reject
                              </button>
                            </div>
                          )}
                          {p.status === 'APPROVED' && <span style={{ color: '#198754', fontSize: '0.85rem', fontWeight: 600 }}><i className="fas fa-check-circle"></i> Released</span>}
                          {p.status === 'REJECTED' && isAdmin && (
                            <button onClick={() => handleApprove(p.id)} style={{ padding: '5px 12px', borderRadius: '4px', border: '1px solid #198754', background: '#198754', color: '#ffffff', cursor: 'pointer', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <i className="fas fa-redo"></i> Re-Approve
                            </button>
                          )}
                        </td>
                      </tr>
                      );
                    })}
                  </tbody>
                  {filteredSentPayrolls.length > 0 && (() => {
                    const sentTotals = filteredSentPayrolls.reduce((acc: any, p: any) => ({
                      gross: acc.gross + (p.grossSalary || 0),
                      net: acc.net + (p.netSalary || 0)
                    }), { gross: 0, net: 0 });

                    return (
                      <tfoot>
                        <tr style={{ background: '#e2e8f0', fontWeight: '700', borderTop: '2px solid #cbd5e1', fontSize: '0.88rem' }}>
                          <td className="sticky-col sticky-view-col-check" style={{ padding: '12px 6px' }}></td>
                          <td className="sticky-col sticky-view-col-1" style={{ padding: '12px 10px' }}></td>
                          <td className="sticky-col sticky-view-col-2" style={{ padding: '12px 12px' }}></td>
                          <td className="sticky-col sticky-view-col-3" style={{ padding: '12px 10px', fontWeight: 800 }}>Total ({filteredSentPayrolls.length})</td>
                          <td style={{ padding: '12px 16px' }}>-</td>
                          <td style={{ padding: '12px 16px', background: '#d8e1eb', fontWeight: 800 }}>{fmt(sentTotals.gross)}</td>
                          <td style={{ padding: '12px 16px', color: '#15803d', background: '#bbf7d0', fontSize: '0.95rem', fontWeight: 800 }}>{fmt(sentTotals.net)}</td>
                          <td colSpan={4} style={{ padding: '12px 16px' }}></td>
                        </tr>
                      </tfoot>
                    );
                  })()}
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {rejectModal && (
        <div className="modal-iipm-overlay" onClick={() => { setRejectModal(null); setAttachments([]); }}>
          <div className="modal-iipm" onClick={e => e.stopPropagation()}>
            <div className="modal-header-iipm">
              <h3>Forward to Operator for Correction</h3>
              <button onClick={() => { setRejectModal(null); setAttachments([]); }} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
            </div>
            <div className="modal-body-iipm">
              <div style={{ marginBottom: '16px' }}>
                <label className="form-label-iipm">Changes Required / Remarks</label>
                <textarea className="form-control-iipm" rows={3} value={rejectReason}
                  onChange={e => setRejectReason(e.target.value)}
                  placeholder="Specify what needs to be changed..." />
              </div>
              
              <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
                <label className="form-label-iipm" style={{ color: 'var(--primary)' }}>📎 Attach Documents (Mandatory for changes)</label>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '12px' }}>Upload multiple files to support the required changes.</p>
                <input 
                  type="file" 
                  multiple 
                  ref={fileInputRef}
                  onChange={(e) => {
                    if (e.target.files) {
                      setAttachments(Array.from(e.target.files));
                    }
                  }}
                  className="form-control-iipm"
                  style={{ background: 'white' }}
                />
                {attachments.length > 0 && (
                  <div style={{ marginTop: '10px', fontSize: '0.85rem', color: 'var(--success)' }}>
                    ✓ {attachments.length} file(s) selected
                  </div>
                )}
              </div>
            </div>
            <div className="modal-footer-iipm">
              <button className="btn-outline-iipm" onClick={() => { setRejectModal(null); setAttachments([]); }}>Cancel</button>
              <button onClick={handleReject} disabled={!rejectReason || attachments.length === 0} style={{ padding: '8px 20px', background: (!rejectReason || attachments.length === 0) ? '#e2e8f0' : 'var(--accent)', border: 'none', color: (!rejectReason || attachments.length === 0) ? '#94a3b8' : 'white', borderRadius: '8px', cursor: (!rejectReason || attachments.length === 0) ? 'not-allowed' : 'pointer', fontWeight: 600, fontFamily: 'var(--font)' }}>
                Forward to Operator
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PayrollManagement;
