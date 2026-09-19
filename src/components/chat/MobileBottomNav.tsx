"use client";

import React from "react";
import styles from "@/styles/chat.module.css";

interface MobileBottomNavProps {
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  onOpenSettings?: () => void;
  onOpenCalls?: () => void;
  onOpenCommunities?: () => void;
  onOpenStatus?: () => void;
}

export default function MobileBottomNav({
  activeTab = "chats",
  onTabChange,
  onOpenSettings,
  onOpenCalls,
  onOpenCommunities,
  onOpenStatus,
}: MobileBottomNavProps) {
  const tabs = [
    {
      id: "chats",
      label: "Chats",
      icon: "chat",
      action: () => onTabChange?.("chats"),
    },
    {
      id: "calls",
      label: "Calls",
      icon: "call",
      action: onOpenCalls || (() => onTabChange?.("calls")),
    },
    {
      id: "communities",
      label: "Communities",
      icon: "groups",
      action: onOpenCommunities || (() => onTabChange?.("communities")),
    },
    {
      id: "status",
      label: "Status",
      icon: "motion_photos_on",
      action: onOpenStatus || (() => onTabChange?.("status")),
    },
    {
      id: "settings",
      label: "Settings",
      icon: "settings",
      action: onOpenSettings || (() => onTabChange?.("settings")),
    },
  ];

  return (
    <nav className={styles.mobileBottomNav} data-active-classes="text-primary">
      <div className={styles.mobileBottomNavInner}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              className={`${styles.mobileBottomNavItem} ${
                isActive ? styles.mobileBottomNavItemActive : ""
              }`}
              onClick={tab.action}
              aria-label={tab.label}
            >
              <span
                className="material-symbols-outlined"
                style={{
                  fontSize: "24px",
                  color: isActive ? "var(--primary)" : "var(--outline)",
                }}
              >
                {tab.icon}
              </span>
              <span
                className={styles.mobileBottomNavLabel}
                style={{
                  color: isActive ? "var(--primary)" : "var(--outline)",
                }}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
