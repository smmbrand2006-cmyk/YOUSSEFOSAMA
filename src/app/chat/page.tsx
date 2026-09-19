"use client";

import React from "react";
import { useChats } from "@/lib/contexts/ChatContext";
import ChatClient from "./[chatId]/ChatClient";
import styles from "@/styles/chat.module.css";

export default function ChatMainPage() {
  const { activeChat } = useChats();

  // If a chat is actively selected, show the conversation panel
  if (activeChat) {
    return <ChatClient chatIdProp={activeChat.id} />;
  }

  // Authentic Point Zero Workstation Empty Canvas
  return (
    <div className={styles.emptyWorkstation}>
      {/* Authentic WhatsApp Web Dark Pattern (3% Opacity SVG Tile) */}
      <svg
        className={styles.chatSvgPattern}
        height="100%"
        width="100%"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <pattern
            height="60"
            id="wa-pattern-empty"
            patternUnits="userSpaceOnUse"
            width="60"
          >
            <path
              d="M12 8a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm24 0a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm16 16a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm-40 0a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm16 16a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm24 0a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm-16 16a2 2 0 1 0 0-4 2 2 0 0 0 0 4z"
              fill="#E5E2E1"
            />
            <circle cx="28" cy="20" fill="#E5E2E1" r="1.5" />
            <circle cx="48" cy="40" fill="#E5E2E1" r="1.5" />
            <circle cx="8" cy="48" fill="#E5E2E1" r="1.5" />
          </pattern>
        </defs>
        <rect fill="url(#wa-pattern-empty)" height="100%" width="100%" />
      </svg>

      <div className={styles.emptyWorkstationLogo}>
        <span className="material-symbols-outlined" style={{ fontSize: "44px" }}>
          chat
        </span>
      </div>

      <h2>Youssef App • Workstation</h2>
      <p>
        أرسل واستقبل الرسائل والمكالمات في الوقت الفعلي بأعلى درجات الخصوصية والتشفير.
        <br />
        اختر محادثة من القائمة الجانبية أو ابحث بكود المستخدم للبدء.
      </p>
    </div>
  );
}
