@echo off
setlocal EnableDelayedExpansion
chcp 65001 >nul
title LM Studio Chinese Patch - Batch Runner

rem ---- cd to project root (this bat lives in tools\) ----
cd /d "%~dp0.."
if not exist "patch\apply-patch.js" (
    echo [ERROR] patch\apply-patch.js not found under %CD%
    exit /b 1
)

rem ---- locate node: PATH -> WorkBuddy managed -> Program Files ----
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
    exit /b 1
)
echo [OK] Node.js: !NODE!

if exist "%~dp0patch-run.log" del "%~dp0patch-run.log"

echo ==== apply-patch.js ==== >> "%~dp0patch-run.log"
"!NODE!" "patch\apply-patch.js" >> "%~dp0patch-run.log" 2>&1
set "E1=!errorlevel!"
echo ==== patch-extra.js ==== >> "%~dp0patch-run.log"
"!NODE!" "patch\patch-extra.js" >> "%~dp0patch-run.log" 2>&1
set "E2=!errorlevel!"
echo ==== patch-model-yamls.js ==== >> "%~dp0patch-run.log"
"!NODE!" "tools\patch-model-yamls.js" >> "%~dp0patch-run.log" 2>&1
set "E3=!errorlevel!"

echo.
echo apply-patch=!E1!  patch-extra=!E2!  model-yamls=!E3!
echo Full log: %~dp0patch-run.log
exit /b 0
