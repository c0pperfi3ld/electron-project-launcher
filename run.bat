@echo off
rem ── Project Nexus v5 launcher ─────────────────────────────────────────────
rem Uses a local Electron install when present, otherwise the one already in
rem the parent project folder. Never writes outside updated\config.
setlocal
set "DIR=%~dp0"
set "APP=%DIR%."

if exist "%DIR%node_modules\electron\dist\electron.exe" (
  start "" "%DIR%node_modules\electron\dist\electron.exe" "%APP%"
  goto :eof
)
if exist "%DIR%..\node_modules\electron\dist\electron.exe" (
  start "" "%DIR%..\node_modules\electron\dist\electron.exe" "%APP%"
  goto :eof
)

echo No Electron found - installing dependencies (one time)...
cd /d "%DIR%"
call npm install
if exist "%DIR%node_modules\electron\dist\electron.exe" (
  start "" "%DIR%node_modules\electron\dist\electron.exe" "%APP%"
) else (
  echo Install failed. Run "npm install" manually inside updated\ then retry.
  pause
)
endlocal
