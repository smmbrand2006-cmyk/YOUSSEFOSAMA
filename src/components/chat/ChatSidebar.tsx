"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/lib/contexts/AuthContext";
import { useChats } from "@/lib/contexts/ChatContext";
import { useRouter } from "next/navigation";
import {
  searchUsers,
  openOrCreateSupportChat,
  getOrCreateDirectChat,
  getChatDoc,
  blockUser,
  unblockUser,
  markChatAsRead,
} from "@/lib/firebase/firestore";
import { signOut } from "@/lib/firebase/auth";
import { UserProfile } from "@/lib/types/user";
import { formatMessageTime } from "@/lib/utils/formatDate";
import UserProfileModal from "./UserProfileModal";
import CreateGroupModal from "./CreateGroupModal";
import SelectContactModal from "./SelectContactModal";
import NotificationSettingsModal from "./NotificationSettingsModal";
import { useBackHandler } from "@/lib/contexts/BackHandlerContext";
import styles from "@/styles/chat.module.css";

type FilterType = "all" | "unread" | "groups" | "favorites";

export default function ChatSidebar() {
  const { userProfile } = useAuth();
  const { chats, activeChat, setActiveChat } = useChats();
  const router = useRouter();
  const [showNotifModal, setShowNotifModal] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<FilterType>("all");
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [searching, setSearching] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showFabMenu, setShowFabMenu] = useState(false);
  const [showSelectContact, setShowSelectContact] = useState(false);
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [openingSupport, setOpeningSupport] = useState(false);
  const [selectedProfileUser, setSelectedProfileUser] = useState<UserProfile | null>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showMyProfileModal, setShowMyProfileModal] = useState(false);
  const cameraInputRef = React.useRef<HTMLInputElement>(null);
  const mobileSearchInputRef = React.useRef<HTMLInputElement>(null);

  // Back Navigation Handlers for Sidebar Modals & Menus
  useBackHandler(showSelectContact, () => setShowSelectContact(false), "sidebar_select_contact", 25);
  useBackHandler(showCreateGroupModal, () => setShowCreateGroupModal(false), "sidebar_create_group", 25);
  useBackHandler(
    showProfileModal,
    () => {
      setShowProfileModal(false);
      setSelectedProfileUser(null);
    },
    "sidebar_profile_modal",
    25
  );
  useBackHandler(showMyProfileModal, () => setShowMyProfileModal(false), "sidebar_my_profile_modal", 25);
  useBackHandler(showFabMenu, () => setShowFabMenu(false), "sidebar_fab_menu", 18);
  useBackHandler(showMenu, () => setShowMenu(false), "sidebar_menu", 18);

  // Extract contact list from existing chats for the group picker
  const existingContacts = React.useMemo(() => {
    const list: UserProfile[] = [];
    const seen = new Set<string>();
    chats.forEach((c) => {
      if (c.type === "direct" && c.participants) {
        const otherUid = c.participants.find((p) => p !== userProfile?.uid);
        if (otherUid && !seen.has(otherUid) && otherUid !== "support_official_123") {
          seen.add(otherUid);
          list.push({
            uid: otherUid,
            displayName: c.participantNames?.[otherUid] || "مستخدم",
            userCode: "",
            isOnline: false,
          } as any as UserProfile);
        }
      }
    });
    return list;
  }, [chats, userProfile]);

  const handleCameraClick = () => {
    cameraInputRef.current?.click();
  };

  const handleCameraFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleOpenSupport();
    }
  };

  // Close dropdown on click outside
  useEffect(() => {
    const handleClick = () => setShowMenu(false);
    if (showMenu) {
      window.addEventListener("click", handleClick);
    }
    return () => window.removeEventListener("click", handleClick);
  }, [showMenu]);

  // Support Chat Handler
  const handleOpenSupport = async () => {
    if (!userProfile) return;
    setOpeningSupport(true);
    try {
      const chatId = await openOrCreateSupportChat(userProfile);
      const chatDoc = await getChatDoc(chatId);
      if (chatDoc) {
        setActiveChat(chatDoc);
      } else {
        setActiveChat({
          id: chatId,
          type: "direct",
          participants: [userProfile.uid, "support_official_123"],
          participantNames: {
            [userProfile.uid]: userProfile.displayName,
            support_official_123: "الدعم الفني (123)",
          },
        } as any);
      }
    } catch (err: any) {
      alert(err.message || "حدث خطأ أثناء فتح محادثة الدعم.");
    } finally {
      setOpeningSupport(false);
    }
  };

  // Instant direct chat with any user
  const handleStartDirectChat = async (targetUser: UserProfile) => {
    if (!userProfile) return;
    if (targetUser.userCode === "123") {
      return handleOpenSupport();
    }
    try {
      const chatId = await getOrCreateDirectChat(userProfile, targetUser);
      setSearchQuery("");
      setSearchResults([]);
      const chatDoc = await getChatDoc(chatId);
      if (chatDoc) {
        setActiveChat(chatDoc);
      } else {
        setActiveChat({
          id: chatId,
          type: "direct",
          participants: [userProfile.uid, targetUser.uid],
          participantNames: {
            [userProfile.uid]: userProfile.displayName || userProfile.userCode,
            [targetUser.uid]: targetUser.displayName || targetUser.userCode,
          },
        } as any);
      }
    } catch (err: any) {
      alert(err.message || "حدث خطأ أثناء فتح المحادثة المباشرة.");
    }
  };

  // Search users live
  const handleSearch = async (queryText: string) => {
    const term = queryText.trim();
    if (!term || !userProfile) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const results = await searchUsers(term);
      setSearchResults(results.filter((u) => u.uid !== userProfile.uid));
    } catch (err) {
      console.error("Search failed:", err);
    } finally {
      setSearching(false);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!userProfile) return;
    setShowMenu(false);
    try {
      const unreadChats = chats.filter((c) => (c.unreadCount?.[userProfile.uid] || 0) > 0);
      if (unreadChats.length === 0) {
        alert("جميع المحادثات مقروءة بالفعل! 👍");
        return;
      }
      await Promise.all(
        unreadChats.map((c) => markChatAsRead(c.id, userProfile.uid))
      );
      alert("تم تعيين جميع المحادثات كمقروءة بنجاح! ✅");
    } catch (err) {
      console.error("Failed to mark all as read:", err);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    router.replace("/auth/login");
  };

  const getOtherParticipant = (chat: any) => {
    if (!userProfile) return { uid: "", name: "Unknown", isSupport: false, isGroup: false };
    if (chat.type === "group") {
      return {
        uid: "",
        name: chat.groupName || "مجموعة جديدة 👥",
        isSupport: false,
        isGroup: true,
      };
    }
    const otherId = chat.participants?.find(
      (id: string) => id !== userProfile.uid
    );
    const isSupp =
      chat.isSupport ||
      otherId === "support_123_uid" ||
      otherId === "support_official_123";
    if (isSupp) {
      return {
        uid: "support_official_123",
        name: "الدعم الفني (123) 🎧",
        isSupport: true,
        isGroup: false,
      };
    }
    return {
      uid: otherId || "",
      name: chat.participantNames?.[otherId] || "مستخدم",
      isSupport: false,
      isGroup: false,
    };
  };

  const getInitials = (name: string) => {
    if (!name || !name.trim()) return "#";
    return name
      .trim()
      .split(" ")
      .map((n) => n[0])
      .join("")
      .substring(0, 2)
      .toUpperCase();
  };

  // Filtered Chats
  const filteredChats = chats.filter((chat) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const other = getOtherParticipant(chat);
      const matchesName = other.name.toLowerCase().includes(q);
      const matchesLastMsg = chat.lastMessage?.text?.toLowerCase().includes(q);
      if (!matchesName && !matchesLastMsg) return false;
    }

    if (filter === "unread") {
      const unread = chat.unreadCount?.[userProfile?.uid || ""] || 0;
      return unread > 0;
    }
    if (filter === "groups") {
      return chat.type === "group";
    }
    if (filter === "favorites") {
      return !!chat.isPinned?.[userProfile?.uid || ""];
    }
    return true;
  });

  return (
    <aside
      className={`${styles.sidebar} ${
        activeChat ? styles.sidebarHiddenOnMobile : ""
      }`}
    >
      {/* 1. Mobile 3-Tier Header (Visible on Mobile Viewports) */}
      <div className={styles.mobileHeaderContainer}>
        {/* Tier 1: Title and Action Buttons */}
        <div className={styles.mobileHeaderTop}>
          <div className={styles.mobileHeaderLeft}>
            <div className={styles.mobileHeaderBadge}>
              <span
                className="material-symbols-outlined"
                style={{ fontSize: "22px" }}
              >
                chat
              </span>
            </div>
            <h1 className={styles.mobileHeaderTitle}>
              <span className={styles.brandTitleText}>YOUSSEF APP</span>
            </h1>
          </div>

          <div className={styles.mobileHeaderRight}>
            {/* Search */}
            <button
              type="button"
              aria-label="Search"
              className={styles.mobileHeaderActionBtn}
              onClick={() => mobileSearchInputRef.current?.focus()}
            >
              <span
                className="material-symbols-outlined"
                style={{ fontSize: "22px" }}
              >
                search
              </span>
            </button>

            {/* Camera */}
            <button
              type="button"
              aria-label="Camera"
              className={styles.mobileHeaderActionBtn}
              onClick={handleCameraClick}
            >
              <span
                className="material-symbols-outlined"
                style={{ fontSize: "22px" }}
              >
                photo_camera
              </span>
            </button>

            {/* More Options */}
            <div style={{ position: "relative" }}>
              <button
                type="button"
                aria-label="More options"
                className={styles.mobileHeaderActionBtn}
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMenu(!showMenu);
                }}
              >
                <span
                  className="material-symbols-outlined"
                  style={{ fontSize: "22px" }}
                >
                  more_vert
                </span>
              </button>

              {showMenu && (
                <div
                  className="dropdown"
                  style={{ right: 0, top: "100%", marginTop: 6, minWidth: "230px" }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div
                    className="dropdown-item"
                    onClick={() => {
                      setShowMenu(false);
                      setShowCreateGroupModal(true);
                    }}
                  >
                    <span
                      className="material-symbols-outlined"
                      style={{ fontSize: "18px", color: "var(--primary)" }}
                    >
                      group_add
                    </span>
                    إنشاء مجموعة جديدة
                  </div>

                  <div
                    className="dropdown-item"
                    onClick={() => {
                      setShowMenu(false);
                      setShowSelectContact(true);
                    }}
                  >
                    <span
                      className="material-symbols-outlined"
                      style={{ fontSize: "18px", color: "#60a5fa" }}
                    >
                      person_add
                    </span>
                    جهة اتصال جديدة (New contact)
                  </div>

                  <div
                    className="dropdown-item"
                    onClick={() => {
                      setShowMenu(false);
                      alert("رسالة جماعية جديدة: يمكنك إرسال رسالة واحدة لعدة أصدقاء ومجموعات 📢");
                    }}
                  >
                    <span
                      className="material-symbols-outlined"
                      style={{ fontSize: "18px", color: "#38bdf8" }}
                    >
                      campaign
                    </span>
                    رسالة جماعية جديدة (New broadcast)
                  </div>

                  <div
                    className="dropdown-item"
                    onClick={() => {
                      setShowMenu(false);
                      alert("الأجهزة المرتبطة: لا توجد أجهزة متصلة أخرى بحسابك حالياً 💻");
                    }}
                  >
                    <span
                      className="material-symbols-outlined"
                      style={{ fontSize: "18px", color: "#a78bfa" }}
                    >
                      devices
                    </span>
                    الأجهزة المرتبطة (Linked devices)
                  </div>

                  <div
                    className="dropdown-item"
                    onClick={() => {
                      setShowMenu(false);
                      alert("الرسائل المميزة بنجمة: لا توجد رسائل مميزة حتى الآن ⭐");
                    }}
                  >
                    <span
                      className="material-symbols-outlined"
                      style={{ fontSize: "18px", color: "#facc15" }}
                    >
                      star
                    </span>
                    الرسائل المميزة بنجمة
                  </div>

                  <div
                    className="dropdown-item"
                    onClick={() => {
                      setShowMenu(false);
                      alert("المدفوعات الآمنة: خدمة التحويلات المالية قيد التفعيل 💳");
                    }}
                  >
                    <span
                      className="material-symbols-outlined"
                      style={{ fontSize: "18px", color: "#34d399" }}
                    >
                      payments
                    </span>
                    المدفوعات (Payments)
                  </div>

                  <div
                    className="dropdown-item"
                    onClick={handleMarkAllAsRead}
                  >
                    <span
                      className="material-symbols-outlined"
                      style={{ fontSize: "18px", color: "#38bdf8" }}
                    >
                      done_all
                    </span>
                    تحديد الكل كمقروء
                  </div>

                  <div className="dropdown-item" onClick={handleOpenSupport}>
                    <span
                      className="material-symbols-outlined"
                      style={{ fontSize: "18px", color: "var(--primary)" }}
                    >
                      support_agent
                    </span>
                    الدعم الفني الرسمي (123)
                  </div>

                  <div className="dropdown-divider" />

                  {/* Settings Item in 3-Dots */}
                  <div
                    className="dropdown-item"
                    onClick={() => {
                      setShowMenu(false);
                      setShowNotifModal(true);
                    }}
                  >
                    <span
                      className="material-symbols-outlined"
                      style={{ fontSize: "18px", color: "#f59e0b" }}
                    >
                      notifications
                    </span>
                    إعدادات الإشعارات (Notifications) 🔔
                  </div>

                  <div
                    className="dropdown-item"
                    onClick={() => {
                      setShowMenu(false);
                      router.push("/profile");
                    }}
                  >
                    <span
                      className="material-symbols-outlined"
                      style={{ fontSize: "18px", color: "var(--primary)" }}
                    >
                      settings
                    </span>
                    الإعدادات (Settings) ⚙️
                  </div>

                  <div
                    className="dropdown-item"
                    onClick={() => {
                      setShowMenu(false);
                      setShowMyProfileModal(true);
                    }}
                  >
                    <span
                      className="material-symbols-outlined"
                      style={{ fontSize: "18px" }}
                    >
                      account_circle
                    </span>
                    الملف الشخصي
                  </div>

                  <div className="dropdown-divider" />

                  <div
                    className="dropdown-item dropdown-item-danger"
                    onClick={handleSignOut}
                  >
                    <span
                      className="material-symbols-outlined"
                      style={{ fontSize: "18px" }}
                    >
                      logout
                    </span>
                    تسجيل الخروج
                  </div>
                </div>
              )}
            </div>

            {/* Profile Avatar */}
            <button
              type="button"
              aria-label="My Profile"
              className={styles.mobileHeaderAvatarBtn}
              onClick={() => setShowMyProfileModal(true)}
              title={userProfile?.displayName || "الملف الشخصي"}
            >
              <span
                className="material-symbols-outlined"
                style={{ fontSize: "18px", color: "var(--on-primary)" }}
              >
                person
              </span>
            </button>
          </div>
        </div>

        {/* Tier 2: Search Bar */}
        <div className={styles.mobileSearchBar}>
          <span
            className="material-symbols-outlined"
            style={{ fontSize: "20px", color: "var(--outline)" }}
          >
            search
          </span>
          <input
            ref={mobileSearchInputRef}
            type="text"
            className={styles.mobileSearchInput}
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => {
              const val = e.target.value;
              setSearchQuery(val);
              handleSearch(val);
            }}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setSearchResults([]);
              }}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "var(--outline)",
                display: "flex",
                alignItems: "center",
              }}
            >
              <span
                className="material-symbols-outlined"
                style={{ fontSize: "16px" }}
              >
                close
              </span>
            </button>
          )}
        </div>

        {/* Tier 3: Filter Pills */}
        <div className={styles.mobileFilterPillsRow}>
          <button
            type="button"
            className={`${styles.mobileFilterPill} ${
              filter === "all" ? styles.mobileFilterPillActive : ""
            }`}
            onClick={() => setFilter("all")}
          >
            All
          </button>
          <button
            type="button"
            className={`${styles.mobileFilterPill} ${
              filter === "unread" ? styles.mobileFilterPillActive : ""
            }`}
            onClick={() => setFilter("unread")}
          >
            Unread
          </button>
          <button
            type="button"
            className={`${styles.mobileFilterPill} ${
              filter === "favorites" ? styles.mobileFilterPillActive : ""
            }`}
            onClick={() => setFilter("favorites")}
          >
            Favourites
          </button>
          <button
            type="button"
            className={`${styles.mobileFilterPill} ${
              filter === "groups" ? styles.mobileFilterPillActive : ""
            }`}
            onClick={() => setFilter("groups")}
          >
            Groups
          </button>
          <button
            type="button"
            aria-label="Add custom filter"
            className={`${styles.mobileFilterPill} ${styles.mobileFilterPillAdd}`}
            onClick={handleOpenSupport}
            title="تواصل مع الدعم الفني"
          >
            <span
              className="material-symbols-outlined"
              style={{ fontSize: "16px" }}
            >
              add
            </span>
          </button>
        </div>
      </div>

      {/* 2. Desktop Workstation Header (Visible on Desktop / PC / Emulator) */}
      <div className={styles.mobileDesktopHeader}>
        {/* Desktop Top Header */}
        <div className={styles.sidebarTopHeader}>
          <h2 className={styles.sidebarChatsTitle}>
            <span className={styles.brandTitleText}>YOUSSEF APP</span>
          </h2>
          <div className={styles.sidebarHeaderActions}>
            <button
              type="button"
              aria-label="New chat"
              className={styles.sidebarHeaderIconBtn}
              onClick={() => setShowFabMenu(!showFabMenu)}
              title="محادثة جديدة أو مجموعة (#123)"
              disabled={openingSupport}
            >
              <span
                className="material-symbols-outlined"
                style={{ fontSize: "19px" }}
              >
                edit_square
              </span>
            </button>

            <div style={{ position: "relative" }}>
              <button
                type="button"
                aria-label="Menu"
                className={styles.sidebarHeaderIconBtn}
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMenu(!showMenu);
                }}
                title="القائمة"
              >
                <span
                  className="material-symbols-outlined"
                  style={{ fontSize: "19px" }}
                >
                  more_vert
                </span>
              </button>

              {showMenu && (
                <div
                  className="dropdown"
                  style={{ right: 0, top: "100%", marginTop: 6, minWidth: "230px" }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div
                    className="dropdown-item"
                    onClick={() => {
                      setShowMenu(false);
                      setShowCreateGroupModal(true);
                    }}
                  >
                    <span
                      className="material-symbols-outlined"
                      style={{ fontSize: "18px", color: "var(--primary)" }}
                    >
                      group_add
                    </span>
                    إنشاء مجموعة جديدة
                  </div>

                  <div
                    className="dropdown-item"
                    onClick={() => {
                      setShowMenu(false);
                      setShowSelectContact(true);
                    }}
                  >
                    <span
                      className="material-symbols-outlined"
                      style={{ fontSize: "18px", color: "#60a5fa" }}
                    >
                      person_add
                    </span>
                    جهة اتصال جديدة (New contact)
                  </div>

                  <div
                    className="dropdown-item"
                    onClick={() => {
                      setShowMenu(false);
                      alert("رسالة جماعية جديدة: يمكنك إرسال رسالة واحدة لعدة أصدقاء ومجموعات 📢");
                    }}
                  >
                    <span
                      className="material-symbols-outlined"
                      style={{ fontSize: "18px", color: "#38bdf8" }}
                    >
                      campaign
                    </span>
                    رسالة جماعية جديدة (New broadcast)
                  </div>

                  <div
                    className="dropdown-item"
                    onClick={() => {
                      setShowMenu(false);
                      alert("الأجهزة المرتبطة: لا توجد أجهزة متصلة أخرى بحسابك حالياً 💻");
                    }}
                  >
                    <span
                      className="material-symbols-outlined"
                      style={{ fontSize: "18px", color: "#a78bfa" }}
                    >
                      devices
                    </span>
                    الأجهزة المرتبطة (Linked devices)
                  </div>

                  <div
                    className="dropdown-item"
                    onClick={() => {
                      setShowMenu(false);
                      alert("الرسائل المميزة بنجمة: لا توجد رسائل مميزة حتى الآن ⭐");
                    }}
                  >
                    <span
                      className="material-symbols-outlined"
                      style={{ fontSize: "18px", color: "#facc15" }}
                    >
                      star
                    </span>
                    الرسائل المميزة بنجمة
                  </div>

                  <div
                    className="dropdown-item"
                    onClick={() => {
                      setShowMenu(false);
                      alert("المدفوعات الآمنة: خدمة التحويلات المالية قيد التفعيل 💳");
                    }}
                  >
                    <span
                      className="material-symbols-outlined"
                      style={{ fontSize: "18px", color: "#34d399" }}
                    >
                      payments
                    </span>
                    المدفوعات (Payments)
                  </div>

                  <div
                    className="dropdown-item"
                    onClick={handleMarkAllAsRead}
                  >
                    <span
                      className="material-symbols-outlined"
                      style={{ fontSize: "18px", color: "#38bdf8" }}
                    >
                      done_all
                    </span>
                    تحديد الكل كمقروء
                  </div>

                  <div className="dropdown-item" onClick={handleOpenSupport}>
                    <span
                      className="material-symbols-outlined"
                      style={{ fontSize: "18px", color: "var(--primary)" }}
                    >
                      support_agent
                    </span>
                    الدعم الفني الرسمي (123)
                  </div>

                  <div className="dropdown-divider" />

                  {/* Settings Item in 3-Dots */}
                  <div
                    className="dropdown-item"
                    onClick={() => {
                      setShowMenu(false);
                      router.push("/profile");
                    }}
                  >
                    <span
                      className="material-symbols-outlined"
                      style={{ fontSize: "18px", color: "var(--primary)" }}
                    >
                      settings
                    </span>
                    الإعدادات (Settings) ⚙️
                  </div>

                  <div
                    className="dropdown-item"
                    onClick={() => {
                      setShowMenu(false);
                      setShowMyProfileModal(true);
                    }}
                  >
                    <span
                      className="material-symbols-outlined"
                      style={{ fontSize: "18px" }}
                    >
                      account_circle
                    </span>
                    الملف الشخصي
                  </div>

                  <div className="dropdown-divider" />

                  <div
                    className="dropdown-item dropdown-item-danger"
                    onClick={handleSignOut}
                  >
                    <span
                      className="material-symbols-outlined"
                      style={{ fontSize: "18px" }}
                    >
                      logout
                    </span>
                    تسجيل الخروج
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Desktop Search Container */}
        <div className={styles.searchContainer}>
          <div className={styles.searchInner}>
            <span
              className="material-symbols-outlined"
              style={{ color: "var(--outline)", fontSize: "18px" }}
            >
              search
            </span>
            <input
              id="chat-search-input"
              type="text"
              placeholder="بحث أو بدء محادثة جديدة..."
              value={searchQuery}
              onChange={(e) => {
                const val = e.target.value;
                setSearchQuery(val);
                handleSearch(val);
              }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setSearchResults([]);
                }}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--outline)",
                  display: "flex",
                  alignItems: "center",
                }}
              >
                <span
                  className="material-symbols-outlined"
                  style={{ fontSize: "16px" }}
                >
                  close
                </span>
              </button>
            )}
          </div>
        </div>

        {/* Desktop Filter Pills */}
        <div className={styles.filterPillsRow}>
          <button
            type="button"
            className={`${styles.filterPill} ${
              filter === "all" ? styles.filterPillActive : ""
            }`}
            onClick={() => setFilter("all")}
          >
            الكل
          </button>
          <button
            type="button"
            className={`${styles.filterPill} ${
              filter === "unread" ? styles.filterPillActive : ""
            }`}
            onClick={() => setFilter("unread")}
          >
            غير مقروءة
          </button>
          <button
            type="button"
            className={`${styles.filterPill} ${
              filter === "groups" ? styles.filterPillActive : ""
            }`}
            onClick={() => setFilter("groups")}
          >
            المجموعات
          </button>
          <button
            type="button"
            className={`${styles.filterPill} ${
              filter === "favorites" ? styles.filterPillActive : ""
            }`}
            onClick={() => setFilter("favorites")}
          >
            المفضلة
          </button>
          <button
            type="button"
            aria-label="Add filter"
            className={`${styles.filterPill} ${styles.filterPillAdd}`}
            onClick={handleOpenSupport}
            title="تواصل مع الدعم الفني"
          >
            <span
              className="material-symbols-outlined"
              style={{ fontSize: "15px" }}
            >
              add
            </span>
          </button>
        </div>
      </div>

      {/* 4. Conversation List */}
      <div className={styles.chatList}>
        {/* If live search results exist */}
        {searchQuery.trim() && searchResults.length > 0 && (
          <div style={{ padding: "8px 12px", borderBottom: "1px solid var(--on-secondary)" }}>
            <span style={{ fontSize: "0.78rem", color: "var(--primary)", fontWeight: 600 }}>
              نتائج البحث عن مستخدمين ({searchResults.length})
            </span>
            {searchResults.map((user) => (
              <div
                key={user.uid}
                className={styles.chatRow}
                onClick={() => handleStartDirectChat(user)}
                style={{ marginTop: 4 }}
              >
                <div
                  className={styles.chatRowAvatar}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedProfileUser(user);
                    setShowProfileModal(true);
                  }}
                  title="عرض الملف التعريفي"
                  style={{ cursor: "pointer" }}
                >
                  {getInitials(user.displayName || user.userCode)}
                  {user.isOnline && <span className={styles.chatRowOnlineDot} />}
                </div>
                <div className={styles.chatRowContent}>
                  <div className={styles.chatRowNameRow}>
                    <span className={styles.chatRowName}>{user.displayName}</span>
                    <span style={{ fontSize: "0.75rem", color: "var(--primary)" }}>
                      #{user.userCode}
                    </span>
                  </div>
                  <div className={styles.chatRowPreviewRow}>
                    <span className={styles.chatRowPreview}>
                      {user.bio || "اضغط لبدء محادثة مباشرة"}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Mobile Pinned Archived / Support Row */}
        {filter === "all" && !searchQuery.trim() && (
          <>
            <div
              className={styles.mobileArchivedRow}
              onClick={handleOpenSupport}
              title="الدعم الفني الرسمي والمحادثات المؤرشفة"
            >
              <div className={styles.mobileArchivedLeft}>
                <div className={styles.mobileArchivedIcon}>
                  <span
                    className="material-symbols-outlined"
                    style={{ fontSize: "20px" }}
                  >
                    archive
                  </span>
                </div>
                <div className={styles.mobileArchivedTexts}>
                  <span className={styles.mobileArchivedTitle}>
                    الدعم الفني والمؤرشفة (#123)
                  </span>
                  <span className={styles.mobileArchivedSub}>
                    خدمة العملاء متوفرة دائماً 24/7
                  </span>
                </div>
              </div>
              <span className={styles.mobileArchivedBadge}>24/7</span>
            </div>
            <div className={styles.mobileDividerArchive} />
          </>
        )}

        {/* Pinned Official Support Row */}
        {filter === "all" && !searchQuery.trim() && (
          <div
            className={`${styles.chatRow} ${
              activeChat?.isSupport ||
              activeChat?.participants?.includes("support_official_123")
                ? styles.chatRowSelected
                : ""
            }`}
            onClick={handleOpenSupport}
            style={{
              background: "rgba(0, 168, 132, 0.05)",
              borderBottom: "1px solid rgba(48, 48, 48, 0.4)",
            }}
          >
            <div
              className={styles.chatRowAvatar}
              style={{
                background: "linear-gradient(135deg, #00a884, #59dcb5)",
                color: "white",
              }}
            >
              <span
                className="material-symbols-outlined"
                style={{ fontSize: "24px" }}
              >
                support_agent
              </span>
              <span className={styles.chatRowOnlineDot} />
            </div>
            <div className={styles.chatRowContent}>
              <div className={styles.chatRowNameRow}>
                <span
                  className={styles.chatRowName}
                  style={{ color: "var(--primary)", fontWeight: 600 }}
                >
                  الدعم الفني الرسمي (#123) 🎧
                </span>
                <span className={styles.chatRowTime} style={{ color: "var(--primary)" }}>
                  24/7
                </span>
              </div>
              <div className={styles.chatRowPreviewRow}>
                <span className={styles.chatRowPreview}>
                  تواصل معنا فوراً في أي وقت للإجابة على استفساراتك
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Regular Chats List */}
        {filteredChats.length === 0 && !searchQuery.trim() ? (
          <div className="empty-state" style={{ padding: "40px 16px" }}>
            <span
              className="material-symbols-outlined"
              style={{ fontSize: "48px", color: "var(--outline)", opacity: 0.5, marginBottom: 12 }}
            >
              chat
            </span>
            <h3 style={{ fontSize: "1rem", color: "var(--on-surface)", marginBottom: 6 }}>
              لا توجد محادثات هنا
            </h3>
            <p style={{ fontSize: "0.82rem", color: "var(--outline)", maxWidth: 280 }}>
              ابحث عن أي شخص بكوده الخاص في شريط البحث بالأعلى لبدء المحادثة معه فوراً!
            </p>
          </div>
        ) : (
          filteredChats.map((chat) => {
            const other =
              chat.type === "direct"
                ? getOtherParticipant(chat)
                : { uid: "", name: chat.groupName || "مجموعة", isSupport: false };

            const isBlocked = !!(
              other.uid &&
              userProfile?.blockedUsers &&
              userProfile.blockedUsers.includes(other.uid)
            );
            const isSelected = activeChat?.id === chat.id;
            const unread = chat.unreadCount?.[userProfile?.uid || ""] || 0;

            return (
              <React.Fragment key={chat.id}>
                <div
                  className={`${styles.chatRow} ${
                    isSelected ? styles.chatRowSelected : ""
                  }`}
                  onClick={() => setActiveChat(chat)}
                >
                  {/* Avatar */}
                  <div
                    className={styles.chatRowAvatar}
                    onClick={(e) => {
                      if (other.uid && !other.isSupport) {
                        e.stopPropagation();
                        setSelectedProfileUser({
                          uid: other.uid,
                          displayName: other.name,
                          userCode: "",
                        } as any);
                        setShowProfileModal(true);
                      }
                    }}
                    title="عرض الملف التعريفي"
                    style={{
                      cursor: other.uid && !other.isSupport ? "pointer" : "default",
                    }}
                  >
                    {other.isSupport ? (
                      <span
                        className="material-symbols-outlined"
                        style={{ fontSize: "24px", color: "var(--primary)" }}
                      >
                        support_agent
                      </span>
                    ) : (other as any).isGroup ? (
                      <span
                        className="material-symbols-outlined"
                        style={{ fontSize: "24px", color: "var(--primary)" }}
                      >
                        groups
                      </span>
                    ) : (
                      getInitials(other.name)
                    )}
                    {userProfile?.uid && chat.isOnline && (
                      <span className={styles.chatRowOnlineDot} />
                    )}
                  </div>

                  {/* Info */}
                  <div className={styles.chatRowContent}>
                    <div className={styles.chatRowNameRow}>
                      <span className={styles.chatRowName}>
                        {other.name}
                        {isBlocked && (
                          <span
                            style={{
                              color: "var(--error)",
                              fontSize: "0.75rem",
                              marginRight: 4,
                            }}
                          >
                            (محظور 🚫)
                          </span>
                        )}
                      </span>
                      <span
                        className={`${styles.chatRowTime} ${
                          unread > 0 ? styles.chatRowTimeUnread : ""
                        }`}
                      >
                        {formatMessageTime(chat.lastMessage?.createdAt)}
                      </span>
                    </div>

                    <div className={styles.chatRowPreviewRow}>
                      <span className={styles.chatRowPreview}>
                        {chat.lastMessage?.text || "ابدأ المحادثة..."}
                      </span>
                      {unread > 0 ? (
                        <span className={styles.chatRowBadge}>{unread}</span>
                      ) : (
                        <span
                          className="material-symbols-outlined"
                          style={{
                            fontSize: "16px",
                            color: "var(--primary)",
                            flexShrink: 0,
                          }}
                        >
                          done_all
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className={styles.mobileDividerChat} />
              </React.Fragment>
            );
          })
        )}
      </div>

      {/* Floating Action Button (FAB Menu Backdrop & Modal) */}
      {showFabMenu && (
        <>
          <div
            className={styles.fabBackdrop}
            onClick={() => setShowFabMenu(false)}
          />
          <div className={styles.fabMenuContainer}>
            <button
              type="button"
              className={styles.fabMenuItem}
              onClick={() => {
                setShowFabMenu(false);
                setShowCreateGroupModal(true);
              }}
            >
              <div
                className={styles.fabMenuIconWrap}
                style={{ background: "rgba(0, 168, 132, 0.15)", color: "var(--primary)" }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>
                  group_add
                </span>
              </div>
              <div className={styles.fabMenuText}>
                <span className={styles.fabMenuTitle}>إنشاء مجموعة جديدة</span>
                <span className={styles.fabMenuSub}>أضف أعضاء وأنشئ مجموعة دردشة</span>
              </div>
            </button>

            <button
              type="button"
              className={styles.fabMenuItem}
              onClick={() => {
                setShowFabMenu(false);
                const inp = mobileSearchInputRef.current || document.getElementById("chat-search-input");
                inp?.focus();
              }}
            >
              <div
                className={styles.fabMenuIconWrap}
                style={{ background: "rgba(59, 130, 246, 0.15)", color: "#60a5fa" }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>
                  person_search
                </span>
              </div>
              <div className={styles.fabMenuText}>
                <span className={styles.fabMenuTitle}>محادثة مباشرة جديدة</span>
                <span className={styles.fabMenuSub}>ابحث بالاسم أو كود المستخدم #</span>
              </div>
            </button>

            <button
              type="button"
              className={styles.fabMenuItem}
              onClick={() => {
                setShowFabMenu(false);
                handleOpenSupport();
              }}
            >
              <div
                className={styles.fabMenuIconWrap}
                style={{ background: "rgba(245, 158, 11, 0.15)", color: "#f59e0b" }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>
                  support_agent
                </span>
              </div>
              <div className={styles.fabMenuText}>
                <span className={styles.fabMenuTitle}>الدعم الفني الرسمي (#123)</span>
                <span className={styles.fabMenuSub}>تواصل فوري مع فريق الدعم</span>
              </div>
            </button>
          </div>
        </>
      )}

      {/* Floating Action Button (FAB) */}
      <button
        type="button"
        aria-label="Start new conversation or contact"
        className={styles.mobileFab}
        onClick={() => setShowSelectContact(true)}
        title="تحديد جهة اتصال / محادثة جديدة"
      >
        <span className="material-symbols-outlined" style={{ fontSize: "26px" }}>
          chat
        </span>
      </button>

      {/* Hidden Camera Input for Mobile */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: "none" }}
        onChange={handleCameraFileChange}
      />

      {/* WhatsApp-Style Select Contact Screen */}
      <SelectContactModal
        isOpen={showSelectContact}
        onClose={() => setShowSelectContact(false)}
        currentUser={userProfile}
        onOpenCreateGroup={() => setShowCreateGroupModal(true)}
      />

      {/* Create Group Modal */}
      {userProfile && (
        <CreateGroupModal
          isOpen={showCreateGroupModal}
          onClose={() => setShowCreateGroupModal(false)}
          currentUser={userProfile}
          existingContacts={existingContacts}
          onGroupCreated={async (newChatId) => {
            setShowCreateGroupModal(false);
            try {
              const groupChatDoc = await getChatDoc(newChatId);
              if (groupChatDoc) {
                setActiveChat(groupChatDoc);
              }
              router.push(`/chat/${newChatId}`);
            } catch (e) {
              console.error("Error activating new group chat:", e);
            }
          }}
        />
      )}

      {/* Profile Modal for Other Users */}
      <UserProfileModal
        isOpen={showProfileModal}
        onClose={() => {
          setShowProfileModal(false);
          setSelectedProfileUser(null);
        }}
        user={selectedProfileUser}
        isBlocked={
          !!(
            selectedProfileUser &&
            userProfile?.blockedUsers?.includes(selectedProfileUser.uid)
          )
        }
        onToggleBlock={async () => {
          if (!userProfile || !selectedProfileUser) return;
          const targetUid = selectedProfileUser.uid;
          const isB = userProfile.blockedUsers?.includes(targetUid);
          try {
            if (isB) {
              await unblockUser(userProfile.uid, targetUid);
            } else {
              await blockUser(userProfile.uid, targetUid);
            }
          } catch (err: any) {
            alert("تعذر تحديث حالة الحظر: " + (err.message || "حاول مرة أخرى"));
          }
        }}
        isSupport={selectedProfileUser?.userCode === "123"}
      />

      {/* Profile Modal for Current User */}
      {userProfile && (
        <UserProfileModal
          isOpen={showMyProfileModal}
          onClose={() => setShowMyProfileModal(false)}
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

      {/* Notification Settings Modal */}
      {userProfile && (
        <NotificationSettingsModal
          isOpen={showNotifModal}
          onClose={() => setShowNotifModal(false)}
          uid={userProfile.uid}
        />
      )}
    </aside>
  );
}
