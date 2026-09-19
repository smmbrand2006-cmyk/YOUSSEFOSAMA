"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/contexts/AuthContext";
import { useChats } from "@/lib/contexts/ChatContext";
import { useRouter } from "next/navigation";
import {
  listenToFriendRequests,
  searchUsers,
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  openOrCreateSupportChat,
  getOrCreateDirectChat,
} from "@/lib/firebase/firestore";
import { signOut } from "@/lib/firebase/auth";
import { FriendRequest } from "@/lib/types/chat";
import { UserProfile } from "@/lib/types/user";
import { formatMessageTime } from "@/lib/utils/formatDate";
import {
  MessageCircle,
  Search,
  MoreVertical,
  UserPlus,
  Users,
  Settings,
  LogOut,
  Pin,
  VolumeX,
  Headphones,
} from "lucide-react";
import styles from "@/styles/chat.module.css";

type SidebarTab = "chats" | "requests" | "search";

export default function ChatSidebar() {
  const { userProfile } = useAuth();
  const { chats, activeChat, setActiveChat, totalUnread } = useChats();
  const router = useRouter();

  const [tab, setTab] = useState<SidebarTab>("chats");
  const [searchQuery, setSearchQuery] = useState("");
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [searching, setSearching] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [sentRequests, setSentRequests] = useState<Set<string>>(new Set());
  const [openingSupport, setOpeningSupport] = useState(false);

  // Listen to friend requests
  useEffect(() => {
    if (!userProfile) return;
    const unsub = listenToFriendRequests(userProfile.uid, setFriendRequests);
    return () => unsub();
  }, [userProfile?.uid]);

  // Support Chat Handler
  const handleOpenSupport = async () => {
    if (!userProfile) return;
    setOpeningSupport(true);
    try {
      const chatId = await openOrCreateSupportChat(userProfile);
      router.push(`/chat/${chatId}`);
    } catch (err: any) {
      alert(err.message || "حدث خطأ أثناء فتح محادثة الدعم.");
    } finally {
      setOpeningSupport(false);
    }
  };

  // Instant direct chat with any user (no friend request needed)
  const handleStartDirectChat = async (targetUser: UserProfile) => {
    if (!userProfile) return;
    if (targetUser.userCode === "123") {
      return handleOpenSupport();
    }
    try {
      const chatId = await getOrCreateDirectChat(userProfile, targetUser);
      setTab("chats");
      router.push(`/chat/${chatId}`);
    } catch (err: any) {
      alert(err.message || "حدث خطأ أثناء فتح المحادثة المباشرة.");
    }
  };

  // Search users
  const handleSearch = async () => {
    if (!searchQuery.trim() || !userProfile) return;
    setSearching(true);
    try {
      const results = await searchUsers(searchQuery.trim());
      // Filter out self
      setSearchResults(results.filter((u) => u.uid !== userProfile.uid));
    } catch (err) {
      console.error("Search failed:", err);
    } finally {
      setSearching(false);
    }
  };

  const handleSendRequest = async (targetUser: UserProfile) => {
    if (!userProfile) return;
    try {
      await sendFriendRequest(
        userProfile.uid,
        targetUser.uid,
        userProfile.displayName,
        targetUser.displayName
      );
      setSentRequests((prev) => new Set(prev).add(targetUser.uid));
    } catch (err: any) {
      alert(err.message || "Failed to send request");
    }
  };

  const handleAcceptRequest = async (requestId: string) => {
    try {
      const chatId = await acceptFriendRequest(requestId);
      router.push(`/chat/${chatId}`);
    } catch (err: any) {
      alert(err.message || "Failed to accept request");
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    try {
      await rejectFriendRequest(requestId);
    } catch (err: any) {
      alert(err.message || "Failed to reject request");
    }
  };

  const handleSignOut = async () => {
    await signOut();
    router.replace("/auth/login");
  };

  const handleChatClick = (chat: any) => {
    setActiveChat(chat);
    router.push(`/chat/${chat.id}`);
  };

  const getOtherParticipant = (chat: any) => {
    if (!userProfile) return { name: "Unknown" };
    const otherId = chat.participants.find(
      (id: string) => id !== userProfile.uid
    );
    return {
      name: chat.participantNames?.[otherId] || "Unknown",
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

  return (
    <div className={styles.sidebar}>
      {/* Header */}
      <div className={styles.sidebarHeader}>
        <div className={styles.sidebarHeaderLeft}>
          <div
            className="avatar"
            onClick={() => router.push("/profile")}
            style={{
              background: "var(--primary-gradient)",
              color: "white",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            {getInitials(userProfile?.displayName || userProfile?.userCode || "U")}
          </div>
          <h2>Chats</h2>
        </div>

        <div className={styles.sidebarHeaderRight}>
          {/* زر الدعم الفني المباشر (123) */}
          <button
            className={`btn-icon ${styles.sidebarHeaderBtn}`}
            onClick={handleOpenSupport}
            title="الدعم الفني (123)"
            disabled={openingSupport}
            style={{
              color: "#25D366",
              background: "rgba(37, 211, 102, 0.12)",
              borderRadius: "50%",
            }}
          >
            <Headphones size={20} />
          </button>

          <button
            className={`btn-icon ${styles.sidebarHeaderBtn}`}
            onClick={() => setTab(tab === "search" ? "chats" : "search")}
            title="بحث عن مستخدمين"
          >
            <UserPlus size={20} color="var(--text-secondary)" />
          </button>

          <button
            className={`btn-icon ${styles.sidebarHeaderBtn}`}
            onClick={() => setTab(tab === "requests" ? "chats" : "requests")}
            title="طلبات المراسلة"
          >
            <Users size={20} color="var(--text-secondary)" />
            {friendRequests.length > 0 && (
              <span className={styles.requestBadge}>
                {friendRequests.length}
              </span>
            )}
          </button>

          <div style={{ position: "relative" }}>
            <button
              className="btn-icon"
              onClick={() => setShowMenu(!showMenu)}
            >
              <MoreVertical size={20} color="var(--text-secondary)" />
            </button>
            {showMenu && (
              <div
                className="dropdown"
                style={{ right: 0, top: "100%", marginTop: 4 }}
              >
                <button
                  className="dropdown-item"
                  onClick={() => {
                    setShowMenu(false);
                    handleOpenSupport();
                  }}
                  style={{ color: "var(--primary)", fontWeight: 600 }}
                >
                  <Headphones size={16} color="var(--primary)" /> الدعم الفني (#123)
                </button>
                <div className="dropdown-divider" />
                <button
                  className="dropdown-item"
                  onClick={() => {
                    setShowMenu(false);
                    router.push("/profile");
                  }}
                >
                  <Settings size={16} /> الملف الشخصي
                </button>
                <div className="dropdown-divider" />
                <button
                  className="dropdown-item dropdown-item-danger"
                  onClick={() => {
                    setShowMenu(false);
                    handleSignOut();
                  }}
                >
                  <LogOut size={16} /> تسجيل الخروج
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Support quick banner */}
      <div
        onClick={handleOpenSupport}
        style={{
          margin: "8px 12px 0",
          padding: "8px 12px",
          background: "linear-gradient(135deg, rgba(37, 211, 102, 0.12), rgba(18, 140, 126, 0.08))",
          border: "1px solid rgba(37, 211, 102, 0.25)",
          borderRadius: "var(--radius-md)",
          display: "flex",
          alignItems: "center",
          gap: 10,
          cursor: "pointer",
          transition: "all 0.2s",
        }}
        title="انقر لفتح محادثة فورية مع الدعم"
      >
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: "50%",
            background: "var(--primary)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "white",
            flexShrink: 0,
          }}
        >
          <Headphones size={16} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--text-primary)" }}>
            الدعم الفني والمساعدة 🎧
          </div>
          <div style={{ fontSize: "0.72rem", color: "var(--text-secondary)" }}>
            تواصل مباشرة مع المشرف كود: #123
          </div>
        </div>
        <span style={{ fontSize: "0.75rem", color: "var(--primary)", fontWeight: 600 }}>
          شات ←
        </span>
      </div>

      {/* Search bar */}
      <div className={styles.searchBar}>
        <div className={styles.searchInput}>
          <Search size={16} />
          <input
            type="text"
            placeholder={
              tab === "search"
                ? "ابحث بالكود أو بالاسم..."
                : "البحث في المحادثات..."
            }
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && tab === "search") handleSearch();
            }}
          />
        </div>
      </div>

      {/* Tabs */}
      <div className={styles.tabs}>
        <div
          className={`${styles.tab} ${tab === "chats" ? styles.tabActive : ""}`}
          onClick={() => setTab("chats")}
        >
          المحادثات
          {totalUnread > 0 && (
            <span className={styles.tabBadge}>{totalUnread}</span>
          )}
        </div>
        <div
          className={`${styles.tab} ${
            tab === "requests" ? styles.tabActive : ""
          }`}
          onClick={() => setTab("requests")}
        >
          الطلبات
          {friendRequests.length > 0 && (
            <span className={styles.tabBadge}>{friendRequests.length}</span>
          )}
        </div>
        <div
          className={`${styles.tab} ${
            tab === "search" ? styles.tabActive : ""
          }`}
          onClick={() => setTab("search")}
        >
          بحث
        </div>
      </div>

      {/* Content */}
      <div className={styles.chatList}>
        {tab === "chats" && (
          <>
            {chats.length === 0 ? (
              <div className="empty-state">
                <MessageCircle size={48} />
                <h3>لا توجد محادثات بعد</h3>
                <p>
                  ابحث عن مستخدمين بكودهم الخاص وأرسل لهم طلب صداقة، أو ابدأ محادثة فورية مع الدعم الفني!
                </p>
                <button
                  onClick={handleOpenSupport}
                  style={{
                    marginTop: 12,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "8px 16px",
                    background: "var(--primary-gradient)",
                    color: "white",
                    border: "none",
                    borderRadius: "var(--radius-full)",
                    cursor: "pointer",
                    fontWeight: 600,
                    fontSize: "0.85rem",
                  }}
                >
                  <Headphones size={16} /> تواصل مع الدعم الفني (#123)
                </button>
              </div>
            ) : (
              chats.map((chat) => {
                const other =
                  chat.type === "direct"
                    ? getOtherParticipant(chat)
                    : { name: chat.groupName || "Group" };
                const unread = chat.unreadCount?.[userProfile?.uid || ""] || 0;
                const isPinned = chat.isPinned?.[userProfile?.uid || ""];
                const isMuted = chat.isMuted?.[userProfile?.uid || ""];

                return (
                  <div
                    key={chat.id}
                    className={`${styles.chatItem} ${
                      activeChat?.id === chat.id ? styles.chatItemActive : ""
                    }`}
                    onClick={() => handleChatClick(chat)}
                  >
                    <div
                      className="avatar"
                      style={{
                        background: "var(--primary-gradient)",
                        color: "white",
                        fontWeight: 700,
                      }}
                    >
                      {getInitials(other.name)}
                    </div>

                    <div className={styles.chatItemInfo}>
                      <div className={styles.chatItemTop}>
                        <span className={styles.chatItemName}>
                          {other.name}
                        </span>
                        <span
                          className={`${styles.chatItemTime} ${
                            unread > 0 ? styles.chatItemTimeUnread : ""
                          }`}
                        >
                          {formatMessageTime(chat.lastMessage?.createdAt)}
                        </span>
                      </div>

                      <div className={styles.chatItemBottom}>
                        <span className={styles.chatItemMessage}>
                          {chat.lastMessage?.text || "ابدأ المحادثة"}
                        </span>
                        <div className={styles.chatItemMeta}>
                          {isPinned && (
                            <Pin size={14} className={styles.pinIcon} />
                          )}
                          {isMuted && (
                            <VolumeX size={14} className={styles.muteIcon} />
                          )}
                          {unread > 0 && (
                            <span className="badge">{unread}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </>
        )}

        {tab === "requests" && (
          <>
            {friendRequests.length === 0 ? (
              <div className="empty-state">
                <Users size={48} />
                <h3>لا توجد طلبات واردة</h3>
                <p>طلبات المراسلة التي تصلك ستظهر هنا.</p>
              </div>
            ) : (
              friendRequests.map((req) => (
                <div key={req.id} className={styles.requestCard}>
                  <div
                    className="avatar"
                    style={{
                      background: "var(--primary-gradient)",
                      color: "white",
                      fontWeight: 700,
                    }}
                  >
                    {getInitials(req.fromName)}
                  </div>
                  <div className={styles.requestInfo}>
                    <div className={styles.requestName}>{req.fromName}</div>
                    {req.message && (
                      <div className={styles.requestMessage}>
                        {req.message}
                      </div>
                    )}
                  </div>
                  <div className={styles.requestActions}>
                    <button
                      className={styles.requestAccept}
                      onClick={() => handleAcceptRequest(req.id)}
                    >
                      قبول
                    </button>
                    <button
                      className={styles.requestReject}
                      onClick={() => handleRejectRequest(req.id)}
                    >
                      رفض
                    </button>
                  </div>
                </div>
              ))
            )}
          </>
        )}

        {tab === "search" && (
          <div className={styles.searchUsersPanel}>
            {searching ? (
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  padding: 32,
                }}
              >
                <div className="loading-spinner" />
              </div>
            ) : searchResults.length > 0 ? (
              searchResults.map((user) => {
                const isSupport = user.userCode === "123";
                return (
                  <div
                    key={user.uid}
                    className={styles.searchResultItem}
                    onClick={() => {
                      if (isSupport) {
                        handleOpenSupport();
                      } else {
                        handleStartDirectChat(user);
                      }
                    }}
                    style={{ cursor: "pointer" }}
                  >
                    <div
                      className="avatar"
                      style={{
                        background: isSupport
                          ? "linear-gradient(135deg, #128C7E, #25D366)"
                          : "var(--primary-gradient)",
                        color: "white",
                        fontWeight: 700,
                      }}
                    >
                      {isSupport ? (
                        <Headphones size={18} />
                      ) : (
                        getInitials(user.displayName || user.userCode)
                      )}
                    </div>
                    <div className={styles.searchResultInfo}>
                      <div className={styles.searchResultName}>
                        {user.displayName} {isSupport && "🎧"}
                      </div>
                      <div className={styles.searchResultCode}>
                        #{user.userCode}
                      </div>
                    </div>
                    {isSupport ? (
                      <button
                        className={styles.searchResultBtn}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenSupport();
                        }}
                        style={{
                          background: "linear-gradient(135deg, #128C7E, #25D366)",
                          color: "white",
                          fontWeight: 700,
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          padding: "6px 14px",
                        }}
                      >
                        <Headphones size={14} /> محادثة الدعم فوراً
                      </button>
                    ) : (
                      <button
                        className={styles.searchResultBtn}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStartDirectChat(user);
                        }}
                        style={{
                          background: "var(--primary)",
                          color: "white",
                          fontWeight: 600,
                          padding: "6px 14px",
                        }}
                      >
                        مراسلة فورية 💬
                      </button>
                    )}
                  </div>
                );
              })
            ) : searchQuery ? (
              <div className="empty-state">
                <Search size={48} />
                <h3>لا توجد نتائج</h3>
                <p>
                  جرب كوداً أو اسماً آخر، واضغط Enter للبحث.
                </p>
              </div>
            ) : (
              <div className="empty-state">
                <UserPlus size={48} />
                <h3>البحث عن أشخاص</h3>
                <p>
                  اكتب كود المستخدم أو الاسم واضغط Enter للبحث.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* User Code Display */}
      {userProfile && (
        <div
          style={{
            padding: "10px 16px",
            borderTop: "1px solid var(--divider)",
            background: "var(--bg-secondary)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: "0.8rem",
            color: "var(--text-tertiary)",
          }}
        >
          <span>كودك: <strong style={{ color: "var(--text-primary)" }}>#{userProfile.userCode}</strong></span>
          <span>{userProfile.displayName}</span>
        </div>
      )}
    </div>
  );
}
