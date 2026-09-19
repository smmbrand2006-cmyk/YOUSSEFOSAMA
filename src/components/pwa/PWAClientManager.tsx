"use client";

import React, { useEffect } from "react";
import { registerServiceWorker } from "@/lib/utils/pwaNotifications";
import MandatoryNotificationModal from "./MandatoryNotificationModal";
import PWAInstallBanner from "./PWAInstallBanner";

export default function PWAClientManager() {
  useEffect(() => {
    registerServiceWorker();

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
    };
  }, []);

  return (
    <>
      <MandatoryNotificationModal />
      <PWAInstallBanner />
    </>
  );
}
