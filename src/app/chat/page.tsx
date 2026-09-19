"use client";

import { useChats } from "@/lib/contexts/ChatContext";
import ChatClient from "./[chatId]/ChatClient";
import { MessageCircle } from "lucide-react";
import styles from "@/styles/chat.module.css";

export default function ChatMainPage() {
  const { activeChat } = useChats();

  // If a chat is actively selected, show it
  if (activeChat) {
    return <ChatClient chatIdProp={activeChat.id} />;
  }

  // On initial load or after reload, return to clean point zero
  return (
    <div className={styles.emptyChatMain}>
      <MessageCircle size={100} strokeWidth={0.8} className={styles.emptyChatIcon} />
      <h2>Youssef App</h2>
      <p>
        أهلاً بك في تطبيق يوسف شات
        <br />
        اختر محادثة من القائمة لبدء التراسل الفوري
      </p>
    </div>
  );
}
