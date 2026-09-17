@echo off
echo Starting Sync... >> "C:\Users\user\Documents\Development\Attendance_tracking_System-\attendance-next\sync_cron_log.txt"
date /t >> "C:\Users\user\Documents\Development\Attendance_tracking_System-\attendance-next\sync_cron_log.txt"
time /t >> "C:\Users\user\Documents\Development\Attendance_tracking_System-\attendance-next\sync_cron_log.txt"
cd /d "C:\Users\user\Documents\Development\Attendance_tracking_System-\attendance-next"
node scripts\sync_to_supabase.mjs >> "C:\Users\user\Documents\Development\Attendance_tracking_System-\attendance-next\sync_cron_log.txt" 2>&1
echo Sync finished. >> "C:\Users\user\Documents\Development\Attendance_tracking_System-\attendance-next\sync_cron_log.txt"
echo ---------------------------------------- >> "C:\Users\user\Documents\Development\Attendance_tracking_System-\attendance-next\sync_cron_log.txt"
