import React, { useState, useEffect, useContext } from 'react';
import { UserContext } from '../App';
import apiService from '../services/api';
import { CheckCircle, Clock, XCircle, FileText, Send, RotateCcw, Printer, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const ITDeclarationPortal = () => {
  const userCtx = useContext(UserContext);
  const userId = userCtx?.userId;
  const navigate = useNavigate();

  const [declarations, setDeclarations] = useState<any[]>([]);
  const [declaration, setDeclaration] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('ALL');
  const [viewModal, setViewModal] = useState<any>(null);
  const [form, setForm] = useState({
    taxRegime: 'NEW',
    section80C: '',
    section80D: '',
    hraExemption: '',
    homeLoanInterest: '',
    financialYear: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const currentFY = (() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth() + 1;
    return m >= 4 ? `${y}-${y + 1}` : `${y - 1}-${y}`;
  })();

  useEffect(() => {
    if (userId) loadDeclaration();
  }, [userId]);

  const loadDeclaration = async () => {
    try {
      setLoading(true);
      const res = await apiService.getItDeclarations(userId as string);
      if (res && res.length > 0) {
        setDeclarations(res);
        const currentDec = res.find((d: any) => d.financialYear === currentFY);
        if (currentDec && currentDec.id) {
          setDeclaration(currentDec);
          setForm({
            taxRegime: currentDec.taxRegime || 'NEW',
            section80C: currentDec.section80C || '',
            section80D: currentDec.section80D || '',
            hraExemption: currentDec.hraExemption || '',
            homeLoanInterest: currentDec.homeLoanInterest || '',
            financialYear: currentDec.financialYear || currentFY,
          });
        } else {
          setDeclaration(null);
          setForm(f => ({ ...f, financialYear: currentFY }));
        }
      } else {
        setDeclarations([]);
        setDeclaration(null);
        setForm(f => ({ ...f, financialYear: currentFY }));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;
    if (!form.taxRegime) {
      setMessage({ text: 'Please select a Tax Regime (Old or New).', type: 'error' });
      return;
    }
    try {
      setSaving(true);
      const payload: any = {
        userId,
        financialYear: currentFY,
        taxRegime: form.taxRegime,
        section80C: Number(form.section80C) || 0,
        section80D: Number(form.section80D) || 0,
        hraExemption: Number(form.hraExemption) || 0,
        homeLoanInterest: Number(form.homeLoanInterest) || 0,
        status: 'PENDING',
      };
      // If resubmitting after rejection, carry ID
      if (declaration?.id && declaration?.status === 'REJECTED') {
        payload.id = declaration.id;
      }
      await apiService.saveItDeclaration(payload);
      setMessage({ text: 'IT Declaration submitted successfully! Pending FA Operator review.', type: 'success' });
      await loadDeclaration();
    } catch (err) {
      setMessage({ text: 'Error submitting IT Declaration. Please try again.', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const fmt = (n: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);

  const status = declaration?.status;
  const isRejected = status === 'REJECTED';
  const isPending = status === 'PENDING';
  const isApproved = status === 'APPROVED';
  const canEdit = !declaration || isRejected; // can submit/resubmit if never submitted OR rejected
  const isOldRegime = form.taxRegime === 'OLD';

  if (loading) return (
    <div className="page-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
        <div style={{ fontSize: '2rem', marginBottom: '12px' }}>⏳</div>
        <p>Loading IT Declaration...</p>
      </div>
    </div>
  );

  return (
    <div className="page-container" style={{ maxWidth: '760px', margin: '0 auto' }}>
      {/* Page Header */}
      <div style={{ marginBottom: '28px' }}>
        <h2 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-main)' }}>IT Declaration</h2>
        <p style={{ margin: '6px 0 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          Financial Year: <strong>{currentFY}</strong> — Submit your tax regime and deductions for TDS calculation
        </p>
      </div>

      {/* Status Banner */}
      {declaration && (
        <div style={{
          borderRadius: '12px',
          padding: '16px 20px',
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '14px',
          border: `2px solid ${isApproved ? '#22c55e' : isPending ? '#f59e0b' : '#ef4444'}`,
          background: isApproved ? '#f0fdf4' : isPending ? '#fffbeb' : '#fef2f2',
        }}>
          <div style={{ flexShrink: 0, marginTop: '2px' }}>
            {isApproved && <CheckCircle size={22} color="#22c55e" />}
            {isPending && <Clock size={22} color="#f59e0b" />}
            {isRejected && <XCircle size={22} color="#ef4444" />}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: '1rem', color: isApproved ? '#15803d' : isPending ? '#b45309' : '#b91c1c' }}>
              {isApproved && '✅ Declaration Approved'}
              {isPending && '⏳ Pending Review'}
              {isRejected && '❌ Declaration Rejected — Please Resubmit'}
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
              {isApproved && 'Your IT Declaration has been approved by the FA Operator. Your deductions will be applied during payroll processing.'}
              {isPending && 'Your declaration has been submitted and is currently under review by the FA Operator.'}
              {isRejected && (
                <>
                  <span>Reason: </span>
                  <strong style={{ color: '#b91c1c' }}>{declaration.rejectionReason || 'No reason provided'}</strong>
                  <br />
                  <span>Please update your declaration and resubmit below.</span>
                </>
              )}
            </div>
            {isApproved && (
              <div style={{ marginTop: '10px', display: 'flex', gap: '10px' }}>
                <button
                  onClick={() => navigate('/form16')}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '6px',
                    background: '#153C7D', color: '#fff', border: 'none',
                    borderRadius: '8px', padding: '8px 16px', fontWeight: 600,
                    fontSize: '0.85rem', cursor: 'pointer',
                  }}
                >
                  <Printer size={16} /> View & Print Form 16
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Alert message */}
      {message && (
        <div style={{
          borderRadius: '10px',
          padding: '12px 16px',
          marginBottom: '20px',
          background: message.type === 'success' ? '#f0fdf4' : '#fef2f2',
          border: `1px solid ${message.type === 'success' ? '#86efac' : '#fca5a5'}`,
          color: message.type === 'success' ? '#15803d' : '#b91c1c',
          fontWeight: 600, fontSize: '0.9rem',
        }}>
          {message.text}
        </div>
      )}

      {/* Declaration Summary (read-only when pending or approved) */}
      {(isPending || isApproved) && declaration && (
        <div className="card-iipm" style={{ padding: '24px', marginBottom: '24px' }}>
          <h4 style={{ margin: '0 0 16px', color: 'var(--text-main)', fontWeight: 700 }}>Submitted Declaration</h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <SummaryRow label="Tax Regime" value={declaration.taxRegime === 'OLD' ? '🏛️ Old Regime' : '🆕 New Regime'} />
            <SummaryRow label="Section 80C" value={fmt(declaration.section80C)} />
            <SummaryRow label="Section 80D" value={fmt(declaration.section80D)} />
            <SummaryRow label="HRA Exemption" value={fmt(declaration.hraExemption)} />
            <SummaryRow label="Home Loan Interest" value={fmt(declaration.homeLoanInterest)} />
          </div>
          <p style={{ margin: '16px 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Submitted on {new Date(declaration.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
          </p>
        </div>
      )}

      {/* Form — only editable when not submitted OR when rejected */}
      {canEdit && (
        <div className="card-iipm" style={{ padding: '28px' }}>
          <h4 style={{ margin: '0 0 8px', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileText size={18} />
            {isRejected ? 'Update & Resubmit Declaration' : 'Submit IT Declaration'}
          </h4>
          <p style={{ margin: '0 0 24px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Select your tax regime first. For Old Regime, fill the deduction details. New Regime uses standard deduction only.
          </p>

          <form onSubmit={handleSubmit}>
            {/* Tax Regime Selector */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-main)', marginBottom: '10px' }}>
                Select Tax Regime <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                {[
                  { value: 'NEW', label: 'New Regime', desc: 'Standard Deduction ₹75,000. No 80C/80D.', badge: 'Default' },
                  { value: 'OLD', label: 'Old Regime', desc: 'Standard Deduction ₹50,000. Allows 80C, 80D, HRA, Home Loan.', badge: null },
                ].map(opt => (
                  <div
                    key={opt.value}
                    onClick={() => setForm(f => ({ ...f, taxRegime: opt.value }))}
                    style={{
                      border: `2px solid ${form.taxRegime === opt.value ? '#153C7D' : 'var(--border)'}`,
                      borderRadius: '12px',
                      padding: '14px 16px',
                      cursor: 'pointer',
                      background: form.taxRegime === opt.value ? '#eef2ff' : 'var(--bg-surface)',
                      transition: 'all 0.2s',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <div style={{
                        width: '18px', height: '18px', borderRadius: '50%',
                        border: `2px solid ${form.taxRegime === opt.value ? '#153C7D' : 'var(--border)'}`,
                        background: form.taxRegime === opt.value ? '#153C7D' : 'transparent',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                      }}>
                        {form.taxRegime === opt.value && <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#fff' }} />}
                      </div>
                      <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-main)' }}>{opt.label}</span>
                      {opt.badge && (
                        <span style={{ background: '#153C7D', color: '#fff', borderRadius: '20px', padding: '2px 8px', fontSize: '0.7rem', fontWeight: 700 }}>
                          {opt.badge}
                        </span>
                      )}
                    </div>
                    <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted)', paddingLeft: '26px' }}>{opt.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Deduction Fields — only for OLD regime */}
            {isOldRegime && (
              <div style={{ marginBottom: '24px' }}>
                <div style={{
                  padding: '10px 14px', background: '#fffbeb', borderRadius: '8px',
                  border: '1px solid #fcd34d', fontSize: '0.82rem', color: '#92400e',
                  marginBottom: '16px', fontWeight: 600,
                }}>
                  💡 Old Regime selected — enter your deduction amounts below. Caps: 80C max ₹1,50,000 | Home Loan max ₹2,00,000
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <FormField label="Section 80C (EPF, ELSS, PPF, LIC)" value={form.section80C} onChange={v => setForm(f => ({ ...f, section80C: v }))} max={150000} />
                  <FormField label="Section 80D (Health Insurance Premium)" value={form.section80D} onChange={v => setForm(f => ({ ...f, section80D: v }))} />
                  <FormField label="HRA Exemption" value={form.hraExemption} onChange={v => setForm(f => ({ ...f, hraExemption: v }))} />
                  <FormField label="Home Loan Interest (max ₹2,00,000)" value={form.homeLoanInterest} onChange={v => setForm(f => ({ ...f, homeLoanInterest: v }))} max={200000} />
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginTop: '8px' }}>
              <button
                type="submit"
                disabled={saving}
                style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  background: saving ? '#94a3b8' : '#153C7D',
                  color: '#fff', border: 'none', borderRadius: '10px',
                  padding: '12px 24px', fontWeight: 700, fontSize: '0.9rem',
                  cursor: saving ? 'not-allowed' : 'pointer', transition: 'all 0.2s',
                }}
              >
                {isRejected ? <RotateCcw size={16} /> : <Send size={16} />}
                {saving ? 'Submitting...' : isRejected ? 'Resubmit Declaration' : 'Submit Declaration'}
              </button>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                You can resubmit if rejected by the FA Operator.
              </span>
            </div>
          </form>
        </div>
      )}


      {/* IT Declarations History Table */}
      <div className="card-iipm" style={{ padding: '0', marginTop: '32px' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>IT Declaration History</h3>
        </div>
        
        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', padding: '0 20px', gap: '24px' }}>
          {['ALL', 'PENDING', 'APPROVED', 'REJECTED'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                background: 'none', border: 'none', padding: '12px 0',
                color: activeTab === tab ? 'var(--primary)' : 'var(--text-secondary)',
                fontWeight: activeTab === tab ? 700 : 500,
                borderBottom: activeTab === tab ? '2px solid var(--primary)' : '2px solid transparent',
                cursor: 'pointer', fontSize: '0.9rem',
                textTransform: 'capitalize'
              }}
            >
              {tab.toLowerCase()}
            </button>
          ))}
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="table-iipm">
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                <th>Financial Year</th>
                <th>Tax Regime</th>
                <th>Status</th>
                <th>Submitted On</th>
                <th style={{ textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {declarations.filter((d: any) => activeTab === 'ALL' || d.status === activeTab).map((d: any) => (
                <tr key={d.id}>
                  <td style={{ fontWeight: 600 }}>{d.financialYear}</td>
                  <td>{d.taxRegime === 'OLD' ? 'Old Regime' : 'New Regime'}</td>
                  <td>
                    <span className={`status-badge ${d.status.toLowerCase()}`}>
                      {d.status}
                    </span>
                  </td>
                  <td>{new Date(d.createdAt).toLocaleDateString('en-IN')}</td>
                  <td style={{ textAlign: 'right' }}>
                    <button className="btn-secondary-iipm" style={{ padding: '6px 12px', fontSize: '0.8rem' }} onClick={() => setViewModal(d)}>
                      <Eye size={14} style={{ marginRight: '6px' }}/> View
                    </button>
                  </td>
                </tr>
              ))}
              {declarations.filter((d: any) => activeTab === 'ALL' || d.status === activeTab).length === 0 && (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                    No {activeTab !== 'ALL' ? activeTab.toLowerCase() : ''} declarations found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* View/Print Modal */}
      {viewModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div className="card-iipm printable-modal" style={{ width: '90%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto', padding: '0' }}>
            <div style={{ padding: '20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700 }}>IT Declaration: {viewModal.financialYear}</h3>
              <div className="no-print" style={{ display: 'flex', gap: '10px' }}>
                <button onClick={() => window.print()} className="btn-secondary-iipm" style={{ padding: '6px 12px' }}>
                  <Printer size={16} style={{ marginRight: '6px' }} /> Print
                </button>
                <button onClick={() => setViewModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                  <XCircle size={24} color="var(--text-muted)" />
                </button>
              </div>
            </div>
            
            <div style={{ padding: '24px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
                <div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Tax Regime</div>
                  <div style={{ fontWeight: 600 }}>{viewModal.taxRegime === 'OLD' ? 'Old Regime' : 'New Regime'}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Status</div>
                  <div style={{ fontWeight: 600 }} className={`text-${viewModal.status.toLowerCase()}`}>{viewModal.status}</div>
                </div>
              </div>

              {viewModal.taxRegime === 'OLD' && (
                <>
                  <h4 style={{ borderBottom: '1px solid var(--border)', paddingBottom: '8px', marginBottom: '16px' }}>Deductions</h4>
                  <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '24px' }}>
                    <tbody>
                      <tr>
                        <td style={{ padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>Section 80C</td>
                        <td style={{ padding: '8px 0', borderBottom: '1px solid #f1f5f9', textAlign: 'right', fontWeight: 600 }}>{fmt(viewModal.section80C)}</td>
                      </tr>
                      <tr>
                        <td style={{ padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>Section 80D</td>
                        <td style={{ padding: '8px 0', borderBottom: '1px solid #f1f5f9', textAlign: 'right', fontWeight: 600 }}>{fmt(viewModal.section80D)}</td>
                      </tr>
                      <tr>
                        <td style={{ padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>HRA Exemption</td>
                        <td style={{ padding: '8px 0', borderBottom: '1px solid #f1f5f9', textAlign: 'right', fontWeight: 600 }}>{fmt(viewModal.hraExemption)}</td>
                      </tr>
                      <tr>
                        <td style={{ padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>Home Loan Interest</td>
                        <td style={{ padding: '8px 0', borderBottom: '1px solid #f1f5f9', textAlign: 'right', fontWeight: 600 }}>{fmt(viewModal.homeLoanInterest)}</td>
                      </tr>
                    </tbody>
                  </table>
                </>
              )}

              {viewModal.status === 'REJECTED' && viewModal.rejectionReason && (
                <div style={{ padding: '16px', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '8px', color: '#991b1b' }}>
                  <div style={{ fontWeight: 700, marginBottom: '4px' }}>Rejection Reason:</div>
                  <div>{viewModal.rejectionReason}</div>
                </div>
              )}
              
              <div style={{ marginTop: '24px', fontSize: '0.8rem', color: 'var(--text-muted)', borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
                <div>Submitted On: {new Date(viewModal.createdAt).toLocaleString('en-IN')}</div>
                {viewModal.reviewedBy && <div>Reviewed By: {viewModal.reviewedBy} at {new Date(viewModal.reviewedAt).toLocaleString('en-IN')}</div>}
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

const SummaryRow = ({ label, value }: { label: string; value: string }) => (
  <div style={{ background: 'var(--bg-hover)', borderRadius: '8px', padding: '10px 14px' }}>
    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '2px' }}>{label}</div>
    <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-main)' }}>{value}</div>
  </div>
);

const FormField = ({ label, value, onChange, max }: { label: string; value: any; onChange: (v: string) => void; max?: number }) => (
  <div>
    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
      {label} {max && <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(max ₹{max.toLocaleString('en-IN')})</span>}
    </label>
    <input
      type="number"
      min="0"
      max={max}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder="0"
      style={{
        width: '100%', padding: '10px 12px', borderRadius: '8px',
        border: '1.5px solid var(--border)', fontSize: '0.9rem',
        background: 'var(--bg-surface)', color: 'var(--text-main)',
        outline: 'none', boxSizing: 'border-box',
      }}
    />
  </div>
);

export default ITDeclarationPortal;
