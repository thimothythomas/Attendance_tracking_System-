import ZKLib from 'node-zklib'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL    = 'https://qbbzflvmmiahxldqzckp.supabase.co'
const SUPABASE_SECRET = 'sb_secret_p7KCX0a5SFooEJByehw2kw_v5-s9Tsg'
const DEVICE_IP       = '192.168.1.6'
const DEVICE_PORT     = 4370

const supabase = createClient(SUPABASE_URL, SUPABASE_SECRET, {
  auth: { persistSession: false }
})

function log(msg) {
  const line = `${new Date().toISOString().replace('T', ' ').slice(0, 19)} | ${msg}`
  console.log(line)
}

function formatPad(n) {
  return String(n).padStart(2, '0')
}

function toDateString(d) {
  return `${d.getFullYear()}-${formatPad(d.getMonth() + 1)}-${formatPad(d.getDate())}`
}

function toDateTimeString(d) {
  return `${toDateString(d)} ${formatPad(d.getHours())}:${formatPad(d.getMinutes())}:${formatPad(d.getSeconds())}`
}

function toTimeOnly(d) {
  return `${formatPad(d.getHours())}:${formatPad(d.getMinutes())}`
}

async function runDirectSync(daysBack = 30) {
  log('==============================================')
  log('=== Starting DIRECT Device to Supabase Sync ===')
  log('==============================================')

  // 1. Fetch employee mapping from Supabase
  log('Fetching employee mapping from Supabase...')
  const { data: employees, error: empErr } = await supabase.from('employees').select('*')
  if (empErr) {
    log(`ERROR fetching employees: ${empErr.message}`)
    return
  }

  // Map employee_code (device user id) -> employee
  const codeToEmpMap = new Map()
  employees.forEach(emp => {
    if (emp.employee_code && !emp.employee_name?.startsWith('del_')) {
      codeToEmpMap.set(String(emp.employee_code).trim(), emp)
    }
  })
  log(`Loaded ${codeToEmpMap.size} active employees from Supabase.`)

  // 2. Connect to Biometric Device
  log(`Connecting directly to device at ${DEVICE_IP}:${DEVICE_PORT}...`)
  const zk = new ZKLib(DEVICE_IP, DEVICE_PORT, 10000, 4000)
  let rawPunches = []

  try {
    await zk.createSocket()
    log('Connected to biometric device successfully!')

    const att = await zk.getAttendances()
    rawPunches = att?.data || []
    log(`Retrieved ${rawPunches.length} total raw punch records from device memory.`)

    // Auto-discover and enroll new users from the biometric machine into Supabase
    try {
      const devUsers = await zk.getUsers()
      const userList = devUsers?.data || devUsers || []
      log(`Device has ${userList.length} registered users. Checking for new staff...`)

      let maxEmpId = 2500
      employees.forEach(e => {
        const n = parseInt(e.employee_id, 10)
        if (!isNaN(n) && n > maxEmpId) maxEmpId = n
      })

      // Set of all codes currently in database (active AND deactivated/hidden)
      const allKnownCodes = new Set(
        employees.map(e => String(e.employee_code).replace(/^del_/, '').split('_')[0].trim())
      )

      for (const u of userList) {
        const uCode = String(u.userId || u.uid).trim()
        // Only enroll if not already in database and not previously deactivated/hidden
        if (uCode && !allKnownCodes.has(uCode)) {
          maxEmpId++
          const cleanName = (u.name || `Staff ${uCode}`).replace(/,/g, ' ').trim()
          const newEmp = {
            employee_id: String(maxEmpId),
            employee_name: cleanName,
            employee_code: uCode,
            department_id: '1'
          }
          const { error: insErr } = await supabase.from('employees').insert([newEmp])
          if (!insErr) {
            codeToEmpMap.set(uCode, newEmp)
            log(`[AUTO-REGISTER] Discovered & added new employee from device: ${cleanName} (Machine ID: #${uCode})`)
          } else {
            log(`[AUTO-REGISTER ERROR] Could not add ${cleanName}: ${insErr.message}`)
          }
        }
      }
    } catch (uErr) {
      log(`Warning: could not inspect device users: ${uErr.message}`)
    }
  } catch (err) {
    log(`ERROR communicating with device: ${err.message}`)
    return
  } finally {
    try { await zk.disconnect() } catch {}
    log('Disconnected from device.')
  }

  // 3. Filter and group punches by (employee_id, date)
  const cutoffDate = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000)
  const cutoffStr = toDateString(cutoffDate)
  log(`Processing punches from ${cutoffStr} onwards (last ${daysBack} days)...`)

  // Pre-fetch existing attendance_logs so we preserve IDs
  const { data: existingLogs } = await supabase
    .from('attendance_logs')
    .select('id, attendance_date, employee_id')
    .gte('attendance_date', cutoffStr)

  const existingIdMap = new Map()
  let maxId = 50000
  if (existingLogs) {
    existingLogs.forEach(l => {
      existingIdMap.set(`${l.attendance_date}_${l.employee_id}`, l.id)
      if (l.id && l.id > maxId) maxId = l.id
    })
  }
  log(`Found ${existingIdMap.size} existing attendance records in Supabase for this range.`)

  // Map: `${date}_${employee_id}` -> punches
  const grouped = new Map()

  rawPunches.forEach(punch => {
    if (!punch.deviceUserId || !punch.recordTime) return
    const punchDate = new Date(punch.recordTime)
    if (isNaN(punchDate.getTime())) return

    const dateStr = toDateString(punchDate)
    if (dateStr < cutoffStr) return

    const emp = codeToEmpMap.get(String(punch.deviceUserId).trim())
    if (!emp) return // Skip unknown or deleted users

    const key = `${dateStr}_${emp.employee_id}`
    if (!grouped.has(key)) {
      grouped.set(key, {
        dateStr,
        employee_id: emp.employee_id,
        employee_name: emp.employee_name,
        employee_code: emp.employee_code,
        punches: []
      })
    }
    grouped.get(key).punches.push(punchDate)
  })

  log(`Grouped into ${grouped.size} employee-day attendance records.`)

  // 4. Calculate in_time, out_time, duration, punch_records
  const recordsToUpsert = []

  for (const item of grouped.values()) {
    // Sort punches ascending
    item.punches.sort((a, b) => a.getTime() - b.getTime())

    const firstPunch = item.punches[0]
    const lastPunch  = item.punches[item.punches.length - 1]

    const inTimeStr  = toDateTimeString(firstPunch)
    const outTimeStr = toDateTimeString(lastPunch)

    // Duration in minutes
    const diffMins = Math.max(0, Math.round((lastPunch.getTime() - firstPunch.getTime()) / (1000 * 60)))

    // Punch records trail: e.g. "10:24:in(TD), 14:20:out(TD), 14:53:out(TD)"
    const punchTrail = item.punches.map((p, idx) => {
      const type = idx === 0 ? 'in' : 'out'
      return `${toTimeOnly(p)}:${type}(Direct)`
    }).join(',')

    // Late by calculation (assuming 10:00 AM standard start)
    let lateByMins = 0
    const shiftStart = new Date(firstPunch)
    shiftStart.setHours(10, 0, 0, 0)
    if (firstPunch.getTime() > shiftStart.getTime()) {
      lateByMins = Math.round((firstPunch.getTime() - shiftStart.getTime()) / (1000 * 60))
    }

    const key = `${item.dateStr}_${item.employee_id}`
    const recordId = existingIdMap.get(key) || (++maxId)

    recordsToUpsert.push({
      id:              recordId,
      attendance_date: item.dateStr,
      employee_id:     item.employee_id,
      in_time:         inTimeStr,
      out_time:        outTimeStr,
      duration:        String(diffMins),
      late_by:         String(lateByMins),
      early_by:        '0',
      overtime:        '0',
      punch_records:   punchTrail,
      present:         true,
      absent:          false,
      status:          'Present||GS',
      weekly_off:      false,
      holiday:         false
    })
  }

  // 5. Upsert to Supabase in batches of 200
  log(`Pushing ${recordsToUpsert.length} calculated records to Supabase...`)
  const BATCH = 200
  let pushed = 0

  for (let i = 0; i < recordsToUpsert.length; i += BATCH) {
    const batch = recordsToUpsert.slice(i, i + BATCH)
    const { error } = await supabase
      .from('attendance_logs')
      .upsert(batch, { onConflict: 'attendance_date,employee_id' })

    if (error) {
      log(`ERROR upserting batch ${Math.floor(i / BATCH) + 1}: ${error.message}`)
    } else {
      pushed += batch.length
    }
  }

  log(`Successfully pushed ${pushed} / ${recordsToUpsert.length} records to Supabase!`)
  log('==============================================')
  log('=== DIRECT SYNC COMPLETE ===')
  log('==============================================')
  process.exit(0)
}

// Run for the last 30 days
runDirectSync(30).catch(err => {
  log(`FATAL: ${err.message}`)
})