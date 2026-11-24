import { streamMediaResponse } from "@/lib/server/posterProxy";

// Generic media API: GET /api/media?ref=... (or ?url=...)
// Covers all images uploaded by users across the application as well as hub assets.
export async function GET(req: Request): Promise<Response> {
  return streamMediaResponse(req, undefined, false);
}

// Generic media API: POST /api/media
// Accepts JSON { ref: string, url?: string, raw?: boolean, mask?: boolean }
export async function POST(req: Request): Promise<Response> {
  return streamMediaResponse(req, undefined, true);
}
