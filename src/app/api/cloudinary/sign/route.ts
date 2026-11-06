import { NextResponse } from "next/server";
import { signCloudinaryUpload } from "@/lib/server/cloudinary";

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as {
      folder?: string;
      profile?: "advert" | "default";
    };

    let folder = (body.folder || "velte/products").trim();
    // Safety check: ensure uploads stay scoped to the velte namespace
    if (!folder.startsWith("velte/") && folder !== "velte") {
      folder = `velte/${folder.replace(/^\/+/, "")}`;
    }

    const profile = body.profile === "advert" ? "advert" : "default";
    const signResult = signCloudinaryUpload({ folder, profile });

    return NextResponse.json(signResult);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to sign Cloudinary upload";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
