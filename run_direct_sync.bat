@echo off
echo Starting Direct Device Sync... >> "%~dp0attendance-next\sync_direct_log.txt"
date /t >> "%~dp0attendance-next\sync_direct_log.txt"
time /t >> "%~dp0attendance-next\sync_direct_log.txt"
cd /d "%~dp0attendance-next"
node scripts\sync_device_direct.mjs >> "%~dp0attendance-next\sync_direct_log.txt" 2>&1
echo Direct Sync finished. >> "%~dp0attendance-next\sync_direct_log.txt"
echo ---------------------------------------- >> "%~dp0attendance-next\sync_direct_log.txt"