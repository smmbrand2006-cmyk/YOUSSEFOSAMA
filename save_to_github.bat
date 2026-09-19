@echo off
chcp 65001 > nul
cd /d "%~dp0"
node scripts/github-bot.js
echo.
pause
