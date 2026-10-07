import React, { useState, useEffect, useContext, useRef } from 'react';
import { UserContext } from '../App';
import apiService from '../services/api';
import { CheckCircle, Clock, XCircle, FileText, Send, RotateCcw, Printer, Eye, Upload, Trash2, Download, Paperclip, AlertCircle, FileCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const ITDeclarationPortal = () => {
  const userCtx = useContext(UserContext);
  const userId = userCtx?.userId;
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [declarations, setDeclarations] = useState<any[]>([]);
  const [declaration, setDeclaration] = useState<any>(null);
  const [form, setForm] = useState({
    taxRegime: 'NEW',
    section80C: '',
    section80D: '',
    hraExemption: '',
    homeLoanInterest: '',
    financialYear: '',
  });
  const [documents, setDocuments] = useState<string[]>([]); // "filename|data:mime;base64,..."
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [previewDoc, setPreviewDoc] = useState<{ name: string; url: string } | null>(null);

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
          setDocuments(currentDec.documents || []);
        } else {
          setDeclaration(null);
          setForm(f => ({ ...f, financialYear: currentFY }));
          setDocuments([]);
        }
      } else {
        setDeclarations([]);
        setDeclaration(null);
        setForm(f => ({ ...f, financialYear: currentFY }));
        setDocuments([]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    Array.from(files).forEach((file) => {
      if (file.size > 10 * 1024 * 1024) {
        setMessage({ text: `File "${file.name}" exceeds 10MB limit.`, type: 'error' });
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result as string;
        setDocuments(prev => [...prev, `${file.name}|${base64}`]);
      };
      reader.readAsDataURL(file);
    });

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRemoveDoc = (index: number) => {
    setDocuments(prev => prev.filter((_, i) => i !== index));
  };

  const handleOpenDoc = (docString: string) => {
    const parts = docString.split('|');
    const name = parts[0] || 'Document';
    const dataUrl = parts.slice(1).join('|');
    if (dataUrl) {
      setPreviewDoc({ name, url: dataUrl });
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
        documents: documents,
        status: 'PENDING',
      };
      // If resubmitting after rejection, carry ID
      if (declaration?.id && declaration?.status === 'REJECTED') {
        payload.id = declaration.id;
      }
      await apiService.saveItDeclaration(payload);
      setMessage({ text: 'IT Declaration and investment proofs submitted successfully! Pending FA review.', type: 'success' });
      await loadDeclaration();
    } catch (err) {
      setMessage({ text: 'Error submitting IT Declaration. Please try again.', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const fmt = (n: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);

  const fmtDate = (val: any, full = false) => {
    if (!val) return 'N/A';
    const d = new Date(val);
    if (isNaN(d.getTime()) || d.getFullYear() < 2000) return 'N/A';
    return full ? d.toLocaleString('en-IN') : d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

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
    <div className="page-container" style={{ paddingBottom: '60px', animation: 'fadeIn 0.5s ease' }}>
      {/* Page Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', background: '#ffffff', padding: '24px 28px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03)', border: '1px solid var(--border)', marginBottom: '24px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)' }}>IT Declaration & Form 16</h1>
          <p style={{ margin: '8px 0 0 0', color: 'var(--text-muted)', fontSize: '0.95rem' }}>Submit tax regime, declare deductions, attach investment proofs, and access Form 16.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={() => navigate('/form16')}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '8px',
              background: '#0a3161', color: '#fff', border: 'none',
              borderRadius: '8px', padding: '10px 18px', fontWeight: 700,
              fontSize: '0.9rem', cursor: 'pointer', boxShadow: '0 4px 10px rgba(10,49,97,0.2)', transition: 'all 0.2s'
            }}
            onMouseOver={(e) => (e.currentTarget.style.transform = 'translateY(-2px)')}
            onMouseOut={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
          >
            <Printer size={16} /> View / Print Form 16
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg-hover)', padding: '8px 16px', borderRadius: '8px', border: '1px solid var(--border)' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>FY:</span>
            <span style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--primary)' }}>{currentFY}</span>
          </div>
        </div>
      </div>

      {/* Status Banner */}
      {declaration && (
        <div style={{
          borderRadius: '16px',
          padding: '24px',
          marginBottom: '32px',
          display: 'flex',
          alignItems: 'center',
          gap: '20px',
          border: 'none',
          boxShadow: isApproved ? '0 10px 25px -5px rgba(34, 197, 94, 0.2)' : isPending ? '0 10px 25px -5px rgba(245, 158, 11, 0.2)' : '0 10px 25px -5px rgba(239, 68, 68, 0.2)',
          background: isApproved ? 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)' : isPending ? 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)' : 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{
            position: 'absolute', top: '-20px', right: '-20px', opacity: 0.1, transform: 'scale(2.5)', pointerEvents: 'none'
          }}>
            {isApproved && <CheckCircle size={100} color="#166534" />}
            {isPending && <Clock size={100} color="#92400e" />}
            {isRejected && <XCircle size={100} color="#991b1b" />}
          </div>
          <div style={{ 
            flexShrink: 0, 
            background: '#fff', 
            borderRadius: '50%', 
            padding: '12px', 
            boxShadow: '0 4px 10px rgba(0,0,0,0.05)',
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            zIndex: 1
          }}>
            {isApproved && <CheckCircle size={32} color="#16a34a" />}
            {isPending && <Clock size={32} color="#d97706" />}
            {isRejected && <XCircle size={32} color="#dc2626" />}
          </div>
          <div style={{ flex: 1, zIndex: 1 }}>
            <div style={{ fontWeight: 800, fontSize: '1.25rem', color: isApproved ? '#166534' : isPending ? '#92400e' : '#991b1b', marginBottom: '6px' }}>
              {isApproved && 'Declaration Approved'}
              {isPending && 'Pending Review'}
              {isRejected && 'Declaration Rejected — Please Resubmit'}
            </div>
            <div style={{ fontSize: '0.95rem', color: isApproved ? '#15803d' : isPending ? '#b45309' : '#b91c1c', lineHeight: 1.5 }}>
              {isApproved && 'Your IT Declaration has been verified and approved by the FA Operator. The deductions will be applied automatically during your payroll processing.'}
              {isPending && 'Your declaration has been successfully submitted and is currently in the queue for review by the FA Operator.'}
              {isRejected && (
                <>
                  <span style={{ fontWeight: 600 }}>Reason for rejection: </span>
                  <strong>{declaration.rejectionReason || 'No reason provided'}</strong>
                  <br />
                  <span>Please review the comments, update your declaration and investment proof documents accordingly, and resubmit below.</span>
                </>
              )}
            </div>
            {isApproved && (
              <div style={{ marginTop: '16px' }}>
                <button
                  onClick={() => navigate('/form16')}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '8px',
                    background: '#166534', color: '#fff', border: 'none',
                    borderRadius: '8px', padding: '10px 20px', fontWeight: 700,
                    fontSize: '0.9rem', cursor: 'pointer', boxShadow: '0 4px 6px rgba(22, 101, 52, 0.2)', transition: 'all 0.2s'
                  }}
                  onMouseOver={(e) => (e.currentTarget.style.transform = 'translateY(-2px)')}
                  onMouseOut={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
                >
                  <Printer size={18} /> View & Print Form 16
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
        <div className="card-iipm" style={{ padding: '32px', marginBottom: '32px', border: 'none', boxShadow: '0 10px 30px -10px rgba(0,0,0,0.08)', borderRadius: '16px', background: '#fff' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', paddingBottom: '16px', borderBottom: '1px solid #f1f5f9' }}>
            <h4 style={{ margin: 0, color: 'var(--text-main)', fontWeight: 800, fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <FileText size={22} color="var(--primary)" /> Submitted Declaration Details
            </h4>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', background: '#f8fafc', padding: '6px 12px', borderRadius: '20px', fontWeight: 600 }}>
              Submitted on {fmtDate(declaration.createdAt)}
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '24px' }}>
            <SummaryRow label="Tax Regime" value={declaration.taxRegime === 'OLD' ? '🏛️ Old Regime' : '🆕 New Regime'} highlight={true} />
            <SummaryRow label="Section 80C" value={fmt(declaration.section80C)} />
            <SummaryRow label="Section 80D" value={fmt(declaration.section80D)} />
            <SummaryRow label="HRA Exemption" value={fmt(declaration.hraExemption)} />
            <SummaryRow label="Home Loan Interest" value={fmt(declaration.homeLoanInterest)} />
          </div>

          {/* Attached Documents in Summary */}
          {declaration.documents && declaration.documents.length > 0 && (
            <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #f1f5f9' }}>
              <div style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '0.95rem', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Paperclip size={18} color="var(--primary)" />
                Attached Proof Documents ({declaration.documents.length}):
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '12px' }}>
                {declaration.documents.map((docStr: string, idx: number) => {
                  const parts = docStr.split('|');
                  const docName = parts[0] || `Proof_${idx + 1}`;
                  return (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                        <FileCheck size={18} color="#16a34a" />
                        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{docName}</span>
                      </div>
                      <button
                        onClick={() => handleOpenDoc(docStr)}
                        style={{ padding: '4px 10px', fontSize: '0.8rem', background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', borderRadius: '6px', cursor: 'pointer', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}
                      >
                        <Eye size={14} /> View
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Form — only editable when not submitted OR when rejected */}
      {canEdit && (
        <div className="card-iipm" style={{ padding: '32px', border: 'none', boxShadow: '0 10px 30px -10px rgba(0,0,0,0.08)', borderRadius: '16px', background: '#fff' }}>
          <div style={{ marginBottom: '32px', paddingBottom: '16px', borderBottom: '1px solid #f1f5f9' }}>
            <h4 style={{ margin: '0 0 8px', fontWeight: 800, fontSize: '1.3rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <FileText size={24} color="var(--primary)" />
              {isRejected ? 'Update & Resubmit IT Declaration' : 'New IT Declaration'}
            </h4>
            <p style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-muted)' }}>
              Please select your preferred tax regime, provide deduction details, and upload relevant investment proofs.
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            {/* Tax Regime Selector */}
            <div style={{ marginBottom: '32px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 800, fontSize: '1.05rem', color: 'var(--text-main)', margin: 0 }}>
                  1. Whether opting out of taxation u/s 115BAC(1A)? <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                  Selected: <b style={{ color: form.taxRegime === 'OLD' ? '#6366f1' : '#3b82f6' }}>{form.taxRegime === 'OLD' ? 'Yes (Opt Out / Old Regime)' : 'No (New Regime - Default)'}</b>
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                {[
                  { 
                    value: 'NEW', 
                    optOut: 'No',
                    label: 'No – New Tax Regime (Sec 115BAC)', 
                    sub: 'Default Tax Regime (Not Opting Out)',
                    desc: 'Default regime. Includes standard deduction of ₹75,000. Chapter VI-A deductions (80C, 80D) and HRA exemptions are not applicable.', 
                    badge: 'No (Default)', 
                    color: '#3b82f6', 
                    bg: '#eff6ff' 
                  },
                  { 
                    value: 'OLD', 
                    optOut: 'Yes',
                    label: 'Yes – Opt Out to Old Tax Regime', 
                    sub: 'Opt Out of Sec 115BAC(1A)',
                    desc: 'Allows declaring statutory deductions like 80C (up to ₹1.5L), 80D (Health Insurance), HRA Exemption, and Home Loan Interest u/s 24(b). Standard deduction is ₹50,000.', 
                    badge: 'Yes (Opt Out)', 
                    color: '#6366f1', 
                    bg: '#eef2ff' 
                  },
                ].map(opt => {
                  const isSelected = form.taxRegime === opt.value;
                  return (
                    <div
                      key={opt.value}
                      onClick={() => setForm(f => ({ ...f, taxRegime: opt.value }))}
                      style={{
                        position: 'relative',
                        border: `2px solid ${isSelected ? opt.color : '#e2e8f0'}`,
                        borderRadius: '16px',
                        padding: '24px',
                        cursor: 'pointer',
                        background: isSelected ? opt.bg : '#fff',
                        boxShadow: isSelected ? `0 10px 25px -5px ${opt.color}33` : 'none',
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        transform: isSelected ? 'translateY(-4px)' : 'none'
                      }}
                    >
                      <div style={{ position: 'absolute', top: '-12px', right: '24px', background: isSelected ? opt.color : '#64748b', color: '#fff', padding: '4px 12px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 800, boxShadow: `0 4px 6px ${opt.color}40` }}>
                        {opt.badge}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                        <div style={{
                          width: '24px', height: '24px', borderRadius: '50%',
                          border: `2px solid ${isSelected ? opt.color : '#cbd5e1'}`,
                          background: isSelected ? opt.color : '#fff',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                          transition: 'all 0.2s'
                        }}>
                          {isSelected && <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#fff' }} />}
                        </div>
                        <div>
                          <span style={{ fontWeight: 800, fontSize: '1.1rem', color: isSelected ? opt.color : 'var(--text-main)', display: 'block' }}>{opt.label}</span>
                          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>{opt.sub}</span>
                        </div>
                      </div>
                      <p style={{ margin: '8px 0 0', fontSize: '0.88rem', color: isSelected ? '#1e293b' : 'var(--text-muted)', lineHeight: 1.5, paddingLeft: '36px' }}>{opt.desc}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Deduction Fields — only for OLD regime */}
            {isOldRegime && (
              <div style={{ marginBottom: '32px', animation: 'fadeIn 0.4s ease' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 800, fontSize: '1rem', color: 'var(--text-main)', marginBottom: '16px' }}>
                  2. Declare Your Deductions
                </label>
                <div style={{
                  padding: '16px 20px', background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)', borderRadius: '12px',
                  border: '1px solid #fde68a', fontSize: '0.9rem', color: '#92400e',
                  marginBottom: '24px', fontWeight: 600, display: 'flex', gap: '12px', alignItems: 'center'
                }}>
                  <div style={{ fontSize: '1.5rem' }}>💡</div>
                  <div>Old Regime selected — enter your annual deduction amounts below.<br/><span style={{ fontSize: '0.8rem', opacity: 0.8 }}>Maximum caps: Section 80C up to ₹1,50,000 | Home Loan Interest up to ₹2,00,000.</span></div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                  <FormField label="Section 80C" subtext="(EPF, ELSS, PPF, LIC, etc.)" value={form.section80C} onChange={v => setForm(f => ({ ...f, section80C: v }))} max={150000} icon="💰" />
                  <FormField label="Section 80D" subtext="(Health Insurance Premium)" value={form.section80D} onChange={v => setForm(f => ({ ...f, section80D: v }))} icon="🏥" />
                  <FormField label="HRA Exemption" subtext="(House Rent Allowance)" value={form.hraExemption} onChange={v => setForm(f => ({ ...f, hraExemption: v }))} icon="🏠" />
                  <FormField label="Home Loan Interest" subtext="(Under Section 24b)" value={form.homeLoanInterest} onChange={v => setForm(f => ({ ...f, homeLoanInterest: v }))} max={200000} icon="🏦" />
                </div>
              </div>
            )}

            {/* Document Upload Section */}
            <div style={{ marginBottom: '32px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 800, fontSize: '1rem', color: 'var(--text-main)', marginBottom: '12px' }}>
                {isOldRegime ? '3.' : '2.'} Attach Investment Proof Documents (Receipts, Policies, Rent Agreements)
              </label>
              
              <div 
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: '2px dashed #cbd5e1',
                  borderRadius: '12px',
                  padding: '24px',
                  textAlign: 'center',
                  background: '#f8fafc',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  marginBottom: '16px'
                }}
                onMouseOver={(e) => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.background = '#eff6ff'; }}
                onMouseOut={(e) => { e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.background = '#f8fafc'; }}
              >
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileUpload} 
                  multiple 
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" 
                  style={{ display: 'none' }} 
                />
                <Upload size={32} color="var(--primary)" style={{ margin: '0 auto 8px' }} />
                <div style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '0.95rem' }}>Click here to upload documents</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>Supports PDF, PNG, JPG, Word files (up to 10MB per file)</div>
              </div>

              {/* Uploaded files list */}
              {documents.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
                  {documents.map((docStr, idx) => {
                    const parts = docStr.split('|');
                    const docName = parts[0] || `File_${idx + 1}`;
                    return (
                      <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                          <Paperclip size={16} color="var(--primary)" />
                          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{docName}</span>
                        </div>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button
                            type="button"
                            onClick={() => handleOpenDoc(docStr)}
                            style={{ padding: '4px 8px', fontSize: '0.75rem', background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', borderRadius: '4px', cursor: 'pointer', fontWeight: 700 }}
                          >
                            <Eye size={12} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveDoc(idx)}
                            style={{ padding: '4px 8px', fontSize: '0.75rem', background: '#fef2f2', color: '#dc2626', border: '1px solid #fca5a5', borderRadius: '4px', cursor: 'pointer', fontWeight: 700 }}
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginTop: '16px', paddingTop: '24px', borderTop: '1px solid #f1f5f9' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                  Ensure all details and attached documents are accurate before submission.
                </span>
                <button
                  type="submit"
                  disabled={saving}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    background: saving ? '#94a3b8' : 'linear-gradient(135deg, var(--primary) 0%, #1a3a6e 100%)',
                    color: '#fff', border: 'none', borderRadius: '12px',
                    padding: '14px 32px', fontWeight: 800, fontSize: '1rem',
                    cursor: saving ? 'not-allowed' : 'pointer', 
                    boxShadow: saving ? 'none' : '0 10px 20px -5px rgba(21, 60, 125, 0.3)',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    transform: saving ? 'none' : 'translateY(0)',
                  }}
                  onMouseOver={(e) => { if(!saving) e.currentTarget.style.transform = 'translateY(-2px)' }}
                  onMouseOut={(e) => { if(!saving) e.currentTarget.style.transform = 'translateY(0)' }}
                >
                  {isRejected ? <RotateCcw size={20} /> : <Send size={20} />}
                  {saving ? 'Submitting...' : isRejected ? 'Resubmit Declaration' : 'Submit Declaration'}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Document Preview Modal */}
      {previewDoc && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.6)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div style={{ width: '90%', maxWidth: '850px', maxHeight: '90vh', background: '#fff', borderRadius: '16px', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px rgba(0,0,0,0.3)' }}>
            <div style={{ padding: '16px 20px', background: '#0a3161', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontWeight: 700, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Paperclip size={18} /> {previewDoc.name}
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <a
                  href={previewDoc.url}
                  download={previewDoc.name}
                  style={{ background: 'rgba(255,255,255,0.2)', color: '#fff', padding: '6px 12px', borderRadius: '6px', textDecoration: 'none', fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <Download size={14} /> Download
                </a>
                <button
                  onClick={() => setPreviewDoc(null)}
                  style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '1.2rem', padding: '4px 8px' }}
                >
                  ✕
                </button>
              </div>
            </div>
            <div style={{ flex: 1, padding: '16px', background: '#f1f5f9', overflow: 'auto', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
              {previewDoc.url.startsWith('data:image/') ? (
                <img src={previewDoc.url} alt={previewDoc.name} style={{ maxWidth: '100%', maxHeight: '70vh', objectFit: 'contain', borderRadius: '8px', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }} />
              ) : (
                <iframe src={previewDoc.url} title={previewDoc.name} style={{ width: '100%', height: '70vh', border: 'none', borderRadius: '8px', background: '#fff' }} />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const SummaryRow = ({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) => (
  <div style={{ 
    background: highlight ? '#eff6ff' : '#f8fafc', 
    border: highlight ? '1px solid #bfdbfe' : '1px solid #e2e8f0', 
    borderRadius: '12px', 
    padding: '16px 20px',
    boxShadow: '0 2px 5px rgba(0,0,0,0.02)'
  }}>
    <div style={{ fontSize: '0.85rem', color: highlight ? '#2563eb' : 'var(--text-muted)', marginBottom: '6px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</div>
    <div style={{ fontWeight: 800, fontSize: '1.25rem', color: highlight ? '#1d4ed8' : 'var(--text-main)' }}>{value}</div>
  </div>
);

const FormField = ({ label, subtext, value, onChange, max, icon }: { label: string; subtext?: string; value: any; onChange: (v: string) => void; max?: number; icon?: string }) => (
  <div style={{ display: 'flex', flexDirection: 'column' }}>
    <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '8px' }}>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <span style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)' }}>{label}</span>
        {subtext && <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{subtext}</span>}
      </div>
      {max && <span style={{ fontSize: '0.8rem', color: '#f59e0b', fontWeight: 700, background: '#fffbeb', padding: '2px 8px', borderRadius: '12px' }}>Max ₹{max.toLocaleString('en-IN')}</span>}
    </label>
    <div style={{ position: 'relative' }}>
      <div style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', fontSize: '1.1rem', opacity: 0.7 }}>
        {icon || '₹'}
      </div>
      <input
        type="number"
        min="0"
        max={max}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="0"
        style={{
          width: '100%', padding: '14px 16px 14px 44px', borderRadius: '12px',
          border: '2px solid #e2e8f0', fontSize: '1rem', fontWeight: 600,
          background: '#f8fafc', color: 'var(--text-main)',
          outline: 'none', boxSizing: 'border-box', transition: 'all 0.2s',
          boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)'
        }}
        onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.background = '#fff'; }}
        onBlur={(e) => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.background = '#f8fafc'; }}
      />
    </div>
  </div>
);

export default ITDeclarationPortal;
