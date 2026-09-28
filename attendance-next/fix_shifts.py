import sys

# 1. Fix page.js
file_path_page = '/Users/Timothy/Documents/dev/Inxl Digital/attendance system/attendance-next/src/app/page.js'
with open(file_path_page, 'r') as f:
    content_page = f.read()

page_fetch_old = '''const { data: sData, error: sError } = await supabase.from('shifts').select('*').order('created_at', { ascending: true });
      if (!sError && sData && sData.length > 0) setShifts(sData);
      else setShifts(getStoredConfig('inxl_shifts', INITIAL_SHIFTS));'''
page_fetch_new = '''const { data: sData, error: sError } = await supabase.from('shifts').select('*').order('created_at', { ascending: true });
      if (!sError && sData && sData.length > 0) {
        setShifts(sData.map(s => ({
          ...s,
          displayHours: s.display_timing,
          graceMinutes: s.grace_period,
          startTime: s.start_time,
          endTime: s.end_time
        })));
      } else {
        setShifts(getStoredConfig('inxl_shifts', INITIAL_SHIFTS));
      }'''
content_page = content_page.replace(page_fetch_old, page_fetch_new)

with open(file_path_page, 'w') as f:
    f.write(content_page)


# 2. Fix EmployeeManagement.js
file_path_emp = '/Users/Timothy/Documents/dev/Inxl Digital/attendance system/attendance-next/src/components/EmployeeManagement.js'
with open(file_path_emp, 'r') as f:
    content_emp = f.read()

emp_fetch_old = '''const { data, error } = await supabase.from('shifts').select('*').order('created_at', { ascending: true });
      if (!error && data && data.length > 0) {
        setShifts(data);
      } else {
        setShifts(getStoredConfig('inxl_shifts', INITIAL_SHIFTS));
      }'''
emp_fetch_new = '''const { data, error } = await supabase.from('shifts').select('*').order('created_at', { ascending: true });
      if (!error && data && data.length > 0) {
        setShifts(data.map(s => ({
          ...s,
          displayHours: s.display_timing,
          graceMinutes: s.grace_period,
          startTime: s.start_time,
          endTime: s.end_time
        })));
      } else {
        setShifts(getStoredConfig('inxl_shifts', INITIAL_SHIFTS));
      }'''
content_emp = content_emp.replace(emp_fetch_old, emp_fetch_new)

with open(file_path_emp, 'w') as f:
    f.write(content_emp)

print("SUCCESS")
