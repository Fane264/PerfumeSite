@echo off
REM ============================================================
REM  DecantLux - pornire in mod PRODUCTIE (optimizat)
REM  Face build-ul aplicatiei, apoi o porneste.
REM  Mai lent la pornire, dar ruleaza la viteza reala.
REM ============================================================
setlocal
chcp 65001 >nul
cd /d "%~dp0"

echo.
echo ===========================================
echo   DecantLux - build + start (productie)
echo ===========================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo [EROARE] Node.js nu este instalat sau nu este in PATH.
  echo Descarca-l de la https://nodejs.org si reincearca.
  pause
  exit /b 1
)

REM --- Opreste orice server vechi de pe portul 3000 (evita EPERM la Prisma) ---
echo Eliberez portul 3000 ^(opresc serverul vechi daca exista^)...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3000 " ^| findstr "LISTENING"') do (
  taskkill /F /PID %%a >nul 2>nul
)

if not exist "node_modules" (
  echo [1/2] Instalez dependentele ^(npm install^)...
  call npm install
  if errorlevel 1 (
    echo [EROARE] npm install a esuat.
    pause
    exit /b 1
  )
)

echo [1/2] Build productie ^(prisma generate + next build^)...
call npm run build
if errorlevel 1 (
  echo [EROARE] Build-ul a esuat.
  pause
  exit /b 1
)

echo [2/2] Pornesc serverul de productie...
echo.
echo   Deschide in browser: http://localhost:3000
echo   Apasa Ctrl+C pentru a opri serverul.
echo.
call npm run start

endlocal
