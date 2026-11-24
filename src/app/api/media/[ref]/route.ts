import { streamMediaResponse } from "@/lib/server/posterProxy";

// Path-based media API: GET /api/media/[ref]
export async function GET(
  req: Request,
  { params }: { params: Promise<{ ref: string }> },
): Promise<Response> {
  const { ref } = await params;
  return streamMediaResponse(req, ref, false);
}
