// ============================================================
// sync_to_supabase.mjs
// Step 1: Dumps eSSL .mdb data to a temp JSON file via PowerShell
// Step 2: Reads JSON and pushes to Supabase using the JS SDK
// ============================================================

import { createClient } from '@supabase/supabase-js'
import { execSync } from 'child_process'
import { appendFileSync, writeFileSync, readFileSync, existsSync, unlinkSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

const SUPABASE_URL    = 'https://qbbzflvmmiahxldqzckp.supabase.co'
const SUPABASE_SECRET = 'sb_secret_p7KCX0a5SFooEJByehw2kw_v5-s9Tsg'
const MDB_PATH        = 'C:\\eTimeTrackLite\\eTimeTrackLite1.mdb'
const LOG_FILE        = join(__dirname, 'sync.log')
const TEMP_PS1        = join(__dirname, '_temp_query.ps1')
const TEMP_JSON       = join(__dirname, '_temp_data.json')

const supabase = createClient(SUPABASE_URL, SUPABASE_SECRET, {
  auth: { persistSession: false }
})

function log(msg) {
  const line = `${new Date().toISOString().replace('T', ' ').slice(0, 19)} | ${msg}`
  console.log(line)
  appendFileSync(LOG_FILE, line + '\n')
}

function runPS1(script) {
  writeFileSync(TEMP_PS1, script, 'utf8')
  try {
    const out = execSync(`powershell -ExecutionPolicy Bypass -File "${TEMP_PS1}"`, {
      maxBuffer: 100 * 1024 * 1024
    }).toString().trim()
    return out
  } finally {
    if (existsSync(TEMP_PS1)) unlinkSync(TEMP_PS1)
  }
}

function readTempJson() {
  if (!existsSync(TEMP_JSON)) return []
  const raw = readFileSync(TEMP_JSON, 'utf8').trim()
  if (!raw || raw === 'null') return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : [parsed]
  } catch {
    return []
  }
}

// ─── Sync Employees ──────────────────────────────────────────
async function syncEmployees() {
  log('Syncing employees...')

  runPS1(`
$conn = New-Object System.Data.OleDb.OleDbConnection("Provider=Microsoft.ACE.OLEDB.12.0;Data Source=${MDB_PATH};")
$conn.Open()
$cmd = $conn.CreateCommand()
$cmd.CommandText = "SELECT EmployeeId, EmployeeName, EmployeeCode, DepartmentId FROM Employees"
$reader = $cmd.ExecuteReader()
$rows = @()
while ($reader.Read()) {
  $row = [ordered]@{
    EmployeeId   = $reader["EmployeeId"].ToString().Trim()
    EmployeeName = $reader["EmployeeName"].ToString().Trim()
    EmployeeCode = $reader["EmployeeCode"].ToString().Trim()
    DepartmentId = $reader["DepartmentId"].ToString().Trim()
  }
  $rows += $row
}
$reader.Close()
$conn.Close()
$rows | ConvertTo-Json -Depth 2 | Out-File -FilePath "${TEMP_JSON.replace(/\\/g, '\\\\')}" -Encoding utf8
  `)

  const rows = readTempJson()
  if (!rows.length) { log('No employees found.'); return }

  const records = rows.map(r => ({
    employee_id:   r.EmployeeId,
    employee_name: r.EmployeeName,
    employee_code: r.EmployeeCode,
    department_id: r.DepartmentId
  }))

  const { error } = await supabase.from('employees').upsert(records, { onConflict: 'employee_id' })
  if (error) log(`ERROR syncing employees: ${error.message}`)
  else log(`Synced ${records.length} employees.`)
}

