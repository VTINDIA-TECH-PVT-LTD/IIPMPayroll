import React, { useState, useEffect } from 'react';
import apiService from '../services/api';
import { Edit2, Save, X, FileText, Sliders, Building, UserCheck, Calendar, CheckCircle2 } from 'lucide-react';

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
  const [activeTab, setActiveTab] = useState<'payroll' | 'form16'>('payroll');
  const [settings, setSettings] = useState<any[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [savingForm16, setSavingForm16] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Local state for Form 16 form fields for convenient batch saving
  const [form16Values, setForm16Values] = useState<Record<string, string>>({
    FORM16_EMPLOYER_NAME: '',
    FORM16_EMPLOYER_ADDRESS: '',
    FORM16_EMPLOYER_PAN: '',
    FORM16_EMPLOYER_TAN: '',
    FORM16_EMPLOYER_EMAIL: '',
    FORM16_CIT_TDS: '',
    FORM16_CERTIFICATE_NO: '',
    FORM16_SIGNATORY_NAME: '',
    FORM16_SIGNATORY_FATHER_NAME: '',
    FORM16_SIGNATORY_DESIGNATION: '',
    FORM16_PLACE: '',
    FORM16_Q1_RECEIPT: '',
    FORM16_Q1_BSR: '',
    FORM16_Q1_CHALLAN_DATE: '',
    FORM16_Q1_CHALLAN_SERIAL: '',
    FORM16_Q2_RECEIPT: '',
    FORM16_Q2_BSR: '',
    FORM16_Q2_CHALLAN_DATE: '',
    FORM16_Q2_CHALLAN_SERIAL: '',
    FORM16_Q3_RECEIPT: '',
    FORM16_Q3_BSR: '',
    FORM16_Q3_CHALLAN_DATE: '',
    FORM16_Q3_CHALLAN_SERIAL: '',
    FORM16_Q4_RECEIPT: '',
    FORM16_Q4_BSR: '',
    FORM16_Q4_CHALLAN_DATE: '',
    FORM16_Q4_CHALLAN_SERIAL: '',
  });

  useEffect(() => { loadSettings(); }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const data = await apiService.getAllSettings();
      setSettings(data);

      // Populate Form 16 state
      const f16Map: Record<string, string> = {};
      data.forEach((s: any) => {
        if (s.key && s.key.startsWith('FORM16_')) {
          f16Map[s.key] = s.value || '';
        }
      });
      setForm16Values(prev => ({ ...prev, ...f16Map }));
    } catch {
      setMsg({ type: 'error', text: 'Failed to load settings.' });
    } finally {
      setLoading(false);
    }
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

  const handleSaveForm16 = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingForm16(true);
    try {
      const keysToSave = Object.keys(form16Values);
      for (const key of keysToSave) {
        await apiService.updateSetting(key, form16Values[key] || '');
      }
      setMsg({ type: 'success', text: '✓ Form 16 configuration updated successfully! All generated Form 16 documents will use these updated values.' });
      loadSettings();
    } catch (e: any) {
      setMsg({ type: 'error', text: e.response?.data?.message || 'Error saving Form 16 configuration.' });
    } finally {
      setSavingForm16(false);
    }
  };

  // Computed preview for Payroll
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
  const payrollSettings = settings.filter(s => !s.key.startsWith('FORM16_'));

  return (
    <div className="page-container">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1>System Settings & Configuration</h1>
          <p>Configure DA, HRA, NPS, Tax rules, and Form 16 Statutory parameters</p>
        </div>
        
        {/* Navigation Tabs */}
        <div style={{ display: 'flex', background: '#f1f5f9', padding: '4px', borderRadius: '10px', gap: '4px' }}>
          <button
            type="button"
            onClick={() => setActiveTab('payroll')}
            style={{
              padding: '8px 18px',
              borderRadius: '8px',
              border: 'none',
              fontWeight: 600,
              fontSize: '0.9rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: '0.2s',
              background: activeTab === 'payroll' ? 'var(--primary)' : 'transparent',
              color: activeTab === 'payroll' ? '#ffffff' : '#64748b',
              boxShadow: activeTab === 'payroll' ? '0 2px 8px rgba(0,0,0,0.15)' : 'none'
            }}
          >
            <Sliders size={16} /> Payroll Settings
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('form16')}
            style={{
              padding: '8px 18px',
              borderRadius: '8px',
              border: 'none',
              fontWeight: 600,
              fontSize: '0.9rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: '0.2s',
              background: activeTab === 'form16' ? 'var(--primary)' : 'transparent',
              color: activeTab === 'form16' ? '#ffffff' : '#64748b',
              boxShadow: activeTab === 'form16' ? '0 2px 8px rgba(0,0,0,0.15)' : 'none'
            }}
          >
            <FileText size={16} /> Form 16 Configuration
          </button>
        </div>
      </div>

      {msg && (
        <div className={`alert-iipm ${msg.type === 'success' ? 'alert-success' : 'alert-danger'}`} style={{ marginBottom: '20px' }}>
          {msg.text}
          <button onClick={() => setMsg(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}>✕</button>
        </div>
      )}

      {activeTab === 'payroll' ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '24px' }}>
          {/* Settings table */}
          <div className="card-iipm" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', background: '#f8fafc', borderBottom: '1px solid var(--border)', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Payroll Configuration Parameters</span>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 400 }}>Auto-applied to monthly payroll generation</span>
            </div>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Loading...</div>
            ) : (
              <table className="table-iipm">
                <thead>
                  <tr><th>Parameter</th><th>Description</th><th>Current Value</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {payrollSettings.map(s => {
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
                        <td style={{ whiteSpace: 'nowrap', display: 'flex', gap: '6px' }}>
                          {editingId === s.id ? (
                            <>
                              <button 
                                onClick={() => handleSave(s.key)} 
                                title="Save"
                                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', borderRadius: '8px', border: 'none', background: '#22c55e', color: '#ffffff', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 2px 4px rgba(34, 197, 94, 0.3)' }}
                                onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 6px rgba(34, 197, 94, 0.4)'; }}
                                onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 4px rgba(34, 197, 94, 0.3)'; }}
                              >
                                <Save size={16} />
                              </button>
                              <button 
                                onClick={() => setEditingId(null)} 
                                title="Cancel"
                                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#f8fafc', color: '#64748b', cursor: 'pointer', transition: 'all 0.2s' }}
                                onMouseOver={(e) => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.color = '#334155'; }}
                                onMouseOut={(e) => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.color = '#64748b'; }}
                              >
                                <X size={16} />
                              </button>
                            </>
                          ) : (
                            <button 
                              onClick={() => { setEditingId(s.id); setEditingValue(s.value); }} 
                              title="Edit"
                              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', borderRadius: '8px', border: 'none', background: '#3b82f6', color: '#ffffff', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 2px 4px rgba(59, 130, 246, 0.3)' }}
                              onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 6px rgba(59, 130, 246, 0.4)'; }}
                              onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 4px rgba(59, 130, 246, 0.3)'; }}
                            >
                              <Edit2 size={16} />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {payrollSettings.length === 0 && (
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
      ) : (
        /* Form 16 Configuration Tab */
        <form onSubmit={handleSaveForm16}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            
            {/* Section 1: Employer & Statutory Identifiers */}
            <div className="card-iipm" style={{ padding: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
                <Building size={20} color="var(--accent)" />
                <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-primary)' }}>1. Employer & Statutory Information</h3>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label className="form-label-iipm" style={{ fontWeight: 600, fontSize: '0.85rem' }}>Employer / Institution Name</label>
                  <input
                    type="text"
                    className="form-control-iipm"
                    value={form16Values.FORM16_EMPLOYER_NAME || ''}
                    onChange={e => setForm16Values({ ...form16Values, FORM16_EMPLOYER_NAME: e.target.value })}
                    placeholder="INDIAN INSTITUTE OF PETROLEUM & ENERGY"
                    required
                  />
                </div>

                <div>
                  <label className="form-label-iipm" style={{ fontWeight: 600, fontSize: '0.85rem' }}>Employer Address (Printed on Part A)</label>
                  <textarea
                    className="form-control-iipm"
                    rows={3}
                    value={form16Values.FORM16_EMPLOYER_ADDRESS || ''}
                    onChange={e => setForm16Values({ ...form16Values, FORM16_EMPLOYER_ADDRESS: e.target.value })}
                    placeholder="Tech-Horizon Building, Andhra University Campus, Visakhapatnam - 530003, Andhra Pradesh, India"
                    required
                  />
                  <small style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Enter the complete official campus/office address for Form 16 header.</small>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label className="form-label-iipm" style={{ fontWeight: 600, fontSize: '0.85rem' }}>PAN of Deductor</label>
                    <input
                      type="text"
                      className="form-control-iipm"
                      value={form16Values.FORM16_EMPLOYER_PAN || ''}
                      onChange={e => setForm16Values({ ...form16Values, FORM16_EMPLOYER_PAN: e.target.value.toUpperCase() })}
                      placeholder="AABAI0046C"
                    />
                  </div>
                  <div>
                    <label className="form-label-iipm" style={{ fontWeight: 600, fontSize: '0.85rem' }}>TAN of Deductor</label>
                    <input
                      type="text"
                      className="form-control-iipm"
                      value={form16Values.FORM16_EMPLOYER_TAN || ''}
                      onChange={e => setForm16Values({ ...form16Values, FORM16_EMPLOYER_TAN: e.target.value.toUpperCase() })}
                      placeholder="VPNI00723C"
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label className="form-label-iipm" style={{ fontWeight: 600, fontSize: '0.85rem' }}>Employer Contact Email</label>
                    <input
                      type="email"
                      className="form-control-iipm"
                      value={form16Values.FORM16_EMPLOYER_EMAIL || ''}
                      onChange={e => setForm16Values({ ...form16Values, FORM16_EMPLOYER_EMAIL: e.target.value })}
                      placeholder="fo@iipe.ac.in"
                    />
                  </div>
                  <div>
                    <label className="form-label-iipm" style={{ fontWeight: 600, fontSize: '0.85rem' }}>Certificate Number Prefix</label>
                    <input
                      type="text"
                      className="form-control-iipm"
                      value={form16Values.FORM16_CERTIFICATE_NO || ''}
                      onChange={e => setForm16Values({ ...form16Values, FORM16_CERTIFICATE_NO: e.target.value })}
                      placeholder="ACORZOA"
                    />
                  </div>
                </div>

                <div>
                  <label className="form-label-iipm" style={{ fontWeight: 600, fontSize: '0.85rem' }}>CIT (TDS) Office</label>
                  <input
                    type="text"
                    className="form-control-iipm"
                    value={form16Values.FORM16_CIT_TDS || ''}
                    onChange={e => setForm16Values({ ...form16Values, FORM16_CIT_TDS: e.target.value })}
                    placeholder="The Commissioner of Income Tax (TDS), Hyderabad - 500004"
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Authorised Signatory & Place */}
            <div className="card-iipm" style={{ padding: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
                <UserCheck size={20} color="var(--accent)" />
                <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-primary)' }}>2. Authorised Signatory & Verification</h3>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label className="form-label-iipm" style={{ fontWeight: 600, fontSize: '0.85rem' }}>Signatory Full Name</label>
                  <input
                    type="text"
                    className="form-control-iipm"
                    value={form16Values.FORM16_SIGNATORY_NAME || ''}
                    onChange={e => setForm16Values({ ...form16Values, FORM16_SIGNATORY_NAME: e.target.value })}
                    placeholder="Dr. Ram Phal Dwivedi"
                    required
                  />
                  <small style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Printed in Part B Verification certificate and under signature block.</small>
                </div>

                <div>
                  <label className="form-label-iipm" style={{ fontWeight: 600, fontSize: '0.85rem' }}>Signatory Father's Name (Optional)</label>
                  <input
                    type="text"
                    className="form-control-iipm"
                    value={form16Values.FORM16_SIGNATORY_FATHER_NAME || ''}
                    onChange={e => setForm16Values({ ...form16Values, FORM16_SIGNATORY_FATHER_NAME: e.target.value })}
                    placeholder="Father's full name (leave blank if not applicable)"
                  />
                </div>

                <div>
                  <label className="form-label-iipm" style={{ fontWeight: 600, fontSize: '0.85rem' }}>Signatory Capacity / Designation</label>
                  <input
                    type="text"
                    className="form-control-iipm"
                    value={form16Values.FORM16_SIGNATORY_DESIGNATION || ''}
                    onChange={e => setForm16Values({ ...form16Values, FORM16_SIGNATORY_DESIGNATION: e.target.value })}
                    placeholder="Registrar / Authorised Signatory"
                    required
                  />
                </div>

                <div>
                  <label className="form-label-iipm" style={{ fontWeight: 600, fontSize: '0.85rem' }}>Place of Issue / Signing</label>
                  <input
                    type="text"
                    className="form-control-iipm"
                    value={form16Values.FORM16_PLACE || ''}
                    onChange={e => setForm16Values({ ...form16Values, FORM16_PLACE: e.target.value })}
                    placeholder="Visakhapatnam"
                    required
                  />
                </div>

                <div style={{ marginTop: '10px', padding: '12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>Verification Certificate Preview:</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontStyle: 'italic', lineHeight: '1.4' }}>
                    "I, <strong>{form16Values.FORM16_SIGNATORY_NAME || '[Signatory Name]'}</strong>
                    {form16Values.FORM16_SIGNATORY_FATHER_NAME ? `, son/daughter of ${form16Values.FORM16_SIGNATORY_FATHER_NAME}` : ''} working in the capacity of <strong>{form16Values.FORM16_SIGNATORY_DESIGNATION || 'Authorised Signatory'}</strong> do hereby certify..."
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* Section 3: Quarterly Receipt Numbers & Challan Details (Q1 - Q4) */}
          <div className="card-iipm" style={{ padding: '24px', marginTop: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
              <Calendar size={20} color="var(--accent)" />
              <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-primary)' }}>3. Quarterly Statement Receipt Numbers & Challan Identifiers (Q1 - Q4)</h3>
            </div>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '-8px', marginBottom: '16px' }}>
              Configure the quarterly e-TDS return 24Q receipt numbers and Bank Challan details. Fields left blank will show as a clean hyphen (-) or dynamic placeholder on Form 16.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
              {[
                { q: 'Q1', title: 'Quarter 1 (Apr - Jun)', rKey: 'FORM16_Q1_RECEIPT', bKey: 'FORM16_Q1_BSR', dKey: 'FORM16_Q1_CHALLAN_DATE', sKey: 'FORM16_Q1_CHALLAN_SERIAL' },
                { q: 'Q2', title: 'Quarter 2 (Jul - Sep)', rKey: 'FORM16_Q2_RECEIPT', bKey: 'FORM16_Q2_BSR', dKey: 'FORM16_Q2_CHALLAN_DATE', sKey: 'FORM16_Q2_CHALLAN_SERIAL' },
                { q: 'Q3', title: 'Quarter 3 (Oct - Dec)', rKey: 'FORM16_Q3_RECEIPT', bKey: 'FORM16_Q3_BSR', dKey: 'FORM16_Q3_CHALLAN_DATE', sKey: 'FORM16_Q3_CHALLAN_SERIAL' },
                { q: 'Q4', title: 'Quarter 4 (Jan - Mar)', rKey: 'FORM16_Q4_RECEIPT', bKey: 'FORM16_Q4_BSR', dKey: 'FORM16_Q4_CHALLAN_DATE', sKey: 'FORM16_Q4_CHALLAN_SERIAL' },
              ].map(item => (
                <div key={item.q} style={{ background: '#f8fafc', padding: '16px', borderRadius: '10px', border: '1px solid var(--border)' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--primary)', marginBottom: '12px', borderBottom: '1px solid var(--border)', paddingBottom: '6px' }}>
                    {item.title}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '3px' }}>24Q Receipt Number</label>
                      <input
                        type="text"
                        className="form-control-iipm"
                        style={{ fontSize: '0.8rem', padding: '6px 8px' }}
                        value={form16Values[item.rKey] || ''}
                        onChange={e => setForm16Values({ ...form16Values, [item.rKey]: e.target.value })}
                        placeholder="e.g. FXDPPTAA"
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '3px' }}>Bank BSR Code (7 Digits)</label>
                      <input
                        type="text"
                        className="form-control-iipm"
                        style={{ fontSize: '0.8rem', padding: '6px 8px' }}
                        value={form16Values[item.bKey] || ''}
                        onChange={e => setForm16Values({ ...form16Values, [item.bKey]: e.target.value })}
                        placeholder="e.g. 0002145"
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '3px' }}>Deposit Date (DD-MM-YYYY)</label>
                      <input
                        type="text"
                        className="form-control-iipm"
                        style={{ fontSize: '0.8rem', padding: '6px 8px' }}
                        value={form16Values[item.dKey] || ''}
                        onChange={e => setForm16Values({ ...form16Values, [item.dKey]: e.target.value })}
                        placeholder="e.g. 07-07-2025"
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '3px' }}>Challan Serial Number</label>
                      <input
                        type="text"
                        className="form-control-iipm"
                        style={{ fontSize: '0.8rem', padding: '6px 8px' }}
                        value={form16Values[item.sKey] || ''}
                        onChange={e => setForm16Values({ ...form16Values, [item.sKey]: e.target.value })}
                        placeholder="e.g. CH-001"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Action Bar */}
            <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end', gap: '12px', alignItems: 'center' }}>
              <button
                type="button"
                onClick={loadSettings}
                className="btn-iipm btn-secondary"
                disabled={savingForm16}
              >
                Reset to Saved
              </button>
              <button
                type="submit"
                className="btn-iipm btn-primary"
                disabled={savingForm16}
                style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 24px', fontSize: '0.95rem' }}
              >
                {savingForm16 ? (
                  <>Saving Changes...</>
                ) : (
                  <>
                    <Save size={18} /> Save Form 16 Configuration
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Info banner */}
      <div style={{ marginTop: '24px', padding: '14px 18px', background: 'rgba(59,130,246,0.08)', borderRadius: '10px', border: '1px solid rgba(59,130,246,0.2)', fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <CheckCircle2 size={18} color="#3b82f6" />
        <span><strong>Live Dynamic Synchronization:</strong> Any changes made to the Employer Address, Signatory details, or Quarterly Challans are saved to the database and immediately reflected across all Form 16 generated for employees and F&A reports.</span>
      </div>
    </div>
  );
};

export default SettingsPage;
