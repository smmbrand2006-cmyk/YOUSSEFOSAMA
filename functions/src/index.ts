import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getMessaging } from "firebase-admin/messaging";

initializeApp();
const db = getFirestore();
const REGION = "europe-west1";

/*
 * ASSUMED DATA MODEL:
 *   chats/{chatId}                 { participants: string[] }
 *   chats/{chatId}/messages/{id}   { senderId, text?, type? ("text"|"image"|"audio"|...) }
 *   users/{uid}                    { displayName, photoURL }
 *   users/{uid}/fcmTokens/{token}  (written by the client)
 *   calls/{callId}                 { callerId, callerName, receiverId, status: "ringing" }
 */

const DEAD = [
  "messaging/registration-token-not-registered",
  "messaging/invalid-registration-token",
];

async function pushToUser(uid: string, data: Record<string, string>, urgent = false) {
  const tokensSnap = await db.collection(`users/${uid}/fcmTokens`).get();
  const tokens = tokensSnap.docs.map((d) => d.id);
  if (!tokens.length) return;

  const res = await getMessaging().sendEachForMulticast({
    tokens,
    data, // data-only: all values MUST be strings
    webpush: { headers: { Urgency: urgent ? "high" : "normal", TTL: urgent ? "60" : "86400" } },
  });

  // Clean up tokens of uninstalled/expired devices
  const dead: string[] = [];
  res.responses.forEach((r, i) => {
    if (!r.success && DEAD.includes(r.error?.code || "")) dead.push(tokens[i]);
  });
  await Promise.all(dead.map((t) => db.doc(`users/${uid}/fcmTokens/${t}`).delete()));
}

function getSafeIcon(photo: unknown): string {
  if (typeof photo === "string" && photo.startsWith("https://")) {
    return photo;
  }
  return "/icons/icon-192.png";
}

function preview(msg: FirebaseFirestore.DocumentData): string {
  switch (msg.type) {
    case "image": return "📷 صورة";
    case "video": return "🎥 فيديو";
    case "audio": return "🎤 رسالة صوتية";
    case "file":  return "📎 ملف";
    default: {
      const t = String(msg.text ?? "");
      if (t.startsWith("🔒#YF:")) return "🔒 رسالة جديدة";
      return t.length > 120 ? t.slice(0, 117) + "…" : t;
    }
  }
}

export const onNewMessage = onDocumentCreated(
  { document: "chats/{chatId}/messages/{messageId}", region: REGION },
  async (event) => {
    const msg = event.data?.data();
    if (!msg) return;
    const { chatId } = event.params;

    const chat = await db.doc(`chats/${chatId}`).get();
    const participants: string[] = chat.get("participants") ?? [];
    const recipients = participants.filter((u) => u !== msg.senderId);
    if (!recipients.length) return;

    const sender = await db.doc(`users/${msg.senderId}`).get();
    const senderName = sender.get("displayName") ?? msg.senderName ?? "رسالة جديدة";

    await Promise.all(
      recipients.map(async (uid) => {
        // Skip if recipient has blocked sender or disabled message notifications
        const recipientDoc = await db.doc(`users/${uid}`).get();
        const prefs = recipientDoc.get("notificationPreferences") || {};
        if (prefs.messages === false) return;

        const blockedUsers: string[] = recipientDoc.get("blockedUsers") ?? [];
        if (blockedUsers.includes(msg.senderId)) return;

        const bodyText = prefs.preview === false ? "رسالة جديدة 💬" : preview(msg);

        await pushToUser(uid, {
          type: "message",
          title: `${senderName} 💬`,
          body: bodyText,
          icon: getSafeIcon(sender.get("photoURL")),
          chatId,
          url: `/chat/${chatId}`,
        });
      })
    );
  }
);

export const onIncomingCall = onDocumentCreated(
  { document: "calls/{callId}", region: REGION },
  async (event) => {
    const call = event.data?.data();
    if (!call || call.status !== "ringing") return;

    const caller = await db.doc(`users/${call.callerId}`).get();
    const callerName = caller.get("displayName") ?? call.callerName ?? "مكالمة واردة";
    const targetUid = call.receiverId || call.calleeId;

    if (!targetUid) return;

    // Check receiver notification preferences
    const receiverDoc = await db.doc(`users/${targetUid}`).get();
    const prefs = receiverDoc.get("notificationPreferences") || {};
    if (prefs.calls === false) return;

    const callId = event.params.callId;

    await pushToUser(
      targetUid,
      {
        type: "call",
        title: `${callerName} 📞`,
        body: call.type === "video" ? "📹 مكالمة فيديو واردة..." : "📞 مكالمة صوتية واردة...",
        icon: getSafeIcon(caller.get("photoURL")),
        callId,
        chatId: call.chatId ?? callId,
        url: `/calls`,
      },
      true
    );
  }
);
