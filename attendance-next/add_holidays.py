import sys

file_path = '/Users/Timothy/Documents/dev/Inxl Digital/attendance system/attendance-next/src/components/EmployeeManagement.js'
with open(file_path, 'r') as f:
    content = f.read()

# 1. Imports
content = content.replace("Clock, Building, X, RefreshCw,", "Clock, Building, X, RefreshCw, Calendar,")

# 2. State
state_old = "const [shifts, setShifts] = useState(INITIAL_SHIFTS);"
state_new = "const [shifts, setShifts] = useState(INITIAL_SHIFTS);\n  const [customHolidays, setCustomHolidays] = useState([]);\n  const [formHolidayName, setFormHolidayName] = useState('');\n  const [formHolidayDate, setFormHolidayDate] = useState('');"
content = content.replace(state_old, state_new)

# 3. Fetch
fetch_old = "const fetchShifts = async () => {"
fetch_new = '''  const fetchHolidays = async () => {
    try {
      const { data, error } = await supabase.from('holidays').select('*').order('date', { ascending: true });
      if (!error && data) setCustomHolidays(data);
    } catch (err) { console.error(err); }
  };

  const fetchShifts = async () => {'''
content = content.replace(fetch_old, fetch_new)

effect_old = '''    fetchShifts();
    fetchDepartments();
    
    const handleDataEvent = () => fetchShifts();'''
effect_new = '''    fetchShifts();
    fetchDepartments();
    fetchHolidays();
    
    const handleDataEvent = () => { fetchShifts(); fetchHolidays(); };'''
content = content.replace(effect_old, effect_new)

# 4. Handlers
handlers_old = "const handleOpenAddShift = () => {"
handlers_new = '''  const handleOpenAddHoliday = () => {
    setFormHolidayName('');
    setFormHolidayDate('');
    setModalMode('add_holiday');
  };

  const handleOpenEditHoliday = (holiday) => {
    setActiveItem(holiday);
    setFormHolidayName(holiday.name);
    setFormHolidayDate(holiday.date);
    setModalMode('edit_holiday');
  };

  const handleSaveHoliday = async (e) => {
    e.preventDefault();
    if (!formHolidayName.trim() || !formHolidayDate.trim()) { setErrorMsg('Name and Date are required.'); return; }
    
    if (modalMode === 'add_holiday') {
      const { error } = await supabase.from('holidays').insert([{ name: formHolidayName.trim(), date: formHolidayDate }]);
      if (!error) {
        await fetchHolidays();
        window.dispatchEvent(new Event('inxl_data_updated'));
        setSuccessMsg(`Holiday created!`);
        setTimeout(() => setSuccessMsg(''), 4000);
        setModalMode(null);
      } else { setErrorMsg('Failed to save holiday.'); }
    } else {
      const { error } = await supabase.from('holidays').update({ name: formHolidayName.trim(), date: formHolidayDate }).eq('id', activeItem.id);
      if (!error) {
        await fetchHolidays();
        window.dispatchEvent(new Event('inxl_data_updated'));
        setSuccessMsg(`Holiday updated!`);
        setTimeout(() => setSuccessMsg(''), 4000);
        setModalMode(null);
      } else { setErrorMsg('Failed to update holiday.'); }
    }
  };

  const handleDeleteHoliday = async () => {
    if (!activeItem) return;
    const { error } = await supabase.from('holidays').delete().eq('id', activeItem.id);
    if (!error) {
      await fetchHolidays();
      window.dispatchEvent(new Event('inxl_data_updated'));
      setSuccessMsg(`Holiday removed.`);
      setTimeout(() => setSuccessMsg(''), 4000);
      setModalMode(null);
    }
  };

  const handleOpenAddShift = () => {'''
content = content.replace(handlers_old, handlers_new)

# 5. UI Header Title
header_old = "activeSubTab === 'departments' ? 'Department Organization' : 'Shift Schedules & Policies'"
header_new = "activeSubTab === 'departments' ? 'Department Organization' : activeSubTab === 'shifts' ? 'Shift Schedules & Policies' : 'Company Holidays'"
content = content.replace(header_old, header_new)

desc_old = "? 'Directory of active personnel, live duty status, and employee profiles.'\n              : 'Manage staff profiles, department structures, and shift timings.'"
desc_new = "? 'Directory of active personnel, live duty status, and employee profiles.'\n              : activeSubTab === 'holidays' ? 'Manage public and company-specific holidays.' : 'Manage staff profiles, department structures, and shift timings.'"
content = content.replace(desc_old, desc_new)

