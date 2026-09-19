/**
 * High-performance Image Compression & Base64 Encoder.
 * Encodes photos directly into optimized Base64 strings.
 * Compatible with all mobile camera captures (iOS / Android / Desktop).
 */
export async function encodeImageToBase64(
  file: File,
  maxDimension: number = 640,
  quality: number = 0.65
): Promise<string> {
  return new Promise((resolve, reject) => {
    // Attempt modern createImageBitmap for proper EXIF orientation handling
    if (typeof window !== "undefined" && "createImageBitmap" in window) {
      createImageBitmap(file)
        .then((bitmap) => {
          let width = bitmap.width;
          let height = bitmap.height;

          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = Math.round((height * maxDimension) / width);
              width = maxDimension;
            } else {
              width = Math.round((width * maxDimension) / height);
              height = maxDimension;
            }
          }

          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext("2d");
          if (!ctx) {
            bitmap.close();
            throw new Error("Failed to create canvas context");
          }

          ctx.drawImage(bitmap, 0, 0, width, height);
          bitmap.close();

          const base64 = canvas.toDataURL("image/jpeg", quality);
          resolve(base64);
        })
        .catch(() => {
          // Fallback to FileReader + HTMLImageElement if createImageBitmap fails
          fallbackEncode(file, maxDimension, quality, resolve, reject);
        });
    } else {
      fallbackEncode(file, maxDimension, quality, resolve, reject);
    }
  });
}

function fallbackEncode(
  file: File,
  maxDimension: number,
  quality: number,
  resolve: (val: string) => void,
  reject: (err: any) => void
) {
  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      let width = img.width;
      let height = img.height;

      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Failed to get canvas context"));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);
      const base64 = canvas.toDataURL("image/jpeg", quality);
      resolve(base64);
    };
    img.onerror = (err) => reject(err);
    img.src = e.target?.result as string;
  };
  reader.onerror = (err) => reject(err);
  reader.readAsDataURL(file);
}
