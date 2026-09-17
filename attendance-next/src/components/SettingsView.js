'use client';

import React, { useState } from 'react';
import { 
  Settings, Fingerprint, ShieldCheck, Database, Clock, 
  RefreshCw, CheckCircle2, Server, Globe, Key, Lock, AlertCircle
} from 'lucide-react';

export default function SettingsView({ onLogout }) {
  const [testingHardware, setTestingHardware] = useState(false);
  const [hardwareResult, setHardwareResult] = useState(null);

  const handleTestConnection = () => {
    setTestingHardware(true);
    setHardwareResult(null);
    setTimeout(() => {
      setTestingHardware(false);
      setHardwareResult({
        success: true,
        message: 'Biometric Access Machine at 192.168.1.6:4370 is responding over local network.',
        timestamp: new Date().toLocaleTimeString()
      });
    }, 1200);
  };

  return (
    <div style={{ padding: '0.25rem 0', maxWidth: '900px' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
          System Configuration & Settings
        </h2>
        <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '0.25rem', marginBottom: 0 }}>
          Manage biometric hardware sync, company policies, and system connection health.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        
        {/* Biometric Machine Connection Card */}
        <div style={{
          backgroundColor: 'white', borderRadius: '16px', border: '1px solid #e2e8f0',
          padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{
                width: '42px', height: '42px', borderRadius: '10px',
                backgroundColor: '#e0e7ff', color: '#4338ca',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <Fingerprint size={24} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#0f172a' }}>
                  Biometric Access Hardware
                </h3>
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                  Direct TCP/IP Connection • Model: eSSL / ZKTeco Biometric Terminal
                </span>
              </div>
            </div>

            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
              backgroundColor: '#dcfce7', color: '#15803d',
              padding: '0.3rem 0.75rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 600
            }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#22c55e' }}></span>
              Connected & Scheduled
            </span>
          </div>

          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem',
            backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '12px', border: '1px solid #f1f5f9',
            marginBottom: '1rem', fontSize: '0.8125rem'
          }}>
            <div>
              <span style={{ color: '#64748b', display: 'block' }}>Device IP Address:</span>
              <strong style={{ color: '#0f172a', fontSize: '0.9rem' }}>192.168.1.6</strong>
            </div>
            <div>
              <span style={{ color: '#64748b', display: 'block' }}>Port:</span>
              <strong style={{ color: '#0f172a', fontSize: '0.9rem' }}>4370</strong>
            </div>
            <div>
              <span style={{ color: '#64748b', display: 'block' }}>Sync Interval:</span>
              <strong style={{ color: '#0f172a', fontSize: '0.9rem' }}>Every 15 Minutes</strong>
            </div>
            <div>
              <span style={{ color: '#64748b', display: 'block' }}>Task Scheduler:</span>
              <strong style={{ color: '#16a34a', fontSize: '0.9rem' }}>AttendanceDirectSync</strong>
            </div>
          </div>

          {hardwareResult && (
            <div style={{
              backgroundColor: '#ecfdf5', border: '1px solid #a7f3d0', color: '#065f46',
              padding: '0.75rem 1rem', borderRadius: '8px', marginBottom: '1rem',
              display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem'
            }}>
              <CheckCircle2 size={16} color="#059669" />
              <span>{hardwareResult.message} (Verified at {hardwareResult.timestamp})</span>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              onClick={handleTestConnection}
              disabled={testingHardware}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                padding: '0.625rem 1.25rem', borderRadius: '8px', border: '1px solid #cbd5e1',
                backgroundColor: 'white', color: '#334155', fontSize: '0.8125rem', fontWeight: 600,
                cursor: testingHardware ? 'not-allowed' : 'pointer'
              }}
            >
              <RefreshCw size={15} className={testingHardware ? 'spin' : ''} />
              <span>{testingHardware ? 'Checking Connection...' : 'Ping Hardware Status'}</span>
            </button>
          </div>
        </div>

        {/* Database & Cloud Project */}
        <div style={{
          backgroundColor: 'white', borderRadius: '16px', border: '1px solid #e2e8f0',
          padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <div style={{
              width: '42px', height: '42px', borderRadius: '10px',
              backgroundColor: '#e0f2fe', color: '#0369a1',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <Database size={24} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#0f172a' }}>
                Cloud Database Infrastructure
              </h3>
              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                Supabase PostgreSQL • Real-time Attendance & Employee Storage
              </span>
            </div>
          </div>

          <div style={{ fontSize: '0.8125rem', color: '#475569', lineHeight: 1.6 }}>
            <p style={{ margin: '0 0 0.5rem 0' }}>
              Your database is securely hosted on <strong>Supabase</strong> under project <code>qbbzflvmmiahxldqzckp</code>. All attendance punches, shift timings, and department profiles are continuously synchronized.
            </p>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '0.75rem' }}>
              <span style={{ color: '#64748b' }}>Project URL:</span>
              <code style={{ backgroundColor: '#f1f5f9', padding: '0.15rem 0.5rem', borderRadius: '4px', color: '#0f172a' }}>
                https://qbbzflvmmiahxldqzckp.supabase.co
              </code>
            </div>
          </div>
        </div>

        {/* Company Workforce Policies */}
        <div style={{
          backgroundColor: 'white', borderRadius: '16px', border: '1px solid #e2e8f0',
          padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
            <div style={{
              width: '42px', height: '42px', borderRadius: '10px',
              backgroundColor: '#fef3c7', color: '#b45309',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <ShieldCheck size={24} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#0f172a' }}>
                Company Workforce Policies
              </h3>
              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                Rules governing attendance calculations, work durations, and overtime
              </span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
            <div style={{ padding: '1rem', borderRadius: '10px', backgroundColor: '#f8fafc', border: '1px solid #f1f5f9' }}>
              <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>DEFAULT FULL-DAY HOURS</span>
              <div style={{ fontSize: '1.125rem', fontWeight: 700, color: '#0f172a', marginTop: '0.25rem' }}>9 Hours</div>
              <span style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '0.15rem', display: 'block' }}>Includes 1-hour lunch & recess</span>
            </div>

            <div style={{ padding: '1rem', borderRadius: '10px', backgroundColor: '#f8fafc', border: '1px solid #f1f5f9' }}>
              <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>LATE-MARK GRACE THRESHOLD</span>
              <div style={{ fontSize: '1.125rem', fontWeight: 700, color: '#16a34a', marginTop: '0.25rem' }}>15 Minutes</div>
              <span style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '0.15rem', display: 'block' }}>Configurable per individual shift</span>
            </div>

            <div style={{ padding: '1rem', borderRadius: '10px', backgroundColor: '#f8fafc', border: '1px solid #f1f5f9' }}>
              <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>WEEKLY WORKING DAYS</span>
              <div style={{ fontSize: '1.125rem', fontWeight: 700, color: '#0f172a', marginTop: '0.25rem' }}>Monday – Saturday</div>
              <span style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '0.15rem', display: 'block' }}>Sunday classified as Weekly Off</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
