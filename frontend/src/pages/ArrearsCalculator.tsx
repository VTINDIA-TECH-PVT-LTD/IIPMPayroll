import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import apiService from '../services/api';

const ArrearsCalculator: React.FC = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [tab, setTab] = useState<'promotion' | 'tada'>('tada');

  // Promotion Arrears State
  const [rows, setRows] = useState<any[]>([]);

  // TA/DA Arrears State
  const [daRows, setDaRows] = useState<any[]>([]);
  const [daMonths, setDaMonths] = useState<string[]>(['January \'26', 'February \'26', 'March \'26']);
  const [selectedMonthName, setSelectedMonthName] = useState<string>('April');
  const [selectedYearVal, setSelectedYearVal] = useState<string>('26');
  const [bulkOldDa, setBulkOldDa] = useState<number>(50);
  const [bulkNewDa, setBulkNewDa] = useState<number>(53);
  const [bulkCategory, setBulkCategory] = useState<'all' | 'staff' | 'faculty' | 'contract'>('all');

  const [signatures, setSignatures] = useState({
    preparedBy: 'Y RAMA RAO',
    verifiedBy1: 'Ch KALIKA DEVI',
    verifiedBy2: 'SATYANARAYAN MOHANTY',
    approvedBy: 'SHRI. RAM PHAL DWIVEDI'
  });

  // Universal Arrear Computation Helper
  const computeMonthArrears = (
    basic: number,
    transportAllowance: number,
    payLevel: string,
    oldDa: number = bulkOldDa,
    newDa: number = bulkNewDa
  ) => {
    const diffPct = Math.max(0, (newDa - oldDa) / 100);
    const taBase = transportAllowance || (payLevel && parseInt(payLevel.replace(/\D/g, '')) >= 9 ? 7200 : 3600);
    const daAmt = Math.round((basic || 0) * diffPct);
    const taAmt = Math.round(taBase * diffPct);
    return { da: daAmt, ta: taAmt };
  };

  useEffect(() => {
    apiService.getAllUsers().then(data => {
      const list: any[] = Array.isArray(data) ? data : [];
      const empList = list.filter((u: any) => {
        const eid = (u.employeeId || '').toUpperCase();
        return (
          eid.startsWith('TS') || 
          eid.startsWith('NT') || 
          eid.startsWith('CT') || 
          eid.startsWith('CNT') || 
          eid.startsWith('CMED') ||
          u.role === 'EMPLOYEE'
        );
      });
      const finalUsers = empList.length > 0 ? empList : list;
      setUsers(finalUsers);
      loadAllEmployeesToTable(bulkCategory, finalUsers);
    }).catch(err => {
      console.error('Error fetching users:', err);
    });
  }, []);

  // PROMOTION LOGIC
  const calculateRow = (r: any) => {
    const diff = Math.max(0, (r.upgradedPay || 0) - (r.basicPay || 0));
    const propBasic = r.overridePropBasic !== null && r.overridePropBasic !== undefined ? r.overridePropBasic : Math.round((diff / (r.daysInMonth || 31)) * (r.days || 0));
    const da = r.overrideDa !== null && r.overrideDa !== undefined ? r.overrideDa : Math.round(propBasic * (bulkNewDa / 100));
    const hra = r.overrideHra !== null && r.overrideHra !== undefined ? r.overrideHra : Math.round(propBasic * 0.20);
    const npsEmployer = r.overrideNpsEmployer !== null && r.overrideNpsEmployer !== undefined ? r.overrideNpsEmployer : Math.round((propBasic + da) * 0.14);
    const npsEmp = r.overrideNpsEmp !== null && r.overrideNpsEmp !== undefined ? r.overrideNpsEmp : Math.round((propBasic + da) * 0.10);
    const gross = propBasic + da + hra + npsEmployer;
    const tds = r.tds || 0;
    const net = gross - npsEmp - npsEmployer - tds;
    return { diff, propBasic, da, hra, npsEmployer, npsEmp, gross, tds, net };
  };

  const addRow = () => {
    setRows([...rows, { 
      id: Date.now(), 
      name: '', 
      employeeNo: '',
      dateOfPromotion: '', 
      basicPay: 0, 
      upgradedPay: 0, 
      days: 31, 
      daysInMonth: 31, 
      overridePropBasic: null, 
      overrideDa: null, 
      overrideHra: null, 
      overrideNpsEmp: null, 
      overrideNpsEmployer: null, 
      tds: 0 
    }]);
  };

  const handlePromoEmpSelect = (id: number, empId: string) => {
    const emp = users.find(u => u.employeeId === empId || u.id === empId);
    if (!emp) return;
    const basic = emp.basicPay || 0;
    // Suggest next increment ~3% rounded to 100
    const suggestedUpgraded = Math.round((basic * 1.03) / 100) * 100;
    setRows(rows.map(r => r.id === id ? {
      ...r,
      employeeNo: emp.employeeId,
      name: `${emp.firstName || ''} ${emp.lastName || ''}`.trim(),
      basicPay: basic,
      upgradedPay: suggestedUpgraded,
      days: 31,
      daysInMonth: 31,
      overridePropBasic: null,
      overrideDa: null,
      overrideHra: null,
      overrideNpsEmp: null,
      overrideNpsEmployer: null
    } : r));
  };

  const updateRow = (id: number, field: string, value: any) => {
    setRows(rows.map(r => r.id === id ? { ...r, [field]: value } : r));
  };

  const removeRow = (id: number) => {
    setRows(rows.filter(r => r.id !== id));
  };

  const exportPromotionExcel = () => {
    const data = rows.map(r => {
      const calc = calculateRow(r);
      return {
        'Name of the Faculty': r.name,
        'Date of promotion': r.dateOfPromotion,
        'Basic Pay': r.basicPay,
        'Upgraded Pay': r.upgradedPay,
        'Difference in Pay': calc.diff,
        'No.of.Days': r.days,
        'Proportionate Basic': calc.propBasic,
        'DA': calc.da,
        'HRA': calc.hra,
        'NPS Employer': calc.npsEmployer,
        'Gross Total': calc.gross,
        'TDS': r.tds,
        'Less: NPS Employee share': calc.npsEmp,
        'Less: NPS Employer share': calc.npsEmployer,
        'Net amount payable': calc.net
      };
    });
    
    if (data.length > 0) {
       const totals = data.reduce((acc, curr) => {
         Object.keys(curr).forEach(k => {
           if(typeof (curr as any)[k] === 'number') acc[k] = (acc[k] || 0) + (curr as any)[k];
         });
         return acc;
       }, { 'Name of the Faculty': 'Total' } as any);
       data.push(totals);
    }
    
    // Append Signatures
    data.push({} as any, {} as any, {} as any);
    data.push({ 'Name of the Faculty': 'PREPARED BY', 'Basic Pay': 'VERIFIED BY', 'NPS Employer': 'VERIFIED BY', 'Net amount payable': 'APPROVED /NOT APPROVED' } as any);
    data.push({ 'Name of the Faculty': `(${signatures.preparedBy})`, 'Basic Pay': `(${signatures.verifiedBy1})`, 'NPS Employer': `(${signatures.verifiedBy2})`, 'Net amount payable': `(${signatures.approvedBy})` } as any);
    data.push({ 'Name of the Faculty': 'ACCOUNTS EXECUTIVE', 'Basic Pay': 'Jr SUPTD(ACTING ASSISTANT REGISTRAR (F&A))', 'NPS Employer': 'JOINT REGISTRAR', 'Net amount payable': 'REGISTRAR' } as any);
    
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Promotion Arrears");
    XLSX.writeFile(wb, `Promotion_Arrears.xlsx`);
  };

  // DA/TA LOGIC
  const calculateDaRow = (r: any) => {
    const cummDa = daMonths.reduce((sum, m) => sum + (r.months[m]?.da || 0), 0);
    const cummTa = daMonths.reduce((sum, m) => sum + (r.months[m]?.ta || 0), 0);
    const npsEmployer = Math.round(cummDa * 0.14);
    const npsEmp = Math.round(cummDa * 0.10);
    const gross = cummDa + cummTa + npsEmployer;
    const net = gross - npsEmp - npsEmployer - (r.tds || 0);
    return { cummDa, cummTa, npsEmployer, npsEmp, gross, net };
  };

  const addDaRow = () => {
    const monthsObj: any = {};
    daMonths.forEach(m => {
      monthsObj[m] = { da: 0, ta: 0 };
    });
    setDaRows([...daRows, { id: Date.now(), employeeNo: '', name: '', basic: 0, payLevel: '', transportAllowance: 3600, months: monthsObj, tds: 0 }]);
  };

  const loadAllEmployeesToTable = async (category: 'all' | 'staff' | 'faculty' | 'contract', userListOverride?: any[]) => {
    let list = userListOverride || users;
    if (!list || list.length === 0) {
      try {
        const data = await apiService.getAllUsers();
        const raw: any[] = Array.isArray(data) ? data : [];
        const empList = raw.filter((u: any) => {
          const eid = (u.employeeId || '').toUpperCase();
          return (
            eid.startsWith('TS') || 
            eid.startsWith('NT') || 
            eid.startsWith('CT') || 
            eid.startsWith('CNT') || 
            eid.startsWith('CMED') ||
            u.role === 'EMPLOYEE'
          );
        });
        list = empList.length > 0 ? empList : raw;
        setUsers(list);
      } catch (err) {
        console.error('Error fetching users:', err);
      }
    }

    let filtered = list || [];
    if (category === 'staff') {
      filtered = (list || []).filter(u => {
        const eid = (u.employeeId || '').toUpperCase();
        return (eid.startsWith('NT') || eid.startsWith('NTS')) && !eid.startsWith('CNT');
      });
    } else if (category === 'faculty') {
      filtered = (list || []).filter(u => {
        const eid = (u.employeeId || '').toUpperCase();
        return (eid.startsWith('TS') || u.department === 'Faculty') && !eid.startsWith('CT');
      });
    } else if (category === 'contract') {
      filtered = (list || []).filter(u => {
        const eid = (u.employeeId || '').toUpperCase();
        return eid.startsWith('CNT') || eid.startsWith('CT') || eid.startsWith('CMED');
      });
    }

    const newRows = filtered.map((u, idx) => {
      const monthsObj: any = {};
      const taBase = u.transportAllowance || (u.payLevel && parseInt(u.payLevel.replace(/\D/g, '')) >= 9 ? 7200 : 3600);
      daMonths.forEach(m => {
        monthsObj[m] = computeMonthArrears(u.basicPay || 0, taBase, u.payLevel || '', bulkOldDa, bulkNewDa);
      });
      return {
        id: Date.now() + idx,
        employeeNo: u.employeeId || '',
        name: `${u.firstName || ''} ${u.lastName || ''}`.trim(),
        basic: u.basicPay || 0,
        payLevel: u.payLevel || '',
        transportAllowance: taBase,
        months: monthsObj,
        tds: 0
      };
    });
    setDaRows(newRows);
  };

  const recalculateAllRowsWithRates = (oldDa: number, newDa: number) => {
    setDaRows(prevRows => prevRows.map(r => {
      const u = users.find(usr => usr.employeeId === r.employeeNo);
      const basic = r.basic || u?.basicPay || 0;
      const taBase = r.transportAllowance || u?.transportAllowance || (r.payLevel && parseInt(r.payLevel.replace(/\D/g, '')) >= 9 ? 7200 : 3600);
      
      const updatedMonths: any = {};
      daMonths.forEach(m => {
        updatedMonths[m] = computeMonthArrears(basic, taBase, r.payLevel || u?.payLevel, oldDa, newDa);
      });

      return {
        ...r,
        basic: basic,
        months: updatedMonths
      };
    }));
  };

  const handleOldDaChange = (val: number) => {
    setBulkOldDa(val);
    recalculateAllRowsWithRates(val, bulkNewDa);
  };

  const handleNewDaChange = (val: number) => {
    setBulkNewDa(val);
    recalculateAllRowsWithRates(bulkOldDa, val);
  };

  const autoCalculateBulkDA = () => {
    recalculateAllRowsWithRates(bulkOldDa, bulkNewDa);
  };

  const updateDaRow = (id: number, field: string, value: any) => {
    setDaRows(daRows.map(r => r.id === id ? { ...r, [field]: value } : r));
  };
  
  const updateDaMonth = (id: number, month: string, field: 'da'|'ta', value: number) => {
    setDaRows(daRows.map(r => {
      if (r.id !== id) return r;
      return { ...r, months: { ...r.months, [month]: { ...r.months[month], [field]: value } } };
    }));
  };

  const handleEmpNoChange = (id: number, empNo: string) => {
    const cleanNo = empNo.trim().toUpperCase();
    const emp = users.find(u => (u.employeeId || '').toUpperCase() === cleanNo);
    if (emp) {
      const basic = emp.basicPay || 0;
      const taBase = emp.transportAllowance || (emp.payLevel && parseInt(emp.payLevel.replace(/\D/g, '')) >= 9 ? 7200 : 3600);
      const updatedMonths: any = {};
      daMonths.forEach(m => {
        updatedMonths[m] = computeMonthArrears(basic, taBase, emp.payLevel || '', bulkOldDa, bulkNewDa);
      });
      setDaRows(daRows.map(r => r.id === id ? {
        ...r,
        employeeNo: emp.employeeId,
        name: `${emp.firstName || ''} ${emp.lastName || ''}`.trim(),
        basic: basic,
        payLevel: emp.payLevel || '',
        transportAllowance: taBase,
        months: updatedMonths
      } : r));
    } else {
      updateDaRow(id, 'employeeNo', empNo);
    }
  };

  const handleBasicChange = (id: number, newBasic: number) => {
    setDaRows(daRows.map(r => {
      if (r.id !== id) return r;
      const u = users.find(usr => usr.employeeId === r.employeeNo);
      const taBase = r.transportAllowance || u?.transportAllowance || (r.payLevel && parseInt(r.payLevel.replace(/\D/g, '')) >= 9 ? 7200 : 3600);
      const updatedMonths: any = {};
      daMonths.forEach(m => {
        updatedMonths[m] = computeMonthArrears(newBasic, taBase, r.payLevel || u?.payLevel, bulkOldDa, bulkNewDa);
      });
      return { ...r, basic: newBasic, months: updatedMonths };
    }));
  };
  
  const addSelectedMonth = (mNameCustom?: string) => {
    const mName = mNameCustom || `${selectedMonthName} '${selectedYearVal}`;
    if (daMonths.includes(mName)) {
      alert(`Month "${mName}" is already added.`);
      return;
    }
    const newMonths = [...daMonths, mName];
    setDaMonths(newMonths);

    // AUTO-POPULATE the newly added month immediately for all rows!
    setDaRows(prevRows => prevRows.map(r => {
      const u = users.find(usr => usr.employeeId === r.employeeNo);
      const basic = r.basic || u?.basicPay || 0;
      const taBase = r.transportAllowance || u?.transportAllowance || (r.payLevel && parseInt(r.payLevel.replace(/\D/g, '')) >= 9 ? 7200 : 3600);
      const monthVal = computeMonthArrears(basic, taBase, r.payLevel || u?.payLevel, bulkOldDa, bulkNewDa);
      return {
        ...r,
        months: {
          ...r.months,
          [mName]: monthVal
        }
      };
    }));
  };

  const applyMonthPreset = (presetMonths: string[]) => {
    setDaMonths(presetMonths);
    setDaRows(prevRows => prevRows.map(r => {
      const u = users.find(usr => usr.employeeId === r.employeeNo);
      const basic = r.basic || u?.basicPay || 0;
      const taBase = r.transportAllowance || u?.transportAllowance || (r.payLevel && parseInt(r.payLevel.replace(/\D/g, '')) >= 9 ? 7200 : 3600);
      const updatedMonths: any = {};
      presetMonths.forEach(m => {
        updatedMonths[m] = computeMonthArrears(basic, taBase, r.payLevel || u?.payLevel, bulkOldDa, bulkNewDa);
      });
      return { ...r, months: updatedMonths };
    }));
  };

  const removeDaMonth = (mName: string) => {
    if (daMonths.length <= 1) {
      alert('At least one month column is required.');
      return;
    }
    setDaMonths(daMonths.filter(m => m !== mName));
  };

  const exportDaExcel = () => {
    const data = daRows.map((r, idx) => {
      const calc = calculateDaRow(r);
      const row: any = {
        'Sl.No': idx + 1,
        'Employee No': r.employeeNo,
        'Name of the Employee': r.name,
        'Basic': r.basic
      };
      
      daMonths.forEach(m => {
        row[`${m} DA Diff`] = r.months[m]?.da || 0;
        row[`${m} TA Diff`] = r.months[m]?.ta || 0;
      });
      
      row['Cummulative DA'] = calc.cummDa;
      row['Cummulative TA'] = calc.cummTa;
      row['NPS Employer Share'] = calc.npsEmployer;
      row['Gross Arrears'] = calc.gross;
      row['Less: NPS Employee Share'] = calc.npsEmp;
      row['NPS Employer Share_1'] = calc.npsEmployer;
      row['Less:TDS'] = r.tds;
      row['Net Amount Payable'] = calc.net;
      
      return row;
    });
    
    if (data.length > 0) {
       const totals = data.reduce((acc, curr) => {
         Object.keys(curr).forEach(k => {
           if(typeof (curr as any)[k] === 'number' && k !== 'Sl.No') acc[k] = (acc[k] || 0) + (curr as any)[k];
         });
         return acc;
       }, { 'Sl.No': 'Total' } as any);
       data.push(totals);
    }
    
    const finalData = data.map(row => {
      const r2 = {...row};
      r2['NPS Employer Share '] = r2['NPS Employer Share_1'];
      delete r2['NPS Employer Share_1'];
      return r2;
    });
    
    // Append Signatures
    finalData.push({} as any, {} as any, {} as any);
    finalData.push({ 'Name of the Employee': 'PREPARED BY', 'Cummulative DA': 'VERIFIED BY', 'Less: NPS Employee Share': 'VERIFIED BY', 'Net Amount Payable': 'APPROVED /NOT APPROVED' } as any);
    finalData.push({ 'Name of the Employee': `(${signatures.preparedBy})`, 'Cummulative DA': `(${signatures.verifiedBy1})`, 'Less: NPS Employee Share': `(${signatures.verifiedBy2})`, 'Net Amount Payable': `(${signatures.approvedBy})` } as any);
    finalData.push({ 'Name of the Employee': 'ACCOUNTS EXECUTIVE', 'Cummulative DA': 'Jr SUPTD(ACTING ASSISTANT REGISTRAR (F&A))', 'Less: NPS Employee Share': 'JOINT REGISTRAR', 'Net Amount Payable': 'REGISTRAR' } as any);
    
    const ws = XLSX.utils.json_to_sheet(finalData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "TA & DA arrears");
    XLSX.writeFile(wb, `TADA_Arrears.xlsx`);
  };

  return (
    <div className="page-container">
      {/* Employee Datalist for fast auto-complete */}
      <datalist id="all-employees-list">
        {users.map(u => (
          <option key={u.id || u.employeeId} value={u.employeeId}>
            {u.firstName} {u.lastName} ({u.department || 'IIPE'}) — Basic: ₹{u.basicPay || 0}
          </option>
        ))}
      </datalist>

      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', background: '#ffffff', padding: '24px 28px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03)', border: '1px solid var(--border)', marginBottom: '24px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)' }}>Arrears Calculators</h2>
          <p style={{ margin: '8px 0 0 0', color: 'var(--text-muted)', fontSize: '0.95rem' }}>Automated calculators with instant auto-population for retrospective payouts</p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--border)', marginBottom: '20px' }}>
        <button onClick={() => setTab('tada')} style={{ padding: '10px 20px', background: 'none', border: 'none', borderBottom: `2px solid ${tab === 'tada' ? 'var(--accent)' : 'transparent'}`, color: tab === 'tada' ? 'var(--accent)' : 'var(--text-muted)', fontWeight: 600, cursor: 'pointer', fontSize: '0.9rem' }}>TA & DA Arrears</button>
        <button onClick={() => setTab('promotion')} style={{ padding: '10px 20px', background: 'none', border: 'none', borderBottom: `2px solid ${tab === 'promotion' ? 'var(--accent)' : 'transparent'}`, color: tab === 'promotion' ? 'var(--accent)' : 'var(--text-muted)', fontWeight: 600, cursor: 'pointer', fontSize: '0.9rem' }}>Promotion Arrears</button>
      </div>

      <div className="card-iipm" style={{ padding: '16px 20px', marginBottom: '20px' }}>
        <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '12px' }}>EXCEL EXPORT SIGNATURE BLOCK CONFIGURATION</div>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <div><label className="form-label-iipm">Prepared By</label><input className="form-control-iipm" value={signatures.preparedBy} onChange={e => setSignatures({...signatures, preparedBy: e.target.value})} style={{width: '200px'}} /></div>
          <div><label className="form-label-iipm">Verified By (1)</label><input className="form-control-iipm" value={signatures.verifiedBy1} onChange={e => setSignatures({...signatures, verifiedBy1: e.target.value})} style={{width: '200px'}} /></div>
          <div><label className="form-label-iipm">Verified By (2)</label><input className="form-control-iipm" value={signatures.verifiedBy2} onChange={e => setSignatures({...signatures, verifiedBy2: e.target.value})} style={{width: '200px'}} /></div>
          <div><label className="form-label-iipm">Approved By</label><input className="form-control-iipm" value={signatures.approvedBy} onChange={e => setSignatures({...signatures, approvedBy: e.target.value})} style={{width: '200px'}} /></div>
        </div>
      </div>

      {tab === 'tada' && (
        <>
          {/* 3-Step Arrears Workflow Toolbar */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
            
            {/* Step 1: Month Selection Bar */}
            <div className="card-iipm" style={{ padding: '20px', background: '#ffffff', borderLeft: '4px solid #6366f1', display: 'flex', flexDirection: 'column', gap: '16px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ background: '#e0e7ff', color: '#4338ca', width: '28px', height: '28px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.9rem' }}>1</div>
                  <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#1e293b' }}>Arrears Months Selection</h3>
                  <span style={{ fontSize: '0.85rem', color: '#64748b' }}>({daMonths.length} active columns)</span>
                </div>
                {/* Quick Presets */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b' }}>Presets:</span>
                  <button className="btn-iipm" onClick={() => applyMonthPreset(["January '26", "February '26", "March '26"])} style={{ fontSize: '0.8rem', padding: '4px 10px', background: '#f8fafc', color: '#475569', border: '1px solid #cbd5e1', borderRadius: '6px' }}>Q4 (Jan-Mar '26)</button>
                  <button className="btn-iipm" onClick={() => applyMonthPreset(["April '26", "May '26", "June '26"])} style={{ fontSize: '0.8rem', padding: '4px 10px', background: '#f8fafc', color: '#475569', border: '1px solid #cbd5e1', borderRadius: '6px' }}>Q1 (Apr-Jun '26)</button>
                  <button className="btn-iipm" onClick={() => applyMonthPreset(["July '25", "August '25", "September '25", "October '25", "November '25", "December '25"])} style={{ fontSize: '0.8rem', padding: '4px 10px', background: '#f8fafc', color: '#475569', border: '1px solid #cbd5e1', borderRadius: '6px' }}>Jul-Dec '25</button>
                  <button className="btn-iipm" onClick={() => applyMonthPreset(["January '26", "February '26", "March '26", "April '26", "May '26", "June '26"])} style={{ fontSize: '0.8rem', padding: '4px 10px', background: '#f8fafc', color: '#475569', border: '1px solid #cbd5e1', borderRadius: '6px' }}>Jan-Jun '26</button>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', padding: '12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <select className="form-control-iipm" value={selectedMonthName} onChange={e => setSelectedMonthName(e.target.value)} style={{ width: '130px', padding: '8px 12px' }}>
                  {['January','February','March','April','May','June','July','August','September','October','November','December'].map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
                <select className="form-control-iipm" value={selectedYearVal} onChange={e => setSelectedYearVal(e.target.value)} style={{ width: '100px', padding: '8px 12px' }}>
                  <option value="25">2025</option>
                  <option value="26">2026</option>
                  <option value="27">2027</option>
                </select>
                <button className="btn-iipm" onClick={() => addSelectedMonth()} style={{ background: '#4f46e5', color: 'white', fontWeight: 600, padding: '9px 16px', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '6px', border: 'none', cursor: 'pointer' }}>
                  ➕ Add Month
                </button>
                
                <div style={{ width: '1px', height: '24px', background: '#cbd5e1', margin: '0 8px' }}></div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  {daMonths.map(m => (
                    <span key={m} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: '#ffffff', color: '#334155', padding: '6px 12px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 600, border: '1px solid #cbd5e1', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                      {m}
                      <button onClick={() => removeDaMonth(m)} title="Remove Month" style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 0 }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Step 2: Load Employees */}
            <div className="card-iipm" style={{ padding: '20px', background: '#ffffff', borderLeft: '4px solid #f59e0b', display: 'flex', flexDirection: 'column', gap: '16px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ background: '#fef3c7', color: '#b45309', width: '28px', height: '28px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.9rem' }}>2</div>
                  <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#1e293b' }}>Filter & Load Employees</h3>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <button className="btn-iipm" onClick={exportDaExcel} style={{ background: '#10b981', color: 'white', fontWeight: 600, padding: '8px 16px', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '8px', border: 'none', cursor: 'pointer' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                    Export to Excel ({daRows.length})
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                <select 
                  className="form-control-iipm" 
                  value={bulkCategory} 
                  onChange={e => {
                    const cat = e.target.value as any;
                    setBulkCategory(cat);
                    loadAllEmployeesToTable(cat);
                  }}
                  style={{ width: '260px', padding: '9px 12px' }}
                >
                  <option value="all">🌐 All Staff & Faculty ({users.length > 0 ? users.length : 'All'})</option>
                  <option value="faculty">🎓 Regular Teaching Faculty</option>
                  <option value="staff">👔 Regular Non-Teaching</option>
                  <option value="contract">📋 Contract Employees</option>
                </select>
                <button className="btn-iipm" onClick={() => loadAllEmployeesToTable(bulkCategory)} style={{ background: '#f59e0b', color: 'white', border: 'none', padding: '9px 16px', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}>
                  ⚡ Populate Employees ({daRows.length > 0 ? `${daRows.length} Loaded` : 'Click to Load'})
                </button>
                <div style={{ width: '1px', height: '24px', background: '#cbd5e1', margin: '0 4px' }}></div>
                <button className="btn-iipm" onClick={addDaRow} style={{ background: '#ffffff', border: '1px solid #cbd5e1', padding: '8px 16px', borderRadius: '6px', fontWeight: 600, color: '#334155', cursor: 'pointer' }}>
                  + Add Single Row
                </button>
                {daRows.length > 0 && (
                  <button className="btn-iipm" onClick={() => setDaRows([])} style={{ background: '#fee2e2', color: '#b91c1c', border: '1px solid #fca5a5', padding: '8px 16px', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}>
                    Clear All
                  </button>
                )}
              </div>
            </div>

            {/* Step 3: DA Revision Rate */}
            <div className="card-iipm" style={{ padding: '20px', background: '#ffffff', borderLeft: '4px solid #10b981', display: 'flex', flexDirection: 'column', gap: '16px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ background: '#d1fae5', color: '#047857', width: '28px', height: '28px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.9rem' }}>3</div>
                  <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#1e293b' }}>DA Revision Rate</h3>
                </div>
                <div style={{ fontSize: '0.85rem', color: '#059669', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                  Auto-computed across {daMonths.length} active months
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap', padding: '16px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '0.95rem', fontWeight: 600, color: '#475569' }}>Old DA %</span>
                  <input type="number" className="form-control-iipm" value={bulkOldDa} onChange={e => handleOldDaChange(Number(e.target.value))} style={{ width: '80px', padding: '8px', textAlign: 'center', fontWeight: 'bold' }} />
                </div>
                
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '0.95rem', fontWeight: 600, color: '#475569' }}>New DA %</span>
                  <input type="number" className="form-control-iipm" value={bulkNewDa} onChange={e => handleNewDaChange(Number(e.target.value))} style={{ width: '80px', padding: '8px', textAlign: 'center', fontWeight: 'bold' }} />
                </div>

                <div style={{ background: '#dbeafe', color: '#1d4ed8', padding: '8px 16px', borderRadius: '6px', fontWeight: 700, fontSize: '0.95rem', border: '1px solid #bfdbfe' }}>
                  Hike: {(bulkNewDa - bulkOldDa).toFixed(1)}%
                </div>

                <div style={{ flex: 1 }}></div>

                <button 
                  className="btn-iipm" 
                  onClick={autoCalculateBulkDA} 
                  disabled={daRows.length === 0}
                  style={{ 
                    background: daRows.length > 0 ? '#10b981' : '#94a3b8', 
                    color: 'white', border: 'none', padding: '10px 20px', borderRadius: '6px', fontWeight: 600,
                    cursor: daRows.length > 0 ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', gap: '8px'
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.59-9.21l-5.6 5.6"></path></svg>
                  Recalculate {daRows.length} Staff
                </button>
              </div>
            </div>
          </div>

          <div className="table-card-iipm" style={{ maxHeight: '600px', overflowY: 'auto', overflowX: 'auto', background: '#fff', border: '1px solid var(--border)', borderRadius: '12px' }}>
            <table className="table-iipm" style={{ minWidth: `${1000 + (daMonths.length * 150)}px`, fontSize: '0.8rem', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ position: 'sticky', top: 0, zIndex: 10, background: '#f8fafc', boxShadow: 'inset 0 -1px 0 #e2e8f0' }}>
                  <th rowSpan={2} style={{ padding: '14px 16px', color: '#475569', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Sl.No</th>
                  <th rowSpan={2} style={{ padding: '14px 16px', color: '#475569', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Employee No</th>
                  <th rowSpan={2} style={{ padding: '14px 16px', color: '#475569', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Name of the Employee</th>
                  <th rowSpan={2} style={{ padding: '14px 16px', color: '#475569', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>Basic (₹)</th>
                  {daMonths.map(m => (
                    <th colSpan={2} key={m} style={{ padding: '10px 12px', textAlign: 'center', background: '#e0e7ff', borderLeft: '1px solid #c7d2fe', borderBottom: '1px solid #c7d2fe' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: '#3730a3', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        {m} 
                        <button onClick={() => removeDaMonth(m)} title="Remove Month" style={{ background:'rgba(239,68,68,0.1)', border:'none', color:'#ef4444', borderRadius:'50%', width:'20px', height:'20px', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', padding: 0 }}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
                        </button>
                      </div>
                    </th>
                  ))}
                  <th rowSpan={2} style={{ padding: '14px 16px', color: '#475569', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>Cummulative DA</th>
                  <th rowSpan={2} style={{ padding: '14px 16px', color: '#475569', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>Cummulative TA</th>
                  <th rowSpan={2} style={{ padding: '14px 16px', color: '#475569', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>NPS Employer Share</th>
                  <th rowSpan={2} style={{ padding: '14px 16px', color: '#475569', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>Gross Arrears</th>
                  <th rowSpan={2} style={{ padding: '14px 16px', color: '#475569', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>Less: NPS Emp. Share</th>
                  <th rowSpan={2} style={{ padding: '14px 16px', color: '#475569', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>NPS Employer Share</th>
                  <th rowSpan={2} style={{ padding: '14px 16px', color: '#475569', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>Less: TDS</th>
                  <th rowSpan={2} style={{ padding: '14px 16px', color: '#475569', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>Net Amount Payable</th>
                  <th rowSpan={2} style={{ padding: '14px 16px' }}></th>
                </tr>
                <tr style={{ position: 'sticky', top: '48px', zIndex: 10, background: '#eef2ff', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                  {daMonths.map(m => (
                    <React.Fragment key={m + "_sub"}>
                      <th style={{ padding: '8px 12px', textAlign: 'center', background: '#eef2ff', borderLeft: '1px solid #c7d2fe', color: '#4338ca', fontSize: '0.75rem', fontWeight: 700 }}>DA Diff ({(bulkNewDa - bulkOldDa) > 0 ? `+${(bulkNewDa - bulkOldDa).toFixed(1)}%` : 'DA'})</th>
                      <th style={{ padding: '8px 12px', textAlign: 'center', background: '#eef2ff', color: '#4338ca', fontSize: '0.75rem', fontWeight: 700 }}>TA Diff</th>
                    </React.Fragment>
                  ))}
                </tr>
              </thead>
              <tbody>
                {daRows.map((r, idx) => {
                  const calc = calculateDaRow(r);
                  return (
                    <tr key={r.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td>{idx + 1}</td>
                      <td>
                        <input 
                          type="text" 
                          list="all-employees-list"
                          className="form-control-iipm" 
                          style={{ width: '95px', padding: '4px', fontWeight: 600 }} 
                          value={r.employeeNo} 
                          onChange={e => handleEmpNoChange(r.id, e.target.value)} 
                          placeholder="e.g. TS1001" 
                        />
                      </td>
                      <td>
                        <input 
                          type="text" 
                          className="form-control-iipm" 
                          style={{ width: '150px', padding: '4px' }} 
                          value={r.name} 
                          onChange={e => updateDaRow(r.id, 'name', e.target.value)} 
                        />
                      </td>
                      <td>
                        <input 
                          type="number" 
                          className="form-control-iipm" 
                          style={{ width: '85px', padding: '4px', fontWeight: 600 }} 
                          value={r.basic || ''} 
                          onChange={e => handleBasicChange(r.id, Number(e.target.value))} 
                        />
                      </td>
                      {daMonths.map(m => (
                        <React.Fragment key={m + "_inputs"}>
                          <td style={{ borderLeft: '1px solid #e2e8f0' }}>
                            <input 
                              type="number" 
                              className="form-control-iipm" 
                              style={{ width: '70px', padding: '4px', textAlign: 'right' }} 
                              value={r.months[m]?.da ?? ''} 
                              onChange={e => updateDaMonth(r.id, m, 'da', Number(e.target.value))} 
                            />
                          </td>
                          <td>
                            <input 
                              type="number" 
                              className="form-control-iipm" 
                              style={{ width: '55px', padding: '4px', textAlign: 'right' }} 
                              value={r.months[m]?.ta ?? ''} 
                              onChange={e => updateDaMonth(r.id, m, 'ta', Number(e.target.value))} 
                            />
                          </td>
                        </React.Fragment>
                      ))}
                      <td style={{ fontWeight: 600, background: '#f8fafc', textAlign: 'right' }}>{calc.cummDa}</td>
                      <td style={{ fontWeight: 600, background: '#f8fafc', textAlign: 'right' }}>{calc.cummTa}</td>
                      <td style={{ fontWeight: 600, background: '#f8fafc', textAlign: 'right' }}>{calc.npsEmployer}</td>
                      <td style={{ fontWeight: 700, background: '#eef2ff', textAlign: 'right' }}>{calc.gross}</td>
                      <td style={{ fontWeight: 600, background: '#f8fafc', textAlign: 'right', color: '#ef4444' }}>{calc.npsEmp}</td>
                      <td style={{ fontWeight: 600, background: '#f8fafc', textAlign: 'right' }}>{calc.npsEmployer}</td>
                      <td>
                        <input 
                          type="number" 
                          className="form-control-iipm" 
                          style={{ width: '70px', padding: '4px', textAlign: 'right' }} 
                          value={r.tds || ''} 
                          onChange={e => updateDaRow(r.id, 'tds', Number(e.target.value))} 
                        />
                      </td>
                      <td style={{ fontWeight: 700, background: '#eef2ff', color: '#4338ca', textAlign: 'right', fontSize: '0.9rem' }}>{calc.net}</td>
                      <td>
                        <button onClick={() => setDaRows(daRows.filter(x => x.id !== r.id))} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '1rem' }}>❌</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === 'promotion' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <button className="btn-primary-iipm" onClick={addRow}>+ Add Empty Row</button>
              <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Tip: Select an employee from the dropdown in any row to auto-populate basic pay and calculate!</span>
            </div>
            <button className="btn-iipm" onClick={exportPromotionExcel} style={{ background: '#10b981', color: 'white', fontWeight: 600, padding: '8px 16px', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '8px', border: 'none', cursor: 'pointer', boxShadow: '0 1px 2px rgba(16,185,129,0.2)' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
              Export to Excel ({rows.length} Records)
            </button>
          </div>

          <div className="table-card-iipm" style={{ maxHeight: '600px', overflowY: 'auto', overflowX: 'auto', background: '#fff', border: '1px solid var(--border)', borderRadius: '12px' }}>
            <table className="table-iipm" style={{ minWidth: '1800px', fontSize: '0.8rem', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ position: 'sticky', top: 0, zIndex: 10, background: '#f8fafc', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                  <th>Sl.</th>
                  <th>Select Employee</th>
                  <th>Faculty / Staff Name</th>
                  <th>Date of Promotion</th>
                  <th>Old Basic (₹)</th>
                  <th>Upgraded Pay (₹)</th>
                  <th>Difference in Pay</th>
                  <th title="Days in Month">Month Days</th>
                  <th>No. of Days</th>
                  <th>Proportionate Basic</th>
                  <th>DA ({bulkNewDa}%)</th>
                  <th>HRA (20%)</th>
                  <th>NPS Employer (14%)</th>
                  <th>Gross Total</th>
                  <th>TDS</th>
                  <th>Less: NPS Employee (10%)</th>
                  <th>Less: NPS Employer (14%)</th>
                  <th>Net Payable (₹)</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, idx) => {
                  const calc = calculateRow(r);
                  return (
                    <tr key={r.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td>{idx + 1}</td>
                      <td>
                        <select 
                          className="form-control-iipm" 
                          style={{ width: '160px', padding: '4px', fontSize: '0.8rem' }}
                          value={r.employeeNo || ''}
                          onChange={e => handlePromoEmpSelect(r.id, e.target.value)}
                        >
                          <option value="">-- Choose Employee --</option>
                          {users.map(u => (
                            <option key={u.id || u.employeeId} value={u.employeeId}>
                              {u.employeeId} - {u.firstName} {u.lastName}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <input type="text" className="form-control-iipm" style={{ width: '140px', padding: '4px' }} 
                          value={r.name} onChange={e => updateRow(r.id, 'name', e.target.value)} placeholder="Type name..." />
                      </td>
                      <td>
                        <input type="text" className="form-control-iipm" style={{ width: '120px', padding: '4px' }} 
                          value={r.dateOfPromotion} onChange={e => updateRow(r.id, 'dateOfPromotion', e.target.value)} placeholder="e.g. 13th Feb 2025" />
                      </td>
                      <td>
                        <input type="number" className="form-control-iipm" style={{ width: '85px', padding: '4px', fontWeight: 600 }} 
                          value={r.basicPay || ''} onChange={e => updateRow(r.id, 'basicPay', Number(e.target.value))} />
                      </td>
                      <td>
                        <input type="number" className="form-control-iipm" style={{ width: '85px', padding: '4px', fontWeight: 600, color: '#0a3161' }} 
                          value={r.upgradedPay || ''} onChange={e => updateRow(r.id, 'upgradedPay', Number(e.target.value))} />
                      </td>
                      <td style={{ fontWeight: 600, background: '#f8fafc', textAlign: 'right' }}>{calc.diff}</td>
                      <td>
                        <input type="number" className="form-control-iipm" style={{ width: '55px', padding: '4px' }} 
                          value={r.daysInMonth || ''} onChange={e => updateRow(r.id, 'daysInMonth', Number(e.target.value))} title="Days in month used for proportion" />
                      </td>
                      <td>
                        <input type="number" className="form-control-iipm" style={{ width: '55px', padding: '4px' }} 
                          value={r.days || ''} onChange={e => updateRow(r.id, 'days', Number(e.target.value))} />
                      </td>
                      <td>
                        <input type="number" className="form-control-iipm" style={{ width: '80px', padding: '4px', background: r.overridePropBasic !== null ? '#fef08a' : '' }} 
                          value={r.overridePropBasic !== null ? r.overridePropBasic : calc.propBasic} 
                          onChange={e => updateRow(r.id, 'overridePropBasic', e.target.value === '' ? null : Number(e.target.value))} />
                      </td>
                      <td>
                        <input type="number" className="form-control-iipm" style={{ width: '70px', padding: '4px', background: r.overrideDa !== null ? '#fef08a' : '' }} 
                          value={r.overrideDa !== null ? r.overrideDa : calc.da} 
                          onChange={e => updateRow(r.id, 'overrideDa', e.target.value === '' ? null : Number(e.target.value))} />
                      </td>
                      <td>
                        <input type="number" className="form-control-iipm" style={{ width: '70px', padding: '4px', background: r.overrideHra !== null ? '#fef08a' : '' }} 
                          value={r.overrideHra !== null ? r.overrideHra : calc.hra} 
                          onChange={e => updateRow(r.id, 'overrideHra', e.target.value === '' ? null : Number(e.target.value))} />
                      </td>
                      <td>
                        <input type="number" className="form-control-iipm" style={{ width: '80px', padding: '4px', background: r.overrideNpsEmployer !== null ? '#fef08a' : '' }} 
                          value={r.overrideNpsEmployer !== null ? r.overrideNpsEmployer : calc.npsEmployer} 
                          onChange={e => updateRow(r.id, 'overrideNpsEmployer', e.target.value === '' ? null : Number(e.target.value))} />
                      </td>
                      <td style={{ fontWeight: 600, background: '#f8fafc', textAlign: 'right' }}>{calc.gross}</td>
                      <td>
                        <input type="number" className="form-control-iipm" style={{ width: '70px', padding: '4px' }} 
                          value={r.tds || ''} onChange={e => updateRow(r.id, 'tds', Number(e.target.value))} />
                      </td>
                      <td>
                        <input type="number" className="form-control-iipm" style={{ width: '80px', padding: '4px', background: r.overrideNpsEmp !== null ? '#fef08a' : '' }} 
                          value={r.overrideNpsEmp !== null ? r.overrideNpsEmp : calc.npsEmp} 
                          onChange={e => updateRow(r.id, 'overrideNpsEmp', e.target.value === '' ? null : Number(e.target.value))} />
                      </td>
                      <td style={{ fontWeight: 600, background: '#f8fafc', textAlign: 'right' }}>{r.overrideNpsEmployer !== null ? r.overrideNpsEmployer : calc.npsEmployer}</td>
                      <td style={{ fontWeight: 700, background: '#eef2ff', color: '#4338ca', textAlign: 'right', fontSize: '0.9rem' }}>{calc.net}</td>
                      <td>
                        <button onClick={() => removeRow(r.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '1rem' }}>❌</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

    </div>
  );
};

export default ArrearsCalculator;
