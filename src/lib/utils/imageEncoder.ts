/**
 * Image compression & Base64 encoder utility.
 * Encodes images directly into compressed Base64 strings ("شفرة كود الصورة").
 * Stores directly in Firestore messages without requiring Firebase Storage or bucket setup.
 */
export function encodeImageToBase64(
  file: File,
  maxWidth: number = 380,
  quality: number = 0.6
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Failed to get canvas context"));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        // Generates data:image/jpeg;base64,... string
        const base64Code = canvas.toDataURL("image/jpeg", quality);
        resolve(base64Code);
      };
      img.onerror = (err) => reject(err);
      img.src = e.target?.result as string;
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}
