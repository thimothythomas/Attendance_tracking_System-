"use client";

import { useState, useMemo, useRef, useEffect } from 'react'
import { Users, Building, Clock, CheckCircle, XCircle, Calendar, Search, X, LayoutDashboard, FileText, Settings, LogOut, Download, Upload, Lock, Eye, EyeOff, ArrowUpRight } from 'lucide-react'
import * as XLSX from 'xlsx'
import { supabase } from '@/lib/supabase'
import EmployeeManagement from '@/components/EmployeeManagement'
import OverviewDashboard from '@/components/OverviewDashboard'
import SettingsView from '@/components/SettingsView'
import EmployeeProfileModal from '@/components/EmployeeProfileModal'
import CalendarView from '@/components/CalendarView'
import { getIndianHolidays } from '@/lib/indianHolidays'
import { INITIAL_DEPARTMENTS, INITIAL_SHIFTS, getStoredConfig, enrichEmployees } from '@/lib/workforceStore'

function App() {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedEmployee, setSelectedEmployee] = useState(null)
  const [activeTab, setActiveTab] = useState('overview')
  const [statusFilter, setStatusFilter] = useState('All')
  const [selectedMonth, setSelectedMonth] = useState('All')
  const [selectedWeek, setSelectedWeek] = useState('All')
  const [rawData, setRawData] = useState([])
  const [allEmployees, setAllEmployees] = useState([])
  const [departments, setDepartments] = useState(INITIAL_DEPARTMENTS)
  const [shifts, setShifts] = useState(INITIAL_SHIFTS)
  const [selectedDeptFilter, setSelectedDeptFilter] = useState('ALL')
  const [viewingProfileEmp, setViewingProfileEmp] = useState(null)
  const [loading, setLoading] = useState(false)
  const fileInputRef = useRef(null)

  const [debugData, setDebugData] = useState(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loginError, setLoginError] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  useEffect(() => {
    if (typeof window !== 'undefined' && localStorage.getItem('inxl_auth') === 'true') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsAuthenticated(true)
    }
  }, [])



  const fetchAttendanceData = async () => {
    setLoading(true)

    const formatTime = (dateTimeStr) => {
      if (!dateTimeStr || dateTimeStr.includes('1900-01-01')) return '--:--';
      const parts = dateTimeStr.split(' ');
      if (parts.length > 1) {
        const timeParts = parts[1].split(':');
        return `${timeParts[0]}:${timeParts[1]}`;
      }
      return dateTimeStr;
    };

    const formatMinutes = (minStr) => {
      if (!minStr || minStr === '0' || minStr === '') return '00:00';
      const totalMins = parseInt(minStr, 10);
      if (isNaN(totalMins)) return '00:00';
      const hours = Math.floor(totalMins / 60);
      const mins = totalMins % 60;
      return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
    };

    try {
      const { data: logs, error: logsError } = await supabase
        .from('attendance_logs')
        .select(`
          attendance_date,
          employee_id,
          in_time,
          out_time,
          duration,
          late_by,
          early_by,
          overtime,
          punch_records,
          present,
          absent,
          status,
          weekly_off,
          holiday,
          employees (
            employee_name,
            employee_code,
            department_id
          )
        `)
        .order('attendance_date', { ascending: false })

      if (logsError) throw logsError

      const { data: employeesData, error: empError } = await supabase
        .from('employees')
        .select('*')
      if (empError) throw empError
      
      const activeEmployees = enrichEmployees(employeesData || [])
      setAllEmployees(activeEmployees)

      const formatted = logs
        .filter(log => {
          const name = log.employees?.employee_name || '';
          const code = log.employees?.employee_code || '';
          return !name.startsWith('del_') && code !== '11';
        })
        .map(log => {
          const statusStr = log.status || (log.present ? 'Present' : 'Absent');
          const [rawStatus, shiftName] = statusStr.split('||');
          
          return {
            date: log.attendance_date,
            emp_id: log.employees?.employee_code || log.employee_id,
            name: log.employees?.employee_name || 'Unknown',
            emp_code: log.employees?.employee_code || '',
            in_time: formatTime(log.in_time),
            out_time: formatTime(log.out_time),
            total_duration: formatMinutes(log.duration),
            late_by: formatMinutes(log.late_by),
            early_going_by: formatMinutes(log.early_by),
            overtime: formatMinutes(log.overtime),
            punch_records: log.punch_records || '',
            status: rawStatus,
            shift: (shiftName === 'Nightshift' ? 'NS' : shiftName?.replace(/\(?\s*P\s*-\s*0A\)?/gi, '')?.trim()) || '',
            weekly_off: log.weekly_off || false,
            holiday: log.holiday || false,
          };
        })
      
      setRawData(formatted)
    } catch (err) {
      console.error('Fetch error:', err)
      alert('Failed to fetch live attendance data: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const reloadMeta = () => {
      const d = getStoredConfig('inxl_departments', INITIAL_DEPARTMENTS);
      const s = getStoredConfig('inxl_shifts', INITIAL_SHIFTS);
      setDepartments(d);
      setShifts(s);
    };
    reloadMeta();

    const handleSyncEvent = () => {
      reloadMeta();
      fetchAttendanceData();
    };
    window.addEventListener('inxl_data_updated', handleSyncEvent);
    window.addEventListener('storage', handleSyncEvent);
    return () => {
      window.removeEventListener('inxl_data_updated', handleSyncEvent);
      window.removeEventListener('storage', handleSyncEvent);
    };
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchAttendanceData()
    }
  }, [isAuthenticated])

  const parseDate = (dateStr) => {
    if (!dateStr) return new Date()
    
    // Check if it's already in YYYY-MM-DD format (from Supabase)
    if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const [y, m, d] = dateStr.split('-')
      return new Date(parseInt(y), parseInt(m) - 1, parseInt(d))
    }
    
    // Legacy Excel format fallback (DD-MMM-YYYY)
    const months = { 'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5, 'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11 }
    const parts = dateStr.split('-')
    if (parts.length === 3 && isNaN(parseInt(parts[1]))) {
      return new Date(parseInt(parts[2]), months[parts[1]] || 0, parseInt(parts[0]))
    }
    
    return new Date(dateStr)
  }

  const handleFileUpload = (e) => {
    const file = e.target.files[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (evt) => {
      try {
        const arrayBuffer = evt.target.result
        const workbook = XLSX.read(arrayBuffer, { type: 'array' })
        const sheetName = workbook.SheetNames[0]
        const sheet = workbook.Sheets[sheetName]
        const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' })

        const parsedData = []
        let currentDate = null

        // Find the header row to map column indices dynamically
        const headerIdx = data.findIndex(row => row && row.some(c => String(c).trim() === 'E. Code'))
        if (headerIdx === -1) {
          setDebugData(data.slice(0, 30))
          alert('Could not find the table header (E. Code) in this file. Please check the format.')
          return
        }

        // Pre-scan for the initial date before or on the header row
        for (let i = 0; i <= headerIdx; i++) {
          const row = data[i]
          if (!row) continue
          for (let c of row) {
             if (!c) continue
             const s = String(c).trim()
             const parts = s.split('-')
             if (parts.length === 3 && (s.includes('202') || s.includes('-26'))) {
                 currentDate = s
             }
          }
        }

        const headerRow = data[headerIdx]
        const colMap = {}
        headerRow.forEach((c, i) => {
          if (!c) return
          const colName = String(c).trim().toLowerCase()
          if (colName.includes('name')) colMap.name = i
          else if (colName.includes('e. code')) colMap.emp_id = i
          else if (colName.includes('shift')) colMap.shift = i
          else if (colName.includes('intime')) colMap.in_time = i
          else if (colName.includes('outtime')) colMap.out_time = i
          else if (colName.includes('work dur')) colMap.work_duration = i
          else if (colName === 'ot') colMap.overtime = i
          else if (colName.includes('tot. dur') || colName.includes('tot.  dur')) colMap.total_duration = i
          else if (colName.includes('status')) colMap.status = i
          else if (colName.includes('late')) colMap.late_by = i
          else if (colName.includes('early')) colMap.early_going_by = i
          else if (colName.includes('punch')) colMap.punch_records = i
        })

        for (let i = headerIdx + 1; i < data.length; i++) {
          const row = data[i]
          if (!row || row.length === 0) continue

          // 1. Try to find a date in this row
          let foundDate = null
          for (let c of row) {
             if (!c) continue
             const s = String(c).trim()
             const parts = s.split('-')
             if (parts.length === 3 && (s.includes('202') || s.includes('-26'))) {
                 foundDate = s
                 break
             }
          }
          
          if (foundDate) {
             currentDate = foundDate
             continue
          }

          // 2. Parse employee row using the column map
          if (colMap.name !== undefined && colMap.status !== undefined) {
              const name = String(row[colMap.name] || '').trim()
              const emp_id = String(row[colMap.emp_id] || '').trim()
              const status = String(row[colMap.status] || '').trim()
              
              if (name && name !== 'Name' && name !== 'Company:' && emp_id) {
                  let in_time_val = colMap.in_time !== undefined ? row[colMap.in_time] : null;
                  let out_time_val = colMap.out_time !== undefined ? row[colMap.out_time] : null;
                  let late_by_val = colMap.late_by !== undefined ? row[colMap.late_by] : null;
                  let early_going_by_val = colMap.early_going_by !== undefined ? row[colMap.early_going_by] : null;

                  parsedData.push({
                      date: currentDate,
                      emp_id: emp_id,
                      name: name,
                      shift: colMap.shift !== undefined ? row[colMap.shift] : null,
                      s_in_time: null, // Basic report doesn't have shift in/out time
                      s_out_time: null,
                      in_time: in_time_val,
                      out_time: out_time_val,
                      work_duration: colMap.work_duration !== undefined ? row[colMap.work_duration] : null,
                      overtime: colMap.overtime !== undefined ? row[colMap.overtime] : null,
                      total_duration: colMap.total_duration !== undefined ? row[colMap.total_duration] : null,
                      late_by: late_by_val,
                      early_going_by: early_going_by_val,
                      status: status,
                      punch_records: colMap.punch_records !== undefined ? row[colMap.punch_records] : null
                  })
              }
          }
        }
        
        if (parsedData.length === 0) {
          setDebugData(data.slice(0, 30))
          alert('Could not find any attendance records in this file. Please check the format. Scroll down to see debug info.')
        } else {
          setDebugData(null)
          setRawData(parsedData)
        }
      } catch (err) {
        console.error('Failed to parse excel:', err)
        alert('Failed to parse the file. Ensure it is a valid Excel file.')
      } finally {
        e.target.value = ''
      }
    }
    reader.readAsArrayBuffer(file)
  }

  const availableMonths = useMemo(() => {
    if (!rawData || rawData.length === 0) return [];
    const monthObjs = new Map();
    rawData.forEach(record => {
       const d = parseDate(record.date);
       const val = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2, '0')}`;
       const label = d.toLocaleDateString('default', { month: 'long', year: 'numeric' });
       monthObjs.set(val, label);
    });
    return Array.from(monthObjs.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  }, [rawData]);

  const filteredRawData = useMemo(() => {
    let data = rawData;
    if (selectedMonth !== 'All') {
      data = data.filter(record => {
        const d = parseDate(record.date);
        const val = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2, '0')}`;
        return val === selectedMonth;
      });
    }

    if (selectedWeek !== 'All') {
      data = data.filter(record => {
         const d = parseDate(record.date);
         const week = Math.ceil(d.getDate() / 7);
         return `Week ${week}` === selectedWeek;
      });
    }
    
    return data;
  }, [rawData, selectedMonth, selectedWeek]);

  // Group data by employee
  const employeeSummaries = useMemo(() => {
    const map = new Map()

    // Pre-populate map with all active employees so they show up even if they have 0 logs
    allEmployees.forEach(emp => {
      map.set(emp.employee_code, {
        emp_id: emp.employee_code,
        name: emp.displayName || emp.employee_name,
        department_name: emp.department_name || 'Development',
        shift_name: emp.shift_name || 'General Shift (09:30 AM - 06:30 PM)',
        designation: emp.designation || 'Team Member',
        totalDays: 0,
        present: 0,
        absent: 0,
        leave: 0,
        totalMinutesWorked: 0,
        records: []
      })
    })

    filteredRawData.forEach(record => {
      // Check if it's a weekend (Saturday = 6, Sunday = 0)
      const dateObj = parseDate(record.date)
      const dayOfWeek = dateObj.getDay()
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        return // Skip weekends
      }

      const { emp_id, name, status } = record
      if (!map.has(emp_id)) {
        const empMeta = allEmployees.find(e => String(e.employee_code) === String(emp_id) || String(e.employee_id) === String(emp_id));
        map.set(emp_id, {
          emp_id,
          name: empMeta?.displayName || name,
          department_name: empMeta?.department_name || 'Development',
          shift_name: empMeta?.shift_name || 'General Shift (09:30 AM - 06:30 PM)',
          designation: empMeta?.designation || 'Team Member',
          totalDays: 0,
          present: 0,
          absent: 0,
          leave: 0,
          totalMinutesWorked: 0,
          records: []
        })
      }

      const emp = map.get(emp_id)
      emp.totalDays += 1

      // Evaluate final status strictly but respecting leaves/holidays
      let finalStatus = 'Absent'
      let isLeaveType = false
      
      if (record.weekly_off || status.includes('WeeklyOff') || status.includes('Holiday') || record.holiday) {
        isLeaveType = true
        finalStatus = 'Leave'
      }

      // If they punched in, they are Present (even if on leave)
      if (record.punch_records && typeof record.punch_records === 'string' && record.punch_records.trim() !== '' && record.punch_records.trim() !== 'No Punches') {
        finalStatus = 'Present'
      } else if (status && status.includes('Absent No OutPunch')) {
        finalStatus = 'Absent'
      }

      // Track the metrics accurately
      if (finalStatus === 'Present') {
        emp.present += 1
        record.status = isLeaveType ? 'Present (Leave)' : 'Present'
      } else if (isLeaveType) {
        emp.leave += 1
        record.status = status.includes('WeeklyOff') || record.weekly_off ? 'Weekly Off' : 'Holiday'
      } else {
        emp.absent += 1
        record.status = 'Absent'
      }

      emp.records.push(record)

      // Parse total_duration (e.g., "9:28") to minutes and add to total
      if (record.total_duration && record.total_duration !== '--:--' && record.total_duration !== '00:00') {
        const parts = record.total_duration.split(':')
        if (parts.length === 2) {
          const hours = parseInt(parts[0], 10)
          const mins = parseInt(parts[1], 10)
          if (!isNaN(hours) && !isNaN(mins)) {
            emp.totalMinutesWorked += (hours * 60) + mins
          }
        }
      }
    })

    const result = Array.from(map.values());
    result.sort((a, b) => {
      const idA = parseInt(a.emp_id, 10);
      const idB = parseInt(b.emp_id, 10);
      if (!isNaN(idA) && !isNaN(idB)) {
        return idA - idB;
      }
      return String(a.emp_id).localeCompare(String(b.emp_id));
    });

    // Make sure totalDays matches the max working days so empty employees don't say 0 days while others say 12
    const maxWorkingDays = result.reduce((max, emp) => Math.max(max, emp.totalDays), 0)
    result.forEach(emp => {
      if (emp.totalDays === 0 && maxWorkingDays > 0) {
        emp.totalDays = maxWorkingDays
        emp.absent = maxWorkingDays
      }
    })

    return result;
  }, [filteredRawData, allEmployees])

  // Filter employees based on search
  const filteredEmployees = useMemo(() => {
    return employeeSummaries.filter(emp => {
      const matchSearch = emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          emp.emp_id.toString().includes(searchTerm);
      const matchDept = selectedDeptFilter === 'ALL' || emp.department_name === selectedDeptFilter;
      return matchSearch && matchDept;
    });
  }, [searchTerm, selectedDeptFilter, employeeSummaries])

  const getStatusBadge = (status) => {
    if (status.includes('Present')) {
      return <span className="status-badge status-present"><CheckCircle size={12} /> {status}</span>
    } else if (status === 'Absent') {
      return <span className="status-badge status-absent"><XCircle size={12} /> {status}</span>
    } else if (status.includes('WeeklyOff') || status.includes('Holiday')) {
      return <span className="status-badge status-leave"><Calendar size={12} /> {status}</span>
    }
    return <span className="status-badge status-neutral">{status}</span>
  }

  const downloadEmployeeData = () => {
    if (!selectedEmployee) return
    const activeModalEmp = employeeSummaries.find(e => e.emp_id === selectedEmployee.emp_id) || selectedEmployee;

    const dataForExcel = activeModalEmp.records
      .filter(record => statusFilter === 'All' || record.status === statusFilter)
      .map(record => ({
        'Date': record.date,
        'Status': record.status,
        'Shift': record.shift || '-',
        'In Time': record.in_time || '--:--',
        'Out Time': record.out_time || '--:--',
        'Late By': record.late_by !== '00:00' ? record.late_by : '-',
        'Early Go': record.early_going_by !== '00:00' ? record.early_going_by : '-',
        'OT': record.overtime !== '00:00' ? record.overtime : '-',
        'Total Dur.': record.total_duration || '--:--',
        'Punch Records': record.punch_records || 'No records'
      }))

    const worksheet = XLSX.utils.json_to_sheet(dataForExcel)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Punch Records')
    XLSX.writeFile(workbook, `${selectedEmployee.name.replace(/ /g, '_')}_Attendance.xlsx`)
  }

  const downloadData = () => {
    const dataForExcel = filteredEmployees.map(emp => {
      const percent = emp.totalDays > 0 ? Math.round((emp.present / emp.totalDays) * 100) : 0
      return {
        'Emp ID': emp.emp_id,
        'Employee Name': emp.name,
        'Total Days': emp.totalDays,
        'Present': emp.present,
        'Absent': emp.absent,
        'Worked Hours': `${Math.floor(emp.totalMinutesWorked / 60)}h ${emp.totalMinutesWorked % 60}m`,
        'Attendance %': `${percent}%`
      }
    })

    const worksheet = XLSX.utils.json_to_sheet(dataForExcel)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Attendance Report')
    XLSX.writeFile(workbook, 'attendance_report.xlsx')
  }

  const renderDashboard = () => (
    <>
      <div className="bento-grid" style={{ marginBottom: '1.5rem' }}>
        {/* Total Staff Bento Card */}
        <div className="bento-card" style={{ gridColumn: 'span 4' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#161245', fontWeight: 700, fontSize: '0.95rem' }}>
              <Users size={18} />
              <span>Total Workforce</span>
            </div>
            <span className="bento-corner-arrow">
              <ArrowUpRight size={16} />
            </span>
          </div>
          <div style={{ fontSize: '2.5rem', fontWeight: 900, color: '#161245', letterSpacing: '-0.03em', lineHeight: 1, marginBottom: '0.5rem' }}>
            {filteredEmployees.length}
          </div>
          <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b', fontWeight: 500 }}>
            Active registered personnel
          </p>
        </div>

        {/* Total Working Days - VIBRANT LIME GREEN */}
        <div className="bento-card bento-card-lime" style={{ gridColumn: 'span 4' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#161245', fontWeight: 800, fontSize: '0.95rem' }}>
              <Calendar size={18} />
              <span>Working Days</span>
            </div>
            <span className="bento-corner-arrow" style={{ background: '#161245', color: '#90d152' }}>
              <ArrowUpRight size={16} />
            </span>
          </div>
          <div style={{ fontSize: '2.5rem', fontWeight: 900, color: '#161245', letterSpacing: '-0.03em', lineHeight: 1, marginBottom: '0.5rem' }}>
            {(() => {
              const totalWorkingDays = filteredEmployees.length > 0 ? Math.max(...filteredEmployees.map(emp => emp.totalDays)) : 0;
              return totalWorkingDays;
            })()}
          </div>
          <p style={{ margin: 0, fontSize: '0.8rem', color: 'rgba(22, 18, 69, 0.75)', fontWeight: 600 }}>
            Scheduled operational days
          </p>
        </div>

        {/* Absence Ratio - MATTE BLACK */}
        <div className="bento-card bento-card-dark" style={{ gridColumn: 'span 4' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#f8fafc', fontWeight: 700, fontSize: '0.95rem' }}>
              <XCircle size={18} color="#90d152" />
              <span>Absence Ratio</span>
            </div>
            <span style={{ fontSize: '0.725rem', padding: '0.2rem 0.6rem', borderRadius: '9999px', background: 'rgba(255,255,255,0.1)', color: '#90d152', fontWeight: 700 }}>
              Period
            </span>
          </div>
          <div style={{ fontSize: '2.5rem', fontWeight: 900, color: '#ffffff', letterSpacing: '-0.03em', lineHeight: 1, marginBottom: '0.5rem' }}>
            {(() => {
              const totalAbsent = filteredEmployees.reduce((sum, emp) => sum + emp.absent, 0);
              const totalDays = filteredEmployees.reduce((sum, emp) => sum + emp.totalDays, 0);
              return totalDays > 0 ? Math.round((totalAbsent / totalDays) * 100) + '%' : '0%';
            })()}
          </div>
          <p style={{ margin: 0, fontSize: '0.8rem', color: '#94a3b8', fontWeight: 500 }}>
            Unscheduled absences & leaves
          </p>
        </div>
      </div>

      <div className="content-card">
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: '#1e293b' }}>Employee Attendance Summary</h3>
            <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.8rem', color: '#64748b' }}>Click any row to view individual daily records</p>
          </div>
        </div>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Emp ID</th>
                <th>Employee Name</th>
                <th>Department</th>
                <th>Shift</th>
                <th>Total Days</th>
                <th>Present</th>
                <th>Absent</th>
                <th>Worked Hours</th>
                <th>Attendance %</th>
              </tr>
            </thead>
            <tbody>
              {filteredEmployees.length > 0 ? (
                filteredEmployees.map((emp) => {
                  const percent = emp.totalDays > 0 ? Math.round((emp.present / emp.totalDays) * 100) : 0
                  return (
                    <tr
                      key={emp.emp_id}
                      className="clickable-row"
                      onClick={() => {
                        setSelectedEmployee(emp)
                        setStatusFilter('All')
                      }}
                    >
                      <td className="emp-id">{emp.emp_id}</td>
                      <td className="emp-name">
                        <strong>{emp.name}</strong>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{emp.designation || 'Team Member'}</div>
                      </td>
                      <td>
                        <span style={{
                          display: 'inline-block',
                          padding: '0.2rem 0.65rem',
                          borderRadius: '12px',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          backgroundColor: departments.find(d => d.name === emp.department_name)?.bg || '#e0e7ff',
                          color: departments.find(d => d.name === emp.department_name)?.color || '#4f46e5'
                        }}>
                          {emp.department_name || 'Development'}
                        </span>
                      </td>
                      <td>
                        <span style={{
                          display: 'inline-block',
                          padding: '0.2rem 0.5rem',
                          borderRadius: '6px',
                          fontSize: '0.75rem',
                          backgroundColor: '#f1f5f9',
                          color: '#475569'
                        }}>
                          {emp.shift_name ? emp.shift_name.split('(')[0].trim() : 'General Shift'}
                        </span>
                      </td>
                      <td>{emp.totalDays}</td>
                      <td className="text-success font-medium">{emp.present}</td>
                      <td className="text-danger font-medium">{emp.absent}</td>
                      <td>
                        <span style={{ fontWeight: 800, color: '#161245' }}>
                          {Math.floor(emp.totalMinutesWorked / 60)}h {emp.totalMinutesWorked % 60}m
                        </span>
                      </td>
                      <td>
                        <div className="progress-cell">
                          <div className="progress-bar-container">
                            <div
                              className="progress-bar"
                              style={{
                                width: `${percent}%`,
                                backgroundColor: percent > 80 ? 'var(--success)' : percent > 50 ? 'var(--warning)' : 'var(--danger)',
                              }}
                            ></div>
                          </div>
                          <span className="progress-text">{percent}%</span>
                        </div>
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan="9" style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '3rem' }}>
                    No employees found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )

  const renderReports = () => {
    // 1. Daily Attendance Trend
    const dailyStats = new Map()
    filteredRawData.forEach(record => {
      const dateObj = parseDate(record.date)
      const dayOfWeek = dateObj.getDay()
      if (dayOfWeek === 0 || dayOfWeek === 6) return;

      if (!dailyStats.has(record.date)) {
        dailyStats.set(record.date, { present: 0, absent: 0 })
      }
      const stat = dailyStats.get(record.date)
      if (record.status === 'Present') stat.present++
      else stat.absent++
    })

    const trends = Array.from(dailyStats.entries()).map(([date, stats]) => {
      const total = stats.present + stats.absent
      const rate = total > 0 ? Math.round((stats.present / total) * 100) : 0
      return { date, rate, ...stats }
    }).sort((a, b) => parseDate(a.date) - parseDate(b.date))

    // 2. Punctuality (Late arrivals)
    const punctuality = new Map()
    filteredRawData.forEach(record => {
      if (!punctuality.has(record.emp_id)) {
        punctuality.set(record.emp_id, { emp_id: record.emp_id, name: record.name, lateCount: 0, earlyCount: 0 })
      }
      const stat = punctuality.get(record.emp_id)
      if (record.late_by && record.late_by !== '00:00' && record.late_by !== '-') stat.lateCount++
      if (record.early_going_by && record.early_going_by !== '00:00' && record.early_going_by !== '-') stat.earlyCount++
    })
    const lateLeaders = Array.from(punctuality.values()).filter(p => p.lateCount > 0).sort((a, b) => b.lateCount - a.lateCount).slice(0, 10)
    
    // 3. Overtime Leaders
    const overtimeStats = new Map()
    filteredRawData.forEach(record => {
      if (!overtimeStats.has(record.emp_id)) {
        overtimeStats.set(record.emp_id, { emp_id: record.emp_id, name: record.name, otMinutes: 0 })
      }
      const stat = overtimeStats.get(record.emp_id)
      if (record.overtime && record.overtime !== '00:00' && record.overtime !== '-') {
        const parts = record.overtime.split(':')
        if (parts.length === 2) {
          stat.otMinutes += (parseInt(parts[0]) * 60) + parseInt(parts[1])
        }
      }
    })
    const otLeaders = Array.from(overtimeStats.values()).filter(o => o.otMinutes > 0).sort((a, b) => b.otMinutes - a.otMinutes).slice(0, 10)

    // 4. Department performance
    const deptStats = new Map()
    filteredEmployees.forEach(emp => {
      const dept = emp.department_name || 'Unassigned'
      if (!deptStats.has(dept)) deptStats.set(dept, { dept, present: 0, total: 0, employees: 0 })
      const s = deptStats.get(dept)
      s.present += emp.present
      s.total += emp.totalDays
      s.employees++
    })
    const deptPerformance = Array.from(deptStats.values())
      .map(d => ({ ...d, rate: d.total > 0 ? Math.round((d.present / d.total) * 100) : 0 }))
      .sort((a, b) => b.rate - a.rate)

    // 5. Early departures
    const earlyStats = new Map()
    filteredRawData.forEach(record => {
      if (!earlyStats.has(record.emp_id)) {
        earlyStats.set(record.emp_id, { emp_id: record.emp_id, name: record.name, earlyCount: 0 })
      }
      const stat = earlyStats.get(record.emp_id)
      if (record.early_going_by && record.early_going_by !== '00:00' && record.early_going_by !== '-') stat.earlyCount++
    })
    const earlyLeaders = Array.from(earlyStats.values()).filter(e => e.earlyCount > 0).sort((a, b) => b.earlyCount - a.earlyCount).slice(0, 10)

    // 6. Weekday attendance pattern
    const weekdayMap = { 1: 'Monday', 2: 'Tuesday', 3: 'Wednesday', 4: 'Thursday', 5: 'Friday' }
    const weekdayStats = { 1: { present: 0, total: 0 }, 2: { present: 0, total: 0 }, 3: { present: 0, total: 0 }, 4: { present: 0, total: 0 }, 5: { present: 0, total: 0 } }
    filteredRawData.forEach(record => {
      const d = parseDate(record.date)
      const day = d.getDay()
      if (day >= 1 && day <= 5) {
        weekdayStats[day].total++
        if (record.status === 'Present') weekdayStats[day].present++
      }
    })

    // KPI numbers
    const totalPresent = filteredEmployees.reduce((s, e) => s + e.present, 0)
    const totalDaysAll = filteredEmployees.reduce((s, e) => s + e.totalDays, 0)
    const overallRate = totalDaysAll > 0 ? Math.round((totalPresent / totalDaysAll) * 100) : 0
    const totalOTHrs = Array.from(overtimeStats.values()).reduce((s, o) => s + o.otMinutes, 0) / 60
    const totalLate = Array.from(punctuality.values()).reduce((s, p) => s + p.lateCount, 0)
    const totalEarlyCount = Array.from(earlyStats.values()).reduce((s, e) => s + e.earlyCount, 0)
    const perfectAttendees = filteredEmployees.filter(e => e.totalDays > 0 && e.absent === 0)

    // Build per-employee scorecard
    const employeeScorecard = filteredEmployees.map(emp => {
      const punch = punctuality.get(emp.emp_id) || { lateCount: 0, earlyCount: 0 }
      const ot = overtimeStats.get(emp.emp_id) || { otMinutes: 0 }
      const early = earlyStats.get(emp.emp_id) || { earlyCount: 0 }
      const rate = emp.totalDays > 0 ? Math.round((emp.present / emp.totalDays) * 100) : 0
      let grade = 'Excellent'
      let gradeColor = '#15803d'
      let gradeBg = '#dcfce7'
      if (rate < 60) { grade = 'Poor'; gradeColor = '#dc2626'; gradeBg = '#fee2e2' }
      else if (rate < 75) { grade = 'Fair'; gradeColor = '#d97706'; gradeBg = '#fef3c7' }
      else if (rate < 90) { grade = 'Good'; gradeColor = '#0284c7'; gradeBg = '#e0f2fe' }
      return { ...emp, rate, lateCount: punch.lateCount, earlyCount: early.earlyCount, otHrs: (ot.otMinutes / 60).toFixed(1), grade, gradeColor, gradeBg }
    }).sort((a, b) => b.rate - a.rate)

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

        {/* KPI Summary Bento Row */}
        <div className="bento-grid">
          {/* Card 1: Overall Attendance - LIME GREEN BENTO */}
          <div className="bento-card bento-card-lime" style={{ gridColumn: 'span 4' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#161245' }}>
                Overall Attendance
              </span>
              <span className="bento-corner-arrow" style={{ background: '#161245', color: '#90d152' }}>
                <ArrowUpRight size={14} />
              </span>
            </div>
            <div style={{ fontSize: '2.5rem', fontWeight: 900, color: '#161245', letterSpacing: '-0.03em', lineHeight: 1, marginBottom: '0.4rem' }}>
              {overallRate}%
            </div>
            <p style={{ margin: 0, fontSize: '0.8rem', color: 'rgba(22, 18, 69, 0.75)', fontWeight: 600 }}>
              {totalPresent} total present days logged
            </p>
          </div>

          {/* Card 2: Perfect Attendance - MATTE BLACK BENTO */}
          <div className="bento-card bento-card-dark" style={{ gridColumn: 'span 4' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#f8fafc' }}>
                Perfect Records
              </span>
              <span style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem', borderRadius: '9999px', background: 'rgba(255,255,255,0.1)', color: '#90d152', fontWeight: 700 }}>
                100% On-Duty
              </span>
            </div>
            <div style={{ fontSize: '2.5rem', fontWeight: 900, color: '#90d152', letterSpacing: '-0.03em', lineHeight: 1, marginBottom: '0.4rem' }}>
              {perfectAttendees.length}
            </div>
            <p style={{ margin: 0, fontSize: '0.8rem', color: '#94a3b8', fontWeight: 500 }}>
              Staff with zero absences this period
            </p>
          </div>

          {/* Card 3: Total Overtime - CLEAN WHITE BENTO */}
          <div className="bento-card" style={{ gridColumn: 'span 4' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b' }}>
                Total Overtime
              </span>
              <span className="bento-corner-arrow">
                <Clock size={14} />
              </span>
            </div>
            <div style={{ fontSize: '2.5rem', fontWeight: 900, color: '#161245', letterSpacing: '-0.03em', lineHeight: 1, marginBottom: '0.4rem' }}>
              {totalOTHrs.toFixed(1)}h
            </div>
            <div style={{ display: 'flex', gap: '1rem', fontSize: '0.775rem', color: '#64748b', fontWeight: 600 }}>
              <span>Late: {totalLate}×</span>
              <span>Early Out: {totalEarlyCount}×</span>
            </div>
          </div>
        </div>

        {/* Employee Performance Scorecard — main section */}
        <div className="bento-card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '1.25rem 1.75rem', borderBottom: '1px solid var(--card-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#ffffff' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#161245', letterSpacing: '-0.02em' }}>Employee Performance Scorecard</h3>
              <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.825rem', color: '#64748b' }}>Full breakdown of every employee's attendance, punctuality & overtime for the selected period</p>
            </div>
            <span style={{ fontSize: '0.775rem', fontWeight: 600, color: '#161245', background: '#f1f5f9', padding: '0.3rem 0.75rem', borderRadius: '9999px' }}>
              {employeeScorecard.length} Staff Members
            </span>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', color: '#64748b', fontWeight: 700 }}>
                  <th style={{ padding: '1rem 1.5rem', textAlign: 'left' }}>Employee</th>
                  <th style={{ padding: '1rem 1rem', textAlign: 'left' }}>Department</th>
                  <th style={{ padding: '1rem 1rem', textAlign: 'center' }}>Total Days</th>
                  <th style={{ padding: '1rem 1rem', textAlign: 'center' }}>Present</th>
                  <th style={{ padding: '1rem 1rem', textAlign: 'center' }}>Absent</th>
                  <th style={{ padding: '1rem 1rem', textAlign: 'center' }}>Late</th>
                  <th style={{ padding: '1rem 1rem', textAlign: 'center' }}>Early Out</th>
                  <th style={{ padding: '1rem 1rem', textAlign: 'center' }}>Overtime</th>
                  <th style={{ padding: '1rem 1rem', textAlign: 'center' }}>Worked Hours</th>
                  <th style={{ padding: '1rem 1.5rem', textAlign: 'center' }}>Attendance %</th>
                  <th style={{ padding: '1rem 1.5rem', textAlign: 'center' }}>Grade</th>
                </tr>
              </thead>
              <tbody>
                {employeeScorecard.map((emp, i) => (
                  <tr key={emp.emp_id}
                    className="clickable-row"
                    style={{ borderBottom: '1px solid var(--card-border)', cursor: 'pointer', backgroundColor: i % 2 === 0 ? '#ffffff' : '#fafafa' }}
                    onClick={() => { setSelectedEmployee(emp); setStatusFilter('All') }}>
                    <td style={{ padding: '1rem 1.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: '#161245', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.85rem', color: '#90d152', flexShrink: 0 }}>
                          {(emp?.name || '#').charAt(0)}
                        </div>
                        <div>
                          <p style={{ margin: 0, fontWeight: 700, color: '#161245' }}>{emp?.name || `Staff #${emp?.emp_id}`}</p>
                          <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b' }}>{emp?.designation || 'Team Member'}</p>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '1rem 1rem' }}>
                      <span style={{ padding: '0.25rem 0.75rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 700, backgroundColor: '#f1f5f9', color: '#334155' }}>
                        {emp.department_name || 'Operations'}
                      </span>
                    </td>
                    <td style={{ padding: '1rem 1rem', textAlign: 'center', color: '#475569', fontWeight: 600 }}>{emp.totalDays}</td>
                    <td style={{ padding: '1rem 1rem', textAlign: 'center', color: '#15803d', fontWeight: 800 }}>{emp.present}</td>
                    <td style={{ padding: '1rem 1rem', textAlign: 'center', color: emp.absent > 0 ? '#dc2626' : '#94a3b8', fontWeight: 700 }}>{emp.absent}</td>
                    <td style={{ padding: '1rem 1rem', textAlign: 'center', color: emp.lateCount > 0 ? '#dc2626' : '#94a3b8', fontWeight: 600 }}>
                      {emp.lateCount > 0 ? `${emp.lateCount}×` : '—'}
                    </td>
                    <td style={{ padding: '1rem 1rem', textAlign: 'center', color: emp.earlyCount > 0 ? '#d97706' : '#94a3b8', fontWeight: 600 }}>
                      {emp.earlyCount > 0 ? `${emp.earlyCount}×` : '—'}
                    </td>
                    <td style={{ padding: '1rem 1rem', textAlign: 'center', color: parseFloat(emp.otHrs) > 0 ? '#161245' : '#94a3b8', fontWeight: 700 }}>
                      {parseFloat(emp.otHrs) > 0 ? `${emp.otHrs}h` : '—'}
                    </td>
                    <td style={{ padding: '1rem 1rem', textAlign: 'center', color: '#161245', fontWeight: 800 }}>
                      {Math.floor(emp.totalMinutesWorked / 60)}h {emp.totalMinutesWorked % 60}m
                    </td>
                    <td style={{ padding: '1rem 1.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', justifyContent: 'center' }}>
                        <div style={{ width: '90px', height: '8px', backgroundColor: '#e2e8f0', borderRadius: '9999px', overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${emp.rate}%`, backgroundColor: emp.rate > 80 ? '#90d152' : emp.rate > 60 ? '#f59e0b' : '#ef4444', borderRadius: '9999px' }}></div>
                        </div>
                        <span style={{ fontWeight: 800, minWidth: '38px', color: '#161245' }}>{emp.rate}%</span>
                      </div>
                    </td>
                    <td style={{ padding: '1rem 1.5rem', textAlign: 'center' }}>
                      <span style={{ padding: '0.3rem 0.8rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 800, backgroundColor: emp.grade === 'Excellent' ? '#dcfce7' : emp.gradeBg, color: emp.grade === 'Excellent' ? '#15803d' : emp.gradeColor }}>
                        {emp.grade}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Department Performance + Weekday Pattern */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
          <div className="content-card" style={{ padding: '1.5rem' }}>
            <h3 style={{ margin: '0 0 0.25rem 0', color: 'var(--text-primary)' }}>Department Breakdown</h3>
            <p style={{ margin: '0 0 1rem 0', fontSize: '0.8rem', color: '#64748b' }}>Attendance rate by department</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {deptPerformance.map(d => (
                <div key={d.dept}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.875rem', color: '#1e293b' }}>{d.dept}</span>
                    <span style={{ fontSize: '0.875rem', color: d.rate > 80 ? '#16a34a' : d.rate > 60 ? '#d97706' : '#dc2626', fontWeight: 700 }}>{d.rate}%</span>
                  </div>
                  <div style={{ height: '8px', backgroundColor: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${d.rate}%`, backgroundColor: d.rate > 80 ? '#22c55e' : d.rate > 60 ? '#f59e0b' : '#ef4444', borderRadius: '4px' }}></div>
                  </div>
                  <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.73rem', color: '#94a3b8' }}>{d.employees} employees · {d.present}/{d.total} days</p>
                </div>
              ))}
            </div>
          </div>

          <div className="content-card" style={{ padding: '1.5rem' }}>
            <h3 style={{ margin: '0 0 0.25rem 0', color: 'var(--text-primary)' }}>Weekday Attendance Pattern</h3>
            <p style={{ margin: '0 0 1rem 0', fontSize: '0.8rem', color: '#64748b' }}>Which days have the strongest attendance</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {[1, 2, 3, 4, 5].map(day => {
                const s = weekdayStats[day]
                const rate = s.total > 0 ? Math.round((s.present / s.total) * 100) : 0
                return (
                  <div key={day}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                      <span style={{ fontWeight: 600, fontSize: '0.875rem', color: '#1e293b' }}>{weekdayMap[day]}</span>
                      <span style={{ fontSize: '0.875rem', color: rate > 80 ? '#16a34a' : rate > 60 ? '#d97706' : '#dc2626', fontWeight: 700 }}>{rate}%</span>
                    </div>
                    <div style={{ height: '8px', backgroundColor: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${rate}%`, backgroundColor: rate > 80 ? '#22c55e' : rate > 60 ? '#f59e0b' : '#ef4444', borderRadius: '4px' }}></div>
                    </div>
                    <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.73rem', color: '#94a3b8' }}>{s.present} present out of {s.total} records</p>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Perfect Attendance Spotlight */}
        <div className="content-card" style={{ padding: '1.5rem' }}>
          <h3 style={{ margin: '0 0 0.25rem 0', color: 'var(--text-primary)' }}>⭐ Perfect Attendance Spotlight</h3>
          <p style={{ margin: '0 0 1.25rem 0', fontSize: '0.8rem', color: '#64748b' }}>Employees with zero absences in the selected period</p>
          {perfectAttendees.length > 0 ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
              {perfectAttendees.map(e => (
                <div key={e.emp_id} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '50px', padding: '0.5rem 1rem' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#22c55e', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: '0.85rem', flexShrink: 0 }}>
                    {e.name.charAt(0)}
                  </div>
                  <div>
                    <p style={{ margin: 0, fontWeight: 600, fontSize: '0.875rem', color: '#15803d' }}>{e.name}</p>
                    <p style={{ margin: 0, fontSize: '0.7rem', color: '#4ade80' }}>{e.present} days present · 100%</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>No employees with perfect attendance in this period.</p>
          )}
        </div>

      </div>
    )
  }



  const dateRange = useMemo(() => {
    if (!filteredRawData || filteredRawData.length === 0) return null;
    let minDate = null;
    let maxDate = null;
    filteredRawData.forEach(record => {
      const d = parseDate(record.date);
      if (!minDate || d < minDate) minDate = d;
      if (!maxDate || d > maxDate) maxDate = d;
    });
    if (!minDate || maxDate == null) return null;
    
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return `${minDate.toLocaleDateString(undefined, options)} - ${maxDate.toLocaleDateString(undefined, options)}`;
  }, [filteredRawData]);

  const handleLogin = (e) => {
    e.preventDefault();
    if (username === 'admin' && password === 'password') {
      setIsAuthenticated(true);
      if (typeof window !== 'undefined') localStorage.setItem('inxl_auth', 'true');
      setLoginError('');
    } else {
      setLoginError('Invalid credentials');
    }
  }

  const renderLogin = () => (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: '#f4f6fb' }}>
      <div style={{ backgroundColor: 'white', padding: '2.5rem', borderRadius: '24px', boxShadow: '0 20px 40px -10px rgba(0, 0, 0, 0.05)', border: '1px solid rgba(0, 0, 0, 0.06)', width: '100%', maxWidth: '420px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <img src="https://i0.wp.com/inxldigital.com/wp-content/uploads/2021/04/cropped-inXL-LOGO-1.jpeg?resize=300%2C100&ssl=1" alt="INXL Digital Logo" style={{ maxWidth: '80%', height: 'auto', marginBottom: '1.75rem' }} />
        
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#161245', color: '#90d152', width: '52px', height: '52px', borderRadius: '18px', marginBottom: '1.25rem', boxShadow: '0 4px 12px rgba(22, 18, 69, 0.2)' }}>
          <Lock size={24} />
        </div>
        
        <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#161245', marginBottom: '0.35rem', textAlign: 'center', letterSpacing: '-0.02em' }}>Welcome Back</h2>
        <p style={{ color: '#6b7280', marginBottom: '1.75rem', textAlign: 'center', fontSize: '0.875rem', fontWeight: 500 }}>Please sign in to access the workforce dashboard</p>
        
        {loginError && (
          <div style={{ backgroundColor: '#fee2e2', color: '#b91c1c', padding: '0.75rem', borderRadius: '12px', marginBottom: '1.25rem', width: '100%', fontSize: '0.85rem', textAlign: 'center', fontWeight: 600 }}>
            {loginError}
          </div>
        )}
        
        <form onSubmit={handleLogin} style={{ width: '100%' }}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', color: '#374151', fontSize: '0.8125rem', fontWeight: 700, marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Username</label>
            <input 
              type="text" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '9999px', border: '1px solid #d1d5db', outline: 'none', backgroundColor: '#f9fafb', color: '#161245', fontSize: '0.9rem' }}
              placeholder="Enter your username"
            />
          </div>
          
          <div style={{ marginBottom: '1.75rem' }}>
            <label style={{ display: 'block', color: '#374151', fontSize: '0.8125rem', fontWeight: 700, marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Password</label>
            <div style={{ position: 'relative' }}>
              <input 
                type={showPassword ? "text" : "password"} 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ width: '100%', padding: '0.75rem 1rem', paddingRight: '2.5rem', borderRadius: '9999px', border: '1px solid #d1d5db', outline: 'none', backgroundColor: '#f9fafb', color: '#161245', fontSize: '0.9rem' }}
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', padding: '0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
          
          <button 
            type="submit"
            style={{ width: '100%', backgroundColor: '#161245', color: 'white', padding: '0.8rem', borderRadius: '9999px', border: 'none', fontSize: '0.95rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 4px 14px rgba(22, 18, 69, 0.2)' }}
            onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#000'; }}
            onMouseOut={(e) => { e.currentTarget.style.backgroundColor = '#161245'; }}
          >
            Sign In
          </button>
        </form>
      </div>
    </div>
  )

  if (!isAuthenticated) {
    return renderLogin();
  }

  return (
    <div className="app-container">
      <aside className="sidebar">
        <div className="sidebar-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0.5rem 0 1.5rem 0' }}>
          <img src="https://i0.wp.com/inxldigital.com/wp-content/uploads/2021/04/cropped-inXL-LOGO-1.jpeg?resize=300%2C100&ssl=1" alt="INXL Digital Logo" style={{ maxWidth: '80%', height: 'auto', maxHeight: '50px' }} />
        </div>
        
        <nav className="sidebar-nav">
          <ul>
            <li 
              className={activeTab === 'overview' ? 'active' : ''}
              onClick={() => setActiveTab('overview')}
            >
              <LayoutDashboard size={20} />
              <span>Dashboard</span>
            </li>
            <li 
              className={activeTab === 'employees' ? 'active' : ''}
              onClick={() => setActiveTab('employees')}
            >
              <Users size={20} />
              <span>Employees</span>
            </li>
            <li 
              className={activeTab === 'timesheets' ? 'active' : ''}
              onClick={() => setActiveTab('timesheets')}
            >
              <Clock size={20} />
              <span>Attendance</span>
            </li>
            <li 
              className={activeTab === 'reports' ? 'active' : ''}
              onClick={() => setActiveTab('reports')}
            >
              <FileText size={20} />
              <span>Reports</span>
            </li>
            <li 
              className={activeTab === 'calendar' ? 'active' : ''}
              onClick={() => setActiveTab('calendar')}
            >
              <Calendar size={20} />
              <span>Calendar</span>
            </li>
            <li 
              className={activeTab === 'settings' ? 'active' : ''}
              onClick={() => setActiveTab('settings')}
            >
              <Settings size={20} />
              <span>Settings</span>
            </li>
          </ul>
        </nav>

        <div className="sidebar-sync-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#161245', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#16a34a', display: 'inline-block' }}></span>
              Live Sync
            </span>
            <span style={{ fontSize: '0.675rem', fontWeight: 700, color: '#15803d', background: '#dcfce7', padding: '0.1rem 0.45rem', borderRadius: '9999px' }}>
              ONLINE
            </span>
          </div>
          <p style={{ margin: 0, fontSize: '0.725rem', color: '#64748b' }}>
            Biometric interval: 15m
          </p>
        </div>

        <div className="sidebar-footer">
          <button className="logout-btn" onClick={() => {
            if (typeof window !== 'undefined') localStorage.removeItem('inxl_auth');
            setIsAuthenticated(false);
          }}>
            <LogOut size={16} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      <main className="main-content">
        {activeTab !== 'overview' && (
        <header className="top-bar">
          <div>
            <h1>
              {activeTab === 'employees' ? 'Staff Directory & Personnel' :
               activeTab === 'departments' ? 'Department Organization' :
               activeTab === 'shifts' ? 'Shift Schedules & Timings' :
               activeTab === 'timesheets' ? 'Attendance' :
               activeTab === 'reports' ? 'Attendance Reports' :
               activeTab === 'settings' ? 'System Settings' : 'Workforce Overview'}
            </h1>
            <p className="subtitle" style={{ marginTop: '0.25rem' }}>
              {activeTab === 'employees' ? 'Manage staff profiles, biometric IDs, and workforce assignments' :
               activeTab === 'departments' ? 'Company departmental units, leads, and team allocations' :
               activeTab === 'shifts' ? 'Office shift timings, grace periods, and work hours' :
               activeTab === 'timesheets' ? 'Biometric timesheet records and daily attendance logs' :
               activeTab === 'settings' ? 'Biometric device sync status and company configuration' :
               dateRange ? <span style={{ fontWeight: '500', color: '#64748b', fontSize: '0.85rem' }}>Report Period: {dateRange}</span> :
               'Daily biometric punch records and attendance calculations'}
            </p>
          </div>
          
          {(activeTab === 'timesheets' || activeTab === 'reports') && (
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            {availableMonths.length > 0 && (
              <>
              <select
                value={selectedMonth}
                onChange={(e) => {
                  setSelectedMonth(e.target.value);
                  setSelectedWeek('All'); // Reset week when month changes
                }}
                style={{
                  padding: '0.6rem 1rem',
                  borderRadius: '9999px',
                  border: '1px solid rgba(0,0,0,0.08)',
                  backgroundColor: 'white',
                  outline: 'none',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  color: 'var(--text-primary)',
                  cursor: 'pointer',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
                }}
              >
                <option value="All">Last 90 days</option>
                {availableMonths.map(([val, label]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
              </select>
              <select
                value={selectedWeek}
                onChange={(e) => setSelectedWeek(e.target.value)}
                disabled={selectedMonth === 'All'}
                style={{
                  padding: '0.6rem 1rem',
                  borderRadius: '9999px',
                  border: '1px solid rgba(0,0,0,0.08)',
                  backgroundColor: selectedMonth === 'All' ? '#f1f5f9' : 'white',
                  outline: 'none',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  color: selectedMonth === 'All' ? '#94a3b8' : 'var(--text-primary)',
                  cursor: selectedMonth === 'All' ? 'not-allowed' : 'pointer',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
                }}
              >
                <option value="All">All Weeks</option>
                <option value="Week 1">Week 1 (1st - 7th)</option>
                <option value="Week 2">Week 2 (8th - 14th)</option>
                <option value="Week 3">Week 3 (15th - 21st)</option>
                <option value="Week 4">Week 4 (22nd - 28th)</option>
                <option value="Week 5">Week 5 (29th+)</option>
              </select>
              </>
            )}
            <div className="search-box">
              <Search size={16} className="search-icon" />
              <input 
                type="text" 
                placeholder="Search employees..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <input 
              type="file" 
              accept=".xlsx, .xls" 
              onChange={handleFileUpload}
              style={{ display: 'none' }}
              ref={fileInputRef}
            />
            <button 
              onClick={fetchAttendanceData}
              disabled={loading}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.65rem 1.2rem',
                backgroundColor: 'white', color: '#161245', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '9999px', 
                cursor: loading ? 'not-allowed' : 'pointer', fontWeight: '600', fontSize: '0.875rem', transition: 'all 0.2s',
                opacity: loading ? 0.7 : 1, boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
              }}
            >
              {loading ? 'Syncing...' : 'Refresh'}
            </button>
            <button 
              onClick={downloadData}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.65rem 1.25rem',
                backgroundColor: '#161245', color: 'white', border: 'none', borderRadius: '9999px', 
                cursor: 'pointer', fontWeight: '600', fontSize: '0.875rem', transition: 'background-color 0.2s',
                boxShadow: '0 4px 12px rgba(17,24,39,0.15)'
              }}
            >
              <Download size={16} /> Export
            </button>
          </div>
          )}
        </header>
        )}

        {activeTab === 'overview' ? (
          <OverviewDashboard
            employees={allEmployees}
            rawData={rawData}
            departments={departments}
            shifts={shifts}
            onNavigate={(tab, filter) => {
              if (filter) setSelectedDeptFilter(filter);
              setActiveTab(tab);
            }}
            onOpenAddEmployee={() => setActiveTab('employees')}
            onViewEmployee={(emp) => setViewingProfileEmp(emp)}
            onSelectDepartment={(deptName) => {
              setSelectedDeptFilter(deptName);
              setActiveTab('timesheets');
            }}
          />
        ) : activeTab === 'employees' ? (
          <EmployeeManagement initialSubTab="staff" rawData={rawData} onEmployeesUpdated={fetchAttendanceData} onDepartmentsUpdated={(d) => setDepartments(d)} onShiftsUpdated={(s) => setShifts(s)} />
        ) : activeTab === 'departments' ? (
          <EmployeeManagement initialSubTab="departments" rawData={rawData} onEmployeesUpdated={fetchAttendanceData} onDepartmentsUpdated={(d) => setDepartments(d)} onShiftsUpdated={(s) => setShifts(s)} />
        ) : activeTab === 'shifts' ? (
          <EmployeeManagement initialSubTab="shifts" rawData={rawData} onEmployeesUpdated={fetchAttendanceData} onDepartmentsUpdated={(d) => setDepartments(d)} onShiftsUpdated={(s) => setShifts(s)} />
        ) : activeTab === 'settings' ? (
          <SettingsView onLogout={() => {
            if (typeof window !== 'undefined') localStorage.removeItem('inxl_auth');
            setIsAuthenticated(false);
          }} />
        ) : rawData.length === 0 ? (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            height: '60vh', textAlign: 'center', color: 'var(--text-secondary)'
          }}>
            <Upload size={64} style={{ marginBottom: '1.5rem', color: 'var(--accent-color)', opacity: 0.5 }} />
            <h2 style={{ fontSize: '1.5rem', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
              {loading ? 'Loading live data...' : 'No Attendance Data'}
            </h2>
            <p>{loading ? 'Fetching from database...' : 'Please ensure the sync script is running on your server.'}</p>
            <button 
              onClick={fetchAttendanceData}
              disabled={loading}
              style={{
                marginTop: '1.5rem',
                display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.5rem',
                backgroundColor: 'var(--accent-color)', color: 'white', border: 'none', 
                borderRadius: '8px', cursor: loading ? 'not-allowed' : 'pointer', fontWeight: '500', transition: 'background-color 0.2s',
                boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                opacity: loading ? 0.7 : 1
              }}
            >
              {loading ? 'Loading...' : 'Fetch Live Data'}
            </button>
          </div>
        ) : activeTab === 'timesheets' || activeTab === 'dashboard' ? (
          renderDashboard()
        ) : activeTab === 'reports' ? (
          renderReports()
        ) : activeTab === 'calendar' ? (
          <CalendarView events={[
            ...getIndianHolidays(new Date().getFullYear() - 1),
            ...getIndianHolidays(new Date().getFullYear()),
            ...getIndianHolidays(new Date().getFullYear() + 1)
          ]} />
        ) : null}

        {selectedEmployee && (() => {
          const activeModalEmp = employeeSummaries.find(e => e.emp_id === selectedEmployee.emp_id) || selectedEmployee;
          return (
          <div className="modal-overlay" onClick={() => setSelectedEmployee(null)}>
            <div className="modal-content" style={{ borderRadius: '24px', overflow: 'hidden', border: '1px solid rgba(0,0,0,0.08)' }} onClick={e => e.stopPropagation()}>
              <div className="modal-header" style={{ backgroundColor: '#161245', color: 'white', borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '1.5rem 2rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'white', margin: 0, letterSpacing: '-0.02em' }}>
                    {activeModalEmp.name}
                  </h2>
                  <span style={{
                    padding: '0.2rem 0.65rem', borderRadius: '9999px', fontSize: '0.725rem', fontWeight: 800,
                    backgroundColor: '#90d152', color: '#161245'
                  }}>
                    ID: #{activeModalEmp.emp_id}
                  </span>
                </div>
                <button
                  className="close-button"
                  onClick={() => setSelectedEmployee(null)}
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.1)', color: '#94a3b8', border: 'none',
                    width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}
                >
                  <X size={18} />
                </button>
              </div>

              <div className="modal-overview" style={{ padding: '1.25rem 2rem', gap: '1rem', backgroundColor: '#f9fafb', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)' }}>
                <div style={{ padding: '1rem', borderRadius: '16px', backgroundColor: '#90d152', textAlign: 'center' }}>
                  <span style={{ fontSize: '0.6875rem', color: '#161245', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Present</span>
                  <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#161245', marginTop: '0.2rem', lineHeight: 1 }}>{activeModalEmp.present}</div>
                </div>
                <div style={{ padding: '1rem', borderRadius: '16px', backgroundColor: '#fee2e2', textAlign: 'center' }}>
                  <span style={{ fontSize: '0.6875rem', color: '#b91c1c', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Absent</span>
                  <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#991b1b', marginTop: '0.2rem', lineHeight: 1 }}>{activeModalEmp.absent}</div>
                </div>
                <div style={{ padding: '1rem', borderRadius: '16px', backgroundColor: '#ffffff', border: '1px solid rgba(0,0,0,0.06)', textAlign: 'center' }}>
                  <span style={{ fontSize: '0.6875rem', color: '#6b7280', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Days</span>
                  <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#161245', marginTop: '0.2rem', lineHeight: 1 }}>{activeModalEmp.totalDays}</div>
                </div>
                <div style={{ padding: '1rem', borderRadius: '16px', backgroundColor: '#161245', textAlign: 'center' }}>
                  <span style={{ fontSize: '0.6875rem', color: '#94a3b8', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Hours</span>
                  <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#90d152', marginTop: '0.2rem', lineHeight: 1 }}>
                    {Math.floor(activeModalEmp.totalMinutesWorked / 60)}h {activeModalEmp.totalMinutesWorked % 60}m
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 2rem' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#161245', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Detailed Punch Records</h3>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                  {availableMonths.length > 0 && (
                    <>
                    <select
                      value={selectedMonth}
                      onChange={(e) => {
                        setSelectedMonth(e.target.value);
                        setSelectedWeek('All');
                      }}
                      style={{
                        padding: '0.55rem 1rem', borderRadius: '9999px', border: '1px solid rgba(0,0,0,0.1)',
                        backgroundColor: 'white', outline: 'none', fontSize: '0.8125rem', fontWeight: '600', color: 'var(--text-primary)', cursor: 'pointer'
                      }}
                    >
                      <option value="All">All Months</option>
                      {availableMonths.map(([val, label]) => (
                        <option key={val} value={val}>{label}</option>
                      ))}
                    </select>
                    <select
                      value={selectedWeek}
                      onChange={(e) => setSelectedWeek(e.target.value)}
                      disabled={selectedMonth === 'All'}
                      style={{
                        padding: '0.55rem 1rem', borderRadius: '9999px', border: '1px solid rgba(0,0,0,0.1)',
                        backgroundColor: selectedMonth === 'All' ? '#f1f5f9' : 'white', outline: 'none', fontSize: '0.8125rem', fontWeight: '600',
                        color: selectedMonth === 'All' ? '#94a3b8' : 'var(--text-primary)', cursor: selectedMonth === 'All' ? 'not-allowed' : 'pointer'
                      }}
                    >
                      <option value="All">All Weeks</option>
                      <option value="Week 1">Week 1 (1st - 7th)</option>
                      <option value="Week 2">Week 2 (8th - 14th)</option>
                      <option value="Week 3">Week 3 (15th - 21st)</option>
                      <option value="Week 4">Week 4 (22nd - 28th)</option>
                      <option value="Week 5">Week 5 (29th+)</option>
                    </select>
                    </>
                  )}
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    style={{
                      padding: '0.55rem 1rem',
                      borderRadius: '9999px',
                      border: '1px solid rgba(0,0,0,0.1)',
                      outline: 'none',
                      backgroundColor: 'white',
                      color: '#161245',
                      cursor: 'pointer',
                      fontWeight: '600',
                      fontSize: '0.8125rem'
                    }}
                  >
                    <option value="All">Show All Days</option>
                    <option value="Present">Present Only</option>
                    <option value="Absent">Absent Only</option>
                    <option value="Late">Late Arrivals</option>
                    <option value="Overtime">Overtime</option>
                  </select>

                  <button
                    onClick={downloadEmployeeData}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.55rem 1.25rem',
                      backgroundColor: '#161245', color: 'white', border: 'none',
                      borderRadius: '9999px', cursor: 'pointer', fontWeight: '700', fontSize: '0.8125rem',
                      boxShadow: '0 4px 12px rgba(22, 18, 69, 0.15)'
                    }}
                  >
                    <Download size={14} /> Export
                  </button>
                </div>
              </div>

              <div className="table-container modal-table custom-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Status</th>
                      <th>Shift</th>
                      <th>In Time</th>
                      <th>Out Time</th>
                      <th>Late By</th>
                      <th>Early Go</th>
                      <th>OT</th>
                      <th>Total Dur.</th>
                      <th>Punch Records</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeModalEmp.records
                      .filter(record => {
                        if (statusFilter === 'All') return true;
                        if (statusFilter === 'Late') return record.late_by && record.late_by !== '00:00' && record.late_by !== '-';
                        if (statusFilter === 'Overtime') return record.overtime && record.overtime !== '00:00' && record.overtime !== '-';
                        return record.status === statusFilter;
                      })
                      .map((record, idx) => (
                        <tr key={`${record.date}-${idx}`}>
                          <td className="font-medium whitespace-nowrap">{record.date}</td>
                          <td>{getStatusBadge(record.status)}</td>
                          <td className="time-cell">{record.shift || '-'}</td>
                          <td className="time-cell highlight-time">{record.in_time || '--:--'}</td>
                          <td className="time-cell highlight-time">{record.out_time || '--:--'}</td>
                          <td className="time-cell penalty">{record.late_by !== '00:00' ? record.late_by : '-'}</td>
                          <td className="time-cell penalty">{record.early_going_by !== '00:00' ? record.early_going_by : '-'}</td>
                          <td className="time-cell bonus">{record.overtime !== '00:00' ? record.overtime : '-'}</td>
                          <td className="time-cell total-time">{record.total_duration || '--:--'}</td>
                          <td className="time-cell punch-records" title={record.punch_records}>{record.punch_records || 'No records'}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          );
        })()}
      {viewingProfileEmp && (
          <EmployeeProfileModal
            employee={viewingProfileEmp}
            attendanceData={rawData}
            shifts={shifts}
            departments={departments}
            onClose={() => setViewingProfileEmp(null)}
          />
        )}
      </main>
    </div>
  )
}

export default App
