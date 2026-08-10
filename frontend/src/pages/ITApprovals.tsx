import React, { useState, useEffect } from 'react';
import apiService from '../services/api';

const STATUS_TABS = ['ALL', 'PENDING', 'APPROVED', 'REJECTED'];

const statusColors: Record<string, { bg: string; color: string }> = {
  PENDING:  { bg: '#fef3c7', color: '#d97706' },
  APPROVED: { bg: '#d1fae5', color: '#059669' },
  REJECTED: { bg: '#fee2e2', color: '#dc2626' },
};

const ITApprovals = () => {
  const [declarations, setDeclarations] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('ALL');

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    try {
      setLoading(true);
      const res = await apiService.api.get('/it-declarations/all');
      const data = res.data?.data || res.data;
      if (Array.isArray(data)) setDeclarations(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    try {
      await apiService.api.put(`/it-declarations/${id}/status`, { status: newStatus });
      // Update locally so it moves to the right tab
      setDeclarations(prev => prev.map(d => (d.id || d._id) === id ? { ...d, status: newStatus } : d));
    } catch (e) {
      console.error('Failed to update status', e);
    }
  };

  const fmt = (n: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);

  const counts = {
    ALL: declarations.length,
    PENDING: declarations.filter(d => d.status === 'PENDING').length,
    APPROVED: declarations.filter(d => d.status === 'APPROVED').length,
    REJECTED: declarations.filter(d => d.status === 'REJECTED').length,
  } as Record<string, number>;

  const filtered = activeTab === 'ALL' ? declarations : declarations.filter(d => d.status === activeTab);

  if (loading) return (
    <div className="page-container">
      <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '40px' }}>Loading IT Declarations...</p>
    </div>
  );

  return (
    <div className="page-container">
      <div className="card-iipm" style={{ padding: '0' }}>
        {/* Header */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3>IT Declaration Approvals</h3>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{filtered.length} records</span>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '0', borderBottom: '1px solid var(--border)', padding: '0 20px' }}>
          {STATUS_TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '12px 20px',
                border: 'none',
                borderBottom: activeTab === tab ? '2px solid var(--primary)' : '2px solid transparent',
                background: 'none',
                cursor: 'pointer',
                fontWeight: activeTab === tab ? 700 : 400,
                color: activeTab === tab ? 'var(--primary)' : 'var(--text-muted)',
                fontSize: '0.85rem',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.2s',
              }}
            >
              {tab.charAt(0) + tab.slice(1).toLowerCase()}
              <span style={{
                background: activeTab === tab ? 'var(--primary)' : '#e5e7eb',
                color: activeTab === tab ? '#fff' : 'var(--text-muted)',
                borderRadius: '999px',
                padding: '1px 7px',
                fontSize: '0.7rem',
                fontWeight: 700,
              }}>
                {counts[tab]}
              </span>
            </button>
          ))}
        </div>

        {/* Table */}
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>📋</div>
            <p>No {activeTab === 'ALL' ? '' : activeTab.toLowerCase()} declarations found.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto', padding: '20px' }}>
            <table className="table-iipm" style={{ whiteSpace: 'nowrap' }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  <th>Employee Name</th>
                  <th>Year</th>
                  <th>80C</th>
                  <th>80D</th>
                  <th>HRA Exemption</th>
                  <th>Home Loan Int.</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((d: any) => {
                  const id = d.id || d._id;
                  const sc = statusColors[d.status] || { bg: '#f3f4f6', color: '#6b7280' };
                  return (
                    <tr key={id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{d.employeeName || d.userId}</div>
                        {d.employeeId && d.employeeId !== d.employeeName && (
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{d.employeeId}</div>
                        )}
                      </td>
                      <td>{d.financialYear}</td>
                      <td>{fmt(d.section80C)}</td>
                      <td>{fmt(d.section80D)}</td>
                      <td>{fmt(d.hraExemption)}</td>
                      <td>{fmt(d.homeLoanInterest)}</td>
                      <td>
                        <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700, background: sc.bg, color: sc.color }}>
                          {d.status}
                        </span>
                      </td>
                      <td>
                        {d.status === 'PENDING' ? (
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button onClick={() => handleUpdateStatus(id, 'APPROVED')}
                              style={{ background: '#10b981', color: '#fff', border: 'none', padding: '6px 14px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}>
                              Approve
                            </button>
                            <button onClick={() => handleUpdateStatus(id, 'REJECTED')}
                              style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '6px 14px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}>
                              Reject
                            </button>
                          </div>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontStyle: 'italic' }}>
                            {d.status === 'APPROVED' ? '✅ Approved' : '❌ Rejected'}
                          </span>
                        )}
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
