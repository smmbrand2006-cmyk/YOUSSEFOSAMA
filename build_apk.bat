@echo off
chcp 65001 > nul
echo ========================================================
echo  🚀 جاري بناء تطبيق YOUSSEF APP لأندرويد (Release APK)
echo ========================================================

set "PATH=C:\Users\youse\flutter\bin;C:\Program Files\Git\cmd;C:\Windows\System32;C:\Windows;C:\Program Files\Java\jdk-21.0.11\bin;%PATH%"
set "JAVA_HOME=C:\Program Files\Java\jdk-21.0.11"
set "ANDROID_HOME=C:\Users\youse\AppData\Local\Android\Sdk"

cd /d "%~dp0youssef_app_mobile"

echo ⚡ جاري بناء نسخة APK سريعة وخفيفة (arm64-v8a) بمساحة ~22.7 ميجا...
call flutter build apk --release --target-platform android-arm64 --android-skip-build-dependency-validation

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ✅ تم بناء تطبيق الأندرويد فائق السرعة والخفة بنجاح!
    echo 📦 جاري نسخ ملف الـ APK إلى مجلد الموقع العام وسطح المكتب...
    copy /y "build\app\outputs\flutter-apk\app-arm64-v8a-release.apk" "..\public\youssef-app.apk"
    copy /y "build\app\outputs\flutter-apk\app-arm64-v8a-release.apk" "%USERPROFILE%\OneDrive\Desktop\YOUSSEF_APP_LIGHT.apk" 2>nul || copy /y "build\app\outputs\flutter-apk\app-arm64-v8a-release.apk" "%USERPROFILE%\Desktop\YOUSSEF_APP_LIGHT.apk" 2>nul
    echo.
    echo 🎉 ملف الـ APK متاح الآن على سطح المكتب باسم: YOUSSEF_APP_LIGHT.apk (22.7MB)
    echo 🌐 ومتاح للتحميل المباشر من الموقع عبر: /youssef-app.apk
) else (
    echo.
    echo ❌ حدث خطأ أثناء البناء. يرجى مراجعة الرسائل أعلاه.
)

pause

