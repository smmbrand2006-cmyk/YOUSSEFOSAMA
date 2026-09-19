"use client";

import React, { useState, useEffect } from "react";
import {
  getNotificationStatus,
  requestBrowserNotifications,
  NotificationStatus,
} from "@/lib/utils/pwaNotifications";
import styles from "@/styles/pwa.module.css";
import { Bell, ShieldCheck, Zap, PhoneCall, RefreshCw, AlertTriangle } from "lucide-react";

export default function MandatoryNotificationModal() {
  const [status, setStatus] = useState<NotificationStatus>("granted");
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setMounted(true);
    const current = getNotificationStatus();
    setStatus(current);

    const handleFocus = () => {
      setStatus(getNotificationStatus());
    };

    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, []);

  if (!mounted || status === "granted" || status === "unsupported") {
    return null;
  }

  const handleRequest = async () => {
    setLoading(true);
    try {
      const granted = await requestBrowserNotifications();
      if (granted) {
        setStatus("granted");
      } else {
        setStatus(getNotificationStatus());
      }
    } finally {
      setLoading(false);
    }
  };

  const handleManualCheck = () => {
    const current = getNotificationStatus();
    setStatus(current);
    if (current === "granted") {
      // Permission acquired!
    } else {
      alert("لم يتم تفعيل الإذن بعد من إعدادات المتصفح. تأكد من تحويل خيار الإشعارات إلى (سماح/Allow) في شريط العنوان.");
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
            error
          </span>
          إذن مطلوب للاستمرار
        </div>

        <h2 className={styles.notifTitle}>تفعيل إشعارات المتصفح</h2>

        <p className={styles.notifDesc}>
          لاستقبال رسائل الشات والمكالمات في الوقت الحقيقي وفور وصولها حتى عند إغلاق التطبيق أو وجوده في الخلفية، يلزم تفعيل إذن الإشعارات من المتصفح.
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
              <Zap className={styles.notifFeatureIcon} size={18} />
              <span>استلام تنبيه فوري بالرسائل الجديدة فور إرسالها</span>
            </div>
            <div className={styles.notifFeatureItem}>
              <PhoneCall className={styles.notifFeatureIcon} size={18} />
              <span>رنين وتنبيه المكالمات الصوتية والمرئية الواردة</span>
            </div>
            <div className={styles.notifFeatureItem}>
              <ShieldCheck className={styles.notifFeatureIcon} size={18} />
              <span>مزامنة مشفرة وآمنة تعمل في الخلفية</span>
            </div>
          </div>
        )}

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
            onClick={handleRequest}
            disabled={loading}
          >
            <Bell size={18} />
            {loading ? "جاري التفعيل..." : "تفعيل الإشعارات الآن 🔔"}
          </button>
        )}
      </div>
    </div>
  );
}
