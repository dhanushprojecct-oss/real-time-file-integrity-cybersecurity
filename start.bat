@echo off
title File Integrity Monitoring System Using Cybersecurity

echo.
echo ============================================================
echo   File Integrity Monitoring System Using Cybersecurity
echo ============================================================
echo.
echo Starting Backend (Flask)...
start "Backend - Flask" cmd /k "cd /d "%~dp0backend" && python app.py"

timeout /t 2 /nobreak >nul

echo Starting Frontend (Vite/React)...
start "Frontend - Vite" cmd /k "cd /d "%~dp0frontend" && npm run dev"

timeout /t 3 /nobreak >nul

echo.
echo Both servers are starting...
echo   Backend  -->  http://localhost:5000
echo   Frontend -->  http://localhost:5173
echo.
echo Opening browser...
start http://localhost:5173

echo.
echo Press any key to exit this window (servers will keep running)
pause >nul
