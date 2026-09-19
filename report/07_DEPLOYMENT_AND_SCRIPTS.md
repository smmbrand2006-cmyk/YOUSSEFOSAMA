# 🚀 دليل التشغيل، النشر، والسكربتات (Deployment, Operation & Scripts Guide)

يوضح هذا الدليل كيفية تشغيل التطبيق محلياً، إنتاج النسخة الثابتة المجمعة، نشره على خدمات الاستضافة السحابية مثل Cloudflare Pages، واستخدام أدوات الأتمتة المدمجة.

---

## 💻 1. التشغيل والتطوير المحلي (Local Development)

### المتطلبات الأساسية:
- بيئة **Node.js** (الإصدار 18 أو 20 فما فوق).
- مدير الحزم **npm**.

### خطوات التشغيل:
1. **تثبيت الحزم (Dependencies Installation)**:
   ```bash
   npm install
   ```
   *أو بالنقر المزدوج على الملف الجاهز: [`install.bat`](file:///c:/Users/youse/OneDrive/Desktop/youssef%20app/install.bat)*

2. **ضبط ملف متغيرات البيئة (`.env.local`)**:
   تأكد من وجود ملف `.env.local` في مجلد المشروع الرئيسي ويحتوي على مفاتيح Firebase:
   ```env
   NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   NEXT_PUBLIC_FIREBASE_DATABASE_URL=https://your_project-default-rtdb.firebaseio.com
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
   ```

3. **بدء تشغيل خادم التطوير (Start Dev Server)**:
   ```bash
   npm run dev
   ```
   *أو بالنقر المزدوج على الملف الجاهز: [`run_dev.bat`](file:///c:/Users/youse/OneDrive/Desktop/youssef%20app/run_dev.bat)*
   - يفتح التطبيق مباشرة على الرابط: `http://localhost:3000`

---

## 📦 2. البناء للإنتاج والتصدير الثابت (Production Build)

تمت تهيئة المشروع في [`next.config.ts`](file:///c:/Users/youse/OneDrive/Desktop/youssef%20app/next.config.ts) ليعتمد خاصية التصدير الثابت الكامل (`output: 'export'`).

### تنفيذ أمر البناء:
```bash
npm run build
```

### نتيجة البناء:
- يقوم محرك Next.js بتجميع كافة مكونات React وتوليد كود HTML و CSS و JavaScript فائق السرعة داخل مجلد:
  `c:\Users\youse\OneDrive\Desktop\youssef app\out`
- هذا المجلد (`out/`) مستقل بذاته تماماً وجاهز للنشر على أي خدمة استضافة ثابتة بدون الحاجة لخادم Node.js قيد التشغيل.

---

## ☁️ 3. النشر على استضافة Cloudflare Pages

تم تضمين ملف تكوين Cloudflare الرسمي [`wrangler.jsonc`](file:///c:/Users/youse/OneDrive/Desktop/youssef%20app/wrangler.jsonc):
```jsonc
{
  "name": "youssef-app",
  "compatibility_date": "2024-09-23",
  "pages_build_output_dir": "./out"
}
```

### كيفية حل مشكلة الـ Reload (Point Zero Architecture):
- في الاستضافات الثابتة، يؤدي طلب روابط فرعية مثل `/chat/chat_123` إلى خطأ 404 أو حلقة إعادة تحميل متكررة.
- تم حل هذه المشكلة بالكامل عن طريق إبقاء رابط المحادثة دائماً نظيفاً على `/chat` والاعتماد على الحالة الداخلية (`activeChat`).
- عند قيام المستخدم بالضغط على إعادة التحميل (F5 / Reload)، يعود المتصفح فوراً وبسرعة فائقة (في أقل من 50ms) إلى صفحة `/chat` الترحيبية ("نقطة الصفر") بدون أي خطأ أو تهنيج.

---

## 🤖 4. سكربتات الأتمتة والمزامنة مع GitHub

يحتوي المشروع على أدوات مدمجة لحفظ ورفع التعديلات إلى مستودع GitHub الرسمي (`https://github.com/smmbrand2006-cmyk/YOUSSEFOSAMA.git`):

### أ. سكربت الرفع الفوري المباشر (`scripts/sync-github.js`):
يقوم بإضافة الملفات، عمل Commit مع رسالة، ورفعها إلى الفرع الرئيسي `main`:
```bash
node scripts/sync-github.js "رسالة التعديل الخاصة بك"
```
*أو بالنقر على: [`save_to_github.bat`](file:///c:/Users/youse/OneDrive/Desktop/youssef%20app/save_to_github.bat)*

### ب. بوت الحفظ التلقائي في الخلفية (`scripts/github-bot.js`):
يمكن تشغيل البوت لمراقبة التغييرات تلقائياً وحفظها دورياً:
```bash
npm run auto-save
```
أو
```bash
node scripts/github-bot.js --watch
```

### ج. سكربت تنظيف الشاتات التجريبية القديمة (`scripts/clean-test-chats.js`):
يقوم بحذف كافة الشاتات والرسائل التجريبية القديمة من Cloud Firestore لبدء قاعدة البيانات نظيفة 100%:
```bash
node scripts/clean-test-chats.js
```

### د. سكربت توليد أيقونات وتجهيز اللوجو (`scripts/setup-logo.js`):
يقوم بتوزيع اللوجو الرسمي المعدني 3D وتوليد الأيقونات بكافة الأحجام المطلوبة للمتصفح والـ PWA و Favicon:
```bash
node scripts/setup-logo.js
```
