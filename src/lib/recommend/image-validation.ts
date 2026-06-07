const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export function validateImageFile(file: File) {
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    return "Upload a JPEG, PNG or WebP image.";
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return "Images must be 5 MB or smaller.";
  }
  return null;
}

export function validateImageDataUrl(imageDataUrl?: string) {
  if (!imageDataUrl) return;

  const match = imageDataUrl.match(/^data:(image\/(?:jpeg|png|webp));base64,([a-z0-9+/=]+)$/i);
  if (!match) {
    throw new Error("Uploaded image must be a base64 JPEG, PNG or WebP.");
  }

  const estimatedBytes = Math.floor((match[2].length * 3) / 4);
  if (estimatedBytes > MAX_IMAGE_BYTES) {
    throw new Error("Uploaded image must be 5 MB or smaller.");
  }
}
