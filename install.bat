@echo off
setlocal EnableDelayedExpansion
chcp 65001 >nul
title LM Studio Chinese Patch

echo.
echo  ============================================
echo   LM Studio Simplified Chinese Patch v1.0.0
echo   Target: LM Studio 0.4.25  (Node.js required)
echo  ============================================
echo.

rem ---- locate script dir ----
cd /d "%~dp0"

rem ---- check node ----
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js not found.
    echo         Install LTS from https://nodejs.org then run this again.
    pause
    exit /b 1
)
for /f "delims=" %%v in ('node -v') do set NODEV=%%v
echo [OK] Node.js !NODEV!

rem ---- self-elevate if not admin (some install dirs need it) ----
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo [..] Requesting administrator rights (write access to install dir)...
    powershell -NoProfile -Command "Start-Process -FilePath 'cmd.exe' -ArgumentList '/c cd /d \"%~dp0\" && node \"patch\apply-patch.js\" && pause' -Verb RunAs"
    if %errorlevel% neq 0 (
        echo [ERROR] Elevation was cancelled. Try --restore with the same script if needed.
        pause
        exit /b 1
    )
    exit /b 0
)

rem ---- already admin: run directly ----
node "patch\apply-patch.js"
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Patch failed. See messages above.
    echo         Rollback: node "patch\apply-patch.js" --restore
    pause
    exit /b 1
)

echo.
echo  Done. Fully quit LM Studio (tray icon - Quit) and start it again.
echo  Rollback any time: node "patch\apply-patch.js" --restore
echo.
pause
