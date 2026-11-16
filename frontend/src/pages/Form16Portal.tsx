import React, { useContext, useEffect, useState } from 'react';
import { UserContext } from '../App';
import api from '../services/api';
import Form16Report from '../components/Form16Report';
import { printForm16Document } from '../utils/form16Print';

const Form16Portal: React.FC = () => {
  const userCtx = useContext(UserContext);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form16Data, setForm16Data] = useState<any>(null);
  
  // Controls
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [selectedFormType, setSelectedFormType] = useState<string>('auto');
  const [employees, setEmployees] = useState<any[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');

  const isAdminOrFA = userCtx?.role === 'SUPER_ADMIN' || 
                      userCtx?.role === 'FA_ADMIN' || 
                      userCtx?.role === 'FA_OPERATOR' || 
                      userCtx?.role === 'ADMIN_ADMIN';

  // Load employee list if privileged role
  useEffect(() => {
    if (isAdminOrFA) {
      api.getAllUsers()
        .then(users => {
          if (Array.isArray(users)) {
            setEmployees(users);
          }
        })
        .catch(err => console.error('Error fetching employees:', err));
    }
  }, [isAdminOrFA]);

  // Fetch Form 16 data
  const loadForm16 = (userId: string, year: number) => {
    if (!userId) return;
    setLoading(true);
    setError('');
    api.getForm16(userId, year)
      .then(res => {
        if (res) {
          setForm16Data(res);
        } else {
          setError('No Form 16/130/131 data available for the selected period.');
        }
      })
      .catch(err => {
        console.error(err);
        setError('Could not load tax certificate data. Please check if payroll/tax records exist for this period.');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    const targetUserId = (isAdminOrFA && selectedEmployeeId) ? selectedEmployeeId : userCtx?.userId;
    if (targetUserId) {
      loadForm16(targetUserId, selectedYear);
    }
  }, [userCtx?.userId, selectedEmployeeId, selectedYear, isAdminOrFA]);

  const handlePrint = () => {
    if (form16Data) {
      const typeOverride = selectedFormType === 'auto' ? undefined : selectedFormType;
      printForm16Document(form16Data, typeOverride);
    }
  };

  const activeFormType = selectedFormType === 'auto' ? undefined : selectedFormType;

  return (
    <div className="page-container" style={{ padding: '24px 32px', width: '100%', overflowX: 'hidden' }}>
      {/* Header Bar */}
      <div className="page-header no-print" style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '16px', background: '#ffffff', padding: '20px 28px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', border: '1px solid var(--border)', marginBottom: '20px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            Annual TDS Certificate (Form 16 / Form 130 / Form 131)
          </h1>
          <p style={{ margin: '6px 0 0 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Official TRACES-format TDS certificates for Income-tax Act filing (Form 130 for Salary, Form 131 for Contract/Other, Form 16).
          </p>
        </div>

        {/* Filter Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          {isAdminOrFA && (
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block', color: 'var(--text-muted)', marginBottom: '3px' }}>Employee</label>
              <select 
                className="form-control-iipm" 
                style={{ minWidth: '220px', padding: '6px 12px', fontSize: '0.85rem' }}
                value={selectedEmployeeId || userCtx?.userId || ''}
                onChange={e => setSelectedEmployeeId(e.target.value)}
              >
                {employees.map(emp => (
                  <option key={emp.id || emp.employeeId} value={emp.id || emp.employeeId}>
                    {emp.employeeId} - {emp.name || (emp.firstName + ' ' + (emp.lastName || ''))} ({emp.employeeType || emp.designation || 'Staff'})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block', color: 'var(--text-muted)', marginBottom: '3px' }}>Financial Year</label>
            <select 
              className="form-control-iipm" 
              style={{ minWidth: '140px', padding: '6px 12px', fontSize: '0.85rem' }}
              value={selectedYear}
              onChange={e => setSelectedYear(parseInt(e.target.value))}
            >
              <option value={2026}>2026–2027 (FY 26-27)</option>
              <option value={2025}>2025–2026 (FY 25-26)</option>
              <option value={2024}>2024–2025 (FY 24-25)</option>
            </select>
          </div>

          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block', color: 'var(--text-muted)', marginBottom: '3px' }}>Form Format</label>
            <select 
              className="form-control-iipm" 
              style={{ minWidth: '180px', padding: '6px 12px', fontSize: '0.85rem' }}
              value={selectedFormType}
              onChange={e => setSelectedFormType(e.target.value)}
            >
              <option value="auto">Auto (Smart Statutory)</option>
              <option value="130">FORM NO. 130 (Salary u/s 392)</option>
              <option value="131">FORM NO. 131 (Contract / Other u/s 395)</option>
              <option value="16">FORM NO. 16 (Salary u/s 192)</option>
            </select>
          </div>

          <div style={{ alignSelf: 'flex-end' }}>
            <button 
              onClick={handlePrint} 
              disabled={loading || !form16Data}
              className="btn-primary-iipm" 
              style={{ padding: '8px 20px', cursor: 'pointer', background: '#153C7D', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 6px rgba(21, 60, 125, 0.2)', transition: 'all 0.2s' }}
              onMouseOver={(e) => (e.currentTarget.style.transform = 'translateY(-2px)')}
              onMouseOut={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
            >
              🖨️ Print / Download (TRACES Format)
            </button>
          </div>
        </div>
      </div>

      {loading && (
        <div style={{ textAlign: 'center', padding: '60px', background: '#fff', borderRadius: '12px', border: '1px solid var(--border)' }}>
          <div style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--primary)' }}>Generating TRACES TDS Certificate...</div>
          <div style={{ color: 'var(--text-muted)', marginTop: '8px' }}>Aggregating 12-month payroll, tax deposits, and statutory deductions.</div>
        </div>
      )}

      {error && !loading && (
        <div style={{ padding: '20px', background: '#fee2e2', border: '1px solid #ef4444', borderRadius: '10px', color: '#b91c1c', textAlign: 'center', marginBottom: '20px' }}>
          {error}
        </div>
      )}

      {!loading && form16Data && (
        <div style={{ maxWidth: '100%', overflowX: 'auto', padding: '24px', background: '#f1f5f9', borderRadius: '12px', border: '1px solid var(--border)' }}>
          <Form16Report form16Data={form16Data} formTypeOverride={activeFormType} />
        </div>
      )}
    </div>
  );
};

export default Form16Portal;
