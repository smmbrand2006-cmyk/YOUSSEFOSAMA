# Youssef App 🚀 (يوسف اب)

تطبيق محادثات متكامل فوري على طريقة واتساب، مبني بأحدث التقنيات:
**Next.js 15 (App Router) + React 19 + TypeScript + Firebase**.

---

## ⚡ المميزات الرئيسية (بدون Firebase Storage نهائياً)

- 🔢 **تسجيل الدخول بكود أو رقم خاص**: اختر أي كود أو رقم تريده كمعرّف لحسابك بدون الحاجة لرقم هاتف حقيقي وبدون SMS.
- 💬 **محادثات فورية مباشرة**: رسائل نصية سريعة ومحدثة لحظياً عبر Cloud Firestore.
- 📷 **مشاركة صور مشفرة (Base64 Inline)**: إرسال الصور مباشرة داخل الرسائل كشفرة Base64 مضغوطة وبجودة محسنة بدون الحاجة لأي قاعدة بيانات صور (Zero Storage).
- 📞 **مكالمات صوت وفيديو عبر WebRTC**: اتصال مباشر P2P بجودة عالية بدون وسيط تخزين.
- 👥 **نظام طلبات الصداقة والبحث**: ابحث عن أي شخص بكوده الفريد وأرسل طلب صداقة ليتم إنشاء المحادثة فور القبول.
- 🟢 **حالة الاتصال الفوري (Presence)**: ظهور حالة المتصل Online / Offline ووقت آخر ظهور عبر Realtime Database.
- ⌨️ **مؤشر الكتابة (Typing...)**: إشعار لحظي عند كتابة الطرف الآخر.
- ↩️ **الردود والتفاعلات**: الرد على رسائل محددة وإضافة تفاعلات الإيموجي (❤️, 😂, 👍, etc).
- 🗑️ **حذف الرسائل**: الحذف للجميع أو الحذف لنفسي.
- 📌 **تثبيت وكتم المحادثات**: إمكانية تثبيت المحادثات الهامة في القمة.
- 🎨 **تصميم عصري فخم**: واجهة واضحة وأنيقة وسريعة الاستجابة.

---

## 🛠️ الخدمات المطلوبة في Firebase (مجاني 100% على باقة Spark)

تحتاج فقط لتفعيل 3 خدمات في مشروعك على [Firebase Console](https://console.firebase.google.com):

1. **Authentication**:
   - فعّل **Anonymous** (لتسجيل الدخول بالأكواد)
   - فعّل **Google** (اختياري)
2. **Cloud Firestore**:
   - أنشئ قاعدة البيانات في وضع البدء (Test Mode أو استخدم القواعد في `firestore.rules`)
3. **Realtime Database**:
   - أنشئها لتفعيل حالة الاتصال (Online/Offline) ومؤشر الكتابة (Typing...)

> [!NOTE]
> **Firebase Storage غير مطلوب إطلاقاً!** لا تحتاج لربط بطاقة بنكية أو تفعيل باقة Blaze.

---

## 🚀 طريقة التشغيل

### 1. تثبيت الحزم:
افتح موجه الأوامر (Terminal) في مسار المشروع ونفذ:
```bash
npm install
```

### 2. إعداد مفاتيح Firebase:
أنشئ ملف باسم `.env.local` بجانب `package.json` وضع فيه المفاتيح الخاصة بمشروعك (من إعدادات Firebase Console):
```env
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSy...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-app.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:...
NEXT_PUBLIC_FIREBASE_DATABASE_URL=https://your-app-default-rtdb.firebaseio.com
```

### 3. تشغيل السيرفر المحلي:
```bash
npm run dev
```

افتح المتصفح على: [http://localhost:3000](http://localhost:3000)
