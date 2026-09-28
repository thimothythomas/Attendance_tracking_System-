import sys

file_path = '/Users/Timothy/Documents/dev/Inxl Digital/attendance system/attendance-next/src/components/EmployeeManagement.js'
with open(file_path, 'r') as f:
    content = f.read()

# 1. Update reloadShifts to fetchShifts from Supabase
old_reload_shifts = '''  useEffect(() => {
    const reloadShifts = () => {
      setShifts(getStoredConfig('inxl_shifts', INITIAL_SHIFTS));
    };
    reloadShifts();
    fetchDepartments();
    
    const handleDataEvent = () => reloadShifts();
    window.addEventListener('inxl_data_updated', handleDataEvent);
    return () => window.removeEventListener('inxl_data_updated', handleDataEvent);
  }, []);'''

new_fetch_shifts = '''  const fetchShifts = async () => {
    try {
      const { data, error } = await supabase.from('shifts').select('*').order('created_at', { ascending: true });
      if (!error && data && data.length > 0) {
        setShifts(data);
      } else {
        setShifts(getStoredConfig('inxl_shifts', INITIAL_SHIFTS));
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchShifts();
    fetchDepartments();
    
    const handleDataEvent = () => fetchShifts();
    window.addEventListener('inxl_data_updated', handleDataEvent);
    return () => window.removeEventListener('inxl_data_updated', handleDataEvent);
  }, []);'''

content = content.replace(old_reload_shifts, new_fetch_shifts)

# 2. Add Shift
old_add = '''      const updated = [...shifts, newShift];
      setShifts(updated);
      saveStoredConfig('inxl_shifts', updated);
      setSuccessMsg(`Shift schedule "${name}" created!`);'''

new_add = '''      
      const { error } = await supabase.from('shifts').insert([{
        name,
        start_time: formShiftStart,
        end_time: formShiftEnd,
        display_timing: displayHours,
        grace_period: parseInt(formShiftGrace, 10) || 0,
        duration
      }]);
      
      if (!error) {
        await fetchShifts();
        setSuccessMsg(`Shift schedule "${name}" created!`);
        window.dispatchEvent(new Event('inxl_data_updated'));
      } else {
        setErrorMsg('Failed to save shift to database. Did you create the table?');
      }'''

content = content.replace(old_add, new_add)


# 3. Edit Shift
old_edit = '''      setShifts(updated);
      saveStoredConfig('inxl_shifts', updated);

      if (oldName !== name) {
        await supabase
          .from('employees')
          .update({ shift_name: name })
          .eq('shift_name', oldName);
        window.dispatchEvent(new Event('inxl_data_updated'));
      }
      setSuccessMsg(`Shift "${name}" updated.`);
      setTimeout(() => setSuccessMsg(''), 4000);
      setModalMode(null);'''

new_edit = '''      
      const { error } = await supabase.from('shifts').update({
        name,
        start_time: formShiftStart,
        end_time: formShiftEnd,
        display_timing: displayHours,
        grace_period: parseInt(formShiftGrace, 10) || 0,
        duration
      }).eq('id', activeItem.id);
      
      if (!error) {
        await fetchShifts();
        if (oldName !== name) {
          await supabase
            .from('employees')
            .update({ shift_name: name })
            .eq('shift_name', oldName);
        }
        window.dispatchEvent(new Event('inxl_data_updated'));
        setSuccessMsg(`Shift "${name}" updated.`);
        setTimeout(() => setSuccessMsg(''), 4000);
        setModalMode(null);
      } else {
        setErrorMsg('Failed to update shift in database.');
      }'''

content = content.replace(old_edit, new_edit)


# 4. Delete Shift
old_delete = '''    const updated = shifts.filter(s => s.id !== activeItem.id);
    setShifts(updated);
    saveStoredConfig('inxl_shifts', updated);
    setSuccessMsg(`Shift "${activeItem.name}" removed.`);
    setTimeout(() => setSuccessMsg(''), 4000);
    setModalMode(null);'''

new_delete = '''    const { error } = await supabase.from('shifts').delete().eq('id', activeItem.id);
    if (!error) {
      await fetchShifts();
      window.dispatchEvent(new Event('inxl_data_updated'));
      setSuccessMsg(`Shift "${activeItem.name}" removed.`);
      setTimeout(() => setSuccessMsg(''), 4000);
      setModalMode(null);
    } else {
      setErrorMsg('Failed to delete shift from database.');
    }'''

content = content.replace(old_delete, new_delete)

with open(file_path, 'w') as f:
    f.write(content)
print('SUCCESS EmployeeManagement')

# Now for page.js
file_path_page = '/Users/Timothy/Documents/dev/Inxl Digital/attendance system/attendance-next/src/app/page.js'
with open(file_path_page, 'r') as f:
    content_page = f.read()

old_reload_meta = '''  useEffect(() => {
    const reloadMeta = () => {
      const d = getStoredConfig('inxl_departments', INITIAL_DEPARTMENTS);
      const s = getStoredConfig('inxl_shifts', INITIAL_SHIFTS);
      setDepartments(d);
      setShifts(s);
    };
    reloadMeta();'''

new_fetch_meta = '''  useEffect(() => {
    const reloadMeta = async () => {
      const { data: dData, error: dError } = await supabase.from('departments').select('*').order('created_at', { ascending: true });
      if (!dError && dData && dData.length > 0) setDepartments(dData);
      else setDepartments(getStoredConfig('inxl_departments', INITIAL_DEPARTMENTS));

      const { data: sData, error: sError } = await supabase.from('shifts').select('*').order('created_at', { ascending: true });
      if (!sError && sData && sData.length > 0) setShifts(sData);
      else setShifts(getStoredConfig('inxl_shifts', INITIAL_SHIFTS));
    };
    reloadMeta();
    
    const handleDataEvent = () => reloadMeta();
    window.addEventListener('inxl_data_updated', handleDataEvent);
    return () => window.removeEventListener('inxl_data_updated', handleDataEvent);'''

content_page = content_page.replace(old_reload_meta, new_fetch_meta)

with open(file_path_page, 'w') as f:
    f.write(content_page)
print('SUCCESS page.js')
