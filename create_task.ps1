$Action = New-ScheduledTaskAction -Execute 'C:\Users\user\Documents\Development\Attendance_tracking_System-\run_sync.bat'
$Trigger = New-ScheduledTaskTrigger -Once -At (Get-Date) -RepetitionInterval (New-TimeSpan -Minutes 30)
$Settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable
Register-ScheduledTask -TaskName 'AttendanceTrackingSync' -Action $Action -Trigger $Trigger -Settings $Settings -Description 'Syncs eSSL data to Supabase every 30 minutes' -Force
