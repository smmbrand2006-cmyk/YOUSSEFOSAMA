import {
  signInAnonymously,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User,
} from "firebase/auth";
import {
  doc,
  setDoc,
  getDoc,
  query,
  where,
  collection,
  getDocs,
  serverTimestamp,
} from "firebase/firestore";
import { auth, db } from "./config";
import { UserProfile } from "@/lib/types/user";

const googleProvider = new GoogleAuthProvider();

/**
 * Register a new user with a custom code/number.
 * Signs in anonymously FIRST so Firestore requests have request.auth != null.
 */
export async function registerWithCode(
  userCode: string,
  displayName: string
): Promise<User> {
  // 1. Sign in anonymously FIRST so request.auth != null in Firestore
  let user = auth.currentUser;
  if (!user) {
    const cred = await signInAnonymously(auth);
    user = cred.user;
  }

  // 2. Check if user code is already taken by another account
  const codeQuery = query(
    collection(db, "users"),
    where("userCode", "==", userCode)
  );
  const existing = await getDocs(codeQuery);
  if (!existing.empty && existing.docs[0].id !== user.uid) {
    throw new Error("هذا الكود مستخدم بالفعل، يرجى اختيار كود أو رقم آخر.");
  }

  // 3. Create user profile document
  const userProfile = {
    uid: user.uid,
    userCode,
    displayName,
    bio: "",
    createdAt: serverTimestamp(),
    lastSeen: serverTimestamp(),
    isOnline: true,
    contacts: [] as string[],
    blockedUsers: [] as string[],
    settings: {
      lastSeenPrivacy: "everyone",
      statusPrivacy: "everyone",
      readReceipts: true,
      notificationSound: true,
    },
  };

  await setDoc(doc(db, "users", user.uid), userProfile);

  // Store for session persistence
  if (typeof window !== "undefined") {
    localStorage.setItem("youssef_app_uid", user.uid);
    localStorage.setItem("youssef_app_code", userCode);
  }

  return user;
}

/**
 * Login with existing user code.
 */
export async function loginWithCode(userCode: string): Promise<UserProfile> {
  // 1. Ensure authenticated session exists
  let user = auth.currentUser;
  if (!user) {
    const cred = await signInAnonymously(auth);
    user = cred.user;
  }

  // 2. Query user by code
  const codeQuery = query(
    collection(db, "users"),
    where("userCode", "==", userCode)
  );
  const snapshot = await getDocs(codeQuery);

  if (snapshot.empty) {
    throw new Error("لم يتم العثور على حساب بهذا الكود.");
  }

  const userDoc = snapshot.docs[0];
  const userData = userDoc.data() as UserProfile;

  // Store the mapping in localStorage for session persistence
  if (typeof window !== "undefined") {
    localStorage.setItem("youssef_app_uid", userData.uid);
    localStorage.setItem("youssef_app_code", userCode);
  }

  return userData;
}

/**
 * Sign in with Google OAuth
 */
export async function signInWithGoogle(): Promise<User> {
  const cred = await signInWithPopup(auth, googleProvider);
  const user = cred.user;

  // Check if user profile exists
  const userDocSnap = await getDoc(doc(db, "users", user.uid));
  if (!userDocSnap.exists()) {
    const userProfile = {
      uid: user.uid,
      userCode: user.uid.substring(0, 8),
      displayName: user.displayName || "User",
      bio: "",
      createdAt: serverTimestamp(),
      lastSeen: serverTimestamp(),
      isOnline: true,
      contacts: [] as string[],
      blockedUsers: [] as string[],
      settings: {
        lastSeenPrivacy: "everyone",
        statusPrivacy: "everyone",
        readReceipts: true,
        notificationSound: true,
      },
    };
    await setDoc(doc(db, "users", user.uid), userProfile);
  }

  if (typeof window !== "undefined") {
    localStorage.setItem("youssef_app_uid", user.uid);
  }

  return user;
}

/**
 * Sign out
 */
export async function signOut(): Promise<void> {
  if (typeof window !== "undefined") {
    localStorage.removeItem("youssef_app_uid");
    localStorage.removeItem("youssef_app_code");
  }
  await firebaseSignOut(auth);
}

/**
 * Get user profile from Firestore
 */
export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const userDocSnap = await getDoc(doc(db, "users", uid));
  if (!userDocSnap.exists()) return null;
  return userDocSnap.data() as UserProfile;
}

/**
 * Listen to auth state changes
 */
export function onAuthChange(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}
