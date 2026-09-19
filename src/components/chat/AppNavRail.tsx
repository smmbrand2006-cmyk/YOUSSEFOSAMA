"use client";

import React, { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/lib/contexts/AuthContext";
import { useChats } from "@/lib/contexts/ChatContext";
import styles from "@/styles/chat.module.css";

interface AppNavRailProps {
  onSelectTab?: (tab: "chats" | "calls" | "communities" | "status" | "settings") => void;
  activeTab?: string;
  onOpenProfile?: () => void;
}

export default function AppNavRail({
  onSelectTab,
  activeTab = "chats",
  onOpenProfile,
}: AppNavRailProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { userProfile } = useAuth();
  const { totalUnread } = useChats();

  const [currentTab, setCurrentTab] = useState<string>(activeTab);

  const handleTabClick = (tab: "chats" | "calls" | "communities" | "status" | "settings") => {
    setCurrentTab(tab);
    if (onSelectTab) {
      onSelectTab(tab);
    }
    if (tab === "settings") {
      router.push("/profile");
    }
  };

  const getInitials = (name?: string) => {
    if (!name || !name.trim()) return "U";
    return name
      .trim()
      .split(" ")
      .map((n) => n[0])
      .join("")
      .substring(0, 2)
      .toUpperCase();
  };

  return (
    <aside className={styles.navRail}>
      {/* Top Action Icons */}
      <div className={styles.navRailTop}>
        <nav className={styles.navRailList}>
          {/* Chats */}
          <button
            type="button"
            aria-label="Chats"
            className={`${styles.navRailItem} ${
              currentTab === "chats" ? styles.navRailItemActive : ""
            }`}
            onClick={() => handleTabClick("chats")}
            title="المحادثات (Chats)"
          >
            <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>
              chat
            </span>
            {totalUnread > 0 && <span className={styles.navRailDot} />}
          </button>

          {/* Calls */}
          <button
            type="button"
            aria-label="Calls"
            className={`${styles.navRailItem} ${
              currentTab === "calls" ? styles.navRailItemActive : ""
            }`}
            onClick={() => handleTabClick("calls")}
            title="المكالمات (Calls)"
          >
            <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>
              call
            </span>
          </button>

          {/* Communities / Groups */}
          <button
            type="button"
            aria-label="Communities"
            className={`${styles.navRailItem} ${
              currentTab === "communities" ? styles.navRailItemActive : ""
            }`}
            onClick={() => handleTabClick("communities")}
            title="المجموعات (Communities)"
          >
            <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>
              groups
            </span>
          </button>

          {/* Status */}
          <button
            type="button"
            aria-label="Status"
            className={`${styles.navRailItem} ${
              currentTab === "status" ? styles.navRailItemActive : ""
            }`}
            onClick={() => handleTabClick("status")}
            title="الحالة (Status)"
          >
            <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>
              radio_button_checked
            </span>
          </button>
        </nav>
      </div>

      {/* Bottom Icons: Settings + User Avatar */}
      <div className={styles.navRailBottom}>
        <nav className={styles.navRailList}>
          <button
            type="button"
            aria-label="Settings"
            className={`${styles.navRailItem} ${
              pathname === "/profile" ? styles.navRailItemActive : ""
            }`}
            onClick={() => handleTabClick("settings")}
            title="الإعدادات (Settings)"
          >
            <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>
              settings
            </span>
          </button>
        </nav>

        {/* User Profile Avatar Pill */}
        <div
          className={styles.navRailAvatar}
          onClick={onOpenProfile || (() => router.push("/profile"))}
          title={userProfile?.displayName || "الملف الشخصي"}
        >
          {userProfile?.displayName ? (
            getInitials(userProfile.displayName)
          ) : (
            <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>
              person
            </span>
          )}
        </div>
      </div>
    </aside>
  );
}
