import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { appendFileSync, existsSync, writeFileSync } from "fs";
import path from "path";

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

// Delivery failures land here (distinct from send-vendor-prelaunch.js's own
// results log, which only records whether Meta ACCEPTED the send — a
// message can be accepted and still fail delivery minutes/days later, which
// is what this callback reports). send-vendor-prelaunch.js's --retry-failed
// reads this file back; nothing else in the app touches it. Dev-only in
// practice (this route has no durable disk on Vercel), which matches how
// these scripts are actually run — see this route's own setup comment above.
const FAILURES_PATH = path.join(
  process.cwd(),
  "scripts",
  "data",
  "whatsapp-delivery-failures.csv",
);

function csvField(v: unknown) {
  return `"${String(v ?? "").replace(/"/g, '""')}"`;
}

function appendDeliveryFailure(row: {
  phone: string;
  wamid: string;
  errorCode: string;
  errorMessage: string;
}) {
  try {
    if (!existsSync(FAILURES_PATH)) {
      writeFileSync(
        FAILURES_PATH,
        "phone,wamid,errorCode,errorMessage,timestamp\n",
      );
    }
    appendFileSync(
      FAILURES_PATH,
      [
        row.phone,
        row.wamid,
        row.errorCode,
        row.errorMessage,
        new Date().toISOString(),
      ]
        .map(csvField)
        .join(",") + "\n",
    );
  } catch (err) {
    // Never let logging the failure itself break the webhook response —
    // Meta expects a prompt 200 regardless.
    console.warn(
      "[WhatsApp webhook] couldn't write delivery-failure log:",
      err,
    );
  }
}

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
      appendDeliveryFailure({
        phone: status.recipient_id,
        wamid: status.id,
        errorCode: String(status.errors?.[0]?.code ?? ""),
        errorMessage: details || "no error details",
      });
    } else {
      // sent | delivered | read
      console.log(
        `[WhatsApp webhook] ${status.status} → ${status.recipient_id} (msg ${status.id})`,
      );
    }
  }

  return NextResponse.json({ ok: true });
}
