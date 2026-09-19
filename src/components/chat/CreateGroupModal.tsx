"use client";

import React, { useState, useEffect } from "react";
import { UserProfile } from "@/lib/types/user";
import { searchUsers, createGroupChat } from "@/lib/firebase/firestore";
import { Users, X, Check, Search, Loader2 } from "lucide-react";
import styles from "@/styles/chat.module.css";

interface CreateGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  onGroupCreated: (chatId: string) => void;
  existingContacts?: UserProfile[];
}

export default function CreateGroupModal({
  isOpen,
  onClose,
  currentUser,
  onGroupCreated,
  existingContacts = [],
}: CreateGroupModalProps) {
  const [groupName, setGroupName] = useState("");
  const [groupBio, setGroupBio] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<Map<string, UserProfile>>(new Map());
  const [creating, setCreating] = useState(false);

  // Reset on open/close
  useEffect(() => {
    if (isOpen) {
      setGroupName("");
      setGroupBio("");
      setSearchQuery("");
      setSearchResults([]);
      setSelectedUsers(new Map());
    }
  }, [isOpen]);

  // Live search
  useEffect(() => {
    const term = searchQuery.trim();
    if (!term) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await searchUsers(term);
        setSearchResults(res.filter((u) => u.uid !== currentUser.uid));
      } catch (e) {
        console.error("Search failed in modal:", e);
      } finally {
        setSearching(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery, currentUser.uid]);

  if (!isOpen) return null;

  const toggleUser = (user: UserProfile) => {
    setSelectedUsers((prev) => {
      const next = new Map(prev);
      if (next.has(user.uid)) {
        next.delete(user.uid);
      } else {
        next.set(user.uid, user);
      }
      return next;
    });
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      alert("يرجى إدخال اسم المجموعة أولاً");
      return;
    }
    if (selectedUsers.size === 0) {
      alert("يرجى اختيار عضو واحد على الأقل للمجموعة");
      return;
    }

    setCreating(true);
    try {
      const participantUids = Array.from(selectedUsers.keys());
      const newChatId = await createGroupChat(
        currentUser,
        groupName.trim(),
        participantUids,
        groupBio.trim()
      );
      onGroupCreated(newChatId);
      onClose();
    } catch (err: any) {
      alert("فشل إنشاء المجموعة: " + (err.message || "حاول مرة أخرى"));
    } finally {
      setCreating(false);
    }
  };

  const displayList =
    searchQuery.trim()
      ? searchResults
      : existingContacts.filter((u) => u.uid !== currentUser.uid);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 480, maxHeight: "88vh", display: "flex", flexDirection: "column" }}
      >
        {/* Header */}
        <div className="modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: "50%",
                background: "rgba(0, 168, 132, 0.2)",
                color: "var(--primary)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Users size={20} />
            </div>
            <h3 style={{ margin: 0, fontSize: "1.1rem" }}>إنشاء مجموعة جديدة</h3>
          </div>
          <button
            type="button"
            className="modal-close"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 14, overflowY: "auto", flex: 1 }}>
          {/* Group Name */}
          <div>
            <label style={{ display: "block", fontSize: "0.84rem", fontWeight: 600, color: "var(--on-surface)", marginBottom: 6 }}>
              اسم المجموعة <span style={{ color: "var(--primary)" }}>*</span>
            </label>
            <input
              type="text"
              className="input-field"
              placeholder="مثال: فريق العمل، الأصدقاء، العائلة..."
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              maxLength={40}
              style={{ width: "100%" }}
            />
          </div>

          {/* Group Description */}
          <div>
            <label style={{ display: "block", fontSize: "0.84rem", fontWeight: 600, color: "var(--on-surface)", marginBottom: 6 }}>
              وصف المجموعة (اختياري)
            </label>
            <input
              type="text"
              className="input-field"
              placeholder="نبذة عن هدف المجموعة..."
              value={groupBio}
              onChange={(e) => setGroupBio(e.target.value)}
              maxLength={120}
              style={{ width: "100%" }}
            />
          </div>

          {/* Selected Members Badges */}
          {selectedUsers.size > 0 && (
            <div>
              <span style={{ fontSize: "0.8rem", color: "var(--primary)", fontWeight: 600 }}>
                الأعضاء المختارين ({selectedUsers.size}):
              </span>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
                {Array.from(selectedUsers.values()).map((user) => (
                  <div
                    key={user.uid}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      background: "var(--surface-container-high)",
                      border: "1px solid var(--primary)",
                      borderRadius: 9999,
                      padding: "4px 10px",
                      fontSize: "0.8rem",
                      color: "var(--on-surface)",
                    }}
                  >
                    <span>{user.displayName || user.userCode}</span>
                    <button
                      type="button"
                      onClick={() => toggleUser(user)}
                      style={{ background: "none", border: "none", color: "var(--outline)", cursor: "pointer", display: "flex", padding: 0 }}
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Search Members */}
          <div>
            <label style={{ display: "block", fontSize: "0.84rem", fontWeight: 600, color: "var(--on-surface)", marginBottom: 6 }}>
              إضافة أعضاء (بالاسم أو الكود #)
            </label>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                background: "var(--surface-container-high)",
                borderRadius: 8,
                padding: "8px 12px",
                border: "1px solid var(--on-secondary)",
              }}
            >
              <Search size={18} style={{ color: "var(--outline)" }} />
              <input
                type="text"
                placeholder="ابحث بالاسم أو بكود المستخدم (مثال: #123456)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  color: "var(--on-surface)",
                  fontSize: "0.88rem",
                  width: "100%",
                }}
              />
              {searching && <Loader2 size={16} className="loading-spinner" style={{ width: 16, height: 16, borderTopColor: "var(--primary)" }} />}
            </div>
          </div>

          {/* User Candidates List */}
          <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 220, overflowY: "auto" }}>
            {displayList.length === 0 ? (
              <div style={{ textAlign: "center", padding: "16px 0", color: "var(--outline)", fontSize: "0.84rem" }}>
                {searchQuery.trim() ? "لم يتم العثور على مستخدمين بهذا الاسم أو الكود" : "ابحث عن أي شخص بكوده لإضافته للمجموعة"}
              </div>
            ) : (
              displayList.map((u) => {
                const isSelected = selectedUsers.has(u.uid);
                return (
                  <div
                    key={u.uid}
                    onClick={() => toggleUser(u)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "8px 12px",
                      borderRadius: 8,
                      background: isSelected ? "rgba(0, 168, 132, 0.15)" : "var(--surface-container)",
                      border: isSelected ? "1px solid var(--primary)" : "1px solid transparent",
                      cursor: "pointer",
                      transition: "all 0.15s",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: "50%",
                          background: "var(--surface-container-highest)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontWeight: 700,
                          fontSize: "0.85rem",
                          color: "var(--on-surface)",
                        }}
                      >
                        {(u.displayName || u.userCode || "?")[0].toUpperCase()}
                      </div>
                      <div style={{ display: "flex", flexDirection: "column" }}>
                        <span style={{ fontSize: "0.88rem", fontWeight: 600, color: "var(--on-surface)" }}>
                          {u.displayName || "مستخدم"}
                        </span>
                        <span style={{ fontSize: "0.75rem", color: "var(--primary)" }}>
                          #{u.userCode}
                        </span>
                      </div>
                    </div>

                    <div
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: 6,
                        border: isSelected ? "none" : "2px solid var(--outline)",
                        background: isSelected ? "var(--primary-container)" : "transparent",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "var(--on-primary-container)",
                      }}
                    >
                      {isSelected && <Check size={16} strokeWidth={3} />}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="modal-footer">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
            disabled={creating}
          >
            إلغاء
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleCreateGroup}
            disabled={creating || !groupName.trim() || selectedUsers.size === 0}
            style={{ display: "flex", alignItems: "center", gap: 6 }}
          >
            {creating ? "جاري إنشاء المجموعة..." : `إنشاء المجموعة (${selectedUsers.size})`}
          </button>
        </div>
      </div>
    </div>
  );
}
