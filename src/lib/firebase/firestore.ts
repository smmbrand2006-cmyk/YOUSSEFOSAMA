import {
  collection,
  doc,
  setDoc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  writeBatch,
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
import { encryptMessageText, decryptMessageText } from "@/lib/utils/encryption";

// ==================== USER OPERATIONS ====================

/**
 * Search users by code or name (case-insensitive & handles #)
 */
export async function searchUsers(searchTerm: string): Promise<UserProfile[]> {
  const cleanTerm = searchTerm.replace(/^#/, "").trim();
  if (!cleanTerm) return [];

  const resultsMap = new Map<string, UserProfile>();

  // 1. Exact match by user code
  const codeQuery = query(
    collection(db, "users"),
    where("userCode", "==", cleanTerm)
  );
  const codeSnap = await getDocs(codeQuery);
  codeSnap.forEach((d) => resultsMap.set(d.id, d.data() as UserProfile));

  // 2. Search users with case-insensitive matching
  const allUsersQuery = query(collection(db, "users"), limit(150));
  const allSnap = await getDocs(allUsersQuery);
  const lower = cleanTerm.toLowerCase();

  allSnap.forEach((d) => {
    const u = d.data() as UserProfile;
    if (
      u.userCode?.toLowerCase().includes(lower) ||
      u.displayName?.toLowerCase().includes(lower) ||
      u.email?.toLowerCase().includes(lower)
    ) {
      resultsMap.set(d.id, u);
    }
  });

  return Array.from(resultsMap.values());
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

  // Send system message (encrypted with daily rotating cipher)
  await addDoc(collection(db, "chats", chatRef.id, "messages"), {
    senderId: "system",
    senderName: "System",
    text: encryptMessageText(`${toUser.displayName} accepted the friend request. Say hi! 👋`),
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
          requests.push({ ...data, id: d.id });
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
 * Helper to get the most recent activity timestamp for a chat reliably,
 * handling pending optimistic serverTimestamps without dropping to 0.
 */
export function getChatLastActivityTime(chat: Chat): number {
  const lm = chat.lastMessage;
  if (lm) {
    if (typeof (lm as any).clientTimestamp === "number") {
      return (lm as any).clientTimestamp;
    }
    const lmCreated = lm.createdAt as any;
    if (lmCreated?.toMillis && typeof lmCreated.toMillis === "function") {
      return lmCreated.toMillis();
    }
    if (typeof lmCreated?.seconds === "number") {
      return lmCreated.seconds * 1000;
    }
    if (lmCreated instanceof Date) {
      return lmCreated.getTime();
    }
    if (typeof lmCreated === "number") {
      return lmCreated;
    }
    // If lastMessage exists but timestamp is pending or null in local optimistic write, it was just created!
    return Date.now();
  }

  const updated = chat.updatedAt as any;
  if (updated?.toMillis && typeof updated.toMillis === "function") {
    return updated.toMillis();
  }
  if (typeof updated?.seconds === "number") {
    return updated.seconds * 1000;
  }
  if (updated instanceof Date) {
    return updated.getTime();
  }
  if (typeof updated === "number") {
    return updated;
  }

  const created = chat.createdAt as any;
  if (created?.toMillis && typeof created.toMillis === "function") {
    return created.toMillis();
  }
  if (typeof created?.seconds === "number") {
    return created.seconds * 1000;
  }
  if (created instanceof Date) {
    return created.getTime();
  }
  if (typeof created === "number") {
    return created;
  }

  return 0;
}

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
        const chatData = { id: d.id, ...d.data({ serverTimestamps: "estimate" }) } as Chat;
        if (chatData.lastMessage?.text) {
          chatData.lastMessage.text = decryptMessageText(chatData.lastMessage.text);
        }
        chatsList.push(chatData);
      });
      // Sort client-side: pinned first, then by last message time or createdAt
      chatsList.sort((a, b) => {
        const aPinned = a.isPinned?.[uid] ? 1 : 0;
        const bPinned = b.isPinned?.[uid] ? 1 : 0;
        if (aPinned !== bPinned) return bPinned - aPinned;
        const aTime = getChatLastActivityTime(a);
        const bTime = getChatLastActivityTime(b);
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
        const raw = d.data() as Message;
        const decryptedText = decryptMessageText(raw.text);
        let decryptedReplyTo = raw.replyTo;
        if (raw.replyTo?.text) {
          decryptedReplyTo = {
            ...raw.replyTo,
            text: decryptMessageText(raw.replyTo.text),
          };
        }
        msgs.push({
          ...raw,
          id: d.id,
          text: decryptedText,
          replyTo: decryptedReplyTo,
        } as Message);
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
 * Send a text or media message with sub-second instant delivery and dynamic rotating encryption
 */
export async function sendMessage(
  chatId: string,
  senderId: string,
  senderName: string,
  text: string,
  extra: Record<string, any> = {}
): Promise<string> {
  const now = Date.now();
  // Encrypt message text with dynamic daily cipher before saving to database
  const encryptedText = encryptMessageText(text);

  let extraProcessed = { ...extra };
  if (extraProcessed.replyTo && extraProcessed.replyTo.text) {
    extraProcessed.replyTo = {
      ...extraProcessed.replyTo,
      text: encryptMessageText(extraProcessed.replyTo.text),
    };
  }

  const messageData = {
    senderId,
    senderName,
    text: encryptedText,
    type: extra.type || "text",
    reactions: {},
    isEdited: false,
    isDeleted: false,
    deletedFor: [],
    clientTimestamp: now,
    createdAt: serverTimestamp(),
    ...extraProcessed,
  };

  // 1. Add message doc immediately (parallelized)
  const addMsgPromise = addDoc(
    collection(db, "chats", chatId, "messages"),
    messageData
  );

  // 2. Update chat lastMessage in parallel (with encrypted text)
  const updateChatPromise = updateDoc(doc(db, "chats", chatId), {
    lastMessage: {
      text: encryptedText,
      senderId,
      type: extra.type || "text",
      createdAt: serverTimestamp(),
      clientTimestamp: now,
    },
    updatedAt: serverTimestamp(),
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
      text: encryptMessageText("تم حذف هذه الرسالة"),
    });
  } else {
    await updateDoc(doc(db, "chats", chatId, "messages", messageId), {
      deletedFor: arrayUnion(uid),
    });
  }
}

/**
 * Delete multiple selected messages (for everyone or for current user)
 */
export async function deleteMultipleMessages(
  chatId: string,
  messageIds: string[],
  uid: string,
  forEveryone: boolean = false
): Promise<void> {
  if (!messageIds || messageIds.length === 0) return;

  const batch = writeBatch(db);
  const encryptedDeletedPlaceholder = encryptMessageText("تم حذف هذه الرسالة");
  messageIds.forEach((msgId) => {
    const msgRef = doc(db, "chats", chatId, "messages", msgId);
    if (forEveryone) {
      batch.update(msgRef, {
        isDeleted: true,
        text: encryptedDeletedPlaceholder,
        deletedAt: serverTimestamp(),
      });
    } else {
      batch.update(msgRef, {
        deletedFor: arrayUnion(uid),
      });
    }
  });

  await batch.commit();
}

/**
 * Clear an entire chat conversation for everyone (wiping all messages completely)
 */
export async function clearChatForEveryone(chatId: string): Promise<void> {
  const msgsQuery = query(collection(db, "chats", chatId, "messages"));
  const snap = await getDocs(msgsQuery);

  if (!snap.empty) {
    const docs = snap.docs;
    for (let i = 0; i < docs.length; i += 450) {
      const batch = writeBatch(db);
      const chunk = docs.slice(i, i + 450);
      chunk.forEach((d) => {
        batch.delete(d.ref);
      });
      await batch.commit();
    }
  }

  // Reset chat lastMessage
  await updateDoc(doc(db, "chats", chatId), {
    lastMessage: null,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Clear chat for current user only (mark messages deleted for this user)
 */
export async function clearChatForMe(chatId: string, uid: string): Promise<void> {
  const msgsQuery = query(collection(db, "chats", chatId, "messages"));
  const snap = await getDocs(msgsQuery);

  if (!snap.empty) {
    const docs = snap.docs;
    for (let i = 0; i < docs.length; i += 450) {
      const batch = writeBatch(db);
      const chunk = docs.slice(i, i + 450);
      chunk.forEach((d) => {
        batch.update(d.ref, {
          deletedFor: arrayUnion(uid),
        });
      });
      await batch.commit();
    }
  }

  // Reset unread count for current user
  await updateDoc(doc(db, "chats", chatId), {
    [`unreadCount.${uid}`]: 0,
  });
}

/**
 * Edit a message
 */
export async function editMessage(
  chatId: string,
  messageId: string,
  newText: string
): Promise<void> {
  const encryptedText = encryptMessageText(newText);
  await updateDoc(doc(db, "chats", chatId, "messages", messageId), {
    text: encryptedText,
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
      text: encryptMessageText("مرحباً بك في الدعم الفني! كيف يمكننا مساعدتك اليوم؟ 🎧"),
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
    text: encryptMessageText("أهلاً بك في الدعم الفني الرسمي! تفضل بكتابة استفسارك أو مشكلتك وسنقوم بالرد عليك في أقرب وقت. 🎧💬"),
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

/**
 * Create a new group conversation with multiple members
 */
export async function createGroupChat(
  creatorProfile: UserProfile,
  groupName: string,
  participantUids: string[],
  groupBio?: string
): Promise<string> {
  const allParticipants = Array.from(
    new Set([creatorProfile.uid, ...participantUids])
  );
  const participantNames: Record<string, string> = {
    [creatorProfile.uid]: creatorProfile.displayName || creatorProfile.userCode,
  };

  // Fetch participant profiles for display names
  for (const uid of participantUids) {
    if (uid !== creatorProfile.uid) {
      try {
        const uDoc = await getDoc(doc(db, "users", uid));
        if (uDoc.exists()) {
          const uData = uDoc.data() as UserProfile;
          participantNames[uid] = uData.displayName || uData.userCode || "عضو";
        }
      } catch (e) {}
    }
  }

  const unreadCount: Record<string, number> = {};
  allParticipants.forEach((uid) => {
    unreadCount[uid] = 0;
  });

  const encryptedWelcome = encryptMessageText(
    `🎉 تم إنشاء المجموعة "${groupName.trim()}" بواسطة ${
      creatorProfile.displayName || creatorProfile.userCode
    }`
  );

  const groupData: any = {
    type: "group",
    groupName: groupName.trim(),
    groupDescription: groupBio?.trim() || "",
    groupAdmin: creatorProfile.uid,
    participants: allParticipants,
    participantNames,
    unreadCount,
    lastMessage: {
      text: encryptedWelcome,
      senderId: "system",
      type: "system",
      createdAt: serverTimestamp(),
    },
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const groupRef = await addDoc(collection(db, "chats"), groupData);

  // Add initial system message to group
  await addDoc(collection(db, "chats", groupRef.id, "messages"), {
    senderId: "system",
    senderName: "النظام",
    text: encryptedWelcome,
    type: "system",
    reactions: {},
    isDeleted: false,
    deletedFor: [],
    createdAt: serverTimestamp(),
  });

  return groupRef.id;
}

/**
 * Fetch a single chat document by ID
 */
export async function getChatDoc(chatId: string): Promise<Chat | null> {
  try {
    const snap = await getDoc(doc(db, "chats", chatId));
    if (snap.exists()) {
      const c = { id: snap.id, ...snap.data() } as Chat;
      if (c.lastMessage?.text) {
        c.lastMessage.text = decryptMessageText(c.lastMessage.text);
      }
      return c;
    }
    return null;
  } catch (err) {
    console.error("Failed to get chat doc:", err);
    return null;
  }
}

/**
 * Block a user
 */
export async function blockUser(currentUid: string, targetUid: string): Promise<void> {
  const userRef = doc(db, "users", currentUid);
  await updateDoc(userRef, {
    blockedUsers: arrayUnion(targetUid),
  });
}

/**
 * Unblock a user
 */
export async function unblockUser(currentUid: string, targetUid: string): Promise<void> {
  const userRef = doc(db, "users", currentUid);
  await updateDoc(userRef, {
    blockedUsers: arrayRemove(targetUid),
  });
}

// ==================== STATUS / STORY OPERATIONS ====================

export interface StatusViewer {
  uid: string;
  userName: string;
  userAvatar?: string;
  viewedAt: number;
}

export interface UserStatus {
  id: string;
  uid: string;
  userName: string;
  userCode: string;
  userAvatar?: string;
  type: "text" | "image";
  content: string;
  bgColor?: string;
  createdAt: any;
  expiresAt: number;
  viewers: StatusViewer[];
}

/**
 * Publish a new story/status (lasts 24 hours)
 */
export async function publishStatus(data: {
  uid: string;
  userName: string;
  userCode: string;
  userAvatar?: string;
  type: "text" | "image";
  content: string;
  bgColor?: string;
}): Promise<string> {
  const now = Date.now();
  const expiresAt = now + 24 * 60 * 60 * 1000; // 24 hours from now

  const statusDoc = await addDoc(collection(db, "statuses"), {
    ...data,
    viewers: [],
    expiresAt,
    clientTimestamp: now,
    createdAt: serverTimestamp(),
  });

  return statusDoc.id;
}

/**
 * Listen to all active statuses (within 24 hours)
 */
export function listenToActiveStatuses(
  callback: (statuses: UserStatus[]) => void
) {
  const now = Date.now();
  const q = query(
    collection(db, "statuses"),
    where("expiresAt", ">", now)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const list: UserStatus[] = [];
      snapshot.forEach((d) => {
        list.push({ id: d.id, ...d.data() } as UserStatus);
      });
      // Sort newest first
      list.sort((a, b) => {
        const timeA = (a.createdAt as any)?.toMillis?.() || (a as any).clientTimestamp || 0;
        const timeB = (b.createdAt as any)?.toMillis?.() || (b as any).clientTimestamp || 0;
        return timeB - timeA;
      });
      callback(list);
    },
    (err) => {
      console.warn("listenToActiveStatuses note:", err);
    }
  );
}

/**
 * Record that a user viewed a status (without duplicate entries)
 */
export async function recordStatusView(
  statusId: string,
  viewer: { uid: string; userName: string; userAvatar?: string }
): Promise<void> {
  try {
    const statusRef = doc(db, "statuses", statusId);
    const snap = await getDoc(statusRef);
    if (!snap.exists()) return;

    const data = snap.data() as UserStatus;
    // Don't record if viewer is the creator or already in viewers
    if (data.uid === viewer.uid) return;
    const alreadyViewed = (data.viewers || []).some((v) => v.uid === viewer.uid);
    if (alreadyViewed) return;

    const newViewer: StatusViewer = {
      uid: viewer.uid,
      userName: viewer.userName,
      userAvatar: viewer.userAvatar || "",
      viewedAt: Date.now(),
    };

    await updateDoc(statusRef, {
      viewers: arrayUnion(newViewer),
    });
  } catch (err) {
    console.warn("Failed to record status view:", err);
  }
}

/**
 * Delete a user's own status
 */
export async function deleteStatus(statusId: string): Promise<void> {
  await deleteDoc(doc(db, "statuses", statusId));
}

