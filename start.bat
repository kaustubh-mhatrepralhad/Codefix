@echo off
setlocal enabledelayedexpansion
TITLE CodeFix Launcher
color 0A

echo ==================================================
echo.
echo        CODEFIX - DEBUG. COMPUTE. CONQUER.
echo               PREPARING JOURNEY...
echo.
echo ==================================================
echo.

:: Clean up any hung node processes from previous sessions to prevent EADDRINUSE errors
echo [SYSTEM] Clearing previous session data...
taskkill /F /IM node.exe >nul 2>&1
echo.

:: Check if Node.js is installed
node -v >nul 2>&1
IF %ERRORLEVEL% NEQ 0 (
    color 0E
    echo [WARNING] Node.js is not installed on this system! 
    echo CodeFix requires Node.js to run.
    echo.
    
    :: Check if winget is available for auto-installation
    winget --version >nul 2>&1
    IF !ERRORLEVEL! EQU 0 (
        echo Good news! We can install Node.js for you automatically right now.
        echo Press any key to start the installation...
        pause >nul
        echo Installing Node.js... (A Windows prompt may ask for permission)
        winget install OpenJS.NodeJS -e --silent
        
        color 0A
        echo.
        echo [SUCCESS] Node.js has been installed!
        echo.
        echo ==================================================
        echo IMPORTANT: Please close this window, then double-click 
        echo start.bat again so the new changes take effect!
        echo ==================================================
        pause
        exit /b
    ) ELSE (
        color 0C
        echo Please download and install it manually from: https://nodejs.org
        pause
        exit /b
    )
)

echo [1/3] Updating Frontend Modules...
call npm install --no-fund --no-audit

echo.
echo [2/3] Updating Backend Database Modules...
cd backend
call npm install --no-fund --no-audit
cd ..

echo.
echo [3/3] Booting Servers...
:: Start the Node.js backend in a separate minimized command window
start /min "CodeFix Database Server" cmd /c "cd backend && node server.js"

:: Give the database server 2 seconds to initialize
timeout /t 2 /nobreak >nul

echo.
echo ==================================================
echo ALL SYSTEMS GO. LAUNCHING BROWSER...
echo (Do not close this window while playing CodeFix)
echo ==================================================
echo.

:: Start the Vite frontend server. (Vite is already configured to open the browser automatically)
call npm run dev
