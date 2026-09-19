/**
 * Firebase Storage is completely bypassed.
 * Images are encoded directly into compressed Base64 strings ("شفرة كود الصورة")
 * and stored inline inside Firestore documents.
 */
export { encodeImageToBase64 } from "@/lib/utils/imageEncoder";
