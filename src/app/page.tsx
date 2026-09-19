"use client";

import { useAuth } from "@/lib/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function Home() {
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (isAuthenticated) {
        // If user is already on a sub-route (e.g. /chat/xyz, /profile), do not bounce to /chat!
        if (typeof window !== "undefined") {
          const path = window.location.pathname;
          if (path && path !== "/" && path !== "/index.html") {
            return;
          }
        }
        router.replace("/chat");
      } else {
        router.replace("/auth/login");
      }
    }
  }, [isAuthenticated, loading, router]);

  return (
    <div className="loading-screen">
      <h1>Youssef App</h1>
      <div className="loading-spinner" />
      <p style={{ color: "var(--text-tertiary)", fontSize: "0.9rem" }}>
        Loading...
      </p>
    </div>
  );
}
