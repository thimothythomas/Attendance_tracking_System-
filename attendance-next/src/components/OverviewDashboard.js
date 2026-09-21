'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, UserCheck, Clock, Building, ArrowUpRight, 
  Plus, Calendar, CheckCircle2, AlertCircle, Sparkles,
  ChevronRight, ArrowRight, ShieldCheck, FileText, Fingerprint,
  Search, SlidersHorizontal, Bell, Pause, Play, Square,
  Flame, TrendingUp, TrendingDown, Check, ChevronLeft
} from 'lucide-react';
import { getIndianHolidays } from '@/lib/indianHolidays';

export default function OverviewDashboard({
  employees = [],
  rawData = [],
  departments = [],
  shifts = [],
  onNavigate,
  onOpenAddEmployee,
  onViewEmployee,
  onSelectDepartment
}) {
  // Filter state for team cards
  const [teamFilter, setTeamFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Widget Date state
  const [widgetDate, setWidgetDate] = useState(new Date());
  const [touchStart, setTouchStart] = useState(null);
  
  // Selected person for calendar filter
  const [selectedCalendarPerson, setSelectedCalendarPerson] = useState('ALL');
  
  // Live ticking clock for TaskLab Time Tracker widget
  const [elapsedSeconds, setElapsedSeconds] = useState(27615); // 07:40:15 in seconds
  const [isTimerRunning, setIsTimerRunning] = useState(true);

  useEffect(() => {
    if (!isTimerRunning) return;
    const interval = setInterval(() => {
      setElapsedSeconds(prev => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isTimerRunning]);

  const formatClock = (totalSec) => {
    const hrs = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Compute active employees
  const activeEmployees = useMemo(() => {
    return employees.filter(e => e.is_active);
  }, [employees]);

  // Find latest attendance date in records or today
  const latestDateStr = useMemo(() => {
    if (!rawData || rawData.length === 0) {
      const now = new Date();
      return now.toISOString().split('T')[0];
    }
    let maxD = '';
    rawData.forEach(r => {
      if (r.date && r.date > maxD) maxD = r.date;
    });
    return maxD || new Date().toISOString().split('T')[0];
  }, [rawData]);

  // Attendance stats for latest date
  const todayStats = useMemo(() => {
    const recordsToday = rawData.filter(r => r.date === latestDateStr);
    const presentList = recordsToday.filter(r => {
      if (r.status === 'Present') return true;
      if (typeof r.present === 'number' && r.present > 0) return true;
      if (r.punch_records && typeof r.punch_records === 'string' && r.punch_records.trim() !== '') return true;
      return false;
    });
    const lateList = presentList.filter(r => {
      const lb = r.late_by || r.lateBy;
      if (!lb || lb === '0' || lb === '00:00' || lb === '-') return false;
      return true;
    });

    const presentCount = presentList.length;
    const lateCount = lateList.length;
    const onTimeCount = Math.max(0, presentCount - lateCount);
    const totalStaff = activeEmployees.length || 13;
    const absentCount = Math.max(0, totalStaff - presentCount);

    return {
      recordsToday,
      presentList,
      lateList,
      presentCount,
      lateCount,
      onTimeCount,
      absentCount,
      attendanceRate: totalStaff > 0 ? Math.round((presentCount / totalStaff) * 100) : 0
    };
  }, [rawData, latestDateStr, activeEmployees]);

  // Map employee punches for live schedule capsule
  const activePunchedStaff = useMemo(() => {
    return todayStats.presentList.slice(0, 5).map(record => {
      const emp = activeEmployees.find(e => String(e.emp_id) === String(record.emp_id || record.id)) || {};
      const firstPunch = record.first_punch || (record.punch_records ? record.punch_records.split(',')[0].trim() : '09:00 AM');
      return {
        name: record.name || emp.name || `Staff #${record.emp_id}`,
        firstPunch,
        emp_id: record.emp_id || emp.emp_id
      };
    });
  }, [todayStats.presentList, activeEmployees]);

  // Filtered employees for the Bento Card Grid
  const filteredStaff = useMemo(() => {
    return activeEmployees.filter(emp => {
      const empName = emp?.name || `Staff #${emp?.emp_id || ''}`;
      const deptName = emp?.department_name || '';
      const matchesSearch = empName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            String(emp?.emp_id || '').includes(searchQuery) ||
                            deptName.toLowerCase().includes(searchQuery.toLowerCase());
      
      const isPresentToday = todayStats.presentList.some(r => String(r.emp_id) === String(emp.emp_id));

      if (teamFilter === 'ON_DUTY') return matchesSearch && isPresentToday;
      if (teamFilter === 'ON_LEAVE') return matchesSearch && !isPresentToday;
      if (teamFilter !== 'ALL') return matchesSearch && emp.department_name === teamFilter;
      return matchesSearch;
    });
  }, [activeEmployees, searchQuery, teamFilter, todayStats.presentList]);

  // Format date display for capsule
  const formattedDate = useMemo(() => {
    const d = new Date(latestDateStr);
    return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
  }, [latestDateStr]);

  // Dynamic holidays for the widget
  const widgetYear = widgetDate.getFullYear();
  const widgetMonth = widgetDate.getMonth();

  const monthHolidays = useMemo(() => {
    const allHolidays = getIndianHolidays(widgetYear);
    return allHolidays.filter(h => {
      const hd = new Date(h.date);
      return hd.getFullYear() === widgetYear && hd.getMonth() === widgetMonth;
    }).map(h => ({ day: new Date(h.date).getDate(), name: h.name, type: h.type }));
  }, [widgetYear, widgetMonth]);

  const handlePrevMonthWidget = () => setWidgetDate(new Date(widgetYear, widgetMonth - 1, 1));
  const handleNextMonthWidget = () => setWidgetDate(new Date(widgetYear, widgetMonth + 1, 1));

  const handleTouchStartWidget = (e) => setTouchStart(e.targetTouches[0].clientX);
  const handleTouchEndWidget = (e) => {
    if (!touchStart) return;
    const touchEnd = e.changedTouches[0].clientX;
    const distance = touchStart - touchEnd;
    if (distance > 50) handleNextMonthWidget(); // swipe left -> next month
    if (distance < -50) handlePrevMonthWidget(); // swipe right -> prev month
    setTouchStart(null);
  };

  const calendarDays = useMemo(() => {
    const days = [];
    let firstDay = new Date(widgetYear, widgetMonth, 1).getDay();
    firstDay = firstDay === 0 ? 6 : firstDay - 1; // Map Sunday (0) -> 6, Monday (1) -> 0
    
    const daysInMonth = new Date(widgetYear, widgetMonth + 1, 0).getDate();
    
    for (let i = 0; i < firstDay; i++) {
      days.push({ empty: true });
    }
    
    const today = new Date();
    for (let i = 1; i <= daysInMonth; i++) {
      const dayOfWeek = (firstDay + i - 1) % 7;
      const isWeekend = dayOfWeek === 5 || dayOfWeek === 6; // Sat=5, Sun=6 in this mapping
      const holiday = monthHolidays.find(h => h.day === i);
      const isCurrent = i === today.getDate() && widgetMonth === today.getMonth() && widgetYear === today.getFullYear();
      
      days.push({
        empty: false,
        day: i,
        isWeekend,
        isHoliday: !!holiday,
        holidayName: holiday ? holiday.name : null,
        isCurrent
      });
    }
    return days;
  }, [widgetYear, widgetMonth, monthHolidays]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      
      {/* ========================================================
          1. TOP FLOATING SCHEDULE & SYNC CAPSULE (Workspace Header)
          ======================================================== */}
      <div className="top-capsule-bar">
        {/* Left: Schedule label and date badge */}
        <div className="capsule-schedule-label">
          <span>Your Schedule</span>
          <div className="capsule-date-pill">
            <Calendar size={13} />
            <span>{formattedDate || '18 Sep'}</span>
          </div>
        </div>

        {/* Center: Flowing electric lime timeline track */}
        <div className="capsule-timeline-track">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.775rem', fontWeight: 700 }}>
            {activePunchedStaff[0] && (
              <div className="capsule-timeline-avatar" title={`${activePunchedStaff[0].name || ''} (${activePunchedStaff[0].firstPunch || ''})`}>
                {(activePunchedStaff[0].name || '#').charAt(0)}
              </div>
            )}
            <span>09:00 AM</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', position: 'relative' }}>
            {activePunchedStaff.slice(1, 3).map((staff, idx) => (
              <div 
                key={idx} 
                className="capsule-timeline-avatar" 
                style={{ marginLeft: idx > 0 ? '-10px' : '0' }}
                title={`${staff?.name || ''} (${staff?.firstPunch || ''})`}
              >
                {(staff?.name || '#').charAt(0)}
              </div>
            ))}
            <span style={{ fontSize: '0.775rem', fontWeight: 800, color: '#161245' }}>
              01:30 PM
            </span>
          </div>

          {/* Center notch showing shift progress */}
          <div className="capsule-notch-marker">
            78%
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.775rem', fontWeight: 700 }}>
            <span>06:00 PM</span>
            {activePunchedStaff[3] && (
              <div className="capsule-timeline-avatar" title={`${activePunchedStaff[3].name || ''} (${activePunchedStaff[3].firstPunch || ''})`}>
                {(activePunchedStaff[3].name || '#').charAt(0)}
              </div>
            )}
            <div 
              className="bento-corner-arrow" 
              style={{ width: '26px', height: '26px', background: '#161245', color: '#90d152' }}
              onClick={() => onNavigate('timesheets')}
            >
              <ArrowUpRight size={14} />
            </div>
          </div>
        </div>

        {/* Right actions: notification and profile */}
        <div className="capsule-right-actions">
          <button className="capsule-circle-btn" title="Live Sync Notifications">
            <Bell size={16} />
            <span className="capsule-badge-dot"></span>
          </button>

          <div className="capsule-profile-pill" onClick={() => onNavigate('settings')}>
            <div style={{
              width: '28px', height: '28px', borderRadius: '50%',
              background: '#90d152', color: '#161245',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 800, fontSize: '0.75rem'
            }}>
              HR
            </div>
            <span style={{ fontSize: '0.825rem', fontWeight: 600, color: '#f8fafc' }}>
              Operations
            </span>
          </div>
        </div>
      </div>

      {/* ========================================================
          2. WORKSPACE HERO BAR (Image 1 Style)
          ======================================================== */}
      <div className="workspace-hero">
        <div className="workspace-title-group">
          <button className="workspace-back-btn" onClick={() => onNavigate('overview')} title="Reset view">
            <ChevronLeft size={20} />
          </button>
          
          <h1 className="workspace-title">
            W<span className="workspace-title-dot"></span>RKFORCE
          </h1>

          <button className="workspace-action-pill" onClick={onOpenAddEmployee}>
            <Plus size={18} />
            <span>New Employee</span>
          </button>
        </div>

        <div className="workspace-counters">
          <div className="workspace-counter-item">
            <span className="workspace-counter-number">{activeEmployees.length}</span>
            <span className="workspace-counter-label">Staff</span>
            <span className="workspace-delta-badge delta-green">+2</span>
          </div>

          <div className="workspace-counter-item">
            <span className="workspace-counter-number">{todayStats.presentCount}</span>
            <span className="workspace-counter-label">In Office</span>
            <span className="workspace-delta-badge delta-green">+{todayStats.attendanceRate}%</span>
          </div>

          <div className="workspace-counter-item">
            <span className="workspace-counter-number">{todayStats.absentCount}</span>
            <span className="workspace-counter-label">Off / Leave</span>
            <span className="workspace-delta-badge delta-red">-1</span>
          </div>
        </div>
      </div>

      {/* ========================================================
          3. SIGNATURE BENTO GRID ROW 1 (TaskLab Cards)
          ======================================================== */}
      <div className="bento-grid">
        
        {/* Card 1: Work Hours (TaskLab Top-Left) */}
        <div className="bento-card" style={{ gridColumn: 'span 4' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#161245', fontWeight: 700, fontSize: '1rem' }}>
              <Clock size={20} />
              <span>Work Hours</span>
            </div>
            <button className="bento-corner-arrow" onClick={() => onNavigate('timesheets')} title="View Timesheets">
              <ArrowUpRight size={18} />
            </button>
          </div>

          <div style={{ fontSize: '2.5rem', fontWeight: 900, color: '#161245', letterSpacing: '-0.03em', marginBottom: '1rem' }}>
            34,5 h
          </div>

          {/* Two-tone progress bar */}
          <div style={{ height: '8px', background: '#e2e8f0', borderRadius: '9999px', overflow: 'hidden', display: 'flex', marginBottom: '0.75rem' }}>
            <div style={{ width: '65%', background: '#90d152' }}></div>
            <div style={{ width: '35%', background: '#161245' }}></div>
          </div>

          <div style={{ display: 'flex', gap: '1.25rem', fontSize: '0.8rem', fontWeight: 600 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#161245' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#90d152' }}></span>
              <span>On Time ({todayStats.onTimeCount})</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#64748b' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#161245' }}></span>
              <span>Late Arrivals ({todayStats.lateCount})</span>
            </div>
          </div>
        </div>

        {/* Card 2: Core Team - VIBRANT LIME GREEN (TaskLab Top-Middle) */}
        <div className="bento-card bento-card-lime" style={{ gridColumn: 'span 4' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#161245', fontWeight: 800, fontSize: '1.05rem' }}>
                <Users size={20} />
                <span>Core Team</span>
              </div>
              <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.8rem', color: 'rgba(22, 18, 69, 0.7)', fontWeight: 500 }}>
                Active Workforce Personnel
              </p>
            </div>
          </div>

          <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#161245', marginBottom: '1.25rem' }}>
            {activeEmployees.length} Members
          </div>

          {/* Avatar Stack + Add Member Button */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              {activeEmployees.slice(0, 4).map((emp, i) => (
                <div 
                  key={emp.id || i}
                  style={{
                    width: '40px', height: '40px', borderRadius: '50%',
                    background: '#161245', color: '#ffffff',
                    border: '3px solid #90d152',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 700, fontSize: '0.85rem',
                    marginLeft: i > 0 ? '-12px' : '0',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                  }}
                  title={emp.name}
                >
                  {emp.name ? emp.name.charAt(0) : '#'}
                </div>
              ))}
              {activeEmployees.length > 4 && (
                <div style={{
                  width: '40px', height: '40px', borderRadius: '50%',
                  background: '#161245', color: '#ffffff',
                  border: '3px solid #90d152',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 700, fontSize: '0.8rem',
                  marginLeft: '-12px'
                }}>
                  +{activeEmployees.length - 4}
                </div>
              )}
            </div>

            {/* Dotted + Button */}
            <button 
              onClick={onOpenAddEmployee}
              style={{
                width: '44px', height: '44px', borderRadius: '50%',
                border: '2px dashed #161245', background: 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', color: '#161245', transition: 'all 0.2s'
              }}
              title="Add New Employee"
            >
              <Plus size={22} />
            </button>
          </div>
        </div>

        {/* Card 3: Productivity & Attendance Trend - MATTE BLACK (TaskLab Middle) */}
        <div className="bento-card bento-card-dark" style={{ gridColumn: 'span 4' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, fontSize: '0.95rem' }}>
              <TrendingUp size={18} color="#90d152" />
              <span>Attendance Trend</span>
            </div>
            <span style={{ fontSize: '0.75rem', padding: '0.2rem 0.6rem', borderRadius: '9999px', background: 'rgba(255,255,255,0.1)', color: '#90d152', fontWeight: 700 }}>
              Live
            </span>
          </div>

          {/* Bar chart representation with spline */}
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', height: '70px', padding: '0 0.5rem', marginBottom: '1.25rem', position: 'relative' }}>
            {/* White vertical bars */}
            {[45, 65, 80, 50, 95, 75, 85].map((h, i) => (
              <div 
                key={i} 
                style={{
                  width: '16px', 
                  height: `${h}%`, 
                  background: i === 4 ? '#90d152' : 'rgba(255, 255, 255, 0.85)', 
                  borderRadius: '6px',
                  transition: 'height 0.3s'
                }} 
              />
            ))}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '0.85rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem', color: '#90d152', fontWeight: 700 }}>
                <TrendingUp size={14} />
                <span>+13%</span>
              </div>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Attendance this month</span>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#f8fafc' }}>
                {todayStats.attendanceRate}%
              </div>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Punctuality Rate</span>
            </div>
          </div>
        </div>

      </div>

      {/* ========================================================
          4. BENTO GRID ROW 2 (Working Days Calendar & Time Tracker)
          ======================================================== */}
      <div className="bento-grid">
        
        {/* Card 4: Company Holiday Calendar - VIBRANT LIME GREEN (7 cols) */}
        <div className="bento-card bento-card-lime" style={{ gridColumn: 'span 7' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 800, fontSize: '1.1rem', color: '#161245' }}>
                <Calendar size={20} />
                <span>Company Holidays</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
                <button onClick={handlePrevMonthWidget} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, color: '#161245' }} title="Previous Month">
                  <ChevronLeft size={16} />
                </button>
                <span style={{ fontSize: '0.8rem', color: 'rgba(22, 18, 69, 0.7)', fontWeight: 600 }}>
                  {widgetDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                </span>
                <button onClick={handleNextMonthWidget} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, color: '#161245' }} title="Next Month">
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>

            <button 
              className="bento-corner-arrow" 
              style={{ background: '#161245', color: '#90d152' }}
              onClick={() => onNavigate('calendar')}
              title="View Full Calendar"
            >
              <ArrowUpRight size={18} />
            </button>
          </div>

          {/* Upcoming Holidays List */}
          <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.75rem', marginBottom: '1rem', minHeight: '38px' }}>
            {monthHolidays.length === 0 ? (
               <div style={{ fontSize: '0.8rem', color: 'rgba(22, 18, 69, 0.5)', fontStyle: 'italic', padding: '0.2rem 0' }}>No public holidays this month</div>
            ) : monthHolidays.map((holiday, idx) => (
              <div 
                key={idx}
                style={{
                  padding: '0.35rem 0.85rem', borderRadius: '9999px',
                  border: '1px solid rgba(22, 18, 69, 0.2)',
                  background: 'rgba(22, 18, 69, 0.05)',
                  color: '#161245',
                  fontSize: '0.8rem', fontWeight: 700, whiteSpace: 'nowrap',
                  display: 'flex', alignItems: 'center', gap: '0.35rem'
                }}
              >
                <Sparkles size={12} />
                {holiday.day} {widgetDate.toLocaleString('default', { month: 'short' })} - {holiday.name}
              </div>
            ))}
          </div>

          {/* 7-column calendar grid with swipe support */}
          <div 
            className="bubble-calendar"
            onTouchStart={handleTouchStartWidget}
            onTouchEnd={handleTouchEndWidget}
            style={{ touchAction: 'pan-y' }} // Allows vertical scroll, detects horizontal swipe
          >
            {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, idx) => (
              <div key={`header-${idx}`} className="bubble-day-header">{day}</div>
            ))}

            {calendarDays.map((item, idx) => (
              item.empty ? (
                <div key={`empty-${idx}`} className="bubble-day" style={{ opacity: 0, pointerEvents: 'none' }} />
              ) : (
                <div 
                  key={`day-${idx}`}
                  className={`bubble-day ${item.isCurrent ? 'bubble-day-current' : item.isHoliday ? 'bubble-day-present' : 'bubble-day-off'}`}
                  title={item.isHoliday ? item.holidayName : `Day ${item.day}: ${item.isWeekend ? 'Weekend' : 'Work Day'}`}
                  style={item.isHoliday ? { background: '#161245', color: '#90d152', border: 'none' } : {}}
                >
                  {item.day}
                </div>
              )
            ))}
          </div>
        </div>

        {/* Card 5: Live Time Tracker & Shift Capsule - MATTE BLACK (5 cols) */}
        <div className="bento-card bento-card-dark" style={{ gridColumn: 'span 5', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, fontSize: '1rem' }}>
                <Clock size={20} color="#90d152" />
                <span>Live Shift Tracker</span>
              </div>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8', background: 'rgba(255,255,255,0.08)', padding: '0.2rem 0.6rem', borderRadius: '9999px' }}>
                Biometric Sync
              </span>
            </div>

            {/* Giant Digital Clock */}
            <div style={{ textAlign: 'center', margin: '1.5rem 0' }}>
              <div className="digital-clock-display">
                {formatClock(elapsedSeconds)}
              </div>
              <p style={{ margin: '0.4rem 0 0 0', fontSize: '0.85rem', color: '#94a3b8' }}>
                Elapsed Today • General Office Shift (09:00 – 18:00)
              </p>
            </div>
          </div>

          {/* Control Buttons (Play, Pause, Sync) */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1.25rem' }}>
            <button 
              onClick={() => setIsTimerRunning(!isTimerRunning)}
              style={{
                width: '46px', height: '46px', borderRadius: '50%',
                background: isTimerRunning ? 'rgba(255,255,255,0.1)' : '#90d152',
                color: isTimerRunning ? '#ffffff' : '#161245',
                border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', transition: 'all 0.2s'
              }}
              title={isTimerRunning ? 'Pause Shift Counter' : 'Resume Shift Counter'}
            >
              {isTimerRunning ? <Pause size={18} /> : <Play size={18} />}
            </button>

            <button 
              onClick={() => onNavigate('timesheets')}
              style={{
                padding: '0.65rem 1.4rem', borderRadius: '9999px',
                background: '#90d152', color: '#161245',
                border: 'none', fontWeight: 700, fontSize: '0.875rem',
                display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer'
              }}
            >
              <CheckCircle2 size={16} />
              <span>Inspect Punches</span>
            </button>
          </div>
        </div>

      </div>

    </div>
  );
}
