@echo off
setlocal EnableDelayedExpansion
chcp 65001 >nul
title LM Studio Chinese Patch - Restore

echo.
echo  ============================================
echo   LM Studio Simplified Chinese Patch - Restore
echo   Restores the original English main_window.js
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
    powershell -NoProfile -Command "Start-Process -FilePath 'cmd.exe' -ArgumentList '/c cd /d \"%~dp0\" && node \"patch\apply-patch.js\" --restore && node \"patch\patch-extra.js\" --restore && pause' -Verb RunAs"
    if %errorlevel% neq 0 (
        echo [ERROR] Elevation was cancelled.
        pause
        exit /b 1
    )
    exit /b 0
)

rem ---- already admin: restore directly ----
node "patch\apply-patch.js" --restore
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Restore failed. See messages above.
    echo         Manual fallback: copy the backup file from
    echo         %USERPROFILE%\.lmstudio-chinese-patch\backups\
    echo         back into the LM Studio resources folder.
    pause
    exit /b 1
)
node "patch\patch-extra.js" --restore
if %errorlevel% neq 0 (
    echo.
    echo [WARN] Extra restore reported errors. Check messages above; backups live in
    echo        %USERPROFILE%\.lmstudio-chinese-patch\backups\
)

echo.
echo  Done. Original files restored. Start LM Studio again.
echo.
pause
