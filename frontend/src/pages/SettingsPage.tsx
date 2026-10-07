import React, { useState, useEffect, useContext } from 'react';
import apiService from '../services/api';
import { UserContext } from '../App';
import { Edit2, Save, X, FileText, Sliders, Building, UserCheck, Calendar, CheckCircle2, ShieldAlert } from 'lucide-react';

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
  const userCtx = useContext(UserContext);
  const userRole = (userCtx?.role || apiService.getRole() || '') as string;
  const isFaRoleOnly = userRole === 'FA_OPERATOR' || userRole === 'FA_ADMIN';

  const [activeTab, setActiveTab] = useState<'payroll' | 'form16'>(isFaRoleOnly ? 'form16' : 'payroll');
  const [settings, setSettings] = useState<any[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [savingForm16, setSavingForm16] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Local state for Form 16 form fields for convenient batch saving
  const [form16Values, setForm16Values] = useState<Record<string, string>>({
    FORM16_EMPLOYER_NAME: 'INDIAN INSTITUTE OF PETROLEUM AND ENERGY',
    FORM16_EMPLOYER_ADDRESS: 'Vangali, Sabbavaram, Anakapalle – 531035, Andhra Pradesh, India',
    FORM16_EMPLOYER_PAN: 'AABAI0046C',
    FORM16_EMPLOYER_TAN: 'VPNI00723C',
    FORM16_EMPLOYER_EMAIL: 'dr.finance@iipe.ac.in',
    FORM16_CIT_TDS: 'The Commissioner of Income Tax (TDS)\nHyderabad - 500004',
    FORM16_CERTIFICATE_NO: '',
    
    // FY 2026-27 Statutory Overrides
    FORM16_FORM_NO_2627: 'FORM NO. 130',
    FORM16_RULE_2627: '[See rule 31(1)(a)]',
    FORM16_CERT_TEXT_2627: 'Certificate under section 203 of the Income-tax Act, 2025 for tax deducted at source on salary paid to an employee under section 192 or pension/interest income of specified senior citizen under section 194P',
    FORM16_TAX_YEAR_LABEL_2627: 'Tax Year',

    // Signatory
    FORM16_SIGNATORY_NAME: '',
    FORM16_SIGNATORY_FATHER_NAME: '',
    FORM16_SIGNATORY_DESIGNATION: '',
    FORM16_PLACE: 'Visakhapatnam',

    // Q1 - Q4 Receipts, BSR Codes, Deposit Dates, Serial Numbers
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
      setMsg({ type: 'success', text: '✓ Form 16 / 130 configuration updated successfully! All generated Form 16 / 130 documents will use these updated values.' });
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
          <h1>{isFaRoleOnly ? 'Update Form 16 / 130 Details' : 'System Settings & Configuration'}</h1>
          <p>{isFaRoleOnly ? 'Configure Bank BSR codes, Challan deposit dates, and official Form 16 parameters' : 'Configure DA, HRA, NPS, Tax rules, and Form 16 Statutory parameters'}</p>
        </div>
        
        {/* Navigation Tabs */}
        {!isFaRoleOnly && (
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
                color: activeTab === 'payroll' ? '#fff' : 'var(--text-secondary)'
              }}
            >
              <Sliders size={16} /> Payroll & Allowances
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
                color: activeTab === 'form16' ? '#fff' : 'var(--text-secondary)'
              }}
            >
              <FileText size={16} /> Form 16 / 130 Statutory Settings
            </button>
          </div>
        )}
      </div>

      {msg && (
        <div style={{
          padding: '12px 18px',
          borderRadius: '8px',
          marginBottom: '20px',
          background: msg.type === 'success' ? '#f0fdf4' : '#fef2f2',
          border: `1px solid ${msg.type === 'success' ? '#86efac' : '#fca5a5'}`,
          color: msg.type === 'success' ? '#166534' : '#991b1b',
          fontSize: '0.9rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span>{msg.text}</span>
          <button onClick={() => setMsg(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}>✕</button>
        </div>
      )}

      {activeTab === 'payroll' && !isFaRoleOnly ? (
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
          {/* Settings list */}
          <div className="card-iipm">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 600, margin: 0, color: 'var(--text-primary)' }}>
                Active Payroll Rules & Rates
              </h2>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{payrollSettings.length} rules active</span>
            </div>

            {loading ? (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading settings...</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {payrollSettings.map(s => {
                  const meta = settingsMeta[s.key] || { label: s.key, desc: s.description || '', unit: '' };
                  const isEditing = editingId === s.key;

                  return (
                    <div
                      key={s.key}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '12px 16px',
                        borderRadius: '8px',
                        border: '1px solid var(--border)',
                        background: isEditing ? 'rgba(201,168,76,0.05)' : 'var(--card-bg)',
                        transition: '0.15s'
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>{meta.label}</div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>{meta.desc}</div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {isEditing ? (
                          <>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <input
                                type="number"
                                step="any"
                                value={editingValue}
                                onChange={e => setEditingValue(e.target.value)}
                                className="form-control-iipm"
                                style={{ width: '90px', padding: '4px 8px', fontSize: '0.9rem', textAlign: 'right' }}
                                autoFocus
                              />
                              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{meta.unit}</span>
                            </div>
                            <button
                              onClick={() => handleSave(s.key)}
                              className="btn-iipm btn-primary"
                              style={{ padding: '6px 12px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                            >
                              <Save size={14} /> Save
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="btn-iipm btn-secondary"
                              style={{ padding: '6px 8px', fontSize: '0.8rem' }}
                            >
                              <X size={14} />
                            </button>
                          </>
                        ) : (
                          <>
                            <span style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--accent)', minWidth: '60px', textAlign: 'right' }}>
                              {s.value} {meta.unit}
                            </span>
                            <button
                              onClick={() => { setEditingId(s.key); setEditingValue(s.value); }}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '6px', borderRadius: '4px', color: 'var(--text-muted)' }}
                              title="Edit value"
                            >
                              <Edit2 size={16} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Real-time Payroll Simulation Preview */}
          <div>
            <div className="card-iipm" style={{ padding: '20px', background: 'linear-gradient(135deg, rgba(10,49,97,0.04), rgba(201,168,76,0.06))' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <FileText size={18} color="var(--accent)" />
                <h3 style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-primary)' }}>Live Calculation Preview</h3>
              </div>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '12px' }}>
                Simulated calculation for an Assistant Professor (Level-10, Basic: ₹56,100) using active settings:
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {[
                  { label: 'Basic Pay', value: p.fmt(p.basicPay), type: 'earn' },
                  { label: `DA (${settings.find(s=>s.key==='DA_PERCENTAGE')?.value || 53}%)`, value: p.fmt(p.daAmt), type: 'earn' },
                  { label: `HRA (${settings.find(s=>s.key==='HRA_PERCENTAGE')?.value || 20}%)`, value: p.fmt(p.hraAmt), type: 'earn' },
                  { label: 'Transport Allowance', value: p.fmt(p.taAmt), type: 'earn' },
                  { label: '──── GROSS ────', value: p.fmt(p.gross), type: 'gross' },
                  { label: 'NPS Employee (10%)', value: p.fmt(p.npsEmpAmt), type: 'ded' },
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
        /* Form 16 / 130 Configuration Tab */
        <form onSubmit={handleSaveForm16}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            
            {/* Section 1: Employer & Statutory Identifiers */}
            <div className="card-iipm" style={{ padding: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
                <Building size={20} color="var(--accent)" />
                <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-primary)' }}>1. Employer & Institute Details</h3>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label className="form-label-iipm" style={{ fontWeight: 600, fontSize: '0.85rem' }}>Employer / Institution Name</label>
                  <input
                    type="text"
                    className="form-control-iipm"
                    value={form16Values.FORM16_EMPLOYER_NAME || ''}
                    onChange={e => setForm16Values({ ...form16Values, FORM16_EMPLOYER_NAME: e.target.value })}
                    placeholder="INDIAN INSTITUTE OF PETROLEUM AND ENERGY"
                    required
                  />
                </div>

                <div>
                  <label className="form-label-iipm" style={{ fontWeight: 600, fontSize: '0.85rem' }}>Official Address (Printed on Part A)</label>
                  <textarea
                    className="form-control-iipm"
                    rows={2}
                    value={form16Values.FORM16_EMPLOYER_ADDRESS || ''}
                    onChange={e => setForm16Values({ ...form16Values, FORM16_EMPLOYER_ADDRESS: e.target.value })}
                    placeholder="Vangali, Sabbavaram, Anakapalle – 531035, Andhra Pradesh, India"
                    required
                  />
                  <small style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Matches the official address printed on official payslips.</small>
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

                <div>
                  <label className="form-label-iipm" style={{ fontWeight: 600, fontSize: '0.85rem' }}>Finance / Employer Email</label>
                  <input
                    type="email"
                    className="form-control-iipm"
                    value={form16Values.FORM16_EMPLOYER_EMAIL || ''}
                    onChange={e => setForm16Values({ ...form16Values, FORM16_EMPLOYER_EMAIL: e.target.value })}
                    placeholder="dr.finance@iipe.ac.in"
                  />
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

            {/* Section 2: Statutory Rules & Act Configuration (FY 2026-27) */}
            <div className="card-iipm" style={{ padding: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
                <ShieldAlert size={20} color="var(--accent)" />
                <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-primary)' }}>2. Statutory Form & Act Rules (FY 2026-27)</h3>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label className="form-label-iipm" style={{ fontWeight: 600, fontSize: '0.85rem' }}>Form Number (FY 2026-27)</label>
                    <input
                      type="text"
                      className="form-control-iipm"
                      value={form16Values.FORM16_FORM_NO_2627 || ''}
                      onChange={e => setForm16Values({ ...form16Values, FORM16_FORM_NO_2627: e.target.value })}
                      placeholder="FORM NO. 130"
                    />
                  </div>
                  <div>
                    <label className="form-label-iipm" style={{ fontWeight: 600, fontSize: '0.85rem' }}>Rule Title (FY 2026-27)</label>
                    <input
                      type="text"
                      className="form-control-iipm"
                      value={form16Values.FORM16_RULE_2627 || ''}
                      onChange={e => setForm16Values({ ...form16Values, FORM16_RULE_2627: e.target.value })}
                      placeholder="[See rule 31(1)(a)]"
                    />
                  </div>
                </div>

                <div>
                  <label className="form-label-iipm" style={{ fontWeight: 600, fontSize: '0.85rem' }}>Certificate Section Text (FY 2026-27)</label>
                  <textarea
                    className="form-control-iipm"
                    rows={3}
                    value={form16Values.FORM16_CERT_TEXT_2627 || ''}
                    onChange={e => setForm16Values({ ...form16Values, FORM16_CERT_TEXT_2627: e.target.value })}
                    placeholder="Certificate under section 203 of the Income-tax Act, 2025 for tax deducted at source..."
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label className="form-label-iipm" style={{ fontWeight: 600, fontSize: '0.85rem' }}>Tax Year Header Label</label>
                    <input
                      type="text"
                      className="form-control-iipm"
                      value={form16Values.FORM16_TAX_YEAR_LABEL_2627 || ''}
                      onChange={e => setForm16Values({ ...form16Values, FORM16_TAX_YEAR_LABEL_2627: e.target.value })}
                      placeholder="Tax Year"
                    />
                  </div>
                  <div>
                    <label className="form-label-iipm" style={{ fontWeight: 600, fontSize: '0.85rem' }}>Place of Signing</label>
                    <input
                      type="text"
                      className="form-control-iipm"
                      value={form16Values.FORM16_PLACE || ''}
                      onChange={e => setForm16Values({ ...form16Values, FORM16_PLACE: e.target.value })}
                      placeholder="Visakhapatnam"
                    />
                  </div>
                </div>

                <div>
                  <label className="form-label-iipm" style={{ fontWeight: 600, fontSize: '0.85rem' }}>Signatory Name & Designation (Optional)</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <input
                      type="text"
                      className="form-control-iipm"
                      value={form16Values.FORM16_SIGNATORY_NAME || ''}
                      onChange={e => setForm16Values({ ...form16Values, FORM16_SIGNATORY_NAME: e.target.value })}
                      placeholder="Signatory Name"
                    />
                    <input
                      type="text"
                      className="form-control-iipm"
                      value={form16Values.FORM16_SIGNATORY_DESIGNATION || ''}
                      onChange={e => setForm16Values({ ...form16Values, FORM16_SIGNATORY_DESIGNATION: e.target.value })}
                      placeholder="e.g. Registrar / DDO"
                    />
                  </div>
                  <small style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Leave blank for a clean physical signature line.</small>
                </div>
              </div>
            </div>

          </div>

          {/* Section 3: Quarterly Receipt Numbers & Challan Details (Q1 - Q4) */}
          <div className="card-iipm" style={{ padding: '24px', marginTop: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
              <Calendar size={20} color="var(--accent)" />
              <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-primary)' }}>3. Quarterly Statement Receipt Numbers & Bank Challan Identifiers (Q1 - Q4)</h3>
            </div>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '-8px', marginBottom: '16px' }}>
              Configure the quarterly e-TDS return 24Q receipt numbers, Bank BSR Codes, and Challan deposit dates. Fields left blank will show as a clean hyphen (-) when downloaded.
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
                        placeholder="e.g. 07-07-2026"
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
                    <Save size={18} /> Save Form 16 / 130 Configuration
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
        <span><strong>Live Dynamic Synchronization:</strong> Any updates made to BSR Codes, Deposit Dates, Form Numbers, or Signatories are saved immediately and reflected when Form 16 / 130 is downloaded for any employee.</span>
      </div>
    </div>
  );
};

export default SettingsPage;