// ─── Sync Attendance ─────────────────────────────────────────
async function syncAttendance() {
  log('Syncing attendance logs (last 90 days)...')

  const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
    .toISOString().slice(0, 10)

  runPS1(`
$conn = New-Object System.Data.OleDb.OleDbConnection("Provider=Microsoft.ACE.OLEDB.12.0;Data Source=${MDB_PATH};")
$conn.Open()
$cmd = $conn.CreateCommand()
$cmd.CommandText = "SELECT ShiftId, ShiftSName FROM Shifts"
$reader = $cmd.ExecuteReader()
$rows = @()
while ($reader.Read()) {
  $row = [ordered]@{
    ShiftId    = $reader["ShiftId"].ToString().Trim()
    ShiftSName = $reader["ShiftSName"].ToString().Trim()
  }
  $rows += $row
}
$reader.Close()
$conn.Close()
$rows | ConvertTo-Json -Depth 2 | Out-File -FilePath "${TEMP_JSON.replace(/\\/g, '\\\\')}" -Encoding utf8
  `)

  const shiftRows = readTempJson()
  const shiftMap = {}
  shiftRows.forEach(s => {
    shiftMap[s.ShiftId] = s.ShiftSName
  })

  runPS1(`
$conn = New-Object System.Data.OleDb.OleDbConnection("Provider=Microsoft.ACE.OLEDB.12.0;Data Source=${MDB_PATH};")
$conn.Open()
$cmd = $conn.CreateCommand()
$cmd.CommandText = "SELECT TOP 5000 attendancelogid, AttendanceDate, EmployeeId, InTime, OutTime, Duration, LateBy, EarlyBy, OverTime, PunchRecords, Present, Absent, Status, WeeklyOff, Holiday, ShiftId FROM AttendanceLogs WHERE AttendanceDate >= #${cutoff}#"
$reader = $cmd.ExecuteReader()
$rows = @()
while ($reader.Read()) {
  $row = [ordered]@{
    attendancelogid = $reader["attendancelogid"].ToString().Trim()
    AttendanceDate  = if (-not [string]::IsNullOrEmpty($reader["AttendanceDate"].ToString())) { ([datetime]$reader["AttendanceDate"]).ToString("yyyy-MM-dd") } else { $null }
    EmployeeId      = $reader["EmployeeId"].ToString().Trim()
    InTime          = $reader["InTime"].ToString().Trim()
    OutTime         = $reader["OutTime"].ToString().Trim()
    Duration        = $reader["Duration"].ToString().Trim()
    LateBy          = $reader["LateBy"].ToString().Trim()
    EarlyBy         = $reader["EarlyBy"].ToString().Trim()
    OverTime        = $reader["OverTime"].ToString().Trim()
    PunchRecords    = $reader["PunchRecords"].ToString().Trim()
    Present         = $reader["Present"].ToString().Trim()
    Absent          = $reader["Absent"].ToString().Trim()
    Status          = $reader["Status"].ToString().Trim()
    WeeklyOff       = $reader["WeeklyOff"].ToString().Trim()
    Holiday         = $reader["Holiday"].ToString().Trim()
    ShiftId         = $reader["ShiftId"].ToString().Trim()
  }
  $rows += $row
}
$reader.Close()
$conn.Close()
$rows | ConvertTo-Json -Depth 2 | Out-File -FilePath "${TEMP_JSON.replace(/\\/g, '\\\\')}" -Encoding utf8
  `)

  const rows = readTempJson()
  if (!rows.length) { log('No attendance records found.'); return }

  log(`Read ${rows.length} records from eSSL. Pushing to Supabase...`)

  const BATCH = 200
  let pushed = 0
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH).map(r => {
      const shiftName = shiftMap[r.ShiftId] || ''
      return {
        id:              parseInt(r.attendancelogid) || 0,
      attendance_date: r.AttendanceDate?.slice(0, 10) || null,
      employee_id:     r.EmployeeId,
      in_time:         r.InTime || '',
      out_time:        r.OutTime || '',
      duration:        r.Duration || '',
      late_by:         r.LateBy || '00:00',
      early_by:        r.EarlyBy || '00:00',
      overtime:        r.OverTime || '00:00',
      punch_records:   r.PunchRecords || '',
      present:         r.Present === 'True',
      absent:          r.Absent === 'True',
      status:          `${r.Status || ''}||${shiftName}`,
      weekly_off:      r.WeeklyOff === 'True',
      holiday:         r.Holiday === 'True',
    }
  })

    const { error } = await supabase.from('attendance_logs').upsert(batch, { onConflict: 'attendance_date,employee_id' })
    if (error) log(`ERROR batch ${Math.floor(i / BATCH) + 1}: ${error.message}`)
    else pushed += batch.length
  }

  log(`Synced ${pushed} / ${rows.length} attendance records.`)
}

// ─── Main ────────────────────────────────────────────────────
log('=== Starting eSSL to Supabase sync ===')
try {
  await syncEmployees()
  await syncAttendance()
} catch (err) {
  log(`FATAL: ${err.message}`)
} finally {
  if (existsSync(TEMP_JSON)) unlinkSync(TEMP_JSON)
  log('=== Sync complete ===')
}
