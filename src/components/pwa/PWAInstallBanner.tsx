"use client";

import React, { useState, useEffect } from "react";
import {
  isAppInstalledPWA,
  promptPWAInstall,
  getDeferredPrompt,
} from "@/lib/utils/pwaNotifications";
import styles from "@/styles/pwa.module.css";
import { Download, X, Share } from "lucide-react";
import Image from "next/image";

export default function PWAInstallBanner() {
  const [canInstall, setCanInstall] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    if (isAppInstalledPWA()) {
      return;
    }

    // Check if dismissed in this session
    if (sessionStorage.getItem("pwa_banner_dismissed")) {
      setIsDismissed(true);
      return;
    }

    if (getDeferredPrompt()) {
      setCanInstall(true);
    }

    const handleCanInstall = () => {
      setCanInstall(true);
    };

    const handleInstalled = () => {
      setCanInstall(false);
    };

    window.addEventListener("pwa-can-install", handleCanInstall);
    window.addEventListener("pwa-installed", handleInstalled);

    // iOS detection
    const ua = navigator.userAgent;
    const isIosDevice = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
    if (isIosDevice) {
      setIsIOS(true);
    }

    return () => {
      window.removeEventListener("pwa-can-install", handleCanInstall);
      window.removeEventListener("pwa-installed", handleInstalled);
    };
  }, []);

  if (!mounted || isDismissed || (!canInstall && !isIOS)) {
    return null;
  }

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowIOSGuide((prev) => !prev);
      return;
    }
    const installed = await promptPWAInstall();
    if (installed) {
      setCanInstall(false);
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    try {
      sessionStorage.setItem("pwa_banner_dismissed", "true");
    } catch {}
  };

  return (
    <div className={styles.pwaBannerContainer}>
      <div className={styles.pwaAppIcon}>
        <Image
          src="/icons/icon-192.png"
          alt="YOUSSEF APP"
          width={46}
          height={46}
          style={{ objectFit: "cover" }}
        />
      </div>

      <div className={styles.pwaBannerInfo}>
        <div className={styles.pwaBannerTitle}>تثبيت YOUSSEF APP كـ تطبيق</div>
        <div className={styles.pwaBannerSub}>
          {isIOS
            ? "أضف للشاشة الرئيسية لتجربة تطبيق أصلي"
            : "تطبيق سريع، خفيف، بدون شريط المتصفح"}
        </div>

        {showIOSGuide && (
          <div className={styles.iosGuideBox}>
            <Share size={16} />
            <span>
              اضغط على زر المشاركة <strong>⎋</strong> أسفل المتصفح، ثم اختر <strong>&quot;إضافة إلى الشاشة الرئيسية&quot; ➕</strong>
            </span>
          </div>
        )}
      </div>

      <div className={styles.pwaBannerAction}>
        {!isIOS && (
          <a
            href="/youssef-app.apk"
            download="youssef-app.apk"
            className={styles.pwaInstallBtn}
            style={{ textDecoration: "none", background: "linear-gradient(135deg, #00A884, #008069)", display: "flex", alignItems: "center", gap: "6px" }}
            title="تحميل تطبيق أندرويد الحقيقي (APK)"
          >
            <Download size={15} />
            تحميل APK
          </a>
        )}

        <button
          type="button"
          className={styles.pwaInstallBtn}
          onClick={handleInstallClick}
        >
          <Download size={15} />
          {isIOS ? "طريقة التثبيت" : "تثبيت PWA"}
        </button>

        <button
          type="button"
          className={styles.pwaDismissBtn}
          onClick={handleDismiss}
          aria-label="إغلاق"
        >
          <X size={18} />
        </button>
      </div>
    </div>
  );
}
