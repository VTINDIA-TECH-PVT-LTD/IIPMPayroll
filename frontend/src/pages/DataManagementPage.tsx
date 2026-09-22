import React, { useState, useRef, useEffect } from 'react';
import apiService from '../services/api';
import { UploadCloud, DownloadCloud, Info, X } from 'lucide-react';

const DataManagementPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (message) {
      timer = setTimeout(() => setMessage(''), 5000);
    }
    return () => clearTimeout(timer);
  }, [message]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (error) {
      timer = setTimeout(() => setError(''), 5000);
    }
    return () => clearTimeout(timer);
  }, [error]);

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fileInputRef.current?.files?.[0]) {
      setError('Please select an Excel file to import.');
      return;
    }
    const file = fileInputRef.current.files[0];
    
    try {
      setLoading(true);
      setError('');
      setMessage('');
      const response = await apiService.importData('employees', file);
      setMessage(response);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err: any) {
      setError(err.message || 'Failed to import data');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (month: number, year: number) => {
    try {
      setLoading(true);
      setError('');
      setMessage('');
      
      const blob = await apiService.exportSalaryRegister(month, year);
      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Salary_Register_${month}_${year}.xlsx`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      setMessage('Export downloaded successfully!');
    } catch (err: any) {
      setError(err.message || 'Failed to export data');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Data Management</h1>
        <p>Import or export Excel files as per client requirements</p>
      </div>

      {error && (
        <div style={{ padding: '16px', background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', borderRadius: '12px', marginBottom: '24px', display: 'flex', alignItems: 'center' }}>
          <span style={{ fontWeight: 500 }}>{error}</span>
          <button onClick={() => setError('')} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#991b1b', display: 'flex' }}><X size={18} /></button>
        </div>
      )}
      {message && (
        <div style={{ padding: '16px', background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534', borderRadius: '12px', marginBottom: '24px', display: 'flex', alignItems: 'center' }}>
          <span style={{ fontWeight: 500 }}>{message}</span>
          <button onClick={() => setMessage('')} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#166534', display: 'flex' }}><X size={18} /></button>
        </div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>
        {/* Import Section */}
        <div className="card-iipm" style={{ padding: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '1px solid var(--border)', paddingBottom: '16px', marginBottom: '24px' }}>
            <div style={{ background: '#eff6ff', color: '#3b82f6', padding: '10px', borderRadius: '12px' }}>
              <UploadCloud size={24} />
            </div>
            <h3 style={{ margin: 0, color: 'var(--text-primary)' }}>Import Client Data</h3>
          </div>
          <p style={{ color: 'var(--text-muted)', marginBottom: '20px', fontSize: '0.95rem' }}>
            Upload the <strong>payroll purpose.xlsx</strong> file provided by the client to bulk-import Employees. 
            User accounts and default payroll properties will be created automatically.
          </p>
          <div style={{ display: 'flex', gap: '12px', background: '#f8fafc', border: '1px solid #e2e8f0', padding: '16px', borderRadius: '12px', marginBottom: '24px' }}>
            <Info size={20} color="#3b82f6" style={{ flexShrink: 0 }} />
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
              <strong>Tip:</strong> Uploading the client sheet is the fastest way to onboarding all employees. Ensure columns match the expected format exactly.
            </span>
          </div>
          <form onSubmit={handleImport}>
            <div style={{ border: '2px dashed #cbd5e1', borderRadius: '12px', padding: '32px 20px', textAlign: 'center', marginBottom: '24px', background: '#f8fafc', transition: 'all 0.2s', cursor: 'pointer' }} onMouseOver={e=>e.currentTarget.style.borderColor='#3b82f6'} onMouseOut={e=>e.currentTarget.style.borderColor='#cbd5e1'} onClick={() => fileInputRef.current?.click()}>
              <UploadCloud size={32} color="#94a3b8" style={{ marginBottom: '12px' }} />
              <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>Click or drag Excel file to upload</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>.xlsx or .xls formats supported</div>
              <input 
                type="file" 
                accept=".xlsx, .xls" 
                ref={fileInputRef} 
                style={{ display: 'none' }}
                onChange={() => { if(fileInputRef.current?.files?.length) setMessage('File selected: ' + fileInputRef.current.files[0].name) }}
              />
            </div>
            <button type="submit" className="btn-primary-iipm" disabled={loading} style={{ width: '100%', justifyContent: 'center', padding: '14px' }}>
              {loading ? 'Processing...' : 'Upload & Import Data'}
            </button>
          </form>
        </div>

        {/* Export Section */}
        <div className="card-iipm" style={{ padding: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '1px solid var(--border)', paddingBottom: '16px', marginBottom: '24px' }}>
            <div style={{ background: '#f0fdf4', color: '#22c55e', padding: '10px', borderRadius: '12px' }}>
              <DownloadCloud size={24} />
            </div>
            <h3 style={{ margin: 0, color: 'var(--text-primary)' }}>Export Salary Register</h3>
          </div>
          <p style={{ color: 'var(--text-muted)', marginBottom: '20px', fontSize: '0.95rem' }}>
            Download the monthly salary register (containing Basic, DA, HRA, Gross, Deductions, and Net pay) 
            in the exact Excel format requested by the client.
          </p>
          <div style={{ display: 'flex', gap: '12px', background: '#f8fafc', border: '1px solid #e2e8f0', padding: '16px', borderRadius: '12px', marginBottom: '24px' }}>
            <Info size={20} color="#f59e0b" style={{ flexShrink: 0 }} />
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
              <strong>Requirement:</strong> You must first generate and process salaries in the 'Payroll Management' tab before downloading the complete register here.
            </span>
          </div>
          
          <div style={{ display: 'grid', gap: '16px' }}>
            <button onClick={() => handleExport(7, 2026)} className="btn-success-iipm" disabled={loading} style={{ justifyContent: 'center', padding: '14px' }}>
              <DownloadCloud size={18} /> Export July 2026 Register
            </button>
            <button onClick={() => handleExport(8, 2026)} className="btn-success-iipm" disabled={loading} style={{ justifyContent: 'center', padding: '14px' }}>
              <DownloadCloud size={18} /> Export August 2026 Register
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DataManagementPage;
