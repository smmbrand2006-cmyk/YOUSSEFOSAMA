"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/contexts/AuthContext";
import { useChats } from "@/lib/contexts/ChatContext";
import {
  sendMessage,
  getOrCreateDirectChat,
  publishStatus,
  listenToActiveStatuses,
  recordStatusView,
  deleteStatus,
  UserStatus,
} from "@/lib/firebase/firestore";
import { encodeImageToBase64 } from "@/lib/utils/imageEncoder";
import AppNavRail from "@/components/chat/AppNavRail";
import MobileBottomNav from "@/components/chat/MobileBottomNav";
import {
  ArrowLeft,
  Camera,
  Edit2,
  MoreVertical,
  Search,
  Plus,
  X,
  Send,
  Eye,
  Trash2,
  ChevronRight,
  ChevronLeft,
  Users,
  Clock,
} from "lucide-react";
import styles from "@/styles/chat.module.css";

const BG_COLORS = [
  "#005c4b", // WhatsApp Green
  "#1e3a8a", // Deep Blue
  "#701a75", // Purple
  "#831843", // Crimson
  "#78350f", // Amber
  "#18181b", // Sleek Dark
  "#047857", // Emerald
];

function formatViewerTime(viewedAt: number): string {
  if (!viewedAt) return "الآن";
  const diffMs = Date.now() - viewedAt;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  if (diffMin < 1) return "الآن";
  if (diffMin < 60) return `منذ ${diffMin} دقيقة`;
  if (diffHours < 24) return `منذ ${diffHours} ساعة`;
  return new Date(viewedAt).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" });
}

function formatStatusAge(timestamp: any): string {
  if (!timestamp) return "الآن";
  let timeMs = 0;
  if (typeof timestamp?.toMillis === "function") {
    timeMs = timestamp.toMillis();
  } else if (typeof timestamp === "number") {
    timeMs = timestamp;
  } else {
    timeMs = Date.now();
  }
  const diffMs = Date.now() - timeMs;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  if (diffMin < 1) return "الآن";
  if (diffMin < 60) return `منذ ${diffMin} دقيقة`;
  if (diffHours < 24) return `منذ ${diffHours} ساعة`;
  return "منذ يوم";
}

