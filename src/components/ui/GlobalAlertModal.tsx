"use client";

import React, { useState, useEffect } from "react";
import styles from "@/styles/alert.module.css";
import {
  DialogOptions,
  ToastItem,
  registerDialogListener,
  registerToastListener,
  showAppAlert,
} from "@/lib/utils/dialogs";
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Info,
  Check,
  X,
  Bell,
} from "lucide-react";

export default function GlobalAlertModal() {
  const [dialog, setDialog] = useState<DialogOptions | null>(null);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    // Intercept native window.alert globally so no native browser popup ever appears
    if (typeof window !== "undefined") {
      const originalAlert = window.alert;
      window.alert = (msg: any) => {
        const text = typeof msg === "string" ? msg : String(msg ?? "");
        showAppAlert(text);
      };

      // Cleanup
      return () => {
        window.alert = originalAlert;
      };
    }
  }, []);

  useEffect(() => {
    const unsubDialog = registerDialogListener((newDialog) => {
      setDialog(newDialog);
    });

    const unsubToast = registerToastListener((newToast) => {
      setToasts((prev) => [...prev, newToast]);
      setTimeout(() => {
        setToasts((current) => current.filter((t) => t.id !== newToast.id));
      }, newToast.duration);
    });

    return () => {
      unsubDialog();
      unsubToast();
    };
  }, []);

  // Keyboard navigation (Enter to confirm, Escape to cancel)
  useEffect(() => {
    if (!dialog) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        dialog.onConfirm?.();
      } else if (e.key === "Escape") {
        e.preventDefault();
        if (dialog.isConfirm) {
          dialog.onCancel?.();
        } else {
          dialog.onConfirm?.();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [dialog]);

  const getIcon = (type: string = "info") => {
    switch (type) {
      case "success":
        return <CheckCircle2 size={34} strokeWidth={2.2} />;
      case "danger":
        return <XCircle size={34} strokeWidth={2.2} />;
      case "warning":
        return <AlertTriangle size={34} strokeWidth={2.2} />;
      case "info":
      default:
        return <Info size={34} strokeWidth={2.2} />;
    }
  };

  const getToastIcon = (type: string = "info") => {
    switch (type) {
      case "success":
        return <CheckCircle2 size={18} color="#34d399" />;
      case "danger":
        return <XCircle size={18} color="#fb7185" />;
      case "warning":
        return <AlertTriangle size={18} color="#fbbf24" />;
      case "info":
      default:
        return <Bell size={18} color="#818cf8" />;
    }
  };

  const type = dialog?.type || "info";
  const glowClass =
    type === "success"
      ? styles.cardGlowSuccess
      : type === "danger"
      ? styles.cardGlowDanger
      : type === "warning"
      ? styles.cardGlowWarning
      : styles.cardGlowInfo;

  const ambientClass =
    type === "success"
      ? styles.ambientGlowSuccess
      : type === "danger"
      ? styles.ambientGlowDanger
      : type === "warning"
      ? styles.ambientGlowWarning
      : styles.ambientGlowInfo;

  const iconClass =
    type === "success"
      ? styles.iconWrapSuccess
      : type === "danger"
      ? styles.iconWrapDanger
      : type === "warning"
      ? styles.iconWrapWarning
      : styles.iconWrapInfo;

  const confirmBtnClass =
    type === "success"
      ? styles.confirmBtnSuccess
      : type === "danger"
      ? styles.confirmBtnDanger
      : type === "warning"
      ? styles.confirmBtnWarning
      : styles.confirmBtnInfo;

  return (
    <>
      {/* Toast Notifications Stack */}
      {toasts.length > 0 && (
        <div className={styles.toastContainer}>
          {toasts.map((toast) => {
            const pillClass =
              toast.type === "success"
                ? styles.toastPillSuccess
                : toast.type === "danger"
                ? styles.toastPillDanger
                : toast.type === "warning"
                ? styles.toastPillWarning
                : styles.toastPillInfo;

            return (
              <div key={toast.id} className={`${styles.toastPill} ${pillClass}`}>
                <div className={styles.toastIcon}>{getToastIcon(toast.type)}</div>
                <div className={styles.toastContent}>{toast.message}</div>
                <div
                  className={styles.toastProgress}
                  style={{ animationDuration: `${toast.duration}ms` }}
                />
              </div>
            );
          })}
        </div>
      )}

      {/* Main Glassmorphic Modal Dialog */}
      {dialog && (
        <div
          className={styles.alertOverlay}
          onClick={() => {
            if (dialog.isConfirm) {
              dialog.onCancel?.();
            } else {
              dialog.onConfirm?.();
            }
          }}
          role="dialog"
          aria-modal="true"
        >
          <div
            className={`${styles.alertCard} ${glowClass}`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Ambient Radial Glow */}
            <div className={`${styles.ambientGlow} ${ambientClass}`} />

            {/* Glowing Icon */}
            <div className={`${styles.iconWrap} ${iconClass}`}>
              {getIcon(type)}
            </div>

            {/* Brand Micro Badge */}
            <div className={styles.brandBadge}>
              <span className={styles.brandDot} />
              YOUSSEF APP
            </div>

            {/* Title & Formatted Message */}
            <h3 className={styles.alertTitle}>{dialog.title}</h3>
            <p className={styles.alertMessage}>{dialog.message}</p>

            {/* Buttons */}
            <div className={styles.alertActions}>
              {dialog.isConfirm && (
                <button
                  type="button"
                  className={styles.cancelBtn}
                  onClick={() => dialog.onCancel?.()}
                >
                  <X size={17} />
                  {dialog.cancelText || "إلغاء"}
                </button>
              )}

              <button
                type="button"
                className={`${styles.confirmBtn} ${confirmBtnClass}`}
                onClick={() => dialog.onConfirm?.()}
                autoFocus
              >
                <Check size={18} />
                {dialog.confirmText || (dialog.isConfirm ? "تأكيد" : "حسناً")}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
