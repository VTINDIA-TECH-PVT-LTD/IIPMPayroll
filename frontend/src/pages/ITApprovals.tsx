import React, { useState, useEffect, useContext } from 'react';
import apiService from '../services/api';
import { CheckCircle, XCircle, Clock, Eye, FileText } from 'lucide-react';
import { UserContext } from '../App';

const STATUS_TABS = ['ALL', 'PENDING', 'APPROVED', 'REJECTED'];

const statusStyle: Record<string, { bg: string; color: string; border: string }> = {
  PENDING:  { bg: '#fffbeb', color: '#b45309', border: '#fcd34d' },
  APPROVED: { bg: '#f0fdf4', color: '#15803d', border: '#86efac' },
  REJECTED: { bg: '#fef2f2', color: '#b91c1c', border: '#fca5a5' },
};

interface RejectModalProps {
  declaration: any;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}

const RejectModal: React.FC<RejectModalProps> = ({ declaration, onClose, onConfirm }) => {
  const [reason, setReason] = useState('');
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
    }}>
      <div style={{
        background: 'var(--bg-surface)', borderRadius: '16px', padding: '28px',
        width: '460px', maxWidth: '90vw', boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
          <XCircle size={22} color="#ef4444" />
          <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>Reject IT Declaration</h3>
        </div>
        <p style={{ fontSize: '0.87rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
          Rejecting declaration for <strong>{declaration.employeeName}</strong> ({declaration.employeeId}).
          The employee will be notified and asked to resubmit.
        </p>
        <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', marginBottom: '8px', color: 'var(--text-main)' }}>
          Rejection Reason <span style={{ color: '#ef4444' }}>*</span>
        </label>
        <textarea
          value={reason}
          onChange={e => setReason(e.target.value)}
          placeholder="e.g. Documents are missing, HRA amount exceeds limit, please re-verify..."
          rows={4}
          style={{
            width: '100%', padding: '10px 12px', borderRadius: '8px',
            border: '1.5px solid var(--border)', fontSize: '0.88rem',
            background: 'var(--bg-surface)', color: 'var(--text-main)',
            resize: 'vertical', outline: 'none', boxSizing: 'border-box',
          }}
        />
        <div style={{ display: 'flex', gap: '10px', marginTop: '20px', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{
              padding: '10px 20px', borderRadius: '8px', border: '1.5px solid var(--border)',
              background: 'transparent', color: 'var(--text-main)', fontWeight: 600, cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={() => { if (reason.trim()) onConfirm(reason.trim()); }}
            disabled={!reason.trim()}
            style={{
              padding: '10px 20px', borderRadius: '8px', border: 'none',
              background: reason.trim() ? '#ef4444' : '#fca5a5',
              color: '#fff', fontWeight: 700, cursor: reason.trim() ? 'pointer' : 'not-allowed',
            }}
          >
            Confirm Rejection
          </button>
        </div>
      </div>
    </div>
  );
};

interface DetailModalProps {
  declaration: any;
  onClose: () => void;
}

const DetailModal: React.FC<DetailModalProps> = ({ declaration: d, onClose }) => {
  const fmt = (n: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
    }}>
      <div style={{
        background: '#ffffff', borderRadius: '16px', padding: '28px',
        width: '520px', maxWidth: '90vw', boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        border: '1px solid #e2e8f0',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ margin: 0, fontWeight: 700, color: '#1e293b' }}>Declaration Details</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.3rem', color: '#94a3b8' }}>×</button>
        </div>
        <div style={{ marginBottom: '16px' }}>
          <div style={{ fontWeight: 700, fontSize: '1rem', color: '#1e293b' }}>{d.employeeName}</div>
          <div style={{ fontSize: '0.82rem', color: '#64748b' }}>{d.employeeId} • {d.department} • {d.designation}</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
          {[
            { label: 'Financial Year', value: d.financialYear },
            { label: 'Tax Regime', value: d.taxRegime === 'OLD' ? '🏛️ Old Regime' : '🆕 New Regime' },
            { label: 'Section 80C', value: fmt(d.section80C) },
            { label: 'Section 80D', value: fmt(d.section80D) },
            { label: 'HRA Exemption', value: fmt(d.hraExemption) },
            { label: 'Home Loan Interest', value: fmt(d.homeLoanInterest) },
          ].map(({ label, value }) => (
            <div key={label} style={{ background: '#f1f5f9', borderRadius: '8px', padding: '10px 12px' }}>
              <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '2px' }}>{label}</div>
              <div style={{ fontWeight: 600, fontSize: '0.88rem', color: '#1e293b' }}>{value}</div>
            </div>
          ))}
        </div>
        {d.rejectionReason && (
          <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '8px', padding: '12px', marginBottom: '16px' }}>
            <div style={{ fontWeight: 700, color: '#b91c1c', fontSize: '0.85rem', marginBottom: '4px' }}>Previous Rejection Reason:</div>
            <div style={{ fontSize: '0.85rem', color: '#7f1d1d' }}>{d.rejectionReason}</div>
          </div>
        )}
        <button onClick={onClose} style={{
          width: '100%', padding: '11px', borderRadius: '8px', border: 'none',
          background: '#153C7D', color: '#fff', fontWeight: 700, cursor: 'pointer',
        }}>
          Close
        </button>
      </div>
    </div>
  );
};

