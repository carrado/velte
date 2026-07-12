const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

// Resize to maxPx on the longest side and encode as WebP at the given quality.
// Falls back to the original file if the browser doesn't support Canvas or toBlob.
function compressImage(file: File, maxPx = 1200, quality = 0.8): Promise<File> {
  return new Promise((resolve) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const scale = Math.min(1, maxPx / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas
        .getContext("2d")!
        .drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (blob) =>
          resolve(
            blob
              ? new File([blob], file.name.replace(/\.[^.]+$/, ".webp"), {
                  type: "image/webp",
                })
              : file,
          ),
        "image/webp",
        quality,
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(file);
    };

    img.src = objectUrl;
  });
}

export async function uploadProductMedia(
  file: File,
  resourceType: "image" | "video" = "image",
  folder = "velte/products",
): Promise<string> {
  if (!CLOUD_NAME || !UPLOAD_PRESET) {
    throw new Error(
      "Cloudinary is not configured — add NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME and NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET to your .env",
    );
  }

  const uploadFile =
    resourceType === "image" ? await compressImage(file) : file;

  const form = new FormData();
  form.append("file", uploadFile);
  form.append("upload_preset", UPLOAD_PRESET);
  form.append("folder", folder);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/${resourceType}/upload`,
    { method: "POST", body: form },
  );

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(
      (body as { error?: { message?: string } }).error?.message ??
        "Media upload failed",
    );
  }

  const data = (await res.json()) as { secure_url: string };
  return data.secure_url;
}

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 2 * 1024 * 1024; // 2 MB

// Cloudinary auto-optimizes format (serves WebP/AVIF per what the requesting
// browser supports) and quality on the fly through this transform — a large
// bandwidth cut per view, which is what actually scales with buyer traffic
// (not upload volume, which is already low thanks to compressImage above).
// Safe no-op on a non-Cloudinary URL.
export function optimizedImageUrl(url: string): string {
  if (!url.includes("res.cloudinary.com/") || !url.includes("/upload/"))
    return url;
  return url.replace("/upload/", "/upload/f_auto,q_auto/");
}

export function validateImageFile(file: File): string | null {
  if (!ALLOWED_TYPES.includes(file.type))
    return "Only JPG, PNG, or WebP images are allowed";
  if (file.size > MAX_BYTES) return "Photo must be under 2MB";
  return null;
}

export async function uploadAvatarToCloudinary(file: File): Promise<string> {
  if (!CLOUD_NAME || !UPLOAD_PRESET) {
    throw new Error(
      "Cloudinary is not configured — add NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME and NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET to your .env",
    );
  }

  const form = new FormData();
  form.append("file", file);
  form.append("upload_preset", UPLOAD_PRESET);
  form.append("folder", "velte/avatars");

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
    { method: "POST", body: form },
  );

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(
      (body as { error?: { message?: string } }).error?.message ??
        "Upload failed",
    );
  }

  const data = (await res.json()) as { secure_url: string };
  return data.secure_url;
}
