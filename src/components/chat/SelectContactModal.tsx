"use client";

import React, { useState, useEffect } from "react";
import { UserProfile } from "@/lib/types/user";
import {
  getDocs,
  collection,
  query,
  limit,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { getOrCreateDirectChat, getChatDoc } from "@/lib/firebase/firestore";
import { useChats } from "@/lib/contexts/ChatContext";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Search,
  MoreVertical,
  UserPlus,
  Users,
  QrCode,
  Globe,
  X,
  Loader2,
} from "lucide-react";

interface SelectContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile | null;
  onOpenCreateGroup: () => void;
}

export default function SelectContactModal({
  isOpen,
  onClose,
  currentUser,
  onOpenCreateGroup,
}: SelectContactModalProps) {
  const router = useRouter();
  const { setActiveChat } = useChats();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [showAddContactInput, setShowAddContactInput] = useState(false);
  const [newContactCode, setNewContactCode] = useState("");
  const [openingChat, setOpeningChat] = useState<string | null>(null);

  // Fetch users only when searching or fetching contacts
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    const cleanQ = searchQuery.trim().replace(/^#/, "");

    // If no search query, only load contacts user already has
    if (!cleanQ) {
      if (currentUser?.contacts && currentUser.contacts.length > 0) {
        setLoading(true);
        const fetchExistingContacts = async () => {
          try {
            const list: UserProfile[] = [];
            for (const cUid of (currentUser.contacts || []).slice(0, 50)) {
              const uDoc = await getDocs(query(collection(db, "users"), where("uid", "==", cUid), limit(1)));
              if (!uDoc.empty) {
                list.push(uDoc.docs[0].data() as UserProfile);
              }
            }
            if (isMounted) setUsers(list);
          } catch (err) {
            console.error("Failed to fetch user contacts:", err);
          } finally {
            if (isMounted) setLoading(false);
          }
        };
        fetchExistingContacts();
      } else {
        setUsers([]);
        setLoading(false);
      }
      return;
    }

    // Active search: search by exact userCode or displayName
    setLoading(true);
    const searchTarget = async () => {
      try {
        const results: UserProfile[] = [];
        
        // 1. Search by userCode
        const codeQ = query(
          collection(db, "users"),
          where("userCode", "==", cleanQ),
          limit(5)
        );
        const codeSnap = await getDocs(codeQ);
        codeSnap.forEach((d) => {
          const u = d.data() as UserProfile;
          if (u.uid !== currentUser?.uid) results.push(u);
        });

        // 2. Search by displayName if fewer than 5 results
        if (results.length === 0) {
          const nameQ = query(
            collection(db, "users"),
            where("displayName", ">=", cleanQ),
            where("displayName", "<=", cleanQ + "\uf8ff"),
            limit(10)
          );
          const nameSnap = await getDocs(nameQ);
          nameSnap.forEach((d) => {
            const u = d.data() as UserProfile;
            if (u.uid !== currentUser?.uid && !results.some((r) => r.uid === u.uid)) {
              results.push(u);
            }
          });
        }

        if (isMounted) setUsers(results);
      } catch (err) {
        console.error("Failed to search user:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    const debounceTimer = setTimeout(searchTarget, 250);
    return () => {
      isMounted = false;
      clearTimeout(debounceTimer);
    };
  }, [isOpen, searchQuery, currentUser?.uid, currentUser?.contacts]);

  if (!isOpen) return null;

  // Filter contacts (exclude self)
  const filteredContacts = users.filter((u) => u.uid !== currentUser?.uid);

  const handleSelectUser = async (targetUser: UserProfile) => {
    if (!currentUser) return;
    setOpeningChat(targetUser.uid);
    try {
      const chatId = await getOrCreateDirectChat(currentUser, targetUser);
      const chatDoc = await getChatDoc(chatId);
      if (chatDoc) {
        setActiveChat(chatDoc);
      } else {
        setActiveChat({
          id: chatId,
          type: "direct",
          participants: [currentUser.uid, targetUser.uid],
          participantNames: {
            [currentUser.uid]: currentUser.displayName || currentUser.userCode,
            [targetUser.uid]: targetUser.displayName || targetUser.userCode,
          },
        } as any);
      }
      onClose();
      router.push("/chat");
    } catch (err) {
      console.error("Failed to open chat with user:", err);
      alert("تعذر فتح المحادثة، يرجى المحاولة مرة أخرى.");
    } finally {
      setOpeningChat(null);
    }
  };

  const handleSelfChat = async () => {
    if (!currentUser) return;
    setOpeningChat(currentUser.uid);
    try {
      const chatId = await getOrCreateDirectChat(currentUser, currentUser);
      const chatDoc = await getChatDoc(chatId);
      if (chatDoc) {
        setActiveChat(chatDoc);
      } else {
        setActiveChat({
          id: chatId,
          type: "direct",
          participants: [currentUser.uid, currentUser.uid],
          participantNames: {
            [currentUser.uid]: currentUser.displayName || currentUser.userCode,
          },
        } as any);
      }
      onClose();
      router.push("/chat");
    } catch (err) {
      console.error("Failed to open self chat:", err);
      alert("تعذر فتح الملاحظات، يرجى المحاولة مرة أخرى.");
    } finally {
      setOpeningChat(null);
    }
  };

  const handleAddByCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContactCode.trim() || !currentUser) return;
    const code = newContactCode.trim().replace(/^#/, "");
    const found = users.find(
      (u) => u.userCode?.toLowerCase() === code.toLowerCase()
    );
    if (found) {
      handleSelectUser(found);
    } else {
      alert(`لم يتم العثور على مستخدم بالرمز: #${code}`);
    }
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
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        background: "rgba(0, 0, 0, 0.6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        animation: "fadeIn 0.2s ease",
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "460px",
          height: "92vh",
          maxHeight: "820px",
          background: "#0c1317",
          borderRadius: "16px",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.8)",
          border: "1px solid rgba(255, 255, 255, 0.08)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header - WhatsApp Styled */}
        <div
          style={{
            height: "64px",
            background: "#111b21",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 16px",
            borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: "none",
                border: "none",
                color: "#aebac1",
                cursor: "pointer",
                padding: "8px",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
              title="رجوع"
            >
              <ArrowLeft size={22} />
            </button>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span
                style={{
                  color: "#e9edef",
                  fontSize: "1.05rem",
                  fontWeight: "600",
                  fontFamily: "inherit",
                }}
              >
                Select contact
              </span>
              <span
                style={{
                  color: "#8696a0",
                  fontSize: "0.8rem",
                }}
              >
                {filteredContacts.length} جهات اتصال
              </span>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
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
              <Search size={20} />
            </button>
            <button
              type="button"
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
              <MoreVertical size={20} />
            </button>
          </div>
        </div>

        {/* Live Search Input Bar */}
        {showSearch && (
          <div
            style={{
              padding: "10px 16px",
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
              placeholder="البحث بالاسم أو الرمز..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
              style={{
                flex: 1,
                background: "transparent",
                border: "none",
                outline: "none",
                color: "#e9edef",
                fontSize: "0.92rem",
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

        {/* Add Contact Modal / Prompt */}
        {showAddContactInput && (
          <form
            onSubmit={handleAddByCode}
            style={{
              padding: "14px 16px",
              background: "#182229",
              borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
              display: "flex",
              gap: "10px",
              alignItems: "center",
            }}
          >
            <input
              type="text"
              placeholder="اكتب رمز المستخدم (مثال: #12345)"
              value={newContactCode}
              onChange={(e) => setNewContactCode(e.target.value)}
              autoFocus
              style={{
                flex: 1,
                padding: "8px 12px",
                borderRadius: "8px",
                background: "#111b21",
                border: "1px solid rgba(255, 255, 255, 0.12)",
                color: "#fff",
                fontSize: "0.9rem",
              }}
            />
            <button
              type="submit"
              style={{
                padding: "8px 16px",
                background: "#00a884",
                color: "#fff",
                border: "none",
                borderRadius: "8px",
                fontWeight: "600",
                fontSize: "0.85rem",
                cursor: "pointer",
              }}
            >
              بدء الدردشة
            </button>
            <button
              type="button"
              onClick={() => setShowAddContactInput(false)}
              style={{
                background: "none",
                border: "none",
                color: "#8696a0",
                cursor: "pointer",
              }}
            >
              <X size={20} />
            </button>
          </form>
        )}

        {/* Scrollable Body */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "8px 0",
          }}
        >
          {/* Action Row 1: New group */}
          <div
            onClick={() => {
              onClose();
              onOpenCreateGroup();
            }}
            style={{
              display: "flex",
              alignItems: "center",
              padding: "12px 18px",
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
                width: "44px",
                height: "44px",
                borderRadius: "50%",
                background: "#00a884",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#111b21",
                flexShrink: 0,
              }}
            >
              <Users size={22} strokeWidth={2.5} />
            </div>
            <span
              style={{
                color: "#e9edef",
                fontSize: "0.98rem",
                fontWeight: "500",
              }}
            >
              New group
            </span>
          </div>

          {/* Action Row 2: New contact */}
          <div
            onClick={() => setShowAddContactInput(!showAddContactInput)}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "12px 18px",
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
                display: "flex",
                alignItems: "center",
                gap: "16px",
              }}
            >
              <div
                style={{
                  width: "44px",
                  height: "44px",
                  borderRadius: "50%",
                  background: "#00a884",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#111b21",
                  flexShrink: 0,
                }}
              >
                <UserPlus size={22} strokeWidth={2.5} />
              </div>
              <span
                style={{
                  color: "#e9edef",
                  fontSize: "0.98rem",
                  fontWeight: "500",
                }}
              >
                New contact
              </span>
            </div>
            <QrCode size={20} color="#8696a0" />
          </div>

          {/* Section Header: Contacts on WhatsApp */}
          <div
            style={{
              padding: "18px 20px 8px 20px",
              fontSize: "0.85rem",
              fontWeight: "600",
              color: "#8696a0",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
            }}
          >
            Contacts on WhatsApp
          </div>

          {/* User Self Item: Jo (You) Message yourself */}
          {currentUser && (
            <div
              onClick={handleSelfChat}
              style={{
                display: "flex",
                alignItems: "center",
                padding: "10px 18px",
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
                  width: "44px",
                  height: "44px",
                  borderRadius: "50%",
                  background: "#222e35",
                  border: "1px solid rgba(255, 255, 255, 0.12)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#00a884",
                  fontWeight: "bold",
                  fontSize: "1rem",
                  flexShrink: 0,
                }}
              >
                {getInitials(currentUser.displayName)}
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "3px",
                  flex: 1,
                }}
              >
                <span
                  style={{
                    color: "#e9edef",
                    fontSize: "0.98rem",
                    fontWeight: "500",
                  }}
                >
                  {currentUser.displayName || "أنت"} (You)
                </span>
                <span
                  style={{
                    color: "#8696a0",
                    fontSize: "0.82rem",
                  }}
                >
                  Message yourself
                </span>
              </div>
            </div>
          )}

          {/* Contacts List */}
          {loading ? (
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                padding: "30px 0",
                color: "#00a884",
              }}
            >
              <Loader2 className="animate-spin" size={26} />
            </div>
          ) : filteredContacts.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "36px 24px",
                color: "#8696a0",
                fontSize: "0.92rem",
                lineHeight: "1.6",
              }}
            >
              {searchQuery
                ? `لا يوجد مستخدم يطابق البحث "${searchQuery}". تأكد من صحة كود المستخدم #`
                : "🔒 للحفاظ على الخصوصية، استخدم شريط البحث بالأعلى للبحث عن صديقك بكوده الخاص (#كود) أو اسمه وبدء المحادثة معه فوراً!"}
            </div>
          ) : (
            filteredContacts.map((user) => (
              <div
                key={user.uid}
                onClick={() => handleSelectUser(user)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: "10px 18px",
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
                    width: "44px",
                    height: "44px",
                    borderRadius: "50%",
                    background: "#222e35",
                    border: "1px solid rgba(255, 255, 255, 0.12)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#e9edef",
                    fontWeight: "bold",
                    fontSize: "0.95rem",
                    flexShrink: 0,
                  }}
                >
                  {getInitials(user.displayName)}
                </div>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "3px",
                    flex: 1,
                    minWidth: 0,
                  }}
                >
                  <span
                    style={{
                      color: "#e9edef",
                      fontSize: "0.98rem",
                      fontWeight: "500",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {user.displayName || `مستخدم #${user.userCode}`}
                  </span>
                  <span
                    style={{
                      color: "#8696a0",
                      fontSize: "0.82rem",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {user.bio || (user.userCode ? `#${user.userCode}` : "Hey there! I am using WhatsApp.")}
                  </span>
                </div>
                {openingChat === user.uid && (
                  <Loader2 className="animate-spin" size={18} color="#00a884" />
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
