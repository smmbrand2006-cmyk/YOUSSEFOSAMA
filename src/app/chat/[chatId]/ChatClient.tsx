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
    <div className={`${styles.chatMain} ${styles.chatMainActive}`}>
      <div className={styles.chatMainPattern} />

      {/* Header */}
      <div className={styles.chatHeader}>
        <div
          className={styles.chatHeaderLeft}
          onClick={() => setShowProfileModal(true)}
          style={{ cursor: "pointer" }}
          title="عرض الملف التعريفي"
        >
          <button
            className={`btn-icon ${styles.mobileBackBtn}`}
            onClick={(e) => {
              e.stopPropagation();
              setActiveChat(null);
            }}
            title="رجوع"
          >
            <ArrowLeft size={22} />
          </button>

          <div
            className="avatar"
            style={{
              background: "var(--primary-gradient)",
              color: "white",
              fontWeight: 700,
            }}
          >
            {getInitials(otherName)}
            {otherOnline && <span className="online-dot" />}
          </div>

          <div className={styles.chatHeaderInfo}>
            <div className={styles.chatHeaderName}>
              {otherName} {isBlocked && <span style={{ color: "#ef4444", fontSize: "0.8rem", marginRight: 4 }}>(محظور 🚫)</span>}
            </div>
            <div
              className={`${styles.chatHeaderStatus} ${
                otherOnline || typingUsers.length > 0
                  ? styles.chatHeaderStatusOnline
                  : ""
              }`}
            >
              {getStatusText()}
            </div>
          </div>
        </div>

        <div className={styles.chatHeaderRight}>
          <button
            className="btn-icon"
            title="مكالمة صوتية"
            onClick={() => handleStartCall("audio")}
          >
            <Phone size={20} color="var(--text-secondary)" />
          </button>
          <button
            className="btn-icon"
            title="مكالمة فيديو"
            onClick={() => handleStartCall("video")}
          >
            <Video size={20} color="var(--text-secondary)" />
          </button>
          <button
            className="btn-icon"
            title="الملف التعريفي والخيارات"
            onClick={() => setShowProfileModal(true)}
          >
            <MoreVertical size={20} color="var(--text-secondary)" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className={styles.messagesArea}>
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
              <div key={msg.id} className={styles.messageBubbleSystem}>
                {msg.text}
              </div>
            );
          }

          return (
            <div
              key={msg.id}
              className={`${styles.messageRow} ${
                isOutgoing ? styles.messageRowOutgoing : styles.messageRowIncoming
              }`}
              onContextMenu={(e) => {
                e.preventDefault();
                setContextMenu({ x: e.clientX, y: e.clientY, message: msg });
              }}
            >
              <div
                className={`${styles.messageBubble} ${
                  isOutgoing
                    ? styles.messageBubbleOutgoing
                    : styles.messageBubbleIncoming
                }`}
              >
                {/* Reply preview */}
                {msg.replyTo && (
                  <div className={styles.replyPreview}>
                    <div className={styles.replyPreviewContent}>
                      <div className={styles.replyPreviewName}>
                        {msg.replyTo.senderName}
                      </div>
                      <div className={styles.replyPreviewText}>
                        {msg.replyTo.text}
                      </div>
                    </div>
                  </div>
                )}

                {/* Message content */}
                {msg.isDeleted ? (
                  <span className={styles.messageDeleted}>
                    🚫 تم حذف هذه الرسالة
                  </span>
                ) : (
                  <>
                    {/* Encoded Base64 Image */}
                    {msg.type === "image" && msg.mediaCode && (
                      <div className={styles.messageMedia}>
                        <img
                          src={msg.mediaCode}
                          alt="Encoded Media"
                          style={{
                            maxWidth: "100%",
                            maxHeight: 300,
                            borderRadius: 8,
                            display: "block",
                            objectFit: "cover",
                          }}
                        />
                      </div>
                    )}

                    {msg.text && (msg.type !== "image" || !msg.mediaCode) && (
                      <span className={styles.messageText}>{msg.text}</span>
                    )}
                  </>
                )}

                {/* Reactions */}
                {msg.reactions &&
                  Object.keys(msg.reactions).length > 0 && (
                    <div className={styles.messageReactions}>
                      {Object.entries(msg.reactions).map(([emoji, uids]) => (
                        <span
                          key={emoji}
                          className={styles.reactionChip}
                          onClick={() => handleReaction(msg, emoji)}
                        >
                          {emoji}
                          <span className={styles.reactionCount}>
                            {(uids as string[]).length}
                          </span>
                        </span>
                      ))}
                    </div>
                  )}

                {/* Footer */}
                <div className={styles.messageFooter}>
                  {msg.isEdited && (
                    <span className={styles.messageEdited}>تم التعديل</span>
                  )}
                  <span className={styles.messageTime}>
                    {formatMessageTime(msg.createdAt)}
                  </span>
                  {isOutgoing && !msg.isDeleted && (
                    <span
                      className={`${styles.messageStatus} ${
                        styles.messageStatusRead
                      }`}
                    >
                      <CheckCheck size={14} />
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* Typing indicator */}
        {typingUsers.length > 0 && (
          <div className={styles.messageRow + " " + styles.messageRowIncoming}>
            <div className={styles.typingIndicator}>
              <div className={styles.typingDot} />
              <div className={styles.typingDot} />
              <div className={styles.typingDot} />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <div
          className={styles.contextMenu}
          style={{
            left: contextMenu.x,
            top: contextMenu.y,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            className={styles.contextMenuItem}
            onClick={() => handleReply(contextMenu.message)}
          >
            <Reply size={16} /> الرد
          </div>
          <div
            className={styles.contextMenuItem}
            onClick={() => handleCopy(contextMenu.message)}
          >
            <Copy size={16} /> نسخ النص
          </div>
          {/* Quick reactions */}
          <div
            style={{
              display: "flex",
              gap: 4,
              padding: "6px 16px",
              borderTop: "1px solid var(--divider)",
              borderBottom: "1px solid var(--divider)",
            }}
          >
            {["❤️", "😂", "👍", "😮", "😢", "🙏"].map((emoji) => (
              <button
                key={emoji}
                style={{
                  fontSize: "1.2rem",
                  padding: "4px 6px",
                  borderRadius: 8,
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

      {/* Input Area or Blocked Banner */}
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
        <div className={styles.inputArea}>
          {/* Reply preview */}
          {replyTo && (
            <div
              style={{
                position: "absolute",
                bottom: "100%",
                left: 0,
                right: 0,
                padding: "8px 16px",
                background: "var(--bg-primary)",
                borderTop: "1px solid var(--divider)",
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
                <div
                  style={{
                    fontSize: "0.78rem",
                    fontWeight: 600,
                    color: "var(--primary)",
                  }}
                >
                  {replyTo.senderName}
                </div>
                <div
                  style={{
                    fontSize: "0.82rem",
                    color: "var(--text-secondary)",
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

          <div style={{ position: "relative" }}>
            <button
              className="btn-icon"
              title="إرفاق صورة مشفرة"
              onClick={(e) => {
                e.stopPropagation();
                setShowAttach(!showAttach);
              }}
            >
              <Paperclip size={20} color="var(--text-secondary)" />
            </button>

            {showAttach && (
              <div
                className={styles.attachMenu}
                onClick={(e) => e.stopPropagation()}
              >
                <label className={styles.attachItem} style={{ cursor: "pointer" }}>
                  <div
                    className={styles.attachItemIcon}
                    style={{ background: "#7C4DFF" }}
                  >
                    <ImageIcon size={22} />
                  </div>
                  <span className={styles.attachItemLabel}>
                    {uploading ? "جاري التشفير..." : "صورة (كود مشفر)"}
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

          <div className={styles.inputBox}>
            <textarea
              ref={textareaRef}
              placeholder="اكتب رسالتك هنا..."
              value={inputText}
              onChange={handleTextareaChange}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              rows={1}
            />
          </div>

          <button
            className={styles.sendBtn}
            onClick={handleSend}
            disabled={!inputText.trim()}
            title="إرسال"
          >
            <Send size={20} />
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
    </div>
  );
}
