"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/contexts/AuthContext";
import { useChats } from "@/lib/contexts/ChatContext";
import { useCall } from "@/lib/contexts/CallContext";
import {
  listenToMessages,
  sendMessage,
  markChatAsRead,
  deleteMessage,
  deleteMultipleMessages,
  clearChatForEveryone,
  clearChatForMe,
  toggleMuteChat,
  addReaction,
  getChatDoc,
  blockUser,
  unblockUser,
} from "@/lib/firebase/firestore";
import {
  setTyping,
  listenToTyping,
  listenToPresence,
} from "@/lib/firebase/realtime";
import { encodeImageToBase64 } from "@/lib/utils/imageEncoder";
import { Message } from "@/lib/types/message";
import { Chat } from "@/lib/types/chat";
import { UserProfile } from "@/lib/types/user";
import { getUserProfile } from "@/lib/firebase/auth";
import { formatMessageTime, formatLastSeen } from "@/lib/utils/formatDate";
import {
  ArrowLeft,
  Phone,
  Video,
  MoreVertical,
  Search,
  Send,
  Paperclip,
  Image as ImageIcon,
  X,
  CheckCheck,
  Reply,
  Trash2,
  Copy,
  Ban,
  ChevronUp,
  ChevronDown,
  Smile,
} from "lucide-react";
import UserProfileModal from "@/components/chat/UserProfileModal";
import styles from "@/styles/chat.module.css";

