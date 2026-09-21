@echo off
chcp 65001 > nul
echo ========================================================
echo  🚀 جاري بناء تطبيق YOUSSEF APP لأندرويد (Release APK)
echo ========================================================

set "PATH=C:\Windows\System32;C:\Windows;D:\flutter_windows_3.24.5-stable\flutter\bin;C:\Program Files\Java\jdk-21.0.11\bin;%PATH%"
set "JAVA_HOME=C:\Program Files\Java\jdk-21.0.11"
set "ANDROID_HOME=C:\Users\youse\AppData\Local\Android\Sdk"

cd /d "%~dp0youssef_app_mobile"

call flutter build apk --release

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ✅ تم بناء تطبيق الأندرويد بنجاح!
    echo 📦 جاري نسخ ملف الـ APK إلى مجلد الموقع العام للتحميل المباشر...
    copy /y "build\app\outputs\flutter-apk\app-release.apk" "..\public\youssef-app.apk"
    echo.
    echo 🎉 ملف الـ APK جاهز الآن للتحميل المباشر من الموقع عبر: /youssef-app.apk
) else (
    echo.
    echo ❌ حدث خطأ أثناء البناء. يرجى مراجعة الرسائل أعلاه.
)

pause
