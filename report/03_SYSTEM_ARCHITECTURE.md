# 🏛️ معمارية النظام وتدفق البيانات (System Architecture & Data Flow)

تعتمد معمارية **Youssef App** على نموذج معماري موزع بدون خادم مركزي تقليدي (**Serverless Real-Time Architecture**)، مما يمنح التطبيق سرعة قصوى في معالجة البيانات وانعدام أوقات التوقف (High Availability).

---

## 1. مخطط المعمارية الشامل (System Architecture Diagram)

```mermaid
graph TD
    subgraph ClientLayer ["طبقة العميل (Client Frontend - Next.js 15 & React 19)"]
        UI_Desktop["سطح المكتب والمحاكي (AppNavRail + AppHeader + Split Sidebar)"]
        UI_Mobile["الموبايل (3-Tier Header + MobileBottomNav + FAB)"]
        
        subgraph Providers ["طبقة إدارة الحالة (React Context Providers)"]
            AuthCtx["AuthContext\n(إدارة جلسة المستخدم)"]
            ChatCtx["ChatContext\n(إدارة المحادثات الحالية)"]
            CallCtx["CallContext\n(إدارة المكالمات والحالات)"]
        end
        
        UI_ChatCanvas["لوحة المحادثة (ChatClient)\nعرض الرسائل، الإيموجي، المرفقات، التسجيل"]
        UI_CallOverlay["نافذة الاتصال (CallOverlay)\nرنين، إجابة، إنهاء، كتم، كاميرا"]
    end

    subgraph FirebaseLayer ["طبقة الخدمات السحابية (Google Firebase BaaS)"]
        FB_Auth["Firebase Authentication\n(مصادقة الجلسات وحماية الحسابات)"]
        FB_Firestore["Cloud Firestore\n(مجموعات users, chats, messages, calls)"]
        FB_Realtime["Firebase Realtime Database\n(حالة التواجد Presence & يكتب الآن Typing)"]
    end

    subgraph P2P_Layer ["شبكة الاتصال المباشر (WebRTC Peer-to-Peer)"]
        Caller["المتصل (Device A)"]
        Callee["المستقبل (Device B)"]
        Caller <-->|"تدفق صوت وفيديو P2P مشفر (STUN/ICE)"| Callee
    end

    UI_Desktop --> Providers
    UI_Mobile --> Providers
    Providers --> FB_Auth
    Providers --> FB_Firestore
    Providers --> FB_Realtime
    CallCtx -->|"تبادل الإشارات (Signaling Offer/Answer)"| FB_Firestore
    CallCtx -.-> P2P_Layer
```

---

## 2. تدفق المراسلة الفورية في نفس الثانية (Real-Time Messaging Flow)

```mermaid
sequenceDiagram
    autonumber
    actor UserA as المستخدم أ (المرسل)
    participant UI as واجهة التطبيق (ChatClient)
    participant Firestore as قاعدة بيانات Cloud Firestore
    actor UserB as المستخدم ب (المستقبل)

    UserA->>UI: كتابة نص الرسالة أو إرفاق صورة والضغط على إرسال
    UI->>UI: حقن الرسالة تفاؤلياً في الواجهة فوراً (Optimistic UI - معرف مؤقت opt_id)
    UI->>Firestore: استدعاء sendMessage() وحفظ المستند في chats/{chatId}/messages
    Firestore-->>UserB: بث الرسالة فوراً عبر مستمع onSnapshot (خلال أجزاء من الثانية)
    UserB->>Firestore: استدعاء markChatAsRead() وتحديث حالة القراءة
    Firestore-->>UserA: تحديث علامة الصح المزدوج الأخضر (done_all)
```

### مزايا هذا النموذج:
1. **استجابة فورية بدون انتظار**: يرى المرسل رسالته تظهر فوراً قبل حتى أن يعود رد السيرفر.
2. **استماع دائم خفيف**: مستمع `onSnapshot` يستهلك أقل حجم بيانات ممكن ويرسل فقط التغييرات الجديدة (Delta updates).

---

## 3. تدفق مكالمات الصوت والفيديو (WebRTC Signaling Flow)

تتم إشارات الاتصال (Signaling) عبر مجموعة `calls` في Firestore دون الحاجة لسيرفرات WebSocket مكلفة:

```mermaid
sequenceDiagram
    autonumber
    actor Caller as المتصل (Caller)
    participant Firestore as Firestore (Signaling Server)
    actor Receiver as المستقبل (Receiver)

    Caller->>Caller: فتح الكاميرا/المايك وإنشاء RTCPeerConnection
    Caller->>Caller: إنشاء عرض اتصال (SDP Offer)
    Caller->>Firestore: إنشاء مستند جديد في calls/{callId} مع Offer
    Firestore-->>Receiver: استشعار مستند الاتصال الجديد وتفعيل CallOverlay (رنين)
    Receiver->>Receiver: الضغط على موافقة (Accept) وفتح المايك/الكاميرا
    Receiver->>Receiver: إنشاء رد الاتصال (SDP Answer)
    Receiver->>Firestore: تحديث مستند المكالمة بحالة accepted و Answer
    Caller->>Firestore: استلام Answer وإضافته إلى RemoteDescription
    Caller->>Firestore: إرسال مرشحي ICE Candidates
    Receiver->>Firestore: تبادل مرشحي ICE Candidates
    Note over Caller,Receiver: بدء تدفق الصوت والفيديو مباشرة (P2P Stream)
```

---

## 4. نظام أكواد المستخدمين الفريدة (Unique User Code System)

1. **التوليد**: عند تسجيل أي حساب جديد، يتم استدعاء دالة توليد رقمية ذكية تنتج كوداً فريداً من 6 خانات (مثل `#742195`).
2. **التحقق من عدم التكرار**: يفحص Firestore وجود الكود مسبقاً، وإذا وجد يعيد التوليد لضمان عدم تكرار أي كود نهائياً.
3. **البحث المباشر**: يمكن لأي شخص كتابة كود المستخدم مثل `742195` في شريط البحث للوصول للشخص في جزء من الثانية والبدء في محادثته.
4. **حساب الدعم الفني الرسمي (`#123`)**: كود ثابت ومحجوز لحساب الدعم الفني، متاح لجميع المستخدمين ومثبت في أعلى قائمة المحادثات.

---

## 5. نظام الحظر وحماية الخصوصية (Blocking & Privacy Layer)

- يحتوي مستند كل مستخدم في مجموعة `users` على مصفوفة `blockedUsers: string[]`.
- **عند الحظر**: يضاف معرف الشخص (`targetUid`) للمصفوفة.
- **التأثير الفوري**:
  - يظهر وسم `(محظور 🚫)` بجانب اسم المستخدم.
  - يتم تعطيل أزرار الاتصال الصوتي والمرئي فوراً.
  - يتم منع إرسال الرسائل للشخص المحظور مع رسالة تنبيه واضحة.
  - يمكن فك الحظر في أي وقت بنقرة واحدة من شاشة الملف الشخصي.
