import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
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
 * Transforms a user code/number into a valid internal Firebase auth identifier
 */
function codeToEmail(code: string): string {
  const clean = code.trim().toLowerCase().replace(/[^a-z0-9_.-]/g, "_");
  return `${clean}@youssef.app`;
}

/**
 * Register a new user with custom Code/Number + Password.
 * Secured by Firebase Auth under the hood.
 */
export async function registerWithCode(
  userCode: string,
  password: string,
  displayName: string
): Promise<User> {
  const cleanCode = userCode.trim();

  if (cleanCode.length < 3) {
    throw new Error("الكود أو الرقم يجب أن يكون 3 خانات على الأقل.");
  }
  if (!password || password.length < 6) {
    throw new Error("كلمة المرور يجب أن تكون 6 خانات أو أرقام على الأقل.");
  }
  if (!displayName.trim()) {
    throw new Error("يرجى إدخال اسمك.");
  }

  // Check in Firestore if this code is already registered
  const codeQuery = query(
    collection(db, "users"),
    where("userCode", "==", cleanCode)
  );
  const existing = await getDocs(codeQuery);
  if (!existing.empty) {
    throw new Error("هذا الكود مستخدم بالفعل من قبل شخص آخر! يرجى اختيار كود آخر.");
  }

  const email = codeToEmail(cleanCode);

  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    const user = cred.user;

    const userProfile: UserProfile = {
      uid: user.uid,
      userCode: cleanCode,
      displayName: displayName.trim(),
      bio: "",
      createdAt: serverTimestamp() as any,
      lastSeen: serverTimestamp() as any,
      isOnline: true,
      contacts: [],
      blockedUsers: [],
      settings: {
        lastSeenPrivacy: "everyone",
        statusPrivacy: "everyone",
        readReceipts: true,
        notificationSound: true,
      },
    };

    await setDoc(doc(db, "users", user.uid), userProfile);

    if (typeof window !== "undefined") {
      localStorage.setItem("youssef_app_uid", user.uid);
      localStorage.setItem("youssef_app_code", cleanCode);
    }

    return user;
  } catch (err: any) {
    if (err.code === "auth/email-already-in-use") {
      throw new Error("هذا الكود مستخدم بالفعل! اختر كوداً آخر.");
    }
    if (err.code === "auth/weak-password") {
      throw new Error("كلمة المرور يجب ألا تقل عن 6 خانات.");
    }
    if (err.code === "auth/operation-not-allowed") {
      throw new Error("يرجى تفعيل Email/Password في قسم Authentication بـ Firebase.");
    }
    throw new Error(err.message || "فشل إنشاء الحساب.");
  }
}

/**
 * Login with existing user Code/Number + Password.
 */
export async function loginWithCode(
  userCode: string,
  password: string
): Promise<UserProfile> {
  const cleanCode = userCode.trim();

  if (!cleanCode) {
    throw new Error("يرجى إدخال كود أو رقم حسابك.");
  }
  if (!password) {
    throw new Error("يرجى إدخال كلمة المرور.");
  }

  const email = codeToEmail(cleanCode);

  try {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    const user = cred.user;

    const userDocSnap = await getDoc(doc(db, "users", user.uid));
    let profile: UserProfile;

    if (userDocSnap.exists()) {
      profile = userDocSnap.data() as UserProfile;
    } else {
      profile = {
        uid: user.uid,
        userCode: cleanCode,
        displayName: cleanCode,
        bio: "",
        createdAt: serverTimestamp() as any,
        lastSeen: serverTimestamp() as any,
        isOnline: true,
        contacts: [],
        blockedUsers: [],
        settings: {
          lastSeenPrivacy: "everyone",
          statusPrivacy: "everyone",
          readReceipts: true,
          notificationSound: true,
        },
      };
      await setDoc(doc(db, "users", user.uid), profile);
    }

    if (typeof window !== "undefined") {
      localStorage.setItem("youssef_app_uid", user.uid);
      localStorage.setItem("youssef_app_code", cleanCode);
    }

    return profile;
  } catch (err: any) {
    if (
      err.code === "auth/user-not-found" ||
      err.code === "auth/invalid-credential" ||
      err.code === "auth/wrong-password" ||
      err.code === "auth/invalid-email"
    ) {
      throw new Error("الكود أو كلمة المرور غير صحيحة.");
    }
    throw new Error(err.message || "فشل تسجيل الدخول.");
  }
}

/**
 * Sign in with Google OAuth
 */
export async function signInWithGoogle(): Promise<User> {
  const cred = await signInWithPopup(auth, googleProvider);
  const user = cred.user;

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
