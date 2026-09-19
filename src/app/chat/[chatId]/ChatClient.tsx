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
  Send,
  Paperclip,
  Image as ImageIcon,
  X,
  CheckCheck,
  Reply,
  Trash2,
  Copy,
  Ban,
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

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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

  // Close context menu on click outside
  useEffect(() => {
    const handleClick = () => {
      setContextMenu(null);
      setShowAttach(false);
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
      {/* Top Chat Header */}
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
            <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>
              videocam
            </span>
          </button>

          <button
            type="button"
            aria-label="Voice Call"
            className={styles.chatTopActionBtn}
            onClick={() => handleStartCall("audio")}
            title="مكالمة صوتية"
          >
            <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>
              call
            </span>
          </button>

          <div className={styles.chatTopDivider} />

          <button
            type="button"
            aria-label="Search"
            className={styles.chatTopActionBtn}
            title="بحث في المحادثة"
          >
            <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>
              search
            </span>
          </button>

          <button
            type="button"
            aria-label="More"
            className={styles.chatTopActionBtn}
            onClick={() => setShowProfileModal(true)}
            title="الخيارات والملف التعريفي"
          >
            <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>
              more_vert
            </span>
          </button>
        </div>
      </div>

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

        {/* Context Menu */}
        {contextMenu && (
          <div
            className={styles.contextMenu}
            style={{
              top: Math.min(contextMenu.y, window.innerHeight - 250),
              left: Math.min(contextMenu.x, window.innerWidth - 200),
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
                  }}
                  onClick={() => handleReaction(contextMenu.message, emoji)}
                >
                  {emoji}
                </button>
              ))}
            </div>
            {contextMenu.message.senderId === userProfile?.uid && (
              <div
                className={styles.contextMenuItem}
                onClick={() => handleDelete(contextMenu.message, true)}
              >
                <Trash2 size={16} /> الحذف لدى الجميع
              </div>
            )}
            <div
              className={`${styles.contextMenuItem} ${styles.contextMenuDanger}`}
              onClick={() => handleDelete(contextMenu.message, false)}
            >
              <Trash2 size={16} /> الحذف لدي فقط
            </div>
          </div>
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

          return (
            <div
              key={msg.id}
              className={isOutgoing ? styles.msgRowOutgoing : styles.msgRowIncoming}
              onContextMenu={(e) => {
                e.preventDefault();
                setContextMenu({ x: e.clientX, y: e.clientY, message: msg });
              }}
            >
              <div
                className={
                  isOutgoing
                    ? styles.msgBubbleOutgoing
                    : styles.msgBubbleIncoming
                }
              >
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
                      <span>{msg.text}</span>
                    )}
                  </>
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
    </section>
  );
}
