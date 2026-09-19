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
        // Check if we have a stored UID mapping (for code-based auth)
        const storedUid =
          typeof window !== "undefined"
            ? localStorage.getItem("youssef_app_uid")
            : null;
        const targetUid = storedUid || user.uid;

        // Listen to user profile in real-time
        const unsubProfile = listenToUserProfile(targetUid, (profile) => {
          setUserProfile(profile);
          setLoading(false);
        });

        // Set user online
        setUserOnline(targetUid);

        // Cleanup on window close
        const handleBeforeUnload = () => {
          setUserOffline(targetUid);
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
