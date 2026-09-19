"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/contexts/AuthContext";
import { getDeferredPrompt, promptPWAInstall, isAppInstalledPWA } from "@/lib/utils/pwaNotifications";
import styles from "@/styles/chat.module.css";

interface AppHeaderProps {
  onSearchClick?: () => void;
  onOpenProfile?: () => void;
}

export default function AppHeader({
  onSearchClick,
  onOpenProfile,
}: AppHeaderProps) {
  const router = useRouter();
  const { userProfile } = useAuth();
  const [notifSound, setNotifSound] = useState(true);
  const [canInstall, setCanInstall] = useState(false);

  useEffect(() => {
    if (isAppInstalledPWA()) return;
    if (getDeferredPrompt()) setCanInstall(true);

    const handleCanInstall = () => setCanInstall(true);
    const handleInstalled = () => setCanInstall(false);

    window.addEventListener("pwa-can-install", handleCanInstall);
    window.addEventListener("pwa-installed", handleInstalled);
    return () => {
      window.removeEventListener("pwa-can-install", handleCanInstall);
      window.removeEventListener("pwa-installed", handleInstalled);
    };
  }, []);

  const handleToggleNotifications = () => {
    setNotifSound((prev) => !prev);
  };

  return (
    <header className={styles.appHeader}>
      {/* Brand Title */}
      <div className={styles.appHeaderLeft}>
        <div className={styles.appHeaderTitle}>
          <span>YOUSSEF APP</span>
          <span className={styles.appHeaderDot} />
        </div>
        {userProfile?.userCode && (
          <span className={styles.appHeaderUserBadge}>
            #{userProfile.userCode}
          </span>
        )}
      </div>

      {/* Header Actions */}
      <div className={styles.appHeaderRight}>
        {/* Search */}
        <button
          type="button"
          aria-label="Search"
          className={styles.appHeaderBtn}
          onClick={onSearchClick}
          title="بحث في المحادثات"
        >
          <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>
            search
          </span>
        </button>

        {/* PWA Install Button */}
        {canInstall && (
          <button
            type="button"
            aria-label="Install App"
            className={styles.appHeaderBtn}
            onClick={() => promptPWAInstall()}
            title="تثبيت التطبيق على جهازك (PWA)"
            style={{ color: "var(--primary)", borderColor: "rgba(99, 102, 241, 0.4)" }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>
              download
            </span>
          </button>
        )}

        {/* Notifications */}
        <button
          type="button"
          aria-label="Notifications"
          className={`${styles.appHeaderBtn} ${
            !notifSound ? styles.appHeaderBtnMuted : ""
          }`}
          onClick={handleToggleNotifications}
          title={notifSound ? "الإشعارات مفعّلة" : "الإشعارات مكتومة"}
        >
          <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>
            {notifSound ? "notifications" : "notifications_off"}
          </span>
        </button>

        {/* User Avatar Circle */}
        <div
          className={styles.appHeaderAvatar}
          onClick={onOpenProfile || (() => router.push("/profile"))}
          title={userProfile?.displayName || "الملف الشخصي"}
        >
          <span
            className="material-symbols-outlined"
            style={{ fontSize: "18px", color: "var(--on-primary)" }}
          >
            person
          </span>
        </div>
      </div>
    </header>
  );
}