# 6. Add Button
add_btn_old = "          {activeSubTab === 'shifts' && ("
add_btn_new = '''          {activeSubTab === 'holidays' && (
            <button
              onClick={handleOpenAddHoliday}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                padding: '0.65rem 1.35rem', borderRadius: '9999px', border: 'none',
                backgroundColor: '#161245', color: 'white', fontSize: '0.875rem', fontWeight: 700,
                cursor: 'pointer', boxShadow: '0 4px 14px rgba(22,18,69,0.2)'
              }}
            >
              <Plus size={16} />
              <span>Add Holiday</span>
            </button>
          )}
          {activeSubTab === 'shifts' && ('''
content = content.replace(add_btn_old, add_btn_new)

# 7. Tabs
tabs_old = "          <Clock size={16} />\n          <span>Shifts & Timings ({shifts.length})</span>\n        </button>"
tabs_new = '''          <Clock size={16} />
          <span>Shifts & Timings ({shifts.length})</span>
        </button>
        <button
          onClick={() => setActiveSubTab('holidays')}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            padding: '0.6rem 1.25rem', borderRadius: '9999px',
            border: activeSubTab === 'holidays' ? 'none' : '1px solid rgba(0,0,0,0.08)',
            backgroundColor: activeSubTab === 'holidays' ? '#161245' : 'white',
            color: activeSubTab === 'holidays' ? '#ffffff' : '#64748b',
            fontWeight: activeSubTab === 'holidays' ? 700 : 500,
            cursor: 'pointer', fontSize: '0.875rem', transition: 'all 0.15s',
            boxShadow: activeSubTab === 'holidays' ? '0 4px 12px rgba(22,18,69,0.15)' : 'none'
          }}
        >
          <Calendar size={16} />
          <span>Holidays ({customHolidays.length})</span>
        </button>'''
content = content.replace(tabs_old, tabs_new)

# 8. Render Holidays List (Right before the Add Shift Modal)
modals_start_old = "{/* ======================================================== */}\n      {/* MODALS */}"
modals_start_new = '''{/* ======================================================== */}
      {/* TAB 4: HOLIDAYS */}
      {/* ======================================================== */}
      {activeSubTab === 'holidays' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.25rem' }}>
            {customHolidays.map((holiday) => (
              <div
                key={holiday.id}
                style={{
                  backgroundColor: 'white', borderRadius: '20px', border: '1px solid rgba(0, 0, 0, 0.06)',
                  padding: '1.5rem', boxShadow: '0 10px 30px -5px rgba(0,0,0,0.03)',
                  display: 'flex', flexDirection: 'column', justifyContent: 'space-between'
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                      <div style={{
                        width: '40px', height: '40px', borderRadius: '12px',
                        backgroundColor: '#161245', color: '#90d152',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                      }}>
                        <Calendar size={20} />
                      </div>
                      <div>
                        <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#161245', letterSpacing: '-0.02em' }}>
                          {holiday.name}
                        </h4>
                        <span style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: 600 }}>
                          {holiday.date}
                        </span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.35rem' }}>
                      <button onClick={() => handleOpenEditHoliday(holiday)} style={{ border: '1px solid #e2e8f0', background: 'white', borderRadius: '8px', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b' }}>
                        <Edit3 size={14} />
                      </button>
                      <button onClick={() => { setActiveItem(holiday); setModalMode('delete_holiday'); }} style={{ border: '1px solid #fee2e2', background: '#fef2f2', borderRadius: '8px', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#ef4444' }}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {customHolidays.length === 0 && (
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3rem 1rem', color: '#64748b', backgroundColor: '#f8fafc', borderRadius: '20px', border: '1px dashed #cbd5e1' }}>
                <Calendar size={48} color="#cbd5e1" style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
                <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.15rem', fontWeight: 700, color: '#334155' }}>No Custom Holidays</h3>
                <p style={{ margin: 0, fontSize: '0.9rem' }}>Add holidays to ensure they show up on the company calendar.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODALS */}'''
content = content.replace(modals_start_old, modals_start_new)


