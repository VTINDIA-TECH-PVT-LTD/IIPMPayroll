import React, { useContext, useEffect, useState } from 'react';
import { UserContext } from '../App';
import api from '../services/api';
import Form16Report from '../components/Form16Report';

const Form16Portal: React.FC = () => {
  const userCtx = useContext(UserContext);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form16Data, setForm16Data] = useState<any>(null);

  // Fetch Form 16 data
  useEffect(() => {
    if (userCtx?.userId) {
      setLoading(true);
      const now = new Date();
      // FY starts April. If month >= April use current year, else use previous year
      const fyStartYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
      api.getForm16(userCtx.userId, fyStartYear)
        .then(res => {
          if (res) setForm16Data(res);
        })
        .catch(err => {
          console.error(err);
          setError('Could not load Form 16 data. Please try again.');
        })
        .finally(() => setLoading(false));
    }
  }, [userCtx?.userId]);

  if (loading) return <div className="page-container" style={{ textAlign: 'center', marginTop: '50px' }}>Loading Form 16...</div>;
  if (error) return <div className="page-container" style={{ color: 'red', textAlign: 'center', marginTop: '50px' }}>{error}</div>;
  if (!form16Data) return null;

  return (
    <div className="page-container" style={{ padding: '24px 32px', width: '100%', overflowX: 'hidden' }}>
      <div className="page-header no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', background: '#ffffff', padding: '24px 28px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03)', border: '1px solid var(--border)', marginBottom: '24px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)' }}>Form 16</h1>
          <p style={{ margin: '8px 0 0 0', color: 'var(--text-muted)', fontSize: '0.95rem' }}>View, print, and download your official Form 16 document for tax filing.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button onClick={() => window.print()} className="btn-primary-iipm" style={{ padding: '10px 24px', cursor: 'pointer', background: '#153C7D', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 6px rgba(21, 60, 125, 0.2)', transition: 'all 0.2s' }}
            onMouseOver={(e) => (e.currentTarget.style.transform = 'translateY(-2px)')}
            onMouseOut={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
          >
            🖨️ Print / Download Form 16
          </button>
        </div>
      </div>

      <div style={{ maxWidth: '100%', overflowX: 'auto', padding: '20px', background: '#f8fafc', borderRadius: '12px', border: '1px solid var(--border)' }}>
        <Form16Report form16Data={form16Data} />
      </div>
    </div>
  );
};

export default Form16Portal;
