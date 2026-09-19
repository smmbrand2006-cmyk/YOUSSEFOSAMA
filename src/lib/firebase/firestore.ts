import {
  collection,
  doc,
  setDoc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  arrayUnion,
  arrayRemove,
  increment,
} from "firebase/firestore";
import { db } from "./config";
import { Chat, FriendRequest } from "@/lib/types/chat";
import { Message } from "@/lib/types/message";
import { UserProfile } from "@/lib/types/user";

// ==================== USER OPERATIONS ====================

/**
 * Search users by code or name
 */
export async function searchUsers(searchTerm: string): Promise<UserProfile[]> {
  const results: UserProfile[] = [];

  // Search by user code (exact match)
  const codeQuery = query(
    collection(db, "users"),
    where("userCode", "==", searchTerm)
  );
  const codeSnap = await getDocs(codeQuery);
  codeSnap.forEach((d) => results.push(d.data() as UserProfile));

  // Search by display name (starts with)
  if (results.length === 0) {
    const nameQuery = query(
      collection(db, "users"),
      where("displayName", ">=", searchTerm),
      where("displayName", "<=", searchTerm + "\uf8ff")
    );
    const nameSnap = await getDocs(nameQuery);
    nameSnap.forEach((d) => results.push(d.data() as UserProfile));
  }

  return results;
}

/**
 * Update user profile
 */
export async function updateUserProfile(
  uid: string,
  data: Partial<UserProfile>
): Promise<void> {
  await updateDoc(doc(db, "users", uid), data as any);
}

/**
 * Listen to user profile changes
 */
export function listenToUserProfile(
  uid: string,
  callback: (profile: UserProfile | null) => void
) {
  return onSnapshot(doc(db, "users", uid), (snapshot) => {
    if (snapshot.exists()) {
      callback(snapshot.data() as UserProfile);
    } else {
      callback(null);
    }
  });
}

// ==================== FRIEND REQUEST OPERATIONS ====================

/**
 * Send a friend request
 */
export async function sendFriendRequest(
  fromUid: string,
  toUid: string,
  fromName: string,
  toName: string,
  message: string = ""
): Promise<string> {
  // Check if request already exists
  const existingQuery = query(
    collection(db, "friendRequests"),
    where("fromUid", "==", fromUid),
    where("toUid", "==", toUid),
    where("status", "==", "pending")
  );
  const existing = await getDocs(existingQuery);
  if (!existing.empty) {
    throw new Error("Friend request already sent.");
  }

  // Check if already contacts
  const userDoc = await getDoc(doc(db, "users", fromUid));
  const userData = userDoc.data() as UserProfile;
  if (userData.contacts?.includes(toUid)) {
    throw new Error("Already in your contacts.");
  }

  const requestRef = await addDoc(collection(db, "friendRequests"), {
    fromUid,
    toUid,
    fromName,
    toName,
    message,
    status: "pending",
    createdAt: serverTimestamp(),
  });

  return requestRef.id;
}

/**
 * Accept a friend request - creates a chat and adds to contacts
 */
export async function acceptFriendRequest(requestId: string): Promise<string> {
  const requestDoc = await getDoc(doc(db, "friendRequests", requestId));
  if (!requestDoc.exists()) throw new Error("Request not found.");

  const request = requestDoc.data() as FriendRequest;

  // Update request status
  await updateDoc(doc(db, "friendRequests", requestId), {
    status: "accepted",
  });

  // Add each other to contacts
  await updateDoc(doc(db, "users", request.fromUid), {
    contacts: arrayUnion(request.toUid),
  });
  await updateDoc(doc(db, "users", request.toUid), {
    contacts: arrayUnion(request.fromUid),
  });

  // Get both user profiles for chat creation
  const fromUser = (await getDoc(doc(db, "users", request.fromUid))).data() as UserProfile;
  const toUser = (await getDoc(doc(db, "users", request.toUid))).data() as UserProfile;

  // Create a direct chat
  const chatRef = await addDoc(collection(db, "chats"), {
    type: "direct",
    participants: [request.fromUid, request.toUid],
    participantNames: {
      [request.fromUid]: fromUser.displayName,
      [request.toUid]: toUser.displayName,
    },
    lastMessage: null,
    lastRead: {
      [request.fromUid]: serverTimestamp(),
      [request.toUid]: serverTimestamp(),
    },
    createdAt: serverTimestamp(),
    isPinned: {},
    isArchived: {},
    isMuted: {},
    unreadCount: {
      [request.fromUid]: 0,
      [request.toUid]: 0,
    },
  });

  // Send system message
  await addDoc(collection(db, "chats", chatRef.id, "messages"), {
    senderId: "system",
    senderName: "System",
    text: `${toUser.displayName} accepted the friend request. Say hi! 👋`,
    type: "system",
    reactions: {},
    isEdited: false,
    isDeleted: false,
    deletedFor: [],
    createdAt: serverTimestamp(),
  });

  return chatRef.id;
}

/**
 * Reject a friend request
 */
export async function rejectFriendRequest(requestId: string): Promise<void> {
  await updateDoc(doc(db, "friendRequests", requestId), {
    status: "rejected",
  });
}

/**
 * Listen to incoming friend requests
 */
export function listenToFriendRequests(
  uid: string,
  callback: (requests: FriendRequest[]) => void
) {
  const q = query(
    collection(db, "friendRequests"),
    where("toUid", "==", uid),
    where("status", "==", "pending"),
    orderBy("createdAt", "desc")
  );

  return onSnapshot(q, (snapshot) => {
    const requests: FriendRequest[] = [];
    snapshot.forEach((d) => {
      requests.push({ id: d.id, ...d.data() } as FriendRequest);
    });
    callback(requests);
  });
}

