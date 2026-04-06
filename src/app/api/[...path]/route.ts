// src/app/api/[...path]/route.ts
import { NextRequest, NextResponse } from "next/server";

const API_BASE = process.env.BACKEND_API_URL || "http://localhost:5000/api";

async function proxyRequest(
  req: NextRequest,
  pathSegments: string[],
  method: string,
) {
  const backendUrl = `${API_BASE}/${pathSegments.join("/")}`;
  const body =
    method !== "GET" ? await req.json().catch(() => ({})) : undefined;

  const response = await fetch(backendUrl, {
    method,
    headers: {
      "Content-Type": "application/json",
      // Forward cookies from the original request to the backend
      Cookie: req.headers.get("cookie") || "",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await response.json().catch(() => ({}));
  const nextResponse = NextResponse.json(data, { status: response.status });

  // Forward Set-Cookie header from backend to the client
  const setCookie = response.headers.get("set-cookie");
  if (setCookie) {
    nextResponse.headers.set("Set-Cookie", setCookie);
  }

  return nextResponse;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params; // ✅ Await the Promise
  return proxyRequest(req, path, "POST");
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  return proxyRequest(req, path, "GET");
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  return proxyRequest(req, path, "PATCH");
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  return proxyRequest(req, path, "DELETE");
}
