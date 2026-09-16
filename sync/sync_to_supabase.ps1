# ============================================================
# sync_to_supabase.ps1
# Reads eSSL eTimeTrackLite database and pushes data to Supabase
# Run automatically via Windows Task Scheduler every hour
# ============================================================

$SUPABASE_URL    = "https://qbbzflvmmiahxldqzckp.supabase.co"
$SUPABASE_SECRET = "PASTE_YOUR_SECRET_KEY_HERE"   # <-- fill this in
$MDB_PATH        = "C:\eTimeTrackLite\eTimeTrackLite1.mdb"
$LOG_FILE        = "$PSScriptRoot\sync.log"

function Write-Log($msg) {
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    "$timestamp | $msg" | Tee-Object -FilePath $LOG_FILE -Append
}

function Invoke-Supabase($endpoint, $body) {
    $headers = @{
        "apikey"        = $SUPABASE_SECRET
        "Authorization" = "Bearer $SUPABASE_SECRET"
        "Content-Type"  = "application/json"
        "Prefer"        = "resolution=merge-duplicates"
    }
    $json = $body | ConvertTo-Json -Depth 5 -Compress
    try {
        $response = Invoke-RestMethod `
            -Uri "$SUPABASE_URL/rest/v1/$endpoint" `
            -Method POST `
            -Headers $headers `
            -Body $json `
            -ErrorAction Stop
        return $response
    } catch {
        Write-Log "ERROR calling $endpoint : $_"
        return $null
    }
}

# ─── Connect to eSSL Database ───────────────────────────────
Write-Log "Starting sync..."

$connStr = "Provider=Microsoft.ACE.OLEDB.12.0;Data Source=$MDB_PATH;"
$conn = New-Object System.Data.OleDb.OleDbConnection($connStr)

try {
    $conn.Open()
    Write-Log "Connected to eSSL database."
} catch {
    Write-Log "FATAL: Cannot open eSSL database: $_"
    exit 1
}

# ─── Sync Employees ──────────────────────────────────────────
Write-Log "Syncing employees..."

$cmd = $conn.CreateCommand()
$cmd.CommandText = "SELECT EmployeeId, EmployeeName, EmployeeCode, DepartmentId FROM Employees WHERE RecordStatus = 1"
$reader = $cmd.ExecuteReader()

$employees = @()
while ($reader.Read()) {
    $employees += @{
        employee_id   = $reader["EmployeeId"].ToString().Trim()
        employee_name = $reader["EmployeeName"].ToString().Trim()
        employee_code = $reader["EmployeeCode"].ToString().Trim()
        department_id = $reader["DepartmentId"].ToString().Trim()
    }
}
$reader.Close()

if ($employees.Count -gt 0) {
    Invoke-Supabase "employees" $employees
    Write-Log "Synced $($employees.Count) employees."
} else {
    Write-Log "No employees found."
}

# ─── Sync Attendance Logs (last 90 days) ─────────────────────
Write-Log "Syncing attendance logs..."

$cutoff = (Get-Date).AddDays(-90).ToString("yyyy-MM-dd")
$cmd.CommandText = @"
SELECT
    attendancelogid, AttendanceDate, EmployeeId,
    InTime, OutTime, Duration, LateBy, EarlyBy,
    OverTime, PunchRecords, Present, Absent,
    Status, WeeklyOff, Holiday
FROM AttendanceLogs
WHERE AttendanceDate >= #$cutoff#
"@

$reader = $cmd.ExecuteReader()
$logs = @()

while ($reader.Read()) {
    $logs += @{
        id              = [int]$reader["attendancelogid"]
        attendance_date = ([DateTime]$reader["AttendanceDate"]).ToString("yyyy-MM-dd")
        employee_id     = $reader["EmployeeId"].ToString().Trim()
        in_time         = $reader["InTime"].ToString().Trim()
        out_time        = $reader["OutTime"].ToString().Trim()
        duration        = $reader["Duration"].ToString().Trim()
        late_by         = $reader["LateBy"].ToString().Trim()
        early_by        = $reader["EarlyBy"].ToString().Trim()
        overtime        = $reader["OverTime"].ToString().Trim()
        punch_records   = $reader["PunchRecords"].ToString().Trim()
        present         = ($reader["Present"].ToString() -eq "True")
        absent          = ($reader["Absent"].ToString() -eq "True")
        status          = $reader["Status"].ToString().Trim()
        weekly_off      = ($reader["WeeklyOff"].ToString() -eq "True")
        holiday         = ($reader["Holiday"].ToString() -eq "True")
    }

    # Push in batches of 500 to avoid payload limits
    if ($logs.Count -eq 500) {
        Invoke-Supabase "attendance_logs" $logs
        Write-Log "Pushed batch of 500 records..."
        $logs = @()
    }
}
$reader.Close()

# Push remaining
if ($logs.Count -gt 0) {
    Invoke-Supabase "attendance_logs" $logs
    Write-Log "Pushed final $($logs.Count) records."
}

$conn.Close()
Write-Log "Sync complete. ✓"
