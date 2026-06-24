import { NextResponse } from "next/server";

import { requireAuth, fail } from "@/lib/server/guards";
import { backendFetch } from "@/lib/server/backend";

type Ctx = { params: Promise<{ id: string }> };

// GET /api/users/:id
export async function GET(_req: Request, { params }: Ctx) {
  const gate = await requireAuth();
  if ("response" in gate) return gate.response;
  const { id } = await params;
  try {
    const data = await backendFetch(`/users/${id}`, { cookie: gate.cookie });
    return NextResponse.json(data);
  } catch (err) {
    return fail(err, "Failed to load user.");
  }
}

// PATCH /api/users/:id
export async function PATCH(req: Request, { params }: Ctx) {
  const gate = await requireAuth();
  if ("response" in gate) return gate.response;
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  try {
    const { user } = await backendFetch<{ user: Record<string, unknown> }>(
      `/users/${id}`,
      { method: "PATCH", body, cookie: gate.cookie },
    );
    return NextResponse.json({ user });
  } catch (err) {
    return fail(err, "Failed to update user.");
  }
}

// DELETE /api/users/:id
export async function DELETE(_req: Request, { params }: Ctx) {
  const gate = await requireAuth();
  if ("response" in gate) return gate.response;
  const { id } = await params;
  try {
    await backendFetch(`/users/${id}`, {
      method: "DELETE",
      cookie: gate.cookie,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return fail(err, "Failed to delete user.");
  }
}
