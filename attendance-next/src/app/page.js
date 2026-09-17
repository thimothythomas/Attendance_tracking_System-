"use client";

import { useState, useMemo, useRef, useEffect } from 'react'
import { Users, CheckCircle, XCircle, Calendar, Search, X, LayoutDashboard, FileText, Settings, LogOut, Download, Upload, Lock, Eye, EyeOff } from 'lucide-react'
import * as XLSX from 'xlsx'
import { supabase } from '@/lib/supabase'

function App() {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedEmployee, setSelectedEmployee] = useState(null)
  const [activeTab, setActiveTab] = useState('dashboard')
  const [statusFilter, setStatusFilter] = useState('All')
  const [selectedMonth, setSelectedMonth] = useState('All')
  const [rawData, setRawData] = useState([])
  const [allEmployees, setAllEmployees] = useState([])
  const [loading, setLoading] = useState(false)
  const fileInputRef = useRef(null)

  const [debugData, setDebugData] = useState(null)
  const [isAuthenticated, setIsAuthenticated] = useState(true)
  const [loginError, setLoginError] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)


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
      
      const activeEmployees = employeesData.filter(emp => 
        !emp.employee_name?.startsWith('del_') && emp.employee_code !== '11'
      )
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
            shift: (shiftName === 'Nightshift' ? 'NS' : shiftName) || '',
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
    if (selectedMonth === 'All') return rawData;
    return rawData.filter(record => {
      const d = parseDate(record.date);
      const val = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2, '0')}`;
      return val === selectedMonth;
    });
  }, [rawData, selectedMonth]);

  // Group data by employee
  const employeeSummaries = useMemo(() => {
    const map = new Map()

    // Pre-populate map with all active employees so they show up even if they have 0 logs
    allEmployees.forEach(emp => {
      map.set(emp.employee_code, {
        emp_id: emp.employee_code,
        name: emp.employee_name,
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
        map.set(emp_id, {
          emp_id,
          name,
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

      // Strictly determine Present/Absent based on user rules
      let finalStatus = 'Absent'
      if (status && status.includes('Absent No OutPunch')) {
        finalStatus = 'Absent'
      } else if (record.punch_records && typeof record.punch_records === 'string' && record.punch_records.trim() !== '') {
        finalStatus = 'Present'
      }

      // Override status so UI strictly shows Present/Absent
      record.status = finalStatus
      emp.records.push(record)

      if (finalStatus === 'Present') {
        emp.present += 1
      } else {
        emp.absent += 1
      }

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
    return employeeSummaries.filter(emp =>
      emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.emp_id.toString().includes(searchTerm)
    )
  }, [searchTerm, employeeSummaries])

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

    const dataForExcel = selectedEmployee.records
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
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon users-icon"><Users size={24} /></div>
          <div className="stat-details">
            <h3>Total Employees</h3>
            <p className="stat-value">{filteredEmployees.length}</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon check-icon"><Calendar size={24} /></div>
          <div className="stat-details">
            <h3>Total Working Days</h3>
            <p className="stat-value">
              {(() => {
                const totalWorkingDays = filteredEmployees.length > 0 ? Math.max(...filteredEmployees.map(emp => emp.totalDays)) : 0;
                return totalWorkingDays;
              })()}
            </p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon x-icon"><XCircle size={24} /></div>
          <div className="stat-details">
            <h3>Absence Ratio</h3>
            <p className="stat-value">
              {(() => {
                const totalAbsent = filteredEmployees.reduce((sum, emp) => sum + emp.absent, 0);
                const totalDays = filteredEmployees.reduce((sum, emp) => sum + emp.totalDays, 0);
                return totalDays > 0 ? Math.round((totalAbsent / totalDays) * 100) + '%' : '0%';
              })()}
            </p>
          </div>
        </div>
      </div>

      <div className="content-card">
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Emp ID</th>
                <th>Employee Name</th>
                <th>Total Days</th>
                <th>Present</th>
                <th>Absent</th>
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
                      <td className="emp-name"><strong>{emp.name}</strong></td>
                      <td>{emp.totalDays}</td>
                      <td className="text-success font-medium">{emp.present}</td>
                      <td className="text-danger font-medium">{emp.absent}</td>
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
                  <td colSpan="7" style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '3rem' }}>
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

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        <div className="content-card" style={{ padding: '1.5rem' }}>
          <h3 style={{ marginBottom: '1rem', color: 'var(--text-primary)' }}>Daily Attendance Trend</h3>
          <div className="table-container custom-scroll" style={{ maxHeight: '400px' }}>
            <table>
              <thead style={{ position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8fafc' }}>
                <tr>
                  <th>Date</th>
                  <th>Attendance Rate</th>
                  <th>Present / Total</th>
                </tr>
              </thead>
              <tbody>
                {trends.map(t => (
                  <tr key={t.date}>
                    <td className="font-medium whitespace-nowrap">{t.date}</td>
                    <td>
                      <div className="progress-cell" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ minWidth: '40px', fontWeight: '500' }}>{t.rate}%</span>
                        <div className="progress-bar-container" style={{ width: '150px', height: '8px', backgroundColor: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${t.rate}%`, backgroundColor: t.rate > 80 ? 'var(--success)' : t.rate > 50 ? 'var(--warning)' : 'var(--danger)' }}></div>
                        </div>
                      </div>
                    </td>
                    <td style={{ color: 'var(--text-secondary)' }}><strong style={{ color: 'var(--text-primary)' }}>{t.present}</strong> / {t.present + t.absent}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
          <div className="content-card" style={{ padding: '1.5rem' }}>
            <h3 style={{ marginBottom: '1rem', color: 'var(--text-primary)' }}>Most Late Arrivals</h3>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Employee Name</th>
                    <th>Days Late</th>
                  </tr>
                </thead>
                <tbody>
                  {lateLeaders.length > 0 ? lateLeaders.map(l => (
                    <tr 
                      key={l.name} 
                      className="clickable-row" 
                      style={{ cursor: 'pointer' }}
                      onClick={() => {
                        const emp = employeeSummaries.find(e => e.emp_id === l.emp_id)
                        if (emp) {
                          setSelectedEmployee(emp)
                          setStatusFilter('Late')
                        }
                      }}
                    >
                      <td className="emp-name"><strong>{l.name}</strong></td>
                      <td className="text-danger font-medium" style={{ fontSize: '1.1rem' }}>{l.lateCount}</td>
                    </tr>
                  )) : <tr><td colSpan="2" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>No late arrivals recorded.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>

          <div className="content-card" style={{ padding: '1.5rem' }}>
            <h3 style={{ marginBottom: '1rem', color: 'var(--text-primary)' }}>Top Overtime (Hours)</h3>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Employee Name</th>
                    <th>Total OT</th>
                  </tr>
                </thead>
                <tbody>
                  {otLeaders.length > 0 ? otLeaders.map(o => (
                    <tr 
                      key={o.name} 
                      className="clickable-row" 
                      style={{ cursor: 'pointer' }}
                      onClick={() => {
                        const emp = employeeSummaries.find(e => e.emp_id === o.emp_id)
                        if (emp) {
                          setSelectedEmployee(emp)
                          setStatusFilter('Overtime')
                        }
                      }}
                    >
                      <td className="emp-name"><strong>{o.name}</strong></td>
                      <td className="text-success font-medium" style={{ fontSize: '1.1rem' }}>{(o.otMinutes / 60).toFixed(1)}h</td>
                    </tr>
                  )) : <tr><td colSpan="2" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>No overtime recorded.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
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
      setLoginError('');
    } else {
      setLoginError('Invalid credentials');
    }
  }

  const renderLogin = () => (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: '#f3f4f6' }}>
      <div style={{ backgroundColor: 'white', padding: '2.5rem', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)', width: '100%', maxWidth: '400px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <img src="https://i0.wp.com/inxldigital.com/wp-content/uploads/2021/04/cropped-inXL-LOGO-1.jpeg?resize=300%2C100&ssl=1" alt="INXL Digital Logo" style={{ maxWidth: '80%', height: 'auto', marginBottom: '2rem' }} />
        
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#e0e7ff', color: '#4f46e5', width: '48px', height: '48px', borderRadius: '50%', marginBottom: '1.5rem' }}>
          <Lock size={24} />
        </div>
        
        <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#111827', marginBottom: '0.5rem', textAlign: 'center' }}>Welcome Back</h2>
        <p style={{ color: '#6b7280', marginBottom: '2rem', textAlign: 'center', fontSize: '0.95rem' }}>Please sign in to access the dashboard</p>
        
        {loginError && (
          <div style={{ backgroundColor: '#fee2e2', color: '#b91c1c', padding: '0.75rem', borderRadius: '6px', marginBottom: '1.5rem', width: '100%', fontSize: '0.9rem', textAlign: 'center' }}>
            {loginError}
          </div>
        )}
        
        <form onSubmit={handleLogin} style={{ width: '100%' }}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', color: '#374151', fontSize: '0.9rem', fontWeight: '500', marginBottom: '0.5rem' }}>Username</label>
            <input 
              type="text" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid #d1d5db', outline: 'none', transition: 'border-color 0.2s', backgroundColor: 'transparent', color: '#111827' }}
              placeholder="Enter your username"
            />
          </div>
          
          <div style={{ marginBottom: '2rem' }}>
            <label style={{ display: 'block', color: '#374151', fontSize: '0.9rem', fontWeight: '500', marginBottom: '0.5rem' }}>Password</label>
            <div style={{ position: 'relative' }}>
              <input 
                type={showPassword ? "text" : "password"} 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ width: '100%', padding: '0.75rem', paddingRight: '2.5rem', borderRadius: '6px', border: '1px solid #d1d5db', outline: 'none', transition: 'border-color 0.2s', backgroundColor: 'transparent', color: '#111827' }}
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', padding: '0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
          
          <button 
            type="submit"
            style={{ width: '100%', backgroundColor: '#4f46e5', color: 'white', padding: '0.75rem', borderRadius: '6px', border: 'none', fontSize: '1rem', fontWeight: '600', cursor: 'pointer', transition: 'background-color 0.2s' }}
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
              className={activeTab === 'dashboard' ? 'active' : ''}
              onClick={() => setActiveTab('dashboard')}
            >
              <LayoutDashboard size={20} />
              <span>Dashboard</span>
            </li>
            <li 
              className={activeTab === 'reports' ? 'active' : ''}
              onClick={() => setActiveTab('reports')}
            >
              <FileText size={20} />
              <span>Reports</span>
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

        <div className="sidebar-footer">
          <button className="logout-btn" onClick={() => setIsAuthenticated(false)}>
            <LogOut size={20} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      <main className="main-content">
        <header className="top-bar">
          <div>
            <h1>{activeTab === 'dashboard' ? 'Attendance Dashboard' : activeTab === 'reports' ? 'Attendance Reports' : 'Settings'}</h1>
            <p className="subtitle" style={{ marginTop: '0.25rem' }}>
              {dateRange ? <span style={{ fontWeight: '500', color: '#64748b', fontSize: '0.85rem' }}>Report Period: {dateRange}</span> : 'Overview of employee attendance and metrics'}
            </p>
          </div>
          
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            {availableMonths.length > 0 && (
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                style={{
                  padding: '0.6rem 1rem',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0',
                  backgroundColor: 'white',
                  outline: 'none',
                  fontSize: '0.9rem',
                  color: 'var(--text-primary)',
                  cursor: 'pointer'
                }}
              >
                <option value="All">Last 90 days</option>
                {availableMonths.map(([val, label]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
              </select>
            )}
            <div className="search-box">
              <Search size={18} className="search-icon" />
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
                display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.2rem',
                backgroundColor: 'white', color: 'var(--accent-color)', border: '1px solid var(--accent-color)', borderRadius: '8px', 
                cursor: loading ? 'not-allowed' : 'pointer', fontWeight: '500', transition: 'all 0.2s',
                opacity: loading ? 0.7 : 1
              }}
              onMouseOver={(e) => !loading && (e.target.style.backgroundColor = '#f8fafc')}
              onMouseOut={(e) => !loading && (e.target.style.backgroundColor = 'white')}
            >
              {loading ? 'Syncing...' : 'Refresh Data'}
            </button>
            <button 
              onClick={downloadData}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.2rem',
                backgroundColor: 'var(--accent-color)', color: 'white', border: 'none', borderRadius: '8px', 
                cursor: 'pointer', fontWeight: '500', transition: 'background-color 0.2s',
                boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
              }}
              onMouseOver={(e) => e.target.style.backgroundColor = 'var(--accent-hover)'}
              onMouseOut={(e) => e.target.style.backgroundColor = 'var(--accent-color)'}
            >
              <Download size={18} /> Export
            </button>
          </div>
        </header>

        {rawData.length === 0 ? (
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
              onMouseOver={(e) => !loading && (e.target.style.backgroundColor = 'var(--accent-hover)')}
              onMouseOut={(e) => !loading && (e.target.style.backgroundColor = 'var(--accent-color)')}
            >
              {loading ? 'Loading...' : 'Fetch Live Data'}
            </button>

            {debugData && (
              <div style={{ marginTop: '2rem', padding: '1rem', background: '#f1f5f9', border: '2px solid red', borderRadius: '8px', overflowX: 'auto', maxWidth: '80vw' }}>
                <h3 style={{ color: 'red', marginBottom: '1rem' }}>DEBUG INFORMATION</h3>
                <p style={{ color: 'black', marginBottom: '1rem', fontSize: '14px' }}>
                  Please click the button below to download the raw data, and upload the downloaded <b>raw_excel_data.json</b> file into our chat!
                </p>
                <button
                  onClick={() => {
                    const blob = new Blob([JSON.stringify(debugData, null, 2)], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'raw_excel_data.json';
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                  }}
                  style={{
                    padding: '0.75rem 1.5rem', backgroundColor: '#ef4444', color: 'white',
                    border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold'
                  }}
                >
                  Download Raw Excel Data
                </button>
              </div>
            )}
          </div>
        ) : activeTab === 'dashboard' ? renderDashboard() : activeTab === 'reports' ? renderReports() : null}

        {selectedEmployee && (
          <div className="modal-overlay" onClick={() => setSelectedEmployee(null)}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h2>{selectedEmployee.name} <span className="emp-id-header">({selectedEmployee.emp_id})</span></h2>
                <button className="close-button" onClick={() => setSelectedEmployee(null)}>
                  <X size={24} />
                </button>
              </div>

              <div className="modal-overview">
                <div className="modal-stat">
                  <span className="label">Present</span>
                  <span className="value text-success">{selectedEmployee.present}</span>
                </div>
                <div className="modal-stat">
                  <span className="label">Absent</span>
                  <span className="value text-danger">{selectedEmployee.absent}</span>
                </div>
                <div className="modal-stat">
                  <span className="label">Total Days</span>
                  <span className="value">{selectedEmployee.totalDays}</span>
                </div>
                <div className="modal-stat">
                  <span className="label">Avg Hrs/Day</span>
                  <span className="value text-accent">
                    {selectedEmployee.present > 0
                      ? `${Math.floor((selectedEmployee.totalMinutesWorked / selectedEmployee.present) / 60)}h ${Math.round((selectedEmployee.totalMinutesWorked / selectedEmployee.present) % 60)}m`
                      : '0h 0m'}
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 2rem 1rem' }}>
                <h3 style={{ fontSize: '1.1rem', color: 'var(--text-secondary)' }}>Detailed Punch Records</h3>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    style={{
                      padding: '0.5rem 1rem',
                      borderRadius: '6px',
                      border: '1px solid var(--card-border)',
                      outline: 'none',
                      backgroundColor: 'white',
                      color: 'var(--text-primary)',
                      cursor: 'pointer',
                      fontWeight: '500'
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
                      display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem',
                      backgroundColor: 'var(--accent-color)', color: 'white', border: 'none',
                      borderRadius: '6px', cursor: 'pointer', fontWeight: '500', transition: 'background-color 0.2s',
                    }}
                    onMouseOver={(e) => e.target.style.backgroundColor = 'var(--accent-hover)'}
                    onMouseOut={(e) => e.target.style.backgroundColor = 'var(--accent-color)'}
                  >
                    <Download size={16} /> Export
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
                    {selectedEmployee.records
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
        )}
      </main>
    </div>
  )
}

export default App
