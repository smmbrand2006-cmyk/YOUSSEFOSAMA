"use client";

import { useAuth } from "@/lib/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import ChatSidebar from "@/components/chat/ChatSidebar";
import styles from "@/styles/chat.module.css";

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.replace("/auth/login");
    }
  }, [isAuthenticated, loading, router]);

  if (loading) {
    return (
      <div className="loading-screen">
        <h1>Youssef App</h1>
        <div className="loading-spinner" />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <div className={styles.chatLayout}>
      <ChatSidebar />
      {children}
    </div>
  );
}
