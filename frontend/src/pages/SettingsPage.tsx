import React, { useState, useEffect } from 'react';
import apiService from '../services/api';

const settingsMeta: Record<string, { label: string; desc: string; unit: string }> = {
  DA_PERCENTAGE:           { label: 'DA Percentage',             desc: 'Dearness Allowance % of Basic Pay',           unit: '%' },
  HRA_PERCENTAGE:          { label: 'HRA Percentage',            desc: 'House Rent Allowance % of Basic Pay',         unit: '%' },
  NPS_EMPLOYEE_PERCENTAGE: { label: 'NPS Employee %',            desc: 'NPS contribution by employee on (Basic+DA)',  unit: '%' },
  NPS_EMPLOYER_PERCENTAGE: { label: 'NPS Employer %',            desc: 'NPS contribution by employer on (Basic+DA)',  unit: '%' },
  PT_AMOUNT:               { label: 'Professional Tax',          desc: 'Fixed monthly professional tax amount',       unit: '₹' },
  CGHS_AMOUNT:             { label: 'CGHS Amount',               desc: 'Central Govt Health Scheme monthly deduction',unit: '₹' },
  TA_LOWER_BASE:           { label: 'TA Base (Level 1-9)',        desc: '7th CPC TA base for Pay Level 1 to 9',       unit: '₹' },
  TA_HIGHER_BASE:          { label: 'TA Base (Level 10-17)',      desc: '7th CPC TA base for Pay Level 10 to 17',     unit: '₹' },
  TA_DA_PERCENTAGE:        { label: 'TA DA Portion',             desc: 'DA component added to TA base',              unit: '%' },
};

