@echo off
setlocal EnableDelayedExpansion
chcp 65001 >nul
title LM Studio Chinese Patch

echo.
echo  ============================================
echo   LM Studio Simplified Chinese Patch v1.1.0
echo   Target: LM Studio 0.4.25+1  (Node.js required)
echo  ============================================
echo.

rem ---- locate script dir ----
cd /d "%~dp0"

rem ---- locate node: PATH -> WorkBuddy managed -> Program Files ----
rem (system PATH may have no Node.js, e.g. WorkBuddy-managed runtimes only)
set "NODE="
where node >nul 2>&1 && for /f "delims=" %%v in ('where node') do if not defined NODE set "NODE=%%v"
if not defined NODE (
    for /d %%d in ("%USERPROFILE%\.workbuddy\binaries\node\versions\*") do (
        if exist "%%d\node.exe" set "NODE=%%d\node.exe"
    )
)
if not defined NODE if exist "%ProgramFiles%\nodejs\node.exe" set "NODE=%ProgramFiles%\nodejs\node.exe"
if not defined NODE (
    echo [ERROR] Node.js not found.
    echo         Install LTS from https://nodejs.org then run this again.
    pause
    exit /b 1
)
echo [OK] Node.js !NODE!

rem ---- self-elevate if not admin (some install dirs need it) ----
rem Re-invokes this same .bat elevated so the elevated run reuses the
rem node-discovery above (the elevated cmd may have a different PATH).
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo [..] Requesting administrator rights ^(write access to install dir^)...
    powershell -NoProfile -Command "Start-Process -FilePath 'cmd.exe' -ArgumentList '/c cd /d \"%~dp0\" && \"%~f0\"' -Verb RunAs"
    if %errorlevel% neq 0 (
        echo [ERROR] Elevation was cancelled. Try --restore with the same script if needed.
        pause
        exit /b 1
    )
    exit /b 0
)

rem ---- already admin: run directly ----
"!NODE!" "patch\apply-patch.js"
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Patch failed. See messages above.
    echo         Rollback: node "patch\apply-patch.js" --restore
    pause
    exit /b 1
)
"!NODE!" "patch\patch-extra.js"
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Extra patch failed. See messages above.
    echo         Rollback: node "patch\patch-extra.js" --restore
    echo         (renderer patch stays applied; restore it with apply-patch.js --restore)
    pause
    exit /b 1
)

rem ---- model yaml customFields (per-machine model data; failure is non-fatal) ----
"!NODE!" "tools\patch-model-yamls.js"
if %errorlevel% neq 0 echo [WARN] model yaml patch skipped. Re-run later: node "tools\patch-model-yamls.js"

echo.
echo  Done. Fully quit LM Studio (tray icon - Quit) and start it again.
echo  Rollback any time: node "patch\apply-patch.js" --restore  +  node "patch\patch-extra.js" --restore
echo.
pause