export default function StatusPage() {
  const router = useRouter();
  const { userProfile, isAuthenticated, loading } = useAuth();
  const { chats } = useChats();

  const [statuses, setStatuses] = useState<UserStatus[]>([]);
  const [activeStoryIndex, setActiveStoryIndex] = useState<number | null>(null);
  const [activeStoryList, setActiveStoryList] = useState<UserStatus[]>([]);
  const [isCreatingText, setIsCreatingText] = useState(false);
  const [statusText, setStatusText] = useState("");
  const [selectedBg, setSelectedBg] = useState(BG_COLORS[0]);
  const [storyReply, setStoryReply] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showViewersSheet, setShowViewersSheet] = useState(false);
  const [publishing, setPublishing] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const storyTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Real-time Firestore synchronization for active statuses (24h validity)
  useEffect(() => {
    if (!userProfile) return;
    const unsub = listenToActiveStatuses((fetchedList) => {
      setStatuses(fetchedList);
    });
    return () => unsub();
  }, [userProfile?.uid]);

  // Handle automatic status view recording
  useEffect(() => {
    if (activeStoryIndex === null || !activeStoryList[activeStoryIndex] || !userProfile) return;
    const currentStory = activeStoryList[activeStoryIndex];

    if (currentStory.uid !== userProfile.uid) {
      recordStatusView(currentStory.id, {
        uid: userProfile.uid,
        userName: userProfile.displayName || "مستخدم",
        userAvatar: userProfile.avatar || "",
      });
    }
  }, [activeStoryIndex, activeStoryList, userProfile?.uid]);

  // Story Viewer Timer (6 seconds per story, paused while viewers sheet is open)
  useEffect(() => {
    if (activeStoryIndex === null || showViewersSheet) {
      if (storyTimerRef.current) clearTimeout(storyTimerRef.current);
      return;
    }

    if (storyTimerRef.current) clearTimeout(storyTimerRef.current);
    storyTimerRef.current = setTimeout(() => {
      if (activeStoryIndex < activeStoryList.length - 1) {
        setActiveStoryIndex((prev) => (prev !== null ? prev + 1 : null));
      } else {
        setActiveStoryIndex(null);
      }
    }, 6000);

    return () => {
      if (storyTimerRef.current) clearTimeout(storyTimerRef.current);
    };
  }, [activeStoryIndex, activeStoryList.length, showViewersSheet]);

  if (loading) return null;
  if (!isAuthenticated) {
    router.replace("/auth/login");
    return null;
  }

  const myStatuses = statuses.filter((s) => s.uid === userProfile?.uid);
  const otherStatuses = statuses.filter((s) => s.uid !== userProfile?.uid);

  // Filtered lists for search
  const filteredOtherStatuses = searchQuery.trim()
    ? otherStatuses.filter(
        (s) =>
          s.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.content.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : otherStatuses;

  const handlePostTextStatus = async () => {
    if (!statusText.trim() || !userProfile || publishing) return;
    setPublishing(true);
    try {
      await publishStatus({
        uid: userProfile.uid,
        userName: userProfile.displayName || userProfile.userCode,
        userCode: userProfile.userCode,
        userAvatar: userProfile.avatar || "",
        type: "text",
        content: statusText.trim(),
        bgColor: selectedBg,
      });
      setStatusText("");
      setIsCreatingText(false);
    } catch (err) {
      console.error("Failed to publish status:", err);
      alert("تعذر نشر الحالة، يرجى المحاولة مرة أخرى.");
    } finally {
      setPublishing(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userProfile || publishing) return;
    setPublishing(true);
    try {
      const base64 = await encodeImageToBase64(file, 640, 0.7);
      await publishStatus({
        uid: userProfile.uid,
        userName: userProfile.displayName || userProfile.userCode,
        userCode: userProfile.userCode,
        userAvatar: userProfile.avatar || "",
        type: "image",
        content: base64,
      });
    } catch (err) {
      console.error("Failed to upload status image:", err);
      alert("فشل معالجة ونشر صورة الحالة.");
    } finally {
      setPublishing(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSendStoryReply = async () => {
    if (!storyReply.trim() || activeStoryIndex === null || !userProfile) return;
    const currentStory = activeStoryList[activeStoryIndex];
    const replyText = `رد على الحالة: "${currentStory.content.substring(0, 40)}..."\n\n${storyReply.trim()}`;
    setStoryReply("");

    try {
      const targetUser = {
        uid: currentStory.uid,
        displayName: currentStory.userName,
        userCode: currentStory.userCode,
      } as any;
      const chatId = await getOrCreateDirectChat(userProfile, targetUser);
      await sendMessage(chatId, userProfile.uid, userProfile.displayName, replyText);
      alert("تم إرسال الرد في المحادثة بنجاح! ✉️");
    } catch (err) {
      console.error("Failed to send story reply:", err);
      alert("تعذر إرسال الرد.");
    }
  };

  const handleDeleteCurrentStatus = async () => {
    if (activeStoryIndex === null || !activeStoryList[activeStoryIndex]) return;
    const currentStory = activeStoryList[activeStoryIndex];
    if (confirm("هل تريد بالتأكيد حذف هذه الحالة نهائياً؟")) {
      try {
        await deleteStatus(currentStory.id);
        setActiveStoryIndex(null);
        setShowViewersSheet(false);
      } catch (err) {
        console.error("Failed to delete status:", err);
        alert("تعذر حذف الحالة.");
      }
    }
  };

  const openStoryViewer = (list: UserStatus[], startIndex: number = 0) => {
    setActiveStoryList(list);
    setActiveStoryIndex(startIndex);
    setShowViewersSheet(false);
  };

  const currentStory = activeStoryIndex !== null ? activeStoryList[activeStoryIndex] : null;
  const isMine = currentStory?.uid === userProfile?.uid;
  const viewersList = currentStory?.viewers || [];

  return (
    <div className={styles.chatLayout}>
      {/* Desktop Left Rail */}
      <AppNavRail
        activeTab="status"
        onSelectTab={(tab) => {
          if (tab === "chats") router.push("/chat");
          if (tab === "calls") router.push("/calls");
          if (tab === "settings") router.push("/profile");
        }}
      />

      {/* Main Container */}
      <div
        className={styles.appMainWrapper}
        style={{
          paddingLeft: "70px",
          background: "#0c1317",
          display: "flex",
          justifyContent: "center",
          alignItems: "stretch",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: "600px",
            height: "100%",
            margin: "0 auto",
            display: "flex",
            flexDirection: "column",
            background: "#0c1317",
            borderLeft: "1px solid rgba(255, 255, 255, 0.06)",
            borderRight: "1px solid rgba(255, 255, 255, 0.06)",
            position: "relative",
          }}
        >
          {/* Top Bar - WhatsApp Style */}
          <div
            style={{
              height: "64px",
              padding: "0 20px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              background: "#111b21",
              borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
              zIndex: 20,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <button
                type="button"
                onClick={() => router.push("/chat")}
                style={{
                  background: "none",
                  border: "none",
                  color: "#aebac1",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  padding: "6px",
                  borderRadius: "50%",
                }}
                title="رجوع للمحادثات"
              >
                <ArrowLeft size={22} />
              </button>
              <h1
                style={{
                  fontSize: "1.25rem",
                  fontWeight: 600,
                  color: "#e9edef",
                  margin: 0,
                }}
              >
                الحالات (Updates)
              </h1>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <button
                type="button"
                onClick={() => setShowSearch(!showSearch)}
                style={{
                  background: "none",
                  border: "none",
                  color: "#aebac1",
                  cursor: "pointer",
                  padding: "8px",
                  borderRadius: "50%",
                  display: "flex",
                }}
                title="بحث"
              >
                <Search size={22} />
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={publishing}
                style={{
                  background: "none",
                  border: "none",
                  color: "#aebac1",
                  cursor: "pointer",
                  padding: "8px",
                  borderRadius: "50%",
                  display: "flex",
                  opacity: publishing ? 0.5 : 1,
                }}
                title="رفع صورة للحالة"
              >
                <Camera size={22} />
              </button>
              <div style={{ position: "relative" }}>
                <button
                  type="button"
                  onClick={() => setShowMenu(!showMenu)}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#aebac1",
                    cursor: "pointer",
                    padding: "8px",
                    borderRadius: "50%",
                    display: "flex",
                  }}
                  title="خيارات"
                >
                  <MoreVertical size={22} />
                </button>

                {showMenu && (
                  <div
                    style={{
                      position: "absolute",
                      top: "100%",
                      right: 0,
                      background: "#233138",
                      borderRadius: "10px",
                      boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
                      padding: "6px",
                      minWidth: "190px",
                      zIndex: 30,
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setShowMenu(false);
                        alert("خصوصية الحالة: حالتك مشفرة ومرئية لجميع الأصدقاء 🟢");
                      }}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        width: "100%",
                        padding: "10px 14px",
                        background: "none",
                        border: "none",
                        color: "#e9edef",
                        fontSize: "0.9rem",
                        cursor: "pointer",
                        borderRadius: "6px",
                        textAlign: "right",
                      }}
                    >
                      <span>خصوصية الحالة (Privacy)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowMenu(false);
                        router.push("/profile");
                      }}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        width: "100%",
                        padding: "10px 14px",
                        background: "none",
                        border: "none",
                        color: "#e9edef",
                        fontSize: "0.9rem",
                        cursor: "pointer",
                        borderRadius: "6px",
                        textAlign: "right",
                      }}
                    >
                      <span>الإعدادات (Settings)</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Search Bar Input */}
          {showSearch && (
            <div
              style={{
                padding: "10px 20px",
                background: "#111b21",
                borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
                display: "flex",
                alignItems: "center",
                gap: "10px",
              }}
            >
              <Search size={18} color="#8696a0" />
              <input
                type="text"
                placeholder="بحث في الحالات والتحديثات..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
                style={{
                  flex: 1,
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  color: "#e9edef",
                  fontSize: "0.95rem",
                }}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#8696a0",
                    cursor: "pointer",
                  }}
                >
                  <X size={18} />
                </button>
              )}
            </div>
          )}

          {/* Hidden Image Input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={handlePhotoUpload}
          />

          {/* Main Status List Scrollable Area */}
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              paddingBottom: "80px",
            }}
          >
            {/* 1. My Status Section */}
            <div
              style={{
                padding: "16px 20px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                background: "#111b21",
                borderBottom: "1px solid rgba(255, 255, 255, 0.04)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "16px",
                  flex: 1,
                  cursor: "pointer",
                }}
                onClick={() => {
                  if (myStatuses.length > 0) {
                    openStoryViewer(myStatuses, 0);
                  } else {
                    setIsCreatingText(true);
                  }
                }}
              >
                <div style={{ position: "relative" }}>
                  <div
                    style={{
                      width: "52px",
                      height: "52px",
                      borderRadius: "50%",
                      background: myStatuses.length > 0 ? "transparent" : "#202c33",
                      border: myStatuses.length > 0 ? "2.5px solid #00a884" : "1px solid rgba(255, 255, 255, 0.1)",
                      padding: myStatuses.length > 0 ? "2px" : "0",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#aebac1",
                      fontWeight: 600,
                      fontSize: "1.1rem",
                      overflow: "hidden",
                    }}
                  >
                    {myStatuses.length > 0 && myStatuses[0].type === "image" ? (
                      <img
                        src={myStatuses[0].content}
                        alt="My status"
                        style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }}
                      />
                    ) : myStatuses.length > 0 && myStatuses[0].type === "text" ? (
                      <div
                        style={{
                          width: "100%",
                          height: "100%",
                          borderRadius: "50%",
                          background: myStatuses[0].bgColor || "#005c4b",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "#fff",
                          fontSize: "0.75rem",
                          padding: "2px",
                          textAlign: "center",
                        }}
                      >
                        {myStatuses[0].content.substring(0, 10)}
                      </div>
                    ) : (
                      userProfile?.displayName?.[0] || "أنا"
                    )}
                  </div>

                  {myStatuses.length === 0 && (
                    <div
                      style={{
                        position: "absolute",
                        bottom: 0,
                        right: 0,
                        width: "20px",
                        height: "20px",
                        borderRadius: "50%",
                        background: "#00a884",
                        color: "#111b21",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        boxShadow: "0 0 0 2px #111b21",
                      }}
                    >
                      <Plus size={14} strokeWidth={3} />
                    </div>
                  )}
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <span style={{ fontSize: "1rem", fontWeight: 600, color: "#e9edef" }}>
                    حالتي
                  </span>
                  <span style={{ fontSize: "0.82rem", color: "#8696a0", display: "flex", alignItems: "center", gap: "6px" }}>
                    {myStatuses.length > 0 ? (
                      <>
                        <span>{formatStatusAge(myStatuses[0].createdAt)}</span>
                        <span>•</span>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 3, color: "#00a884" }}>
                          <Eye size={13} />
                          {myStatuses[0].viewers?.length || 0} مشاهدة
                        </span>
                      </>
                    ) : (
                      "انقر لإضافة تحديث لحالتك"
                    )}
                  </span>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <button
                  type="button"
                  onClick={() => setIsCreatingText(true)}
                  style={{
                    width: "38px",
                    height: "38px",
                    borderRadius: "50%",
                    background: "#202c33",
                    border: "none",
                    color: "#aebac1",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                  }}
                  title="كتابة حالة نصية"
                >
                  <Edit2 size={18} />
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    width: "38px",
                    height: "38px",
                    borderRadius: "50%",
                    background: "#202c33",
                    border: "none",
                    color: "#aebac1",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                  }}
                  title="رفع صورة للحالة"
                >
                  <Camera size={18} />
                </button>
              </div>
            </div>

            {/* 2. Recent Updates Header */}
            <div
              style={{
                padding: "16px 20px 8px",
                fontSize: "0.85rem",
                fontWeight: 600,
                color: "#8696a0",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
              }}
            >
              آخر التحديثات ({filteredOtherStatuses.length})
            </div>

            {/* 3. Other Users Statuses List */}
            {filteredOtherStatuses.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column" }}>
                {filteredOtherStatuses.map((item, idx) => {
                  const hasViewed = (item.viewers || []).some((v) => v.uid === userProfile?.uid);
                  return (
                    <div
                      key={item.id}
                      onClick={() => openStoryViewer(filteredOtherStatuses, idx)}
                      style={{
                        padding: "12px 20px",
                        display: "flex",
                        alignItems: "center",
                        gap: "16px",
                        cursor: "pointer",
                        transition: "background 0.15s ease",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "#182229";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "transparent";
                      }}
                    >
                      <div
                        style={{
                          width: "52px",
                          height: "52px",
                          borderRadius: "50%",
                          border: hasViewed ? "2px solid #8696a0" : "2.5px solid #00a884",
                          padding: "2px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                          overflow: "hidden",
                        }}
                      >
                        {item.type === "image" ? (
                          <img
                            src={item.content}
                            alt={item.userName}
                            style={{
                              width: "100%",
                              height: "100%",
                              borderRadius: "50%",
                              objectFit: "cover",
                            }}
                          />
                        ) : (
                          <div
                            style={{
                              width: "100%",
                              height: "100%",
                              borderRadius: "50%",
                              background: item.bgColor || "#005c4b",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              color: "#fff",
                              fontSize: "0.75rem",
                              fontWeight: 600,
                              padding: "2px",
                              textAlign: "center",
                            }}
                          >
                            {item.userName?.[0] || "م"}
                          </div>
                        )}
                      </div>

                      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "4px" }}>
                        <span style={{ fontSize: "1rem", fontWeight: 500, color: "#e9edef" }}>
                          {item.userName}
                        </span>
                        <span style={{ fontSize: "0.82rem", color: "#8696a0" }}>
                          {formatStatusAge(item.createdAt)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div
                style={{
                  padding: "40px 20px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  textAlign: "center",
                  gap: "12px",
                  color: "#8696a0",
                }}
              >
                <div
                  style={{
                    width: "60px",
                    height: "60px",
                    borderRadius: "50%",
                    background: "#182229",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#00a884",
                  }}
                >
                  <Users size={28} />
                </div>
                <div style={{ fontSize: "0.95rem", fontWeight: 500, color: "#e9edef" }}>
                  لا توجد تحديثات جديدة حالياً
                </div>
                <div style={{ fontSize: "0.82rem", maxWidth: "280px", lineHeight: "1.4" }}>
                  ستظهر حالات أصدقائك وجهات اتصالك المسجلة هنا فور قيامهم بنشر أي حالة جديدة.
                </div>
              </div>
            )}
          </div>

          {/* ==================== FULLSCREEN STORY VIEWER ==================== */}
          {activeStoryIndex !== null && currentStory && (
            <div
              style={{
                position: "fixed",
                inset: 0,
                zIndex: 100,
                background: currentStory.type === "text" ? currentStory.bgColor || "#005c4b" : "#000",
                display: "flex",
                flexDirection: "column",
                animation: "fadeIn 0.2s ease",
              }}
            >
              {/* Top Progress Bars */}
              <div
                style={{
                  display: "flex",
                  gap: "4px",
                  padding: "12px 16px 8px",
                  zIndex: 20,
                }}
              >
                {activeStoryList.map((_, idx) => (
                  <div
                    key={idx}
                    style={{
                      flex: 1,
                      height: "3px",
                      background: "rgba(255, 255, 255, 0.3)",
                      borderRadius: "2px",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        background: "#fff",
                        width:
                          idx < activeStoryIndex
                            ? "100%"
                            : idx === activeStoryIndex && !showViewersSheet
                            ? "100%"
                            : "0%",
                        transition: idx === activeStoryIndex && !showViewersSheet ? "width 6s linear" : "none",
                      }}
                    />
                  </div>
                ))}
              </div>

              {/* Story Header */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "8px 16px",
                  zIndex: 20,
                  background: "linear-gradient(to bottom, rgba(0,0,0,0.6), transparent)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <button
                    type="button"
                    onClick={() => setActiveStoryIndex(null)}
                    style={{
                      background: "none",
                      border: "none",
                      color: "#fff",
                      cursor: "pointer",
                      padding: "4px",
                    }}
                  >
                    <ArrowLeft size={22} />
                  </button>
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    <span style={{ color: "#fff", fontWeight: 600, fontSize: "0.95rem" }}>
                      {isMine ? "حالتي" : currentStory.userName}
                    </span>
                    <span style={{ color: "rgba(255,255,255,0.7)", fontSize: "0.75rem" }}>
                      {formatStatusAge(currentStory.createdAt)}
                    </span>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  {isMine && (
                    <button
                      type="button"
                      onClick={handleDeleteCurrentStatus}
                      style={{
                        background: "rgba(0,0,0,0.3)",
                        border: "none",
                        color: "#ef4444",
                        cursor: "pointer",
                        padding: "8px",
                        borderRadius: "50%",
                        display: "flex",
                      }}
                      title="حذف الحالة"
                    >
                      <Trash2 size={18} />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setActiveStoryIndex(null)}
                    style={{
                      background: "rgba(0,0,0,0.3)",
                      border: "none",
                      color: "#fff",
                      cursor: "pointer",
                      padding: "8px",
                      borderRadius: "50%",
                      display: "flex",
                    }}
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              {/* Story Content Area */}
              <div
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "24px",
                  position: "relative",
                  userSelect: "none",
                }}
              >
                {/* Previous Story Tap Trigger */}
                <div
                  style={{
                    position: "absolute",
                    left: 0,
                    top: 0,
                    bottom: 0,
                    width: "35%",
                    zIndex: 10,
                    cursor: "pointer",
                  }}
                  onClick={() => {
                    if (activeStoryIndex > 0) {
                      setActiveStoryIndex(activeStoryIndex - 1);
                    }
                  }}
                />

                {/* Next Story Tap Trigger */}
                <div
                  style={{
                    position: "absolute",
                    right: 0,
                    top: 0,
                    bottom: 0,
                    width: "35%",
                    zIndex: 10,
                    cursor: "pointer",
                  }}
                  onClick={() => {
                    if (activeStoryIndex < activeStoryList.length - 1) {
                      setActiveStoryIndex(activeStoryIndex + 1);
                    } else {
                      setActiveStoryIndex(null);
                    }
                  }}
                />

                {currentStory.type === "text" ? (
                  <p
                    style={{
                      color: "#fff",
                      fontSize: "1.85rem",
                      fontWeight: "600",
                      textAlign: "center",
                      lineHeight: "1.6",
                      maxWidth: "480px",
                      wordBreak: "break-word",
                    }}
                  >
                    {currentStory.content}
                  </p>
                ) : (
                  <img
                    src={currentStory.content}
                    alt="Status Story"
                    style={{
                      maxWidth: "100%",
                      maxHeight: "75vh",
                      objectFit: "contain",
                      borderRadius: "12px",
                    }}
                  />
                )}
              </div>

              {/* ==================== BOTTOM VIEWER BAR ==================== */}
              {isMine ? (
                /* Owner Views Bar */
                <div
                  style={{
                    padding: "14px 20px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                    background: "rgba(0,0,0,0.5)",
                    zIndex: 20,
                    cursor: "pointer",
                    backdropFilter: "blur(8px)",
                  }}
                  onClick={() => setShowViewersSheet(true)}
                >
                  <Eye size={18} color="#00a884" />
                  <span style={{ color: "#fff", fontWeight: 600, fontSize: "0.92rem" }}>
                    {viewersList.length > 0 ? `${viewersList.length} مشاهدة` : "لم يشاهدها أحد بعد"}
                  </span>
                  <span style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.78rem", marginRight: 4 }}>
                    (انقر لعرض القائمة)
                  </span>
                </div>
              ) : (
                /* Visitor Reply Bar */
                <div
                  style={{
                    padding: "16px 20px",
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    background: "rgba(0,0,0,0.5)",
                    zIndex: 20,
                    backdropFilter: "blur(8px)",
                  }}
                >
                  <input
                    type="text"
                    placeholder="رد على الحالة..."
                    value={storyReply}
                    onChange={(e) => setStoryReply(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSendStoryReply();
                    }}
                    style={{
                      flex: 1,
                      padding: "12px 18px",
                      borderRadius: "24px",
                      border: "none",
                      outline: "none",
                      background: "rgba(255,255,255,0.18)",
                      color: "#fff",
                      fontSize: "0.95rem",
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleSendStoryReply}
                    disabled={!storyReply.trim()}
                    style={{
                      width: "44px",
                      height: "44px",
                      borderRadius: "50%",
                      background: "#00a884",
                      border: "none",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#111b21",
                      cursor: "pointer",
                      opacity: storyReply.trim() ? 1 : 0.5,
                    }}
                  >
                    <Send size={20} />
                  </button>
                </div>
              )}

              {/* ==================== VIEWERS BOTTOM SHEET MODAL ==================== */}
              {showViewersSheet && isMine && (
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    zIndex: 30,
                    background: "rgba(0, 0, 0, 0.65)",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "flex-end",
                  }}
                  onClick={() => setShowViewersSheet(false)}
                >
                  <div
                    style={{
                      background: "#1f2c34",
                      borderTopLeftRadius: "20px",
                      borderTopRightRadius: "20px",
                      maxHeight: "65vh",
                      display: "flex",
                      flexDirection: "column",
                      padding: "20px",
                      boxShadow: "0 -8px 32px rgba(0,0,0,0.6)",
                      animation: "slideUp 0.22s ease-out",
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* Sheet Header */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        paddingBottom: "14px",
                        borderBottom: "1px solid rgba(255,255,255,0.08)",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <Eye size={20} color="#00a884" />
                        <h3 style={{ margin: 0, fontSize: "1.1rem", color: "#e9edef", fontWeight: 600 }}>
                          المشاهدات ({viewersList.length})
                        </h3>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowViewersSheet(false)}
                        style={{
                          background: "none",
                          border: "none",
                          color: "#8696a0",
                          cursor: "pointer",
                          padding: "4px",
                        }}
                      >
                        <X size={20} />
                      </button>
                    </div>

                    {/* Viewers List */}
                    <div
                      style={{
                        overflowY: "auto",
                        maxHeight: "45vh",
                        paddingTop: "10px",
                        display: "flex",
                        flexDirection: "column",
                        gap: "6px",
                      }}
                    >
                      {viewersList.length > 0 ? (
                        viewersList.map((viewer, vIdx) => (
                          <div
                            key={vIdx}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              padding: "10px 8px",
                              borderRadius: "8px",
                              background: "rgba(255,255,255,0.03)",
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                              <div
                                style={{
                                  width: "42px",
                                  height: "42px",
                                  borderRadius: "50%",
                                  background: "#2a3942",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  color: "#00a884",
                                  fontWeight: 600,
                                  fontSize: "0.95rem",
                                }}
                              >
                                {viewer.userName?.[0] || "م"}
                              </div>
                              <div style={{ display: "flex", flexDirection: "column" }}>
                                <span style={{ color: "#e9edef", fontWeight: 500, fontSize: "0.92rem" }}>
                                  {viewer.userName}
                                </span>
                                <span style={{ color: "#8696a0", fontSize: "0.78rem" }}>
                                  شاهد حالتك
                                </span>
                              </div>
                            </div>
                            <span style={{ color: "#00a884", fontSize: "0.8rem", display: "flex", alignItems: "center", gap: "4px" }}>
                              <Clock size={12} />
                              {formatViewerTime(viewer.viewedAt)}
                            </span>
                          </div>
                        ))
                      ) : (
                        <div
                          style={{
                            padding: "30px 10px",
                            textAlign: "center",
                            color: "#8696a0",
                            fontSize: "0.9rem",
                          }}
                        >
                          لم يشاهد أحد حالتك حتى الآن ⏳
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ==================== TEXT STATUS CREATOR SCREEN ==================== */}
          {isCreatingText && (
            <div
              style={{
                position: "fixed",
                inset: 0,
                zIndex: 200,
                background: selectedBg,
                display: "flex",
                flexDirection: "column",
                animation: "fadeIn 0.2s ease",
              }}
            >
              {/* Top Controls */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "16px 20px",
                }}
              >
                <button
                  type="button"
                  onClick={() => setIsCreatingText(false)}
                  style={{ background: "none", border: "none", color: "#fff", cursor: "pointer" }}
                >
                  <X size={26} />
                </button>

                {/* Color Palette Switcher */}
                <div style={{ display: "flex", gap: "8px" }}>
                  {BG_COLORS.map((col) => (
                    <button
                      key={col}
                      type="button"
                      onClick={() => setSelectedBg(col)}
                      style={{
                        width: "28px",
                        height: "28px",
                        borderRadius: "50%",
                        background: col,
                        border: selectedBg === col ? "2px solid #fff" : "1px solid rgba(255,255,255,0.4)",
                        cursor: "pointer",
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* Text Input Center */}
              <div
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "30px",
                }}
              >
                <textarea
                  value={statusText}
                  onChange={(e) => setStatusText(e.target.value)}
                  placeholder="اكتب حالتك هنا..."
                  maxLength={250}
                  autoFocus
                  style={{
                    width: "100%",
                    maxWidth: "500px",
                    background: "transparent",
                    border: "none",
                    outline: "none",
                    color: "#fff",
                    fontSize: "2rem",
                    fontWeight: "600",
                    textAlign: "center",
                    resize: "none",
                    lineHeight: "1.5",
                  }}
                  rows={4}
                />
              </div>

              {/* Bottom Post Bar */}
              <div
                style={{
                  padding: "20px 24px",
                  display: "flex",
                  justifyContent: "flex-end",
                }}
              >
                <button
                  type="button"
                  onClick={handlePostTextStatus}
                  disabled={!statusText.trim() || publishing}
                  style={{
                    width: "56px",
                    height: "56px",
                    borderRadius: "50%",
                    background: "#00a884",
                    border: "none",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#111b21",
                    boxShadow: "0 6px 20px rgba(0,0,0,0.3)",
                    cursor: "pointer",
                    opacity: statusText.trim() && !publishing ? 1 : 0.4,
                  }}
                >
                  <Send size={24} />
                </button>
              </div>
            </div>
          )}

          {/* Mobile Bottom Navigation Bar */}
          <MobileBottomNav
            activeTab="status"
            onTabChange={(tab) => {
              if (tab === "chats") router.push("/chat");
              if (tab === "calls") router.push("/calls");
              if (tab === "settings") router.push("/profile");
            }}
            onOpenCalls={() => router.push("/calls")}
            onOpenStatus={() => {}}
            onOpenSettings={() => router.push("/profile")}
          />
        </div>
      </div>
    </div>
  );
}
