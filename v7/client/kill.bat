@echo off
setlocal
echo Killing processes on ports 5173-5175...
for /f "tokens=5" %%a in ('netstat -a -n -o ^| findstr ":5174"') do taskkill /f /pid %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -a -n -o ^| findstr ":5175"') do taskkill /f /pid %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -a -n -o ^| findstr ":5173"') do taskkill /f /pid %%a >nul 2>&1
echo Ports cleaned.
exit 0
