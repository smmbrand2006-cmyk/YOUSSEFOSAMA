"use client";

import React from "react";
import { useBackContext } from "@/lib/contexts/BackHandlerContext";
import { Check, LogOut } from "lucide-react";
import Image from "next/image";
import styles from "@/styles/chat.module.css";

export default function ExitConfirmModal() {
  const { showExitModal, handleConfirmExit, handleCancelExit } = useBackContext();

  if (!showExitModal) return null;

  return (
    <div
      className={styles.exitModalOverlay}
      onClick={handleCancelExit}
      role="dialog"
      aria-modal="true"
    >
      <div
        className={styles.exitModalCard}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Animated App Logo Circle */}
        <div className={styles.exitModalIconCircle}>
          <Image
            src="/logo.png"
            alt="YOUSSEF APP Logo"
            width={48}
            height={48}
            className={styles.exitModalLogo}
            priority
          />
        </div>

        {/* Title & Description */}
        <h3 className={styles.exitModalTitle}>الخروج من التطبيق</h3>
        <p className={styles.exitModalDescription}>
          هل ترغب في مغادرة التطبيق الآن؟
          <br />
          يمكنك البقاء ومتابعة محادثاتك ومكالماتك فورياً في أي وقت.
        </p>

        {/* Action Buttons */}
        <div className={styles.exitModalActions}>
          <button
            type="button"
            className={styles.exitModalStayBtn}
            onClick={handleCancelExit}
          >
            <Check size={18} />
            لا، البقاء في التطبيق
          </button>

          <button
            type="button"
            className={styles.exitModalLeaveBtn}
            onClick={handleConfirmExit}
          >
            <LogOut size={16} />
            نعم، مغادرة التطبيق
          </button>
        </div>
      </div>
    </div>
  );
}
