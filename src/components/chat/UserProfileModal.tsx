"use client";

import React, { useState } from "react";
import {
  X,
  Copy,
  Check,
  Ban,
  ShieldCheck,
  Headphones,
  User as UserIcon,
  Clock,
} from "lucide-react";
import { formatLastSeen } from "@/lib/utils/formatDate";
import styles from "@/styles/chat.module.css";

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: {
    uid: string;
    displayName?: string;
    userCode?: string;
    bio?: string;
    isOnline?: boolean;
    lastSeen?: any;
  } | null;
  isBlocked: boolean;
  onToggleBlock: () => Promise<void>;
  isSupport?: boolean;
}

export default function UserProfileModal({
  isOpen,
  onClose,
  user,
  isBlocked,
  onToggleBlock,
  isSupport = false,
}: UserProfileModalProps) {
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!isOpen || !user) return null;

  const handleCopyCode = () => {
    if (user.userCode) {
      navigator.clipboard.writeText(user.userCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleBlockAction = async () => {
    if (isSupport) return;
    if (!isBlocked) {
      const confirmed = window.confirm(
        `هل أنت متأكد من حظر "${user.displayName || user.userCode}"؟ لن تتمكن من إرسال رسائل أو الاتصال به.`
      );
      if (!confirmed) return;
    }

    setLoading(true);
    try {
      await onToggleBlock();
    } catch (err: any) {
      alert("حدث خطأ أثناء تنفيذ الإجراء: " + (err.message || "حاول مرة أخرى"));
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (name?: string) => {
    if (!name || !name.trim()) return "#";
    return name
      .trim()
      .split(" ")
      .map((n) => n[0])
      .join("")
      .substring(0, 2)
      .toUpperCase();
  };

  const displayName = isSupport
    ? "الدعم الفني (123)"
    : user.displayName || user.userCode || "مستخدم";

  const getStatusText = () => {
    if (user.isOnline) return "متصل الآن 🟢";
    if (user.lastSeen) {
      const timeVal =
        typeof user.lastSeen?.toMillis === "function"
          ? user.lastSeen.toMillis()
          : typeof user.lastSeen === "number"
          ? user.lastSeen
          : null;
      if (timeVal) return `آخر ظهور ${formatLastSeen(timeVal)}`;
    }
    return "غير متصل";
  };

  return (
    <div className={styles.profileModalOverlay} onClick={onClose}>
      <div
        className={styles.profileModalCard}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with Close */}
        <div className={styles.profileModalHeader}>
          <h3>الملف التعريفي</h3>
          <button
            className="btn-icon"
            onClick={onClose}
            title="إغلاق"
            type="button"
          >
            <X size={20} />
          </button>
        </div>

        {/* Profile Avatar & Primary Info */}
        <div className={styles.profileModalBody}>
          <div className={styles.profileModalAvatarWrapper}>
            <div
              className={styles.profileModalAvatar}
              style={{
                background: isSupport
                  ? "linear-gradient(135deg, #128C7E, #25D366)"
                  : "var(--primary-gradient)",
              }}
            >
              {isSupport ? <Headphones size={44} /> : getInitials(displayName)}
            </div>
            {user.isOnline && <span className={styles.profileModalOnlineDot} />}
          </div>

          <h2 className={styles.profileModalName}>
            {displayName} {isSupport && "🎧"}
          </h2>

          {/* User Code with Copy Button */}
          {user.userCode && (
            <div className={styles.profileModalCodeBadge} onClick={handleCopyCode}>
              <span>#{user.userCode}</span>
              <button className={styles.profileCopyBtn} title="نسخ الكود">
                {copied ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
              </button>
              {copied && <span className={styles.profileCopiedToast}>تم النسخ!</span>}
            </div>
          )}

          {/* Status badge */}
          <div
            className={`${styles.profileStatusBadge} ${
              user.isOnline ? styles.profileStatusOnline : ""
            }`}
          >
            <Clock size={14} />
            <span>{getStatusText()}</span>
          </div>

          {/* Bio Section */}
          <div className={styles.profileSection}>
            <div className={styles.profileSectionLabel}>
              <UserIcon size={16} />
              <span>النبذة التعريفية</span>
            </div>
            <div className={styles.profileBioText}>
              {user.bio && user.bio.trim()
                ? user.bio
                : isSupport
                ? "الحساب الرسمي لخدمة عملاء يوسف شات، متاح للرد على استفساراتكم ومساعدتكم فوراً."
                : "لا توجد نبذة شخصية مسجلة بعد."}
            </div>
          </div>

          {/* Block / Unblock Action Button */}
          <div className={styles.profileActions}>
            {isSupport ? (
              <div className={styles.supportProtectedNotice}>
                <Headphones size={16} />
                <span>حساب الدعم الفني محمي ولا يمكن حظره.</span>
              </div>
            ) : isBlocked ? (
              <button
                className={styles.profileUnblockBtn}
                onClick={handleBlockAction}
                disabled={loading}
              >
                <ShieldCheck size={18} />
                <span>{loading ? "جاري التحديث..." : "إلغاء حظر المستخدم"}</span>
              </button>
            ) : (
              <button
                className={styles.profileBlockBtn}
                onClick={handleBlockAction}
                disabled={loading}
              >
                <Ban size={18} />
                <span>{loading ? "جاري التحديث..." : "حظر هذا المستخدم"}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
