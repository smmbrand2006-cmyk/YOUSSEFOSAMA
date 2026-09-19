@echo off
chcp 65001 > nul
echo ========================================================
echo        🚀 تشغيل تطبيق Youssef App محلياً
echo ========================================================
echo.
cd /d "%~dp0"
echo جاري تشغيل السيرفر المحلي... افتح المتصفح على http://localhost:3000
echo.
call npm run dev
pause
