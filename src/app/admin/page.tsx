"use client";

import React, { useState, useEffect } from "react";
import { 
  collection, 
  getDocs, 
  doc, 
  getDoc, 
  setDoc, 
  addDoc, 
  serverTimestamp, 
  query, 
  orderBy, 
  limit, 
  onSnapshot 
} from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import Link from "next/link";

interface UserItem {
  id: string;
  displayName: string;
  userCode: string;
  email: string;
  isOnline: boolean;
  photoUrl?: string;
  createdAt?: any;
}

interface AppUpdateConfig {
  version: string;
  title: string;
  notes: string;
  downloadUrl: string;
  isActive: boolean;
  updatedAt?: any;
}

export default function AdminDashboardPage() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [downloadsCount, setDownloadsCount] = useState<number>(1420);

  // App Update State
  const [updateConfig, setUpdateConfig] = useState<AppUpdateConfig>({
    version: "2.4.1",
    title: "تحديث جديد لتطبيق يوسف",
    notes: "تحسين سرعة إرسال الرسائل بالنت الضعيف، حفظ الشات على الجهاز، وتحديث صورة البروفايل.",
    downloadUrl: "https://github.com/smmbrand2006-cmyk/YOUSSEFOSAMA/releases/latest/download/YOUSSEF_APP.apk",
    isActive: true,
  });
  const [savingUpdate, setSavingUpdate] = useState(false);
  const [updateSuccess, setUpdateSuccess] = useState(false);

  // Broadcast Notification State
  const [notifTitle, setNotifTitle] = useState("");
  const [notifBody, setNotifBody] = useState("");
  const [notifType, setNotifType] = useState("info");
  const [sendingNotif, setSendingNotif] = useState(false);
  const [notifSuccess, setNotifSuccess] = useState(false);

  useEffect(() => {
    // 1. Fetch Users live
    const usersRef = collection(db, "users");
    const unsubscribeUsers = onSnapshot(usersRef, (snapshot) => {
      const userList: UserItem[] = [];
      snapshot.forEach((doc) => {
        const d = doc.data();
        userList.push({
          id: doc.id,
          displayName: d.displayName || "مستخدم",
          userCode: d.userCode || "----",
          email: d.email || "",
          isOnline: d.isOnline === true,
          photoUrl: d.photoUrl,
          createdAt: d.createdAt,
        });
      });
      setUsers(userList);
      setLoading(false);
    }, (err) => {
      console.error("Users fetch error:", err);
      setLoading(false);
    });

    // 2. Fetch Downloads stat
    const statsDocRef = doc(db, "system_stats", "downloads");
    getDoc(statsDocRef).then((snap) => {
      if (snap.exists()) {
        setDownloadsCount(snap.data().count || 1420);
      } else {
        setDoc(statsDocRef, { count: 1420, updatedAt: serverTimestamp() });
      }
    }).catch(() => {});

    // 3. Fetch App Update configuration
    const updateDocRef = doc(db, "system_settings", "app_update");
    getDoc(updateDocRef).then((snap) => {
      if (snap.exists()) {
        const data = snap.data() as AppUpdateConfig;
        setUpdateConfig(data);
      }
    }).catch(() => {});

    return () => {
      unsubscribeUsers();
    };
  }, []);

  // Save App Update to Firestore
  const handleSaveAppUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingUpdate(true);
    setUpdateSuccess(false);

    try {
      const updateDocRef = doc(db, "system_settings", "app_update");
      await setDoc(updateDocRef, {
        ...updateConfig,
        updatedAt: serverTimestamp(),
      });
      setUpdateSuccess(true);
      setTimeout(() => setUpdateSuccess(false), 4000);
    } catch (err) {
      alert("تعذر حفظ التحديث: " + err);
    } finally {
      setSavingUpdate(false);
    }
  };

  // Send Broadcast Notification
  const handleSendBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notifTitle.trim() || !notifBody.trim()) return;

    setSendingNotif(true);
    setNotifSuccess(false);

    try {
      const annRef = collection(db, "system_announcements");
      await addDoc(annRef, {
        title: notifTitle.trim(),
        message: notifBody.trim(),
        type: notifType,
        createdAt: serverTimestamp(),
      });

      setNotifSuccess(true);
      setNotifTitle("");
      setNotifBody("");
      setTimeout(() => setNotifSuccess(false), 4000);
    } catch (err) {
      alert("تعذر إرسال الإشعار: " + err);
    } finally {
      setSendingNotif(false);
    }
  };

  // Increment download counter
  const handleAddDownload = async () => {
    const newCount = downloadsCount + 1;
    setDownloadsCount(newCount);
    try {
      const statsDocRef = doc(db, "system_stats", "downloads");
      await setDoc(statsDocRef, { count: newCount, updatedAt: serverTimestamp() }, { merge: true });
    } catch (_) {}
  };

  const filteredUsers = users.filter((u) => 
    u.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.userCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const onlineCount = users.filter((u) => u.isOnline).length;

  return (
    <div className="min-h-screen bg-[#0B141A] text-[#E9EDEF] font-sans antialiased" dir="rtl">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#111B21]/95 backdrop-blur-md border-b border-[#202C33] px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#00A884] flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-[#00A884]/20">
              Y
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                لوحة تحكم تطبيق يوسف
                <span className="text-xs bg-[#00A884]/20 text-[#00A884] px-2.5 py-0.5 rounded-full border border-[#00A884]/30 font-medium">
                  لوحة الأدمن الرسمية
                </span>
              </h1>
              <p className="text-xs text-[#8696A0]">إدارة التحميلات، المستخدمين، التحديثات الفورية والإشعارات</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="text-xs text-[#8696A0] hover:text-[#00A884] transition-colors border border-[#202C33] px-3 py-1.5 rounded-lg hover:border-[#00A884]/40"
            >
              الرجوع للرئيسية 🌐
            </Link>
            <div className="flex items-center gap-2 bg-[#202C33] px-3 py-1.5 rounded-full text-xs">
              <span className="w-2 h-2 rounded-full bg-[#00A884] animate-pulse"></span>
              <span>خادم مباشر نشط</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* Metric Cards Grid */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Card 1: Users */}
          <div className="bg-[#111B21] border border-[#202C33] rounded-2xl p-5 hover:border-[#00A884]/40 transition-all shadow-sm">
            <div className="flex items-center justify-between text-[#8696A0] text-sm mb-2">
              <span>المستخدمين المسجلين</span>
              <span className="text-xl">👥</span>
            </div>
            <div className="text-3xl font-extrabold text-white">
              {loading ? "..." : users.length}
            </div>
            <div className="text-xs text-[#00A884] mt-2 font-medium">
              حساب مسجل في قاعدة البيانات
            </div>
          </div>

          {/* Card 2: Online */}
          <div className="bg-[#111B21] border border-[#202C33] rounded-2xl p-5 hover:border-[#00A884]/40 transition-all shadow-sm">
            <div className="flex items-center justify-between text-[#8696A0] text-sm mb-2">
              <span>المتصلين الآن</span>
              <span className="text-xl">🟢</span>
            </div>
            <div className="text-3xl font-extrabold text-[#00A884]">
              {loading ? "..." : onlineCount}
            </div>
            <div className="text-xs text-[#8696A0] mt-2 font-medium">
              نشط ومباشر عبر التطبيق
            </div>
          </div>

          {/* Card 3: Downloads */}
          <div className="bg-[#111B21] border border-[#202C33] rounded-2xl p-5 hover:border-[#00A884]/40 transition-all shadow-sm">
            <div className="flex items-center justify-between text-[#8696A0] text-sm mb-2">
              <span>مرات تحميل التطبيق</span>
              <span className="text-xl">📥</span>
            </div>
            <div className="flex items-baseline justify-between">
              <div className="text-3xl font-extrabold text-white">
                {downloadsCount.toLocaleString()}
              </div>
              <button 
                onClick={handleAddDownload}
                title="إضافة تحميل يدوي"
                className="text-xs bg-[#202C33] hover:bg-[#00A884] text-[#E9EDEF] hover:text-white px-2 py-1 rounded transition-colors"
              >
                +1
              </button>
            </div>
            <div className="text-xs text-[#8696A0] mt-2 font-medium">
              تثبيت رسمي لنسخة الموبايل والويب
            </div>
          </div>

          {/* Card 4: Status */}
          <div className="bg-[#111B21] border border-[#202C33] rounded-2xl p-5 hover:border-[#00A884]/40 transition-all shadow-sm">
            <div className="flex items-center justify-between text-[#8696A0] text-sm mb-2">
              <span>حالة التحديث الفوري</span>
              <span className="text-xl">🚀</span>
            </div>
            <div className="text-2xl font-bold text-[#E9EDEF]">
              {updateConfig.version}
            </div>
            <div className="text-xs flex items-center gap-1.5 mt-2 font-medium">
              <span className={`w-2 h-2 rounded-full ${updateConfig.isActive ? "bg-[#00A884]" : "bg-red-500"}`}></span>
              <span className={updateConfig.isActive ? "text-[#00A884]" : "text-red-400"}>
                {updateConfig.isActive ? "تنبيه التحديث مفعل داخل التطبيق" : "التنبيه متوقف"}
              </span>
            </div>
          </div>
        </section>

        {/* Action Controls: App Updates & Broadcast Notifications */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Form 1: App Updates Manager */}
          <div className="bg-[#111B21] border border-[#202C33] rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4 border-b border-[#202C33] pb-3">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🚀</span>
                <h2 className="text-lg font-bold text-white">إدارة التحديثات الفورية (App Updates)</h2>
              </div>
              <span className="text-xs text-[#8696A0]">ينبه مستخدمي التطبيق فوراً</span>
            </div>

            <form onSubmit={handleSaveAppUpdate} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#8696A0] mb-1">رقم الإصدار (Version)</label>
                  <input
                    type="text"
                    value={updateConfig.version}
                    onChange={(e) => setUpdateConfig({ ...updateConfig, version: e.target.value })}
                    className="w-full bg-[#0B141A] border border-[#202C33] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#00A884]"
                    placeholder="v2.4.1"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#8696A0] mb-1">حالة التنبيه للمستخدمين</label>
                  <select
                    value={updateConfig.isActive ? "true" : "false"}
                    onChange={(e) => setUpdateConfig({ ...updateConfig, isActive: e.target.value === "true" })}
                    className="w-full bg-[#0B141A] border border-[#202C33] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#00A884]"
                  >
                    <option value="true">نشط (إظهار بانر التحديث فوراً) ✅</option>
                    <option value="false">معطل (إخفاء التنبيه) ❌</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#8696A0] mb-1">عنوان التحديث</label>
                <input
                  type="text"
                  value={updateConfig.title}
                  onChange={(e) => setUpdateConfig({ ...updateConfig, title: e.target.value })}
                  className="w-full bg-[#0B141A] border border-[#202C33] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#00A884]"
                  placeholder="تحديث جديد لتطبيق يوسف"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#8696A0] mb-1">ملاحظات الإصدار والتحسينات (Release Notes)</label>
                <textarea
                  value={updateConfig.notes}
                  onChange={(e) => setUpdateConfig({ ...updateConfig, notes: e.target.value })}
                  rows={2}
                  className="w-full bg-[#0B141A] border border-[#202C33] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#00A884]"
                  placeholder="ما الجديد في هذا التحديث..."
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#8696A0] mb-1">رابط تحميل التحديث (APK / Store / Web)</label>
                <input
                  type="url"
                  value={updateConfig.downloadUrl}
                  onChange={(e) => setUpdateConfig({ ...updateConfig, downloadUrl: e.target.value })}
                  className="w-full bg-[#0B141A] border border-[#202C33] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#00A884]"
                  placeholder="https://..."
                  required
                />
              </div>

              {updateSuccess && (
                <div className="bg-[#00A884]/20 border border-[#00A884] text-[#00A884] text-xs px-3 py-2 rounded-lg text-center font-medium">
                  تم نشر التحديث وحفظ الإعدادات بنجاح! سيظهر لجميع المستخدمين فوراً 🎉
                </div>
              )}

              <button
                type="submit"
                disabled={savingUpdate}
                className="w-full bg-[#00A884] hover:bg-[#008f6f] disabled:opacity-50 text-white font-bold py-2.5 rounded-lg text-sm transition-colors shadow-md shadow-[#00A884]/20"
              >
                {savingUpdate ? "جاري النشر والحفظ..." : "نشر التحديث الفوري الآن 🚀"}
              </button>
            </form>
          </div>

          {/* Form 2: Broadcast Notifications */}
          <div className="bg-[#111B21] border border-[#202C33] rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4 border-b border-[#202C33] pb-3">
              <div className="flex items-center gap-2">
                <span className="text-2xl">📢</span>
                <h2 className="text-lg font-bold text-white">إرسال إشعار عام للمستخدمين (Broadcast)</h2>
              </div>
              <span className="text-xs text-[#8696A0]">يصل لجميع المستخدمين</span>
            </div>

            <form onSubmit={handleSendBroadcast} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#8696A0] mb-1">عنوان الإشعار</label>
                <input
                  type="text"
                  value={notifTitle}
                  onChange={(e) => setNotifTitle(e.target.value)}
                  className="w-full bg-[#0B141A] border border-[#202C33] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#00A884]"
                  placeholder="مثال: رسالة من إدارة تطبيق يوسف"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#8696A0] mb-1">نوع الإشعار</label>
                <select
                  value={notifType}
                  onChange={(e) => setNotifType(e.target.value)}
                  className="w-full bg-[#0B141A] border border-[#202C33] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#00A884]"
                >
                  <option value="info">إشعار عام (معلومات) ℹ️</option>
                  <option value="success">إشعار نجاح / مكافأة 🌟</option>
                  <option value="warning">تنبيه هام / صيانة ⚠️</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#8696A0] mb-1">نص الإشعار والمحتوى</label>
                <textarea
                  value={notifBody}
                  onChange={(e) => setNotifBody(e.target.value)}
                  rows={4}
                  className="w-full bg-[#0B141A] border border-[#202C33] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#00A884]"
                  placeholder="اكتب نص الإشعار هنا..."
                  required
                />
              </div>

              {notifSuccess && (
                <div className="bg-[#00A884]/20 border border-[#00A884] text-[#00A884] text-xs px-3 py-2 rounded-lg text-center font-medium">
                  تم إرسال الإشعار العام إلى جميع المشتركين بنجاح! 🔔
                </div>
              )}

              <button
                type="submit"
                disabled={sendingNotif}
                className="w-full bg-[#202C33] hover:bg-[#2A3942] border border-[#00A884]/50 hover:border-[#00A884] text-[#00A884] hover:text-white font-bold py-2.5 rounded-lg text-sm transition-all"
              >
                {sendingNotif ? "جاري الإرسال..." : "إرسال الإشعار للجميع الآن 📢"}
              </button>
            </form>
          </div>
        </section>

        {/* Users Table */}
        <section className="bg-[#111B21] border border-[#202C33] rounded-2xl p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                قائمة المشتركين والمستخدمين ({filteredUsers.length})
              </h2>
              <p className="text-xs text-[#8696A0]">جميع المستخدمين المسجلين في نظام تطبيق يوسف</p>
            </div>

            <div className="relative w-full sm:w-72">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="بحث بالاسم أو الكود #..."
                className="w-full bg-[#0B141A] border border-[#202C33] rounded-xl px-4 py-2 text-xs text-white placeholder-[#8696A0] focus:outline-none focus:border-[#00A884]"
              />
              <span className="absolute left-3 top-2.5 text-xs text-[#8696A0]">🔍</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-[#0B141A] text-[#8696A0] uppercase border-b border-[#202C33]">
                <tr>
                  <th className="py-3 px-4">المستخدم</th>
                  <th className="py-3 px-4">الكود الفريد</th>
                  <th className="py-3 px-4">البريد / الهاتف</th>
                  <th className="py-3 px-4">الحالة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#202C33]">
                {loading ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-[#8696A0]">
                      جاري تحميل بيانات المستخدمين...
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-[#8696A0]">
                      لا يوجد مستخدمين مطابقين للبحث.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-[#202C33]/50 transition-colors">
                      <td className="py-3.5 px-4 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#202C33] overflow-hidden flex items-center justify-center font-bold text-[#00A884]">
                          {user.photoUrl ? (
                            <img src={user.photoUrl} alt={user.displayName} className="w-full h-full object-cover" />
                          ) : (
                            user.displayName.substring(0, 1).toUpperCase()
                          )}
                        </div>
                        <span className="font-semibold text-white">{user.displayName}</span>
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-[#00A884]">
                        #{user.userCode}
                      </td>
                      <td className="py-3.5 px-4 text-[#8696A0]">
                        {user.email || "غير متوفر"}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium ${
                            user.isOnline
                              ? "bg-[#00A884]/20 text-[#00A884] border border-[#00A884]/30"
                              : "bg-[#202C33] text-[#8696A0]"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              user.isOnline ? "bg-[#00A884]" : "bg-[#8696A0]"
                            }`}
                          ></span>
                          {user.isOnline ? "متصل" : "غير متصل"}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}
