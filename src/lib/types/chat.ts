import { Timestamp } from "firebase/firestore";

export type ChatType = "direct" | "group";

export interface Chat {
  id: string;
  type: ChatType;
  participants: string[];
  participantNames: Record<string, string>;
  lastMessage: {
    text: string;
    senderId: string;
    type: string;
    createdAt: Timestamp;
  } | null;
  lastRead: Record<string, Timestamp>;
  createdAt: Timestamp;
  isPinned: Record<string, boolean>;
  isArchived: Record<string, boolean>;
  isMuted: Record<string, boolean>;
  unreadCount: Record<string, number>;
  isSupport?: boolean;
  isOnline?: boolean;
  name?: string;
  groupAdmin?: string;
  updatedAt?: Timestamp;
  // Group-specific
  groupName?: string;
  groupAdmins?: string[];
  groupCreator?: string;
  groupDescription?: string;
}

export interface FriendRequest {
  id: string;
  fromUid: string;
  toUid: string;
  fromName: string;
  toName: string;
  message: string;
  status: "pending" | "accepted" | "rejected";
  createdAt: Timestamp;
}
