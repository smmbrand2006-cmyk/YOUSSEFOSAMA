"use client";

import React, { useState } from "react";
import { UserProfile } from "@/lib/types/user";
import { X, Plus, Image as ImageIcon, Send, Clock, Sparkles } from "lucide-react";

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

interface StatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile | null;
}

const BG_COLORS = [
  "#005c4b", // WhatsApp Green
  "#1e3a8a", // Dark Blue
  "#701a75", // Purple
  "#831843", // Pink
  "#78350f", // Warm Amber
  "#18181b", // Sleek Dark
];

export default function StatusModal({
  isOpen,
  onClose,
  currentUser,
}: StatusModalProps) {
  const [statuses, setStatuses] = useState<StatusItem[]>([
    {
      id: "support_status",
      userName: "الدعم الفني الرسمي (#123)",
      userCode: "123",
      isMine: false,
      type: "text",
      content: "🟢 خدمة الدعم الفني متواجدة على مدار الساعة للرد على استفساراتكم فوراً!",
      bgColor: "#005c4b",
      timestamp: Date.now() - 1000 * 60 * 30,
    },
  ]);

  const [isCreating, setIsCreating] = useState(false);
  const [statusText, setStatusText] = useState("");
  const [selectedBg, setSelectedBg] = useState(BG_COLORS[0]);
  const [activeViewingStatus, setActiveViewingStatus] = useState<StatusItem | null>(null);

  if (!isOpen) return null;

  const handlePostStatus = () => {
    if (!statusText.trim() || !currentUser) return;

    const newStatus: StatusItem = {
      id: "status_" + Date.now(),
      userName: currentUser.displayName || currentUser.userCode || "أنا",
      userCode: currentUser.userCode || "",
      isMine: true,
      type: "text",
      content: statusText.trim(),
      bgColor: selectedBg,
      timestamp: Date.now(),
    };

    setStatuses((prev) => [newStatus, ...prev]);
    setStatusText("");
    setIsCreating(false);
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentUser) return;

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      const newStatus: StatusItem = {
        id: "status_" + Date.now(),
        userName: currentUser.displayName || currentUser.userCode || "أنا",
        userCode: currentUser.userCode || "",
        isMine: true,
        type: "image",
        content: base64,
        timestamp: Date.now(),
      };
      setStatuses((prev) => [newStatus, ...prev]);
      setIsCreating(false);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: 460,
          maxHeight: "86vh",
          display: "flex",
          flexDirection: "column",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Active Story Viewer Overlay */}
        {activeViewingStatus && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 100,
              background: activeViewingStatus.bgColor || "#0e0e0e",
              display: "flex",
              flexDirection: "column",
              padding: "16px",
              color: "#fff",
            }}
          >
            {/* Story Progress Bar */}
            <div
              style={{
                width: "100%",
                height: 3,
                background: "rgba(255,255,255,0.3)",
                borderRadius: 2,
                overflow: "hidden",
                marginBottom: 12,
              }}
            >
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  background: "var(--primary)",
                  animation: "storyTimer 6s linear forwards",
                }}
              />
            </div>

            {/* Top Bar */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: "50%",
                    background: "var(--primary)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 700,
                    color: "#000",
                  }}
                >
                  {activeViewingStatus.userName[0]}
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: "0.95rem" }}>{activeViewingStatus.userName}</div>
                  <div style={{ fontSize: "0.75rem", opacity: 0.8 }}>#{activeViewingStatus.userCode}</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveViewingStatus(null)}
                style={{ background: "none", border: "none", color: "#fff", cursor: "pointer" }}
              >
                <X size={24} />
              </button>
            </div>

            {/* Content Body */}
            <div
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                textAlign: "center",
                padding: "20px",
              }}
            >
              {activeViewingStatus.type === "text" ? (
                <p style={{ fontSize: "1.35rem", fontWeight: 600, lineHeight: 1.6, maxWidth: 360 }}>
                  {activeViewingStatus.content}
                </p>
              ) : (
                <img
                  src={activeViewingStatus.content}
                  alt="Status"
                  style={{ maxWidth: "100%", maxHeight: "70vh", objectFit: "contain", borderRadius: 8 }}
                />
              )}
            </div>
          </div>
        )}

        {/* Modal Header */}
        <div className="modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span
              className="material-symbols-outlined"
              style={{ color: "var(--primary)", fontSize: "24px" }}
            >
              motion_photos_on
            </span>
            <h3 style={{ margin: 0, fontSize: "1.1rem" }}>الحالات (Status)</h3>
          </div>
          <button type="button" className="modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: "16px 20px", overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Creator View */}
          {isCreating ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div
                style={{
                  background: selectedBg,
                  borderRadius: 12,
                  padding: 20,
                  minHeight: 140,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <textarea
                  value={statusText}
                  onChange={(e) => setStatusText(e.target.value)}
                  placeholder="اكتب حالتك هنا..."
                  maxLength={200}
                  style={{
                    background: "transparent",
                    border: "none",
                    outline: "none",
                    color: "#fff",
                    fontSize: "1.15rem",
                    fontWeight: 600,
                    textAlign: "center",
                    width: "100%",
                    resize: "none",
                    fontFamily: "inherit",
                  }}
                  rows={3}
                />
              </div>

              {/* Color Picker */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: "0.82rem", color: "var(--outline)" }}>اختر لون الخلفية:</span>
                <div style={{ display: "flex", gap: 8 }}>
                  {BG_COLORS.map((c) => (
                    <div
                      key={c}
                      onClick={() => setSelectedBg(c)}
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: "50%",
                        background: c,
                        cursor: "pointer",
                        border: selectedBg === c ? "2px solid #fff" : "2px solid transparent",
                        boxShadow: selectedBg === c ? "0 0 6px var(--primary)" : "none",
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsCreating(false)}
                  style={{ flex: 1 }}
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handlePostStatus}
                  disabled={!statusText.trim()}
                  style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
                >
                  <Send size={16} /> نشر الحالة
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* My Status Section */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div
                    style={{
                      width: 50,
                      height: 50,
                      borderRadius: "50%",
                      background: "var(--surface-container-high)",
                      border: "2px dashed var(--primary)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "var(--primary)",
                      fontWeight: 700,
                      fontSize: "1.1rem",
                    }}
                  >
                    {(currentUser?.displayName || "أ")[0].toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: "0.95rem", color: "var(--on-surface)" }}>
                      حالتي
                    </div>
                    <div style={{ fontSize: "0.8rem", color: "var(--outline)" }}>
                      انقر لنشر حالة جديدة يراها أصدقاؤك
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", gap: 6 }}>
                  {/* Text Status Button */}
                  <button
                    type="button"
                    onClick={() => setIsCreating(true)}
                    title="نشر حالة نصية"
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: "50%",
                      background: "var(--surface-container-high)",
                      color: "var(--primary)",
                      border: "none",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                    }}
                  >
                    <Plus size={20} />
                  </button>

                  {/* Photo Status Button */}
                  <label
                    title="نشر صورة"
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: "50%",
                      background: "var(--surface-container-high)",
                      color: "var(--primary)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                    }}
                  >
                    <ImageIcon size={18} />
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      style={{ display: "none" }}
                    />
                  </label>
                </div>
              </div>

              <div className="dropdown-divider" style={{ margin: "4px 0" }} />

              {/* Recent Statuses List */}
              <div>
                <span style={{ fontSize: "0.8rem", color: "var(--primary)", fontWeight: 600, display: "block", marginBottom: 10 }}>
                  التحديثات الأخيرة ({statuses.length})
                </span>

                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {statuses.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => setActiveViewingStatus(item)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        padding: "8px 10px",
                        borderRadius: 10,
                        background: "var(--surface-container)",
                        cursor: "pointer",
                        transition: "background 0.15s",
                      }}
                    >
                      <div
                        style={{
                          width: 46,
                          height: 46,
                          borderRadius: "50%",
                          border: "2.5px solid var(--primary)",
                          padding: 2,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          background: item.bgColor || "var(--surface-container-high)",
                          color: "#fff",
                          fontWeight: 700,
                          flexShrink: 0,
                        }}
                      >
                        {item.userName[0]}
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                          <span style={{ fontWeight: 600, fontSize: "0.9rem", color: "var(--on-surface)" }}>
                            {item.userName}
                          </span>
                          <span style={{ fontSize: "0.72rem", color: "var(--outline)" }}>
                            منذ قليل
                          </span>
                        </div>
                        <div style={{ fontSize: "0.8rem", color: "var(--outline)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginTop: 2 }}>
                          {item.type === "text" ? item.content : "📷 صورة جديدة"}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
