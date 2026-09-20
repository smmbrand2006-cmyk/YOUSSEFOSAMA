"use client";

export type DialogType = "info" | "success" | "warning" | "danger";

export interface DialogOptions {
  message: string;
  title?: string;
  type?: DialogType;
  confirmText?: string;
  cancelText?: string;
  isConfirm?: boolean;
  onConfirm?: () => void;
  onCancel?: () => void;
}

export interface ToastItem {
  id: string;
  message: string;
  type: DialogType;
  duration: number;
}

type DialogListener = (dialog: DialogOptions | null) => void;
type ToastListener = (toast: ToastItem) => void;

let activeDialogListener: DialogListener | null = null;
let activeToastListener: ToastListener | null = null;
let confirmResolver: ((value: boolean) => void) | null = null;

export function registerDialogListener(listener: DialogListener) {
  activeDialogListener = listener;
  return () => {
    activeDialogListener = null;
  };
}

export function registerToastListener(listener: ToastListener) {
  activeToastListener = listener;
  return () => {
    activeToastListener = null;
  };
}

/**
 * Infer dialog type from message keywords
 */
export function inferDialogType(text: string): DialogType {
  const t = text.toLowerCase();
  if (
    t.includes("نجاح") ||
    t.includes("تم ") ||
    t.includes("✅") ||
    t.includes("🎉") ||
    t.includes("👍")
  ) {
    return "success";
  }
  if (
    t.includes("خطأ") ||
    t.includes("فشل") ||
    t.includes("تعذر") ||
    t.includes("محظور") ||
    t.includes("مرفوض") ||
    t.includes("error") ||
    t.includes("fail")
  ) {
    return "danger";
  }
  if (
    t.includes("تأكد") ||
    t.includes("يرجى") ||
    t.includes("إنترنت") ||
    t.includes("تحذير") ||
    t.includes("🔒") ||
    t.includes("حذف")
  ) {
    return "warning";
  }
  return "info";
}

/**
 * Infer dialog title from type
 */
export function inferDialogTitle(type: DialogType, isConfirm?: boolean): string {
  if (isConfirm) return "تأكيد الإجراء";
  switch (type) {
    case "success":
      return "تمت العملية بنجاح";
    case "danger":
      return "تنبيه هام";
    case "warning":
      return "ملاحظة هامة";
    case "info":
    default:
      return "إشعار من التطبيق";
  }
}

/**
 * Play soft luxury notification chime
 */
export function playDialogChime(type: DialogType) {
  try {
    if (typeof window === "undefined") return;
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    if (type === "success") {
      osc.frequency.setValueAtTime(523.25, now); // C5
      osc.frequency.exponentialRampToValueAtTime(659.25, now + 0.1); // E5
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
    } else if (type === "danger") {
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(349.23, now + 0.12);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
    } else {
      osc.frequency.setValueAtTime(587.33, now); // D5
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    }

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.25);
  } catch {}
}

/**
 * Show high-end Alert Modal
 */
export function showAppAlert(
  message: string,
  options?: { title?: string; type?: DialogType; confirmText?: string }
): Promise<void> {
  return new Promise((resolve) => {
    const inferred = options?.type || inferDialogType(message);
    const title = options?.title || inferDialogTitle(inferred, false);

    playDialogChime(inferred);

    if (activeDialogListener) {
      activeDialogListener({
        message,
        title,
        type: inferred,
        confirmText: options?.confirmText || "حسناً",
        isConfirm: false,
        onConfirm: () => {
          if (activeDialogListener) activeDialogListener(null);
          resolve();
        },
      });
    } else {
      resolve();
    }
  });
}

/**
 * Show high-end Confirm Modal
 */
export function showAppConfirm(
  message: string,
  options?: {
    title?: string;
    type?: DialogType;
    confirmText?: string;
    cancelText?: string;
  }
): Promise<boolean> {
  return new Promise((resolve) => {
    const inferred = options?.type || (message.includes("حذف") || message.includes("تعطيل") ? "danger" : "warning");
    const title = options?.title || inferDialogTitle(inferred, true);

    playDialogChime(inferred);
    confirmResolver = resolve;

    if (activeDialogListener) {
      activeDialogListener({
        message,
        title,
        type: inferred,
        confirmText: options?.confirmText || "تأكيد",
        cancelText: options?.cancelText || "إلغاء",
        isConfirm: true,
        onConfirm: () => {
          if (activeDialogListener) activeDialogListener(null);
          if (confirmResolver) {
            confirmResolver(true);
            confirmResolver = null;
          }
        },
        onCancel: () => {
          if (activeDialogListener) activeDialogListener(null);
          if (confirmResolver) {
            confirmResolver(false);
            confirmResolver = null;
          }
        },
      });
    } else {
      resolve(false);
    }
  });
}

/**
 * Show sleek floating Toast
 */
export function showAppToast(
  message: string,
  type: DialogType = "info",
  duration = 3200
) {
  if (activeToastListener) {
    activeToastListener({
      id: "toast-" + Date.now() + "-" + Math.random().toString(36).substring(2, 6),
      message,
      type,
      duration,
    });
  }
}
