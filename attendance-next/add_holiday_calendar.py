import sys

file_path = '/Users/Timothy/Documents/dev/Inxl Digital/attendance system/attendance-next/src/components/CalendarView.js'
with open(file_path, 'r') as f:
    content = f.read()

# 1. Imports
imports_old = "import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Info } from 'lucide-react';"
imports_new = "import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Info, Plus, X } from 'lucide-react';\nimport { supabase } from '@/lib/supabase';"
content = content.replace(imports_old, imports_new)

# 2. State & Handlers
state_old = "  const [currentDate, setCurrentDate] = useState(new Date());"
state_new = '''  const [currentDate, setCurrentDate] = useState(new Date());
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
  };'''
content = content.replace(state_old, state_new)

# 3. Add Button in Header
header_old = "          <div>\n            <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, color: '#161245', letterSpacing: '-0.02em' }}>{title}</h2>\n            <p style={{ margin: 0, color: '#64748b', fontSize: '0.85rem' }}>{subtitle}</p>\n          </div>\n        </div>"
header_new = '''          <div>
            <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, color: '#161245', letterSpacing: '-0.02em' }}>{title}</h2>
            <p style={{ margin: 0, color: '#64748b', fontSize: '0.85rem' }}>{subtitle}</p>
          </div>
          <button 
            onClick={() => setShowAddModal(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginLeft: '1.5rem', padding: '0.65rem 1.25rem', borderRadius: '9999px', border: 'none', backgroundColor: '#161245', color: 'white', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', boxShadow: '0 4px 12px rgba(22, 18, 69, 0.15)' }}
          >
            <Plus size={16} /> Add Holiday
          </button>
        </div>'''
content = content.replace(header_old, header_new)

# 4. Modal Render
modal_code = '''
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
'''

render_old = "    </div>\n  );\n};\n\nexport default CalendarView;"
render_new = modal_code + render_old
content = content.replace(render_old, render_new)

with open(file_path, 'w') as f:
    f.write(content)
print('SUCCESS CALENDAR')
