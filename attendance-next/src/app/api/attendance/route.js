import { supabaseAdmin } from '@/lib/supabase'

export async function GET() {
  try {
    // Fetch attendance logs joined with employee names
    const { data: logs, error: logsError } = await supabaseAdmin
      .from('attendance_logs')
      .select(`
        attendance_date,
        employee_id,
        in_time,
        out_time,
        duration,
        late_by,
        early_by,
        overtime,
        punch_records,
        present,
        absent,
        status,
        weekly_off,
        holiday,
        employees (
          employee_name,
          employee_code,
          department_id
        )
      `)
      .order('attendance_date', { ascending: false })

    if (logsError) throw logsError

    // Transform into the flat format the dashboard expects
    const formatted = logs.map(log => ({
      date: log.attendance_date,
      emp_id: log.employee_id,
      name: log.employees?.employee_name || 'Unknown',
      emp_code: log.employees?.employee_code || '',
      in_time: log.in_time || '',
      out_time: log.out_time || '',
      total_duration: log.duration || '',
      late_by: log.late_by || '00:00',
      early_going_by: log.early_by || '00:00',
      overtime: log.overtime || '00:00',
      punch_records: log.punch_records || '',
      status: log.status || (log.present ? 'Present' : 'Absent'),
      weekly_off: log.weekly_off || false,
      holiday: log.holiday || false,
    }))

    return Response.json({ success: true, data: formatted })
  } catch (err) {
    console.error('Supabase fetch error:', err)
    return Response.json(
      { success: false, error: err.message },
      { status: 500 }
    )
  }
}
