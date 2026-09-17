$Action = New-ScheduledTaskAction -Execute 'C:\Users\user\Documents\Development\Attendance_tracking_System-\run_direct_sync.bat'
$Trigger = New-ScheduledTaskTrigger -Once -At (Get-Date) -RepetitionInterval (New-TimeSpan -Minutes 15)
$Settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable
Register-ScheduledTask -TaskName 'AttendanceDirectSync' -Action $Action -Trigger $Trigger -Settings $Settings -Description 'Direct Biometric Device to Supabase Sync every 15 minutes' -Force