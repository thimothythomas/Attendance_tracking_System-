// Shared workforce data store, defaults, and cross-component synchronization

export const INITIAL_DEPARTMENTS = [
  { id: 'dept_1', name: 'Development', description: 'Software engineering, web & backend systems', color: '#4f46e5', bg: '#e0e7ff', head: 'Alex Morgan' },
  { id: 'dept_2', name: 'Design', description: 'UI/UX, branding, product graphic assets', color: '#7e22ce', bg: '#f3e8ff', head: 'Sophia Reed' },
  { id: 'dept_3', name: 'Marketing', description: 'Growth, performance marketing, content', color: '#c2410c', bg: '#ffedd5', head: 'Liam Vance' },
  { id: 'dept_4', name: 'Operations', description: 'Logistics, office management, IT equipment', color: '#0369a1', bg: '#e0f2fe', head: 'David Kim' },
  { id: 'dept_5', name: 'Human Resources', description: 'People operations, payroll & compliance', color: '#0f766e', bg: '#ccfbf1', head: 'Rachel Green' },
  { id: 'dept_6', name: 'Quality Assurance', description: 'Manual and automated testing pipelines', color: '#b45309', bg: '#fef3c7', head: 'Marcus Lee' }
];

export const INITIAL_SHIFTS = [
  { id: 'shift_gen', name: 'General Shift', startTime: '09:30', endTime: '18:30', graceMinutes: 15, displayHours: '09:30 AM - 06:30 PM', isDefault: true },
  { id: 'shift_morn', name: 'Morning Shift', startTime: '08:30', endTime: '17:30', graceMinutes: 15, displayHours: '08:30 AM - 05:30 PM' },
  { id: 'shift_eve', name: 'Evening Shift', startTime: '11:00', endTime: '20:00', graceMinutes: 15, displayHours: '11:00 AM - 08:00 PM' },
  { id: 'shift_flex', name: 'Flexible Timing', startTime: '10:00', endTime: '19:00', graceMinutes: 30, displayHours: 'Flexible (8h required)' }
];

export function getStoredConfig(key, fallback) {
  try {
    if (typeof window !== 'undefined') {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    }
  } catch {}
  return fallback;
}

export function saveStoredConfig(key, val) {
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem(key, JSON.stringify(val));
      window.dispatchEvent(new CustomEvent('inxl_data_updated', { detail: { key, val } }));
    }
  } catch {}
}

export function enrichEmployees(employeesData = []) {
  return employeesData
    .filter(emp => {
      const isDelName = emp.employee_name && emp.employee_name.startsWith('del_');
      const isDelCode = emp.employee_code && String(emp.employee_code).startsWith('del_');
      const isCode11 = String(emp.employee_code) === '11' || String(emp.employee_id) === '11';
      return !isDelName && !isDelCode && !isCode11;
    })
    .map(emp => {
      const defaultDept = emp.department_id === '2' ? 'Design' : emp.department_id === '3' ? 'Marketing' : 'Development';
      const cleanName = emp.employee_name || emp.name || `Staff #${emp.employee_code || emp.employee_id || ''}`;
      const cleanCode = emp.employee_code || emp.emp_id || emp.employee_id || '';

      return {
        ...emp,
        name: cleanName,
        emp_id: cleanCode,
        is_active: emp.is_active !== false,
        displayName: cleanName,
        displayCode: cleanCode,
        department_name: emp.department_name || defaultDept,
        shift_id: 'shift_gen',
        shift_name: emp.shift_name || emp.shift || 'General Shift (09:30 AM - 06:30 PM)',
        designation: emp.designation || 'Team Member'
      };
    });
}
