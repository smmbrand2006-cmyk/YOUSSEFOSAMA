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

  if (!mounted || isDismissed) {
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
        <div className={styles.pwaBannerTitle}>تطبيق YOUSSEF APP متوفر الآن 📱</div>
        <div className={styles.pwaBannerSub}>
          {isIOS
            ? "أضف للشاشة الرئيسية لتجربة تطبيق أصلي سريع"
            : "حمّل تطبيق الأندرويد الرسمي (APK) لتجربة أسرع بدون متصفح"}
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
            href="https://github.com/smmbrand2006-cmyk/YOUSSEFOSAMA/releases/latest/download/YOUSSEF_APP.apk"
            className={styles.pwaInstallBtn}
            style={{
              textDecoration: "none",
              background: "linear-gradient(135deg, #25D366, #128C7E)",
              boxShadow: "0 4px 14px rgba(37, 211, 102, 0.4)",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              fontWeight: "800",
            }}
            title="تحميل تطبيق أندرويد الحقيقي (APK)"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Download size={16} />
            تحميل APK
          </a>
        )}

        {canInstall && (
          <button
            type="button"
            className={styles.pwaInstallBtn}
            onClick={handleInstallClick}
          >
            <Download size={15} />
            تثبيت PWA
          </button>
        )}

        {isIOS && (
          <button
            type="button"
            className={styles.pwaInstallBtn}
            onClick={handleInstallClick}
          >
            <Download size={15} />
            طريقة التثبيت
          </button>
        )}

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
