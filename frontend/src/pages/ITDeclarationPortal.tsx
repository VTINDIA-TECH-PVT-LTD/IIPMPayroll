import React, { useState, useEffect, useContext } from 'react';
import { UserContext } from '../App';
import apiService from '../services/api';

const ITDeclarationPortal = () => {
  const userCtx = useContext(UserContext);
  const userId = userCtx?.userId;
  
  const [section80C, setSection80C] = useState<number | ''>('');
  const [section80D, setSection80D] = useState<number | ''>('');
  const [hraExemption, setHraExemption] = useState<number | ''>('');
  const [homeLoanInterest, setHomeLoanInterest] = useState<number | ''>('');
  const [status, setStatus] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (userId) {
      loadDeclaration();
    }
  }, [userId]);

  const loadDeclaration = async () => {
    try {
      setLoading(true);
      const currentYear = new Date().getFullYear().toString();
      const res = await apiService.getItDeclaration(userId as string, currentYear);
      if (res && res.data) {
        const dec = res.data;
        setSection80C(dec.section80C || '');
        setSection80D(dec.section80D || '');
        setHraExemption(dec.hraExemption || '');
        setHomeLoanInterest(dec.homeLoanInterest || '');
        setStatus(dec.status || 'PENDING');
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
    try {
      setLoading(true);
      const data = {
        userId,
        financialYear: new Date().getFullYear().toString(),
        section80C: Number(section80C),
        section80D: Number(section80D),
        hraExemption: Number(hraExemption),
        homeLoanInterest: Number(homeLoanInterest),
        status: 'PENDING'
      };
      await apiService.saveItDeclaration(data);
      setMessage('IT Declaration submitted successfully.');
      setStatus('PENDING');
    } catch (error) {
      console.error(error);
      setMessage('Error submitting IT Declaration.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="page-container">Loading...</div>;

  const isReadOnly = status === 'APPROVED' || status === 'PENDING';

  return (
    <div className="page-container">
      <h2>IT Declaration</h2>
      {message && <div style={{ marginBottom: '1rem', color: 'blue' }}>{message}</div>}
      <div style={{ marginBottom: '1rem' }}>
        <strong>Status: </strong> 
        <span>{status || 'NOT SUBMITTED'}</span>
      </div>
      
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '400px' }}>
        <div className="form-group">
          <label>Section 80C Amount:</label>
          <input 
            type="number" 
            value={section80C} 
            onChange={(e) => setSection80C(Number(e.target.value))}
            disabled={isReadOnly}
            required
            className="form-control"
          />
        </div>
        <div className="form-group">
          <label>Section 80D Amount:</label>
          <input 
            type="number" 
            value={section80D} 
            onChange={(e) => setSection80D(Number(e.target.value))}
            disabled={isReadOnly}
            required
            className="form-control"
          />
        </div>
        <div className="form-group">
          <label>HRA Exemption:</label>
          <input 
            type="number" 
            value={hraExemption} 
            onChange={(e) => setHraExemption(Number(e.target.value))}
            disabled={isReadOnly}
            required
            className="form-control"
          />
        </div>
        <div className="form-group">
          <label>Home Loan Interest:</label>
          <input 
            type="number" 
            value={homeLoanInterest} 
            onChange={(e) => setHomeLoanInterest(Number(e.target.value))}
            disabled={isReadOnly}
            required
            className="form-control"
          />
        </div>
        {!isReadOnly && <button type="submit" className="btn btn-primary">Submit Declaration</button>}
        {status === 'PENDING' && <p>Your declaration is under review and cannot be modified.</p>}
        {status === 'APPROVED' && <p style={{ color: 'green' }}>Your declaration has been approved.</p>}
        {status === 'REJECTED' && <p style={{ color: 'red' }}>Your declaration was rejected. Please update and resubmit.</p>}
      </form>
    </div>
  );
};

export default ITDeclarationPortal;
