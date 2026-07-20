import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

// Receives Meta's delivery-status callbacks (sent/delivered/read/failed) for
// messages sent via scripts/send-whatsapp.js — that script only gets a WAMID
// back synchronously; whether the message actually reached the device is
// reported here, asynchronously, by Meta. Not used by the app itself.
//
// One-time setup:
//   1. Set META_WEBHOOK_VERIFY_TOKEN in .env (any string you invent).
//   2. Point Meta at this route: developers.facebook.com > your app >
//      WhatsApp > Configuration > Webhook > Edit. Callback URL is this route's
//      public URL (locally, tunnel it first: `ngrok http 4001`, then use the
//      https://*.ngrok-free.app/api/whatsapp/webhook URL it prints). Verify
//      token = the same value as META_WEBHOOK_VERIFY_TOKEN.
//   3. Under "Webhook fields", subscribe to "messages" (covers status updates
//      too — there's no separate "statuses" field).
//   4. Optional but recommended: set META_APP_SECRET (developers.facebook.com
//      > your app > Settings > Basic > App Secret) so POSTs are verified as
//      genuinely from Meta. Skipped (with a console warning) when unset.
//
// Then watch this server's console while running send-whatsapp.js — each
// status line is tagged with the WAMID the script printed on send.

const VERIFY_TOKEN = process.env.META_WEBHOOK_VERIFY_TOKEN;
const APP_SECRET = process.env.META_APP_SECRET;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token && VERIFY_TOKEN && token === VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 });
  }
  console.warn(
    `[WhatsApp webhook] verification challenge rejected (mode=${mode}, token matched=${token === VERIFY_TOKEN})`,
  );
  return new NextResponse("Forbidden", { status: 403 });
}

function signatureValid(raw: string, header: string | null, secret: string) {
  if (!header) return false;
  const digest = `sha256=${crypto.createHmac("sha256", secret).update(raw).digest("hex")}`;
  const a = Buffer.from(digest);
  const b = Buffer.from(header);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

type MetaStatus = {
  id: string;
  status: string;
  recipient_id: string;
  errors?: { code: number; title: string; error_data?: { details?: string } }[];
};

export async function POST(req: NextRequest) {
  const raw = await req.text();

  if (APP_SECRET) {
    if (
      !signatureValid(raw, req.headers.get("x-hub-signature-256"), APP_SECRET)
    ) {
      console.warn(
        "[WhatsApp webhook] rejected: signature mismatch — check META_APP_SECRET matches the Meta app sending this webhook",
      );
      return new NextResponse("Invalid signature", { status: 401 });
    }
  } else {
    console.warn(
      "[WhatsApp webhook] META_APP_SECRET not set — accepting this POST unverified",
    );
  }

  const body = JSON.parse(raw);
  const statuses: MetaStatus[] =
    body?.entry?.[0]?.changes?.[0]?.value?.statuses ?? [];

  for (const status of statuses) {
    if (status.status === "failed") {
      const details = (status.errors ?? [])
        .map(
          (e) =>
            `${e.code} ${e.title}${e.error_data?.details ? ` — ${e.error_data.details}` : ""}`,
        )
        .join("; ");
      console.error(
        `[WhatsApp webhook] FAILED → ${status.recipient_id} (msg ${status.id}): ${details || "no error details"}`,
      );
    } else {
      // sent | delivered | read
      console.log(
        `[WhatsApp webhook] ${status.status} → ${status.recipient_id} (msg ${status.id})`,
      );
    }
  }

  return NextResponse.json({ ok: true });
}
