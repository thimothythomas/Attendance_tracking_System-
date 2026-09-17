'use client';

import React, { useMemo } from 'react';
import { 
  Users, UserCheck, Clock, Building, ArrowUpRight, 
  Plus, Calendar, CheckCircle2, AlertCircle, Sparkles,
  ChevronRight, ArrowRight, ShieldCheck, FileText, Fingerprint
} from 'lucide-react';

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

  // Department distribution
  const deptDistribution = useMemo(() => {
    const map = {};
    departments.forEach(d => { map[d.name] = { ...d, count: 0 }; });
    activeEmployees.forEach(e => {
      const dName = e.department_name;
      if (map[dName]) {
        map[dName].count++;
      } else {
        map[dName] = { name: dName, count: 1, color: '#4f46e5', bg: '#e0e7ff' };
      }
    });
    return Object.values(map);
  }, [departments, activeEmployees]);

  return (
    <div style={{ padding: '0.25rem 0' }}>
      {/* Welcome Banner */}
      <div style={{
        backgroundColor: 'linear-gradient(135deg, #0f4c81 0%, #1e3a8a 100%)',
        background: 'linear-gradient(135deg, #0f4c81 0%, #1e3a8a 100%)',
        borderRadius: '16px', padding: '1.75rem 2rem', color: 'white',
        marginBottom: '1.75rem', boxShadow: '0 10px 15px -3px rgba(15, 76, 129, 0.2)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.5rem'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <span style={{
              backgroundColor: 'rgba(255, 255, 255, 0.2)', padding: '0.25rem 0.65rem',
              borderRadius: '20px', fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.05em'
            }}>
              INXL WORKFORCE PORTAL
            </span>
            <span style={{ fontSize: '0.8125rem', color: 'rgba(255, 255, 255, 0.8)' }}>
              • Live Hardware Sync Active
            </span>
          </div>

          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>
            Welcome to People & Workforce Operations
          </h2>
          <p style={{ margin: '0.5rem 0 0 0', color: 'rgba(255, 255, 255, 0.85)', fontSize: '0.9rem', maxWidth: '600px', lineHeight: 1.5 }}>
            Centralized hub for employee directory, departmental structure, custom shift scheduling, and biometric timesheet records.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => onNavigate('employees')}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              backgroundColor: 'white', color: '#0f4c81', border: 'none',
              padding: '0.75rem 1.25rem', borderRadius: '10px', fontWeight: 700,
              fontSize: '0.875rem', cursor: 'pointer', boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
              transition: 'transform 0.15s'
            }}
          >
            <Users size={18} />
            <span>Manage Staff</span>
          </button>

          <button
            onClick={() => onNavigate('timesheets')}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              backgroundColor: 'rgba(255, 255, 255, 0.15)', color: 'white',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              padding: '0.75rem 1.25rem', borderRadius: '10px', fontWeight: 600,
              fontSize: '0.875rem', cursor: 'pointer', backdropFilter: 'blur(5px)'
            }}
          >
            <FileText size={18} />
            <span>View Timesheets</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', marginBottom: '1.75rem' }}>
        {/* Total Staff */}
        <div 
          onClick={() => onNavigate('employees')}
          style={{
            backgroundColor: 'white', padding: '1.25rem', borderRadius: '14px',
            border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            cursor: 'pointer', transition: 'all 0.2s'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#64748b', fontSize: '0.8125rem', fontWeight: 600 }}>
            <span>TOTAL EMPLOYEES</span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#e0e7ff', color: '#4338ca', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Users size={18} />
            </div>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#0f172a', marginTop: '0.5rem' }}>
            {activeEmployees.length}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.75rem', color: '#16a34a', marginTop: '0.35rem' }}>
            <CheckCircle2 size={13} />
            <span>Active & Enrolled in System</span>
          </div>
        </div>

        {/* Present Today */}
        <div 
          onClick={() => onNavigate('timesheets')}
          style={{
            backgroundColor: 'white', padding: '1.25rem', borderRadius: '14px',
            border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            cursor: 'pointer', transition: 'all 0.2s'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#64748b', fontSize: '0.8125rem', fontWeight: 600 }}>
            <span>IN OFFICE TODAY</span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#dcfce7', color: '#15803d', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <UserCheck size={18} />
            </div>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#0f172a', marginTop: '0.5rem' }}>
            {todayStats.presentCount}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.75rem', color: '#0369a1', marginTop: '0.35rem' }}>
            <span>{todayStats.attendanceRate}% Attendance Rate</span>
          </div>
        </div>

        {/* On-Time vs Late */}
        <div 
          onClick={() => onNavigate('timesheets')}
          style={{
            backgroundColor: 'white', padding: '1.25rem', borderRadius: '14px',
            border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            cursor: 'pointer', transition: 'all 0.2s'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#64748b', fontSize: '0.8125rem', fontWeight: 600 }}>
            <span>ON-TIME ARRIVALS</span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#fef3c7', color: '#b45309', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Clock size={18} />
            </div>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#0f172a', marginTop: '0.5rem' }}>
            {todayStats.onTimeCount}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.75rem', color: todayStats.lateCount > 0 ? '#ea580c' : '#16a34a', marginTop: '0.35rem' }}>
            <span>{todayStats.lateCount} arrived late today</span>
          </div>
        </div>

        {/* Departments */}
        <div 
          onClick={() => onNavigate('departments')}
          style={{
            backgroundColor: 'white', padding: '1.25rem', borderRadius: '14px',
            border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            cursor: 'pointer', transition: 'all 0.2s'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#64748b', fontSize: '0.8125rem', fontWeight: 600 }}>
            <span>DEPARTMENTS</span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#e0f2fe', color: '#0369a1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Building size={18} />
            </div>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#0f172a', marginTop: '0.5rem' }}>
            {departments.length}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.75rem', color: '#64748b', marginTop: '0.35rem' }}>
            <span>Across Engineering & Business</span>
          </div>
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.4fr) minmax(0, 1fr)', gap: '1.5rem', alignItems: 'start' }}>
        
        {/* Left Column: Today's Attendance Pulse */}
        <div style={{
          backgroundColor: 'white', borderRadius: '16px', border: '1px solid #e2e8f0',
          padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <div>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                Today&apos;s Attendance Pulse
              </h3>
              <p style={{ color: '#64748b', fontSize: '0.8125rem', margin: '0.25rem 0 0 0' }}>
                Live clock-in events from biometric machine for {latestDateStr}
              </p>
            </div>

            <button
              onClick={() => onNavigate('timesheets')}
              style={{
                background: 'none', border: 'none', color: '#0f4c81',
                fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '0.25rem'
              }}
            >
              <span>Full Timesheet</span>
              <ArrowRight size={14} />
            </button>
          </div>

          {/* List of present employees today */}
          {todayStats.presentList.length === 0 ? (
            <div style={{ padding: '2.5rem', textAlign: 'center', color: '#64748b', backgroundColor: '#f8fafc', borderRadius: '12px' }}>
              <Clock size={32} color="#94a3b8" style={{ margin: '0 auto 0.5rem auto' }} />
              <p style={{ margin: 0, fontWeight: 500 }}>No clock-ins recorded yet today.</p>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Punches sync automatically every 15 minutes.</span>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {todayStats.presentList.slice(0, 6).map(rec => {
                const emp = activeEmployees.find(e => 
                  String(e.employee_id) === String(rec.emp_id) || 
                  String(e.employee_code) === String(rec.emp_id) ||
                  String(e.employee_code) === String(rec.emp_code) ||
                  (e.displayName && rec.name && e.displayName.toLowerCase() === rec.name.toLowerCase())
                );
                const lateVal = rec.late_by || rec.lateBy;
                const isLate = lateVal && lateVal !== '0' && lateVal !== '00:00' && lateVal !== '-';
                const inTimeVal = rec.in_time || rec.inTime || '--:--';
                const initials = (rec.name || 'E').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

                return (
                  <div
                    key={rec.id || rec.emp_id || rec.name}
                    onClick={() => {
                      if (onViewEmployee) {
                        onViewEmployee(emp || {
                          employee_id: rec.emp_id,
                          employee_code: rec.emp_id,
                          employee_name: rec.name,
                          displayName: rec.name,
                          department_name: emp?.department_name || 'Staff',
                          shift_name: emp?.shift_name || 'General Shift'
                        });
                      }
                    }}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '0.75rem 1rem', borderRadius: '10px',
                      backgroundColor: '#f8fafc', border: '1px solid #f1f5f9',
                      cursor: onViewEmployee ? 'pointer' : 'default',
                      transition: 'all 0.15s ease'
                    }}
                    onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#f1f5f9'; }}
                    onMouseOut={(e) => { e.currentTarget.style.backgroundColor = '#f8fafc'; }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{
                        width: '36px', height: '36px', borderRadius: '50%',
                        backgroundColor: '#e0e7ff', color: '#4338ca',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontWeight: 700, fontSize: '0.8125rem'
                      }}>
                        {initials}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.875rem', color: '#1e293b' }}>
                          {rec.name}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                          {emp?.department_name || 'Staff'} • In: {inTimeVal}
                        </div>
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
                        padding: '0.25rem 0.6rem', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600,
                        backgroundColor: isLate ? '#fee2e2' : '#dcfce7',
                        color: isLate ? '#b91c1c' : '#15803d'
                      }}>
                        {isLate ? `Late by ${lateVal}` : 'On Time'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Department Distribution & Quick Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Department Breakdown */}
          <div style={{
            backgroundColor: 'white', borderRadius: '16px', border: '1px solid #e2e8f0',
            padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                Department Headcounts
              </h3>
              <button
                onClick={() => onNavigate('departments')}
                style={{
                  background: 'none', border: 'none', color: '#0f4c81',
                  fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer'
                }}
              >
                Manage
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
              {deptDistribution.map(dept => {
                const total = activeEmployees.length || 1;
                const pct = Math.round((dept.count / total) * 100);

                return (
                  <div key={dept.id || dept.name}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem', marginBottom: '0.35rem' }}>
                      <span style={{ fontWeight: 600, color: '#334155' }}>{dept.name}</span>
                      <span style={{ color: '#64748b', fontWeight: 500 }}>{dept.count} members ({pct}%)</span>
                    </div>
                    <div style={{ width: '100%', height: '8px', backgroundColor: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{
                        width: `${pct}%`, height: '100%',
                        backgroundColor: dept.color || '#4f46e5',
                        borderRadius: '4px', transition: 'width 0.3s'
                      }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick HR Actions */}
          <div style={{
            backgroundColor: 'white', borderRadius: '16px', border: '1px solid #e2e8f0',
            padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
          }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#0f172a', margin: '0 0 1rem 0' }}>
              Workforce Actions
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <button
                onClick={() => {
                  onNavigate('employees');
                  if (onOpenAddEmployee) onOpenAddEmployee();
                }}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
                  padding: '0.875rem', borderRadius: '10px', border: '1px solid #e2e8f0',
                  backgroundColor: '#f8fafc', cursor: 'pointer', textAlign: 'left', transition: 'background 0.15s'
                }}
              >
                <div style={{ width: '28px', height: '28px', borderRadius: '6px', backgroundColor: '#e0e7ff', color: '#4338ca', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.5rem' }}>
                  <Plus size={16} />
                </div>
                <span style={{ fontWeight: 700, fontSize: '0.8125rem', color: '#0f172a' }}>Add Staff</span>
                <span style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '0.15rem' }}>Enroll new team member</span>
              </button>

              <button
                onClick={() => onNavigate('shifts')}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
                  padding: '0.875rem', borderRadius: '10px', border: '1px solid #e2e8f0',
                  backgroundColor: '#f8fafc', cursor: 'pointer', textAlign: 'left', transition: 'background 0.15s'
                }}
              >
                <div style={{ width: '28px', height: '28px', borderRadius: '6px', backgroundColor: '#fef3c7', color: '#b45309', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.5rem' }}>
                  <Clock size={16} />
                </div>
                <span style={{ fontWeight: 700, fontSize: '0.8125rem', color: '#0f172a' }}>Set Shifts</span>
                <span style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '0.15rem' }}>Configure working hours</span>
              </button>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
