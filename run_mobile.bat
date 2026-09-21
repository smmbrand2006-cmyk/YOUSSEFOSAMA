@echo off
chcp 65001 > nul
set "PATH=C:\Windows\System32;C:\Windows\System32\WindowsPowerShell\v1.0;C:\Windows;D:\flutter_windows_3.24.5-stable\flutter\bin;C:\Program Files\Java\jdk-21.0.11\bin;%PATH%"
set "JAVA_HOME=C:\Program Files\Java\jdk-21.0.11"
set "ANDROID_HOME=C:\Users\youse\AppData\Local\Android\Sdk"

echo ========================================================
echo   🚀 تشغيل تطبيق YOUSSEF APP على Google Chrome (Web)
echo   🌐 الرابط: http://localhost:5000
echo ========================================================

cd /d "%~dp0youssef_app_mobile"

call flutter run -d chrome --web-port=5000

pause
