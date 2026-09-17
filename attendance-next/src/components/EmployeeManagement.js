'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Users, UserPlus, Search, Edit3, Trash2, CheckCircle2, 
  AlertCircle, Clock, Building, X, RefreshCw,
  Fingerprint, Plus, ArrowRight, User
} from 'lucide-react';
import EmployeeProfileModal from './EmployeeProfileModal';

const INITIAL_DEPARTMENTS = [
  { id: 'dept_1', name: 'Development', description: 'Software engineering, web & backend systems', color: '#4f46e5', bg: '#e0e7ff' },
  { id: 'dept_2', name: 'Design', description: 'UI/UX, visual design, and product branding', color: '#7e22ce', bg: '#f3e8ff' },
  { id: 'dept_3', name: 'Marketing', description: 'Digital marketing, growth, and client relations', color: '#c2410c', bg: '#ffedd5' },
  { id: 'dept_4', name: 'Operations', description: 'Office management, logistics, and company operations', color: '#0369a1', bg: '#e0f2fe' },
  { id: 'dept_5', name: 'Human Resources', description: 'People operations, recruitment, and staff welfare', color: '#0f766e', bg: '#ccfbf1' },
  { id: 'dept_6', name: 'Quality Assurance', description: 'Testing, verification, and performance audits', color: '#b45309', bg: '#fef3c7' }
];

const INITIAL_SHIFTS = [
  { id: 'shift_gen', name: 'General Shift', startTime: '09:30', endTime: '18:30', displayHours: '09:30 AM - 06:30 PM', graceMinutes: 15, duration: '9h 00m' },
  { id: 'shift_morn', name: 'Morning Shift', startTime: '08:30', endTime: '17:30', displayHours: '08:30 AM - 05:30 PM', graceMinutes: 15, duration: '9h 00m' },
  { id: 'shift_eve', name: 'Evening Shift', startTime: '11:00', endTime: '20:00', displayHours: '11:00 AM - 08:00 PM', graceMinutes: 15, duration: '9h 00m' },
  { id: 'shift_flex', name: 'Flexible Timing', startTime: '09:00', endTime: '17:00', displayHours: 'Flexible (8h required)', graceMinutes: 0, duration: '8h 00m' }
];

