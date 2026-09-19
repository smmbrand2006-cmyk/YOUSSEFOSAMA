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
  // Check if request already exists (Single field query)
  const existingQuery = query(
    collection(db, "friendRequests"),
    where("fromUid", "==", fromUid)
  );
  const existingSnap = await getDocs(existingQuery);
  const alreadySent = existingSnap.docs.some((d) => {
    const data = d.data();
    return data.toUid === toUid && data.status === "pending";
  });
  if (alreadySent) {
    throw new Error("لقد قمت بإرسال طلب بالفعل لهذا المستخدم.");
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
 * Listen to incoming friend requests (Zero-index required)
 */
export function listenToFriendRequests(
  uid: string,
  callback: (requests: FriendRequest[]) => void
) {
  // Single-field query: automatically indexed, zero composite index needed
  const q = query(
    collection(db, "friendRequests"),
    where("toUid", "==", uid)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const requests: FriendRequest[] = [];
      snapshot.forEach((d) => {
        const data = d.data() as FriendRequest;
        if (data.status === "pending") {
          requests.push({ id: d.id, ...data });
        }
      });
      // Sort client-side
      requests.sort((a, b) => {
        const aTime = (a.createdAt as any)?.toMillis?.() || 0;
        const bTime = (b.createdAt as any)?.toMillis?.() || 0;
        return bTime - aTime;
      });
      callback(requests);
    },
    (err) => {
      console.warn("listenToFriendRequests listener note:", err);
    }
  );
}

// ==================== CHAT OPERATIONS ====================

/**
 * Listen to user's chat list (Zero-index required)
 */
export function listenToChats(
  uid: string,
  callback: (chats: Chat[]) => void
) {
  // Single-field array query: automatically indexed, zero composite index needed
  const q = query(
    collection(db, "chats"),
    where("participants", "array-contains", uid)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const chatsList: Chat[] = [];
      snapshot.forEach((d) => {
        chatsList.push({ id: d.id, ...d.data() } as Chat);
      });
      // Sort client-side: pinned first, then by last message time or createdAt
      chatsList.sort((a, b) => {
        const aPinned = a.isPinned?.[uid] ? 1 : 0;
        const bPinned = b.isPinned?.[uid] ? 1 : 0;
        if (aPinned !== bPinned) return bPinned - aPinned;
        const aTime =
          (a.lastMessage?.createdAt as any)?.toMillis?.() ||
          (a.createdAt as any)?.toMillis?.() ||
          0;
        const bTime =
          (b.lastMessage?.createdAt as any)?.toMillis?.() ||
          (b.createdAt as any)?.toMillis?.() ||
          0;
        return bTime - aTime;
      });
      callback(chatsList);
    },
    (err) => {
      console.warn("listenToChats listener note:", err);
    }
  );
}

/**
 * Listen to messages in a chat with real-time instant synchronization
 */
export function listenToMessages(
  chatId: string,
  messageLimit: number = 60,
  callback: (messages: Message[]) => void
) {
  const q = query(
    collection(db, "chats", chatId, "messages"),
    orderBy("createdAt", "desc"),
    limit(messageLimit)
  );

  return onSnapshot(
    q,
    { includeMetadataChanges: true },
    (snapshot) => {
      const msgs: Message[] = [];
      snapshot.forEach((d) => {
        msgs.push({ id: d.id, ...d.data() } as Message);
      });
      // Sort oldest to newest for chronological chat timeline
      msgs.sort((a, b) => {
        const timeA =
          (a.createdAt as any)?.toMillis?.() ||
          (a as any).clientTimestamp ||
          0;
        const timeB =
          (b.createdAt as any)?.toMillis?.() ||
          (b as any).clientTimestamp ||
          0;
        return timeA - timeB;
      });
      callback(msgs);
    }
  );
}

/**
 * Send a text or media message with sub-second instant delivery
 */
