import crypto from "crypto";

export interface CloudinaryProfileConfig {
  cloudName: string;
  apiKey?: string;
  apiSecret?: string;
  uploadPreset?: string;
}

function parseCloudinaryUrl(rawUrl?: string | null): {
  cloudName?: string;
  apiKey?: string;
  apiSecret?: string;
} | null {
  if (!rawUrl) return null;
  const trimmed = rawUrl.trim();
  const match = trimmed.match(/^cloudinary:\/\/([^:]+):([^@]+)@(.+)$/);
  if (!match) return null;
  return {
    apiKey: match[1],
    apiSecret: match[2],
    cloudName: match[3],
  };
}

export function getCloudinaryConfig(
  profile: "advert" | "default" = "default",
): CloudinaryProfileConfig {
  const parsedDefaultUrl = parseCloudinaryUrl(process.env.CLOUDINARY_URL);
  const parsedAdvertUrl = parseCloudinaryUrl(process.env.CLOUDINARY_ADVERT_URL);

  const defaultCloudName =
    process.env.CLOUDINARY_CLOUD_NAME ||
    parsedDefaultUrl?.cloudName ||
    process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ||
    "";
  const defaultApiKey =
    process.env.CLOUDINARY_API_KEY ||
    parsedDefaultUrl?.apiKey ||
    process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY ||
    "";
  const defaultApiSecret =
    process.env.CLOUDINARY_API_SECRET || parsedDefaultUrl?.apiSecret || "";
  const defaultUploadPreset =
    process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || "";

  if (profile === "advert") {
    const advertCloudName =
      process.env.CLOUDINARY_ADVERT_CLOUD_NAME ||
      parsedAdvertUrl?.cloudName ||
      process.env.NEXT_PUBLIC_CLOUDINARY_ADVERT_CLOUD_NAME ||
      defaultCloudName;
    const advertApiKey =
      process.env.CLOUDINARY_ADVERT_API_KEY ||
      parsedAdvertUrl?.apiKey ||
      process.env.NEXT_PUBLIC_CLOUDINARY_ADVERT_API_KEY ||
      defaultApiKey;
    const advertApiSecret =
      process.env.CLOUDINARY_ADVERT_API_SECRET ||
      parsedAdvertUrl?.apiSecret ||
      defaultApiSecret;
    const advertUploadPreset =
      process.env.NEXT_PUBLIC_CLOUDINARY_ADVERT_UPLOAD_PRESET ||
      defaultUploadPreset;

    return {
      cloudName: advertCloudName,
      apiKey: advertApiKey,
      apiSecret: advertApiSecret,
      uploadPreset: advertUploadPreset,
    };
  }

  return {
    cloudName: defaultCloudName,
    apiKey: defaultApiKey,
    apiSecret: defaultApiSecret,
    uploadPreset: defaultUploadPreset,
  };
}

export interface CloudinarySignResult {
  mode: "signed" | "unsigned";
  cloudName: string;
  apiKey?: string;
  timestamp?: number;
  signature?: string;
  folder: string;
  uploadPreset?: string;
}

export function signCloudinaryUpload(options: {
  folder: string;
  profile?: "advert" | "default";
}): CloudinarySignResult {
  const config = getCloudinaryConfig(options.profile ?? "default");

  if (!config.cloudName) {
    throw new Error(
      "Cloudinary is not configured. Add CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET to your .env",
    );
  }

  // If API Key and API Secret are provided, generate secure signed upload credentials
  if (config.apiKey && config.apiSecret) {
    const timestamp = Math.floor(Date.now() / 1000);
    const paramsToSign: Record<string, string | number> = {
      folder: options.folder,
      timestamp,
    };

    const sortedKeys = Object.keys(paramsToSign).sort();
    const stringToSign =
      sortedKeys.map((key) => `${key}=${paramsToSign[key]}`).join("&") +
      config.apiSecret;

    const signature = crypto
      .createHash("sha1")
      .update(stringToSign)
      .digest("hex");

    return {
      mode: "signed",
      cloudName: config.cloudName,
      apiKey: config.apiKey,
      timestamp,
      signature,
      folder: options.folder,
    };
  }

  // Fallback to unsigned upload preset if present
  if (config.uploadPreset) {
    return {
      mode: "unsigned",
      cloudName: config.cloudName,
      uploadPreset: config.uploadPreset,
      folder: options.folder,
    };
  }

  throw new Error(
    "Cloudinary credentials missing: please add CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET to your .env",
  );
}

export async function uploadToCloudinaryServer(
  fileData: Buffer | Uint8Array | string,
  options: {
    folder: string;
    profile?: "advert" | "default";
    filename?: string;
  },
): Promise<string> {
  const signResult = signCloudinaryUpload({
    folder: options.folder,
    profile: options.profile,
  });

  const form = new FormData();
  if (typeof fileData === "string") {
    form.append("file", fileData);
  } else {
    const arrayBuffer = fileData.buffer.slice(
      fileData.byteOffset,
      fileData.byteOffset + fileData.byteLength,
    ) as ArrayBuffer;
    const blob = new Blob([arrayBuffer]);
    form.append("file", blob, options.filename || "upload.png");
  }

  if (signResult.mode === "signed") {
    form.append("api_key", signResult.apiKey!);
    form.append("timestamp", String(signResult.timestamp!));
    form.append("signature", signResult.signature!);
    form.append("folder", signResult.folder);
  } else {
    form.append("upload_preset", signResult.uploadPreset!);
    form.append("folder", signResult.folder);
  }

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${signResult.cloudName}/image/upload`,
    {
      method: "POST",
      body: form,
    },
  );

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(
      (body as { error?: { message?: string } }).error?.message ??
        "Server-side Cloudinary upload failed",
    );
  }

  const data = (await res.json()) as { secure_url: string };
  return data.secure_url;
}
