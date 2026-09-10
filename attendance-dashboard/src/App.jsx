import { useState, useMemo, useRef } from 'react'
import { Users, CheckCircle, XCircle, Calendar, Search, X, LayoutDashboard, FileText, Settings, LogOut, Download, Upload } from 'lucide-react'
import * as XLSX from 'xlsx'

function App() {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedEmployee, setSelectedEmployee] = useState(null)
  const [activeTab, setActiveTab] = useState('dashboard')
  const [statusFilter, setStatusFilter] = useState('All')
  const [rawData, setRawData] = useState([])
  const fileInputRef = useRef(null)

  const parseDate = (dateStr) => {
    if (!dateStr) return new Date()
    const months = { 'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5, 'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11 }
    const parts = dateStr.split('-')
    if (parts.length === 3) {
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
        const data = XLSX.utils.sheet_to_json(sheet, { header: 1 })
        
        const parsedData = []
        let currentDate = null

        for (let i = 0; i < data.length; i++) {
          const row = data[i]
          if (!row) continue
          
          if (row[1] === 'Attendance Date :' && row[5]) {
            currentDate = row[5]
            continue
          }

          const name = row[3]
          const status = row[17]
          const emp_id = row[2]

          if (name && status && name !== 'Name' && name !== 'Company:') {
            parsedData.push({
              date: currentDate,
              emp_id: emp_id,
              name: name,
              shift: row[5] || null,
              s_in_time: row[6] || null,
              s_out_time: row[8] || null,
              in_time: row[10] || null,
              out_time: row[11] || null,
              work_duration: row[12] || null,
              overtime: row[13] || null,
              total_duration: row[14] || null,
              late_by: row[15] || null,
              early_going_by: row[16] || null,
              status: typeof status === 'string' ? status.trim() : status,
              punch_records: row[19] || null
            })
          }
        }
        setRawData(parsedData)
      } catch (err) {
        console.error('Failed to parse excel:', err)
        alert('Failed to parse the file. Ensure it is the correct Attendance Report format.')
      } finally {
        e.target.value = ''
      }
    }
    reader.readAsArrayBuffer(file)
  }

  // Group data by employee
  const employeeSummaries = useMemo(() => {
    const map = new Map()
    
    rawData.forEach(record => {
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
    
    return Array.from(map.values())
  }, [rawData])

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

  return (
    <div className="app-layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-header" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div className="logo-icon" style={{ fontSize: '1.5rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>INXL</div>
          <h2 style={{ fontSize: '1.5rem', margin: 0 }}>Digital</h2>
        </div>
        
        <nav className="sidebar-nav">
          <ul>
            <li className={activeTab === 'dashboard' ? 'active' : ''} onClick={() => setActiveTab('dashboard')}>
              <LayoutDashboard size={20} />
              <span>Dashboard</span>
            </li>
            <li className={activeTab === 'reports' ? 'active' : ''} onClick={() => setActiveTab('reports')}>
              <FileText size={20} />
              <span>Reports</span>
            </li>
            <li className={activeTab === 'settings' ? 'active' : ''} onClick={() => setActiveTab('settings')}>
              <Settings size={20} />
              <span>Settings</span>
            </li>
          </ul>
        </nav>

        <div className="sidebar-footer">
          <button className="logout-btn">
            <LogOut size={20} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <header className="top-bar">
          <div>
            <h1>Attendance Overview</h1>
            <p className="subtitle">Track and manage employee attendance</p>
          </div>
          
          <div style={{display: 'flex', gap: '1rem', alignItems: 'center'}}>
            <div className="search-box">
              <Search className="search-icon" size={18} />
              <input 
                type="text" 
                placeholder="Search by name or ID..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <input 
              type="file" 
              accept=".xls,.xlsx" 
              style={{display: 'none'}} 
              ref={fileInputRef}
              onChange={handleFileUpload}
            />
            <button 
              onClick={() => fileInputRef.current?.click()}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.2rem',
                backgroundColor: 'white', color: 'var(--text-primary)', border: '1px solid var(--card-border)', 
                borderRadius: '8px', cursor: 'pointer', fontWeight: '500', transition: 'background-color 0.2s',
                boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
              }}
              onMouseOver={(e) => e.target.style.backgroundColor = '#f8fafc'}
              onMouseOut={(e) => e.target.style.backgroundColor = 'white'}
            >
              <Upload size={18} /> Upload Excel
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
            <h2 style={{ fontSize: '1.5rem', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>No Attendance Data</h2>
            <p>Please upload an Excel report to view the dashboard.</p>
            <button 
              onClick={() => fileInputRef.current?.click()}
              style={{
                marginTop: '1.5rem',
                display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.5rem',
                backgroundColor: 'var(--accent-color)', color: 'white', border: 'none', 
                borderRadius: '8px', cursor: 'pointer', fontWeight: '500', transition: 'background-color 0.2s',
                boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
              }}
              onMouseOver={(e) => e.target.style.backgroundColor = 'var(--accent-hover)'}
              onMouseOut={(e) => e.target.style.backgroundColor = 'var(--accent-color)'}
            >
              <Upload size={18} /> Select Excel File
            </button>
          </div>
        ) : (
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
                <div className="stat-icon check-icon"><CheckCircle size={24} /></div>
                <div className="stat-details">
                  <h3>Total Present (All Days)</h3>
                  <p className="stat-value">{filteredEmployees.reduce((sum, emp) => sum + emp.present, 0)}</p>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon x-icon"><XCircle size={24} /></div>
                <div className="stat-details">
                  <h3>Total Absent (All Days)</h3>
                  <p className="stat-value">{filteredEmployees.reduce((sum, emp) => sum + emp.absent, 0)}</p>
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
                      <td colSpan="7" style={{textAlign: 'center', color: 'var(--text-secondary)', padding: '3rem'}}>
                        No employees found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          </>
        )}

        {/* Modal for Employee Details */}
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
                <h3 style={{fontSize: '1.1rem', color: 'var(--text-secondary)'}}>Detailed Punch Records</h3>
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
                      .filter(record => statusFilter === 'All' || record.status === statusFilter)
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
