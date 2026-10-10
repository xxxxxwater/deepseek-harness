@echo off
setlocal
rem This helper lives in the installed application's resources\pg-harness directory.
set "TASK_APP=%~dp0..\..\PureGamma Harness.exe"
if not exist "%TASK_APP%" (
  echo Run this helper from the installed PureGamma Harness resources folder.
  pause
  exit /b 1
)
set "ELECTRON_RUN_AS_NODE=1"
"%TASK_APP%" "%~dp0install.mjs"
if errorlevel 1 (
  echo Plugin installation failed. Quit Harness and retry.
  pause
  exit /b 1
)
set "ELECTRON_RUN_AS_NODE="
start "" "%TASK_APP%"
endlocal
