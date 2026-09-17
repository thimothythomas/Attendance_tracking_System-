'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Users, UserPlus, Search, Edit3, Trash2, CheckCircle2, 
  AlertCircle, Clock, Building, X, RefreshCw,
  Fingerprint
} from 'lucide-react';

const SHIFT_OPTIONS = [
  { id: 'general', name: 'General Shift', hours: '09:30 AM - 06:30 PM', duration: '9h' },
  { id: 'morning', name: 'Morning Shift', hours: '08:30 AM - 05:30 PM', duration: '9h' },
  { id: 'evening', name: 'Evening Shift', hours: '11:00 AM - 08:00 PM', duration: '9h' },
  { id: 'flexible', name: 'Flexible Timing', hours: 'Anytime (8h required)', duration: '8h' }
];

const DEPARTMENTS = [
  'Development',
  'Design',
  'Marketing',
  'Operations',
  'Human Resources',
  'Quality Assurance'
];

export default function EmployeeManagement() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  
  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState('ALL');
  const [showInactive, setShowInactive] = useState(false);

  // Modals state
  const [modalMode, setModalMode] = useState(null); // 'add' | 'edit' | 'delete' | null
  const [activeEmp, setActiveEmp] = useState(null);
  const [saving, setSaving] = useState(false);

  // Form fields
  const [formName, setFormName] = useState('');
  const [formCode, setFormCode] = useState('');
  const [formDept, setFormDept] = useState('Development');
  const [formShift, setFormShift] = useState('General Shift (09:30 AM - 06:30 PM)');
  const [formDesignation, setFormDesignation] = useState('');
  const [formIsActive, setFormIsActive] = useState(true);

  // Helper for localStorage metadata fallback
  const getStoredMeta = () => {
    try {
      if (typeof window !== 'undefined') {
        const raw = localStorage.getItem('inxl_employee_meta');
        return raw ? JSON.parse(raw) : {};
      }
    } catch {
      // ignore
    }
    return {};
  };

  const saveStoredMeta = (meta) => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('inxl_employee_meta', JSON.stringify(meta));
      }
    } catch {
      // ignore
    }
  };

  const fetchEmployees = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .order('employee_id', { ascending: true });

      if (error) throw error;

      const meta = getStoredMeta();

      const enriched = (data || []).map(emp => {
        const isDel = (emp.employee_name && emp.employee_name.startsWith('del_')) || 
                      (emp.employee_code && String(emp.employee_code).startsWith('del_'));
        const m = meta[emp.employee_id] || {};

        return {
          ...emp,
          is_active: !isDel,
          displayName: isDel ? emp.employee_name.replace(/^del_/, '') : emp.employee_name,
          displayCode: isDel ? String(emp.employee_code).replace(/^del_/, '').split('_')[0] : emp.employee_code,
          department_name: m.department_name || emp.department_name || (emp.department_id === '2' ? 'Design' : emp.department_id === '3' ? 'Marketing' : 'Development'),
          shift: m.shift || emp.shift || 'General Shift (09:30 AM - 06:30 PM)',
          designation: m.designation || emp.designation || 'Team Member'
        };
      });

      setEmployees(enriched);
    } catch (err) {
      console.error('Failed to load employees:', err);
      setErrorMsg(err.message || 'Could not load employees from database.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchEmployees();
  }, []);

  // Filtered employees
  const filteredEmployees = useMemo(() => {
    return employees.filter(emp => {
      if (!showInactive && !emp.is_active) return false;
      if (selectedDept !== 'ALL' && emp.department_name !== selectedDept) return false;
      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase();
        const matchName = emp.displayName?.toLowerCase().includes(q);
        const matchCode = String(emp.displayCode)?.toLowerCase().includes(q);
        const matchDept = emp.department_name?.toLowerCase().includes(q);
        const matchDesig = emp.designation?.toLowerCase().includes(q);
        return matchName || matchCode || matchDept || matchDesig;
      }
      return true;
    });
  }, [employees, showInactive, selectedDept, searchQuery]);

  // Statistics
  const stats = useMemo(() => {
    const total = employees.length;
    const active = employees.filter(e => e.is_active).length;
    const depts = new Set(employees.filter(e => e.is_active).map(e => e.department_name)).size;
    return { total, active, depts };
  }, [employees]);

  // Open Add Modal
  const handleOpenAdd = () => {
    setFormName('');
    setFormCode('');
    setFormDept('Development');
    setFormShift('General Shift (09:30 AM - 06:30 PM)');
    setFormDesignation('');
    setFormIsActive(true);
    setActiveEmp(null);
    setModalMode('add');
    setErrorMsg('');
  };

  // Open Edit Modal
  const handleOpenEdit = (emp) => {
    setActiveEmp(emp);
    setFormName(emp.displayName);
    setFormCode(emp.displayCode);
    setFormDept(emp.department_name || 'Development');
    setFormShift(emp.shift || 'General Shift (09:30 AM - 06:30 PM)');
    setFormDesignation(emp.designation || 'Team Member');
    setFormIsActive(emp.is_active);
    setModalMode('edit');
    setErrorMsg('');
  };

  // Open Delete Modal
  const handleOpenDelete = (emp) => {
    setActiveEmp(emp);
    setModalMode('delete');
    setErrorMsg('');
  };

  // Save Add / Edit
  const handleSubmitForm = async (e) => {
    e.preventDefault();
    if (!formName.trim()) {
      setErrorMsg('Employee name is required.');
      return;
    }
    if (!formCode.trim()) {
      setErrorMsg('Biometric Machine User ID is required.');
      return;
    }

    setSaving(true);
    setErrorMsg('');

    try {
      if (modalMode === 'add') {
        // Check duplicate code among active employees
        const duplicate = employees.find(
          emp => emp.is_active && String(emp.displayCode).trim() === formCode.trim()
        );
        if (duplicate) {
          throw new Error(`Biometric ID #${formCode} is already assigned to ${duplicate.displayName}.`);
        }

        // Compute max employee_id
        let maxId = 2500;
        employees.forEach(emp => {
          const n = parseInt(emp.employee_id, 10);
          if (!isNaN(n) && n > maxId) maxId = n;
        });
        const newEmployeeId = String(maxId + 1);

        const newRecord = {
          employee_id: newEmployeeId,
          employee_name: formName.trim(),
          employee_code: formCode.trim(),
          department_id: formDept === 'Design' ? '2' : formDept === 'Marketing' ? '3' : '1'
        };

        const { error: insErr } = await supabase.from('employees').insert([newRecord]);
        if (insErr) {
          if (insErr.code === '42501') {
            throw new Error('Database permission restricted. Please run the Supabase RLS policy query in your SQL editor.');
          }
          throw insErr;
        }

        // Save metadata
        const meta = getStoredMeta();
        meta[newEmployeeId] = {
          shift: formShift,
          department_name: formDept,
          designation: formDesignation.trim() || 'Team Member'
        };
        saveStoredMeta(meta);

        setSuccessMsg(`Successfully added ${formName.trim()} (Machine ID: #${formCode})!`);
        setTimeout(() => setSuccessMsg(''), 4000);
        setModalMode(null);
        await fetchEmployees();
      } else if (modalMode === 'edit' && activeEmp) {
        let finalName = formName.trim();
        let finalCode = formCode.trim();

        if (!formIsActive) {
          if (!finalName.startsWith('del_')) finalName = 'del_' + finalName;
          if (!finalCode.startsWith('del_')) finalCode = 'del_' + finalCode + '_' + activeEmp.employee_id;
        } else {
          finalName = finalName.replace(/^del_/, '');
          finalCode = finalCode.replace(/^del_/, '').split('_')[0];
        }

        const updates = {
          employee_name: finalName,
          employee_code: finalCode,
          department_id: formDept === 'Design' ? '2' : formDept === 'Marketing' ? '3' : '1'
        };

        const { error: updErr } = await supabase
          .from('employees')
          .update(updates)
          .eq('employee_id', activeEmp.employee_id);

        if (updErr) {
          if (updErr.code === '42501') {
            throw new Error('Database permission restricted. Please run the Supabase RLS policy query in your SQL editor.');
          }
          throw updErr;
        }

        // Update metadata
        const meta = getStoredMeta();
        meta[activeEmp.employee_id] = {
          shift: formShift,
          department_name: formDept,
          designation: formDesignation.trim() || 'Team Member'
        };
        saveStoredMeta(meta);

        setSuccessMsg(`Updated details for ${formName.trim()}!`);
        setTimeout(() => setSuccessMsg(''), 4000);
        setModalMode(null);
        await fetchEmployees();
      }
    } catch (err) {
      console.error('Error saving employee:', err);
      setErrorMsg(err.message || 'Failed to save employee changes.');
    } finally {
      setSaving(false);
    }
  };

  // Deactivate
  const handleConfirmDeactivate = async () => {
    if (!activeEmp) return;
    setSaving(true);
    setErrorMsg('');

    try {
      const delName = activeEmp.employee_name.startsWith('del_') 
        ? activeEmp.employee_name 
        : 'del_' + activeEmp.employee_name;
      const delCode = activeEmp.employee_code.startsWith('del_')
        ? activeEmp.employee_code
        : 'del_' + activeEmp.employee_code + '_' + activeEmp.employee_id;

      const { error: delErr } = await supabase
        .from('employees')
        .update({
          employee_name: delName,
          employee_code: delCode
        })
        .eq('employee_id', activeEmp.employee_id);

      if (delErr) {
        if (delErr.code === '42501') {
          throw new Error('Database permission restricted. Please run the Supabase RLS policy query in your SQL editor.');
        }
        throw delErr;
      }

      setSuccessMsg(`Employee ${activeEmp.displayName} has been deactivated.`);
      setTimeout(() => setSuccessMsg(''), 4000);
      setModalMode(null);
      await fetchEmployees();
    } catch (err) {
      console.error('Error deactivating employee:', err);
      setErrorMsg(err.message || 'Failed to deactivate employee.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ padding: '0.5rem 0' }}>
      {/* Header & Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#111827', margin: 0 }}>
            Employee Directory & Shifts
          </h2>
          <p style={{ color: '#6b7280', fontSize: '0.875rem', marginTop: '0.25rem', marginBottom: 0 }}>
            Manage company staff, biometric IDs, departments, and shift allocations.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            onClick={fetchEmployees}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              padding: '0.625rem 1rem', borderRadius: '8px', border: '1px solid #d1d5db',
              backgroundColor: 'white', color: '#374151', fontSize: '0.875rem', fontWeight: 500,
              cursor: 'pointer', transition: 'all 0.15s'
            }}
          >
            <RefreshCw size={16} className={loading ? 'spin' : ''} />
            <span>Refresh</span>
          </button>

          <button
            onClick={handleOpenAdd}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              padding: '0.625rem 1.25rem', borderRadius: '8px', border: 'none',
              backgroundColor: '#4f46e5', color: 'white', fontSize: '0.875rem', fontWeight: 600,
              cursor: 'pointer', boxShadow: '0 2px 4px rgba(79, 70, 229, 0.25)', transition: 'all 0.15s'
            }}
          >
            <UserPlus size={18} />
            <span>Add Employee</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div style={{
          backgroundColor: '#ecfdf5', border: '1px solid #a7f3d0', color: '#065f46',
          padding: '0.75rem 1rem', borderRadius: '8px', marginBottom: '1rem',
          display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem'
        }}>
          <CheckCircle2 size={18} color="#059669" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div style={{
          backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b',
          padding: '0.75rem 1rem', borderRadius: '8px', marginBottom: '1rem',
          display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem'
        }}>
          <AlertCircle size={18} color="#dc2626" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <div style={{ backgroundColor: 'white', padding: '1.25rem', borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#6b7280', fontSize: '0.875rem', fontWeight: 500 }}>
            <span>Active Staff</span>
            <Users size={18} color="#4f46e5" />
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#111827', marginTop: '0.5rem' }}>
            {stats.active}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#10b981', marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10b981' }}></span>
            Active on Biometric Sync
          </div>
        </div>

        <div style={{ backgroundColor: 'white', padding: '1.25rem', borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#6b7280', fontSize: '0.875rem', fontWeight: 500 }}>
            <span>Departments</span>
            <Building size={18} color="#0284c7" />
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#111827', marginTop: '0.5rem' }}>
            {stats.depts}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>
            Across office teams
          </div>
        </div>

        <div style={{ backgroundColor: 'white', padding: '1.25rem', borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#6b7280', fontSize: '0.875rem', fontWeight: 500 }}>
            <span>Shift Timings</span>
            <Clock size={18} color="#f59e0b" />
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#111827', marginTop: '0.5rem' }}>
            {SHIFT_OPTIONS.length}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>
            Active shift schedules
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div style={{
        backgroundColor: 'white', padding: '1rem 1.25rem', borderRadius: '12px',
        border: '1px solid #e5e7eb', marginBottom: '1.5rem',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        flexWrap: 'wrap', gap: '1rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: '260px' }}>
          <div style={{ position: 'relative', width: '100%', maxWidth: '360px' }}>
            <Search size={16} color="#9ca3af" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder="Search by name, biometric ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%', padding: '0.5rem 0.75rem 0.5rem 2.25rem',
                border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '0.875rem', outline: 'none'
              }}
            />
          </div>

          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            style={{
              padding: '0.5rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '8px',
              fontSize: '0.875rem', color: '#374151', backgroundColor: 'white', outline: 'none'
            }}
          >
            <option value="ALL">All Departments</option>
            {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>

        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: '#4b5563', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={showInactive}
            onChange={(e) => setShowInactive(e.target.checked)}
            style={{ borderRadius: '4px', cursor: 'pointer' }}
          />
          <span>Show Inactive / Former Staff</span>
        </label>
      </div>

      {/* Employees Table */}
      <div style={{
        backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e5e7eb',
        overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
      }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb', color: '#4b5563', fontWeight: 600 }}>
                <th style={{ padding: '0.875rem 1.25rem' }}>Employee</th>
                <th style={{ padding: '0.875rem 1.25rem' }}>Biometric ID</th>
                <th style={{ padding: '0.875rem 1.25rem' }}>Department</th>
                <th style={{ padding: '0.875rem 1.25rem' }}>Assigned Shift</th>
                <th style={{ padding: '0.875rem 1.25rem' }}>Status</th>
                <th style={{ padding: '0.875rem 1.25rem', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" style={{ padding: '3rem', textAlign: 'center', color: '#6b7280' }}>
                    <RefreshCw size={24} className="spin" style={{ margin: '0 auto 0.5rem auto' }} />
                    Loading employee directory...
                  </td>
                </tr>
              ) : filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ padding: '3rem', textAlign: 'center', color: '#6b7280' }}>
                    No employees found matching your criteria.
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((emp) => {
                  const initials = (emp.displayName || 'E')
                    .split(' ')
                    .map(n => n[0])
                    .join('')
                    .substring(0, 2)
                    .toUpperCase();

                  return (
                    <tr key={emp.employee_id} style={{ borderBottom: '1px solid #f3f4f6', transition: 'background-color 0.15s' }}>
                      {/* Name & Initials */}
                      <td style={{ padding: '0.875rem 1.25rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <div style={{
                            width: '38px', height: '38px', borderRadius: '50%',
                            backgroundColor: emp.is_active ? '#e0e7ff' : '#f3f4f6',
                            color: emp.is_active ? '#4338ca' : '#9ca3af',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontWeight: 700, fontSize: '0.875rem'
                          }}>
                            {initials}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, color: emp.is_active ? '#111827' : '#6b7280' }}>
                              {emp.displayName}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
                              {emp.designation || 'Team Member'} • DB ID #{emp.employee_id}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Biometric ID Badge */}
                      <td style={{ padding: '0.875rem 1.25rem' }}>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
                          backgroundColor: '#f3f4f6', border: '1px solid #e5e7eb',
                          padding: '0.25rem 0.625rem', borderRadius: '6px',
                          fontWeight: 600, color: '#374151', fontSize: '0.75rem'
                        }}>
                          <Fingerprint size={13} color="#4f46e5" />
                          Machine #{emp.displayCode}
                        </span>
                      </td>

                      {/* Department */}
                      <td style={{ padding: '0.875rem 1.25rem' }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '0.25rem 0.625rem', borderRadius: '12px',
                          fontSize: '0.75rem', fontWeight: 600,
                          backgroundColor: emp.department_name === 'Design' ? '#f3e8ff' : emp.department_name === 'Marketing' ? '#ffedd5' : '#e0f2fe',
                          color: emp.department_name === 'Design' ? '#7e22ce' : emp.department_name === 'Marketing' ? '#c2410c' : '#0369a1'
                        }}>
                          {emp.department_name}
                        </span>
                      </td>

                      {/* Assigned Shift */}
                      <td style={{ padding: '0.875rem 1.25rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', color: '#374151', fontSize: '0.8125rem' }}>
                          <Clock size={14} color="#6b7280" />
                          <span>{emp.shift}</span>
                        </div>
                      </td>

                      {/* Status */}
                      <td style={{ padding: '0.875rem 1.25rem' }}>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
                          padding: '0.2rem 0.5rem', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 500,
                          backgroundColor: emp.is_active ? '#def7ec' : '#f3f4f6',
                          color: emp.is_active ? '#03543f' : '#6b7280'
                        }}>
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: emp.is_active ? '#31c48d' : '#9ca3af' }}></span>
                          {emp.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '0.875rem 1.25rem', textAlign: 'right' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                          <button
                            onClick={() => handleOpenEdit(emp)}
                            title="Edit Employee"
                            style={{
                              padding: '0.375rem', borderRadius: '6px', border: '1px solid #e5e7eb',
                              backgroundColor: 'white', color: '#4b5563', cursor: 'pointer', transition: 'all 0.15s'
                            }}
                          >
                            <Edit3 size={15} />
                          </button>
                          {emp.is_active && (
                            <button
                              onClick={() => handleOpenDelete(emp)}
                              title="Deactivate Employee"
                              style={{
                                padding: '0.375rem', borderRadius: '6px', border: '1px solid #fee2e2',
                                backgroundColor: '#fef2f2', color: '#dc2626', cursor: 'pointer', transition: 'all 0.15s'
                              }}
                            >
                              <Trash2 size={15} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Add or Edit Employee */}
      {(modalMode === 'add' || modalMode === 'edit') && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          backgroundColor: 'rgba(0, 0, 0, 0.5)', backdropFilter: 'blur(3px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
        }}>
          <div style={{
            backgroundColor: 'white', borderRadius: '16px', maxWidth: '520px', width: '100%',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            overflow: 'hidden'
          }}>
            <div style={{
              padding: '1.25rem 1.5rem', borderBottom: '1px solid #e5e7eb',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}>
              <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 700, color: '#111827' }}>
                {modalMode === 'add' ? 'Register New Employee' : 'Edit Employee Details'}
              </h3>
              <button
                onClick={() => setModalMode(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmitForm} style={{ padding: '1.5rem' }}>
              {errorMsg && (
                <div style={{
                  backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b',
                  padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.8125rem'
                }}>
                  {errorMsg}
                </div>
              )}

              {/* Name */}
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#374151', marginBottom: '0.375rem' }}>
                  Full Name <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Alex Henderson"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  style={{
                    width: '100%', padding: '0.625rem 0.75rem', border: '1px solid #d1d5db',
                    borderRadius: '8px', fontSize: '0.875rem', outline: 'none'
                  }}
                />
              </div>

              {/* Biometric Code & Designation in grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#374151', marginBottom: '0.375rem' }}>
                    Biometric Machine ID <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 15"
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value)}
                    style={{
                      width: '100%', padding: '0.625rem 0.75rem', border: '1px solid #d1d5db',
                      borderRadius: '8px', fontSize: '0.875rem', outline: 'none'
                    }}
                  />
                  <span style={{ fontSize: '0.7rem', color: '#6b7280', marginTop: '0.25rem', display: 'block' }}>
                    User ID set on physical device
                  </span>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#374151', marginBottom: '0.375rem' }}>
                    Designation
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Senior Developer"
                    value={formDesignation}
                    onChange={(e) => setFormDesignation(e.target.value)}
                    style={{
                      width: '100%', padding: '0.625rem 0.75rem', border: '1px solid #d1d5db',
                      borderRadius: '8px', fontSize: '0.875rem', outline: 'none'
                    }}
                  />
                </div>
              </div>

              {/* Department */}
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#374151', marginBottom: '0.375rem' }}>
                  Department
                </label>
                <select
                  value={formDept}
                  onChange={(e) => setFormDept(e.target.value)}
                  style={{
                    width: '100%', padding: '0.625rem 0.75rem', border: '1px solid #d1d5db',
                    borderRadius: '8px', fontSize: '0.875rem', backgroundColor: 'white', outline: 'none'
                  }}
                >
                  {DEPARTMENTS.map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              </div>

              {/* Shift Timing */}
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#374151', marginBottom: '0.375rem' }}>
                  Assigned Shift
                </label>
                <select
                  value={formShift}
                  onChange={(e) => setFormShift(e.target.value)}
                  style={{
                    width: '100%', padding: '0.625rem 0.75rem', border: '1px solid #d1d5db',
                    borderRadius: '8px', fontSize: '0.875rem', backgroundColor: 'white', outline: 'none'
                  }}
                >
                  {SHIFT_OPTIONS.map(shift => (
                    <option key={shift.id} value={`${shift.name} (${shift.hours})`}>
                      {shift.name} ({shift.hours})
                    </option>
                  ))}
                </select>
              </div>

              {/* Active Toggle (Edit mode only) */}
              {modalMode === 'edit' && (
                <div style={{ marginBottom: '1.5rem', padding: '0.75rem', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: '#374151', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={formIsActive}
                      onChange={(e) => setFormIsActive(e.target.checked)}
                      style={{ cursor: 'pointer' }}
                    />
                    <span style={{ fontWeight: 600 }}>Active Employee</span>
                  </label>
                  <span style={{ fontSize: '0.75rem', color: '#6b7280', display: 'block', marginLeft: '1.5rem', marginTop: '0.25rem' }}>
                    Unchecking will mark as inactive while safely preserving past attendance records.
                  </span>
                </div>
              )}

              {/* Modal Actions */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setModalMode(null)}
                  style={{
                    padding: '0.625rem 1.25rem', borderRadius: '8px', border: '1px solid #d1d5db',
                    backgroundColor: 'white', color: '#374151', fontSize: '0.875rem', fontWeight: 500,
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  style={{
                    padding: '0.625rem 1.5rem', borderRadius: '8px', border: 'none',
                    backgroundColor: '#4f46e5', color: 'white', fontSize: '0.875rem', fontWeight: 600,
                    cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1,
                    display: 'flex', alignItems: 'center', gap: '0.5rem'
                  }}
                >
                  {saving && <RefreshCw size={16} className="spin" />}
                  <span>{modalMode === 'add' ? 'Add Employee' : 'Save Changes'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Deactivate Confirmation */}
      {modalMode === 'delete' && activeEmp && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          backgroundColor: 'rgba(0, 0, 0, 0.5)', backdropFilter: 'blur(3px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
        }}>
          <div style={{
            backgroundColor: 'white', borderRadius: '16px', maxWidth: '440px', width: '100%',
            padding: '1.5rem', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
          }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#fee2e2', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem auto' }}>
              <Trash2 size={24} />
            </div>

            <h3 style={{ textAlign: 'center', fontSize: '1.125rem', fontWeight: 700, color: '#111827', margin: '0 0 0.5rem 0' }}>
              Deactivate {activeEmp.displayName}?
            </h3>

            <p style={{ textAlign: 'center', fontSize: '0.875rem', color: '#6b7280', margin: '0 0 1.5rem 0', lineHeight: 1.5 }}>
              This will remove <strong>{activeEmp.displayName}</strong> from active daily sync and attendance reports. Their past attendance logs will be preserved safely.
            </p>

            {errorMsg && (
              <div style={{ backgroundColor: '#fef2f2', color: '#991b1b', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.8125rem' }}>
                {errorMsg}
              </div>
            )}

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => setModalMode(null)}
                style={{
                  flex: 1, padding: '0.625rem', borderRadius: '8px', border: '1px solid #d1d5db',
                  backgroundColor: 'white', color: '#374151', fontSize: '0.875rem', fontWeight: 500,
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeactivate}
                disabled={saving}
                style={{
                  flex: 1, padding: '0.625rem', borderRadius: '8px', border: 'none',
                  backgroundColor: '#dc2626', color: 'white', fontSize: '0.875rem', fontWeight: 600,
                  cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1
                }}
              >
                {saving ? 'Deactivating...' : 'Confirm Deactivate'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
