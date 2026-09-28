import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Info, Plus, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';

const CalendarView = ({ events = [], title = "Company Calendar", subtitle = "View and manage schedules and holidays" }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showAddModal, setShowAddModal] = useState(false);
  const [holidayName, setHolidayName] = useState('');
  const [holidayDate, setHolidayDate] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddHoliday = async (e) => {
    e.preventDefault();
    if (!holidayName.trim() || !holidayDate) {
      setErrorMsg('Name and date are required.');
      return;
    }
    
    setIsSubmitting(true);
    setErrorMsg('');
    const { error } = await supabase.from('holidays').insert([{ name: holidayName.trim(), date: holidayDate }]);
    
    setIsSubmitting(false);
    if (!error) {
      setShowAddModal(false);
      setHolidayName('');
      setHolidayDate('');
      window.dispatchEvent(new Event('inxl_data_updated'));
    } else {
      setErrorMsg('Failed to add holiday.');
    }
  };

  const daysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const days = daysInMonth(year, month);
  const firstDay = firstDayOfMonth(year, month);

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  // Helper to format date as YYYY-MM-DD for easy comparison
  const formatDateString = (y, m, d) => {
    return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  };

  const renderDays = () => {
    let grid = [];
    
    // Empty cells before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      grid.push(<div key={`empty-${i}`} className="calendar-day empty"></div>);
    }

    // Days of the month
    for (let d = 1; d <= days; d++) {
      const dateString = formatDateString(year, month, d);
      const isToday = formatDateString(new Date().getFullYear(), new Date().getMonth(), new Date().getDate()) === dateString;
      
      const dayOfWeek = (firstDay + d - 1) % 7;
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

      // Check for events on this day
      const dayEvents = events.filter(e => e.date === dateString);
      const isHoliday = dayEvents.some(e => e.type === 'holiday');

      grid.push(
        <div 
          key={d} 
          className={`calendar-day ${isToday ? 'today' : ''} ${isHoliday ? 'holiday' : ''} ${isWeekend && !isHoliday ? 'weekend' : ''} ${dayEvents.length > 0 ? 'has-events' : ''}`}
        >
          <div className="day-number">{d}</div>
          <div className="day-events">
            {dayEvents.map((ev, idx) => (
              <div key={idx} className={`event-badge ${ev.type || 'standard'}`}>
                {ev.name}
              </div>
            ))}
          </div>
        </div>
      );
    }

    // Fill remaining cells to complete the grid (optional, but keeps consistent height)
    const totalCells = firstDay + days;
    const remainingCells = (7 - (totalCells % 7)) % 7;
    for (let i = 0; i < remainingCells; i++) {
      grid.push(<div key={`empty-end-${i}`} className="calendar-day empty"></div>);
    }

    return grid;
  };

  return (
    <div className="calendar-container bento-card" style={{ padding: '2rem', height: '100%', minHeight: '600px', display: 'flex', flexDirection: 'column' }}>
      <div className="calendar-header-section" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div className="calendar-title-area" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div className="calendar-icon-wrapper" style={{ width: '48px', height: '48px', borderRadius: '14px', backgroundColor: '#161245', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CalendarIcon size={24} color="#90d152" />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, color: '#161245', letterSpacing: '-0.02em' }}>{title}</h2>
            <p style={{ margin: 0, color: '#64748b', fontSize: '0.85rem' }}>{subtitle}</p>
          </div>
          <button 
            onClick={() => setShowAddModal(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginLeft: '1.5rem', padding: '0.65rem 1.25rem', borderRadius: '9999px', border: 'none', backgroundColor: '#161245', color: 'white', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', boxShadow: '0 4px 12px rgba(22, 18, 69, 0.15)' }}
          >
            <Plus size={16} /> Add Holiday
          </button>
        </div>
        
        <div className="calendar-controls" style={{ display: 'flex', alignItems: 'center', gap: '1rem', backgroundColor: '#f1f5f9', padding: '0.5rem', borderRadius: '9999px' }}>
          <button onClick={prevMonth} className="nav-btn" style={{ background: 'white', border: 'none', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', color: '#161245' }}>
            <ChevronLeft size={18} />
          </button>
          <h3 className="current-month-year" style={{ margin: 0, minWidth: '130px', textAlign: 'center', fontWeight: 700, color: '#161245' }}>
            {monthNames[month]} {year}
          </h3>
          <button onClick={nextMonth} className="nav-btn" style={{ background: 'white', border: 'none', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', color: '#161245' }}>
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      <div className="calendar-grid-wrapper" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div className="calendar-weekdays" style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.5rem', marginBottom: '0.5rem' }}>
          {dayNames.map(day => (
            <div key={day} className="weekday" style={{ textAlign: 'center', fontWeight: 700, fontSize: '0.8rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {day}
            </div>
          ))}
        </div>
        
        <div className="calendar-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.5rem', flex: 1 }}>
          {renderDays()}
        </div>
      </div>
      
      <div className="calendar-legend" style={{ display: 'flex', gap: '1.5rem', marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--card-border)' }}>
        <div className="legend-item" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', fontWeight: 600, color: '#64748b' }}>
          <span className="legend-color holiday" style={{ width: '12px', height: '12px', borderRadius: '4px', backgroundColor: '#ef4444' }}></span>
          <span>Company Holiday</span>
        </div>
        <div className="legend-item" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', fontWeight: 600, color: '#64748b' }}>
          <span className="legend-color standard" style={{ width: '12px', height: '12px', borderRadius: '4px', backgroundColor: '#3b82f6' }}></span>
          <span>Standard Event</span>
        </div>
      </div>

      {showAddModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: '100%', maxWidth: '440px', backgroundColor: 'white', borderRadius: '24px', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>
            <div style={{ padding: '1.25rem 1.5rem', backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#161245', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <CalendarIcon size={20} color="#90d152" /> Add Custom Holiday
              </h2>
              <button onClick={() => setShowAddModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: '0.25rem' }}>
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleAddHoliday} style={{ padding: '1.5rem' }}>
              {errorMsg && <div style={{ backgroundColor: '#fef2f2', color: '#991b1b', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.8125rem' }}>{errorMsg}</div>}
              
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: '#334155', marginBottom: '0.5rem' }}>Holiday Name</label>
                <input type="text" required value={holidayName} onChange={(e) => setHolidayName(e.target.value)} placeholder="e.g. Local Election Day" style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '12px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.875rem' }} />
              </div>
              
              <div style={{ marginBottom: '1.75rem' }}>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: '#334155', marginBottom: '0.5rem' }}>Date</label>
                <input type="date" required value={holidayDate} onChange={(e) => setHolidayDate(e.target.value)} style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '12px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.875rem' }} />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowAddModal(false)} style={{ padding: '0.6rem 1.25rem', borderRadius: '9999px', border: '1px solid #cbd5e1', backgroundColor: 'white', color: '#475569', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" disabled={isSubmitting} style={{ padding: '0.6rem 1.25rem', borderRadius: '9999px', border: 'none', backgroundColor: '#161245', color: 'white', fontWeight: 700, fontSize: '0.875rem', cursor: isSubmitting ? 'not-allowed' : 'pointer', boxShadow: '0 4px 12px rgba(22, 18, 69, 0.15)', opacity: isSubmitting ? 0.7 : 1 }}>{isSubmitting ? 'Saving...' : 'Save Holiday'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CalendarView;