export async function sendMessage(
  chatId: string,
  senderId: string,
  senderName: string,
  text: string,
  extra: Record<string, any> = {}
): Promise<string> {
  const now = Date.now();
  const messageData = {
    senderId,
    senderName,
    text,
    type: extra.type || "text",
    reactions: {},
    isEdited: false,
    isDeleted: false,
    deletedFor: [],
    clientTimestamp: now,
    createdAt: serverTimestamp(),
    ...extra,
  };

  // 1. Add message doc immediately (parallelized)
  const addMsgPromise = addDoc(
    collection(db, "chats", chatId, "messages"),
    messageData
  );

  // 2. Update chat lastMessage in parallel
  const updateChatPromise = updateDoc(doc(db, "chats", chatId), {
    lastMessage: {
      text,
      senderId,
      type: extra.type || "text",
      createdAt: serverTimestamp(),
    },
  }).catch((e) => console.warn("Failed to update chat lastMessage:", e));

  const [msgRef] = await Promise.all([addMsgPromise, updateChatPromise]);

  // 3. Background non-blocking unread count increment
  (async () => {
    try {
      const chatDoc = await getDoc(doc(db, "chats", chatId));
      if (chatDoc.exists()) {
        const chatData = chatDoc.data() as Chat;
        const updates: Record<string, any> = {};
        (chatData.participants || []).forEach((uid) => {
          if (uid !== senderId) {
            updates[`unreadCount.${uid}`] = increment(1);
          }
        });
        if (Object.keys(updates).length > 0) {
          await updateDoc(doc(db, "chats", chatId), updates);
        }
      }
    } catch (e) {
      // background non-blocking
    }
  })();

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

/**
 * Opens or creates a direct support chat with user code '123'
 */
export async function openOrCreateSupportChat(currentUser: UserProfile): Promise<string> {
  const SUPPORT_CODE = "123";
  const DEFAULT_SUPPORT_NAME = "الدعم الفني (123) 🎧";

  if (currentUser.userCode === SUPPORT_CODE) {
    throw new Error("أنت مسجل الدخول حالياً بحساب الدعم الفني (123)!");
  }

  // 1. Find the support user
  const supportQuery = query(
    collection(db, "users"),
    where("userCode", "==", SUPPORT_CODE)
  );
  const supportSnap = await getDocs(supportQuery);
  let supportUid: string;
  let supportName = DEFAULT_SUPPORT_NAME;

  if (supportSnap.empty) {
    supportUid = "support_official_123";
    await setDoc(doc(db, "users", supportUid), {
      uid: supportUid,
      userCode: SUPPORT_CODE,
      displayName: DEFAULT_SUPPORT_NAME,
      bio: "فريق الدعم الفني والمساعدة الرسمي",
      createdAt: serverTimestamp(),
      lastSeen: serverTimestamp(),
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
  } else {
    const supportDoc = supportSnap.docs[0];
    supportUid = supportDoc.id;
    supportName = (supportDoc.data() as UserProfile).displayName || DEFAULT_SUPPORT_NAME;
  }

  // 2. Check if a direct chat already exists
  const chatsQuery = query(
    collection(db, "chats"),
    where("participants", "array-contains", currentUser.uid)
  );
  const chatsSnap = await getDocs(chatsQuery);
  const existingChat = chatsSnap.docs.find((d) => {
    const chatData = d.data() as Chat;
    return chatData.type === "direct" && chatData.participants.includes(supportUid);
  });

  if (existingChat) {
    return existingChat.id;
  }

  // 3. Create new support chat
  const chatRef = await addDoc(collection(db, "chats"), {
    type: "direct",
    participants: [currentUser.uid, supportUid],
    participantNames: {
      [currentUser.uid]: currentUser.displayName,
      [supportUid]: supportName,
    },
    lastMessage: {
      text: "مرحباً بك في الدعم الفني! كيف يمكننا مساعدتك اليوم؟ 🎧",
      senderId: supportUid,
      type: "text",
      createdAt: serverTimestamp(),
    },
    lastRead: {
      [currentUser.uid]: serverTimestamp(),
      [supportUid]: serverTimestamp(),
    },
    createdAt: serverTimestamp(),
    isPinned: {
      [currentUser.uid]: true,
    },
    isArchived: {},
    isMuted: {},
    unreadCount: {
      [currentUser.uid]: 1,
      [supportUid]: 0,
    },
  });

  // 4. Initial greeting message
  await addDoc(collection(db, "chats", chatRef.id, "messages"), {
    senderId: supportUid,
    senderName: supportName,
    text: "أهلاً بك في الدعم الفني الرسمي! تفضل بكتابة استفسارك أو مشكلتك وسنقوم بالرد عليك في أقرب وقت. 🎧💬",
    type: "text",
    reactions: {},
    isEdited: false,
    isDeleted: false,
    deletedFor: [],
    createdAt: serverTimestamp(),
  });

  return chatRef.id;
}

/**
 * Opens or creates a direct instant chat between two users without friend requests
 */
export async function getOrCreateDirectChat(
  currentUser: UserProfile,
  targetUser: UserProfile
): Promise<string> {
  // If target is support (123), use openOrCreateSupportChat
  if (targetUser.userCode === "123") {
    return openOrCreateSupportChat(currentUser);
  }

  // 1. Check if a direct chat already exists
  const chatsQuery = query(
    collection(db, "chats"),
    where("participants", "array-contains", currentUser.uid)
  );
  const chatsSnap = await getDocs(chatsQuery);
  const existingChat = chatsSnap.docs.find((d) => {
    const chatData = d.data() as Chat;
    return (
      chatData.type === "direct" &&
      chatData.participants.includes(targetUser.uid)
    );
  });

  if (existingChat) {
    return existingChat.id;
  }

  // 2. Create new direct chat immediately
  const chatRef = await addDoc(collection(db, "chats"), {
    type: "direct",
    participants: [currentUser.uid, targetUser.uid],
    participantNames: {
      [currentUser.uid]: currentUser.displayName || currentUser.userCode,
      [targetUser.uid]: targetUser.displayName || targetUser.userCode,
    },
    lastMessage: null,
    lastRead: {
      [currentUser.uid]: serverTimestamp(),
      [targetUser.uid]: serverTimestamp(),
    },
    createdAt: serverTimestamp(),
    isPinned: {},
    isArchived: {},
    isMuted: {},
    unreadCount: {
      [currentUser.uid]: 0,
      [targetUser.uid]: 0,
    },
  });

  return chatRef.id;
}

