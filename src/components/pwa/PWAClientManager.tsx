"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { registerServiceWorker } from "@/lib/utils/pwaNotifications";
import { listenNotificationClicks } from "@/lib/notifications";
import MandatoryNotificationModal from "./MandatoryNotificationModal";
import PWAInstallBanner from "./PWAInstallBanner";

export default function PWAClientManager() {
  const router = useRouter();

  useEffect(() => {
    registerServiceWorker();

    // Global listener for notification clicks across all pages
    const unsubClicks = listenNotificationClicks((chatId) => {
      if (typeof window !== "undefined") {
        window.focus();
      }
      router.push(`/chat/${chatId}`);
    });

    // Prevent mobile Chrome Touch-to-Search on non-editable elements
    const handleSelectionChange = () => {
      const active = document.activeElement;
      const isEditable =
        active &&
        (active.tagName === "INPUT" ||
          active.tagName === "TEXTAREA" ||
          active.getAttribute("contenteditable") === "true");

      if (!isEditable) {
        const sel = window.getSelection();
        if (sel && !sel.isCollapsed && sel.toString().trim().length > 0) {
          sel.removeAllRanges();
        }
      }
    };

    document.addEventListener("selectionchange", handleSelectionChange);
    return () => {
      document.removeEventListener("selectionchange", handleSelectionChange);
      unsubClicks();
    };
  }, [router]);

  return (
    <>
      <MandatoryNotificationModal />
      <PWAInstallBanner />
    </>
  );
}
