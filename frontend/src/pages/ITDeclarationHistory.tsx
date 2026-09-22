import React, { useState, useEffect, useContext } from 'react';
import { UserContext } from '../App';
import apiService from '../services/api';
import { Eye, Printer, XCircle } from 'lucide-react';
import Form16Report from '../components/Form16Report';

const ITDeclarationHistory = () => {
  const userCtx = useContext(UserContext);
  const userId = userCtx?.userId;

  const [declarations, setDeclarations] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('ALL');
  const [viewModal, setViewModal] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Pagination & Search
  const [search, setSearch] = useState('');
  useEffect(() => { setCurrentPage(1); }, [search, activeTab]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Form 16 state for view modal
  const [form16Data, setForm16Data] = useState<any>(null);
  const [loadingForm16, setLoadingForm16] = useState(false);

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

  const handleViewClick = async (d: any) => {
    setViewModal(d);
    if (userId && d.financialYear) {
      try {
        setLoadingForm16(true);
        const fyStartYear = parseInt(d.financialYear.split('-')[0]);
        const res = await apiService.getForm16(userId, fyStartYear);
        if (res) {
          setForm16Data(res);
        } else {
          setForm16Data(null);
        }
      } catch (err) {
        console.error('Failed to load Form 16:', err);
        setForm16Data(null);
      } finally {
        setLoadingForm16(false);
      }
    }
  };

  const fmtDate = (val: any, full = false) => {
    if (!val) return 'N/A';
    let d: Date;
    if (Array.isArray(val)) {
      // Java LocalDateTime array: [year, month(1-based), day, hour?, min?, sec?]
      d = new Date(val[0], (val[1] ?? 1) - 1, val[2] ?? 1, val[3] ?? 0, val[4] ?? 0, val[5] ?? 0);
    } else {
      d = new Date(val);
    }
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

  const filtered = declarations.filter((d: any) => {
    const matchesTab = activeTab === 'ALL' || d.status === activeTab;
    const matchesSearch = `${d.financialYear} ${d.taxRegime === 'OLD' ? 'Old Regime' : 'New Regime'} ${d.status}`
      .toLowerCase().includes(search.toLowerCase());
    return matchesTab && matchesSearch;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage));
  const currentData = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="page-container" style={{ paddingBottom: '60px', animation: 'fadeIn 0.5s ease' }}>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', background: '#ffffff', padding: '24px 28px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03)', border: '1px solid var(--border)', marginBottom: '24px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)' }}>IT Declaration History</h1>
          <p style={{ margin: '8px 0 0 0', color: 'var(--text-muted)', fontSize: '0.95rem' }}>View and download all your past IT declarations and Form 16s.</p>
        </div>
      </div>

      <div className="card-iipm" style={{ padding: '0', borderRadius: '16px', overflow: 'hidden', border: 'none', boxShadow: '0 10px 30px -10px rgba(0,0,0,0.08)' }}>
        <div style={{ display: 'flex', background: '#f8fafc', borderBottom: '1px solid var(--border)', padding: '0 24px', gap: '32px' }}>
          {['ALL', 'PENDING', 'APPROVED', 'REJECTED'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                background: 'none', border: 'none', padding: '20px 0',
                color: activeTab === tab ? 'var(--primary)' : 'var(--text-secondary)',
                fontWeight: activeTab === tab ? 800 : 600,
                borderBottom: activeTab === tab ? '3px solid var(--primary)' : '3px solid transparent',
                cursor: 'pointer', fontSize: '0.95rem',
                textTransform: 'uppercase', letterSpacing: '0.5px',
                transition: 'all 0.2s'
              }}
            >
              {tab}
            </button>
          ))}
        </div>

        <div style={{ padding: '24px' }}>
          <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: 1, maxWidth: '400px' }}>
              <span style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', fontSize: '1.2rem', opacity: 0.5 }}>🔍</span>
              <input 
                className="form-control-iipm" 
                placeholder="Search by financial year, regime..." 
                value={search}
                onChange={e => setSearch(e.target.value)} 
                style={{ width: '100%', padding: '12px 16px 12px 48px', borderRadius: '12px', border: '2px solid #e2e8f0', fontSize: '0.95rem', background: '#f8fafc', transition: 'all 0.2s', outline: 'none' }} 
                onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.background = '#fff'; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.background = '#f8fafc'; }}
              />
            </div>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: 600, marginLeft: 'auto', background: '#f1f5f9', padding: '6px 12px', borderRadius: '20px' }}>
              {filtered.length} of {declarations.length} records
            </span>
          </div>

          <div style={{ overflowX: 'auto', margin: '0 -24px' }}>
            <table className="table-iipm" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f1f5f9', color: 'var(--text-secondary)' }}>
                  <th style={{ padding: '16px 24px', fontWeight: 700, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Financial Year</th>
                  <th style={{ padding: '16px 24px', fontWeight: 700, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Tax Regime</th>
                  <th style={{ padding: '16px 24px', fontWeight: 700, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Status</th>
                  <th style={{ padding: '16px 24px', fontWeight: 700, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Submitted On</th>
                  <th style={{ padding: '16px 24px', fontWeight: 700, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'center' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {currentData.map((d: any) => (
                  <tr key={d.id} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.2s' }} onMouseOver={(e) => e.currentTarget.style.background = '#f8fafc'} onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}>
                    <td style={{ padding: '16px 24px', fontWeight: 700, color: 'var(--text-main)', fontSize: '1rem' }}>{d.financialYear}</td>
                    <td style={{ padding: '16px 24px', color: 'var(--text-secondary)', fontWeight: 500 }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: d.taxRegime === 'OLD' ? '#eef2ff' : '#eff6ff', color: d.taxRegime === 'OLD' ? '#4f46e5' : '#2563eb', padding: '4px 10px', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 700 }}>
                        {d.taxRegime === 'OLD' ? '🏛️ Old Regime' : '🆕 New Regime'}
                      </span>
                    </td>
                    <td style={{ padding: '16px 24px' }}>
                      <span className={`status-badge ${d.status.toLowerCase()}`} style={{ fontWeight: 700, padding: '6px 12px', borderRadius: '20px', fontSize: '0.8rem' }}>
                        {d.status}
                      </span>
                    </td>
                    <td style={{ padding: '16px 24px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{fmtDate(d.createdAt)}</td>
                    <td style={{ padding: '16px 24px', textAlign: 'center' }}>
                      <button 
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 16px', fontSize: '0.85rem', fontWeight: 700, background: '#fff', color: 'var(--primary)', border: '1.5px solid #e2e8f0', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s' }} 
                        onClick={() => handleViewClick(d)}
                        onMouseOver={(e) => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.background = '#eff6ff'; }}
                        onMouseOut={(e) => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.background = '#fff'; }}
                      >
                        <Eye size={16} /> View
                      </button>
                    </td>
                  </tr>
                ))}
                {currentData.length === 0 && (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)', fontSize: '1.1rem', fontWeight: 600 }}>
                      No {activeTab !== 'ALL' ? activeTab.toLowerCase() : ''} declarations found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '24px', paddingTop: '20px', borderTop: '1px solid #f1f5f9' }}>
            <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 500 }}>
              Showing <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>{filtered.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1}</span> to <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>{Math.min(currentPage * itemsPerPage, filtered.length)}</span> of <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>{filtered.length}</span> entries
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button 
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                style={{ 
                  padding: '8px 16px', border: '1.5px solid #e2e8f0', 
                  background: currentPage === 1 ? '#f8fafc' : '#fff', 
                  color: currentPage === 1 ? '#94a3b8' : 'var(--text-main)',
                  borderRadius: '8px', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', 
                  fontSize: '0.9rem', fontWeight: 600, transition: 'all 0.2s' 
                }}
                onMouseOver={(e) => { if(currentPage !== 1) { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.color = 'var(--primary)'; } }}
                onMouseOut={(e) => { if(currentPage !== 1) { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.color = 'var(--text-main)'; } }}
              >
                Previous
              </button>
              <div style={{ display: 'flex', alignItems: 'center', padding: '0 12px', fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-main)', background: '#f1f5f9', height: '36px', borderRadius: '8px' }}>
                {currentPage} / {totalPages}
              </div>
              <button 
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                style={{ 
                  padding: '8px 16px', border: '1.5px solid #e2e8f0', 
                  background: currentPage === totalPages ? '#f8fafc' : '#fff', 
                  color: currentPage === totalPages ? '#94a3b8' : 'var(--text-main)',
                  borderRadius: '8px', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', 
                  fontSize: '0.9rem', fontWeight: 600, transition: 'all 0.2s' 
                }}
                onMouseOver={(e) => { if(currentPage !== totalPages) { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.color = 'var(--primary)'; } }}
                onMouseOut={(e) => { if(currentPage !== totalPages) { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.color = 'var(--text-main)'; } }}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>

      {viewModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div className="card-iipm printable-modal" style={{ width: '95%', maxWidth: '1000px', height: '95vh', overflowY: 'auto', padding: '0', background: '#e5e7eb', borderRadius: '16px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
            <div className="no-print" style={{ padding: '20px 24px', background: '#ffffff', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 10, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  Form 16 / IT Declaration
                  <span style={{ color: 'var(--primary)', background: '#eff6ff', padding: '4px 10px', borderRadius: '8px', fontSize: '1.1rem' }}>{viewModal.financialYear}</span>
                </h3>
                <div style={{ marginTop: '6px' }}>
                  <span className={`status-badge ${viewModal.status.toLowerCase()}`} style={{ fontSize: '0.75rem', fontWeight: 700, padding: '4px 10px' }}>{viewModal.status}</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                {form16Data && (
                  <button onClick={() => window.print()} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', background: '#153C7D', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer', boxShadow: '0 4px 6px rgba(21, 60, 125, 0.2)', transition: 'all 0.2s' }}
                    onMouseOver={(e) => (e.currentTarget.style.transform = 'translateY(-2px)')}
                    onMouseOut={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
                  >
                    <Printer size={18} /> Print / Download Form 16
                  </button>
                )}
                <button onClick={() => { setViewModal(null); setForm16Data(null); }} style={{ background: '#f1f5f9', border: 'none', cursor: 'pointer', padding: '8px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s' }}
                  onMouseOver={(e) => e.currentTarget.style.background = '#e2e8f0'}
                  onMouseOut={(e) => e.currentTarget.style.background = '#f1f5f9'}
                >
                  <XCircle size={24} color="#64748b" />
                </button>
              </div>
            </div>
            
            <div style={{ padding: '24px' }}>
              {viewModal.status === 'REJECTED' && viewModal.rejectionReason && (
                <div style={{ padding: '16px', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '8px', color: '#991b1b', marginBottom: '20px' }}>
                  <div style={{ fontWeight: 700, marginBottom: '4px' }}>Rejection Reason:</div>
                  <div>{viewModal.rejectionReason}</div>
                </div>
              )}
              
              {loadingForm16 ? (
                <div style={{ textAlign: 'center', padding: '40px', background: '#fff', borderRadius: '8px' }}>
                  <div style={{ fontSize: '2rem', marginBottom: '12px' }}>⏳</div>
                  Generating Form 16 for {viewModal.financialYear}...
                </div>
              ) : form16Data ? (
                <Form16Report form16Data={form16Data} />
              ) : (
                <div style={{ textAlign: 'center', padding: '40px', background: '#fff', borderRadius: '8px' }}>
                  <div style={{ fontSize: '2rem', marginBottom: '12px' }}>📄</div>
                  <p>Form 16 not available for {viewModal.financialYear}.</p>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>This could be because it hasn't been generated yet or the API returned no data.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ITDeclarationHistory;
