"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/contexts/AuthContext";
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

  const handleToggleNotifications = () => {
    setNotifSound((prev) => !prev);
  };

  return (
    <header className={styles.appHeader}>
      {/* Brand Title */}
      <div className={styles.appHeaderLeft}>
        <div className={styles.appHeaderTitle}>
          <span>Workstation</span>
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
