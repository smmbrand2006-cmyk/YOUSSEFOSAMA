"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/contexts/AuthContext";
import { useCall } from "@/lib/contexts/CallContext";
import { useChats } from "@/lib/contexts/ChatContext";
import AppNavRail from "@/components/chat/AppNavRail";
import MobileBottomNav from "@/components/chat/MobileBottomNav";
import SelectContactModal from "@/components/chat/SelectContactModal";
import CreateGroupModal from "@/components/chat/CreateGroupModal";
import { useBackHandler } from "@/lib/contexts/BackHandlerContext";
import {
  Phone,
  Video,
  Search,
  MoreVertical,
  Calendar,
  Grid,
  PhoneCall,
  ArrowDownLeft,
  ArrowUpRight,
  X,
  PhoneForwarded,
  User,
  Trash2,
} from "lucide-react";
import styles from "@/styles/chat.module.css";

interface CallLogItem {
  id: string;
  name: string;
  userCode?: string;
  avatar?: string;
  direction: "missed" | "outgoing" | "incoming";
  type: "audio" | "video";
  timestamp: string;
  count?: number;
  uid?: string;
}

export default function CallsPage() {
  const router = useRouter();
  const { userProfile, isAuthenticated, loading } = useAuth();
  const { initiateCall } = useCall();
  const { totalUnread } = useChats();

  const [calls, setCalls] = useState<CallLogItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [showKeypad, setShowKeypad] = useState(false);
  const [keypadNumber, setKeypadNumber] = useState("");
  const [showSelectContact, setShowSelectContact] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  // Back Navigation Handlers for Calls Page
  useBackHandler(showKeypad, () => setShowKeypad(false), "calls_keypad", 25);
  useBackHandler(showSelectContact, () => setShowSelectContact(false), "calls_select_contact", 25);
  useBackHandler(showCreateGroup, () => setShowCreateGroup(false), "calls_create_group", 25);
  useBackHandler(showSearch, () => setShowSearch(false), "calls_search", 15);
  useBackHandler(showMenu, () => setShowMenu(false), "calls_menu", 15);
  useBackHandler(true, () => router.push("/chat"), "calls_page_to_chat", 5);

  // Load from localStorage (strictly real calls, purge all mock fake data)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("youssef_app_calls");
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          const clean = Array.isArray(parsed)
            ? parsed.filter(
                (c: any) =>
                  !c.id.startsWith("call_1") &&
                  !c.id.startsWith("call_2") &&
                  !c.id.startsWith("call_3") &&
                  !c.id.startsWith("call_4") &&
                  !c.id.startsWith("call_5") &&
                  !c.id.startsWith("call_6") &&
                  !c.id.startsWith("call_7") &&
                  !c.id.startsWith("call_8") &&
                  c.name !== "الواقفين عن العمل ☝️💸" &&
                  c.name !== "Malak Osama" &&
                  c.name !== "Zeyad Samey" &&
                  c.name !== "RO7Y💍🤍" &&
                  c.name !== "Ahmed Ezz" &&
                  c.name !== "Mostafa Maged ✨🚶"
              )
            : [];
          setCalls(clean);
          localStorage.setItem("youssef_app_calls", JSON.stringify(clean));
        } catch {
          setCalls([]);
          localStorage.removeItem("youssef_app_calls");
        }
      } else {
        setCalls([]);
      }
    }
  }, []);

  // Save to localStorage when calls change
  const saveCalls = (newCalls: CallLogItem[]) => {
    setCalls(newCalls);
    if (typeof window !== "undefined") {
      localStorage.setItem("youssef_app_calls", JSON.stringify(newCalls));
    }
  };

  const handleClearLog = () => {
    if (confirm("هل تريد مسح سجل المكالمات بالكامل؟")) {
      saveCalls([]);
      setShowMenu(false);
    }
  };

  const handleStartCall = async (item: CallLogItem, type: "audio" | "video") => {
    const targetUid = item.uid || item.userCode || "support_official_123";
    try {
      await initiateCall(targetUid, item.name, "", type);
      // Add outgoing record
      const newRecord: CallLogItem = {
        id: "call_" + Date.now(),
        name: item.name,
        userCode: item.userCode,
        direction: "outgoing",
        type,
        timestamp: "Just now",
        uid: targetUid,
      };
      saveCalls([newRecord, ...calls]);
    } catch (err: any) {
      console.error("Failed to start call:", err);
      alert(err.message || "تعذر بدء المكالمة");
    }
  };

  const handleKeypadCall = () => {
    if (!keypadNumber.trim()) return;
    const target = keypadNumber.trim();
    setShowKeypad(false);
    setKeypadNumber("");
    handleStartCall(
      {
        id: "call_" + Date.now(),
        name: `كود #${target}`,
        userCode: target,
        direction: "outgoing",
        type: "audio",
        timestamp: "Just now",
      },
      "audio"
    );
  };

  const getInitials = (name: string) => {
    if (!name || !name.trim()) return "U";
    return name
      .trim()
      .split(" ")
      .map((n) => n[0])
      .join("")
      .substring(0, 2)
      .toUpperCase();
  };

  const filteredCalls = calls.filter((c) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      c.name.toLowerCase().includes(q) ||
      c.userCode?.toLowerCase().includes(q) ||
      c.timestamp.toLowerCase().includes(q)
    );
  });

  if (loading) return null;
  if (!isAuthenticated) {
    router.replace("/auth/login");
    return null;
  }

  return (
    <div className={styles.chatLayout}>
      {/* Desktop Left Rail */}
      <AppNavRail
        activeTab="calls"
        onSelectTab={(tab) => {
          if (tab === "chats") router.push("/chat");
          if (tab === "status") router.push("/status");
          if (tab === "settings") router.push("/profile");
        }}
      />

      {/* Main Content Area */}
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
          {/* Top Bar - Matching Image 2 WhatsApp Calls */}
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
            <h1
              style={{
                fontSize: "1.4rem",
                fontWeight: "700",
                color: "#e9edef",
                margin: 0,
                letterSpacing: "0.2px",
              }}
            >
              Calls
            </h1>

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
                      minWidth: "180px",
                      zIndex: 30,
                    }}
                  >
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

                    <button
                      type="button"
                      onClick={handleClearLog}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        width: "100%",
                        padding: "10px 14px",
                        background: "none",
                        border: "none",
                        color: "#ef4444",
                        fontSize: "0.9rem",
                        cursor: "pointer",
                        borderRadius: "6px",
                        textAlign: "right",
                      }}
                    >
                      <Trash2 size={16} />
                      مسح سجل المكالمات
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
                placeholder="بحث في سجل المكالمات..."
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

          {/* Scrollable Container */}
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              paddingBottom: "80px",
            }}
          >
            {/* Top Action Buttons Row - Exactly as shown in Image 2 */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-around",
                padding: "20px 16px 16px 16px",
              }}
            >
              {/* 1. Call */}
              <div
                onClick={() => setShowSelectContact(true)}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "8px",
                  cursor: "pointer",
                }}
              >
                <div
                  style={{
                    width: "56px",
                    height: "56px",
                    borderRadius: "50%",
                    background: "#202c33",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#e9edef",
                    transition: "transform 0.15s ease",
                  }}
                >
                  <Phone size={24} />
                </div>
                <span
                  style={{
                    color: "#e9edef",
                    fontSize: "0.85rem",
                    fontWeight: "500",
                  }}
                >
                  Call
                </span>
              </div>

              {/* 2. Schedule */}
              <div
                onClick={() => alert("جدولة المكالمات: ميزة قادمة لجدولة مواعيد المكالمات!")}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "8px",
                  cursor: "pointer",
                }}
              >
                <div
                  style={{
                    width: "56px",
                    height: "56px",
                    borderRadius: "50%",
                    background: "#202c33",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#e9edef",
                  }}
                >
                  <Calendar size={24} />
                </div>
                <span
                  style={{
                    color: "#e9edef",
                    fontSize: "0.85rem",
                    fontWeight: "500",
                  }}
                >
                  Schedule
                </span>
              </div>

              {/* 3. Keypad */}
              <div
                onClick={() => setShowKeypad(true)}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "8px",
                  cursor: "pointer",
                }}
              >
                <div
                  style={{
                    width: "56px",
                    height: "56px",
                    borderRadius: "50%",
                    background: "#202c33",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#e9edef",
                  }}
                >
                  <Grid size={24} />
                </div>
                <span
                  style={{
                    color: "#e9edef",
                    fontSize: "0.85rem",
                    fontWeight: "500",
                  }}
                >
                  Keypad
                </span>
              </div>

              {/* 4. Support Contact Shortcut */}
              <div
                onClick={() =>
                  handleStartCall(
                    {
                      id: "call_support",
                      name: "الدعم الفني (123)",
                      userCode: "123",
                      direction: "outgoing",
                      type: "audio",
                      timestamp: "Now",
                    },
                    "audio"
                  )
                }
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "8px",
                  cursor: "pointer",
                }}
              >
                <div
                  style={{
                    width: "56px",
                    height: "56px",
                    borderRadius: "50%",
                    background: "#005c4b",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#00a884",
                  }}
                >
                  <User size={26} color="#e9edef" />
                </div>
                <span
                  style={{
                    color: "#e9edef",
                    fontSize: "0.85rem",
                    fontWeight: "500",
                    maxWidth: "70px",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  #123 الدعم
                </span>
              </div>
            </div>

            {/* Section: Recent */}
            <div
              style={{
                padding: "16px 20px 8px 20px",
                fontSize: "1.1rem",
                fontWeight: "700",
                color: "#e9edef",
                letterSpacing: "0.2px",
              }}
            >
              Recent
            </div>

            {/* Calls List */}
            {filteredCalls.length === 0 ? (
              <div
                style={{
                  textAlign: "center",
                  padding: "40px 20px",
                  color: "#8696a0",
                  fontSize: "0.92rem",
                }}
              >
                لا توجد مكالمات سابقة في السجل
              </div>
            ) : (
              filteredCalls.map((item) => (
                <div
                  key={item.id}
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
                  {/* Avatar */}
                  <div
                    style={{
                      width: "48px",
                      height: "48px",
                      borderRadius: "50%",
                      background: "#222e35",
                      border: "1px solid rgba(255, 255, 255, 0.1)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#e9edef",
                      fontWeight: "bold",
                      fontSize: "1rem",
                      flexShrink: 0,
                    }}
                  >
                    {getInitials(item.name)}
                  </div>

                  {/* Info: Name & Direction/Date */}
                  <div
                    style={{
                      flex: 1,
                      display: "flex",
                      flexDirection: "column",
                      gap: "4px",
                      minWidth: 0,
                    }}
                  >
                    <span
                      style={{
                        color: item.direction === "missed" ? "#f87171" : "#e9edef",
                        fontSize: "0.98rem",
                        fontWeight: "600",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {item.name} {item.count ? `(${item.count})` : ""}
                    </span>

                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        fontSize: "0.82rem",
                        color: "#8696a0",
                      }}
                    >
                      {item.direction === "missed" && (
                        <ArrowDownLeft size={16} color="#ef4444" />
                      )}
                      {item.direction === "outgoing" && (
                        <ArrowUpRight size={16} color="#00a884" />
                      )}
                      {item.direction === "incoming" && (
                        <ArrowDownLeft size={16} color="#00a884" />
                      )}
                      <span>{item.timestamp}</span>
                    </div>
                  </div>

                  {/* Right Action Button (Call back directly) */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleStartCall(item, item.type);
                    }}
                    style={{
                      background: "none",
                      border: "none",
                      color: "#00a884",
                      padding: "8px",
                      borderRadius: "50%",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      transition: "background 0.15s ease",
                    }}
                    title={`الاتصال بـ ${item.name}`}
                  >
                    {item.type === "video" ? (
                      <Video size={22} color="#00a884" />
                    ) : (
                      <Phone size={22} color="#00a884" />
                    )}
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Floating Action Button (FAB) - Matching Image 2 */}
          <button
            type="button"
            onClick={() => setShowSelectContact(true)}
            style={{
              position: "absolute",
              bottom: "74px",
              right: "24px",
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
              zIndex: 20,
              transition: "transform 0.15s ease, background 0.15s ease",
            }}
            title="مكالمة جديدة"
          >
            <span
              className="material-symbols-outlined"
              style={{ fontSize: "28px", color: "#111b21" }}
            >
              add_call
            </span>
          </button>

          {/* Keypad Modal */}
          {showKeypad && (
            <div
              style={{
                position: "fixed",
                inset: 0,
                background: "rgba(0,0,0,0.6)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 100,
              }}
              onClick={() => setShowKeypad(false)}
            >
              <div
                style={{
                  width: "320px",
                  background: "#111b21",
                  borderRadius: "20px",
                  padding: "24px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  boxShadow: "0 20px 40px rgba(0,0,0,0.7)",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    width: "100%",
                    marginBottom: "16px",
                  }}
                >
                  <span style={{ color: "#e9edef", fontWeight: "600" }}>
                    لوحة الاتصال (Keypad)
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowKeypad(false)}
                    style={{ background: "none", border: "none", color: "#8696a0", cursor: "pointer" }}
                  >
                    <X size={20} />
                  </button>
                </div>

                <div
                  style={{
                    width: "100%",
                    height: "48px",
                    background: "#202c33",
                    borderRadius: "10px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "1.4rem",
                    color: "#00a884",
                    fontWeight: "bold",
                    letterSpacing: "2px",
                    marginBottom: "20px",
                  }}
                >
                  {keypadNumber || "أدخل الكود"}
                </div>

                {/* Dialpad Grid */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(3, 1fr)",
                    gap: "12px",
                    width: "100%",
                    marginBottom: "20px",
                  }}
                >
                  {["1", "2", "3", "4", "5", "6", "7", "8", "9", "*", "0", "#"].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setKeypadNumber((prev) => prev + num)}
                      style={{
                        height: "50px",
                        borderRadius: "50%",
                        background: "#202c33",
                        border: "none",
                        color: "#e9edef",
                        fontSize: "1.3rem",
                        fontWeight: "600",
                        cursor: "pointer",
                      }}
                    >
                      {num}
                    </button>
                  ))}
                </div>

                <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
                  <button
                    type="button"
                    onClick={() => setKeypadNumber((prev) => prev.slice(0, -1))}
                    style={{
                      background: "none",
                      border: "none",
                      color: "#8696a0",
                      fontSize: "0.9rem",
                      cursor: "pointer",
                    }}
                  >
                    مسح
                  </button>
                  <button
                    type="button"
                    onClick={handleKeypadCall}
                    disabled={!keypadNumber}
                    style={{
                      width: "56px",
                      height: "56px",
                      borderRadius: "50%",
                      background: "#00a884",
                      border: "none",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                      opacity: keypadNumber ? 1 : 0.4,
                    }}
                  >
                    <Phone size={24} color="#111b21" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Select Contact Modal for New Call */}
          <SelectContactModal
            isOpen={showSelectContact}
            onClose={() => setShowSelectContact(false)}
            currentUser={userProfile}
            onOpenCreateGroup={() => setShowCreateGroup(true)}
          />

          {/* Create Group Modal */}
          {userProfile && (
            <CreateGroupModal
              isOpen={showCreateGroup}
              onClose={() => setShowCreateGroup(false)}
              currentUser={userProfile}
              onGroupCreated={(id) => {
                setShowCreateGroup(false);
                router.push(`/chat/${id}`);
              }}
            />
          )}

          {/* Mobile Bottom Navigation Bar */}
          <MobileBottomNav
            activeTab="calls"
            onTabChange={(tab) => {
              if (tab === "chats") router.push("/chat");
              if (tab === "status") router.push("/status");
              if (tab === "settings") router.push("/profile");
            }}
            onOpenStatus={() => router.push("/status")}
            onOpenCalls={() => {}}
            onOpenSettings={() => router.push("/profile")}
          />
        </div>
      </div>
    </div>
  );
}
