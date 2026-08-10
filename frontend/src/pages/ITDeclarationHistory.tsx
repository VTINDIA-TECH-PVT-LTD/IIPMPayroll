import React, { useState, useEffect, useContext } from 'react';
import { UserContext } from '../App';
import apiService from '../services/api';
import { Eye, Printer, XCircle } from 'lucide-react';

const ITDeclarationHistory = () => {
  const userCtx = useContext(UserContext);
  const userId = userCtx?.userId;

  const [declarations, setDeclarations] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('ALL');
  const [viewModal, setViewModal] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userId) loadDeclaration();
  }, [userId]);

  const loadDeclaration = async () => {
    try {
      setLoading(true);
      const res = await apiService.getItDeclarations(userId as string);
      if (res && res.length > 0) {
        // Sort descending by financial year
        res.sort((a: any, b: any) => b.financialYear.localeCompare(a.financialYear));
        setDeclarations(res);
      } else {
        setDeclarations([]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
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

  if (loading) return (
    <div className="page-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
        <div style={{ fontSize: '2rem', marginBottom: '12px' }}>⏳</div>
        <p>Loading IT Declaration History...</p>
      </div>
    </div>
  );

  return (
    <div className="page-container" style={{ maxWidth: '900px', margin: '0 auto' }}>
      <div style={{ marginBottom: '28px' }}>
        <h2 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-main)' }}>IT Declaration History</h2>
        <p style={{ margin: '6px 0 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          View all your past IT declarations
        </p>
      </div>

      <div className="card-iipm" style={{ padding: '0' }}>
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', padding: '0 20px', gap: '24px' }}>
          {['ALL', 'PENDING', 'APPROVED', 'REJECTED'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                background: 'none', border: 'none', padding: '16px 0',
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
                  <td>{fmtDate(d.createdAt)}</td>
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
                <div>Submitted On: {fmtDate(viewModal.createdAt, true)}</div>
                {viewModal.reviewedBy && <div>Reviewed By: {viewModal.reviewedBy} at {fmtDate(viewModal.reviewedAt, true)}</div>}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ITDeclarationHistory;
