"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/contexts/AuthContext";
import { updateUserProfile, openOrCreateSupportChat } from "@/lib/firebase/firestore";
import { signOut } from "@/lib/firebase/auth";
import {
  ArrowLeft,
  User,
  Hash,
  Edit3,
  LogOut,
  Check,
  Shield,
  Copy,
  Headphones,
  Bell,
} from "lucide-react";
import { testSystemNotification } from "@/lib/utils/pwaNotifications";
import { useBackHandler } from "@/lib/contexts/BackHandlerContext";
import styles from "@/styles/auth.module.css";

export default function ProfilePage() {
  const router = useRouter();
  const { userProfile } = useAuth();
  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState(
    userProfile?.displayName || ""
  );
  const [bio, setBio] = useState(userProfile?.bio || "");
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [openingSupport, setOpeningSupport] = useState(false);

  // Back Navigation Handlers for Profile Page
  useBackHandler(editing, () => setEditing(false), "profile_editing", 15);
  useBackHandler(true, () => router.push("/chat"), "profile_page_to_chat", 5);

  if (!userProfile) return null;

  const handleSupportChat = async () => {
    if (!userProfile) return;
    setOpeningSupport(true);
    try {
      const chatId = await openOrCreateSupportChat(userProfile);
      router.push(`/chat/${chatId}`);
    } catch (err: any) {
      alert(err.message || "فشل فتح محادثة الدعم.");
    } finally {
      setOpeningSupport(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateUserProfile(userProfile.uid, {
        displayName: displayName.trim(),
        bio: bio.trim(),
      });
      setEditing(false);
    } catch (err) {
      console.error("Save failed:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(userProfile.userCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSignOut = async () => {
    await signOut();
    router.replace("/auth/login");
  };

  const getInitials = (name: string) => {
    if (!name.trim()) return "#";
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
        minHeight: "100vh",
        background: "var(--bg-secondary)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header */}
      <div
        style={{
          background: "var(--primary-gradient)",
          padding: "16px 20px",
          display: "flex",
          alignItems: "center",
          gap: 16,
          color: "white",
        }}
      >
        <button
          className="btn-icon"
          onClick={() => router.back()}
          style={{ color: "white" }}
        >
          <ArrowLeft size={22} />
        </button>
        <h2 style={{ fontSize: "1.1rem", fontWeight: 600 }}>الملف الشخصي</h2>
      </div>

      {/* Profile Section */}
      <div
        style={{
          background: "var(--bg-primary)",
          padding: "32px 20px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 16,
        }}
      >
        {/* Avatar with Initials */}
        <div
          style={{
            width: 100,
            height: 100,
            borderRadius: "50%",
            background: "var(--primary-gradient)",
            color: "white",
            fontSize: "2.2rem",
            fontWeight: 700,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "var(--shadow-md)",
          }}
        >
          {getInitials(userProfile.displayName || userProfile.userCode)}
        </div>

        {/* User Code Badge */}
        <div
          onClick={handleCopyCode}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 16px",
            background: "rgba(37, 211, 102, 0.1)",
            border: "1px dashed var(--primary)",
            borderRadius: "var(--radius-full)",
            cursor: "pointer",
            transition: "all 0.2s",
          }}
          title="انقر لنسخ الكود"
        >
          <Hash size={18} color="var(--primary)" />
          <span style={{ fontWeight: 700, color: "var(--primary)", fontSize: "1rem" }}>
            {userProfile.userCode}
          </span>
          {copied ? (
            <span style={{ fontSize: "0.75rem", color: "var(--primary)" }}>✓ تم النسخ!</span>
          ) : (
            <Copy size={14} color="var(--text-secondary)" />
          )}
        </div>

        {/* Name */}
        {editing ? (
          <div
            style={{
              width: "100%",
              maxWidth: 400,
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            <div className={styles.authInput}>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="الاسم المستعار"
                style={{ paddingLeft: 16 }}
              />
            </div>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="الحالة أو نبذة عنك"
              rows={3}
              style={{
                width: "100%",
                padding: "12px 16px",
                background: "var(--bg-secondary)",
                border: "2px solid transparent",
                borderRadius: "var(--radius-md)",
                fontSize: "0.95rem",
                resize: "none",
                fontFamily: "inherit",
              }}
            />
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button
                className="btn btn-secondary"
                onClick={() => setEditing(false)}
              >
                إلغاء
              </button>
              <button
                className="btn btn-primary"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? "حفظ..." : "حفظ التعديلات"}
              </button>
            </div>
          </div>
        ) : (
          <div style={{ textAlign: "center" }}>
            <div
              style={{
                fontSize: "1.3rem",
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                gap: 8,
                justifyContent: "center",
              }}
            >
              {userProfile.displayName}
              <button
                className="btn-icon"
                onClick={() => setEditing(true)}
                title="تعديل الاسم"
              >
                <Edit3 size={16} color="var(--text-secondary)" />
              </button>
            </div>
            {userProfile.bio ? (
              <p
                style={{
                  color: "var(--text-secondary)",
                  marginTop: 6,
                  fontSize: "0.9rem",
                }}
              >
                {userProfile.bio}
              </p>
            ) : (
              <p
                style={{
                  color: "var(--text-tertiary)",
                  marginTop: 6,
                  fontSize: "0.85rem",
                  fontStyle: "italic",
                }}
              >
                لا توجد حالة بعد
              </p>
            )}
          </div>
        )}
      </div>

      {/* Info Card */}
      <div
        style={{
          margin: "16px 20px",
          padding: "16px",
          background: "var(--bg-primary)",
          borderRadius: "var(--radius-lg)",
          boxShadow: "var(--shadow-sm)",
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Shield size={20} color="var(--primary)" />
          <div>
            <div style={{ fontWeight: 600, fontSize: "0.9rem" }}>
              نظام التعريف المشفر
            </div>
            <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
              أنت معرف فقط برقمك/كودك ({userProfile.userCode}) بدون تخزين أي صور سحابية
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div style={{ padding: "0 20px 30px", marginTop: "auto" }}>
        {/* زر تجربة الإشعار الفوري */}
        <button
          onClick={async () => {
            const success = await testSystemNotification();
            if (!success) {
              alert("يرجى تفعيل إذن الإشعارات من إعدادات المتصفح أولاً 🔒");
            }
          }}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            padding: "14px",
            background: "linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(79, 70, 229, 0.15))",
            color: "#818CF8",
            border: "1px solid rgba(99, 102, 241, 0.4)",
            borderRadius: "var(--radius-md)",
            cursor: "pointer",
            fontWeight: 700,
            fontSize: "0.95rem",
            marginBottom: 12,
            transition: "all 0.2s",
          }}
        >
          <Bell size={18} />
          تجربة إشعار فوري على هاتفك الآن 🔔
        </button>

        {/* زر الدعم الفني (#123) */}
        <button
          onClick={handleSupportChat}
          disabled={openingSupport}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            padding: "14px",
            background: "linear-gradient(135deg, rgba(37, 211, 102, 0.15), rgba(18, 140, 126, 0.1))",
            color: "#25D366",
            border: "1px solid rgba(37, 211, 102, 0.35)",
            borderRadius: "var(--radius-md)",
            cursor: "pointer",
            fontWeight: 700,
            fontSize: "0.95rem",
            marginBottom: 12,
            transition: "all 0.2s",
          }}
        >
          <Headphones size={20} />
          {openingSupport ? "جاري فتح المحادثة..." : "تواصل مع الدعم الفني (#123) 🎧"}
        </button>

        <button
          onClick={handleSignOut}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            padding: "14px",
            background: "rgba(239, 68, 68, 0.08)",
            color: "var(--error)",
            border: "1px solid rgba(239, 68, 68, 0.2)",
            borderRadius: "var(--radius-md)",
            cursor: "pointer",
            fontWeight: 600,
            fontSize: "0.95rem",
          }}
        >
          <LogOut size={18} />
          تسجيل الخروج
        </button>
      </div>
    </div>
  );
}