const ITApprovals = () => {
  const userCtx = useContext(UserContext);
  const [declarations, setDeclarations] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('PENDING');
  const [rejectTarget, setRejectTarget] = useState<any>(null);
  const [detailTarget, setDetailTarget] = useState<any>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    try {
      setLoading(true);
      const res = await apiService.api.get('/it-declarations/all');
      const data = res.data?.data || res.data;
      if (Array.isArray(data)) setDeclarations(data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleApprove = async (id: string) => {
    try {
      await apiService.api.put(`/it-declarations/${id}/status`, { status: 'APPROVED' });
      setDeclarations(prev => prev.map(d => (d.id || d._id) === id ? { ...d, status: 'APPROVED' } : d));
    } catch (e) { console.error(e); }
  };

  const handleRejectConfirm = async (reason: string) => {
    if (!rejectTarget) return;
    const id = rejectTarget.id || rejectTarget._id;
    try {
      await apiService.api.put(`/it-declarations/${id}/status`, { status: 'REJECTED', rejectionReason: reason });
      setDeclarations(prev => prev.map(d => (d.id || d._id) === id ? { ...d, status: 'REJECTED', rejectionReason: reason } : d));
    } catch (e) { console.error(e); }
    setRejectTarget(null);
  };

  const fmt = (n: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);

  const counts: Record<string, number> = {
    ALL: declarations.length,
    PENDING: declarations.filter(d => d.status === 'PENDING').length,
    APPROVED: declarations.filter(d => d.status === 'APPROVED').length,
    REJECTED: declarations.filter(d => d.status === 'REJECTED').length,
  };

  const filtered = activeTab === 'ALL' ? declarations : declarations.filter(d => d.status === activeTab);

  return (
    <div className="page-container">
      {rejectTarget && (
        <RejectModal declaration={rejectTarget} onClose={() => setRejectTarget(null)} onConfirm={handleRejectConfirm} />
      )}
      {detailTarget && (
        <DetailModal declaration={detailTarget} onClose={() => setDetailTarget(null)} />
      )}

      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', background: '#ffffff', padding: '24px 28px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03)', border: '1px solid var(--border)', marginBottom: '24px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)' }}>IT Declaration Approvals</h2>
          <p style={{ margin: '8px 0 0 0', color: 'var(--text-muted)', fontSize: '0.95rem' }}>Review and approve or reject employee IT Declaration submissions</p>
        </div>
      </div>

      <div className="card-iipm" style={{ padding: 0, overflow: 'hidden' }}>
        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', padding: '0 20px', background: 'var(--bg-surface)' }}>
          {STATUS_TABS.map(tab => (
            <button
              key={tab}
              onClick={() => { setActiveTab(tab); setCurrentPage(1); }}
              style={{
                padding: '14px 18px', border: 'none',
                borderBottom: activeTab === tab ? '3px solid var(--primary)' : '3px solid transparent',
                background: 'none', cursor: 'pointer',
                fontWeight: activeTab === tab ? 700 : 500,
                color: activeTab === tab ? 'var(--primary)' : 'var(--text-muted)',
                fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '7px',
                transition: 'all 0.2s',
              }}
            >
              {tab === 'PENDING' && <Clock size={14} />}
              {tab === 'APPROVED' && <CheckCircle size={14} />}
              {tab === 'REJECTED' && <XCircle size={14} />}
              {tab === 'ALL' && <FileText size={14} />}
              {tab.charAt(0) + tab.slice(1).toLowerCase()}
              <span style={{
                background: activeTab === tab ? 'var(--primary)' : '#e5e7eb',
                color: activeTab === tab ? '#fff' : 'var(--text-muted)',
                borderRadius: '999px', padding: '1px 8px', fontSize: '0.72rem', fontWeight: 700,
              }}>
                {counts[tab]}
              </span>
            </button>
          ))}
        </div>

        {/* Loading */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
            <Clock size={32} style={{ marginBottom: '12px', opacity: 0.5 }} />
            <p>Loading declarations...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
            <FileText size={40} style={{ marginBottom: '12px', opacity: 0.3 }} />
            <p style={{ fontWeight: 600 }}>No {activeTab === 'ALL' ? '' : activeTab.toLowerCase()} declarations found.</p>
          </div>
        ) : (
          <div style={{ maxHeight: '600px', overflowY: 'auto', overflowX: 'auto', background: '#fff' }}>
            <table className="table-iipm" style={{ borderCollapse: 'collapse', width: '100%', minWidth: '1000px', margin: 0 }}>
              <thead>
                <tr style={{ position: 'sticky', top: 0, zIndex: 10, background: '#f8fafc', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-secondary)' }}>Employee</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-secondary)' }}>FY</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-secondary)' }}>Regime</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-secondary)' }}>80C</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-secondary)' }}>80D</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-secondary)' }}>HRA</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-secondary)' }}>Home Loan</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-secondary)' }}>Status</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-secondary)' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((d: any) => {
                  const id = d.id || d._id;
                  const sc = statusStyle[d.status] || { bg: '#f3f4f6', color: '#6b7280', border: '#d1d5db' };
                  return (
                    <tr key={id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>{d.employeeName || d.userId}</div>
                        {d.employeeId && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{d.employeeId}</div>}
                        {d.department && <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{d.department}</div>}
                      </td>
                      <td style={{ padding: '12px 16px', fontWeight: 600 }}>{d.financialYear}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{
                          display: 'inline-block', padding: '3px 10px', borderRadius: '20px',
                          fontSize: '0.75rem', fontWeight: 700,
                          background: d.taxRegime === 'OLD' ? '#fef3c7' : '#dbeafe',
                          color: d.taxRegime === 'OLD' ? '#92400e' : '#1e40af',
                        }}>
                          {d.taxRegime || 'N/A'}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px' }}>{fmt(d.section80C)}</td>
                      <td style={{ padding: '12px 16px' }}>{fmt(d.section80D)}</td>
                      <td style={{ padding: '12px 16px' }}>{fmt(d.hraExemption)}</td>
                      <td style={{ padding: '12px 16px' }}>{fmt(d.homeLoanInterest)}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{
                          display: 'inline-block', padding: '4px 12px', borderRadius: '20px',
                          fontSize: '0.75rem', fontWeight: 700,
                          background: sc.bg, color: sc.color, border: `1px solid ${sc.border}`,
                        }}>
                          {d.status === 'PENDING' && '⏳ '}
                          {d.status === 'APPROVED' && '✅ '}
                          {d.status === 'REJECTED' && '❌ '}
                          {d.status}
                        </span>
                        {d.status === 'REJECTED' && d.rejectionReason && (
                          <div style={{ fontSize: '0.72rem', color: '#b91c1c', marginTop: '3px', maxWidth: '120px', whiteSpace: 'normal' }}>
                            {d.rejectionReason.substring(0, 40)}{d.rejectionReason.length > 40 ? '...' : ''}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                          <button
                            onClick={() => setDetailTarget(d)}
                            title="View Details"
                            style={{ padding: '5px 12px', borderRadius: '4px', border: '1px solid var(--border)', background: '#f8fafc', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}
                          >
                            <Eye size={14} /> View
                          </button>
                          {d.status === 'PENDING' && (
                            <>
                              <button
                                onClick={() => handleApprove(id)}
                                style={{ padding: '5px 12px', borderRadius: '4px', border: '1px solid #198754', background: '#198754', color: '#ffffff', cursor: 'pointer', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px' }}
                              >
                                <CheckCircle size={14} /> Approve
                              </button>
                              <button
                                onClick={() => setRejectTarget(d)}
                                style={{ padding: '5px 12px', borderRadius: '4px', border: '1px solid #dc3545', background: '#ffffff', color: '#dc3545', cursor: 'pointer', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px' }}
                              >
                                <XCircle size={14} /> Reject
                              </button>
                            </>
                          )}
                          {d.status !== 'PENDING' && (
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem', fontStyle: 'italic' }}>
                              {d.status === 'APPROVED' ? 'Approved ✓' : 'Rejected ✗'}
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default ITApprovals;
