"use client";

import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import { useAuth } from "./AuthContext";
import { listenToChats } from "@/lib/firebase/firestore";
import { Chat } from "@/lib/types/chat";

interface ChatContextType {
  chats: Chat[];
  activeChat: Chat | null;
  setActiveChat: (chat: Chat | null) => void;
  totalUnread: number;
}

const ChatContext = createContext<ChatContextType>({
  chats: [],
  activeChat: null,
  setActiveChat: () => {},
  totalUnread: 0,
});

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const { userProfile } = useAuth();
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChat, setActiveChat] = useState<Chat | null>(null);
  const activeChatRef = useRef<Chat | null>(null);

  useEffect(() => {
    activeChatRef.current = activeChat;
  }, [activeChat]);

  useEffect(() => {
    if (!userProfile) {
      setChats([]);
      return;
    }

    const unsub = listenToChats(userProfile.uid, (newChats) => {
      // Filter out archived chats from main list
      const filtered = newChats.filter(
        (c) => !c.isArchived?.[userProfile.uid]
      );
      setChats(filtered);

      // Update active chat if it changed
      if (activeChatRef.current) {
        const updated = newChats.find((c) => c.id === activeChatRef.current?.id);
        if (updated) {
          setActiveChat(updated);
        }
      }
    });

    return () => unsub();
  }, [userProfile?.uid]);

  const totalUnread = chats.reduce((sum, chat) => {
    return sum + (chat.unreadCount?.[userProfile?.uid || ""] || 0);
  }, 0);

  return (
    <ChatContext.Provider
      value={{ chats, activeChat, setActiveChat, totalUnread }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export function useChats() {
  return useContext(ChatContext);
}
