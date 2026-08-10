import React, { useState, useEffect, useContext, useRef } from 'react';
import * as XLSX from 'xlsx';
import apiService from '../services/api';
import { UserContext } from '../App';
import payMatrixData from '../payMatrix.json';

const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const payMatrix: Record<string, number[]> = payMatrixData;

const UserManagement: React.FC = () => {
  const userCtx = useContext(UserContext);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editUser, setEditUser] = useState<any | null>(null);
  const [search, setSearch] = useState('');
  useEffect(() => { setCurrentPage(1); }, [search]);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [showPassword, setShowPassword] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const emptyForm = {
    username: '', password: '', firstName: '', lastName: '',
    email: '', phone: '', role: 'EMPLOYEE', designation: '', department: '',
    payLevel: '7', payIndex: '1', basicPay: '', employeeId: '',
    bankAccountNumber: '', ifscCode: '', bankName: '',
    pan: '', aadhar: '', employeeType: 'PERMANENT',
    function: 'Regular', location: 'Visakhapatnam', taxRegime: 'Regular Tax Regime',
    pfAccountNumber: '', pranAccountNumber: ''
  };
  const [form, setForm] = useState(emptyForm);

  const departments = ['Academic', 'Finance', 'Administration', 'Research', 'Library', 'IT', 'Maintenance', 'Security'];
  // The levels available in the matrix
  const levels = Object.keys(payMatrix).sort((a, b) => {
    // Sort numerically, handling '13A'
    const aN = parseFloat(a.replace('A', '.5'));
    const bN = parseFloat(b.replace('A', '.5'));
    return aN - bN;
  });

  useEffect(() => { loadUsers(); }, []);

  // Auto-fill basic pay when payLevel or payIndex changes (if no manual override)
  useEffect(() => {
    if (!editUser && form.payLevel && form.payIndex) {
      const cells = payMatrix[form.payLevel];
      if (cells) {
        // Cells are 1-indexed for the user, 0-indexed in the array
        const index = parseInt(form.payIndex, 10) - 1;
        if (index >= 0 && index < cells.length) {
          setForm(f => ({ ...f, basicPay: String(cells[index]) }));
        }
      }
    }
  }, [form.payLevel, form.payIndex]);

  const loadUsers = async () => {
    try { setLoading(true); const data = await apiService.getAllUsers(); setUsers(data); }
    catch { setMsg({ type: 'error', text: 'Failed to load users.' }); }
    finally { setLoading(false); }
  };

  const openCreate = () => { setEditUser(null); setForm(emptyForm); setShowModal(true); };
  const openEdit = (u: any) => {
    setEditUser(u);
    setForm({
      username: u.username || '', password: '',
      firstName: u.firstName || '', lastName: u.lastName || '',
      email: u.email || '', phone: u.phone || '',
      role: u.role || 'EMPLOYEE', designation: u.designation || '',
      department: u.department || '', payLevel: u.payLevel || '7',
      payIndex: String(u.payIndex || '1'), basicPay: String(u.basicPay || ''),
      employeeId: u.employeeId || '',
      bankAccountNumber: u.bankAccountNumber || '', ifscCode: u.ifscCode || '', bankName: u.bankName || '',
      pan: u.pan || '', aadhar: u.aadhar || '', employeeType: u.employeeType || 'PERMANENT',
      function: u.function || 'Regular', location: u.location || 'Visakhapatnam', taxRegime: u.taxRegime || 'Regular Tax Regime',
      pfAccountNumber: u.pfAccountNumber || '', pranAccountNumber: u.pranAccountNumber || ''
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.username || !form.firstName || !form.employeeId || (!editUser && !form.password)) {
      setMsg({ type: 'error', text: 'Username, Password, First Name, and Employee ID are required.' }); return;
    }
    try {
      setLoading(true);
      const payload = { ...form, basicPay: parseFloat(form.basicPay) || 0, payIndex: parseInt(form.payIndex) || 1, isActive: true };
      if (editUser) { await apiService.updateUser(editUser.id, payload); setMsg({ type: 'success', text: 'Employee updated.' }); }
      else { await apiService.createUser(payload); setMsg({ type: 'success', text: 'Employee created.' }); }
      setShowModal(false); loadUsers();
    } catch (e: any) { setMsg({ type: 'error', text: e.response?.data?.message || 'Save failed.' }); }
    finally { setLoading(false); }
  };

  const handleDeactivate = async (id: string, active: boolean) => {
    try {
      const existingUser = users.find(u => u.id === id);
      if (!existingUser) return;
      await apiService.updateUser(id, { ...existingUser, isActive: !active });
      setMsg({ type: 'success', text: `Employee ${active ? 'deactivated' : 'activated'}.` });
      loadUsers();
    } catch { setMsg({ type: 'error', text: 'Update failed.' }); }
  };

  const filtered = users.filter(u =>
    `${u.firstName} ${u.lastName} ${u.employeeId} ${u.department} ${u.designation} ${u.role}`
      .toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage));
  const currentData = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) setSelectedUsers(filtered.map(u => u.id));
    else setSelectedUsers([]);
  };

  const handleSelect = (id: string) => {
    if (selectedUsers.includes(id)) setSelectedUsers(selectedUsers.filter(u => u !== id));
    else setSelectedUsers([...selectedUsers, id]);
  };

  const downloadTemplate = () => {
    const ws = XLSX.utils.json_to_sheet([{
      'Employee ID': '', 'First Name': '', 'Last Name': '', 'Username': '', 'Email': '', 'Phone': '',
      'Department': '', 'Designation': '', 'Role': 'EMPLOYEE', 'Employee Type': 'PERMANENT', 'Function': 'Regular',
      'Pay Level': '7', 'Pay Index': '1', 'Basic Pay': '', 'PAN': '', 'Aadhar': '',
      'Bank Name': '', 'Bank Account Number': '', 'IFSC Code': '', 'PF Account Number': '', 'PRAN Account Number': ''
    }]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Employees");
    XLSX.writeFile(wb, "Employee_Import_Template.xlsx");
  };

  const exportUsers = () => {
    const data = filtered.map(u => ({
      'Employee ID': u.employeeId, 'First Name': u.firstName, 'Last Name': u.lastName, 'Username': u.username, 'Email': u.email, 'Phone': u.phone,
      'Department': u.department, 'Designation': u.designation, 'Role': u.role, 'Employee Type': u.employeeType, 'Function': u.function,
      'Pay Level': u.payLevel, 'Pay Index': u.payIndex, 'Basic Pay': u.basicPay, 'PAN': u.pan, 'Aadhar': u.aadhar,
      'Bank Name': u.bankName, 'Bank Account Number': u.bankAccountNumber, 'IFSC Code': u.ifscCode, 'PF Account Number': u.pfAccountNumber, 'PRAN Account Number': u.pranAccountNumber
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Employees");
    XLSX.writeFile(wb, "Employees_Export.xlsx");
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        setLoading(true);
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);
        
        const payload = data.map((row: any) => ({
          employeeId: String(row['Employee ID'] || ''),
          firstName: String(row['First Name'] || ''),
          lastName: String(row['Last Name'] || ''),
          username: String(row['Username'] || ''),
          email: String(row['Email'] || ''),
          phone: String(row['Phone'] || ''),
          department: String(row['Department'] || ''),
          designation: String(row['Designation'] || ''),
          role: String(row['Role'] || 'EMPLOYEE'),
          employeeType: String(row['Employee Type'] || 'PERMANENT'),
          function: String(row['Function'] || 'Regular'),
          payLevel: String(row['Pay Level'] || '7'),
          payIndex: parseInt(String(row['Pay Index'] || '1')),
          basicPay: parseFloat(String(row['Basic Pay'] || '0')),
          pan: String(row['PAN'] || ''),
          aadhar: String(row['Aadhar'] || ''),
          bankName: String(row['Bank Name'] || ''),
          bankAccountNumber: String(row['Bank Account Number'] || ''),
          ifscCode: String(row['IFSC Code'] || ''),
          pfAccountNumber: String(row['PF Account Number'] || ''),
          pranAccountNumber: String(row['PRAN Account Number'] || ''),
          isActive: true
        })).filter(u => u.employeeId && u.username);
        
        await apiService.api.post('/users/bulk', payload);
        setMsg({ type: 'success', text: `Successfully imported ${payload.length} employees.` });
        loadUsers();
      } catch (err: any) {
        setMsg({ type: 'error', text: 'Error importing employees: ' + (err.response?.data?.message || err.message) });
      } finally {
        setLoading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleBulkDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete ${selectedUsers.length} employees?`)) return;
    try {
      setLoading(true);
      await apiService.api.delete('/users/bulk', { data: selectedUsers });
      setMsg({ type: 'success', text: `Deleted ${selectedUsers.length} employees.` });
      setSelectedUsers([]);
      loadUsers();
    } catch (err: any) {
      setMsg({ type: 'error', text: 'Bulk delete failed: ' + (err.response?.data?.message || err.message) });
    } finally {
      setLoading(false);
    }
  };



  const roleColor: Record<string, string> = { ADMIN: '#8b5cf6', PAYROLL_OFFICER: '#3b82f6', EMPLOYEE: '#22c55e' };

  return (
    <div className="page-container">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1>Employee Management</h1>
          <p>Add and manage employee records, pay levels, and salary details</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {selectedUsers.length > 0 && apiService.isSuperAdmin() && (
            <button className="btn-iipm" onClick={handleBulkDelete} style={{ background: '#ef4444', color: 'white', border: 'none' }}>
              Delete Selected ({selectedUsers.length})
            </button>
          )}
          <input type="file" accept=".xlsx, .xls, .csv" ref={fileInputRef} onChange={handleFileUpload} style={{ display: 'none' }} />
          {(apiService.isAdminAdmin() || apiService.isSuperAdmin()) && (
            <>
              <button className="btn-outline-iipm" onClick={downloadTemplate}>Download Template</button>
              <button className="btn-outline-iipm" onClick={() => fileInputRef.current?.click()}>Bulk Import</button>
              <button className="btn-outline-iipm" onClick={exportUsers}>Export All</button>
            </>
          )}
          <button className="btn-accent-iipm" onClick={openCreate}>+ Add Employee</button>
        </div>
      </div>

      {msg && (
        <div className={`alert-iipm ${msg.type === 'success' ? 'alert-success' : 'alert-danger'}`} style={{ marginBottom: '16px' }}>
          {msg.text}
          <button onClick={() => setMsg(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}>✕</button>
        </div>
      )}

      {/* Search + Stats */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '20px', alignItems: 'center' }}>
        <input className="form-control-iipm" placeholder="🔍  Search by name, ID, department..." value={search}
          onChange={e => setSearch(e.target.value)} style={{ maxWidth: '400px' }} />
        <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginLeft: 'auto' }}>
          {filtered.length} of {users.length} employees
        </span>
      </div>

      {/* Table */}
      <div className="card-iipm" style={{ padding: 0 }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Loading...</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="table-iipm">
              <thead>
                <tr>
                  <th style={{ width: '40px' }}>
                    <input type="checkbox" onChange={handleSelectAll} checked={selectedUsers.length === filtered.length && filtered.length > 0} />
                  </th>
                  <th>Employee ID</th>
                  <th>Name</th>
                  <th>Department</th>
                  <th>Designation</th>
                  <th>Pay Level</th>
                  <th>Basic Pay</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {currentData.map(u => (
                  <tr key={u.id} style={{ background: selectedUsers.includes(u.id) ? 'var(--bg-hover)' : '' }}>
                    <td>
                      <input type="checkbox" checked={selectedUsers.includes(u.id)} onChange={() => handleSelect(u.id)} />
                    </td>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.82rem' }}>{u.employeeId}</td>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{u.firstName} {u.lastName}</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{u.email}</div>
                    </td>
                    <td>{u.department || '—'}</td>
                    <td>{u.designation || '—'}</td>
                    <td>
                      {u.payLevel ? <span className="badge-iipm badge-accent">Level {u.payLevel}</span> : '—'}
                    </td>
                    <td style={{ fontWeight: 600 }}>
                      {u.basicPay ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(u.basicPay) : '—'}
                    </td>
                    <td>
                      <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: '20px', fontSize: '0.73rem', fontWeight: 700, background: `${roleColor[u.role]}20`, color: roleColor[u.role] }}>
                        {(u.role || '').replace('_', ' ')}
                      </span>
                    </td>
                    <td>
                      <span className={`badge-iipm ${u.isActive ? 'badge-success' : 'badge-danger'}`}>
                        {u.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <button onClick={() => openEdit(u)} style={{ padding: '4px 10px', borderRadius: '6px', border: 'none', background: 'rgba(59,130,246,0.15)', color: '#3b82f6', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, marginRight: '6px', fontFamily: 'var(--font)' }}>
                        {apiService.isAdminOperator() ? 'View' : 'Edit'}
                      </button>
                      {(apiService.isSuperAdmin() || apiService.isAdminAdmin()) && (
                        <button onClick={() => handleDeactivate(u.id, u.isActive)} style={{ padding: '4px 10px', borderRadius: '6px', border: 'none', background: u.isActive ? 'rgba(239,68,68,0.15)' : 'rgba(34,197,94,0.15)', color: u.isActive ? '#ef4444' : '#22c55e', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, fontFamily: 'var(--font)' }}>
                          {u.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={9} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>No employees found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="modal-iipm-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-iipm" style={{ maxWidth: '760px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header-iipm">
              <h3>{editUser ? 'Edit Employee' : 'Add New Employee'}</h3>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body-iipm" style={{ maxHeight: '65vh', overflowY: 'auto' }}>

                {/* Section: Personal */}
                <div style={{ marginBottom: '20px' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>Personal Information</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div><label className="form-label-iipm">First Name *</label><input className="form-control-iipm" value={form.firstName} onChange={e => setForm({ ...form, firstName: e.target.value })} required /></div>
                    <div><label className="form-label-iipm">Last Name</label><input className="form-control-iipm" value={form.lastName} onChange={e => setForm({ ...form, lastName: e.target.value })} /></div>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <label className="form-label-iipm" style={{ marginBottom: 0 }}>Employee ID *</label>
                        {!editUser && (
                          <button type="button" onClick={() => setForm({ ...form, employeeId: `IIPM-${String(users.length + 1).padStart(4, '0')}` })} style={{ background: 'none', border: 'none', color: 'var(--info)', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', padding: 0 }}>
                            ⚡ Auto Generate
                          </button>
                        )}
                      </div>
                      <input className="form-control-iipm" value={form.employeeId} onChange={e => setForm({ ...form, employeeId: e.target.value.toUpperCase() })} placeholder="e.g. IIPM-0001" required />
                    </div>
                    <div><label className="form-label-iipm">Username *</label><input className="form-control-iipm" value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} required disabled={!!editUser} /></div>
                    {!editUser && <div><label className="form-label-iipm">Password *</label>
                      <div style={{ position: 'relative' }}>
                        <input type={showPassword ? "text" : "password"} className="form-control-iipm" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required style={{ paddingRight: '40px' }} />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', color: 'var(--text-muted)' }}>
                          {showPassword ? '🙈' : '👁'}
                        </button>
                      </div>
                    </div>}
                    <div><label className="form-label-iipm">Email</label><input type="email" className="form-control-iipm" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
                    <div><label className="form-label-iipm">Phone</label><input className="form-control-iipm" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
                    <div><label className="form-label-iipm">PAN</label><input className="form-control-iipm" value={form.pan} onChange={e => setForm({ ...form, pan: e.target.value.toUpperCase() })} placeholder="ABCDE1234F" /></div>
                    <div><label className="form-label-iipm">Aadhaar</label><input className="form-control-iipm" value={form.aadhar} onChange={e => setForm({ ...form, aadhar: e.target.value })} /></div>
                  </div>
                </div>

                {/* Section: Official Payroll Fields */}
                {(apiService.isAdminAdmin() || apiService.isSuperAdmin() || (editUser && apiService.isAdminOperator())) && (
                <div style={{ marginBottom: '20px' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>Official Payroll Details</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div><label className="form-label-iipm">Staff Type (Function)</label>
                      <select className="form-control-iipm" value={form.function} onChange={e => setForm({ ...form, function: e.target.value })} disabled={apiService.isAdminOperator()}>
                        <option value="Faculty">Faculty</option>
                        <option value="Non-Teaching Staff">Non-Teaching Staff</option>
                        <option value="Regular">Regular</option>
                      </select>
                    </div>
                    <div><label className="form-label-iipm">Location</label><input className="form-control-iipm" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} disabled={apiService.isAdminOperator()} /></div>
                    <div><label className="form-label-iipm">Tax Regime</label><input className="form-control-iipm" value={form.taxRegime} onChange={e => setForm({ ...form, taxRegime: e.target.value })} disabled={apiService.isAdminOperator()} /></div>
                    <div><label className="form-label-iipm">PF Account Number</label><input className="form-control-iipm" value={form.pfAccountNumber} onChange={e => setForm({ ...form, pfAccountNumber: e.target.value })} disabled={apiService.isAdminOperator()} /></div>
                    <div><label className="form-label-iipm">PRAN Account Number</label><input className="form-control-iipm" value={form.pranAccountNumber} onChange={e => setForm({ ...form, pranAccountNumber: e.target.value })} disabled={apiService.isAdminOperator()} /></div>
                  </div>
                </div>
                )}

                {/* Section: Employment */}
                {(apiService.isAdminAdmin() || apiService.isSuperAdmin() || (editUser && apiService.isAdminOperator())) && (
                <div style={{ marginBottom: '20px' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>Employment Details</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div><label className="form-label-iipm">Department</label>
                      <select className="form-control-iipm" value={form.department} onChange={e => setForm({ ...form, department: e.target.value })} disabled={apiService.isAdminOperator()}>
                        <option value="">Select...</option>
                        {departments.map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                    </div>
                    <div><label className="form-label-iipm">Designation</label><input className="form-control-iipm" value={form.designation} onChange={e => setForm({ ...form, designation: e.target.value })} disabled={apiService.isAdminOperator()} /></div>
                    <div><label className="form-label-iipm">Role / Access</label>
                      <select className="form-control-iipm" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} disabled={apiService.isAdminOperator()}>
                        <option value="EMPLOYEE">Employee</option>
                        <option value="FA_OPERATOR">F&A Operator</option>
                        <option value="FA_ADMIN">F&A Admin</option>
                        <option value="ADMIN_OPERATOR">Administration Operator</option>
                        <option value="ADMIN_ADMIN">Administration Admin</option>
                        <option value="SUPER_ADMIN">Super Admin</option>
                      </select>
                    </div>
                    <div><label className="form-label-iipm">Employee Type</label>
                      <select className="form-control-iipm" value={form.employeeType} onChange={e => setForm({ ...form, employeeType: e.target.value })} disabled={apiService.isAdminOperator()}>
                        <option value="PERMANENT">Permanent</option>
                        <option value="CONTRACT">Contract</option>
                      </select>
                    </div>
                  </div>
                </div>
                )}

                {/* Section: Salary */}
                {(apiService.isAdminAdmin() || apiService.isSuperAdmin() || (editUser && apiService.isAdminOperator())) && (
                <div style={{ marginBottom: '20px' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>Salary — 7th CPC Pay Matrix</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                    <div><label className="form-label-iipm">Pay Level</label>
                      <select className="form-control-iipm" value={form.payLevel} onChange={e => setForm({ ...form, payLevel: e.target.value })} disabled={apiService.isAdminOperator()}>
                        {levels.map(l => <option key={l} value={l}>Level {l} {l <= '5' ? '(Group C)' : l <= '9' ? '(Group B)' : '(Group A)'}</option>)}
                      </select>
                    </div>
                    <div><label className="form-label-iipm">Pay Index (Cell)</label>
                      <select className="form-control-iipm" value={form.payIndex} onChange={e => setForm({ ...form, payIndex: e.target.value })} disabled={apiService.isAdminOperator()}>
                        {form.payLevel && payMatrix[form.payLevel] ? payMatrix[form.payLevel].map((_, i) => (
                          <option key={i+1} value={i+1}>Cell {i+1}</option>
                        )) : <option value="1">Cell 1</option>}
                      </select>
                    </div>
                    <div><label className="form-label-iipm">Basic Pay (₹)</label>
                      <input type="number" className="form-control-iipm" value={form.basicPay}
                        onChange={e => setForm({ ...form, basicPay: e.target.value })} placeholder="Auto-filled by level" disabled={apiService.isAdminOperator()} />
                    </div>
                  </div>
                  {form.payLevel && (
                    <div style={{ marginTop: '10px', padding: '10px 14px', background: 'var(--bg-hover)', borderRadius: '8px', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                      Level {form.payLevel} — TA: <strong style={{ color: 'var(--text-primary)' }}>₹{parseInt(form.payLevel) >= 10 ? '5,760' : '2,880'}</strong>
                      &nbsp;· DA @ 53%: <strong style={{ color: 'var(--text-primary)' }}>₹{Math.round((parseFloat(form.basicPay) || 0) * 0.53).toLocaleString('en-IN')}</strong>
                      &nbsp;· HRA @ 20%: <strong style={{ color: 'var(--text-primary)' }}>₹{Math.round((parseFloat(form.basicPay) || 0) * 0.20).toLocaleString('en-IN')}</strong>
                    </div>
                  )}
                </div>
                )}

                {/* Section: Bank */}
                {(apiService.isAdminAdmin() || apiService.isSuperAdmin() || (editUser && apiService.isAdminOperator())) && (
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>Bank Details</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                    <div><label className="form-label-iipm">Bank Name</label><input className="form-control-iipm" value={form.bankName} onChange={e => setForm({ ...form, bankName: e.target.value })} disabled={apiService.isAdminOperator()} /></div>
                    <div><label className="form-label-iipm">Account Number</label><input className="form-control-iipm" value={form.bankAccountNumber} onChange={e => setForm({ ...form, bankAccountNumber: e.target.value })} disabled={apiService.isAdminOperator()} /></div>
                    <div><label className="form-label-iipm">IFSC Code</label><input className="form-control-iipm" value={form.ifscCode} onChange={e => setForm({ ...form, ifscCode: e.target.value.toUpperCase() })} disabled={apiService.isAdminOperator()} /></div>
                  </div>
                </div>
                )}
              </div>

              <div className="modal-footer-iipm">
                <button type="button" className="btn-outline-iipm" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn-accent-iipm" disabled={loading}>
                  {loading ? 'Saving...' : editUser ? 'Update Employee' : 'Create Employee'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
