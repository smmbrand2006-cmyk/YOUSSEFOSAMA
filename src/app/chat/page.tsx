"use client";

import { MessageCircle } from "lucide-react";
import styles from "@/styles/chat.module.css";

export default function ChatEmptyPage() {
  return (
    <div className={styles.emptyChatMain}>
      <MessageCircle size={120} strokeWidth={0.5} className={styles.emptyChatIcon} />
      <h2>Youssef App</h2>
      <p>
        Send and receive messages without keeping your phone online.
        <br />
        Use Youssef App on up to 4 linked devices and 1 phone at the same time.
      </p>
    </div>
  );
}
