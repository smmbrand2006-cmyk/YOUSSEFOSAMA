"use client";

import React, { useEffect } from "react";
import { registerServiceWorker } from "@/lib/utils/pwaNotifications";
import MandatoryNotificationModal from "./MandatoryNotificationModal";
import PWAInstallBanner from "./PWAInstallBanner";

export default function PWAClientManager() {
  useEffect(() => {
    registerServiceWorker();
  }, []);

  return (
    <>
      <MandatoryNotificationModal />
      <PWAInstallBanner />
    </>
  );
}
