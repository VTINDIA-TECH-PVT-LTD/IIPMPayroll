import React, { useState, useEffect, useContext } from 'react';
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
    if (userCtx?.role === 'ADMIN' || userCtx?.role === 'PAYROLL_OFFICER') loadUsers();
  }, []);

  const loadArrears = async () => {
    try {
      setLoading(true);
      const data = await apiService.getAllArrears();
      setArrears(data);
    } catch { setArrears([]); }
    finally { setLoading(false); }
  };

  const loadUsers = async () => {
    try { const data = await apiService.getAllUsers(); setUsers(data.filter((u: any) => u.isActive)); }
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
        fromMonth: parseInt(daForm.fromMonth), fromYear: parseInt(daForm.fromYear),
        toMonth: parseInt(daForm.toMonth), toYear: parseInt(daForm.toYear),
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
  const statusColor: Record<string, string> = { PENDING: '#f59e0b', APPROVED: '#22c55e', PAID: '#3b82f6', REJECTED: '#ef4444' };

  return (
    <div className="page-container">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div><h1>Arrears Management</h1><p>Process DA revision arrears and promotion arrears</p></div>
      </div>

      {msg && (
        <div className={`alert-iipm ${msg.type === 'success' ? 'alert-success' : 'alert-danger'}`} style={{ marginBottom: '16px' }}>
          {msg.text}
          <button onClick={() => setMsg(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}>✕</button>
        </div>
      )}

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
        <div className="card-iipm" style={{ padding: 0 }}>
          <div style={{ overflowX: 'auto' }}>
            <table className="table-iipm">
              <thead>
                <tr><th>Type</th><th>Employee</th><th>Period</th><th>Amount</th><th>Status</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {arrears.map((a: any) => (
                  <tr key={a.id}>
                    <td><span className={`badge-iipm ${a.type === 'DA' ? 'badge-info' : 'badge-accent'}`}>{a.type || 'DA'}</span></td>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.82rem' }}>{a.userId}</td>
                    <td style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      {a.fromMonth ? `${months[a.fromMonth - 1]} ${a.fromYear} – ${months[(a.toMonth || a.fromMonth) - 1]} ${a.toYear || a.fromYear}` : `${a.effectiveMonth ? months[a.effectiveMonth - 1] : '—'} ${a.effectiveYear || ''}`}
                    </td>
                    <td style={{ fontWeight: 700, color: 'var(--accent)' }}>{fmt(a.totalAmount || a.arrearAmount || 0)}</td>
                    <td>
                      <span style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700, background: `${statusColor[a.status]}20`, color: statusColor[a.status] }}>
                        {a.status}
                      </span>
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      {a.status === 'PENDING' && (
                        <button onClick={() => handleApprove(a.id)} style={{ padding: '4px 10px', borderRadius: '6px', border: 'none', background: 'rgba(34,197,94,0.15)', color: '#22c55e', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, fontFamily: 'var(--font)' }}>Approve</button>
                      )}
                      {a.status === 'APPROVED' && (
                        <button onClick={() => handleMarkPaid(a.id)} style={{ padding: '4px 10px', borderRadius: '6px', border: 'none', background: 'rgba(59,130,246,0.15)', color: '#3b82f6', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, fontFamily: 'var(--font)' }}>Mark Paid</button>
                      )}
                      {a.status === 'PAID' && <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Disbursed</span>}
                    </td>
                  </tr>
                ))}
                {arrears.length === 0 && !loading && (
                  <tr><td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>No arrears found.</td></tr>
                )}
              </tbody>
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
