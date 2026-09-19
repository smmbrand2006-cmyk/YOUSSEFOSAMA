"use client";
import { useEffect, useState } from "react";
import { enableNotifications, refreshToken } from "@/lib/notifications";
import { Bell, AlertTriangle } from "lucide-react";
import styles from "@/styles/chat.module.css";

export default function NotificationPrompt({ uid }: { uid: string }) {
  const [state, setState] = useState<"hidden" | "ask" | "denied" | "busy">("hidden");

  useEffect(() => {
    if (typeof Notification === "undefined") return;
    if (Notification.permission === "granted") {
      refreshToken(uid); // silent token refresh
      setState("hidden");
    } else if (Notification.permission === "denied") {
      setState("denied");
    } else {
      setState("ask");
    }
  }, [uid]);

  if (state === "hidden") return null;

  if (state === "denied") {
    return (
      <div className={styles.notifBannerDenied} dir="rtl">
        <AlertTriangle size={18} className={styles.notifBannerIcon} />
        <span>
          الإشعارات محظورة. فعّلها من إعدادات المتصفح/التطبيق (أيقونة القفل بجانب العنوان ← الإشعارات ← سماح).
        </span>
      </div>
    );
  }

  return (
    <div className={styles.notifBanner} dir="rtl">
      <div className={styles.notifBannerContent}>
        <Bell size={18} className={styles.notifBannerIcon} />
        <span>فعّل الإشعارات علشان توصلك الرسائل والمكالمات حتى لو التطبيق مقفول.</span>
      </div>
      <button
        type="button"
        className={styles.notifBannerBtn}
        disabled={state === "busy"}
        onClick={async () => {
          setState("busy");
          const r = await enableNotifications(uid);
          setState(r.ok ? "hidden" : r.reason === "denied" ? "denied" : "ask");
        }}
      >
        {state === "busy" ? "جاري التفعيل..." : "تفعيل"}
      </button>
    </div>
  );
}
