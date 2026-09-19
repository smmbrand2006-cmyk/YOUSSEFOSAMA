"use client";

import { useEffect, useState } from "react";
import { MessageCircle } from "lucide-react";
import { useChats } from "@/lib/contexts/ChatContext";
import ChatClient from "./[chatId]/ChatClient";
import styles from "@/styles/chat.module.css";

export default function ChatEmptyPage() {
  const { activeChat } = useChats();
  const [urlChatId, setUrlId] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const parts = window.location.pathname.split("/").filter(Boolean);
      if (parts[0] === "chat" && parts[1] && parts[1] !== "direct") {
        setUrlId(parts[1]);
      }
    }
  }, []);

  const selectedChatId = activeChat?.id || urlChatId;

  if (selectedChatId) {
    return <ChatClient chatIdProp={selectedChatId} />;
  }

  return (
    <div className={styles.emptyChatMain}>
      <MessageCircle size={120} strokeWidth={0.5} className={styles.emptyChatIcon} />
      <h2>Youssef App</h2>
      <p>
        أهلاً بك في تطبيق يوسف شات
        <br />
        اختر محادثة من القائمة لبدء التراسل الفوري بأمان وسرعة فائقة
      </p>
    </div>
  );
}
