"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Bell,
  BellRing,
  Volume2,
  VolumeX,
  MessageSquare,
  PhoneCall,
  Eye,
  Vibrate,
  ShieldCheck,
  AlertTriangle,
  Send,
  Check,
  RefreshCw,
} from "lucide-react";
import { enableNotifications, disableNotifications, refreshToken } from "@/lib/notifications";
import { testSystemNotification, playNotificationChime } from "@/lib/utils/pwaNotifications";
import styles from "@/styles/chat.module.css";

interface NotificationSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  uid: string;
}

export default function NotificationSettingsModal({
  isOpen,
  onClose,
  uid,
}: NotificationSettingsModalProps) {
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("default");
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testSuccess, setTestSuccess] = useState(false);

  // Settings State (stored in localStorage)
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [messagesEnabled, setMessagesEnabled] = useState(true);
  const [callsEnabled, setCallsEnabled] = useState(true);
  const [previewEnabled, setPreviewEnabled] = useState(true);
  const [vibrateEnabled, setVibrateEnabled] = useState(true);

  useEffect(() => {
    if (!isOpen) return;

    // Check system permission
    if (typeof window !== "undefined" && "Notification" in window) {
      setPermission(Notification.permission);
    } else {
      setPermission("unsupported");
    }

    // Load saved preferences
    try {
      setSoundEnabled(localStorage.getItem("notif_pref_sound") !== "false");
      setMessagesEnabled(localStorage.getItem("notif_pref_messages") !== "false");
      setCallsEnabled(localStorage.getItem("notif_pref_calls") !== "false");
      setPreviewEnabled(localStorage.getItem("notif_pref_preview") !== "false");
      setVibrateEnabled(localStorage.getItem("notif_pref_vibrate") !== "false");
    } catch (e) {}
  }, [isOpen]);

  if (!isOpen) return null;

  const handleTogglePreference = (key: string, current: boolean, setter: (val: boolean) => void) => {
    const next = !current;
    setter(next);
    try {
      localStorage.setItem(`notif_pref_${key}`, String(next));
    } catch (e) {}
    if (key === "sound" && next) {
      playNotificationChime();
    }
  };

  const handleToggleSystemPermission = async () => {
    if (permission === "granted") {
      setLoading(true);
      try {
        await disableNotifications(uid);
        alert("تم إلغاء تسجيل الإشعارات السحابية على هذا الجهاز.");
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    } else {
      setLoading(true);
      try {
        const res = await enableNotifications(uid);
        if (res.ok) {
          setPermission("granted");
          playNotificationChime();
        } else if (res.reason === "denied") {
          setPermission("denied");
        }
      } finally {
        setLoading(false);
      }
    }
  };

  const handleTestNotification = async () => {
    setTesting(true);
    setTestSuccess(false);
    try {
      playNotificationChime();
      const ok = await testSystemNotification();
      if (ok) {
        setTestSuccess(true);
        setTimeout(() => setTestSuccess(false), 3000);
      } else {
        alert("يرجى التأكد من السماح بالإشعارات في المتصفح أولاً.");
      }
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className={styles.notifModalOverlay} onClick={onClose}>
      <div
        className={styles.notifModalCard}
        onClick={(e) => e.stopPropagation()}
        dir="rtl"
      >
        {/* Header */}
        <div className={styles.notifModalHeader}>
          <div className={styles.notifModalHeaderTitle}>
            <div className={styles.notifModalIconBadge}>
              <BellRing size={20} color="#00a884" />
            </div>
            <div>
              <h3>إعدادات الإشعارات والتنبيهات</h3>
              <p>تحكم كامل في وصول الرسائل والمكالمات ونغمات التنبيه</p>
            </div>
          </div>
          <button
            type="button"
            className="btn-icon"
            onClick={onClose}
            title="إغلاق"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content Body */}
        <div className={styles.notifModalBody}>
          {/* Status Box */}
          <div
            className={`${styles.notifStatusCard} ${
              permission === "granted"
                ? styles.notifStatusGranted
                : permission === "denied"
                ? styles.notifStatusDenied
                : styles.notifStatusDefault
            }`}
          >
            <div className={styles.notifStatusInfo}>
              {permission === "granted" ? (
                <>
                  <ShieldCheck size={22} className={styles.notifStatusIconGranted} />
                  <div>
                    <div className={styles.notifStatusTitle}>الإشعارات مفعّلة ونشطة 🟢</div>
                    <div className={styles.notifStatusSub}>
                      تطبيق يوسف شات جاهز لاستقبال الرسائل والمكالمات في الخلفية.
                    </div>
                  </div>
                </>
              ) : permission === "denied" ? (
                <>
                  <AlertTriangle size={22} className={styles.notifStatusIconDenied} />
                  <div>
                    <div className={styles.notifStatusTitle}>الإشعارات محظورة في جهازك 🔴</div>
                    <div className={styles.notifStatusSub}>
                      تم رفض إذن الإشعارات من قبل. يجب السماح بها من إعدادات المتصفح.
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <Bell size={22} className={styles.notifStatusIconDefault} />
                  <div>
                    <div className={styles.notifStatusTitle}>الإشعارات بانتظار التفعيل 🟡</div>
                    <div className={styles.notifStatusSub}>
                      اضغط على زر التفعيل لتصلك الرسائل حتى عندما يكون التطبيق مقفولاً.
                    </div>
                  </div>
                </>
              )}
            </div>

            {permission !== "denied" && (
              <button
                type="button"
                className={styles.notifStatusActionBtn}
                onClick={handleToggleSystemPermission}
                disabled={loading}
              >
                {loading
                  ? "جاري المعالجة..."
                  : permission === "granted"
                  ? "إعادة المزامنة 🔄"
                  : "تفعيل الآن 🚀"}
              </button>
            )}
          </div>

          {/* Blocked Guide if denied */}
          {permission === "denied" && (
            <div className={styles.notifTroubleshootBox}>
              <div className={styles.notifTroubleshootTitle}>
                <AlertTriangle size={16} />
                خطوات فك حظر الإشعارات على الموبايل:
              </div>
              <ol className={styles.notifTroubleshootList}>
                <li>اضغط على رمز القفل 🔒 أو إعدادات الموقع أعلى شريط المتصفح.</li>
                <li>اختر &quot;الأذونات&quot; (Permissions) ثم &quot;الإشعارات&quot; (Notifications).</li>
                <li>قم بتغييرها إلى &quot;سماح&quot; (Allow)، ثم أعد تحميل الصفحة.</li>
              </ol>
            </div>
          )}

          {/* Preferences Settings List */}
          <div className={styles.notifPreferencesGroup}>
            {/* 1. Notification Sound */}
            <div className={styles.notifPrefRow}>
              <div className={styles.notifPrefLabelWrap}>
                {soundEnabled ? (
                  <Volume2 size={20} className={styles.notifPrefIcon} />
                ) : (
                  <VolumeX size={20} className={styles.notifPrefIconMuted} />
                )}
                <div>
                  <div className={styles.notifPrefLabel}>نغمة وتنبيه الصوت (Chime)</div>
                  <div className={styles.notifPrefDesc}>تشغيل نغمة عند وصول رسالة جديدة أو إشعار</div>
                </div>
              </div>
              <button
                type="button"
                aria-label="Toggle Sound"
                className={`${styles.notifToggleSwitch} ${
                  soundEnabled ? styles.notifToggleActive : ""
                }`}
                onClick={() => handleTogglePreference("sound", soundEnabled, setSoundEnabled)}
              >
                <span className={styles.notifToggleThumb} />
              </button>
            </div>

            {/* 2. Message Notifications */}
            <div className={styles.notifPrefRow}>
              <div className={styles.notifPrefLabelWrap}>
                <MessageSquare size={20} className={styles.notifPrefIcon} />
                <div>
                  <div className={styles.notifPrefLabel}>تنبيهات الرسائل الفورية</div>
                  <div className={styles.notifPrefDesc}>استقبال إشعار فوري عند إرسال أي صديق رسالة</div>
                </div>
              </div>
              <button
                type="button"
                aria-label="Toggle Messages"
                className={`${styles.notifToggleSwitch} ${
                  messagesEnabled ? styles.notifToggleActive : ""
                }`}
                onClick={() => handleTogglePreference("messages", messagesEnabled, setMessagesEnabled)}
              >
                <span className={styles.notifToggleThumb} />
              </button>
            </div>

            {/* 3. Call Ring Notifications */}
            <div className={styles.notifPrefRow}>
              <div className={styles.notifPrefLabelWrap}>
                <PhoneCall size={20} className={styles.notifPrefIcon} />
                <div>
                  <div className={styles.notifPrefLabel}>رنين المكالمات الواردة</div>
                  <div className={styles.notifPrefDesc}>تنبيه برنين عند تلقي مكالمة صوتية أو فيديو</div>
                </div>
              </div>
              <button
                type="button"
                aria-label="Toggle Calls"
                className={`${styles.notifToggleSwitch} ${
                  callsEnabled ? styles.notifToggleActive : ""
                }`}
                onClick={() => handleTogglePreference("calls", callsEnabled, setCallsEnabled)}
              >
                <span className={styles.notifToggleThumb} />
              </button>
            </div>

            {/* 4. Show Preview */}
            <div className={styles.notifPrefRow}>
              <div className={styles.notifPrefLabelWrap}>
                <Eye size={20} className={styles.notifPrefIcon} />
                <div>
                  <div className={styles.notifPrefLabel}>معاينة نص الرسالة</div>
                  <div className={styles.notifPrefDesc}>عرض جزء من نص الرسالة واسم المرسل في الإشعار</div>
                </div>
              </div>
              <button
                type="button"
                aria-label="Toggle Preview"
                className={`${styles.notifToggleSwitch} ${
                  previewEnabled ? styles.notifToggleActive : ""
                }`}
                onClick={() => handleTogglePreference("preview", previewEnabled, setPreviewEnabled)}
              >
                <span className={styles.notifToggleThumb} />
              </button>
            </div>

            {/* 5. Vibration */}
            <div className={styles.notifPrefRow}>
              <div className={styles.notifPrefLabelWrap}>
                <Vibrate size={20} className={styles.notifPrefIcon} />
                <div>
                  <div className={styles.notifPrefLabel}>اهتزاز الهاتف (Vibration)</div>
                  <div className={styles.notifPrefDesc}>اهتزاز الجهاز على الهواتف المدعومة مع الإشعار</div>
                </div>
              </div>
              <button
                type="button"
                aria-label="Toggle Vibration"
                className={`${styles.notifToggleSwitch} ${
                  vibrateEnabled ? styles.notifToggleActive : ""
                }`}
                onClick={() => handleTogglePreference("vibrate", vibrateEnabled, setVibrateEnabled)}
              >
                <span className={styles.notifToggleThumb} />
              </button>
            </div>
          </div>

          {/* Test Notification Button */}
          <div className={styles.notifTestSection}>
            <button
              type="button"
              className={styles.notifTestButton}
              onClick={handleTestNotification}
              disabled={testing}
            >
              {testSuccess ? (
                <>
                  <Check size={18} color="#10b981" />
                  <span>تم إرسال الإشعار بنجاح! تفقد هاتفك 🔔</span>
                </>
              ) : testing ? (
                <>
                  <RefreshCw size={18} className={styles.spinIcon} />
                  <span>جاري إرسال الإشعار التجريبي...</span>
                </>
              ) : (
                <>
                  <Send size={18} />
                  <span>إرسال إشعار تجريبي الآن على هاتفك 🔔</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