const SettingsPage: React.FC = () => {
  const [settings, setSettings] = useState<any[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => { loadSettings(); }, []);

  const loadSettings = async () => {
    try { setLoading(true); const data = await apiService.getAllSettings(); setSettings(data); }
    catch { setMsg({ type: 'error', text: 'Failed to load settings.' }); }
    finally { setLoading(false); }
  };

  const handleSave = async (key: string) => {
    try {
      await apiService.updateSetting(key, editingValue);
      setMsg({ type: 'success', text: `✓ ${settingsMeta[key]?.label || key} updated successfully.` });
      setEditingId(null);
      loadSettings();
    } catch (e: any) {
      setMsg({ type: 'error', text: e.response?.data?.message || 'Error saving setting.' });
    }
  };

  // Computed preview
  const getPreview = () => {
    const get = (key: string, def: number) => {
      const s = settings.find(s => s.key === key);
      return s ? parseFloat(s.value) : def;
    };
    const basicPay = 56100;
    const da = get('DA_PERCENTAGE', 53); const hra = get('HRA_PERCENTAGE', 20);
    const taBase = get('TA_HIGHER_BASE', 3600);
    const npsEmp = get('NPS_EMPLOYEE_PERCENTAGE', 10);
    const npsEmpr = get('NPS_EMPLOYER_PERCENTAGE', 14);
    const pt = get('PT_AMOUNT', 200); const cghs = get('CGHS_AMOUNT', 650);

    const daAmt = basicPay * da / 100;
    const hraAmt = basicPay * hra / 100;
    const taAmt = taBase * (1 + da / 100);
    const gross = basicPay + daAmt + hraAmt + taAmt;
    const npsEmpAmt = (basicPay + daAmt) * npsEmp / 100;
    const npsEmprAmt = (basicPay + daAmt) * npsEmpr / 100;
    const net = gross - npsEmpAmt - pt - cghs;

    const fmt = (n: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
    return { basicPay, daAmt, hraAmt, taAmt, gross, npsEmpAmt, npsEmprAmt, pt, cghs, net, fmt };
  };

  const p = getPreview();

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Payroll Settings</h1>
        <p>Configure DA%, HRA%, NPS%, TA, CGHS, and other payroll parameters</p>
      </div>

      {msg && (
        <div className={`alert-iipm ${msg.type === 'success' ? 'alert-success' : 'alert-danger'}`} style={{ marginBottom: '20px' }}>
          {msg.text}
          <button onClick={() => setMsg(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}>✕</button>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '24px' }}>
        {/* Settings table */}
        <div className="card-iipm" style={{ padding: 0 }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', fontWeight: 600 }}>
            Payroll Configuration Parameters
          </div>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Loading...</div>
          ) : (
            <table className="table-iipm">
              <thead>
                <tr><th>Parameter</th><th>Description</th><th>Current Value</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {settings.map(s => {
                  const meta = settingsMeta[s.key] || { label: s.key, desc: s.description || '', unit: '' };
                  return (
                    <tr key={s.id}>
                      <td>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{meta.label}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{s.key}</div>
                      </td>
                      <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{meta.desc}</td>
                      <td>
                        {editingId === s.id ? (
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <input className="form-control-iipm" value={editingValue}
                              onChange={e => setEditingValue(e.target.value)}
                              style={{ width: '100px' }} type="number" step="0.01" autoFocus />
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{meta.unit}</span>
                          </div>
                        ) : (
                          <span style={{ fontWeight: 700, color: 'var(--accent)', fontSize: '1.05rem' }}>
                            {meta.unit === '₹' ? `₹${parseFloat(s.value).toLocaleString('en-IN')}` : `${s.value}${meta.unit}`}
                          </span>
                        )}
                      </td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        {editingId === s.id ? (
                          <>
                            <button onClick={() => handleSave(s.key)} style={{ padding: '4px 12px', borderRadius: '6px', border: 'none', background: 'rgba(34,197,94,0.15)', color: '#22c55e', cursor: 'pointer', marginRight: '6px', fontSize: '0.82rem', fontWeight: 600, fontFamily: 'var(--font)' }}>Save</button>
                            <button onClick={() => setEditingId(null)} style={{ padding: '4px 10px', borderRadius: '6px', border: 'none', background: 'var(--bg-hover)', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.82rem', fontFamily: 'var(--font)' }}>Cancel</button>
                          </>
                        ) : (
                          <button onClick={() => { setEditingId(s.id); setEditingValue(s.value); }} style={{ padding: '4px 12px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-hover)', color: 'var(--text-primary)', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600, fontFamily: 'var(--font)' }}>Edit</button>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {settings.length === 0 && (
                  <tr><td colSpan={4} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>No settings found. Backend may be initializing...</td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* Preview panel */}
        <div>
          <div className="card-iipm" style={{ padding: '20px' }}>
            <div style={{ fontWeight: 600, marginBottom: '16px', color: 'var(--accent)' }}>📊 Salary Preview</div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
              Example: Level 10 employee with Basic Pay ₹56,100 (index 1)
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {[
                { label: 'Basic Pay', value: p.fmt(p.basicPay), type: 'earn' },
                { label: `DA (${settings.find(s=>s.key==='DA_PERCENTAGE')?.value||'53'}%)`, value: p.fmt(p.daAmt), type: 'earn' },
                { label: `HRA (${settings.find(s=>s.key==='HRA_PERCENTAGE')?.value||'20'}%)`, value: p.fmt(p.hraAmt), type: 'earn' },
                { label: 'Transport Allowance', value: p.fmt(p.taAmt), type: 'earn' },
                { label: '──── GROSS ────', value: p.fmt(p.gross), type: 'gross' },
                { label: 'NPS Employee', value: p.fmt(p.npsEmpAmt), type: 'ded' },
                { label: 'NPS Employer', value: p.fmt(p.npsEmprAmt), type: 'info' },
                { label: 'Professional Tax', value: p.fmt(p.pt), type: 'ded' },
                { label: 'CGHS', value: p.fmt(p.cghs), type: 'ded' },
                { label: '──── NET ────', value: p.fmt(p.net), type: 'net' },
              ].map((row, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: row.type === 'gross' || row.type === 'net' ? '1px solid var(--border)' : 'none' }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{row.label}</span>
                  <span style={{
                    fontWeight: row.type === 'gross' || row.type === 'net' ? 700 : 500,
                    color: row.type === 'earn' ? 'var(--text-primary)' : row.type === 'gross' ? 'var(--accent)' : row.type === 'net' ? '#22c55e' : row.type === 'ded' ? '#ef4444' : 'var(--text-muted)',
                    fontSize: row.type === 'net' ? '1.1rem' : '0.9rem'
                  }}>{row.value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card-iipm" style={{ padding: '20px', marginTop: '16px' }}>
            <div style={{ fontWeight: 600, marginBottom: '12px', color: 'var(--text-primary)' }}>ℹ️ Quick Reference</div>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: '0.83rem', color: 'var(--text-muted)' }}>
              <li style={{ marginBottom: '8px' }}><strong style={{ color: 'var(--text-secondary)' }}>NPS:</strong> Employee 10% + Employer 14% of (Basic+DA)</li>
              <li style={{ marginBottom: '8px' }}><strong style={{ color: 'var(--text-secondary)' }}>TA L1-9:</strong> ₹1,800 × (1 + DA%) per month</li>
              <li style={{ marginBottom: '8px' }}><strong style={{ color: 'var(--text-secondary)' }}>TA L10-17:</strong> ₹3,600 × (1 + DA%) per month</li>
              <li style={{ marginBottom: '8px' }}><strong style={{ color: 'var(--text-secondary)' }}>DA:</strong> % of Basic Pay (revised quarterly by GoI)</li>
              <li><strong style={{ color: 'var(--text-secondary)' }}>CGHS:</strong> Fixed amount per month</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Info banner */}
      <div style={{ marginTop: '20px', padding: '14px 18px', background: 'rgba(59,130,246,0.08)', borderRadius: '10px', border: '1px solid rgba(59,130,246,0.2)', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
        <strong>⚠ Note:</strong> All changes take effect immediately for future payroll calculations. Existing locked payrolls are not affected.
      </div>
    </div>
  );
};

export default SettingsPage;
