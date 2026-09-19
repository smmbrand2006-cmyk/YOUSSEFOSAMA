# 🗄️ هيكل قواعد البيانات وإعدادات Firebase (Database & Firebase Architecture)

يعتمد التطبيق على منظومة بيانات هجينة تجمع بين **Cloud Firestore** لتخزين البيانات المستندية الدائمة، و **Firebase Realtime Database** للعمليات اللحظية الخفيفة وسريعة التغير.

---

## 1. هيكل مجموعات Cloud Firestore (Collections Schema)

### أ. مجموعة المستخدمين (`users`)
المسار: `/users/{uid}`

| الحقل | النوع (Type) | الوصف |
| :--- | :--- | :--- |
| `uid` | `string` | المعرف الفريد للمستخدم الصادر من Firebase Auth. |
| `displayName` | `string` | الاسم الظاهر للمستخدم في المحادثات. |
| `userCode` | `string` | الكود التعريفي الفريد (مكون من 6 أرقام مثل `831942` أو `123` للدعم). |
| `email` | `string` | البريد الإلكتروني للمستخدم. |
| `bio` | `string` | النبذة التعريفية أو الحالة الشخصية. |
| `isOnline` | `boolean` | حالة الاتصال الحالية. |
| `lastSeen` | `number / Timestamp` | توقيت آخر ظهور بالمللي ثانية. |
| `blockedUsers` | `string[]` | مصفوفة تحتوي على معرفات المستخدمين المحظورين من قبل هذا الحساب. |
| `createdAt` | `Timestamp` | تاريخ ووقت إنشاء الحساب. |

---

### ب. مجموعة المحادثات (`chats`)
المسار: `/chats/{chatId}`

| الحقل | النوع (Type) | الوصف |
| :--- | :--- | :--- |
| `id` | `string` | معرف المحادثة (مثال: `direct_uid1_uid2` أو `support_official_123_uid`). |
| `type` | `"direct" \| "group"` | نوع المحادثة (فردية مباشرة أو جماعية). |
| `participants` | `string[]` | مصفوفة تضم معرفات أطراف المحادثة (`uid`). |
| `participantNames` | `Map<uid, string>` | خريطة تربط كل معرف باسم صاحبه لعرض سريع وفوري. |
| `isSupport` | `boolean` | هل هي محادثة مع حساب الدعم الفني الرسمي (#123). |
| `lastMessage` | `Object` | كائن يحتوي على (`text`, `senderId`, `createdAt`) للمعاينة في القائمة. |
| `unreadCount` | `Map<uid, number>` | عدد الرسائل غير المقروءة لكل مستخدم في المحادثة. |
| `isPinned` | `Map<uid, boolean>` | حالة تثبيت المحادثة في المفضلة لدى كل مستخدم. |
| `createdAt` | `Timestamp` | تاريخ بدء المحادثة. |
| `updatedAt` | `Timestamp` | تاريخ آخر نشاط أو رسالة في المحادثة. |

---

### ج. المجموعة الفرعية للرسائل (`messages`)
المسار: `/chats/{chatId}/messages/{messageId}`

| الحقل | النوع (Type) | الوصف |
| :--- | :--- | :--- |
| `id` | `string` | معرف الرسالة التلقائي. |
| `senderId` | `string` | معرف الشخص الذي أرسل الرسالة. |
| `senderName` | `string` | اسم مرسل الرسالة. |
| `text` | `string` | المحتوى النصي للرسالة. |
| `mediaUrl` | `string (اختياري)` | نص الصورة المشفرة Base64 أو رابط الملف. |
| `messageType` | `"text" \| "image" \| "audio"` | نوع الرسالة. |
| `readBy` | `string[]` | قائمة بمعرفات المستخدمين الذين قرأوا هذه الرسالة (لتفعيل الصح المزدوج `done_all`). |
| `replyTo` | `Object (اختياري)` | كائن الرسالة الأصلية في حال كان هناك رد (Reply). |
| `createdAt` | `Timestamp` | توقيت إرسال الرسالة من السيرفر. |

---

### د. مجموعة إشارات المكالمات (`calls`)
المسار: `/calls/{callId}`

| الحقل | النوع (Type) | الوصف |
| :--- | :--- | :--- |
| `callerId` | `string` | معرف المتصل. |
| `callerName` | `string` | اسم المتصل. |
| `receiverId` | `string` | معرف متلقي الاتصال. |
| `type` | `"audio" \| "video"` | نوع المكالمة (صوتية فقط أو فيديو). |
| `status` | `"ringing" \| "accepted" \| "rejected" \| "ended"` | الحالة الراهنة للمكالمة. |
| `offer` | `Object (SDP)` | عرض الاتصال الأولي الصادر من المتصل. |
| `answer` | `Object (SDP)` | رد الاتصال الصادر من المستقبل عند قبول المكالمة. |
| `createdAt` | `number` | وقت بدء الاتصال بالمللي ثانية. |

المجموعات الفرعية لمرشحي الاتصال:
- `/calls/{callId}/callerCandidates/{candidateId}`
- `/calls/{callId}/receiverCandidates/{candidateId}`

---

## 2. هيكل Firebase Realtime Database

تستخدم للعمليات اللحظية فائقة السرعة بدون استهلاك لعمليات قراءة Firestore:

```json
{
  "status": {
    "<uid>": {
      "isOnline": true,
      "lastSeen": 1789835000000
    }
  },
  "typing": {
    "<chatId>": {
      "<uid>": true
    }
  }
}
```

- **`status/{uid}`**: يتم تحديثها تلقائياً عبر آلية `onDisconnect` المدمجة في Firebase؛ بحيث يتحول المستخدم إلى `offline` فور إغلاق المتصفح أو انقطاع الإنترنت.
- **`typing/{chatId}/{uid}`**: يتم تفعيلها عند كتابة المستخدم في الحقل وإزالتها بعد 1500 مللي ثانية من التوقف.

---

## 3. قواعد الأمان المشددة (Security Rules)

1. **قواعد Firestore (`firestore.rules`)**:
   - لا يمكن لأي مستخدم القراءة أو الكتابة في المحادثات إلا إذا كان معرفه مسجلاً في مصفوفة `participants`.
   - منع إنشاء رسائل بأسماء مستخدمين آخرين.
2. **قواعد Realtime Database (`database.rules.json`)**:
   - لا يمكن للمستخدم تعديل حالة التواجد إلا تحت العقدة المطابقة لمعرفه `auth.uid`.
