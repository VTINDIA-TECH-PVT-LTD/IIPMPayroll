import React, { useState, useRef } from 'react';
import apiService from '../services/api';

const DataManagementPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

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

      {message && <div className="alert-success" style={{ padding: '12px', background: '#dcfce7', color: '#166534', borderRadius: '4px', marginBottom: '20px' }}>{message}</div>}
      {error && <div className="alert-danger" style={{ padding: '12px', background: '#fee2e2', color: '#991b1b', borderRadius: '4px', marginBottom: '20px' }}>{error}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', padding: '16px' }}>
        {/* Import Section */}
        <div className="card-iipm" style={{ padding: '24px' }}>
          <h3 style={{ borderBottom: '1px solid var(--border)', paddingBottom: '12px', marginBottom: '20px', color: 'var(--primary)' }}>
            📤 Import Client Excel Data
          </h3>
          <p style={{ color: 'var(--text-muted)', marginBottom: '16px', fontSize: '0.9rem' }}>
            Upload the `payroll purpose.xlsx` file provided by the client to bulk-import Employees. 
            User accounts and default payroll properties will be created automatically.
          </p>
          <div style={{ background: 'var(--bg-hover)', padding: '12px', borderRadius: '8px', marginBottom: '20px', fontSize: '0.85rem' }}>
            <strong>Note:</strong> Uploading the client sheet is the fastest way to get all employees into the system without manual typing. Please ensure the column names match the expected format.
          </div>
          <form onSubmit={handleImport}>
            <div style={{ marginBottom: '16px' }}>
              <input 
                type="file" 
                accept=".xlsx, .xls" 
                ref={fileInputRef} 
                className="form-control-iipm"
                style={{ padding: '10px' }}
              />
            </div>
            <button type="submit" className="btn-primary-iipm" disabled={loading} style={{ width: '100%' }}>
              {loading ? 'Processing...' : 'Upload & Import Data'}
            </button>
          </form>
        </div>

        {/* Export Section */}
        <div className="card-iipm" style={{ padding: '24px' }}>
          <h3 style={{ borderBottom: '1px solid var(--border)', paddingBottom: '12px', marginBottom: '20px', color: 'var(--primary)' }}>
            📥 Export Salary Register
          </h3>
          <p style={{ color: 'var(--text-muted)', marginBottom: '16px', fontSize: '0.9rem' }}>
            Download the monthly salary register (containing Basic, DA, HRA, Gross, Deductions, and Net pay) 
            in the exact Excel format requested by the client.
          </p>
          <div style={{ background: 'var(--bg-hover)', padding: '12px', borderRadius: '8px', marginBottom: '20px', fontSize: '0.85rem' }}>
            <strong>Note:</strong> You must first generate and process salaries in the 'Salary Processing' tab before you can download the complete monthly register here.
          </div>
          
          <div style={{ display: 'grid', gap: '12px' }}>
            <button onClick={() => handleExport(7, 2026)} className="btn-accent-iipm" disabled={loading}>
              Export July 2026 Register (.xlsx)
            </button>
            <button onClick={() => handleExport(8, 2026)} className="btn-accent-iipm" disabled={loading}>
              Export August 2026 Register (.xlsx)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DataManagementPage;
