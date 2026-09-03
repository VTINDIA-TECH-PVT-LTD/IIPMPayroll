import React, { useState, useEffect, useContext } from 'react';
import * as XLSX from 'xlsx';
import apiService from '../services/api';
import { UserContext } from '../App';

const ArrearsPage: React.FC = () => {
  const userCtx = useContext(UserContext);
  const [tab, setTab] = useState<'list' | 'da' | 'promo'>('list');
  const [arrears, setArrears] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [daForm, setDaForm] = useState({ userId: '', oldDAPercentage: '', newDAPercentage: '', fromMonth: '', fromYear: '', toMonth: '', toYear: '', remarks: '' });
  const [promoForm, setPromoForm] = useState({ userId: '', oldBasicPay: '', newBasicPay: '', effectiveMonth: '', effectiveYear: '', daysWorked: '26', totalDays: '26', remarks: '' });

  useEffect(() => {
    loadArrears();
    loadUsers();
  }, []);

  const loadArrears = async () => {
    try {
      setLoading(true);
      const data = await apiService.getAllArrears();
      setArrears(data || []);
    } catch { setArrears([]); }
    finally { setLoading(false); }
  };

  const loadUsers = async () => {
    try { const data = await apiService.getAllUsers(); setUsers(data || []); }
    catch { }
  };

  const submitDA = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    try {
      await apiService.createDAArear({
        ...daForm,
        oldDAPercentage: parseFloat(daForm.oldDAPercentage),
        newDAPercentage: parseFloat(daForm.newDAPercentage),
        fromMonth: parseInt(daForm.fromMonth),
        fromYear: parseInt(daForm.fromYear),
        toMonth: parseInt(daForm.toMonth),
        toYear: parseInt(daForm.toYear),
      });
      setMsg({ type: 'success', text: 'DA arrear created successfully!' });
      setTab('list'); loadArrears();
    } catch (e: any) {
      setMsg({ type: 'error', text: e.response?.data?.message || 'Error creating DA arrear.' });
    }
  };

  const submitPromo = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    try {
      await apiService.createPromotionArear({
        ...promoForm,
        oldBasicPay: parseFloat(promoForm.oldBasicPay),
        newBasicPay: parseFloat(promoForm.newBasicPay),
        effectiveMonth: parseInt(promoForm.effectiveMonth),
        effectiveYear: parseInt(promoForm.effectiveYear),
        daysWorked: parseInt(promoForm.daysWorked),
        totalDays: parseInt(promoForm.totalDays),
      });
      setMsg({ type: 'success', text: 'Promotion arrear created successfully!' });
      setTab('list'); loadArrears();
    } catch (e: any) {
      setMsg({ type: 'error', text: e.response?.data?.message || 'Error creating promotion arrear.' });
    }
  };

  const handleApprove = async (id: string) => {
    try { await apiService.approveArrear(id); setMsg({ type: 'success', text: 'Arrear approved.' }); loadArrears(); }
    catch { setMsg({ type: 'error', text: 'Error approving arrear.' }); }
  };

  const handleMarkPaid = async (id: string) => {
    try { await apiService.markArrearAsPaid(id); setMsg({ type: 'success', text: 'Arrear marked as paid.' }); loadArrears(); }
    catch { setMsg({ type: 'error', text: 'Error updating arrear.' }); }
  };

  const fmt = (n: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const statusColor: Record<string, string> = { PENDING: '#f59e0b', DRAFT: '#f59e0b', APPROVED: '#22c55e', PAID: '#3b82f6', REJECTED: '#ef4444' };

  const getEmpName = (a: any) => {
    const u = users.find(u => u.employeeId === a.employeeId || u.id === a.userId || u._id === a.userId);
    if (u) return `${u.name || (u.firstName + ' ' + u.lastName)} (${u.employeeId || ''})`;
    return a.employeeId || a.userId || '—';
  };

  const exportArrearsToExcel = () => {
    if (!arrears.length) return;
    const wb = XLSX.utils.book_new();
    const rows = arrears.map((a: any, idx: number) => {
      const u = users.find(u => u.employeeId === a.employeeId || u.id === a.userId || u._id === a.userId);
      return {
        'Sl. No.': idx + 1,
        'Arrear Type': a.arrearType || a.type || 'PROMOTION',
        'Employee ID': a.employeeId || u?.employeeId || '-',
        'Employee Name': u?.name || `${u?.firstName || ''} ${u?.lastName || ''}`.trim() || '-',
        'Designation': u?.designation || '-',
        'Description': a.description || 'Arrears Calculation',
        'From Period': a.fromMonth ? `${months[a.fromMonth - 1]} ${a.fromYear}` : '-',
        'To Period': a.toMonth ? `${months[a.toMonth - 1]} ${a.toYear}` : '-',
        'Gross Arrear (Rs.)': a.grossAmount || a.totalAmount || 0,
        'NPS Employee Deduction (Rs.)': a.npsEmployeeShare || 0,
        'Other Deductions (Rs.)': (a.otherDeductions || 0) + (a.professionalTax || 0) + (a.cghs || 0),
        'Total Deductions (Rs.)': a.totalDeductions || 0,
        'Net Arrears Payable (Rs.)': a.netAmount || a.totalAmount || a.arrearAmount || 0,
        'Status': a.status || 'APPROVED'
      };
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, 'Arrears_Statement');
    XLSX.writeFile(wb, 'IIPE_Official_Arrears_Statement.xlsx');
  };

  const totalGross = arrears.reduce((s, a) => s + (a.grossAmount || a.totalAmount || 0), 0);
  const totalNet = arrears.reduce((s, a) => s + (a.netAmount || a.totalAmount || a.arrearAmount || 0), 0);
  const totalDeductions = arrears.reduce((s, a) => s + (a.totalDeductions || 0), 0);

  return (
    <div className="page-container">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <h1>Arrears Management</h1>
          <p>Official promotional arrears, DA revision arrears, and joining pay settlements</p>
        </div>
        {tab === 'list' && arrears.length > 0 && (
          <button className="btn-accent-iipm" onClick={exportArrearsToExcel} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            📊 Export Arrears Statement (Excel)
          </button>
        )}
      </div>

      {msg && (
        <div className={`alert-iipm ${msg.type === 'success' ? 'alert-success' : 'alert-danger'}`} style={{ marginBottom: '16px' }}>
          {msg.text}
          <button onClick={() => setMsg(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}>✕</button>
        </div>
      )}

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div className="stat-card">
          <div className="stat-label">Total Arrears Cases</div>
          <div className="stat-value" style={{ fontSize: '1.5rem', color: '#0a3161' }}>{arrears.length} Records</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Gross Arrears</div>
          <div className="stat-value" style={{ fontSize: '1.5rem', color: '#3b82f6' }}>{fmt(totalGross)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total NPS / Statutory Deductions</div>
          <div className="stat-value" style={{ fontSize: '1.5rem', color: '#ef4444' }}>{fmt(totalDeductions)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Net Arrears Payable</div>
          <div className="stat-value" style={{ fontSize: '1.5rem', color: '#16a34a' }}>{fmt(totalNet)}</div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--border)', marginBottom: '24px' }}>
        {([
          { key: 'list',  label: `📋 All Arrears (${arrears.length})` },
          { key: 'da',    label: '⊕ New DA Arrear' },
          { key: 'promo', label: '⊕ Promotion Arrear' },
        ] as const).map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            padding: '10px 22px', background: 'none', border: 'none',
            borderBottom: `2px solid ${tab === t.key ? 'var(--accent)' : 'transparent'}`,
            color: tab === t.key ? 'var(--accent)' : 'var(--text-muted)',
            fontWeight: 600, cursor: 'pointer', fontSize: '0.9rem', fontFamily: 'var(--font)'
          }}>{t.label}</button>
        ))}
      </div>

      {/* ===== LIST ===== */}
      {tab === 'list' && (
        <div className="card-iipm" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table className="table-iipm" style={{ fontSize: '0.86rem' }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  <th>Sl.</th>
                  <th>Type</th>
                  <th>Employee</th>
                  <th>Description / Order Details</th>
                  <th>Period</th>
                  <th style={{ textAlign: 'right' }}>Gross Arrear</th>
                  <th style={{ textAlign: 'right' }}>Deductions</th>
                  <th style={{ textAlign: 'right' }}>Net Payable (₹)</th>
                  <th style={{ textAlign: 'center' }}>Status</th>
                  <th style={{ textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {arrears.map((a: any, i: number) => (
                  <tr key={a.id || a._id || i}>
                    <td style={{ color: 'var(--text-muted)' }}>{i + 1}</td>
                    <td>
                      <span className={`badge-iipm ${(a.arrearType || a.type) === 'DA' ? 'badge-info' : 'badge-accent'}`}>
                        {a.arrearType || a.type || 'PROMOTION'}
                      </span>
                    </td>
                    <td style={{ fontWeight: 600 }}>{getEmpName(a)}</td>
                    <td style={{ fontSize: '0.8rem', color: '#475569', maxWidth: '280px' }}>
                      {a.description || 'Arrears on account of pay enhancement'}
                    </td>
                    <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                      {a.fromMonth ? `${months[a.fromMonth - 1]} ${a.fromYear} – ${months[(a.toMonth || a.fromMonth) - 1]} ${a.toYear || a.fromYear}` : `${a.effectiveMonth ? months[a.effectiveMonth - 1] : '—'} ${a.effectiveYear || ''}`}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 600 }}>{fmt(a.grossAmount || a.totalAmount || 0)}</td>
                    <td style={{ textAlign: 'right', color: '#ef4444' }}>{fmt(a.totalDeductions || 0)}</td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: '#16a34a' }}>
                      {fmt(a.netAmount || a.totalAmount || a.arrearAmount || 0)}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700, background: `${statusColor[a.status] || '#22c55e'}20`, color: statusColor[a.status] || '#22c55e' }}>
                        {a.status || 'APPROVED'}
                      </span>
                    </td>
                    <td style={{ whiteSpace: 'nowrap', textAlign: 'center' }}>
                      {a.status === 'PENDING' && (
                        <button onClick={() => handleApprove(a.id || a._id)} style={{ padding: '4px 10px', borderRadius: '6px', border: 'none', background: 'rgba(34,197,94,0.15)', color: '#22c55e', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, fontFamily: 'var(--font)' }}>Approve</button>
                      )}
                      {(a.status === 'APPROVED' || !a.status) && (
                        <button onClick={() => handleMarkPaid(a.id || a._id)} style={{ padding: '4px 10px', borderRadius: '6px', border: 'none', background: 'rgba(59,130,246,0.15)', color: '#3b82f6', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, fontFamily: 'var(--font)' }}>Mark Paid</button>
                      )}
                      {a.status === 'PAID' && <span style={{ color: '#16a34a', fontSize: '0.8rem', fontWeight: 600 }}>✓ Disbursed</span>}
                    </td>
                  </tr>
                ))}
                {arrears.length === 0 && !loading && (
                  <tr><td colSpan={10} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>No arrears records found.</td></tr>
                )}
              </tbody>
              {arrears.length > 0 && (
                <tfoot>
                  <tr style={{ background: '#f8fafc', fontWeight: 700 }}>
                    <td colSpan={5} style={{ padding: '12px 16px', color: 'var(--accent)' }}>TOTAL ARREARS DISBURSEMENT</td>
                    <td style={{ textAlign: 'right', padding: '12px 16px' }}>{fmt(totalGross)}</td>
                    <td style={{ textAlign: 'right', padding: '12px 16px', color: '#ef4444' }}>{fmt(totalDeductions)}</td>
                    <td style={{ textAlign: 'right', padding: '12px 16px', color: '#16a34a', fontSize: '1rem' }}>{fmt(totalNet)}</td>
                    <td colSpan={2}></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}

      {/* ===== DA ARREAR FORM ===== */}
      {tab === 'da' && (
        <div className="card-iipm" style={{ padding: '24px', maxWidth: '640px' }}>
          <h3 style={{ marginBottom: '20px' }}>Create DA Revision Arrear</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.87rem', marginBottom: '24px' }}>
            Arrear = (New DA% − Old DA%) × Basic Pay × Number of months
          </p>
          <form onSubmit={submitDA}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <label className="form-label-iipm">Employee *</label>
                <select className="form-control-iipm" value={daForm.userId} onChange={e => setDaForm({ ...daForm, userId: e.target.value })} required>
                  <option value="">Select Employee...</option>
                  {users.map(u => <option key={u.id} value={u.id}>{u.firstName} {u.lastName} ({u.employeeId})</option>)}
                </select>
              </div>
              <div>
                <label className="form-label-iipm">Old DA % *</label>
                <input type="number" className="form-control-iipm" step="0.01" value={daForm.oldDAPercentage} onChange={e => setDaForm({ ...daForm, oldDAPercentage: e.target.value })} placeholder="e.g., 46" required />
              </div>
              <div>
                <label className="form-label-iipm">New DA % *</label>
                <input type="number" className="form-control-iipm" step="0.01" value={daForm.newDAPercentage} onChange={e => setDaForm({ ...daForm, newDAPercentage: e.target.value })} placeholder="e.g., 50" required />
              </div>
              <div>
                <label className="form-label-iipm">From Month *</label>
                <input type="number" className="form-control-iipm" value={daForm.fromMonth} onChange={e => setDaForm({ ...daForm, fromMonth: e.target.value })} placeholder="1-12" min="1" max="12" required />
              </div>
              <div>
                <label className="form-label-iipm">From Year *</label>
                <input type="number" className="form-control-iipm" value={daForm.fromYear} onChange={e => setDaForm({ ...daForm, fromYear: e.target.value })} placeholder="e.g., 2025" required />
              </div>
              <div>
                <label className="form-label-iipm">To Month *</label>
                <input type="number" className="form-control-iipm" value={daForm.toMonth} onChange={e => setDaForm({ ...daForm, toMonth: e.target.value })} placeholder="1-12" min="1" max="12" required />
              </div>
              <div>
                <label className="form-label-iipm">To Year *</label>
                <input type="number" className="form-control-iipm" value={daForm.toYear} onChange={e => setDaForm({ ...daForm, toYear: e.target.value })} placeholder="e.g., 2025" required />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label className="form-label-iipm">Remarks</label>
                <textarea className="form-control-iipm" rows={2} value={daForm.remarks} onChange={e => setDaForm({ ...daForm, remarks: e.target.value })} placeholder="Optional remarks..." />
              </div>
            </div>
            <div style={{ marginTop: '20px', display: 'flex', gap: '12px' }}>
              <button type="button" className="btn-outline-iipm" onClick={() => setTab('list')}>Cancel</button>
              <button type="submit" className="btn-accent-iipm">Create DA Arrear</button>
            </div>
          </form>
        </div>
      )}

      {/* ===== PROMOTION ARREAR FORM ===== */}
      {tab === 'promo' && (
        <div className="card-iipm" style={{ padding: '24px', maxWidth: '640px' }}>
          <h3 style={{ marginBottom: '20px' }}>Create Promotion Arrear</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.87rem', marginBottom: '24px' }}>
            Arrear = (New Basic − Old Basic) × (Days Worked / Total Days in Month)
          </p>
          <form onSubmit={submitPromo}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <label className="form-label-iipm">Employee *</label>
                <select className="form-control-iipm" value={promoForm.userId} onChange={e => setPromoForm({ ...promoForm, userId: e.target.value })} required>
                  <option value="">Select Employee...</option>
                  {users.map(u => <option key={u.id} value={u.id}>{u.firstName} {u.lastName} ({u.employeeId})</option>)}
                </select>
              </div>
              <div>
                <label className="form-label-iipm">Old Basic Pay (₹) *</label>
                <input type="number" className="form-control-iipm" value={promoForm.oldBasicPay} onChange={e => setPromoForm({ ...promoForm, oldBasicPay: e.target.value })} placeholder="e.g., 44900" required />
              </div>
              <div>
                <label className="form-label-iipm">New Basic Pay (₹) *</label>
                <input type="number" className="form-control-iipm" value={promoForm.newBasicPay} onChange={e => setPromoForm({ ...promoForm, newBasicPay: e.target.value })} placeholder="e.g., 56100" required />
              </div>
              <div>
                <label className="form-label-iipm">Effective Month *</label>
                <input type="number" className="form-control-iipm" value={promoForm.effectiveMonth} onChange={e => setPromoForm({ ...promoForm, effectiveMonth: e.target.value })} placeholder="1-12" min="1" max="12" required />
              </div>
              <div>
                <label className="form-label-iipm">Effective Year *</label>
                <input type="number" className="form-control-iipm" value={promoForm.effectiveYear} onChange={e => setPromoForm({ ...promoForm, effectiveYear: e.target.value })} placeholder="e.g., 2025" required />
              </div>
              <div>
                <label className="form-label-iipm">Days Worked *</label>
                <input type="number" className="form-control-iipm" value={promoForm.daysWorked} onChange={e => setPromoForm({ ...promoForm, daysWorked: e.target.value })} min="1" max="31" required />
              </div>
              <div>
                <label className="form-label-iipm">Total Days in Month *</label>
                <input type="number" className="form-control-iipm" value={promoForm.totalDays} onChange={e => setPromoForm({ ...promoForm, totalDays: e.target.value })} min="28" max="31" required />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label className="form-label-iipm">Remarks</label>
                <textarea className="form-control-iipm" rows={2} value={promoForm.remarks} onChange={e => setPromoForm({ ...promoForm, remarks: e.target.value })} placeholder="Optional remarks..." />
              </div>
            </div>
            <div style={{ marginTop: '20px', display: 'flex', gap: '12px' }}>
              <button type="button" className="btn-outline-iipm" onClick={() => setTab('list')}>Cancel</button>
              <button type="submit" className="btn-accent-iipm">Create Promotion Arrear</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default ArrearsPage;