export default function ChatClient({ chatIdProp }: { chatIdProp?: string } = {}) {
  const params = useParams();
  const router = useRouter();
  const { userProfile } = useAuth();
  const { chats, setActiveChat } = useChats();
  const { initiateCall } = useCall();

  const [urlId, setUrlId] = useState("");
  useEffect(() => {
    if (typeof window !== "undefined") {
      const parts = window.location.pathname.split("/").filter(Boolean);
      if (parts[0] === "chat" && parts[1] && parts[1] !== "direct") {
        setUrlId(parts[1]);
      }
    }
  }, []);

  const chatId =
    chatIdProp ||
    (params?.chatId && params.chatId !== "direct" ? (params.chatId as string) : "") ||
    urlId;

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [otherOnline, setOtherOnline] = useState(false);
  const [otherLastSeen, setOtherLastSeen] = useState<number | null>(null);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [showAttach, setShowAttach] = useState(false);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    message: Message;
  } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [standaloneChat, setStandaloneChat] = useState<Chat | null>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showTopMenu, setShowTopMenu] = useState(false);
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showClearConfirm, setShowClearConfirm] = useState<"everyone" | "me" | null>(null);
  const [showInChatSearch, setShowInChatSearch] = useState(false);
  const [inChatSearchQuery, setInChatSearchQuery] = useState("");
  const [activeMatchIndex, setActiveMatchIndex] = useState(0);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // In-chat search matching
  const matchingMessages = messages.filter(
    (m) =>
      !m.isDeleted &&
      m.text &&
      inChatSearchQuery.trim() &&
      m.text.toLowerCase().includes(inChatSearchQuery.trim().toLowerCase())
  );

  const handleNextMatch = () => {
    if (matchingMessages.length === 0) return;
    const nextIdx = (activeMatchIndex + 1) % matchingMessages.length;
    setActiveMatchIndex(nextIdx);
    const targetId = matchingMessages[nextIdx].id;
    document.getElementById(`msg-${targetId}`)?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  };

  const handlePrevMatch = () => {
    if (matchingMessages.length === 0) return;
    const prevIdx =
      (activeMatchIndex - 1 + matchingMessages.length) % matchingMessages.length;
    setActiveMatchIndex(prevIdx);
    const targetId = matchingMessages[prevIdx].id;
    document.getElementById(`msg-${targetId}`)?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  };

  // Find current chat
  const currentChat = chats.find((c) => c.id === chatId) || standaloneChat;

  useEffect(() => {
    if (!chatId) return;
    if (!chats.some((c) => c.id === chatId)) {
      getChatDoc(chatId).then((doc) => {
        if (doc) setStandaloneChat(doc);
      });
    }
  }, [chatId, chats]);

  // Set active chat when found
  useEffect(() => {
    if (currentChat) setActiveChat(currentChat);
  }, [currentChat?.id]);

  // Listen to messages with instant synchronization
  useEffect(() => {
    if (!chatId) return;
    const unsub = listenToMessages(chatId, 60, (serverMsgs) => {
      setMessages((prev) => {
        // Keep pending optimistic messages until confirmed by server
        const pendingOptimistic = prev.filter(
          (m) =>
            m.id.startsWith("opt_") &&
            !serverMsgs.some(
              (sm) => sm.senderId === m.senderId && sm.text === m.text
            )
        );
        return [...serverMsgs, ...pendingOptimistic];
      });
    });
    return () => unsub();
  }, [chatId]);

  // Mark as read
  useEffect(() => {
    if (chatId && userProfile) {
      markChatAsRead(chatId, userProfile.uid);
    }
  }, [chatId, userProfile?.uid, messages.length]);

  // Close 3-dots top menu on click outside
  useEffect(() => {
    const handleGlobalClick = () => setShowTopMenu(false);
    if (showTopMenu) {
      window.addEventListener("click", handleGlobalClick);
    }
    return () => window.removeEventListener("click", handleGlobalClick);
  }, [showTopMenu]);

  const otherUid = currentChat?.participants?.find(
    (id) => id !== userProfile?.uid
  );
  const isSupport =
    currentChat?.isSupport ||
    otherUid === "support_123_uid" ||
    otherUid === "support_official_123";

  const [otherUserData, setOtherUserData] = useState<UserProfile | null>(null);

  useEffect(() => {
    if (!otherUid || isSupport) return;
    getUserProfile(otherUid).then((prof) => {
      if (prof) setOtherUserData(prof);
    });
  }, [otherUid, isSupport]);

  const otherName = isSupport
    ? "الدعم الفني (123)"
    : otherUserData?.displayName ||
      (otherUid ? currentChat?.participantNames?.[otherUid] : null) ||
      otherUserData?.userCode ||
      (currentChat?.type === "group" ? (currentChat as any)?.name : null) ||
      (otherUid ? `مستخدم #${otherUid.substring(0, 4)}` : "مستخدم");

  // Check if current user blocked the other user
  const isBlocked = !!(
    otherUid &&
    userProfile?.blockedUsers &&
    userProfile.blockedUsers.includes(otherUid)
  );

  const handleToggleBlock = async () => {
    if (!userProfile || !otherUid || isSupport) return;
    try {
      if (isBlocked) {
        await unblockUser(userProfile.uid, otherUid);
      } else {
        await blockUser(userProfile.uid, otherUid);
      }
    } catch (err: any) {
      console.error("Failed to toggle block status:", err);
      alert("تعذر تحديث حالة الحظر: " + (err.message || "حاول مرة أخرى"));
    }
  };

  // Listen to typing
  useEffect(() => {
    if (!chatId || !userProfile) return;
    const unsub = listenToTyping(chatId, userProfile.uid, setTypingUsers);
    return () => unsub();
  }, [chatId, userProfile?.uid]);

  // Listen to other user's presence
  useEffect(() => {
    if (!otherUid) return;
    const unsub = listenToPresence(otherUid, (data) => {
      setOtherOnline(data?.online || false);
      setOtherLastSeen(data?.lastSeen || null);
    });
    return () => unsub();
  }, [otherUid]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Close context menu and menus on click outside
  useEffect(() => {
    const handleClick = () => {
      setContextMenu(null);
      setShowAttach(false);
      setShowTopMenu(false);
    };
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

  // Handle typing indicator
  const handleTyping = useCallback(() => {
    if (!chatId || !userProfile) return;
    setTyping(chatId, userProfile.uid, true);

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      setTyping(chatId, userProfile.uid, false);
    }, 3000);
  }, [chatId, userProfile?.uid]);

  // Send text message (Optimistic 0-second instant delivery)
  const handleSend = async () => {
    if (!inputText.trim() || !userProfile || !chatId) return;
    if (isBlocked) {
      alert("لا يمكنك إرسال رسائل لمستخدم محظور.");
      return;
    }

    const text = inputText.trim();
    setInputText("");
    const replySnapshot = replyTo;
    setReplyTo(null);
    setTyping(chatId, userProfile.uid, false);

    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    const extra: Record<string, any> = {};
    if (replySnapshot) {
      extra.replyTo = {
        messageId: replySnapshot.id,
        text: replySnapshot.text,
        senderId: replySnapshot.senderId,
        senderName: replySnapshot.senderName,
      };
    }

    // ⚡ Optimistic UI: Display the message immediately in the same millisecond!
    const tempId = `opt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const optimisticMsg: Message = {
      id: tempId,
      senderId: userProfile.uid,
      senderName: userProfile.displayName,
      text,
      type: "text",
      reactions: {},
      isEdited: false,
      isDeleted: false,
      deletedFor: [],
      createdAt: { toDate: () => new Date() } as any,
      ...extra,
    };

    setMessages((prev) => [...prev, optimisticMsg]);
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 10);

    try {
      await sendMessage(chatId, userProfile.uid, userProfile.displayName, text, extra);
    } catch (err) {
      console.error("Failed to send message:", err);
      // Remove optimistic message if failure occurs
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      alert("تعذر إرسال الرسالة، تأكد من الاتصال بالإنترنت.");
    }
  };

  // Send image as Base64 encoded string directly into Firestore (Zero Storage)
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userProfile || !chatId) return;
    if (isBlocked) {
      alert("لا يمكنك إرسال وسائط لمستخدم محظور.");
      return;
    }

    setUploading(true);
    setShowAttach(false);

    try {
      const base64Code = await encodeImageToBase64(file);
      // ⚡ Optimistic image display
      const tempId = `opt_img_${Date.now()}`;
      const optimisticImgMsg: Message = {
        id: tempId,
        senderId: userProfile.uid,
        senderName: userProfile.displayName,
        text: "📷 صورة",
        type: "image",
        mediaCode: base64Code,
        reactions: {},
        isEdited: false,
        isDeleted: false,
        deletedFor: [],
        createdAt: { toDate: () => new Date() } as any,
      };

      setMessages((prev) => [...prev, optimisticImgMsg]);
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 10);

      await sendMessage(
        chatId,
        userProfile.uid,
        userProfile.displayName,
        "📷 صورة",
        {
          type: "image",
          mediaCode: base64Code,
        }
      );
    } catch (err) {
      console.error("Image encode/send failed:", err);
      alert("فشل تشفير وإرسال الصورة");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Calls
  const handleStartCall = async (type: "audio" | "video") => {
    if (isSupport) {
      alert("خدمة الدعم الفني مخصصة للمراسلة النصية الفورية حالياً 🎧");
      return;
    }
    if (isBlocked) {
      alert("لقد قمت بحظر هذا المستخدم. يرجى إلغاء الحظر أولاً لتتمكن من الاتصال به.");
      return;
    }
    if (!otherUid) {
      alert("جاري تحميل بيانات الطرف الآخر، يرجى المحاولة بعد لحظات.");
      return;
    }
    try {
      await initiateCall(otherUid, otherName, "", type);
    } catch (err: any) {
      console.error("Call error:", err);
      alert(
        "تعذر بدء المكالمة: " +
          (err.message ||
            "يرجى التأكد من السماح بالوصول للميكروفون والكاميرا في المتصفح.")
      );
    }
  };

  // Export Chat as Text File
  const handleExportChat = () => {
    setShowTopMenu(false);
    if (messages.length === 0) {
      alert("لا توجد رسائل لتصديرها في هذه المحادثة.");
      return;
    }
    const chatText = messages
      .map((m) => {
        const time = m.createdAt
          ? new Date((m.createdAt as any).toMillis?.() || (m as any).clientTimestamp || Date.now()).toLocaleString("ar-EG")
          : "";
        return `[${time}] ${m.senderName}: ${m.text || "[وسائط]"}`;
      })
      .join("\n");
    const blob = new Blob([chatText], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `chat-export-${otherName || "conversation"}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Context menu actions
  const handleReply = (msg: Message) => {
    setReplyTo(msg);
    setContextMenu(null);
    textareaRef.current?.focus();
  };

  const handleDelete = async (msg: Message, forEveryone: boolean) => {
    if (!userProfile) return;
    await deleteMessage(chatId, msg.id, userProfile.uid, forEveryone);
    setContextMenu(null);
  };

  const handleCopy = (msg: Message) => {
    navigator.clipboard.writeText(msg.text);
    setContextMenu(null);
  };

  const handleReaction = async (msg: Message, emoji: string) => {
    if (!userProfile) return;
    await addReaction(chatId, msg.id, emoji, userProfile.uid);
    setContextMenu(null);
  };

  // Toggle single message selection
  const toggleSelectMessage = (msgId: string) => {
    setSelectedIds((prev) =>
      prev.includes(msgId) ? prev.filter((id) => id !== msgId) : [...prev, msgId]
    );
  };

  // Select all or deselect all
  const handleSelectAll = () => {
    const validMsgs = messages.filter((m) => !m.isDeleted && m.type !== "system");
    if (selectedIds.length === validMsgs.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(validMsgs.map((m) => m.id));
    }
  };

  // Delete selected messages (for everyone or for me)
  const handleDeleteSelected = async (forEveryone: boolean) => {
    if (selectedIds.length === 0 || !userProfile || !chatId) return;
    const count = selectedIds.length;
    const confirmMsg = forEveryone
      ? `هل أنت متأكد من حذف ${count} رسالة لدى الجميع؟`
      : `هل أنت متأكد من حذف ${count} رسالة لديك فقط؟`;
    if (!confirm(confirmMsg)) return;

    try {
      await deleteMultipleMessages(chatId, selectedIds, userProfile.uid, forEveryone);
      setIsSelecting(false);
      setSelectedIds([]);
    } catch (err: any) {
      console.error("Delete selected error:", err);
      alert("حدث خطأ أثناء حذف الرسائل: " + (err.message || "حاول مرة أخرى"));
    }
  };

  // Copy selected messages
  const handleCopySelected = () => {
    const selectedMsgs = messages.filter((m) => selectedIds.includes(m.id));
    const text = selectedMsgs.map((m) => m.text).join("\n");
    navigator.clipboard.writeText(text);
    alert(`تم نسخ ${selectedMsgs.length} رسائل بنجاح!`);
    setIsSelecting(false);
    setSelectedIds([]);
  };

  // Clear chat completely
  const handleClearChat = async (forEveryone: boolean) => {
    if (!userProfile || !chatId) return;
    try {
      if (forEveryone) {
        await clearChatForEveryone(chatId);
        setMessages([]);
        alert("تم مسح المحادثة بالكامل لدى الجميع بنجاح! 🗑️");
      } else {
        await clearChatForMe(chatId, userProfile.uid);
        setMessages([]);
        alert("تم مسح المحادثة لديك فقط! 🧹");
      }
    } catch (err: any) {
      console.error("Clear chat error:", err);
      alert("حدث خطأ أثناء مسح المحادثة: " + (err.message || "حاول مرة أخرى"));
    } finally {
      setShowClearConfirm(null);
      setShowTopMenu(false);
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputText(e.target.value);
    handleTyping();
    const ta = e.target;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 120) + "px";
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

  const getStatusText = () => {
    if (typingUsers.length > 0) return "يكتب الآن...";
    if (otherOnline) return "متصل الآن 🟢";
    if (otherLastSeen) return `آخر ظهور ${formatLastSeen(otherLastSeen)}`;
    return "غير متصل";
  };

  return (
    <section className={styles.chatMain}>
      {/* Top Bar: Either Message Selection Bar or Regular Chat Header */}
      {isSelecting ? (
        <div className={styles.selectionTopBar}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button
              type="button"
              className={styles.selectionActionBtn}
              onClick={() => {
                setIsSelecting(false);
                setSelectedIds([]);
              }}
              title="إلغاء التحديد"
            >
              <X size={22} />
            </button>
            <span style={{ fontWeight: 600, fontSize: "1.05rem", color: "var(--on-surface)" }}>
              {selectedIds.length} محددة
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <button
              type="button"
              className={styles.selectionActionBtn}
              onClick={handleSelectAll}
              title="تحديد الكل"
            >
              <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>
                select_all
              </span>
              <span className={styles.selectionBtnText}>الكل</span>
            </button>

            <button
              type="button"
              className={styles.selectionActionBtn}
              onClick={handleCopySelected}
              disabled={selectedIds.length === 0}
              title="نسخ الرسائل المحددة"
            >
              <Copy size={18} />
              <span className={styles.selectionBtnText}>نسخ</span>
            </button>

            {/* Delete for Everyone */}
            <button
              type="button"
              className={`${styles.selectionActionBtn} ${styles.selectionDeleteEveryoneBtn}`}
              onClick={() => handleDeleteSelected(true)}
              disabled={selectedIds.length === 0}
              title="حذف الرسائل المحددة لدى الجميع"
            >
              <Trash2 size={18} />
              <span className={styles.selectionBtnText}>حذف للجميع</span>
            </button>

            {/* Delete for Me */}
            <button
              type="button"
              className={styles.selectionActionBtn}
              onClick={() => handleDeleteSelected(false)}
              disabled={selectedIds.length === 0}
              title="حذف الرسائل المحددة لدي فقط"
            >
              <Trash2 size={18} />
              <span className={styles.selectionBtnText}>حذف لدي</span>
            </button>
          </div>
        </div>
      ) : (
        <div className={styles.chatTopBar}>
          <div
            className={styles.chatTopProfile}
            onClick={() => setShowProfileModal(true)}
            title="عرض الملف التعريفي"
          >
            <button
              type="button"
              className={styles.mobileBackBtn}
              onClick={(e) => {
                e.stopPropagation();
                setActiveChat(null);
                router.push("/chat");
              }}
              title="رجوع"
            >
              <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>
                arrow_back
              </span>
            </button>

            <div className={styles.chatTopAvatar}>
              {isSupport ? (
                <span
                  className="material-symbols-outlined"
                  style={{ fontSize: "24px", color: "var(--primary)" }}
                >
                  support_agent
                </span>
              ) : (
                getInitials(otherName)
              )}
              {otherOnline && <span className={styles.chatRowOnlineDot} />}
            </div>

            <div className={styles.chatTopInfo}>
              <div className={styles.chatTopName}>
                {otherName} {isBlocked && <span style={{ color: "var(--error)", fontSize: "0.75rem", marginRight: 4 }}>(محظور 🚫)</span>}
              </div>
              <div
                className={`${styles.chatTopStatus} ${
                  otherOnline || typingUsers.length > 0
                    ? styles.chatTopStatusOnline
                    : ""
                }`}
              >
                {getStatusText()}
              </div>
            </div>
          </div>

          {/* Header Actions */}
          <div className={styles.chatTopActions}>
            <button
              type="button"
              aria-label="Video Call"
              className={styles.chatTopActionBtn}
              onClick={() => handleStartCall("video")}
              title="مكالمة فيديو"
            >
              <Video size={20} />
            </button>

            <button
              type="button"
              aria-label="Voice Call"
              className={styles.chatTopActionBtn}
              onClick={() => handleStartCall("audio")}
              title="مكالمة صوتية"
            >
              <Phone size={19} />
            </button>

            <div className={styles.chatTopDivider} />

            <button
              type="button"
              aria-label="Search"
              className={`${styles.chatTopActionBtn} ${
                showInChatSearch ? styles.activeChatTopActionBtn : ""
              }`}
              onClick={() => {
                setShowInChatSearch((prev) => !prev);
                if (showInChatSearch) {
                  setInChatSearchQuery("");
                }
              }}
              title="بحث في المحادثة"
            >
              {showInChatSearch ? <X size={20} /> : <Search size={20} />}
            </button>

            {/* 3-Dots Menu with Rich Options */}
            <div style={{ position: "relative" }}>
              <button
                type="button"
                aria-label="خيارات المحادثة"
                className={`${styles.chatTopActionBtn} ${showTopMenu ? styles.activeChatTopActionBtn : ""}`}
                onClick={(e) => {
                  e.stopPropagation();
                  setShowTopMenu((prev) => !prev);
                }}
                title="خيارات المحادثة"
              >
                <MoreVertical size={20} />
              </button>

              {showTopMenu && (
                <div
                  className={styles.chatHeaderDropdown}
                  style={{
                    position: "absolute",
                    top: "calc(100% + 8px)",
                    right: 0,
                    minWidth: "240px",
                    zIndex: 1000,
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    className={styles.chatDropdownItem}
                    onClick={() => {
                      setShowTopMenu(false);
                      setShowProfileModal(true);
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: "19px" }}>
                      info
                    </span>
                    معلومات {currentChat?.type === "group" ? "المجموعة" : "جهة الاتصال"}
                  </button>

                  <button
                    type="button"
                    className={styles.chatDropdownItem}
                    onClick={() => {
                      setShowTopMenu(false);
                      setIsSelecting(true);
                      setSelectedIds([]);
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: "19px", color: "var(--primary)" }}>
                      checklist
                    </span>
                    تحديد الرسائل (حذف مجمع)
                  </button>

                  <button
                    type="button"
                    className={styles.chatDropdownItem}
                    onClick={() => {
                      setShowTopMenu(false);
                      setShowInChatSearch(true);
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: "19px" }}>
                      search
                    </span>
                    بحث في الرسائل
                  </button>

                  <button
                    type="button"
                    className={styles.chatDropdownItem}
                    onClick={async () => {
                      setShowTopMenu(false);
                      if (chatId && userProfile) {
                        const isMuted = !!currentChat?.isMuted?.[userProfile.uid];
                        await toggleMuteChat(chatId, userProfile.uid, !isMuted);
                      }
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: "19px" }}>
                      {currentChat?.isMuted?.[userProfile?.uid || ""] ? "volume_up" : "volume_off"}
                    </span>
                    {currentChat?.isMuted?.[userProfile?.uid || ""] ? "إلغاء كتم الإشعارات" : "كتم الإشعارات"}
                  </button>

                  <div className={styles.chatDropdownDivider} />

                  {/* Clear Chat For Everyone Option */}
                  <button
                    type="button"
                    className={`${styles.chatDropdownItem} ${styles.chatDropdownDanger}`}
                    onClick={() => {
                      setShowTopMenu(false);
                      setShowClearConfirm("everyone");
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: "19px", color: "var(--error)" }}>
                      delete_sweep
                    </span>
                    مسح المحادثة لدى الجميع 🗑️
                  </button>

                  {/* Clear Chat For Me Option */}
                  <button
                    type="button"
                    className={styles.chatDropdownItem}
                    onClick={() => {
                      setShowTopMenu(false);
                      setShowClearConfirm("me");
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: "19px" }}>
                      mop
                    </span>
                    مسح المحادثة لدي فقط
                  </button>

                  {!isSupport && otherUid && (
                    <button
                      type="button"
                      className={`${styles.chatDropdownItem} ${isBlocked ? "" : styles.chatDropdownDanger}`}
                      onClick={() => {
                        setShowTopMenu(false);
                        handleToggleBlock();
                      }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: "19px" }}>
                        block
                      </span>
                      {isBlocked ? "إلغاء حظر المستخدم" : "حظر المستخدم"}
                    </button>
                  )}

                  <div className={styles.chatDropdownDivider} />

                  {/* Export Chat */}
                  <button
                    type="button"
                    className={styles.chatDropdownItem}
                    onClick={handleExportChat}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: "19px", color: "#38bdf8" }}>
                      file_download
                    </span>
                    تصدير المحادثة (Export chat)
                  </button>

                  {/* Wallpaper */}
                  <button
                    type="button"
                    className={styles.chatDropdownItem}
                    onClick={() => {
                      setShowTopMenu(false);
                      alert("خلفيات المحادثة: الوضع الليلي عالي التباين مفعل افتراضياً 🎨");
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: "19px", color: "#facc15" }}>
                      wallpaper
                    </span>
                    خلفية المحادثة (Wallpaper)
                  </button>

                  {/* Settings */}
                  <button
                    type="button"
                    className={styles.chatDropdownItem}
                    onClick={() => {
                      setShowTopMenu(false);
                      router.push("/profile");
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: "19px", color: "var(--primary)" }}>
                      settings
                    </span>
                    الإعدادات العامة (Settings) ⚙️
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* In-Chat Search Bar */}
      {showInChatSearch && (
        <div className={styles.inChatSearchBar}>
          <input
            type="text"
            className={styles.inChatSearchInput}
            placeholder="بحث في رسائل المحادثة..."
            value={inChatSearchQuery}
            onChange={(e) => {
              setInChatSearchQuery(e.target.value);
              setActiveMatchIndex(0);
            }}
            autoFocus
          />
          <div className={styles.inChatSearchInfo}>
            {inChatSearchQuery.trim() ? (
              matchingMessages.length > 0 ? (
                <span>
                  {activeMatchIndex + 1} من {matchingMessages.length}
                </span>
              ) : (
                <span style={{ color: "var(--error)" }}>لا توجد نتائج</span>
              )
            ) : (
              <span>اكتب للبحث...</span>
            )}
          </div>
          {matchingMessages.length > 0 && (
            <div style={{ display: "flex", gap: "2px" }}>
              <button
                type="button"
                className={styles.inChatSearchBtn}
                onClick={handlePrevMatch}
                title="السابق"
              >
                <ChevronUp size={18} />
              </button>
              <button
                type="button"
                className={styles.inChatSearchBtn}
                onClick={handleNextMatch}
                title="التالي"
              >
                <ChevronDown size={18} />
              </button>
            </div>
          )}
          <button
            type="button"
            className={styles.inChatSearchBtn}
            onClick={() => {
              setShowInChatSearch(false);
              setInChatSearchQuery("");
            }}
            title="إغلاق البحث"
          >
            <X size={18} />
          </button>
        </div>
      )}

      {/* Main Chat Conversation Canvas */}
      <div className={styles.chatCanvas}>
        {/* Subtle Authentic WhatsApp Web Dark Pattern (3% Opacity SVG Tile) */}
        <svg
          className={styles.chatSvgPattern}
          height="100%"
          width="100%"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <pattern
              height="60"
              id="wa-pattern"
              patternUnits="userSpaceOnUse"
              width="60"
            >
              <path
                d="M12 8a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm24 0a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm16 16a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm-40 0a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm16 16a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm24 0a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm-16 16a2 2 0 1 0 0-4 2 2 0 0 0 0 4z"
                fill="#E5E2E1"
              />
              <circle cx="28" cy="20" fill="#E5E2E1" r="1.5" />
              <circle cx="48" cy="40" fill="#E5E2E1" r="1.5" />
              <circle cx="8" cy="48" fill="#E5E2E1" r="1.5" />
            </pattern>
          </defs>
          <rect fill="url(#wa-pattern)" height="100%" width="100%" />
        </svg>

        {/* Context Menu with Backdrop */}
        {contextMenu && (
          <>
            <div
              style={{
                position: "fixed",
                inset: 0,
                zIndex: 98,
                background: "rgba(0, 0, 0, 0.25)",
              }}
              onClick={() => setContextMenu(null)}
            />
            <div
              className={styles.contextMenu}
              style={{
                top: Math.max(
                  12,
                  Math.min(
                    contextMenu.y,
                    (typeof window !== "undefined" ? window.innerHeight : 600) - 250
                  )
                ),
                left: Math.max(
                  12,
                  Math.min(
                    contextMenu.x,
                    (typeof window !== "undefined" ? window.innerWidth : 800) - 220
                  )
                ),
                zIndex: 99,
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className={styles.reactionsBar}>
                {["👍", "❤️", "😂", "😮", "😢", "🙏"].map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    style={{
                      fontSize: "1.2rem",
                      cursor: "pointer",
                      background: "none",
                      border: "none",
                      padding: "2px 4px",
                      borderRadius: "6px",
                    }}
                    onClick={() => handleReaction(contextMenu.message, emoji)}
                    title={`تفاعل بـ ${emoji}`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
              <div
                className={styles.contextMenuItem}
                onClick={() => handleReply(contextMenu.message)}
              >
                <Reply size={16} /> الرد على الرسالة
              </div>
              <div
                className={styles.contextMenuItem}
                onClick={() => {
                  setIsSelecting(true);
                  setSelectedIds([contextMenu.message.id]);
                  setContextMenu(null);
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: "16px", color: "var(--primary)" }}>
                  checklist
                </span>
                تحديد الرسائل
              </div>
              {!contextMenu.message.isDeleted && (
                <div
                  className={styles.contextMenuItem}
                  onClick={() => handleDelete(contextMenu.message, true)}
                >
                  <Trash2 size={16} /> الحذف لدى الجميع
                </div>
              )}
              {!contextMenu.message.isDeleted && (
                <div
                  className={`${styles.contextMenuItem} ${styles.contextMenuDanger}`}
                  onClick={() => handleDelete(contextMenu.message, false)}
                >
                  <Trash2 size={16} /> الحذف لدي فقط
                </div>
              )}
            </div>
          </>
        )}

        {/* Messages */}
        {messages.map((msg) => {
          if (
            msg.deletedFor?.includes(userProfile?.uid || "") &&
            !msg.isDeleted
          )
            return null;

          const isOutgoing = msg.senderId === userProfile?.uid;
          const isSystem = msg.type === "system";

          if (isSystem) {
            return (
              <div
                key={msg.id}
                style={{
                  alignSelf: "center",
                  background: "var(--surface-container)",
                  color: "var(--outline)",
                  fontSize: "0.78rem",
                  padding: "4px 12px",
                  borderRadius: "8px",
                  margin: "8px 0",
                  zIndex: 1,
                }}
              >
                {msg.text}
              </div>
            );
          }

          const isSelected = selectedIds.includes(msg.id);

          return (
            <div
              key={msg.id}
              id={`msg-${msg.id}`}
              className={`${isOutgoing ? styles.msgRowOutgoing : styles.msgRowIncoming} ${
                isSelecting ? styles.msgRowSelecting : ""
              } ${isSelected ? styles.msgRowSelected : ""}`}
              onClick={() => {
                if (isSelecting) {
                  toggleSelectMessage(msg.id);
                }
              }}
              onContextMenu={(e) => {
                e.preventDefault();
                setContextMenu({ x: e.clientX, y: e.clientY, message: msg });
              }}
            >
              {isSelecting && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    order: isOutgoing ? 2 : -1,
                    padding: "0 8px",
                    cursor: "pointer",
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleSelectMessage(msg.id);
                  }}
                >
                  <div
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: "50%",
                      border: isSelected ? "2px solid var(--primary)" : "2px solid var(--outline)",
                      background: isSelected ? "var(--primary)" : "transparent",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#fff",
                      transition: "all 0.2s ease",
                    }}
                  >
                    {isSelected && (
                      <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>
                        check
                      </span>
                    )}
                  </div>
                </div>
              )}
              <div
                className={
                  isOutgoing
                    ? styles.msgBubbleOutgoing
                    : styles.msgBubbleIncoming
                }
                style={{ position: "relative" }}
              >
                {/* Mobile / Touch / Hover Action Trigger */}
                <button
                  type="button"
                  className={styles.msgActionTrigger}
                  onClick={(e) => {
                    e.stopPropagation();
                    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                    setContextMenu({
                      x: isOutgoing ? rect.left - 180 : rect.right + 10,
                      y: rect.top,
                      message: msg,
                    });
                  }}
                  title="تفاعلات وخيارات الرسالة"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>
                    expand_more
                  </span>
                </button>

                {/* Reply preview */}
                {msg.replyTo && (
                  <div
                    style={{
                      background: "rgba(0,0,0,0.2)",
                      borderLeft: "3px solid var(--primary)",
                      padding: "4px 8px",
                      borderRadius: "4px",
                      marginBottom: "6px",
                      fontSize: "0.8rem",
                    }}
                  >
                    <div style={{ fontWeight: 600, color: "var(--primary)" }}>
                      {msg.replyTo.senderName}
                    </div>
                    <div
                      style={{
                        color: "var(--outline)",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {msg.replyTo.text}
                    </div>
                  </div>
                )}

                {/* Message Content */}
                {msg.isDeleted ? (
                  <span
                    style={{
                      color: "var(--outline)",
                      fontStyle: "italic",
                      fontSize: "0.82rem",
                    }}
                  >
                    🚫 تم حذف هذه الرسالة
                  </span>
                ) : (
                  <>
                    {msg.type === "image" && msg.mediaCode && (
                      <div style={{ marginBottom: 6 }}>
                        <img
                          src={msg.mediaCode}
                          alt="صورة مشفرة"
                          style={{
                            maxWidth: "100%",
                            maxHeight: 320,
                            borderRadius: 6,
                            display: "block",
                            objectFit: "cover",
                          }}
                        />
                      </div>
                    )}
                    {msg.text && (msg.type !== "image" || !msg.mediaCode) && (
                      <span>
                        {inChatSearchQuery.trim() &&
                        msg.text
                          .toLowerCase()
                          .includes(inChatSearchQuery.trim().toLowerCase()) ? (
                          <span
                            style={{
                              background: "rgba(255, 235, 59, 0.35)",
                              color: "#fff",
                              padding: "0 2px",
                              borderRadius: "2px",
                            }}
                          >
                            {msg.text}
                          </span>
                        ) : (
                          msg.text
                        )}
                      </span>
                    )}
                  </>
                )}

                {/* Reactions badge row */}
                {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                  <div className={styles.msgReactionsBadgeRow}>
                    {Object.entries(msg.reactions).map(([emoji, uids]) => {
                      const count = Array.isArray(uids) ? uids.length : 1;
                      if (count === 0) return null;
                      return (
                        <span
                          key={emoji}
                          className={styles.msgReactionPill}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleReaction(msg, emoji);
                          }}
                          title="تفاعل"
                        >
                          {emoji} {count > 1 ? count : ""}
                        </span>
                      );
                    })}
                  </div>
                )}

                {/* Time & checkmark */}
                <div className={styles.msgMeta}>
                  <span>{formatMessageTime(msg.createdAt)}</span>
                  {isOutgoing && (
                    <span
                      className="material-symbols-outlined"
                      style={{
                        fontSize: "15px",
                        color:
                          msg.readBy && Object.keys(msg.readBy).length > 1
                            ? "var(--primary)"
                            : "inherit",
                      }}
                    >
                      done_all
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input Area */}
      {isBlocked ? (
        <div className={styles.blockedBanner}>
          <div className={styles.blockedBannerContent}>
            <Ban size={20} color="#ef4444" />
            <span>لقد قمت بحظر هذا المستخدم. لا يمكنك إرسال رسائل أو الاتصال به.</span>
          </div>
          <button className={styles.unblockBtn} onClick={handleToggleBlock}>
            إلغاء الحظر
          </button>
        </div>
      ) : (
        <div className={styles.inputAreaBottom}>
          {/* Reply preview if replying */}
          {replyTo && (
            <div
              style={{
                position: "absolute",
                bottom: "100%",
                left: 0,
                right: 0,
                padding: "8px 20px",
                background: "var(--surface-container-low)",
                borderTop: "1px solid var(--on-secondary)",
                display: "flex",
                alignItems: "center",
                gap: 12,
              }}
            >
              <div
                style={{
                  flex: 1,
                  borderLeft: "3px solid var(--primary)",
                  paddingLeft: 8,
                }}
              >
                <div style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--primary)" }}>
                  {replyTo.senderName}
                </div>
                <div
                  style={{
                    fontSize: "0.82rem",
                    color: "var(--outline)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {replyTo.text}
                </div>
              </div>
              <button className="btn-icon" onClick={() => setReplyTo(null)}>
                <X size={16} />
              </button>
            </div>
          )}

          {/* Attachment / Emoji buttons */}
          <div className={styles.inputActionBtns}>
            <button
              type="button"
              aria-label="Emoji"
              className={styles.inputIconBtn}
              title="رموز تعبيرية"
            >
              <span className="material-symbols-outlined" style={{ fontSize: "22px" }}>
                mood
              </span>
            </button>

            <div style={{ position: "relative" }}>
              <button
                type="button"
                aria-label="Attach file"
                className={styles.inputIconBtn}
                onClick={(e) => {
                  e.stopPropagation();
                  setShowAttach(!showAttach);
                }}
                title="إرفاق صورة مشفرة"
              >
                <span className="material-symbols-outlined" style={{ fontSize: "22px" }}>
                  attach_file
                </span>
              </button>

              {showAttach && (
                <div
                  className={styles.attachMenu}
                  onClick={(e) => e.stopPropagation()}
                >
                  <label className={styles.attachItem} style={{ cursor: "pointer" }}>
                    <div
                      className={styles.attachItemIcon}
                      style={{ background: "var(--primary-container)" }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>
                        image
                      </span>
                    </div>
                    <span className={styles.attachItemLabel}>
                      {uploading ? "جاري التشفير..." : "صورة (مشفرة Base64)"}
                    </span>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      style={{ display: "none" }}
                      onChange={handleImageUpload}
                      disabled={uploading}
                    />
                  </label>
                </div>
              )}
            </div>
          </div>

          {/* Main Text Box */}
          <div className={styles.inputTextBox}>
            <textarea
              ref={textareaRef}
              placeholder="اكتب رسالة..."
              value={inputText}
              onChange={handleTextareaChange}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              rows={1}
              className={styles.inputTextarea}
            />
          </div>

          {/* Mic / Send Button */}
          <button
            type="button"
            aria-label={inputText.trim() ? "إرسال" : "تسجيل صوتي"}
            className={`${styles.inputSendBtn} ${
              inputText.trim() ? styles.inputSendBtnActive : ""
            }`}
            onClick={inputText.trim() ? handleSend : undefined}
            title={inputText.trim() ? "إرسال" : "تسجيل صوتي"}
          >
            <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>
              {inputText.trim() ? "send" : "mic"}
            </span>
          </button>
        </div>
      )}

      {/* User Profile Modal */}
      <UserProfileModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        user={{
          uid: otherUid || "",
          displayName: otherName,
          userCode: otherUserData?.userCode || (otherUid ? otherUid.substring(0, 6) : ""),
          bio: otherUserData?.bio || "",
          isOnline: otherOnline,
          lastSeen: otherLastSeen,
        }}
        isBlocked={isBlocked}
        onToggleBlock={handleToggleBlock}
        isSupport={isSupport}
      />

      {/* Clear Chat Confirmation Modal */}
      {showClearConfirm && (
        <div
          className="modal-backdrop"
          onClick={() => setShowClearConfirm(null)}
          style={{ zIndex: 120 }}
        >
          <div
            className="modal-card"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 440, padding: "24px" }}
          >
            <div className="modal-header" style={{ marginBottom: 12 }}>
              <h3
                style={{
                  color: showClearConfirm === "everyone" ? "#ef4444" : "var(--on-surface)",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  fontSize: "1.15rem",
                  margin: 0,
                }}
              >
                <span
                  className="material-symbols-outlined"
                  style={{
                    color: showClearConfirm === "everyone" ? "#ef4444" : "var(--primary)",
                    fontSize: "24px",
                  }}
                >
                  {showClearConfirm === "everyone" ? "delete_sweep" : "mop"}
                </span>
                {showClearConfirm === "everyone"
                  ? "مسح المحادثة لدى الجميع 🗑️"
                  : "مسح المحادثة لدي فقط 🧹"}
              </h3>
            </div>
            <div className="modal-body" style={{ margin: "14px 0" }}>
              <p
                style={{
                  lineHeight: 1.6,
                  color: "var(--on-surface-variant)",
                  fontSize: "0.92rem",
                  margin: 0,
                }}
              >
                {showClearConfirm === "everyone"
                  ? "هل أنت متأكد من مسح جميع رسائل هذه المحادثة لدى جميع الأطراف؟ سيتم حذف كافة الرسائل نهائياً لجميع المشاركين ولا يمكن استرجاعها!"
                  : "هل تريد مسح جميع الرسائل الحالية من حسابك وجهازك فقط؟ لن يتم حذف رسائل الطرف الآخر."}
              </p>
            </div>
            <div
              className="modal-footer"
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 10,
                marginTop: 20,
              }}
            >
              <button
                type="button"
                className="btn btn-secondary"
                style={{ padding: "8px 16px", borderRadius: "8px" }}
                onClick={() => setShowClearConfirm(null)}
              >
                إلغاء
              </button>
              <button
                type="button"
                className="btn"
                style={{
                  padding: "8px 18px",
                  borderRadius: "8px",
                  background: showClearConfirm === "everyone" ? "#ef4444" : "var(--primary)",
                  color: "#ffffff",
                  fontWeight: 600,
                  border: "none",
                  cursor: "pointer",
                }}
                onClick={() => handleClearChat(showClearConfirm === "everyone")}
              >
                {showClearConfirm === "everyone"
                  ? "مسح لدى الجميع الآن"
                  : "مسح لدي الآن"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
