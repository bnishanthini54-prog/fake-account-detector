@echo off
echo ===================================================
echo   SentiShield Git Repository Setup
echo ===================================================
echo.

:: Check if git is installed
where git >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Git is not installed on your system!
    echo Please download and install Git from: https://git-scm.com/
    echo.
    pause
    exit /b
)

:: Initialize git repository
if not exist .git (
    echo Initializing local Git repository...
    git init
) else (
    echo Git repository already initialized.
)

:: Add files
echo Adding files to Git...
git add .

:: Commit
echo Creating initial commit...
git commit -m "Initial commit of Fake Social Media Accounts Detection project"

echo.
echo ===================================================
echo   Local Git Repository Ready!
echo ===================================================
echo.
echo Now, follow these steps to upload your project to GitHub:
echo.
echo 1. Go to https://github.com/new and sign in.
echo 2. Name your repository (e.g., "fake-account-detector") and click "Create repository".
echo 3. Copy the URL of your new repository (looks like: https://github.com/your-username/fake-account-detector.git).
echo 4. Open Command Prompt in this folder and run these two commands:
echo.
echo    git branch -M main
echo    git remote add origin YOUR_GITHUB_REPOSITORY_URL
echo    git push -u origin main
echo.
echo ===================================================
pause
