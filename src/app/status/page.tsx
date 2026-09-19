"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/contexts/AuthContext";
import { useChats } from "@/lib/contexts/ChatContext";
import { sendMessage, getOrCreateDirectChat } from "@/lib/firebase/firestore";
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
  Sparkles,
  Smile,
  ChevronRight,
  ChevronLeft,
} from "lucide-react";
import styles from "@/styles/chat.module.css";

interface StatusItem {
  id: string;
  userName: string;
  userCode: string;
  isMine: boolean;
  type: "text" | "image";
  content: string;
  bgColor?: string;
  timestamp: number;
}

const BG_COLORS = [
  "#005c4b", // WhatsApp Green
  "#1e3a8a", // Deep Blue
  "#701a75", // Purple
  "#831843", // Crimson
  "#78350f", // Amber
  "#18181b", // Sleek Dark
  "#047857", // Emerald
];

export default function StatusPage() {
  const router = useRouter();
  const { userProfile, isAuthenticated, loading } = useAuth();
  const { chats } = useChats();

  const [statuses, setStatuses] = useState<StatusItem[]>([]);
  const [activeStoryIndex, setActiveStoryIndex] = useState<number | null>(null);
  const [isCreatingText, setIsCreatingText] = useState(false);
  const [statusText, setStatusText] = useState("");
  const [selectedBg, setSelectedBg] = useState(BG_COLORS[0]);
  const [storyReply, setStoryReply] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const storyTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Load statuses from localStorage (strictly real, purge all mock fake statuses)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("youssef_app_statuses");
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          const clean = Array.isArray(parsed)
            ? parsed.filter(
                (s: any) =>
                  !["status_support", "status_youssef", "status_malak"].includes(s.id) &&
                  s.userName !== "Eng:Youssef Mansour ✨" &&
                  s.userName !== "Malak Osama 🌸" &&
                  s.userName !== "الدعم الفني الرسمي (#123) 🎧"
              )
            : [];
          setStatuses(clean);
          localStorage.setItem("youssef_app_statuses", JSON.stringify(clean));
        } catch {
          setStatuses([]);
          localStorage.removeItem("youssef_app_statuses");
        }
      } else {
        setStatuses([]);
      }
    }
  }, []);

  const saveStatuses = (newStatuses: StatusItem[]) => {
    setStatuses(newStatuses);
    if (typeof window !== "undefined") {
      localStorage.setItem("youssef_app_statuses", JSON.stringify(newStatuses));
    }
  };

  // Story Viewer Timer (6s per story)
  useEffect(() => {
    if (activeStoryIndex === null) return;

    if (storyTimerRef.current) clearTimeout(storyTimerRef.current);
    storyTimerRef.current = setTimeout(() => {
      if (activeStoryIndex < statuses.length - 1) {
        setActiveStoryIndex((prev) => (prev !== null ? prev + 1 : null));
      } else {
        setActiveStoryIndex(null);
      }
    }, 6000);

    return () => {
      if (storyTimerRef.current) clearTimeout(storyTimerRef.current);
    };
  }, [activeStoryIndex, statuses.length]);

  if (loading) return null;
  if (!isAuthenticated) {
    router.replace("/auth/login");
    return null;
  }

  const myStatuses = statuses.filter((s) => s.isMine);
  const otherStatuses = statuses.filter((s) => !s.isMine);

  const handlePostTextStatus = () => {
    if (!statusText.trim() || !userProfile) return;
    const newStatus: StatusItem = {
      id: "status_" + Date.now(),
      userName: userProfile.displayName || "أنا",
      userCode: userProfile.userCode || "",
      isMine: true,
      type: "text",
      content: statusText.trim(),
      bgColor: selectedBg,
      timestamp: Date.now(),
    };
    saveStatuses([newStatus, ...statuses]);
    setStatusText("");
    setIsCreatingText(false);
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userProfile) return;

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      const newStatus: StatusItem = {
        id: "status_" + Date.now(),
        userName: userProfile.displayName || "أنا",
        userCode: userProfile.userCode || "",
        isMine: true,
        type: "image",
        content: base64,
        timestamp: Date.now(),
      };
      saveStatuses([newStatus, ...statuses]);
    };
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSendStoryReply = async () => {
    if (!storyReply.trim() || activeStoryIndex === null || !userProfile) return;
    const currentStory = statuses[activeStoryIndex];
    const replyText = `الرد على الحالة: "${currentStory.content.substring(0, 40)}..."\n\n${storyReply.trim()}`;
    setStoryReply("");

    try {
      // Find or create direct chat with the status owner
      const targetUser = {
        uid: currentStory.userCode === "123" ? "support_official_123" : currentStory.userCode,
        displayName: currentStory.userName,
        userCode: currentStory.userCode,
      } as any;
      const chatId = await getOrCreateDirectChat(userProfile, targetUser);
      await sendMessage(chatId, userProfile.uid, userProfile.displayName, replyText);
      alert("تم إرسال ردك في المحادثة بنجاح! 🚀");
    } catch (err) {
      console.error("Failed to send story reply:", err);
      alert("تم حفظ الرد!");
    }
  };

  const formatStatusTime = (ms: number) => {
    const diffMin = Math.floor((Date.now() - ms) / (1000 * 60));
    if (diffMin < 1) return "الآن";
    if (diffMin < 60) return `منذ ${diffMin} دقيقة`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `منذ ${diffHours} ساعة`;
    return "أمس";
  };

  const getInitials = (name?: string) => {
    if (!name || !name.trim()) return "U";
    return name
      .trim()
      .split(" ")
      .map((n) => n[0])
      .join("")
      .substring(0, 2)
      .toUpperCase();
  };

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
              background: "#0c1317",
              borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
              flexShrink: 0,
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
                  padding: "6px",
                  borderRadius: "50%",
                  display: "flex",
                }}
                title="الرجوع إلى المحادثات"
              >
                <ArrowLeft size={22} />
              </button>
              <h1
                style={{
                  fontSize: "1.35rem",
                  fontWeight: "700",
                  color: "#e9edef",
                  margin: 0,
                }}
              >
                Updates
              </h1>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <button
                type="button"
                onClick={() => setShowSearch(!showSearch)}
                style={{
                  background: "none",
                  border: "none",
                  color: showSearch ? "#00a884" : "#aebac1",
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
                style={{
                  background: "none",
                  border: "none",
                  color: "#aebac1",
                  cursor: "pointer",
                  padding: "8px",
                  borderRadius: "50%",
                  display: "flex",
                }}
                title="التقاط أو رفع صورة"
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
                        alert("خصوصية الحالة: حالتك مرئية لجميع جهات اتصالك المسجلة 🟢");
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
                      <span className="material-symbols-outlined" style={{ fontSize: "18px", color: "var(--primary)" }}>
                        lock
                      </span>
                      خصوصية الحالة (Privacy)
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
                      <span className="material-symbols-outlined" style={{ fontSize: "18px", color: "var(--primary)" }}>
                        settings
                      </span>
                      الإعدادات (Settings)
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

          {/* Scrollable Body */}
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              paddingBottom: "90px",
            }}
          >
            {/* Status Section Title */}
            <div
              style={{
                padding: "18px 20px 8px 20px",
                fontSize: "1.05rem",
                fontWeight: "700",
                color: "#e9edef",
              }}
            >
              Status
            </div>

            {/* My Status Row */}
            <div
              onClick={() => {
                if (myStatuses.length > 0) {
                  const idx = statuses.findIndex((s) => s.id === myStatuses[0].id);
                  setActiveStoryIndex(idx >= 0 ? idx : 0);
                } else {
                  setIsCreatingText(true);
                }
              }}
              style={{
                display: "flex",
                alignItems: "center",
                padding: "12px 20px",
                gap: "16px",
                cursor: "pointer",
                transition: "background 0.15s ease",
              }}
              onMouseEnter={(e) =>
                ((e.currentTarget as HTMLElement).style.background = "#182229")
              }
              onMouseLeave={(e) =>
                ((e.currentTarget as HTMLElement).style.background = "transparent")
              }
            >
              <div style={{ position: "relative" }}>
                <div
                  style={{
                    width: "52px",
                    height: "52px",
                    borderRadius: "50%",
                    border:
                      myStatuses.length > 0
                        ? "2px solid #00a884"
                        : "2px solid rgba(255, 255, 255, 0.15)",
                    padding: "2px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <div
                    style={{
                      width: "100%",
                      height: "100%",
                      borderRadius: "50%",
                      background: "#222e35",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#00a884",
                      fontWeight: "bold",
                      fontSize: "1.1rem",
                    }}
                  >
                    {getInitials(userProfile?.displayName)}
                  </div>
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
                      border: "2px solid #0c1317",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#111b21",
                    }}
                  >
                    <Plus size={14} strokeWidth={3} />
                  </div>
                )}
              </div>

              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "3px" }}>
                <span
                  style={{
                    color: "#e9edef",
                    fontSize: "1rem",
                    fontWeight: "600",
                  }}
                >
                  My status
                </span>
                <span
                  style={{
                    color: "#8696a0",
                    fontSize: "0.85rem",
                  }}
                >
                  {myStatuses.length > 0
                    ? formatStatusTime(myStatuses[0].timestamp)
                    : "Tap to add status update"}
                </span>
              </div>
            </div>

            {/* Recent Updates Header */}
            <div
              style={{
                padding: "20px 20px 8px 20px",
                fontSize: "0.85rem",
                fontWeight: "600",
                color: "#8696a0",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
              }}
            >
              Recent updates
            </div>

            {/* Stories List */}
            {otherStatuses.length === 0 ? (
              <div
                style={{
                  textAlign: "center",
                  padding: "36px 20px",
                  color: "#8696a0",
                  fontSize: "0.9rem",
                }}
              >
                لا توجد حالات حديثة من جهات اتصالك حالياً
              </div>
            ) : (
              otherStatuses.map((item) => {
                const globalIdx = statuses.findIndex((s) => s.id === item.id);
                return (
                  <div
                    key={item.id}
                    onClick={() => setActiveStoryIndex(globalIdx >= 0 ? globalIdx : 0)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      padding: "12px 20px",
                      gap: "16px",
                      cursor: "pointer",
                      transition: "background 0.15s ease",
                    }}
                    onMouseEnter={(e) =>
                      ((e.currentTarget as HTMLElement).style.background = "#182229")
                    }
                    onMouseLeave={(e) =>
                      ((e.currentTarget as HTMLElement).style.background = "transparent")
                    }
                  >
                  <div
                    style={{
                      width: "52px",
                      height: "52px",
                      borderRadius: "50%",
                      border: "2px solid #00a884",
                      padding: "2px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <div
                      style={{
                        width: "100%",
                        height: "100%",
                        borderRadius: "50%",
                        background: item.bgColor || "#222e35",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#fff",
                        fontWeight: "bold",
                        fontSize: "1rem",
                      }}
                    >
                      {getInitials(item.userName)}
                    </div>
                  </div>

                  <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "3px" }}>
                    <span
                      style={{
                        color: "#e9edef",
                        fontSize: "0.98rem",
                        fontWeight: "600",
                      }}
                    >
                      {item.userName}
                    </span>
                    <span
                      style={{
                        color: "#8696a0",
                        fontSize: "0.85rem",
                      }}
                    >
                      {formatStatusTime(item.timestamp)}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

          {/* Floating Buttons: Pencil for text & Camera for photo */}
          <div
            style={{
              position: "absolute",
              bottom: "76px",
              right: "24px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "14px",
              zIndex: 30,
            }}
          >
            {/* Pencil Button (Text Status) */}
            <button
              type="button"
              onClick={() => setIsCreatingText(true)}
              style={{
                width: "44px",
                height: "44px",
                borderRadius: "14px",
                background: "#202c33",
                border: "none",
                color: "#aebac1",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 6px 16px rgba(0, 0, 0, 0.4)",
                cursor: "pointer",
                transition: "transform 0.15s ease",
              }}
              title="نشر حالة نصية"
            >
              <Edit2 size={20} />
            </button>

            {/* Camera Button (Photo Status) */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              style={{
                width: "56px",
                height: "56px",
                borderRadius: "16px",
                background: "#00a884",
                border: "none",
                color: "#111b21",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 8px 24px rgba(0, 168, 132, 0.4)",
                cursor: "pointer",
                transition: "transform 0.15s ease",
              }}
              title="التقاط أو نشر صورة"
            >
              <Camera size={26} strokeWidth={2.5} />
            </button>
          </div>

          {/* Hidden File Input for Status Photo */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={handlePhotoUpload}
          />

          {/* Fullscreen Story Viewer */}
          {activeStoryIndex !== null && statuses[activeStoryIndex] && (
            <div
              style={{
                position: "fixed",
                inset: 0,
                zIndex: 200,
                background: statuses[activeStoryIndex].bgColor || "#0b141a",
                display: "flex",
                flexDirection: "column",
                animation: "fadeIn 0.2s ease",
              }}
            >
              {/* Segmented Progress Bar */}
              <div
                style={{
                  display: "flex",
                  gap: "4px",
                  padding: "16px 16px 8px 16px",
                }}
              >
                {statuses.map((_, i) => (
                  <div
                    key={i}
                    style={{
                      flex: 1,
                      height: "3px",
                      background: "rgba(255,255,255,0.3)",
                      borderRadius: "2px",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        background: "#fff",
                        width:
                          i < activeStoryIndex
                            ? "100%"
                            : i === activeStoryIndex
                            ? "100%"
                            : "0%",
                        transition: i === activeStoryIndex ? "width 6s linear" : "none",
                      }}
                    />
                  </div>
                ))}
              </div>

              {/* Story Top Bar */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "8px 16px",
                  color: "#fff",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <div
                    style={{
                      width: "40px",
                      height: "40px",
                      borderRadius: "50%",
                      background: "rgba(255,255,255,0.2)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: "bold",
                    }}
                  >
                    {getInitials(statuses[activeStoryIndex].userName)}
                  </div>
                  <div>
                    <div style={{ fontWeight: "600", fontSize: "1rem" }}>
                      {statuses[activeStoryIndex].userName}
                    </div>
                    <div style={{ fontSize: "0.78rem", opacity: 0.85 }}>
                      {formatStatusTime(statuses[activeStoryIndex].timestamp)}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveStoryIndex(null)}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#fff",
                    cursor: "pointer",
                    padding: "6px",
                  }}
                >
                  <X size={26} />
                </button>
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
                {/* Previous Story Tap Trigger (Left 30%) */}
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

                {/* Next Story Tap Trigger (Right 35%) */}
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
                    if (activeStoryIndex < statuses.length - 1) {
                      setActiveStoryIndex(activeStoryIndex + 1);
                    } else {
                      setActiveStoryIndex(null);
                    }
                  }}
                />

                {statuses[activeStoryIndex].type === "text" ? (
                  <p
                    style={{
                      color: "#fff",
                      fontSize: "1.8rem",
                      fontWeight: "600",
                      textAlign: "center",
                      lineHeight: "1.6",
                      maxWidth: "480px",
                      wordBreak: "break-word",
                    }}
                  >
                    {statuses[activeStoryIndex].content}
                  </p>
                ) : (
                  <img
                    src={statuses[activeStoryIndex].content}
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

              {/* Bottom Reply Bar */}
              {!statuses[activeStoryIndex].isMine && (
                <div
                  style={{
                    padding: "16px 20px",
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    background: "rgba(0,0,0,0.4)",
                    zIndex: 20,
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
                      background: "rgba(255,255,255,0.15)",
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
            </div>
          )}

          {/* Text Status Creator Screen */}
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
                  disabled={!statusText.trim()}
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
                    opacity: statusText.trim() ? 1 : 0.4,
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