function formatTimeDisplay(timeStr) {
  if (!timeStr) return '';
  const parts = timeStr.split(':');
  if (parts.length < 2) return timeStr;
  let h = parseInt(parts[0], 10);
  const m = parts[1];
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h.toString().padStart(2, '0')}:${m} ${ampm}`;
}

function calcDuration(start, end) {
  if (!start || !end) return '9h 00m';
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  let totalMin = (eh * 60 + em) - (sh * 60 + sm);
  if (totalMin < 0) totalMin += 24 * 60;
  const hrs = Math.floor(totalMin / 60);
  const mins = totalMin % 60;
  return `${hrs}h ${mins > 0 ? mins + 'm' : '00m'}`;
}

export default function EmployeeManagement({ initialSubTab = 'staff', rawData = [] }) {
  const [activeSubTab, setActiveSubTab] = useState(initialSubTab);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (initialSubTab) setActiveSubTab(initialSubTab);
  }, [initialSubTab]);

  // Core Data
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState(INITIAL_DEPARTMENTS);
  const [shifts, setShifts] = useState(INITIAL_SHIFTS);
  const [loading, setLoading] = useState(true);

  // Profile Modal State
  const [viewingProfileEmp, setViewingProfileEmp] = useState(null);

  // Notifications
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Staff Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDeptFilter, setSelectedDeptFilter] = useState('ALL');
  const [selectedShiftFilter, setSelectedShiftFilter] = useState('ALL');
  const [showInactive, setShowInactive] = useState(false);

  // Modal State
  const [modalMode, setModalMode] = useState(null);
  const [activeItem, setActiveItem] = useState(null);
  const [saving, setSaving] = useState(false);

  // Form Fields - Employee
  const [formEmpName, setFormEmpName] = useState('');
  const [formEmpCode, setFormEmpCode] = useState('');
  const [formEmpDept, setFormEmpDept] = useState('');
  const [formEmpShift, setFormEmpShift] = useState('');
  const [formEmpDesignation, setFormEmpDesignation] = useState('');
  const [formEmpIsActive, setFormEmpIsActive] = useState(true);

  // Form Fields - Department
  const [formDeptName, setFormDeptName] = useState('');
  const [formDeptDesc, setFormDeptDesc] = useState('');
  const [formDeptColor, setFormDeptColor] = useState('#4f46e5');

  // Form Fields - Shift
  const [formShiftName, setFormShiftName] = useState('');
  const [formShiftStart, setFormShiftStart] = useState('09:30');
  const [formShiftEnd, setFormShiftEnd] = useState('18:30');
  const [formShiftGrace, setFormShiftGrace] = useState(15);

  // Storage Helpers
  const getStoredConfig = (key, fallback) => {
    try {
      if (typeof window !== 'undefined') {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : fallback;
      }
    } catch {}
    return fallback;
  };

  const saveStoredConfig = (key, val) => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem(key, JSON.stringify(val));
      }
    } catch {}
  };

  useEffect(() => {
    const storedDepts = getStoredConfig('inxl_departments', INITIAL_DEPARTMENTS);
    const storedShifts = getStoredConfig('inxl_shifts', INITIAL_SHIFTS);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDepartments(storedDepts);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setShifts(storedShifts);
  }, []);

  // Fetch Employees from Supabase
  const fetchEmployees = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .order('employee_id', { ascending: true });

      if (error) throw error;

      const meta = getStoredConfig('inxl_employee_meta', {});

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
          shift_id: m.shift_id || 'shift_gen',
          shift_name: m.shift_name || emp.shift || 'General Shift (09:30 AM - 06:30 PM)',
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

  // Compute Employees per Department & per Shift
  const deptMembersCount = useMemo(() => {
    const counts = {};
    departments.forEach(d => { counts[d.name] = 0; });
    employees.filter(e => e.is_active).forEach(e => {
      const name = e.department_name;
      counts[name] = (counts[name] || 0) + 1;
    });
    return counts;
  }, [departments, employees]);

  const shiftMembersCount = useMemo(() => {
    const counts = {};
    shifts.forEach(s => { counts[s.name] = 0; });
    employees.filter(e => e.is_active).forEach(e => {
      const sName = e.shift_name;
      shifts.forEach(s => {
        if (sName && sName.includes(s.name)) {
          counts[s.name] = (counts[s.name] || 0) + 1;
        }
      });
    });
    return counts;
  }, [shifts, employees]);

  // Filtered Employees
  const filteredEmployees = useMemo(() => {
    return employees.filter(emp => {
      if (!showInactive && !emp.is_active) return false;
      if (selectedDeptFilter !== 'ALL' && emp.department_name !== selectedDeptFilter) return false;
      if (selectedShiftFilter !== 'ALL' && !emp.shift_name?.includes(selectedShiftFilter)) return false;
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
  }, [employees, showInactive, selectedDeptFilter, selectedShiftFilter, searchQuery]);

  // Employee CRUD
  const handleOpenAddEmployee = () => {
    setFormEmpName('');
    setFormEmpCode('');
    setFormEmpDept(departments[0]?.name || 'Development');
    setFormEmpShift(shifts[0]?.name ? `${shifts[0].name} (${shifts[0].displayHours})` : 'General Shift');
    setFormEmpDesignation('');
    setFormEmpIsActive(true);
    setActiveItem(null);
    setModalMode('add_employee');
    setErrorMsg('');
  };

  const handleOpenEditEmployee = (emp) => {
    setActiveItem(emp);
    setFormEmpName(emp.displayName);
    setFormEmpCode(emp.displayCode);
    setFormEmpDept(emp.department_name || departments[0]?.name || 'Development');
    setFormEmpShift(emp.shift_name || shifts[0]?.name || 'General Shift');
    setFormEmpDesignation(emp.designation || 'Team Member');
    setFormEmpIsActive(emp.is_active);
    setModalMode('edit_employee');
    setErrorMsg('');
  };

  const handleOpenDeleteEmployee = (emp) => {
    setActiveItem(emp);
    setModalMode('delete_employee');
    setErrorMsg('');
  };

  const handleSaveEmployee = async (e) => {
    e.preventDefault();
    if (!formEmpName.trim()) { setErrorMsg('Employee name is required.'); return; }
    if (!formEmpCode.trim()) { setErrorMsg('Biometric Machine User ID is required.'); return; }

    setSaving(true);
    setErrorMsg('');

    try {
      if (modalMode === 'add_employee') {
        const duplicate = employees.find(
          emp => emp.is_active && String(emp.displayCode).trim() === formEmpCode.trim()
        );
        if (duplicate) {
          throw new Error(`Biometric Machine ID #${formEmpCode} is already assigned to ${duplicate.displayName}.`);
        }

        let maxId = 2500;
        employees.forEach(emp => {
          const n = parseInt(emp.employee_id, 10);
          if (!isNaN(n) && n > maxId) maxId = n;
        });
        const newId = String(maxId + 1);

        const newRecord = {
          employee_id: newId,
          employee_name: formEmpName.trim(),
          employee_code: formEmpCode.trim(),
          department_id: formEmpDept === 'Design' ? '2' : formEmpDept === 'Marketing' ? '3' : '1'
        };

        const { error: insErr } = await supabase.from('employees').insert([newRecord]);
        if (insErr) {
          if (insErr.code === '42501') {
            throw new Error('Database permission restricted. Please run the Supabase RLS policy query in your SQL editor.');
          }
          throw insErr;
        }

        const meta = getStoredConfig('inxl_employee_meta', {});
        meta[newId] = {
          department_name: formEmpDept,
          shift_name: formEmpShift,
          designation: formEmpDesignation.trim() || 'Team Member'
        };
        saveStoredConfig('inxl_employee_meta', meta);

        setSuccessMsg(`Successfully registered ${formEmpName.trim()} (Machine ID #${formEmpCode})!`);
        setTimeout(() => setSuccessMsg(''), 4000);
        setModalMode(null);
        await fetchEmployees();
      } else if (modalMode === 'edit_employee' && activeItem) {
        let finalName = formEmpName.trim();
        let finalCode = formEmpCode.trim();

        if (!formEmpIsActive) {
          if (!finalName.startsWith('del_')) finalName = 'del_' + finalName;
          if (!finalCode.startsWith('del_')) finalCode = 'del_' + finalCode + '_' + activeItem.employee_id;
        } else {
          finalName = finalName.replace(/^del_/, '');
          finalCode = finalCode.replace(/^del_/, '').split('_')[0];
        }

        const updates = {
          employee_name: finalName,
          employee_code: finalCode,
          department_id: formEmpDept === 'Design' ? '2' : formEmpDept === 'Marketing' ? '3' : '1'
        };

        const { error: updErr } = await supabase
          .from('employees')
          .update(updates)
          .eq('employee_id', activeItem.employee_id);

        if (updErr) {
          if (updErr.code === '42501') {
            throw new Error('Database permission restricted. Please run the Supabase RLS policy query in your SQL editor.');
          }
          throw updErr;
        }

        const meta = getStoredConfig('inxl_employee_meta', {});
        meta[activeItem.employee_id] = {
          department_name: formEmpDept,
          shift_name: formEmpShift,
          designation: formEmpDesignation.trim() || 'Team Member'
        };
        saveStoredConfig('inxl_employee_meta', meta);

        setSuccessMsg(`Updated ${formEmpName.trim()}! Assigned to ${formEmpDept}.`);
        setTimeout(() => setSuccessMsg(''), 4000);
        setModalMode(null);
        await fetchEmployees();
      }
    } catch (err) {
      console.error('Save employee error:', err);
      setErrorMsg(err.message || 'Failed to save employee.');
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDeactivateEmployee = async () => {
    if (!activeItem) return;
    setSaving(true);
    setErrorMsg('');

    try {
      const delName = activeItem.employee_name.startsWith('del_') 
        ? activeItem.employee_name 
        : 'del_' + activeItem.employee_name;
      const delCode = activeItem.employee_code.startsWith('del_')
        ? activeItem.employee_code
        : 'del_' + activeItem.employee_code + '_' + activeItem.employee_id;

      const { error: delErr } = await supabase
        .from('employees')
        .update({ employee_name: delName, employee_code: delCode })
        .eq('employee_id', activeItem.employee_id);

      if (delErr) throw delErr;

      setSuccessMsg(`Employee ${activeItem.displayName} has been deactivated.`);
      setTimeout(() => setSuccessMsg(''), 4000);
      setModalMode(null);
      await fetchEmployees();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to deactivate employee.');
    } finally {
      setSaving(false);
    }
  };

  // Department CRUD
  const handleOpenAddDept = () => {
    setFormDeptName('');
    setFormDeptDesc('');
    setFormDeptColor('#4f46e5');
    setModalMode('add_dept');
    setErrorMsg('');
  };

  const handleOpenEditDept = (dept) => {
    setActiveItem(dept);
    setFormDeptName(dept.name);
    setFormDeptDesc(dept.description || '');
    setFormDeptColor(dept.color || '#4f46e5');
    setModalMode('edit_dept');
    setErrorMsg('');
  };

  const handleOpenDeleteDept = (dept) => {
    setActiveItem(dept);
    setModalMode('delete_dept');
    setErrorMsg('');
  };

  const handleSaveDept = (e) => {
    e.preventDefault();
    if (!formDeptName.trim()) { setErrorMsg('Department name is required.'); return; }

    const name = formDeptName.trim();
    if (modalMode === 'add_dept') {
      if (departments.some(d => d.name.toLowerCase() === name.toLowerCase())) {
        setErrorMsg(`A department named "${name}" already exists.`);
        return;
      }
      const newDept = {
        id: 'dept_' + Date.now(),
        name,
        description: formDeptDesc.trim() || 'Team department',
        color: formDeptColor,
        bg: formDeptColor + '18'
      };
      const updated = [...departments, newDept];
      setDepartments(updated);
      saveStoredConfig('inxl_departments', updated);
      setSuccessMsg(`Department "${name}" created successfully!`);
    } else if (modalMode === 'edit_dept' && activeItem) {
      const oldName = activeItem.name;
      const updated = departments.map(d => {
        if (d.id === activeItem.id) {
          return {
            ...d,
            name,
            description: formDeptDesc.trim(),
            color: formDeptColor,
            bg: formDeptColor + '18'
          };
        }
        return d;
      });
      setDepartments(updated);
      saveStoredConfig('inxl_departments', updated);

      if (oldName !== name) {
        const meta = getStoredConfig('inxl_employee_meta', {});
        Object.keys(meta).forEach(id => {
          if (meta[id].department_name === oldName) {
            meta[id].department_name = name;
          }
        });
        saveStoredConfig('inxl_employee_meta', meta);
        fetchEmployees();
      }

      setSuccessMsg(`Department "${name}" updated!`);
    }

    setTimeout(() => setSuccessMsg(''), 4000);
    setModalMode(null);
  };

  const handleDeleteDept = () => {
    if (!activeItem) return;
    const count = deptMembersCount[activeItem.name] || 0;
    if (count > 0) {
      setErrorMsg(`Cannot delete "${activeItem.name}" because ${count} employee(s) are currently assigned to it. Reassign them first.`);
      return;
    }

    const updated = departments.filter(d => d.id !== activeItem.id);
    setDepartments(updated);
    saveStoredConfig('inxl_departments', updated);
    setSuccessMsg(`Department "${activeItem.name}" removed.`);
    setTimeout(() => setSuccessMsg(''), 4000);
    setModalMode(null);
  };

  // Shift CRUD
  const handleOpenAddShift = () => {
    setFormShiftName('');
    setFormShiftStart('09:30');
    setFormShiftEnd('18:30');
    setFormShiftGrace(15);
    setModalMode('add_shift');
    setErrorMsg('');
  };

  const handleOpenEditShift = (shift) => {
    setActiveItem(shift);
    setFormShiftName(shift.name);
    setFormShiftStart(shift.startTime || '09:30');
    setFormShiftEnd(shift.endTime || '18:30');
    setFormShiftGrace(shift.graceMinutes || 15);
    setModalMode('edit_shift');
    setErrorMsg('');
  };

  const handleOpenDeleteShift = (shift) => {
    setActiveItem(shift);
    setModalMode('delete_shift');
    setErrorMsg('');
  };

  const handleSaveShift = (e) => {
    e.preventDefault();
    if (!formShiftName.trim()) { setErrorMsg('Shift name is required.'); return; }

    const name = formShiftName.trim();
    const displayHours = `${formatTimeDisplay(formShiftStart)} - ${formatTimeDisplay(formShiftEnd)}`;
    const duration = calcDuration(formShiftStart, formShiftEnd);

    if (modalMode === 'add_shift') {
      if (shifts.some(s => s.name.toLowerCase() === name.toLowerCase())) {
        setErrorMsg(`A shift named "${name}" already exists.`);
        return;
      }
      const newShift = {
        id: 'shift_' + Date.now(),
        name,
        startTime: formShiftStart,
        endTime: formShiftEnd,
        displayHours,
        graceMinutes: parseInt(formShiftGrace, 10) || 0,
        duration
      };
      const updated = [...shifts, newShift];
      setShifts(updated);
      saveStoredConfig('inxl_shifts', updated);
      setSuccessMsg(`Shift schedule "${name}" created!`);
    } else if (modalMode === 'edit_shift' && activeItem) {
      const oldName = activeItem.name;
      const updated = shifts.map(s => {
        if (s.id === activeItem.id) {
          return {
            ...s,
            name,
            startTime: formShiftStart,
            endTime: formShiftEnd,
            displayHours,
            graceMinutes: parseInt(formShiftGrace, 10) || 0,
            duration
          };
        }
        return s;
      });
      setShifts(updated);
      saveStoredConfig('inxl_shifts', updated);

      const meta = getStoredConfig('inxl_employee_meta', {});
      Object.keys(meta).forEach(id => {
        if (meta[id].shift_name && meta[id].shift_name.includes(oldName)) {
          meta[id].shift_name = `${name} (${displayHours})`;
        }
      });
      saveStoredConfig('inxl_employee_meta', meta);
      fetchEmployees();

      setSuccessMsg(`Shift schedule "${name}" updated!`);
    }

    setTimeout(() => setSuccessMsg(''), 4000);
    setModalMode(null);
  };

  const handleDeleteShift = () => {
    if (!activeItem) return;
    const count = shiftMembersCount[activeItem.name] || 0;
    if (count > 0) {
      setErrorMsg(`Cannot delete "${activeItem.name}" because ${count} employee(s) are assigned to it. Reassign their shift first.`);
      return;
    }

    const updated = shifts.filter(s => s.id !== activeItem.id);
    setShifts(updated);
    saveStoredConfig('inxl_shifts', updated);
    setSuccessMsg(`Shift "${activeItem.name}" removed.`);
    setTimeout(() => setSuccessMsg(''), 4000);
    setModalMode(null);
  };

  return (
    <div style={{ padding: '0.25rem 0' }}>
      {/* Header & Sub-Navigation */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
            {activeSubTab === 'staff' ? 'Staff Directory & Personnel' : activeSubTab === 'departments' ? 'Department Organization' : 'Shift Schedules & Policies'}
          </h2>
          <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '0.25rem', marginBottom: 0 }}>
            Manage staff profiles, department structures, and shift timings.
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

          {activeSubTab === 'staff' && (
            <button
              onClick={handleOpenAddEmployee}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                padding: '0.625rem 1.25rem', borderRadius: '8px', border: 'none',
                backgroundColor: '#0f4c81', color: 'white', fontSize: '0.875rem', fontWeight: 600,
                cursor: 'pointer', boxShadow: '0 2px 4px rgba(15, 76, 129, 0.25)'
              }}
            >
              <UserPlus size={18} />
              <span>Add Staff Member</span>
            </button>
          )}

          {activeSubTab === 'departments' && (
            <button
              onClick={handleOpenAddDept}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                padding: '0.625rem 1.25rem', borderRadius: '8px', border: 'none',
                backgroundColor: '#0284c7', color: 'white', fontSize: '0.875rem', fontWeight: 600,
                cursor: 'pointer', boxShadow: '0 2px 4px rgba(2, 132, 199, 0.25)'
              }}
            >
              <Plus size={18} />
              <span>Add Department</span>
            </button>
          )}

          {activeSubTab === 'shifts' && (
            <button
              onClick={handleOpenAddShift}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                padding: '0.625rem 1.25rem', borderRadius: '8px', border: 'none',
                backgroundColor: '#d97706', color: 'white', fontSize: '0.875rem', fontWeight: 600,
                cursor: 'pointer', boxShadow: '0 2px 4px rgba(217, 119, 6, 0.25)'
              }}
            >
              <Plus size={18} />
              <span>Add Shift Schedule</span>
            </button>
          )}
        </div>
      </div>

      {/* Sub-Tabs */}
      <div style={{
        display: 'flex', gap: '0.5rem', borderBottom: '1px solid #e2e8f0',
        marginBottom: '1.5rem', paddingBottom: '0.25rem'
      }}>
        <button
          onClick={() => setActiveSubTab('staff')}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            padding: '0.75rem 1.25rem', borderRadius: '8px', border: 'none',
            backgroundColor: activeSubTab === 'staff' ? '#e0e7ff' : 'transparent',
            color: activeSubTab === 'staff' ? '#4338ca' : '#64748b',
            fontWeight: activeSubTab === 'staff' ? 700 : 500,
            cursor: 'pointer', fontSize: '0.875rem', transition: 'all 0.15s'
          }}
        >
          <Users size={18} />
          <span>Staff Directory ({employees.filter(e => e.is_active).length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('departments')}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            padding: '0.75rem 1.25rem', borderRadius: '8px', border: 'none',
            backgroundColor: activeSubTab === 'departments' ? '#e0f2fe' : 'transparent',
            color: activeSubTab === 'departments' ? '#0369a1' : '#64748b',
            fontWeight: activeSubTab === 'departments' ? 700 : 500,
            cursor: 'pointer', fontSize: '0.875rem', transition: 'all 0.15s'
          }}
        >
          <Building size={18} />
          <span>Departments ({departments.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('shifts')}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            padding: '0.75rem 1.25rem', borderRadius: '8px', border: 'none',
            backgroundColor: activeSubTab === 'shifts' ? '#fef3c7' : 'transparent',
            color: activeSubTab === 'shifts' ? '#b45309' : '#64748b',
            fontWeight: activeSubTab === 'shifts' ? 700 : 500,
            cursor: 'pointer', fontSize: '0.875rem', transition: 'all 0.15s'
          }}
        >
          <Clock size={18} />
          <span>Shifts & Timings ({shifts.length})</span>
        </button>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div style={{
          backgroundColor: '#ecfdf5', border: '1px solid #a7f3d0', color: '#065f46',
          padding: '0.75rem 1rem', borderRadius: '8px', marginBottom: '1.25rem',
          display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem'
        }}>
          <CheckCircle2 size={18} color="#059669" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div style={{
          backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b',
          padding: '0.75rem 1rem', borderRadius: '8px', marginBottom: '1.25rem',
          display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem'
        }}>
          <AlertCircle size={18} color="#dc2626" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 1: STAFF DIRECTORY */}
      {/* ======================================================== */}
      {activeSubTab === 'staff' && (
        <div>
          {/* Quick Filters */}
          <div style={{
            backgroundColor: 'white', padding: '1rem 1.25rem', borderRadius: '12px',
            border: '1px solid #e2e8f0', marginBottom: '1.25rem',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            flexWrap: 'wrap', gap: '1rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: '280px', flexWrap: 'wrap' }}>
              <div style={{ position: 'relative', width: '280px' }}>
                <Search size={16} color="#9ca3af" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="text"
                  placeholder="Search staff, machine ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: '100%', padding: '0.5rem 0.75rem 0.5rem 2.25rem',
                    border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '0.875rem', outline: 'none'
                  }}
                />
              </div>

              <select
                value={selectedDeptFilter}
                onChange={(e) => setSelectedDeptFilter(e.target.value)}
                style={{
                  padding: '0.5rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '8px',
                  fontSize: '0.875rem', color: '#374151', backgroundColor: 'white', outline: 'none'
                }}
              >
                <option value="ALL">All Departments ({departments.length})</option>
                {departments.map(d => (
                  <option key={d.id} value={d.name}>{d.name} ({deptMembersCount[d.name] || 0})</option>
                ))}
              </select>

              <select
                value={selectedShiftFilter}
                onChange={(e) => setSelectedShiftFilter(e.target.value)}
                style={{
                  padding: '0.5rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '8px',
                  fontSize: '0.875rem', color: '#374151', backgroundColor: 'white', outline: 'none'
                }}
              >
                <option value="ALL">All Shifts ({shifts.length})</option>
                {shifts.map(s => (
                  <option key={s.id} value={s.name}>{s.name} ({shiftMembersCount[s.name] || 0})</option>
                ))}
              </select>
            </div>

            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: '#4b5563', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={showInactive}
                onChange={(e) => setShowInactive(e.target.checked)}
                style={{ borderRadius: '4px', cursor: 'pointer' }}
              />
              <span>Show Former Staff</span>
            </label>
          </div>

          {/* Staff Table */}
          <div style={{
            backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e2e8f0',
            overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
          }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: 600 }}>
                    <th style={{ padding: '0.875rem 1.25rem' }}>Employee Name & Role</th>
                    <th style={{ padding: '0.875rem 1.25rem' }}>Biometric Machine ID</th>
                    <th style={{ padding: '0.875rem 1.25rem' }}>Department</th>
                    <th style={{ padding: '0.875rem 1.25rem' }}>Assigned Shift Timing</th>
                    <th style={{ padding: '0.875rem 1.25rem' }}>Status</th>
                    <th style={{ padding: '0.875rem 1.25rem', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="6" style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
                        <RefreshCw size={24} className="spin" style={{ margin: '0 auto 0.5rem auto' }} />
                        Loading employee directory...
                      </td>
                    </tr>
                  ) : filteredEmployees.length === 0 ? (
                    <tr>
                      <td colSpan="6" style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
                        No staff members found matching your filters.
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

                      const deptObj = departments.find(d => d.name === emp.department_name);

                      return (
                        <tr 
                          key={emp.employee_id} 
                          style={{ borderBottom: '1px solid #f1f5f9', transition: 'background-color 0.15s' }}
                        >
                          {/* Name & Avatar with 360 profile click */}
                          <td style={{ padding: '0.875rem 1.25rem' }}>
                            <div 
                              onClick={() => setViewingProfileEmp(emp)}
                              style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}
                              title="Click to view 360° Employee Profile"
                            >
                              <div style={{
                                width: '38px', height: '38px', borderRadius: '50%',
                                backgroundColor: emp.is_active ? (deptObj?.bg || '#e0e7ff') : '#f1f5f9',
                                color: emp.is_active ? (deptObj?.color || '#4338ca') : '#94a3b8',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontWeight: 700, fontSize: '0.875rem'
                              }}>
                                {initials}
                              </div>
                              <div>
                                <div style={{ fontWeight: 600, color: emp.is_active ? '#0f172a' : '#64748b', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                  <span>{emp.displayName}</span>
                                </div>
                                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                  {emp.designation || 'Team Member'} • DB #{emp.employee_id}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Machine ID */}
                          <td style={{ padding: '0.875rem 1.25rem' }}>
                            <span style={{
                              display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
                              backgroundColor: '#f8fafc', border: '1px solid #e2e8f0',
                              padding: '0.25rem 0.625rem', borderRadius: '6px',
                              fontWeight: 600, color: '#334155', fontSize: '0.75rem'
                            }}>
                              <Fingerprint size={13} color="#0f4c81" />
                              Machine #{emp.displayCode}
                            </span>
                          </td>

                          {/* Department */}
                          <td style={{ padding: '0.875rem 1.25rem' }}>
                            <span style={{
                              display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
                              padding: '0.25rem 0.65rem', borderRadius: '12px',
                              fontSize: '0.75rem', fontWeight: 600,
                              backgroundColor: deptObj?.bg || '#f1f5f9',
                              color: deptObj?.color || '#334155'
                            }}>
                              <Building size={12} />
                              {emp.department_name}
                            </span>
                          </td>

                          {/* Shift */}
                          <td style={{ padding: '0.875rem 1.25rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', color: '#334155', fontSize: '0.8125rem' }}>
                              <Clock size={14} color="#d97706" />
                              <span style={{ fontWeight: 500 }}>{emp.shift_name}</span>
                            </div>
                          </td>

                          {/* Status */}
                          <td style={{ padding: '0.875rem 1.25rem' }}>
                            <span style={{
                              display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
                              padding: '0.2rem 0.5rem', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 500,
                              backgroundColor: emp.is_active ? '#dcfce7' : '#f1f5f9',
                              color: emp.is_active ? '#15803d' : '#64748b'
                            }}>
                              <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: emp.is_active ? '#22c55e' : '#94a3b8' }}></span>
                              {emp.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </td>

                          {/* Actions */}
                          <td style={{ padding: '0.875rem 1.25rem', textAlign: 'right' }}>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                              <button
                                onClick={() => setViewingProfileEmp(emp)}
                                title="View 360° Profile"
                                style={{
                                  padding: '0.375rem', borderRadius: '6px', border: '1px solid #e2e8f0',
                                  backgroundColor: 'white', color: '#0f4c81', cursor: 'pointer'
                                }}
                              >
                                <User size={15} />
                              </button>
                              <button
                                onClick={() => handleOpenEditEmployee(emp)}
                                title="Edit Assignments"
                                style={{
                                  padding: '0.375rem', borderRadius: '6px', border: '1px solid #e2e8f0',
                                  backgroundColor: 'white', color: '#475569', cursor: 'pointer'
                                }}
                              >
                                <Edit3 size={15} />
                              </button>
                              {emp.is_active && (
                                <button
                                  onClick={() => handleOpenDeleteEmployee(emp)}
                                  title="Deactivate / Hide Staff"
                                  style={{
                                    padding: '0.375rem', borderRadius: '6px', border: '1px solid #fee2e2',
                                    backgroundColor: '#fef2f2', color: '#dc2626', cursor: 'pointer'
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
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: DEPARTMENTS MANAGEMENT */}
      {/* ======================================================== */}
      {activeSubTab === 'departments' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.25rem' }}>
            {departments.map((dept) => {
              const membersCount = deptMembersCount[dept.name] || 0;
              const deptEmployees = employees.filter(e => e.is_active && e.department_name === dept.name);

              return (
                <div
                  key={dept.id}
                  style={{
                    backgroundColor: 'white', borderRadius: '14px', border: '1px solid #e2e8f0',
                    padding: '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                    display: 'flex', flexDirection: 'column', justifyContent: 'space-between'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                        <div style={{
                          width: '36px', height: '36px', borderRadius: '8px',
                          backgroundColor: dept.bg || '#e0e7ff', color: dept.color || '#4f46e5',
                          display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                          <Building size={20} />
                        </div>
                        <div>
                          <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>
                            {dept.name}
                          </h4>
                          <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500 }}>
                            {membersCount} {membersCount === 1 ? 'member' : 'members'}
                          </span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '0.375rem' }}>
                        <button
                          onClick={() => handleOpenEditDept(dept)}
                          title="Edit Department"
                          style={{
                            padding: '0.35rem', borderRadius: '6px', border: '1px solid #e2e8f0',
                            backgroundColor: 'white', color: '#475569', cursor: 'pointer'
                          }}
                        >
                          <Edit3 size={14} />
                        </button>
                        <button
                          onClick={() => handleOpenDeleteDept(dept)}
                          title="Delete Department"
                          style={{
                            padding: '0.35rem', borderRadius: '6px', border: '1px solid #fee2e2',
                            backgroundColor: '#fef2f2', color: '#dc2626', cursor: 'pointer'
                          }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    <p style={{ fontSize: '0.8125rem', color: '#64748b', margin: '0 0 1rem 0', lineHeight: 1.4 }}>
                      {dept.description || 'Corporate department unit.'}
                    </p>
                  </div>

                  <div style={{
                    paddingTop: '0.75rem', borderTop: '1px solid #f1f5f9',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      {deptEmployees.slice(0, 4).map((emp, i) => (
                        <div
                          key={emp.employee_id}
                          title={emp.displayName}
                          style={{
                            width: '28px', height: '28px', borderRadius: '50%',
                            backgroundColor: dept.bg || '#e0e7ff', color: dept.color || '#4f46e5',
                            border: '2px solid white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '0.7rem', fontWeight: 700, marginLeft: i > 0 ? '-8px' : 0
                          }}
                        >
                          {(emp.displayName || 'E')[0]}
                        </div>
                      ))}
                      {deptEmployees.length === 0 && (
                        <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontStyle: 'italic' }}>
                          No staff assigned
                        </span>
                      )}
                    </div>

                    <button
                      onClick={() => {
                        setSelectedDeptFilter(dept.name);
                        setActiveSubTab('staff');
                      }}
                      style={{
                        background: 'none', border: 'none', color: '#0f4c81',
                        fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: '0.25rem'
                      }}
                    >
                      <span>View Staff</span>
                      <ArrowRight size={13} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 3: SHIFTS & SCHEDULES */}
      {/* ======================================================== */}
      {activeSubTab === 'shifts' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.25rem' }}>
            {shifts.map((shift) => {
              const membersCount = shiftMembersCount[shift.name] || 0;
              const shiftEmployees = employees.filter(e => e.is_active && e.shift_name?.includes(shift.name));

              return (
                <div
                  key={shift.id}
                  style={{
                    backgroundColor: 'white', borderRadius: '14px', border: '1px solid #e2e8f0',
                    padding: '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                    display: 'flex', flexDirection: 'column', justifyContent: 'space-between'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                        <div style={{
                          width: '36px', height: '36px', borderRadius: '8px',
                          backgroundColor: '#fef3c7', color: '#b45309',
                          display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                          <Clock size={20} />
                        </div>
                        <div>
                          <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>
                            {shift.name}
                          </h4>
                          <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500 }}>
                            {membersCount} {membersCount === 1 ? 'assigned' : 'assigned'}
                          </span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '0.375rem' }}>
                        <button
                          onClick={() => handleOpenEditShift(shift)}
                          title="Edit Shift"
                          style={{
                            padding: '0.35rem', borderRadius: '6px', border: '1px solid #e2e8f0',
                            backgroundColor: 'white', color: '#475569', cursor: 'pointer'
                          }}
                        >
                          <Edit3 size={14} />
                        </button>
                        <button
                          onClick={() => handleOpenDeleteShift(shift)}
                          title="Delete Shift"
                          style={{
                            padding: '0.35rem', borderRadius: '6px', border: '1px solid #fee2e2',
                            backgroundColor: '#fef2f2', color: '#dc2626', cursor: 'pointer'
                          }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    <div style={{
                      backgroundColor: '#f8fafc', padding: '0.875rem', borderRadius: '8px',
                      border: '1px solid #f1f5f9', margin: '0.75rem 0'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                        <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Shift Timings:</span>
                        <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#0f172a' }}>
                          {shift.displayHours}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                        <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Duration:</span>
                        <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#0369a1' }}>
                          {shift.duration || '9h 00m'}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Grace Period:</span>
                        <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#16a34a' }}>
                          {shift.graceMinutes} mins
                        </span>
                      </div>
                    </div>
                  </div>

                  <div style={{
                    paddingTop: '0.75rem', borderTop: '1px solid #f1f5f9',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      {shiftEmployees.slice(0, 3).map((emp, i) => (
                        <div
                          key={emp.employee_id}
                          title={emp.displayName}
                          style={{
                            width: '26px', height: '26px', borderRadius: '50%',
                            backgroundColor: '#fef3c7', color: '#b45309',
                            border: '2px solid white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '0.7rem', fontWeight: 700, marginLeft: i > 0 ? '-6px' : 0
                          }}
                        >
                          {(emp.displayName || 'E')[0]}
                        </div>
                      ))}
                      {shiftEmployees.length === 0 && (
                        <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontStyle: 'italic' }}>
                          No staff assigned
                        </span>
                      )}
                    </div>

                    <button
                      onClick={() => {
                        setSelectedShiftFilter(shift.name);
                        setActiveSubTab('staff');
                      }}
                      style={{
                        background: 'none', border: 'none', color: '#0f4c81',
                        fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: '0.25rem'
                      }}
                    >
                      <span>Filter Staff</span>
                      <ArrowRight size={13} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 360 PROFILE MODAL */}
      {viewingProfileEmp && (
        <EmployeeProfileModal
          employee={viewingProfileEmp}
          rawData={rawData}
          shifts={shifts}
          departments={departments}
          onClose={() => setViewingProfileEmp(null)}
          onEdit={(emp) => handleOpenEditEmployee(emp)}
        />
      )}

      {/* MODAL: ADD / EDIT EMPLOYEE */}
      {(modalMode === 'add_employee' || modalMode === 'edit_employee') && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          backgroundColor: 'rgba(0, 0, 0, 0.5)', backdropFilter: 'blur(3px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
        }}>
          <div style={{
            backgroundColor: 'white', borderRadius: '16px', maxWidth: '540px', width: '100%',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)', overflow: 'hidden'
          }}>
            <div style={{
              padding: '1.25rem 1.5rem', borderBottom: '1px solid #e2e8f0',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}>
              <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 700, color: '#0f172a' }}>
                {modalMode === 'add_employee' ? 'Register New Staff Member' : 'Edit Staff Profile & Assignments'}
              </h3>
              <button
                onClick={() => setModalMode(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveEmployee} style={{ padding: '1.5rem' }}>
              {errorMsg && (
                <div style={{
                  backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b',
                  padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.8125rem'
                }}>
                  {errorMsg}
                </div>
              )}

              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#374151', marginBottom: '0.375rem' }}>
                  Full Name <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Timothy Thomas"
                  value={formEmpName}
                  onChange={(e) => setFormEmpName(e.target.value)}
                  style={{
                    width: '100%', padding: '0.625rem 0.75rem', border: '1px solid #d1d5db',
                    borderRadius: '8px', fontSize: '0.875rem', outline: 'none'
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#374151', marginBottom: '0.375rem' }}>
                    Biometric Machine ID <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 15"
                    value={formEmpCode}
                    onChange={(e) => setFormEmpCode(e.target.value)}
                    style={{
                      width: '100%', padding: '0.625rem 0.75rem', border: '1px solid #d1d5db',
                      borderRadius: '8px', fontSize: '0.875rem', outline: 'none'
                    }}
                  />
                  <span style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '0.25rem', display: 'block' }}>
                    User ID set on physical device
                  </span>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#374151', marginBottom: '0.375rem' }}>
                    Designation / Title
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Lead Developer"
                    value={formEmpDesignation}
                    onChange={(e) => setFormEmpDesignation(e.target.value)}
                    style={{
                      width: '100%', padding: '0.625rem 0.75rem', border: '1px solid #d1d5db',
                      borderRadius: '8px', fontSize: '0.875rem', outline: 'none'
                    }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#374151', marginBottom: '0.375rem' }}>
                  Assign Department <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <select
                  value={formEmpDept}
                  onChange={(e) => setFormEmpDept(e.target.value)}
                  style={{
                    width: '100%', padding: '0.625rem 0.75rem', border: '1px solid #d1d5db',
                    borderRadius: '8px', fontSize: '0.875rem', backgroundColor: 'white', outline: 'none'
                  }}
                >
                  {departments.map(dept => (
                    <option key={dept.id} value={dept.name}>
                      {dept.name}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#374151', marginBottom: '0.375rem' }}>
                  Assign Shift Schedule <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <select
                  value={formEmpShift}
                  onChange={(e) => setFormEmpShift(e.target.value)}
                  style={{
                    width: '100%', padding: '0.625rem 0.75rem', border: '1px solid #d1d5db',
                    borderRadius: '8px', fontSize: '0.875rem', backgroundColor: 'white', outline: 'none'
                  }}
                >
                  {shifts.map(shift => (
                    <option key={shift.id} value={`${shift.name} (${shift.displayHours})`}>
                      {shift.name} ({shift.displayHours})
                    </option>
                  ))}
                </select>
              </div>

              {modalMode === 'edit_employee' && (
                <div style={{ marginBottom: '1.5rem', padding: '0.75rem', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: '#374151', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={formEmpIsActive}
                      onChange={(e) => setFormEmpIsActive(e.target.checked)}
                      style={{ cursor: 'pointer' }}
                    />
                    <span style={{ fontWeight: 600 }}>Active Employee</span>
                  </label>
                  <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block', marginLeft: '1.5rem', marginTop: '0.25rem' }}>
                    Unchecking will mark as inactive while safely preserving past attendance records.
                  </span>
                </div>
              )}

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
                    backgroundColor: '#0f4c81', color: 'white', fontSize: '0.875rem', fontWeight: 600,
                    cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1,
                    display: 'flex', alignItems: 'center', gap: '0.5rem'
                  }}
                >
                  {saving && <RefreshCw size={16} className="spin" />}
                  <span>{modalMode === 'add_employee' ? 'Register Employee' : 'Save Assignments'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD / EDIT DEPARTMENT */}
      {(modalMode === 'add_dept' || modalMode === 'edit_dept') && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          backgroundColor: 'rgba(0, 0, 0, 0.5)', backdropFilter: 'blur(3px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
        }}>
          <div style={{
            backgroundColor: 'white', borderRadius: '16px', maxWidth: '480px', width: '100%',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)', overflow: 'hidden'
          }}>
            <div style={{
              padding: '1.25rem 1.5rem', borderBottom: '1px solid #e2e8f0',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}>
              <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 700, color: '#0f172a' }}>
                {modalMode === 'add_dept' ? 'Create New Department' : 'Edit Department'}
              </h3>
              <button
                onClick={() => setModalMode(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveDept} style={{ padding: '1.5rem' }}>
              {errorMsg && (
                <div style={{ backgroundColor: '#fef2f2', color: '#991b1b', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.8125rem' }}>
                  {errorMsg}
                </div>
              )}

              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#374151', marginBottom: '0.375rem' }}>
                  Department Name <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Mobile Engineering, Sales, Finance"
                  value={formDeptName}
                  onChange={(e) => setFormDeptName(e.target.value)}
                  style={{
                    width: '100%', padding: '0.625rem 0.75rem', border: '1px solid #d1d5db',
                    borderRadius: '8px', fontSize: '0.875rem', outline: 'none'
                  }}
                />
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#374151', marginBottom: '0.375rem' }}>
                  Description
                </label>
                <textarea
                  rows={2}
                  placeholder="Brief description of department scope..."
                  value={formDeptDesc}
                  onChange={(e) => setFormDeptDesc(e.target.value)}
                  style={{
                    width: '100%', padding: '0.625rem 0.75rem', border: '1px solid #d1d5db',
                    borderRadius: '8px', fontSize: '0.875rem', outline: 'none', resize: 'vertical'
                  }}
                />
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#374151', marginBottom: '0.375rem' }}>
                  Badge Theme Color
                </label>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                  {['#4f46e5', '#0284c7', '#0f766e', '#7e22ce', '#c2410c', '#b45309'].map(c => (
                    <button
                      type="button"
                      key={c}
                      onClick={() => setFormDeptColor(c)}
                      style={{
                        width: '32px', height: '32px', borderRadius: '50%', backgroundColor: c,
                        border: formDeptColor === c ? '3px solid #0f172a' : '2px solid white',
                        cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                      }}
                    />
                  ))}
                </div>
              </div>

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
                  style={{
                    padding: '0.625rem 1.5rem', borderRadius: '8px', border: 'none',
                    backgroundColor: '#0284c7', color: 'white', fontSize: '0.875rem', fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  {modalMode === 'add_dept' ? 'Create Department' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD / EDIT SHIFT */}
      {(modalMode === 'add_shift' || modalMode === 'edit_shift') && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          backgroundColor: 'rgba(0, 0, 0, 0.5)', backdropFilter: 'blur(3px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
        }}>
          <div style={{
            backgroundColor: 'white', borderRadius: '16px', maxWidth: '480px', width: '100%',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)', overflow: 'hidden'
          }}>
            <div style={{
              padding: '1.25rem 1.5rem', borderBottom: '1px solid #e2e8f0',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}>
              <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 700, color: '#0f172a' }}>
                {modalMode === 'add_shift' ? 'Create New Shift Timing' : 'Edit Shift Schedule'}
              </h3>
              <button
                onClick={() => setModalMode(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveShift} style={{ padding: '1.5rem' }}>
              {errorMsg && (
                <div style={{ backgroundColor: '#fef2f2', color: '#991b1b', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.8125rem' }}>
                  {errorMsg}
                </div>
              )}

              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#374151', marginBottom: '0.375rem' }}>
                  Shift Name <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. General Shift, Night Shift"
                  value={formShiftName}
                  onChange={(e) => setFormShiftName(e.target.value)}
                  style={{
                    width: '100%', padding: '0.625rem 0.75rem', border: '1px solid #d1d5db',
                    borderRadius: '8px', fontSize: '0.875rem', outline: 'none'
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#374151', marginBottom: '0.375rem' }}>
                    Start Time (In) <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="time"
                    required
                    value={formShiftStart}
                    onChange={(e) => setFormShiftStart(e.target.value)}
                    style={{
                      width: '100%', padding: '0.625rem 0.75rem', border: '1px solid #d1d5db',
                      borderRadius: '8px', fontSize: '0.875rem', outline: 'none'
                    }}
                  />
                  <span style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '0.25rem', display: 'block' }}>
                    {formatTimeDisplay(formShiftStart)}
                  </span>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#374151', marginBottom: '0.375rem' }}>
                    End Time (Out) <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="time"
                    required
                    value={formShiftEnd}
                    onChange={(e) => setFormShiftEnd(e.target.value)}
                    style={{
                      width: '100%', padding: '0.625rem 0.75rem', border: '1px solid #d1d5db',
                      borderRadius: '8px', fontSize: '0.875rem', outline: 'none'
                    }}
                  />
                  <span style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '0.25rem', display: 'block' }}>
                    {formatTimeDisplay(formShiftEnd)}
                  </span>
                </div>
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#374151', marginBottom: '0.375rem' }}>
                  Late-Mark Grace Period (Minutes)
                </label>
                <input
                  type="number"
                  min="0"
                  max="60"
                  value={formShiftGrace}
                  onChange={(e) => setFormShiftGrace(e.target.value)}
                  style={{
                    width: '100%', padding: '0.625rem 0.75rem', border: '1px solid #d1d5db',
                    borderRadius: '8px', fontSize: '0.875rem', outline: 'none'
                  }}
                />
                <span style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '0.25rem', display: 'block' }}>
                  Staff arriving up to {formShiftGrace} minutes past {formatTimeDisplay(formShiftStart)} won&apos;t be marked late.
                </span>
              </div>

              <div style={{ padding: '0.75rem', backgroundColor: '#f0f9ff', borderRadius: '8px', marginBottom: '1.5rem', border: '1px solid #bae6fd' }}>
                <div style={{ fontSize: '0.8125rem', color: '#0369a1', fontWeight: 600 }}>
                  Calculated Duration: {calcDuration(formShiftStart, formShiftEnd)}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#0284c7', marginTop: '0.25rem' }}>
                  Display: {formatTimeDisplay(formShiftStart)} - {formatTimeDisplay(formShiftEnd)}
                </div>
              </div>

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
                  style={{
                    padding: '0.625rem 1.5rem', borderRadius: '8px', border: 'none',
                    backgroundColor: '#d97706', color: 'white', fontSize: '0.875rem', fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  {modalMode === 'add_shift' ? 'Create Shift' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: DELETE CONFIRMATION */}
      {(modalMode === 'delete_employee' || modalMode === 'delete_dept' || modalMode === 'delete_shift') && activeItem && (
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

            <h3 style={{ textAlign: 'center', fontSize: '1.125rem', fontWeight: 700, color: '#0f172a', margin: '0 0 0.5rem 0' }}>
              {modalMode === 'delete_employee' 
                ? `Deactivate ${activeItem.displayName}?`
                : modalMode === 'delete_dept'
                ? `Delete Department "${activeItem.name}"?`
                : `Delete Shift "${activeItem.name}"?`}
            </h3>

            <p style={{ textAlign: 'center', fontSize: '0.875rem', color: '#64748b', margin: '0 0 1.5rem 0', lineHeight: 1.5 }}>
              {modalMode === 'delete_employee' && (
                <>This will remove <strong>{activeItem.displayName}</strong> from active daily lists. Historical attendance logs are preserved safely.</>
              )}
              {modalMode === 'delete_dept' && (
                <>Are you sure you want to remove the <strong>{activeItem.name}</strong> department?</>
              )}
              {modalMode === 'delete_shift' && (
                <>Are you sure you want to remove the <strong>{activeItem.name}</strong> shift schedule?</>
              )}
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
                onClick={
                  modalMode === 'delete_employee' 
                    ? handleConfirmDeactivateEmployee
                    : modalMode === 'delete_dept'
                    ? handleDeleteDept
                    : handleDeleteShift
                }
                disabled={saving}
                style={{
                  flex: 1, padding: '0.625rem', borderRadius: '8px', border: 'none',
                  backgroundColor: '#dc2626', color: 'white', fontSize: '0.875rem', fontWeight: 600,
                  cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1
                }}
              >
                {saving ? 'Processing...' : 'Confirm Remove'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
