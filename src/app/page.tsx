"use client";

import { useAuth } from "@/lib/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import Image from "next/image";

export default function Home() {
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (isAuthenticated) {
        router.replace("/chat");
      } else {
        router.replace("/auth/login");
      }
    }
  }, [isAuthenticated, loading, router]);

  return (
    <div
      className="loading-screen"
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100vh",
        background: "var(--bg-primary, #0B0E14)",
        gap: "24px",
      }}
    >
      <Image
        src="/logo.png"
        alt="YOUSSEF APP"
        width={220}
        height={70}
        priority
        style={{
          objectFit: "contain",
          height: "64px",
          width: "auto",
          filter: "drop-shadow(0 4px 20px rgba(255, 255, 255, 0.2))",
        }}
      />
      <div className="loading-spinner" />
      <p style={{ color: "var(--text-tertiary)", fontSize: "0.9rem" }}>
        جاري التحميل...
      </p>
    </div>
  );
}
