'use client';

import React, { useState, useMemo } from 'react';
import { 
  X, User, Building, Clock, Fingerprint, Calendar, 
  CheckCircle2, AlertTriangle, Briefcase, Award, Edit3,
  ShieldCheck, FileText, BarChart2
} from 'lucide-react';

export default function EmployeeProfileModal({
  employee,
  rawData = [],
  shifts = [],
  departments = [],
  onClose,
  onEdit
}) {
  const [profileTab, setProfileTab] = useState('overview'); // 'overview' | 'attendance' | 'shift'

  // Filter attendance logs for this employee
  const employeeLogs = useMemo(() => {
    if (!employee || !rawData || rawData.length === 0) return [];
    return rawData.filter(r => 
      String(r.emp_id) === String(employee.employee_id) || 
      String(r.emp_id) === String(employee.employee_code) ||
      r.name?.toLowerCase() === employee.displayName?.toLowerCase()
    );
  }, [rawData, employee]);

  // Compute attendance stats
  const stats = useMemo(() => {
    let present = 0;
    let absent = 0;
    let late = 0;
    let totalMinutes = 0;

    employeeLogs.forEach(log => {
      if (log.present > 0) present++;
      if (log.absent > 0) absent++;
      if (log.lateBy && log.lateBy !== '0' && log.lateBy !== '00:00') late++;
      if (log.duration) {
        const parts = log.duration.split(':');
        if (parts.length >= 2) {
          const h = parseInt(parts[0], 10) || 0;
          const m = parseInt(parts[1], 10) || 0;
          totalMinutes += (h * 60 + m);
        }
      }
    });

    const totalHours = Math.round(totalMinutes / 60);
    const onTimeRate = present > 0 ? Math.round(((present - late) / present) * 100) : 100;

    return {
      present,
      absent,
      late,
      totalHours,
      onTimeRate: Math.max(0, onTimeRate),
      totalLogs: employeeLogs.length
    };
  }, [employeeLogs]);

  if (!employee) return null;

  const initials = (employee.displayName || 'E')
    .split(' ')
    .map(n => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1100,
      backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.25rem'
    }}>
      <div style={{
        backgroundColor: 'white', borderRadius: '20px', maxWidth: '640px', width: '100%',
        maxHeight: '90vh', display: 'flex', flexDirection: 'column',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', overflow: 'hidden'
      }}>
        
        {/* Header Hero */}
        <div style={{
          backgroundColor: '#0f4c81', background: 'linear-gradient(135deg, #0f4c81 0%, #1e3a8a 100%)',
          padding: '1.75rem 2rem', color: 'white', position: 'relative'
        }}>
          <button
            onClick={onClose}
            style={{
              position: 'absolute', right: '1.25rem', top: '1.25rem',
              backgroundColor: 'rgba(255, 255, 255, 0.2)', border: 'none',
              width: '32px', height: '32px', borderRadius: '50%', color: 'white',
              display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
            }}
          >
            <X size={18} />
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            <div style={{
              width: '64px', height: '64px', borderRadius: '50%',
              backgroundColor: 'white', color: '#0f4c81',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.5rem', fontWeight: 800, boxShadow: '0 4px 10px rgba(0,0,0,0.15)'
            }}>
              {initials}
            </div>

            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <h3 style={{ fontSize: '1.35rem', fontWeight: 700, margin: 0 }}>
                  {employee.displayName}
                </h3>
                <span style={{
                  padding: '0.2rem 0.6rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 600,
                  backgroundColor: employee.is_active ? '#dcfce7' : '#fee2e2',
                  color: employee.is_active ? '#15803d' : '#b91c1c'
                }}>
                  {employee.is_active ? 'Active Staff' : 'Inactive'}
                </span>
              </div>

              <div style={{ fontSize: '0.875rem', color: 'rgba(255, 255, 255, 0.85)', marginTop: '0.25rem' }}>
                {employee.designation || 'Team Member'} • {employee.department_name}
              </div>
            </div>

            <button
              onClick={() => {
                onClose();
                onEdit(employee);
              }}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.375rem',
                backgroundColor: 'rgba(255, 255, 255, 0.15)', border: '1px solid rgba(255, 255, 255, 0.3)',
                padding: '0.5rem 0.875rem', borderRadius: '8px', color: 'white',
                fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer'
              }}
            >
              <Edit3 size={14} />
              <span>Edit</span>
            </button>
          </div>
        </div>

        {/* Tab Switcher */}
        <div style={{
          display: 'flex', borderBottom: '1px solid #e2e8f0',
          padding: '0 1.5rem', backgroundColor: '#f8fafc'
        }}>
          <button
            onClick={() => setProfileTab('overview')}
            style={{
              padding: '0.875rem 1.25rem', border: 'none', background: 'none',
              borderBottom: profileTab === 'overview' ? '2px solid #0f4c81' : '2px solid transparent',
              color: profileTab === 'overview' ? '#0f4c81' : '#64748b',
              fontWeight: profileTab === 'overview' ? 700 : 500, fontSize: '0.875rem', cursor: 'pointer'
            }}
          >
            Profile & Role
          </button>

          <button
            onClick={() => setProfileTab('attendance')}
            style={{
              padding: '0.875rem 1.25rem', border: 'none', background: 'none',
              borderBottom: profileTab === 'attendance' ? '2px solid #0f4c81' : '2px solid transparent',
              color: profileTab === 'attendance' ? '#0f4c81' : '#64748b',
              fontWeight: profileTab === 'attendance' ? 700 : 500, fontSize: '0.875rem', cursor: 'pointer'
            }}
          >
            Attendance & Timesheet ({stats.present} Days)
          </button>

          <button
            onClick={() => setProfileTab('shift')}
            style={{
              padding: '0.875rem 1.25rem', border: 'none', background: 'none',
              borderBottom: profileTab === 'shift' ? '2px solid #0f4c81' : '2px solid transparent',
              color: profileTab === 'shift' ? '#0f4c81' : '#64748b',
              fontWeight: profileTab === 'shift' ? 700 : 500, fontSize: '0.875rem', cursor: 'pointer'
            }}
          >
            Assigned Schedule
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1 }}>

          {/* TAB 1: OVERVIEW */}
          {profileTab === 'overview' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div style={{ padding: '1rem', borderRadius: '12px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#64748b', fontSize: '0.75rem', fontWeight: 600 }}>
                    <Fingerprint size={16} color="#0f4c81" />
                    <span>BIOMETRIC HARDWARE ID</span>
                  </div>
                  <div style={{ fontSize: '1.125rem', fontWeight: 700, color: '#0f172a', marginTop: '0.35rem' }}>
                    Machine #{employee.displayCode}
                  </div>
                  <span style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.2rem', display: 'block' }}>
                    Synced with device at 192.168.1.6
                  </span>
                </div>

                <div style={{ padding: '1rem', borderRadius: '12px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#64748b', fontSize: '0.75rem', fontWeight: 600 }}>
                    <Building size={16} color="#0284c7" />
                    <span>DEPARTMENT</span>
                  </div>
                  <div style={{ fontSize: '1.125rem', fontWeight: 700, color: '#0f172a', marginTop: '0.35rem' }}>
                    {employee.department_name}
                  </div>
                  <span style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.2rem', display: 'block' }}>
                    Corporate Unit
                  </span>
                </div>
              </div>

              <div style={{ padding: '1rem', borderRadius: '12px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#64748b', fontSize: '0.75rem', fontWeight: 600 }}>
                  <Clock size={16} color="#f59e0b" />
                  <span>ASSIGNED SHIFT TIMINGS</span>
                </div>
                <div style={{ fontSize: '1.125rem', fontWeight: 700, color: '#0f172a', marginTop: '0.35rem' }}>
                  {employee.shift_name}
                </div>
                <span style={{ fontSize: '0.75rem', color: '#16a34a', marginTop: '0.2rem', display: 'block' }}>
                  Punctuality grace period: 15 minutes
                </span>
              </div>

              <div style={{ padding: '1rem', borderRadius: '12px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#64748b', fontSize: '0.75rem', fontWeight: 600 }}>
                  <Briefcase size={16} color="#4338ca" />
                  <span>SYSTEM METADATA</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '0.5rem', fontSize: '0.8125rem' }}>
                  <div>
                    <span style={{ color: '#64748b' }}>Database Record ID:</span>
                    <span style={{ fontWeight: 600, color: '#0f172a', marginLeft: '0.5rem' }}>#{employee.employee_id}</span>
                  </div>
                  <div>
                    <span style={{ color: '#64748b' }}>Designation:</span>
                    <span style={{ fontWeight: 600, color: '#0f172a', marginLeft: '0.5rem' }}>{employee.designation || 'Team Member'}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: ATTENDANCE & TIMESHEET */}
          {profileTab === 'attendance' && (
            <div>
              {/* Stat Counters */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem', marginBottom: '1.25rem' }}>
                <div style={{ padding: '0.75rem', borderRadius: '10px', backgroundColor: '#dcfce7', textAlign: 'center' }}>
                  <span style={{ fontSize: '0.75rem', color: '#15803d', fontWeight: 600 }}>PRESENT</span>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#14532d' }}>{stats.present}</div>
                </div>
                <div style={{ padding: '0.75rem', borderRadius: '10px', backgroundColor: '#fee2e2', textAlign: 'center' }}>
                  <span style={{ fontSize: '0.75rem', color: '#b91c1c', fontWeight: 600 }}>ABSENT</span>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#7f1d1d' }}>{stats.absent}</div>
                </div>
                <div style={{ padding: '0.75rem', borderRadius: '10px', backgroundColor: '#fef3c7', textAlign: 'center' }}>
                  <span style={{ fontSize: '0.75rem', color: '#b45309', fontWeight: 600 }}>LATE MARKS</span>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#78350f' }}>{stats.late}</div>
                </div>
                <div style={{ padding: '0.75rem', borderRadius: '10px', backgroundColor: '#e0e7ff', textAlign: 'center' }}>
                  <span style={{ fontSize: '0.75rem', color: '#4338ca', fontWeight: 600 }}>PUNCTUALITY</span>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#312e81' }}>{stats.onTimeRate}%</div>
                </div>
              </div>

              {/* Punch Log List */}
              <h4 style={{ fontSize: '0.875rem', fontWeight: 700, color: '#0f172a', margin: '0 0 0.75rem 0' }}>
                Recent Punch History ({employeeLogs.length} Records)
              </h4>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '240px', overflowY: 'auto' }}>
                {employeeLogs.slice(0, 8).map(log => (
                  <div
                    key={log.date}
                    style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '0.625rem 0.875rem', borderRadius: '8px',
                      backgroundColor: '#f8fafc', border: '1px solid #f1f5f9', fontSize: '0.8125rem'
                    }}
                  >
                    <div>
                      <span style={{ fontWeight: 600, color: '#0f172a' }}>{log.date}</span>
                      <span style={{ color: '#64748b', marginLeft: '0.75rem' }}>
                        In: <strong>{log.inTime || '--:--'}</strong> • Out: <strong>{log.outTime || '--:--'}</strong>
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontSize: '0.75rem', color: '#0369a1', fontWeight: 500 }}>
                        {log.duration || '--:--'} hrs
                      </span>
                      <span style={{
                        padding: '0.15rem 0.5rem', borderRadius: '10px', fontSize: '0.7rem', fontWeight: 600,
                        backgroundColor: log.present > 0 ? '#dcfce7' : '#fee2e2',
                        color: log.present > 0 ? '#15803d' : '#b91c1c'
                      }}>
                        {log.present > 0 ? 'Present' : 'Absent'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: SHIFT & POLICY */}
          {profileTab === 'shift' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ padding: '1.25rem', borderRadius: '12px', backgroundColor: '#f0f9ff', border: '1px solid #bae6fd' }}>
                <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#0369a1' }}>
                  {employee.shift_name}
                </h4>
                <p style={{ margin: '0.35rem 0 0 0', fontSize: '0.8125rem', color: '#0284c7', lineHeight: 1.5 }}>
                  This shift schedule governs in-time verification, overtime threshold, and late-mark calculation for this staff member.
                </p>
              </div>

              <div style={{ backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid #e2e8f0', fontSize: '0.8125rem' }}>
                  <span style={{ color: '#64748b' }}>Expected Arrival:</span>
                  <span style={{ fontWeight: 600, color: '#0f172a' }}>09:30 AM</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid #e2e8f0', fontSize: '0.8125rem' }}>
                  <span style={{ color: '#64748b' }}>Expected Departure:</span>
                  <span style={{ fontWeight: 600, color: '#0f172a' }}>06:30 PM</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid #e2e8f0', fontSize: '0.8125rem' }}>
                  <span style={{ color: '#64748b' }}>Total Required Hours:</span>
                  <span style={{ fontWeight: 600, color: '#0f172a' }}>9 Hours</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', fontSize: '0.8125rem' }}>
                  <span style={{ color: '#64748b' }}>Grace Period:</span>
                  <span style={{ fontWeight: 600, color: '#16a34a' }}>15 Minutes</span>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div style={{
          padding: '1rem 1.5rem', borderTop: '1px solid #e2e8f0',
          display: 'flex', justifyContent: 'flex-end', backgroundColor: '#f8fafc'
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '0.625rem 1.5rem', borderRadius: '8px', border: '1px solid #d1d5db',
              backgroundColor: 'white', color: '#374151', fontSize: '0.875rem', fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
}
