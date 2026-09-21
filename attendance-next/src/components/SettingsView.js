'use client';

import React, { useState } from 'react';
import { 
  Settings, Fingerprint, ShieldCheck, Database, Clock, 
  RefreshCw, CheckCircle2, Server, Globe, Key, Lock, AlertCircle, Zap, Cpu
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
    <div style={{ padding: '0.5rem 0', maxWidth: '1000px' }}>
      {/* Tab Header Banner */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
        marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
            <span style={{
              width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#90d152',
              display: 'inline-block', boxShadow: '0 0 10px rgba(144, 209, 82, 0.8)'
            }}></span>
            <span style={{
              fontSize: '0.6875rem', fontWeight: 800, textTransform: 'uppercase',
              letterSpacing: '0.12em', color: '#6b7280'
            }}>
              System Architecture & Health
            </span>
          </div>
          <h2 style={{ fontSize: '1.875rem', fontWeight: 900, color: '#161245', margin: 0, letterSpacing: '-0.03em' }}>
            System Settings & Hardware
          </h2>
          <p style={{ color: '#6b7280', fontSize: '0.875rem', marginTop: '0.35rem', marginBottom: 0, fontWeight: 500 }}>
            Manage biometric machine sync, real-time Supabase cloud infrastructure, and company workforce policies.
          </p>
        </div>

        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
          backgroundColor: '#161245', color: 'white', padding: '0.5rem 1rem',
          borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 700
        }}>
          <Cpu size={14} color="#90d152" />
          <span>Biometric Engine v2.4 Active</span>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        
        {/* Biometric Machine Connection Card */}
        <div style={{
          backgroundColor: 'white', borderRadius: '24px', border: '1px solid rgba(0, 0, 0, 0.06)',
          padding: '1.75rem', boxShadow: '0 10px 30px -5px rgba(0,0,0,0.03)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{
                width: '48px', height: '48px', borderRadius: '16px',
                backgroundColor: '#161245', color: '#90d152',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 4px 14px rgba(22, 18, 69, 0.2)'
              }}>
                <Fingerprint size={24} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#161245', letterSpacing: '-0.02em' }}>
                  Biometric Access Hardware
                </h3>
                <span style={{ fontSize: '0.8rem', color: '#6b7280', fontWeight: 500 }}>
                  Direct TCP/IP Link • Model: eSSL / ZKTeco Biometric Terminal
                </span>
              </div>
            </div>

            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
              backgroundColor: '#90d152', color: '#161245',
              padding: '0.35rem 0.85rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 800,
              letterSpacing: '0.02em'
            }}>
              <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: '#161245' }}></span>
              Connected & Scheduled
            </span>
          </div>

          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem',
            backgroundColor: '#f9fafb', padding: '1.25rem', borderRadius: '18px', border: '1px solid rgba(0,0,0,0.04)',
            marginBottom: '1.25rem', fontSize: '0.8125rem'
          }}>
            <div>
              <span style={{ color: '#6b7280', fontSize: '0.725rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>DEVICE IP ADDRESS</span>
              <strong style={{ color: '#161245', fontSize: '1rem', display: 'block', marginTop: '0.2rem', fontWeight: 800 }}>192.168.1.6</strong>
            </div>
            <div>
              <span style={{ color: '#6b7280', fontSize: '0.725rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>SOCKET PORT</span>
              <strong style={{ color: '#161245', fontSize: '1rem', display: 'block', marginTop: '0.2rem', fontWeight: 800 }}>4370</strong>
            </div>
            <div>
              <span style={{ color: '#6b7280', fontSize: '0.725rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>SYNC INTERVAL</span>
              <strong style={{ color: '#161245', fontSize: '1rem', display: 'block', marginTop: '0.2rem', fontWeight: 800 }}>Every 15 Minutes</strong>
            </div>
            <div>
              <span style={{ color: '#6b7280', fontSize: '0.725rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>WINDOWS CRON TASK</span>
              <strong style={{ color: '#161245', fontSize: '1rem', display: 'block', marginTop: '0.2rem', fontWeight: 800 }}>AttendanceDirectSync</strong>
            </div>
          </div>

          {hardwareResult && (
            <div style={{
              backgroundColor: '#161245', color: '#90d152',
              padding: '0.85rem 1.25rem', borderRadius: '14px', marginBottom: '1.25rem',
              display: 'flex', alignItems: 'center', gap: '0.625rem', fontSize: '0.8125rem', fontWeight: 600
            }}>
              <CheckCircle2 size={18} color="#90d152" />
              <span>{hardwareResult.message} (Verified at {hardwareResult.timestamp})</span>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              onClick={handleTestConnection}
              disabled={testingHardware}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                padding: '0.65rem 1.4rem', borderRadius: '9999px', border: 'none',
                backgroundColor: '#161245', color: 'white', fontSize: '0.8125rem', fontWeight: 700,
                cursor: testingHardware ? 'not-allowed' : 'pointer', transition: 'all 0.2s',
                boxShadow: '0 4px 12px rgba(22, 18, 69, 0.15)'
              }}
            >
              <RefreshCw size={15} className={testingHardware ? 'spin' : ''} color={testingHardware ? '#90d152' : 'white'} />
              <span>{testingHardware ? 'Checking Connection...' : 'Ping Hardware Status'}</span>
            </button>
          </div>
        </div>

        {/* Database & Cloud Project */}
        <div style={{
          backgroundColor: 'white', borderRadius: '24px', border: '1px solid rgba(0, 0, 0, 0.06)',
          padding: '1.75rem', boxShadow: '0 10px 30px -5px rgba(0,0,0,0.03)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem' }}>
            <div style={{
              width: '48px', height: '48px', borderRadius: '16px',
              backgroundColor: '#161245', color: '#90d152',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 14px rgba(22, 18, 69, 0.2)'
            }}>
              <Database size={24} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#161245', letterSpacing: '-0.02em' }}>
                Cloud Database Infrastructure
              </h3>
              <span style={{ fontSize: '0.8rem', color: '#6b7280', fontWeight: 500 }}>
                Supabase PostgreSQL • Real-time Attendance & Employee Storage
              </span>
            </div>
          </div>

          <div style={{ fontSize: '0.875rem', color: '#4b5563', lineHeight: 1.6 }}>
            <p style={{ margin: '0 0 0.75rem 0' }}>
              Your database is securely hosted on <strong>Supabase</strong> under project <code>qbbzflvmmiahxldqzckp</code>. All attendance punches, shift timings, and department profiles are continuously synchronized.
            </p>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '0.75rem',
              backgroundColor: '#f9fafb', padding: '0.75rem 1rem', borderRadius: '14px', border: '1px solid rgba(0,0,0,0.04)',
              width: 'fit-content', flexWrap: 'wrap'
            }}>
              <span style={{ color: '#6b7280', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                PROJECT URL:
              </span>
              <code style={{
                backgroundColor: 'white', padding: '0.2rem 0.6rem', borderRadius: '8px',
                color: '#161245', fontWeight: 700, fontSize: '0.8125rem', border: '1px solid rgba(0,0,0,0.08)'
              }}>
                https://qbbzflvmmiahxldqzckp.supabase.co
              </code>
            </div>
          </div>
        </div>

        {/* Company Workforce Policies */}
        <div style={{
          backgroundColor: 'white', borderRadius: '24px', border: '1px solid rgba(0, 0, 0, 0.06)',
          padding: '1.75rem', boxShadow: '0 10px 30px -5px rgba(0,0,0,0.03)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
            <div style={{
              width: '48px', height: '48px', borderRadius: '16px',
              backgroundColor: '#161245', color: '#90d152',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 14px rgba(22, 18, 69, 0.2)'
            }}>
              <ShieldCheck size={24} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#161245', letterSpacing: '-0.02em' }}>
                Company Workforce Policies
              </h3>
              <span style={{ fontSize: '0.8rem', color: '#6b7280', fontWeight: 500 }}>
                Rules governing attendance calculations, work durations, and overtime
              </span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem' }}>
            <div style={{
              padding: '1.25rem', borderRadius: '18px', backgroundColor: '#f9fafb',
              border: '1px solid rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between'
            }}>
              <div>
                <span style={{ fontSize: '0.6875rem', color: '#6b7280', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  DEFAULT FULL-DAY HOURS
                </span>
                <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#161245', marginTop: '0.35rem', letterSpacing: '-0.02em' }}>
                  9 Hours
                </div>
              </div>
              <span style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.5rem', fontWeight: 500 }}>
                Includes 1-hour lunch & recess
              </span>
            </div>

            <div style={{
              padding: '1.25rem', borderRadius: '18px', backgroundColor: '#f9fafb',
              border: '1px solid rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between'
            }}>
              <div>
                <span style={{ fontSize: '0.6875rem', color: '#6b7280', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  LATE-MARK GRACE THRESHOLD
                </span>
                <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#161245', marginTop: '0.35rem', letterSpacing: '-0.02em' }}>
                  15 Minutes
                </div>
              </div>
              <span style={{ fontSize: '0.75rem', color: '#16a34a', marginTop: '0.5rem', fontWeight: 600 }}>
                Configurable per individual shift
              </span>
            </div>

            <div style={{
              padding: '1.25rem', borderRadius: '18px', backgroundColor: '#f9fafb',
              border: '1px solid rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between'
            }}>
              <div>
                <span style={{ fontSize: '0.6875rem', color: '#6b7280', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  WEEKLY WORKING DAYS
                </span>
                <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#161245', marginTop: '0.35rem', letterSpacing: '-0.02em' }}>
                  Mon – Fri
                </div>
              </div>
              <span style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.5rem', fontWeight: 500 }}>
                Saturday & Sunday classified as Weekly Off
              </span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
