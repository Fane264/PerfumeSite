@echo off
REM ============================================================
REM  DecantLux - pornire rapida (development)
REM  Dublu-click pe acest fisier SAU ruleaza: .\start.bat
REM ============================================================
setlocal
chcp 65001 >nul
cd /d "%~dp0"

echo.
echo ===========================================
echo   DecantLux - se porneste serverul local
echo ===========================================
echo.

REM --- 1. Verifica Node.js ---
where node >nul 2>nul
if errorlevel 1 (
  echo [EROARE] Node.js nu este instalat sau nu este in PATH.
  echo Descarca-l de la https://nodejs.org si reincearca.
  echo.
  pause
  exit /b 1
)

REM --- 2. Opreste orice server vechi de pe portul 3000 ---
REM   (altfel Prisma da EPERM pentru ca motorul e blocat de procesul vechi)
echo [1/4] Eliberez portul 3000 ^(opresc serverul vechi daca exista^)...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3000 " ^| findstr "LISTENING"') do (
  taskkill /F /PID %%a >nul 2>nul
)

REM --- 3. Avertizare daca lipseste .env ---
if not exist ".env" (
  echo [ATENTIE] Nu exista fisierul .env. Aplicatia poate sa nu porneasca corect.
  echo Copiaza .env.example in .env si completeaza valorile.
  echo.
)

REM --- 4. Instaleaza dependentele daca lipsesc ---
if not exist "node_modules" (
  echo [2/4] Instalez dependentele ^(npm install^)...
  call npm install
  if errorlevel 1 (
    echo [EROARE] npm install a esuat.
    pause
    exit /b 1
  )
) else (
  echo [2/4] Dependentele sunt deja instalate.
)

REM --- 5. Genereaza clientul Prisma (best-effort) ---
REM   Daca esueaza (ex. fisier blocat), continuam: clientul exista deja.
echo [3/4] Generez clientul Prisma ^(optional^)...
call npx prisma generate
if errorlevel 1 (
  echo [ATENTIE] prisma generate nu a reusit - continui cu clientul existent.
)

REM --- 6. Porneste serverul de development ---
echo [4/4] Pornesc serverul...
echo.
echo   Deschide in browser: http://localhost:3000
echo   Apasa Ctrl+C pentru a opri serverul.
echo.
call npm run dev

endlocal
