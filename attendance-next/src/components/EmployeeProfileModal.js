'use client';

import React, { useState, useMemo } from 'react';
import { 
  X, User, Fingerprint, Building, Clock, Calendar, CheckCircle2, 
  XCircle, AlertCircle, Award, TrendingUp, Briefcase, Mail, Phone, Edit3
} from 'lucide-react';

export default function EmployeeProfileModal({ 
  employee, 
  attendanceData = [], 
  onClose,
  onEdit 
}) {
  const [profileTab, setProfileTab] = useState('overview'); // 'overview' | 'attendance' | 'shift'

  // Filter attendance logs for this employee
  const employeeLogs = useMemo(() => {
    if (!attendanceData || !employee) return [];
    return attendanceData
      .filter(row => String(row.emp_id) === String(employee.displayCode || employee.employee_id))
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [attendanceData, employee]);

  // Calculate quick stats
  const stats = useMemo(() => {
    if (employeeLogs.length === 0) {
      return {
        totalDays: 0,
        present: 0,
        absent: 0,
        late: 0,
        attendanceRate: 0,
        onTimeRate: 0,
        avgHours: '0h 0m'
      };
    }

    const totalDays = employeeLogs.length;
    const present = employeeLogs.filter(l => (l.present || 0) > 0).length;
    const absent = employeeLogs.filter(l => (l.absent || 0) > 0).length;
    const late = employeeLogs.filter(l => (l.lateByMinutes || 0) > 0).length;
    const onTime = present - late;

    const attendanceRate = totalDays > 0 ? Math.round((present / totalDays) * 100) : 0;
    const onTimeRate = present > 0 ? Math.round((onTime / present) * 100) : 100;

    return {
      totalDays,
      present,
      absent,
      late,
      attendanceRate,
      onTimeRate,
      avgHours: '8h 45m'
    };
  }, [employeeLogs]);

  if (!employee) return null;

  const safeName = employee.displayName || (employee.name ? employee.name : `Staff #${employee.displayCode || employee.employee_id || ''}`);
  const initials = safeName
    .split(' ')
    .filter(Boolean)
    .map(n => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase() || 'EM';

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1100,
      backgroundColor: 'rgba(22, 18, 69, 0.65)', backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.25rem'
    }}>
      <div style={{
        backgroundColor: 'white', borderRadius: '24px', maxWidth: '680px', width: '100%',
        maxHeight: '90vh', display: 'flex', flexDirection: 'column',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', overflow: 'hidden',
        border: '1px solid rgba(0, 0, 0, 0.08)'
      }}>
        
        {/* Header Hero - Neo-Bento Obsidian with Electric Lime Accents */}
        <div style={{
          backgroundColor: '#161245',
          padding: '1.75rem 2rem', color: 'white', position: 'relative'
        }}>
          <button
            onClick={onClose}
            style={{
              position: 'absolute', right: '1.25rem', top: '1.25rem',
              backgroundColor: 'rgba(255, 255, 255, 0.1)', border: 'none',
              width: '32px', height: '32px', borderRadius: '50%', color: '#94a3b8',
              display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseOver={(e) => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)'; }}
            onMouseOut={(e) => { e.currentTarget.style.color = '#94a3b8'; e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'; }}
          >
            <X size={16} />
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            <div style={{
              width: '64px', height: '64px', borderRadius: '20px',
              backgroundColor: '#251f6d', color: '#90d152', border: '2px solid rgba(144, 209, 82, 0.4)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.4rem', fontWeight: 900, boxShadow: '0 4px 14px rgba(0,0,0,0.3)'
            }}>
              {initials}
            </div>

            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <h3 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em', color: '#ffffff' }}>
                  {safeName}
                </h3>
                <span style={{
                  padding: '0.2rem 0.65rem', borderRadius: '9999px', fontSize: '0.725rem', fontWeight: 800,
                  backgroundColor: employee.is_active ? '#90d152' : '#fee2e2',
                  color: employee.is_active ? '#161245' : '#b91c1c'
                }}>
                  {employee.is_active ? 'Active Staff' : 'Inactive'}
                </span>
              </div>

              <div style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '0.3rem', fontWeight: 500 }}>
                {employee.designation || 'Team Member'} • {employee.department_name || 'General Staff'}
              </div>
            </div>

            {onEdit && (
              <button
                onClick={() => {
                  onClose();
                  onEdit(employee);
                }}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.4rem',
                  backgroundColor: 'rgba(255, 255, 255, 0.1)', border: '1px solid rgba(255, 255, 255, 0.2)',
                  padding: '0.5rem 1rem', borderRadius: '9999px', color: 'white',
                  fontSize: '0.8125rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s'
                }}
                onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#90d152'; e.currentTarget.style.color = '#161245'; }}
                onMouseOut={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'; e.currentTarget.style.color = 'white'; }}
              >
                <Edit3 size={14} />
                <span>Edit</span>
              </button>
            )}
          </div>
        </div>

        {/* Tab Switcher - Floating Pill Dock */}
        <div style={{
          display: 'flex', gap: '0.5rem',
          padding: '0.85rem 1.5rem', backgroundColor: '#f9fafb',
          borderBottom: '1px solid rgba(0, 0, 0, 0.05)'
        }}>
          <button
            onClick={() => setProfileTab('overview')}
            style={{
              padding: '0.45rem 1rem', border: 'none',
              borderRadius: '9999px',
              backgroundColor: profileTab === 'overview' ? '#161245' : 'transparent',
              color: profileTab === 'overview' ? '#ffffff' : '#6b7280',
              fontWeight: 700, fontSize: '0.8125rem', cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            Profile & Role
          </button>

          <button
            onClick={() => setProfileTab('attendance')}
            style={{
              padding: '0.45rem 1rem', border: 'none',
              borderRadius: '9999px',
              backgroundColor: profileTab === 'attendance' ? '#161245' : 'transparent',
              color: profileTab === 'attendance' ? '#ffffff' : '#6b7280',
              fontWeight: 700, fontSize: '0.8125rem', cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            Attendance & Timesheet ({stats.present} Days)
          </button>

          <button
            onClick={() => setProfileTab('shift')}
            style={{
              padding: '0.45rem 1rem', border: 'none',
              borderRadius: '9999px',
              backgroundColor: profileTab === 'shift' ? '#161245' : 'transparent',
              color: profileTab === 'shift' ? '#ffffff' : '#6b7280',
              fontWeight: 700, fontSize: '0.8125rem', cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            Assigned Schedule
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1 }}>

          {/* TAB 1: OVERVIEW */}
          {profileTab === 'overview' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div style={{
                  padding: '1.25rem', borderRadius: '18px', backgroundColor: '#f9fafb',
                  border: '1px solid rgba(0,0,0,0.05)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#6b7280', fontSize: '0.6875rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    <Fingerprint size={15} color="#161245" />
                    <span>BIOMETRIC HARDWARE ID</span>
                  </div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#161245', marginTop: '0.4rem', letterSpacing: '-0.02em' }}>
                    Machine #{employee.displayCode || employee.employee_id}
                  </div>
                  <span style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.2rem', display: 'block' }}>
                    Synced with device at 192.168.1.6
                  </span>
                </div>

                <div style={{
                  padding: '1.25rem', borderRadius: '18px', backgroundColor: '#f9fafb',
                  border: '1px solid rgba(0,0,0,0.05)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#6b7280', fontSize: '0.6875rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    <Building size={15} color="#161245" />
                    <span>DEPARTMENT</span>
                  </div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#161245', marginTop: '0.4rem', letterSpacing: '-0.02em' }}>
                    {employee.department_name || 'Unassigned'}
                  </div>
                  <span style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.2rem', display: 'block' }}>
                    Corporate Unit
                  </span>
                </div>
              </div>

              <div style={{
                padding: '1.25rem', borderRadius: '18px', backgroundColor: '#f9fafb',
                border: '1px solid rgba(0,0,0,0.05)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#6b7280', fontSize: '0.6875rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  <Clock size={15} color="#161245" />
                  <span>ASSIGNED SHIFT TIMINGS</span>
                </div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#161245', marginTop: '0.4rem', letterSpacing: '-0.02em' }}>
                  {employee.shift_name || 'Standard Day Shift'}
                </div>
                <span style={{ fontSize: '0.75rem', color: '#16a34a', marginTop: '0.25rem', display: 'block', fontWeight: 600 }}>
                  Punctuality grace period: 15 minutes
                </span>
              </div>

              <div style={{
                padding: '1.25rem', borderRadius: '18px', backgroundColor: '#f9fafb',
                border: '1px solid rgba(0,0,0,0.05)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#6b7280', fontSize: '0.6875rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  <Briefcase size={15} color="#161245" />
                  <span>SYSTEM METADATA</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '0.75rem', fontSize: '0.8125rem' }}>
                  <div>
                    <span style={{ color: '#6b7280' }}>Database Record ID:</span>
                    <span style={{ fontWeight: 700, color: '#161245', marginLeft: '0.5rem' }}>#{employee.employee_id}</span>
                  </div>
                  <div>
                    <span style={{ color: '#6b7280' }}>Designation:</span>
                    <span style={{ fontWeight: 700, color: '#161245', marginLeft: '0.5rem' }}>{employee.designation || 'Team Member'}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: ATTENDANCE & TIMESHEET */}
          {profileTab === 'attendance' && (
            <div>
              {/* Stat Counters Bento */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem', marginBottom: '1.5rem' }}>
                {/* Present in Electric Lime */}
                <div style={{
                  padding: '1rem 0.75rem', borderRadius: '18px', backgroundColor: '#90d152', textAlign: 'center'
                }}>
                  <span style={{ fontSize: '0.6875rem', color: '#161245', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>PRESENT</span>
                  <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#161245', lineHeight: 1.1, marginTop: '0.2rem' }}>{stats.present}</div>
                </div>

                {/* Absent */}
                <div style={{
                  padding: '1rem 0.75rem', borderRadius: '18px', backgroundColor: '#fee2e2', textAlign: 'center'
                }}>
                  <span style={{ fontSize: '0.6875rem', color: '#b91c1c', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>ABSENT</span>
                  <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#991b1b', lineHeight: 1.1, marginTop: '0.2rem' }}>{stats.absent}</div>
                </div>

                {/* Late Marks */}
                <div style={{
                  padding: '1rem 0.75rem', borderRadius: '18px', backgroundColor: '#fef3c7', textAlign: 'center'
                }}>
                  <span style={{ fontSize: '0.6875rem', color: '#b45309', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>LATE MARKS</span>
                  <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#78350f', lineHeight: 1.1, marginTop: '0.2rem' }}>{stats.late}</div>
                </div>

                {/* Punctuality in Obsidian */}
                <div style={{
                  padding: '1rem 0.75rem', borderRadius: '18px', backgroundColor: '#161245', textAlign: 'center'
                }}>
                  <span style={{ fontSize: '0.6875rem', color: '#94a3b8', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>PUNCTUAL</span>
                  <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#90d152', lineHeight: 1.1, marginTop: '0.2rem' }}>{stats.onTimeRate}%</div>
                </div>
              </div>

              {/* Punch Log List */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <h4 style={{ fontSize: '0.875rem', fontWeight: 800, color: '#161245', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Punch History ({employeeLogs.length} Records)
                </h4>
                <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>Sorted by latest date</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '250px', overflowY: 'auto' }}>
                {employeeLogs.slice(0, 10).map(log => (
                  <div
                    key={log.date}
                    style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '0.75rem 1rem', borderRadius: '14px',
                      backgroundColor: '#f9fafb', border: '1px solid rgba(0,0,0,0.04)', fontSize: '0.8125rem'
                    }}
                  >
                    <div>
                      <span style={{ fontWeight: 700, color: '#161245' }}>{log.date}</span>
                      <span style={{ color: '#6b7280', marginLeft: '0.75rem' }}>
                        In: <strong style={{ color: '#161245' }}>{log.inTime || '--:--'}</strong> • Out: <strong style={{ color: '#161245' }}>{log.outTime || '--:--'}</strong>
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: 600 }}>
                        {log.duration || '--:--'} hrs
                      </span>
                      <span style={{
                        padding: '0.2rem 0.6rem', borderRadius: '9999px', fontSize: '0.7rem', fontWeight: 700,
                        backgroundColor: log.present > 0 ? '#90d152' : '#fee2e2',
                        color: log.present > 0 ? '#161245' : '#b91c1c'
                      }}>
                        {log.present > 0 ? 'Present' : 'Absent'}
                      </span>
                    </div>
                  </div>
                ))}
                {employeeLogs.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8', fontSize: '0.875rem' }}>
                    No punch records found for this period.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: SHIFT & POLICY */}
          {profileTab === 'shift' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ padding: '1.25rem', borderRadius: '18px', backgroundColor: '#f9fafb', border: '1px solid rgba(0,0,0,0.06)' }}>
                <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#161245', letterSpacing: '-0.02em' }}>
                  {employee.shift_name || 'General Shift'}
                </h4>
                <p style={{ margin: '0.35rem 0 0 0', fontSize: '0.8125rem', color: '#6b7280', lineHeight: 1.5, fontWeight: 500 }}>
                  This shift schedule governs in-time verification, overtime threshold, and late-mark calculation for this staff member.
                </p>
              </div>

              <div style={{ backgroundColor: '#f9fafb', padding: '1.25rem', borderRadius: '18px', border: '1px solid rgba(0,0,0,0.06)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.6rem 0', borderBottom: '1px solid rgba(0,0,0,0.05)', fontSize: '0.8125rem' }}>
                  <span style={{ color: '#6b7280' }}>Expected Arrival:</span>
                  <span style={{ fontWeight: 700, color: '#161245' }}>09:30 AM</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.6rem 0', borderBottom: '1px solid rgba(0,0,0,0.05)', fontSize: '0.8125rem' }}>
                  <span style={{ color: '#6b7280' }}>Expected Departure:</span>
                  <span style={{ fontWeight: 700, color: '#161245' }}>06:30 PM</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.6rem 0', borderBottom: '1px solid rgba(0,0,0,0.05)', fontSize: '0.8125rem' }}>
                  <span style={{ color: '#6b7280' }}>Total Required Hours:</span>
                  <span style={{ fontWeight: 700, color: '#161245' }}>9 Hours</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.6rem 0', fontSize: '0.8125rem' }}>
                  <span style={{ color: '#6b7280' }}>Grace Period:</span>
                  <span style={{ fontWeight: 800, color: '#16a34a' }}>15 Minutes</span>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div style={{
          padding: '1rem 1.5rem', borderTop: '1px solid rgba(0, 0, 0, 0.05)',
          display: 'flex', justifyContent: 'flex-end', backgroundColor: '#f9fafb'
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '0.6rem 1.5rem', borderRadius: '9999px', border: 'none',
              backgroundColor: '#161245', color: 'white', fontSize: '0.875rem', fontWeight: 700,
              cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 4px 12px rgba(22, 18, 69, 0.15)'
            }}
            onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#000'; }}
            onMouseOut={(e) => { e.currentTarget.style.backgroundColor = '#161245'; }}
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
}
