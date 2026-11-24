import { streamMediaResponse } from "@/lib/server/posterProxy";

// Backward-compatible hub media route: delegates to the generic media proxy logic
export async function POST(req: Request): Promise<Response> {
  return streamMediaResponse(req, undefined, true);
}

export async function GET(req: Request): Promise<Response> {
  return streamMediaResponse(req, undefined, true);
}
