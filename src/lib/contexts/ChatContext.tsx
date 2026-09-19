"use client";

import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import { useAuth } from "./AuthContext";
import { listenToChats } from "@/lib/firebase/firestore";
import { Chat } from "@/lib/types/chat";

import { dispatchAppNotification, playNotificationChime } from "@/lib/utils/pwaNotifications";
import { useBackHandler } from "./BackHandlerContext";

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
  const prevChatsRef = useRef<Chat[]>([]);

  useEffect(() => {
    activeChatRef.current = activeChat;
  }, [activeChat]);

  // Protect mobile navigation: When inside any chat, mobile back button/swipe closes chat to Home
  useBackHandler(
    !!activeChat,
    () => {
      setActiveChat(null);
    },
    "active_chat_view",
    10
  );

  useEffect(() => {
    if (!userProfile) {
      setChats([]);
      prevChatsRef.current = [];
      return;
    }

    const unsub = listenToChats(userProfile.uid, (newChats) => {
      // Filter out archived chats from main list
      const filtered = newChats.filter(
        (c) => !c.isArchived?.[userProfile.uid]
      );

      // Check for incoming new messages to notify
      if (prevChatsRef.current.length > 0) {
        filtered.forEach((chat) => {
          const oldChat = prevChatsRef.current.find((c) => c.id === chat.id);
          const hasNewMessage =
            chat.lastMessage &&
            chat.lastMessage.senderId !== userProfile.uid &&
            (!oldChat ||
              oldChat.lastMessage?.createdAt?.seconds !== chat.lastMessage.createdAt?.seconds ||
              oldChat.lastMessage?.text !== chat.lastMessage.text);

          if (hasNewMessage) {
            const isWindowHidden = typeof document !== "undefined" && document.hidden;
            const isDifferentChat = activeChatRef.current?.id !== chat.id;

            if (isWindowHidden || isDifferentChat) {
              const senderName =
                chat.participantNames?.[chat.lastMessage?.senderId || ""] ||
                (chat.type === "direct" ? "رسالة جديدة 💬" : (chat.name || "رسالة جديدة 💬"));
              playNotificationChime();
              dispatchAppNotification({
                title: `${senderName} 💬`,
                body: chat.lastMessage?.text || "أرسل لك رسالة جديدة",
                tag: `msg-${chat.id}`,
                url: `/chat/${chat.id}`,
              });
            }
          }
        });
      }
      prevChatsRef.current = filtered;
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
