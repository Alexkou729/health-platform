@echo off
setlocal

REM ==================== CONFIG (edit these 3 lines) ====================
set "GITHUB_USER=Alexkou729"
set "REPO_NAME=health-platform"
set "BRANCH=master"
REM =====================================================================

cd /d "%~dp0"

echo.
echo ============================================
echo   Health Platform - Push to GitHub
echo ============================================
echo   Repo: https://github.com/%GITHUB_USER%/%REPO_NAME%.git
echo   Branch: %BRANCH%
echo ============================================
echo.

REM --- locate git ---
set "GIT_CMD=git"
where git >nul 2>nul
if %errorlevel% neq 0 (
  if exist "C:\Program Files\Git\cmd\git.exe" set "GIT_CMD=C:\Program Files\Git\cmd\git.exe"
  if exist "C:\Program Files (x86)\Git\cmd\git.exe" set "GIT_CMD=C:\Program Files (x86)\Git\cmd\git.exe"
)
"%GIT_CMD%" --version >nul 2>nul
if %errorlevel% neq 0 (
  echo [ERROR] Git not found. Please install Git:
  echo   https://git-scm.com/download/win
  pause
  exit /b 1
)

REM --- ensure it is a git repo ---
"%GIT_CMD%" rev-parse --is-inside-work-tree >nul 2>nul
if %errorlevel% neq 0 (
  echo [ERROR] Not a git repository.
  pause
  exit /b 1
)

REM --- commit any changes ---
echo Step 1/3: Committing changes...
"%GIT_CMD%" add -A
"%GIT_CMD%" commit -m "update" >nul 2>nul

REM --- add remote if missing ---
echo Step 2/3: Checking remote...
"%GIT_CMD%" remote get-url origin >nul 2>nul
if %errorlevel% neq 0 (
  "%GIT_CMD%" remote add origin https://github.com/%GITHUB_USER%/%REPO_NAME%.git
  echo   remote 'origin' added.
) else (
  echo   remote 'origin' already exists.
)

REM --- push ---
echo Step 3/3: Pushing to GitHub...
echo.
echo   Username: %GITHUB_USER%
echo   Password: paste your GitHub Personal Access Token (NOT your login password)
echo.
"%GIT_CMD%" push -u origin %BRANCH%

if %errorlevel% neq 0 (
  echo.
  echo [PUSH FAILED] Check:
  echo   1. Did you create the repo '%REPO_NAME%' on github.com/new ?
  echo   2. Can you reach github.com ? (China may need VPN)
  echo   3. Did your token have 'repo' permission ?
  echo   4. Is the username '%GITHUB_USER%' correct ?
) else (
  echo.
  echo ============================================
  echo   PUSH SUCCESS !
  echo   See builds at:
  echo   https://github.com/%GITHUB_USER%/%REPO_NAME%/actions
  echo   Artifacts: windows-desktop / macos-desktop
  echo ============================================
)

echo.
pause
