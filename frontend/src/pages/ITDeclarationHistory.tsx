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
    <div className="page-container" style={{ maxWidth: '1000px', margin: '0 auto' }}>
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

        <div style={{ padding: '20px' }}>
          <div style={{ display: 'flex', gap: '16px', marginBottom: '20px', alignItems: 'center' }}>
            <input 
              className="form-control-iipm" 
              placeholder="🔍  Search by financial year, regime..." 
              value={search}
              onChange={e => setSearch(e.target.value)} 
              style={{ maxWidth: '400px' }} 
            />
            <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginLeft: 'auto' }}>
              {filtered.length} of {declarations.length} declarations
            </span>
          </div>

          <div style={{ overflowX: 'auto', margin: '0 -20px' }}>
            <table className="table-iipm">
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  <th>Financial Year</th>
                  <th>Tax Regime</th>
                  <th>Status</th>
                  <th>Submitted On</th>
                  <th style={{ textAlign: 'center' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {currentData.map((d: any) => (
                  <tr key={d.id}>
                    <td style={{ fontWeight: 600 }}>{d.financialYear}</td>
                    <td>{d.taxRegime === 'OLD' ? 'Old Regime' : 'New Regime'}</td>
                    <td>
                      <span className={`status-badge ${d.status.toLowerCase()}`}>
                        {d.status}
                      </span>
                    </td>
                    <td>{fmtDate(d.createdAt)}</td>
                    <td style={{ textAlign: 'center' }}>
                      <button className="btn-secondary-iipm" style={{ padding: '6px 12px', fontSize: '0.8rem' }} onClick={() => handleViewClick(d)}>
                        <Eye size={14} style={{ marginRight: '6px' }}/> View
                      </button>
                    </td>
                  </tr>
                ))}
                {currentData.length === 0 && (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                      No {activeTab !== 'ALL' ? activeTab.toLowerCase() : ''} declarations found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px' }}>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Showing {filtered.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filtered.length)} of {filtered.length} entries
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button 
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                style={{ padding: '6px 12px', border: '1px solid var(--border)', background: currentPage === 1 ? 'var(--bg-hover)' : '#fff', borderRadius: '6px', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', fontSize: '0.85rem' }}>
                Previous
              </button>
              <span style={{ display: 'flex', alignItems: 'center', padding: '0 8px', fontSize: '0.85rem', fontWeight: 600 }}>
                Page {currentPage} of {totalPages}
              </span>
              <button 
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                style={{ padding: '6px 12px', border: '1px solid var(--border)', background: currentPage === totalPages ? 'var(--bg-hover)' : '#fff', borderRadius: '6px', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', fontSize: '0.85rem' }}>
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
          <div className="card-iipm printable-modal" style={{ width: '95%', maxWidth: '1000px', height: '95vh', overflowY: 'auto', padding: '0', background: '#e5e7eb' }}>
            <div className="no-print" style={{ padding: '15px 20px', background: '#fff', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 10 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700 }}>Form 16 / IT Declaration: {viewModal.financialYear}</h3>
                <span className={`status-badge ${viewModal.status.toLowerCase()}`} style={{ marginTop: '8px', display: 'inline-block' }}>{viewModal.status}</span>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                {form16Data && (
                  <button onClick={() => window.print()} className="btn-secondary-iipm" style={{ padding: '8px 16px', background: '#153C7D', color: 'white', border: 'none' }}>
                    <Printer size={16} style={{ marginRight: '6px' }} /> Print / Download Form 16
                  </button>
                )}
                <button onClick={() => { setViewModal(null); setForm16Data(null); }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px' }}>
                  <XCircle size={28} color="var(--text-muted)" />
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
