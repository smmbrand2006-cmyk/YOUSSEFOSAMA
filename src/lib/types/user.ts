import { Timestamp } from "firebase/firestore";

export interface UserProfile {
  uid: string;
  userCode: string;
  displayName: string;
  email?: string;
  bio: string;
  createdAt: Timestamp;
  lastSeen: Timestamp;
  isOnline: boolean;
  contacts: string[];
  blockedUsers: string[];
  settings: UserSettings;
}

export interface UserSettings {
  lastSeenPrivacy: "everyone" | "contacts" | "nobody";
  statusPrivacy: "everyone" | "contacts" | "nobody";
  readReceipts: boolean;
  notificationSound: boolean;
}

export interface UserPresence {
  online: boolean;
  lastSeen: number;
}