// ==================== CHAT OPERATIONS ====================

/**
 * Listen to user's chat list
 */
export function listenToChats(
  uid: string,
  callback: (chats: Chat[]) => void
) {
  const q = query(
    collection(db, "chats"),
    where("participants", "array-contains", uid),
    orderBy("createdAt", "desc")
  );

  return onSnapshot(q, (snapshot) => {
    const chatsList: Chat[] = [];
    snapshot.forEach((d) => {
      chatsList.push({ id: d.id, ...d.data() } as Chat);
    });
    // Sort: pinned first, then by last message time
    chatsList.sort((a, b) => {
      const aPinned = a.isPinned?.[uid] ? 1 : 0;
      const bPinned = b.isPinned?.[uid] ? 1 : 0;
      if (aPinned !== bPinned) return bPinned - aPinned;
      const aTime = a.lastMessage?.createdAt?.toMillis?.() || 0;
      const bTime = b.lastMessage?.createdAt?.toMillis?.() || 0;
      return bTime - aTime;
    });
    callback(chatsList);
  });
}

/**
 * Listen to messages in a chat with pagination
 */
export function listenToMessages(
  chatId: string,
  messageLimit: number = 50,
  callback: (messages: Message[]) => void
) {
  const q = query(
    collection(db, "chats", chatId, "messages"),
    orderBy("createdAt", "desc"),
    limit(messageLimit)
  );

  return onSnapshot(q, (snapshot) => {
    const msgs: Message[] = [];
    snapshot.forEach((d) => {
      msgs.push({ id: d.id, ...d.data() } as Message);
    });
    // Reverse so oldest is first (for display)
    msgs.reverse();
    callback(msgs);
  });
}

/**
 * Send a text message
 */
export async function sendMessage(
  chatId: string,
  senderId: string,
  senderName: string,
  text: string,
  extra: Record<string, any> = {}
): Promise<string> {
  const messageData = {
    senderId,
    senderName,
    text,
    type: "text",
    reactions: {},
    isEdited: false,
    isDeleted: false,
    deletedFor: [],
    createdAt: serverTimestamp(),
    ...extra,
  };

  const msgRef = await addDoc(
    collection(db, "chats", chatId, "messages"),
    messageData
  );

  // Update last message on chat document
  await updateDoc(doc(db, "chats", chatId), {
    lastMessage: {
      text,
      senderId,
      type: "text",
      createdAt: serverTimestamp(),
    },
  });

  // Increment unread count for other participants
  const chatDoc = await getDoc(doc(db, "chats", chatId));
  if (chatDoc.exists()) {
    const chatData = chatDoc.data() as Chat;
    const updates: Record<string, any> = {};
    chatData.participants.forEach((uid) => {
      if (uid !== senderId) {
        updates[`unreadCount.${uid}`] = increment(1);
      }
    });
    await updateDoc(doc(db, "chats", chatId), updates);
  }

  return msgRef.id;
}

/**
 * Mark chat as read - update lastRead timestamp
 */
export async function markChatAsRead(
  chatId: string,
  uid: string
): Promise<void> {
  await updateDoc(doc(db, "chats", chatId), {
    [`lastRead.${uid}`]: serverTimestamp(),
    [`unreadCount.${uid}`]: 0,
  });
}

/**
 * Delete a message
 */
export async function deleteMessage(
  chatId: string,
  messageId: string,
  uid: string,
  forEveryone: boolean = false
): Promise<void> {
  if (forEveryone) {
    await updateDoc(doc(db, "chats", chatId, "messages", messageId), {
      isDeleted: true,
      text: "This message was deleted",
    });
  } else {
    await updateDoc(doc(db, "chats", chatId, "messages", messageId), {
      deletedFor: arrayUnion(uid),
    });
  }
}

/**
 * Edit a message
 */
export async function editMessage(
  chatId: string,
  messageId: string,
  newText: string
): Promise<void> {
  await updateDoc(doc(db, "chats", chatId, "messages", messageId), {
    text: newText,
    isEdited: true,
    editedAt: serverTimestamp(),
  });
}

/**
 * Add a reaction to a message
 */
export async function addReaction(
  chatId: string,
  messageId: string,
  emoji: string,
  uid: string
): Promise<void> {
  await updateDoc(doc(db, "chats", chatId, "messages", messageId), {
    [`reactions.${emoji}`]: arrayUnion(uid),
  });
}

/**
 * Remove a reaction from a message
 */
export async function removeReaction(
  chatId: string,
  messageId: string,
  emoji: string,
  uid: string
): Promise<void> {
  await updateDoc(doc(db, "chats", chatId, "messages", messageId), {
    [`reactions.${emoji}`]: arrayRemove(uid),
  });
}

/**
 * Pin/unpin a chat
 */
export async function togglePinChat(
  chatId: string,
  uid: string,
  pinned: boolean
): Promise<void> {
  await updateDoc(doc(db, "chats", chatId), {
    [`isPinned.${uid}`]: pinned,
  });
}

/**
 * Archive/unarchive a chat
 */
export async function toggleArchiveChat(
  chatId: string,
  uid: string,
  archived: boolean
): Promise<void> {
  await updateDoc(doc(db, "chats", chatId), {
    [`isArchived.${uid}`]: archived,
  });
}

/**
 * Mute/unmute a chat
 */
export async function toggleMuteChat(
  chatId: string,
  uid: string,
  muted: boolean
): Promise<void> {
  await updateDoc(doc(db, "chats", chatId), {
    [`isMuted.${uid}`]: muted,
  });
}
