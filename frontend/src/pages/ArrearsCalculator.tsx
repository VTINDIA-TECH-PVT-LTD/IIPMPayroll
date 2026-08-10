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

  const [signatures, setSignatures] = useState({
    preparedBy: 'S.SIRISHA',
    verifiedBy1: 'Y RAMA RAO',
    verifiedBy2: 'DR. B.MURALI KRISHNA',
    approvedBy: 'SHRI.RAM PHAL DWIVEDI'
  });

  useEffect(() => {
    apiService.getAllUsers().then(data => {
      setUsers(data.filter((u: any) => u.isActive));
    }).catch(console.error);
  }, []);

  // PROMOTION LOGIC
  const calculateRow = (r: any) => {
    const diff = Math.max(0, (r.upgradedPay || 0) - (r.basicPay || 0));
    const propBasic = r.overridePropBasic !== null ? r.overridePropBasic : Math.round((diff / r.daysInMonth) * r.days);
    const da = r.overrideDa !== null ? r.overrideDa : Math.round(propBasic * 0.53);
    const hra = r.overrideHra !== null ? r.overrideHra : Math.round(propBasic * 0.20);
    const npsEmployer = r.overrideNpsEmployer !== null ? r.overrideNpsEmployer : Math.round((propBasic + da) * 0.14);
    const npsEmp = r.overrideNpsEmp !== null ? r.overrideNpsEmp : Math.round((propBasic + da) * 0.10);
    const gross = propBasic + da + hra + npsEmployer;
    const tds = r.tds || 0;
    const net = gross - npsEmp - npsEmployer - tds;
    return { diff, propBasic, da, hra, npsEmployer, npsEmp, gross, tds, net };
  };

  const addRow = () => {
    setRows([...rows, { id: Date.now(), name: '', dateOfPromotion: '', basicPay: 0, upgradedPay: 0, days: 0, daysInMonth: 31, overridePropBasic: null, overrideDa: null, overrideHra: null, overrideNpsEmp: null, overrideNpsEmployer: null, tds: 0 }]);
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
    daMonths.forEach(m => monthsObj[m] = { da: 0, ta: 0 });
    setDaRows([...daRows, { id: Date.now(), employeeNo: '', name: '', basic: 0, months: monthsObj, tds: 0 }]);
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
  
  const addDaMonth = () => {
    const mName = prompt("Enter Month Name (e.g. April '26)");
    if (!mName || daMonths.includes(mName)) return;
    setDaMonths([...daMonths, mName]);
    setDaRows(daRows.map(r => ({ ...r, months: { ...r.months, [mName]: { da: 0, ta: 0 } } })));
  };

  const removeDaMonth = (mName: string) => {
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
        row[`${m} DA 60%`] = r.months[m]?.da || 0;
        row[`${m} TA`] = r.months[m]?.ta || 0;
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
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1>Arrears Calculators</h1>
          <p>Automated calculators for retrospective payouts</p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--border)', marginBottom: '20px' }}>
        <button onClick={() => setTab('promotion')} style={{ padding: '10px 20px', background: 'none', border: 'none', borderBottom: `2px solid ${tab === 'promotion' ? 'var(--accent)' : 'transparent'}`, color: tab === 'promotion' ? 'var(--accent)' : 'var(--text-muted)', fontWeight: 600, cursor: 'pointer', fontSize: '0.9rem' }}>Promotion Arrears</button>
        <button onClick={() => setTab('tada')} style={{ padding: '10px 20px', background: 'none', border: 'none', borderBottom: `2px solid ${tab === 'tada' ? 'var(--accent)' : 'transparent'}`, color: tab === 'tada' ? 'var(--accent)' : 'var(--text-muted)', fontWeight: 600, cursor: 'pointer', fontSize: '0.9rem' }}>TA & DA Arrears</button>
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button className="btn-primary-iipm" onClick={addDaRow}>+ Add Employee</button>
              <button className="btn-iipm" onClick={addDaMonth} style={{ background: '#6366f1', color: 'white' }}>+ Add Month Column</button>
            </div>
            <button className="btn-iipm" onClick={exportDaExcel} style={{ background: '#22c55e', color: 'white' }}>Export to Excel</button>
          </div>
          <div className="table-card-iipm" style={{ overflowX: 'auto', paddingBottom: '200px' }}>
            <table className="table-iipm" style={{ minWidth: `${1000 + (daMonths.length * 150)}px`, fontSize: '0.8rem' }}>
              <thead>
                <tr>
                  <th rowSpan={2}>Sl.No</th>
                  <th rowSpan={2}>Employee No</th>
                  <th rowSpan={2}>Name of the Employee</th>
                  <th rowSpan={2}>Basic</th>
                  {daMonths.map(m => (
                    <th colSpan={2} key={m} style={{ textAlign: 'center', background: '#e0e7ff', borderLeft: '1px solid #c7d2fe' }}>
                      {m} <button onClick={() => removeDaMonth(m)} style={{ background:'none', border:'none', color:'red', cursor:'pointer' }}>x</button>
                    </th>
                  ))}
                  <th rowSpan={2}>Cummulative DA</th>
                  <th rowSpan={2}>Cummulative TA</th>
                  <th rowSpan={2}>NPS Employer Share</th>
                  <th rowSpan={2}>Gross Arrears</th>
                  <th rowSpan={2}>Less: NPS Employee Share</th>
                  <th rowSpan={2}>NPS Employer Share</th>
                  <th rowSpan={2}>Less: TDS</th>
                  <th rowSpan={2}>Net Amount Payable</th>
                  <th rowSpan={2}></th>
                </tr>
                <tr>
                  {daMonths.map(m => (
                    <React.Fragment key={m + "_sub"}>
                      <th style={{ background: '#eef2ff', borderLeft: '1px solid #c7d2fe' }}>DA 60%</th>
                      <th style={{ background: '#eef2ff' }}>TA</th>
                    </React.Fragment>
                  ))}
                </tr>
              </thead>
              <tbody>
                {daRows.map((r, idx) => {
                  const calc = calculateDaRow(r);
                  return (
                    <tr key={r.id}>
                      <td>{idx + 1}</td>
                      <td>
                        <input type="text" className="form-control-iipm" style={{ width: '90px', padding: '4px' }} 
                          value={r.employeeNo} onChange={e => {
                            updateDaRow(r.id, 'employeeNo', e.target.value);
                            const emp = users.find(u => u.employeeId === e.target.value);
                            if(emp) {
                              updateDaRow(r.id, 'name', emp.firstName + ' ' + emp.lastName);
                              updateDaRow(r.id, 'basic', emp.basicPay);
                            }
                          }} placeholder="NT1022" />
                      </td>
                      <td>
                        <input type="text" className="form-control-iipm" style={{ width: '140px', padding: '4px' }} 
                          value={r.name} onChange={e => updateDaRow(r.id, 'name', e.target.value)} />
                      </td>
                      <td>
                        <input type="number" className="form-control-iipm" style={{ width: '80px', padding: '4px' }} 
                          value={r.basic || ''} onChange={e => updateDaRow(r.id, 'basic', Number(e.target.value))} />
                      </td>
                      {daMonths.map(m => (
                        <React.Fragment key={m + "_inputs"}>
                          <td style={{ borderLeft: '1px solid #e2e8f0' }}>
                            <input type="number" className="form-control-iipm" style={{ width: '70px', padding: '4px' }} 
                              value={r.months[m]?.da || ''} onChange={e => updateDaMonth(r.id, m, 'da', Number(e.target.value))} />
                          </td>
                          <td>
                            <input type="number" className="form-control-iipm" style={{ width: '50px', padding: '4px' }} 
                              value={r.months[m]?.ta || ''} onChange={e => updateDaMonth(r.id, m, 'ta', Number(e.target.value))} />
                          </td>
                        </React.Fragment>
                      ))}
                      <td style={{ fontWeight: 600, background: '#f8fafc' }}>{calc.cummDa}</td>
                      <td style={{ fontWeight: 600, background: '#f8fafc' }}>{calc.cummTa}</td>
                      <td style={{ fontWeight: 600, background: '#f8fafc' }}>{calc.npsEmployer}</td>
                      <td style={{ fontWeight: 700, background: '#eef2ff' }}>{calc.gross}</td>
                      <td style={{ fontWeight: 600, background: '#f8fafc' }}>{calc.npsEmp}</td>
                      <td style={{ fontWeight: 600, background: '#f8fafc' }}>{calc.npsEmployer}</td>
                      <td>
                        <input type="number" className="form-control-iipm" style={{ width: '70px', padding: '4px' }} 
                          value={r.tds || ''} onChange={e => updateDaRow(r.id, 'tds', Number(e.target.value))} />
                      </td>
                      <td style={{ fontWeight: 700, background: '#eef2ff', color: '#4338ca' }}>{calc.net}</td>
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
            <button className="btn-primary-iipm" onClick={addRow}>+ Add Row</button>
            <button className="btn-iipm" onClick={exportPromotionExcel} style={{ background: '#22c55e', color: 'white' }}>Export to Excel</button>
          </div>

          <div className="table-card-iipm" style={{ overflowX: 'auto', paddingBottom: '200px' }}>
            <table className="table-iipm" style={{ minWidth: '1800px', fontSize: '0.8rem' }}>
              <thead>
                <tr>
                  <th>Name of the Faculty</th>
                  <th>Date of promotion</th>
                  <th>Basic Pay</th>
                  <th>Upgraded Pay</th>
                  <th>Difference in Pay</th>
                  <th title="Days in Month">Month Days</th>
                  <th>No.of.Days</th>
                  <th>Proportionate Basic</th>
                  <th>DA</th>
                  <th>HRA</th>
                  <th>NPS Employer</th>
                  <th>Gross Total</th>
                  <th>TDS</th>
                  <th>Less: NPS Employee share</th>
                  <th>Less: NPS Employer share</th>
                  <th>Net amount payable</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, idx) => {
                  const calc = calculateRow(r);
                  return (
                    <tr key={r.id}>
                      <td>
                        <input type="text" className="form-control-iipm" style={{ width: '140px', padding: '4px' }} 
                          value={r.name} onChange={e => updateRow(r.id, 'name', e.target.value)} placeholder="Type name..." />
                      </td>
                      <td>
                        <input type="text" className="form-control-iipm" style={{ width: '120px', padding: '4px' }} 
                          value={r.dateOfPromotion} onChange={e => updateRow(r.id, 'dateOfPromotion', e.target.value)} placeholder="e.g. 13th Feb 2025" />
                      </td>
                      <td>
                        <input type="number" className="form-control-iipm" style={{ width: '80px', padding: '4px' }} 
                          value={r.basicPay || ''} onChange={e => updateRow(r.id, 'basicPay', Number(e.target.value))} />
                      </td>
                      <td>
                        <input type="number" className="form-control-iipm" style={{ width: '80px', padding: '4px' }} 
                          value={r.upgradedPay || ''} onChange={e => updateRow(r.id, 'upgradedPay', Number(e.target.value))} />
                      </td>
                      <td style={{ fontWeight: 600, background: '#f8fafc' }}>{calc.diff}</td>
                      <td>
                        <input type="number" className="form-control-iipm" style={{ width: '60px', padding: '4px' }} 
                          value={r.daysInMonth || ''} onChange={e => updateRow(r.id, 'daysInMonth', Number(e.target.value))} title="Days in month used for proportion" />
                      </td>
                      <td>
                        <input type="number" className="form-control-iipm" style={{ width: '60px', padding: '4px' }} 
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
                      <td style={{ fontWeight: 600, background: '#f8fafc' }}>{calc.gross}</td>
                      <td>
                        <input type="number" className="form-control-iipm" style={{ width: '70px', padding: '4px' }} 
                          value={r.tds || ''} onChange={e => updateRow(r.id, 'tds', Number(e.target.value))} />
                      </td>
                      <td>
                        <input type="number" className="form-control-iipm" style={{ width: '80px', padding: '4px', background: r.overrideNpsEmp !== null ? '#fef08a' : '' }} 
                          value={r.overrideNpsEmp !== null ? r.overrideNpsEmp : calc.npsEmp} 
                          onChange={e => updateRow(r.id, 'overrideNpsEmp', e.target.value === '' ? null : Number(e.target.value))} />
                      </td>
                      <td style={{ fontWeight: 600, background: '#f8fafc' }}>{r.overrideNpsEmployer !== null ? r.overrideNpsEmployer : calc.npsEmployer}</td>
                      <td style={{ fontWeight: 700, background: '#eef2ff', color: '#4338ca' }}>{calc.net}</td>
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