# 9. Holiday Modal Rendering
modal_render_old = "{modalMode === 'add_shift' || modalMode === 'edit_shift' ? ("
modal_render_new = '''{(modalMode === 'add_holiday' || modalMode === 'edit_holiday') ? (
          <div style={{ width: '100%', maxWidth: '440px', backgroundColor: 'white', borderRadius: '24px', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', border: '1px solid rgba(0,0,0,0.05)', position: 'relative' }}>
            <div style={{ padding: '1.25rem 1.5rem', backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#161245', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Calendar size={20} color="#90d152" />
                {modalMode === 'add_holiday' ? 'Add Holiday' : 'Edit Holiday'}
              </h2>
              <button onClick={() => setModalMode(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: '0.25rem' }}>
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSaveHoliday} style={{ padding: '1.5rem' }}>
              {errorMsg && <div style={{ backgroundColor: '#fef2f2', color: '#991b1b', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.8125rem' }}>{errorMsg}</div>}
              
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: '#334155', marginBottom: '0.5rem' }}>Holiday Name</label>
                <input type="text" required value={formHolidayName} onChange={(e) => setFormHolidayName(e.target.value)} placeholder="e.g. Christmas Day" style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '12px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.875rem' }} />
              </div>
              
              <div style={{ marginBottom: '1.75rem' }}>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: '#334155', marginBottom: '0.5rem' }}>Date</label>
                <input type="date" required value={formHolidayDate} onChange={(e) => setFormHolidayDate(e.target.value)} style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '12px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.875rem' }} />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setModalMode(null)} style={{ padding: '0.6rem 1.25rem', borderRadius: '9999px', border: '1px solid #cbd5e1', backgroundColor: 'white', color: '#475569', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" style={{ padding: '0.6rem 1.25rem', borderRadius: '9999px', border: 'none', backgroundColor: '#161245', color: 'white', fontWeight: 700, fontSize: '0.875rem', cursor: 'pointer', boxShadow: '0 4px 12px rgba(22, 18, 69, 0.15)' }}>Save Holiday</button>
              </div>
            </form>
          </div>
        ) : modalMode === 'delete_holiday' ? (
          <div style={{ width: '100%', maxWidth: '400px', backgroundColor: 'white', borderRadius: '24px', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', position: 'relative' }}>
            <div style={{ padding: '2rem 1.5rem 1.5rem', textAlign: 'center' }}>
              <div style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: '#fef2f2', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem' }}>
                <AlertCircle size={28} />
              </div>
              <h2 style={{ margin: '0 0 0.75rem', fontSize: '1.35rem', fontWeight: 800, color: '#161245' }}>Delete Holiday?</h2>
              <p style={{ margin: '0 0 1.5rem', color: '#64748b', fontSize: '0.95rem', lineHeight: '1.5' }}>Are you sure you want to delete <strong>{activeItem?.name}</strong>? This action cannot be undone.</p>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
                <button onClick={() => setModalMode(null)} style={{ flex: 1, padding: '0.75rem', borderRadius: '9999px', border: '1px solid #cbd5e1', backgroundColor: 'white', color: '#475569', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer' }}>Cancel</button>
                <button onClick={handleDeleteHoliday} style={{ flex: 1, padding: '0.75rem', borderRadius: '9999px', border: 'none', backgroundColor: '#ef4444', color: 'white', fontWeight: 700, fontSize: '0.875rem', cursor: 'pointer', boxShadow: '0 4px 12px rgba(239, 68, 68, 0.2)' }}>Delete</button>
              </div>
            </div>
          </div>
        ) : modalMode === 'add_shift' || modalMode === 'edit_shift' ? ('''
content = content.replace(modal_render_old, modal_render_new)

with open(file_path, 'w') as f:
    f.write(content)
print('SUCCESS EMPMGMT')


# UPDATE PAGE.JS
file_path_page = '/Users/Timothy/Documents/dev/Inxl Digital/attendance system/attendance-next/src/app/page.js'
with open(file_path_page, 'r') as f:
    content_page = f.read()

page_state_old = "const [shifts, setShifts] = useState(INITIAL_SHIFTS)"
page_state_new = "const [shifts, setShifts] = useState(INITIAL_SHIFTS)\n  const [customHolidays, setCustomHolidays] = useState([])"
content_page = content_page.replace(page_state_old, page_state_new)

page_fetch_old = "const { data: sData, error: sError } = await supabase.from('shifts').select('*').order('created_at', { ascending: true });"
page_fetch_new = '''const { data: hData, error: hError } = await supabase.from('holidays').select('*');
      if (!hError && hData) setCustomHolidays(hData);

      const { data: sData, error: sError } = await supabase.from('shifts').select('*').order('created_at', { ascending: true });'''
content_page = content_page.replace(page_fetch_old, page_fetch_new)

page_cal_old = '''<CalendarView events={[
            ...getIndianHolidays(new Date().getFullYear() - 1),
            ...getIndianHolidays(new Date().getFullYear()),
            ...getIndianHolidays(new Date().getFullYear() + 1)
          ]} />'''
page_cal_new = '''<CalendarView events={[
            ...getIndianHolidays(new Date().getFullYear() - 1),
            ...getIndianHolidays(new Date().getFullYear()),
            ...getIndianHolidays(new Date().getFullYear() + 1),
            ...customHolidays
          ]} />'''
content_page = content_page.replace(page_cal_old, page_cal_new)

with open(file_path_page, 'w') as f:
    f.write(content_page)
print('SUCCESS PAGE')

