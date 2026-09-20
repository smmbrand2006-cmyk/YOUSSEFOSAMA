"use client";

import { useAuth } from "@/lib/contexts/AuthContext";
import { useChats } from "@/lib/contexts/ChatContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import AppNavRail from "@/components/chat/AppNavRail";
import AppHeader from "@/components/chat/AppHeader";
import ChatSidebar from "@/components/chat/ChatSidebar";
import MobileBottomNav from "@/components/chat/MobileBottomNav";
import UserProfileModal from "@/components/chat/UserProfileModal";
import StatusModal from "@/components/chat/StatusModal";
import NotificationPrompt from "@/components/NotificationPrompt";
import { listenForeground, listenNotificationClicks } from "@/lib/notifications";
import { useBackHandler } from "@/lib/contexts/BackHandlerContext";
import styles from "@/styles/chat.module.css";

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, loading, userProfile } = useAuth();
  const { chats, activeChat, setActiveChat } = useChats();
  const router = useRouter();
  const [showMyProfile, setShowMyProfile] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [mobileTab, setMobileTab] = useState("chats");

  useBackHandler(showMyProfile, () => setShowMyProfile(false), "layout_my_profile", 25);
  useBackHandler(showStatusModal, () => setShowStatusModal(false), "layout_status_modal", 25);

  // Wire FCM Foreground notifications and notification click actions
  useEffect(() => {
    const off1 = listenForeground(() => activeChat?.id || null);
    const off2 = listenNotificationClicks(
      (chatId) => {
        const target = chats.find((c) => c.id === chatId);
        if (target) {
          setActiveChat(target);
        } else {
          router.push(`/chat/${chatId}`);
        }
      },
      (callId, url) => {
        router.push(url || "/calls");
      }
    );
    return () => {
      off1();
      off2();
    };
  }, [activeChat?.id, chats, setActiveChat, router]);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.replace("/auth/login");
    }
  }, [isAuthenticated, loading, router]);

  if (loading) {
    return (
      <div className="loading-screen">
        <h1>YOUSSEF APP</h1>
        <div className="loading-spinner" />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  const handleSearchTrigger = () => {
    const searchInput = document.getElementById("chat-search-input");
    if (searchInput) {
      searchInput.focus();
    }
  };

  return (
    <div className={styles.chatLayout}>
      {/* 1. Leftmost 70px Icon Rail */}
      <AppNavRail
        onOpenProfile={() => setShowMyProfile(true)}
        onSelectTab={(tab) => {
          if (tab === "status") {
            router.push("/status");
          } else if (tab === "calls") {
            router.push("/calls");
          }
        }}
      />

      {/* 2. Main Wrapper with 70px Left Offset & 56px Top Header */}
      <div className={styles.appMainWrapper}>
        {/* Fixed Top Header (56px) */}
        <AppHeader
          onSearchClick={handleSearchTrigger}
          onOpenProfile={() => setShowMyProfile(true)}
        />

        {/* FCM Push Notification Prompt (when not granted/denied and not inside open conversation) */}
        {userProfile && !activeChat && <NotificationPrompt uid={userProfile.uid} />}

        {/* 3. Main Workstation Body: Left Sidebar (46%) + Main Conversation Panel */}
        <div className={styles.appContentArea}>
          <ChatSidebar />
          {children}
        </div>
      </div>

      {/* Mobile Bottom Navigation Bar (Visible only on mobile when no active chat) */}
      {!activeChat && (
        <MobileBottomNav
          activeTab={mobileTab}
          onTabChange={(tab) => {
            setMobileTab(tab);
            if (tab === "calls") router.push("/calls");
            if (tab === "status") router.push("/status");
          }}
          onOpenSettings={() => setShowMyProfile(true)}
          onOpenCalls={() => {
            router.push("/calls");
          }}
          onOpenStatus={() => {
            router.push("/status");
          }}
        />
      )}

      {/* Status / Stories Modal */}
      <StatusModal
        isOpen={showStatusModal}
        onClose={() => setShowStatusModal(false)}
        currentUser={userProfile}
      />

      {/* Current User Profile Modal */}
      {userProfile && (
        <UserProfileModal
          isOpen={showMyProfile}
          onClose={() => setShowMyProfile(false)}
          user={{
            uid: userProfile.uid,
            displayName: userProfile.displayName,
            userCode: userProfile.userCode,
            bio: userProfile.bio,
            isOnline: true,
          }}
          isBlocked={false}
          onToggleBlock={async () => {}}
          isSupport={userProfile.userCode === "123"}
        />
      )}
    </div>
  );
}
