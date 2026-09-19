"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { User } from "firebase/auth";
import { onAuthChange, getUserProfile } from "@/lib/firebase/auth";
import { listenToUserProfile } from "@/lib/firebase/firestore";
import { setUserOnline, setUserOffline } from "@/lib/firebase/realtime";
import { UserProfile } from "@/lib/types/user";

interface AuthContextType {
  firebaseUser: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType>({
  firebaseUser: null,
  userProfile: null,
  loading: true,
  isAuthenticated: false,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubAuth = onAuthChange(async (user) => {
      setFirebaseUser(user);

      if (user) {
        // Source of truth is ALWAYS Firebase Auth user.uid
        const targetUid = user.uid;
        if (typeof window !== "undefined") {
          localStorage.setItem("youssef_app_uid", user.uid);
        }

        // Listen to user profile in real-time
        const unsubProfile = listenToUserProfile(targetUid, (profile) => {
          if (profile) {
            setUserProfile(profile);
          } else {
            // Safe fallback profile to prevent redirect bounce
            const savedCode =
              typeof window !== "undefined"
                ? localStorage.getItem("youssef_app_code")
                : "";
            const derivedCode =
              savedCode || user.email?.split("@")[0] || user.uid.substring(0, 6);

            setUserProfile({
              uid: user.uid,
              userCode: derivedCode,
              displayName: user.displayName || derivedCode,
              bio: "",
              createdAt: new Date() as any,
              lastSeen: new Date() as any,
              isOnline: true,
              contacts: [],
              blockedUsers: [],
              settings: {
                lastSeenPrivacy: "everyone",
                statusPrivacy: "everyone",
                readReceipts: true,
                notificationSound: true,
              },
            });
          }
          setLoading(false);
        });

        // Set user online with safety catch
        try {
          setUserOnline(targetUid);
        } catch (e) {
          console.warn("Presence set error:", e);
        }

        // Cleanup on window close
        const handleBeforeUnload = () => {
          try {
            setUserOffline(targetUid);
          } catch (e) {}
        };
        window.addEventListener("beforeunload", handleBeforeUnload);

        return () => {
          unsubProfile();
          window.removeEventListener("beforeunload", handleBeforeUnload);
        };
      } else {
        setUserProfile(null);
        setLoading(false);
      }
    });

    return () => unsubAuth();
  }, []);

  const isAuthenticated = !!firebaseUser && !!userProfile;

  return (
    <AuthContext.Provider
      value={{ firebaseUser, userProfile, loading, isAuthenticated }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
