"use client";

import { useAuth } from "@/lib/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import AppNavRail from "@/components/chat/AppNavRail";
import AppHeader from "@/components/chat/AppHeader";
import ChatSidebar from "@/components/chat/ChatSidebar";
import UserProfileModal from "@/components/chat/UserProfileModal";
import styles from "@/styles/chat.module.css";

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, loading, userProfile } = useAuth();
  const router = useRouter();
  const [showMyProfile, setShowMyProfile] = useState(false);

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

  const handleSearchTrigger = () => {
    const searchInput = document.getElementById("chat-search-input");
    if (searchInput) {
      searchInput.focus();
    }
  };

  return (
    <div className={styles.chatLayout}>
      {/* 1. Leftmost 70px Icon Rail */}
      <AppNavRail onOpenProfile={() => setShowMyProfile(true)} />

      {/* 2. Main Wrapper with 70px Left Offset & 56px Top Header */}
      <div className={styles.appMainWrapper}>
        {/* Fixed Top Header (56px) */}
        <AppHeader
          onSearchClick={handleSearchTrigger}
          onOpenProfile={() => setShowMyProfile(true)}
        />

        {/* 3. Main Workstation Body: Left Sidebar (46%) + Main Conversation Panel */}
        <div className={styles.appContentArea}>
          <ChatSidebar />
          {children}
        </div>
      </div>

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
