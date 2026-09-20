"use client";

import React, { useState, useEffect } from "react";
import {
  getNotificationStatus,
  requestBrowserNotifications,
  testSystemNotification,
  NotificationStatus,
} from "@/lib/utils/pwaNotifications";
import styles from "@/styles/pwa.module.css";
import {
  Bell,
  Mic,
  Camera,
  CheckCircle2,
  RefreshCw,
  AlertTriangle,
  Send,
} from "lucide-react";
import { useAuth } from "@/lib/contexts/AuthContext";
import { enableNotifications } from "@/lib/notifications";
import { auth } from "@/lib/firebase/config";

export default function MandatoryNotificationModal() {
  const { userProfile } = useAuth();
  const [status, setStatus] = useState<NotificationStatus>("granted");
  const [micGranted, setMicGranted] = useState(false);
  const [camGranted, setCamGranted] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isTestingNotif, setIsTestingNotif] = useState(false);

  useEffect(() => {
    setMounted(true);
    const current = getNotificationStatus();
    setStatus(current);

    // Check if permissions were previously confirmed
    const confirmed = localStorage.getItem("youssef_permissions_confirmed");
    if (confirmed && current === "granted") {
      setStatus("granted");
    }

    const handleFocus = () => {
      setStatus(getNotificationStatus());
    };

    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, []);

  if (!mounted || (status === "granted" && localStorage.getItem("youssef_permissions_confirmed") === "true") || status === "unsupported") {
    return null;
  }

  const handleRequestAll = async () => {
    setLoading(true);
    try {
      // 1. Request Notifications first with dedicated browser gesture
      const targetUid =
        userProfile?.uid ||
        auth.currentUser?.uid ||
        (typeof window !== "undefined" ? localStorage.getItem("youssef_app_uid") : null);

      // Only pass UID to register in Firestore if user is actively authenticated
      const activeUid = auth.currentUser ? (auth.currentUser.uid || targetUid) : undefined;
      const notifResult = await requestBrowserNotifications(activeUid || undefined);

      // 2. Request Microphone sequentially (not concurrent, so mobile browsers don't auto-dismiss)
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          const audioStream = await navigator.mediaDevices.getUserMedia({
            audio: { echoCancellation: true, noiseSuppression: true },
          });
          audioStream.getTracks().forEach((t) => t.stop());
          setMicGranted(true);
        }
      } catch (err) {
        console.warn("Microphone permission note:", err);
      }

      const current = getNotificationStatus();
      setStatus(current);

      if (current === "granted" || notifResult) {
        try {
          localStorage.setItem("youssef_permissions_confirmed", "true");
        } catch {}
      } else if (current === "denied") {
        setStatus("denied");
      }
    } catch (err) {
      console.error("Permission request error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleTestNotification = async () => {
    setIsTestingNotif(true);
    try {
      const targetUid =
        userProfile?.uid ||
        auth.currentUser?.uid ||
        (typeof window !== "undefined" ? localStorage.getItem("youssef_app_uid") : undefined);
      await testSystemNotification(targetUid || undefined);
    } finally {
      setIsTestingNotif(false);
    }
  };

  const handleManualCheck = async () => {
    const current = getNotificationStatus();
    if (current !== "granted") {
      alert("لم يتم تفعيل إذن الإشعارات بعد في المتصفح. اضغط على رمز القفل 🔒 وقم باختيار (سماح/Allow).");
      return;
    }
    setLoading(true);
    try {
      const targetUid =
        userProfile?.uid ||
        auth.currentUser?.uid ||
        (typeof window !== "undefined" ? localStorage.getItem("youssef_app_uid") : null);

      if (auth.currentUser && targetUid) {
        await enableNotifications(targetUid);
      }
      setStatus("granted");
      try {
        localStorage.setItem("youssef_permissions_confirmed", "true");
      } catch {}
    } finally {
      setLoading(false);
    }
  };

  const handleDismiss = () => {
    try {
      localStorage.setItem("youssef_permissions_confirmed", "true");
    } catch {}
    setStatus("granted");
  };

  return (
    <div className={styles.notifOverlay}>
      <div className={styles.notifCard}>
        <div className={styles.notifGlow} />

        <div className={styles.notifIconWrap}>
          <div className={styles.notifPulseRing} />
          <Bell size={36} color="#818CF8" />
        </div>

        <div className={styles.notifBadge}>
          <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>
            verified_user
          </span>
          تفعيل أذونات التطبيق
        </div>

        <h2 className={styles.notifTitle}>أذونات التشغيل قبل التنزيل</h2>

        <p className={styles.notifDesc}>
          لضمان عمل الفويس (الرسائل الصوتية)، وإرسال الصور، واستقبال الرسائل والمكالمات فورياً حتى لو التطبيق مغلق، يُرجى تفعيل الأذونات التالية:
        </p>

        {status === "denied" ? (
          <div className={styles.notifBlockedGuide}>
            <div className={styles.notifBlockedTitle}>
              <AlertTriangle size={16} />
              الإشعارات محظورة في متصفحك حالياً:
            </div>
            <ol className={styles.notifBlockedSteps}>
              <li>اضغط على رمز القفل 🔒 أو إعدادات الموقع في شريط العنوان بالأعلى.</li>
              <li>ابحث عن إذن &quot;الإشعارات&quot; (Notifications) وقم بتغييره إلى &quot;سماح&quot; (Allow).</li>
              <li>بعد التفعيل، اضغط على زر التحقق أدناه للمتابعة.</li>
            </ol>
          </div>
        ) : (
          <div className={styles.notifFeatures}>
            <div className={styles.notifFeatureItem}>
              <Bell className={styles.notifFeatureIcon} size={18} />
              <span>الإشعارات الفورية: تنبيه بالرسائل والمكالمات في الخلفية</span>
            </div>
            <div className={styles.notifFeatureItem}>
              <Mic className={styles.notifFeatureIcon} size={18} />
              <span>الميكروفون والصوت: لتسجيل الفويس والمكالمات الصوتية</span>
            </div>
            <div className={styles.notifFeatureItem}>
              <Camera className={styles.notifFeatureIcon} size={18} />
              <span>الكاميرا والصور: لإرسال الصور والتقاطها ومكالمات الفيديو</span>
            </div>
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {status === "denied" ? (
            <button
              type="button"
              className={styles.notifBtnPrimary}
              onClick={handleManualCheck}
            >
              <RefreshCw size={18} />
              تم السماح، إعادة التحقق والبدء
            </button>
          ) : (
            <button
              type="button"
              className={styles.notifBtnPrimary}
              onClick={handleRequestAll}
              disabled={loading}
            >
              <CheckCircle2 size={18} />
              {loading ? "جاري تفعيل الأذونات..." : "تفعيل كافة الأذونات (إشعارات + فويس + صور) 🚀"}
            </button>
          )}

          <button
            type="button"
            onClick={handleTestNotification}
            disabled={isTestingNotif}
            style={{
              padding: "10px 16px",
              background: "rgba(255, 255, 255, 0.06)",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              borderRadius: "14px",
              color: "#C7D2FE",
              fontSize: "13px",
              fontWeight: "600",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
            }}
          >
            <Send size={14} />
            {isTestingNotif ? "جاري إرسال الإشعار..." : "تجربة إشعار فوري على هاتفك الآن 🔔"}
          </button>

          <button
            type="button"
            onClick={handleDismiss}
            style={{
              background: "transparent",
              border: "none",
              color: "rgba(255, 255, 255, 0.45)",
              fontSize: "12px",
              cursor: "pointer",
              padding: "6px 12px",
              marginTop: "4px",
              textDecoration: "underline",
              transition: "color 0.2s ease",
            }}
          >
            المتابعة لتسجيل الدخول / استخدام التطبيق
          </button>
        </div>
      </div>
    </div>
  );
}
