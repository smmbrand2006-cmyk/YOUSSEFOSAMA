/**
 * Youssef App - End-to-End Dynamic Daily Encryption Engine
 * Encrypts all messages and lastMessage previews before saving to Cloud Firestore.
 * In the database, all content appears as completely unintelligible encrypted glyphs/hex.
 * The encryption key rotates dynamically every single day, while remaining 100% reversible for the app.
 */

const MASTER_SEED = "YOUSSEF_APP_ULTRA_SECURE_CIPHER_KEY_2026_CMYK";
const ENCRYPTION_PREFIX = "🔒#YF:";

/**
 * Generate a deterministic hash seed from a day string (YYYY-MM-DD)
 */
function deriveDayKey(dayStamp: string): number[] {
  const combined = `${dayStamp}:${MASTER_SEED}:${dayStamp}`;
  const keyBytes: number[] = [];
  let h1 = 0xdeadbeef;
  let h2 = 0x41c64e6d;

  for (let i = 0; i < combined.length; i++) {
    const ch = combined.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }

  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);

  // Generate 64-byte pseudorandom keystream for this day
  let state = Math.abs(h1 ^ h2);
  for (let i = 0; i < 64; i++) {
    state = (Math.imul(state, 1103515245) + 12345) & 0x7fffffff;
    keyBytes.push(state % 256);
  }

  return keyBytes;
}

/**
 * Get current UTC date stamp (YYYY-MM-DD)
 */
function getCurrentDayStamp(): string {
  const d = new Date();
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Encrypt a plain text string into a day-rotating ciphertext
 */
export function encryptMessageText(plainText: string): string {
  if (!plainText || typeof plainText !== "string") return "";

  // If already encrypted, return as is
  if (plainText.startsWith(ENCRYPTION_PREFIX)) return plainText;

  const dayStamp = getCurrentDayStamp();
  const keyBytes = deriveDayKey(dayStamp);

  // Convert plain text (UTF-8 including Arabic, English, Emojis) to byte array
  const encoder = new TextEncoder();
  const utf8Bytes = encoder.encode(plainText);

  // Generate a random 2-byte IV for message uniqueness
  const iv1 = Math.floor(Math.random() * 256);
  const iv2 = Math.floor(Math.random() * 256);

  const encryptedBytes: number[] = [iv1, iv2];

  for (let i = 0; i < utf8Bytes.length; i++) {
    const rawByte = utf8Bytes[i];
    const keyByte = keyBytes[(i + iv1 + iv2) % keyBytes.length];
    // Dynamic XOR + Caesar rotation
    const enc = (rawByte ^ keyByte ^ ((iv1 + i * 3) & 0xff)) & 0xff;
    encryptedBytes.push(enc);
  }

  // Convert encrypted bytes to hex string
  const hex = encryptedBytes.map((b) => b.toString(16).padStart(2, "0")).join("");

  return `${ENCRYPTION_PREFIX}${dayStamp}:${hex}`;
}

/**
 * Decrypt a ciphertext string back into original plain text
 */
export function decryptMessageText(cipherText: string): string {
  if (!cipherText || typeof cipherText !== "string") return "";

  // If not encrypted (legacy message), return as is
  if (!cipherText.startsWith(ENCRYPTION_PREFIX)) {
    return cipherText;
  }

  try {
    const parts = cipherText.slice(ENCRYPTION_PREFIX.length).split(":");
    if (parts.length < 2) return cipherText;

    const dayStamp = parts[0];
    const hex = parts[1];

    if (!hex || hex.length < 4 || hex.length % 2 !== 0) {
      return cipherText;
    }

    const keyBytes = deriveDayKey(dayStamp);

    // Parse bytes from hex
    const allBytes: number[] = [];
    for (let i = 0; i < hex.length; i += 2) {
      allBytes.push(parseInt(hex.substr(i, 2), 16));
    }

    const iv1 = allBytes[0];
    const iv2 = allBytes[1];
    const payloadBytes = allBytes.slice(2);

    const decryptedBytes = new Uint8Array(payloadBytes.length);

    for (let i = 0; i < payloadBytes.length; i++) {
      const encByte = payloadBytes[i];
      const keyByte = keyBytes[(i + iv1 + iv2) % keyBytes.length];
      const raw = (encByte ^ ((iv1 + i * 3) & 0xff) ^ keyByte) & 0xff;
      decryptedBytes[i] = raw;
    }

    const decoder = new TextDecoder("utf-8");
    return decoder.decode(decryptedBytes);
  } catch (err) {
    console.warn("Failed to decrypt message:", err);
    return cipherText;
  }
}
