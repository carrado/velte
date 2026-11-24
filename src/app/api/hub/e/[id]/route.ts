import { streamMediaResponse } from "@/lib/server/posterProxy";

// Legacy GET /api/hub/e/[id]: delegates to the generic media proxy logic
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await params;
  return streamMediaResponse(req, id, true);
}
