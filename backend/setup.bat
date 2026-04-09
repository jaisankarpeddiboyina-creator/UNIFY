@echo off
cd /d "C:\Products\unify\unify_final-1\unify_final\backend"
npm install
if %ERRORLEVEL% neq 0 (
  echo npm install failed
  exit /b 1
)
npm test
if %ERRORLEVEL% neq 0 (
  echo Tests failed
  exit /b 1
)
echo Backend setup complete
