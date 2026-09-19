import {
  ref,
  set,
  onValue,
  onDisconnect,
  serverTimestamp,
  off,
} from "firebase/database";
import { rtdb } from "./config";

/**
 * Set user as online and configure disconnect handler
 */
export function setUserOnline(uid: string) {
  const presenceRef = ref(rtdb, `presence/${uid}`);

  // Set online status
  set(presenceRef, {
    online: true,
    lastSeen: serverTimestamp(),
  });

  // When user disconnects, set offline
  onDisconnect(presenceRef).set({
    online: false,
    lastSeen: serverTimestamp(),
  });
}

/**
 * Set user as offline manually
 */
export function setUserOffline(uid: string) {
  const presenceRef = ref(rtdb, `presence/${uid}`);
  set(presenceRef, {
    online: false,
    lastSeen: serverTimestamp(),
  });
}

/**
 * Listen to a user's presence status
 */
export function listenToPresence(
  uid: string,
  callback: (data: { online: boolean; lastSeen: number } | null) => void
) {
  const presenceRef = ref(rtdb, `presence/${uid}`);
  const unsubscribe = onValue(presenceRef, (snapshot) => {
    callback(snapshot.val());
  });
  return () => off(presenceRef);
}

/**
 * Set typing status in a chat
 */
export function setTyping(chatId: string, uid: string, isTyping: boolean) {
  const typingRef = ref(rtdb, `typing/${chatId}/${uid}`);
  if (isTyping) {
    set(typingRef, true);
    // Auto-clear after 5 seconds
    setTimeout(() => set(typingRef, false), 5000);
  } else {
    set(typingRef, false);
  }
}

/**
 * Listen to typing indicators in a chat
 */
export function listenToTyping(
  chatId: string,
  currentUid: string,
  callback: (typingUsers: string[]) => void
) {
  const typingRef = ref(rtdb, `typing/${chatId}`);
  const unsubscribe = onValue(typingRef, (snapshot) => {
    const data = snapshot.val();
    if (!data) {
      callback([]);
      return;
    }
    const typingUsers = Object.keys(data).filter(
      (uid) => uid !== currentUid && data[uid] === true
    );
    callback(typingUsers);
  });
  return () => off(typingRef);
}
