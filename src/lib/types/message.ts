import { Timestamp } from "firebase/firestore";

export type MessageType = "text" | "image" | "system";

export interface Message {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  type: MessageType;
  mediaCode?: string; // Encoded Base64 string directly in document - zero Storage needed!
  replyTo?: {
    messageId: string;
    text: string;
    senderId: string;
    senderName: string;
  };
  reactions: Record<string, string[]>;
  isEdited: boolean;
  isDeleted: boolean;
  deletedFor: string[];
  readBy?: Record<string, any> | string[];
  clientTimestamp?: number;
  createdAt: Timestamp;
  editedAt?: Timestamp;
  deletedAt?: Timestamp;
}
