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
    <div className="page-container" style={{ maxWidth: '1000px', margin: '0 auto', background: '#e5e7eb', padding: '20px' }}>
      <div className="no-print" style={{ textAlign: 'center', marginBottom: '20px' }}>
        <button onClick={() => window.print()} style={{ padding: '10px 24px', cursor: 'pointer', background: '#153C7D', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '16px' }}>
          🖨️ Print / Download Form 16
        </button>
      </div>

      <Form16Report form16Data={form16Data} />
    </div>
  );
};

export default Form16Portal;
