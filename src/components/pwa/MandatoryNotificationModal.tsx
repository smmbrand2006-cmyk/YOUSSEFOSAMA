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

export default function MandatoryNotificationModal() {
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
      // 1. Request Notifications
      const notifResult = await requestBrowserNotifications();

      // 2. Request Microphone
      try {
        if (navigator.mediaDevices?.getUserMedia) {
          const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
          audioStream.getTracks().forEach((t) => t.stop());
          setMicGranted(true);
        }
      } catch (err) {
        console.warn("Microphone permission note:", err);
      }

      // 3. Request Camera
      try {
        if (navigator.mediaDevices?.getUserMedia) {
          const videoStream = await navigator.mediaDevices.getUserMedia({ video: true });
          videoStream.getTracks().forEach((t) => t.stop());
          setCamGranted(true);
        }
      } catch (err) {
        console.warn("Camera permission note:", err);
      }

      const notifNow = getNotificationStatus();
      setStatus(notifNow);
      if (notifNow === "granted" || notifResult) {
        try {
          localStorage.setItem("youssef_permissions_confirmed", "true");
        } catch {}
      }
    } finally {
      setLoading(false);
    }
  };

  const handleTestNotification = async () => {
    setIsTestingNotif(true);
    try {
      await testSystemNotification();
    } finally {
      setIsTestingNotif(false);
    }
  };

  const handleManualCheck = () => {
    const current = getNotificationStatus();
    setStatus(current);
    if (current === "granted") {
      try {
        localStorage.setItem("youssef_permissions_confirmed", "true");
      } catch {}
    } else {
      alert("لم يتم تفعيل إذن الإشعارات بعد في المتصفح. اضغط على رمز القفل 🔒 أعلى شريط العنوان وقم باختيار (سماح/Allow) للإشعارات.");
    }
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
        </div>
      </div>
    </div>
  );
}
