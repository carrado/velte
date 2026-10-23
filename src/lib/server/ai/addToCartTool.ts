import { tool } from "ai";
import { z } from "zod";

import { backendData } from "@/lib/server/backend";
import { addingToCartPhrase } from "@/lib/server/ai/statusPhrases";
import { resolveShownProduct } from "@/lib/server/ai/shownCatalog";
import type { ShownProduct } from "@/types/search";
import type { CartAddOutcome, CartLine } from "@/types/cart";

export type AddToCartInput = {
  productId?: string;
  ordinal?: number;
  nameHint?: string;
  quantity?: number;
  options?: { groupName: string; optionName: string }[];
};

export type RunAddToCartOpts = {
  auth: { buyerId: string; cookie: string } | null;
  catalog: ShownProduct[];
  cartVendorId?: string | null;
  cartVendorName?: string | null;
  conversationId?: string | null;
};

/**
 * The AI proposes; code executes. Shared by the addToCart tool AND the
 * deterministic cart-intent short-circuit in route.ts — "add the exact
 * match" must never depend on the model picking this tool.
 */
export async function runAddToCart(
  opts: RunAddToCartOpts,
  input: AddToCartInput,
): Promise<CartAddOutcome> {
  const qty = input.quantity ?? 1;
  const hint = `${input.nameHint ?? ""} ${input.productId ?? ""}`.toLowerCase();
  if (/\b(jumia|konga|jiji|amazon)\b/.test(hint) && !input.productId) {
    const outcome: CartAddOutcome = {
      status: "external",
      reason:
        "That listing is on another site. Tap its own link — it can't go in a Velte cart.",
    };
    logCartTool(opts.conversationId, null, outcome.status);
    return outcome;
  }

  const shown = resolveShownProduct(opts.catalog, {
    productId: input.productId,
    ordinal: input.ordinal,
    nameHint: input.nameHint,
  });
  if (!shown) {
    const outcome: CartAddOutcome = {
      status: "not_shown",
      reason:
        "I can only add a listing I just showed. Pick one of the cards above.",
    };
    logCartTool(opts.conversationId, input.productId ?? null, outcome.status);
    return outcome;
  }

  if (!opts.auth) {
    const outcome: CartAddOutcome = {
      status: "needs_signin",
      productId: shown.productId,
      quantity: qty,
      name: shown.name,
      vendorId: shown.vendorId,
      vendorName: shown.vendorName,
      imageUrl: null,
      unitPrice: null,
    };
    logCartTool(opts.conversationId, shown.productId, outcome.status);
    return outcome;
  }

  let validated: CartAddOutcome;
  try {
    validated = await backendData<CartAddOutcome>("/cart/validate-add", {
      method: "POST",
      cookie: opts.auth.cookie,
      body: {
        productId: shown.productId,
        quantity: qty,
        options: input.options,
        clientRequestId: idempotencyKey(
          shown.productId,
          qty,
          input.options,
        ).slice(0, 80),
      },
    });
  } catch (err) {
    console.error("[cart-tool] validate-add failed:", err);
    const outcome: CartAddOutcome = {
      status: "ineligible",
      reason: "Couldn't add that just now. Try again in a moment.",
    };
    logCartTool(opts.conversationId, shown.productId, "error");
    return outcome;
  }

  if (
    validated.status === "ok" &&
    opts.cartVendorId &&
    validated.line.vendorId !== opts.cartVendorId
  ) {
    const outcome: CartAddOutcome = {
      status: "vendor_mismatch",
      currentVendorName: opts.cartVendorName || "another store",
      line: validated.line,
    };
    logCartTool(opts.conversationId, shown.productId, outcome.status);
    return outcome;
  }

  logCartTool(
    opts.conversationId,
    shown.productId,
    validated.status,
    validated.status === "ok" ? validated.line : undefined,
  );
  return validated;
}

const MAX_QTY = 10;
const MAX_CALLS_PER_TURN = 3;

const inputSchema = z.object({
  productId: z
    .string()
    .optional()
    .describe(
      "The exact productId from the shown-listings list (a Mongo id). Prefer this over ordinal/nameHint whenever you have it. Never invent an id.",
    ),
  ordinal: z
    .number()
    .int()
    .optional()
    .describe(
      "1-based index of the listing on the shown-listings list ('the second one' → 2, 'the last one' → -1). Used only when productId is not known.",
    ),
  nameHint: z
    .string()
    .optional()
    .describe(
      "A short hint like 'the black one' or the listing's own name, resolved in CODE against shown listings. Never a Jumia/Konga/Jiji offer — those are external links, not Velte cart items.",
    ),
  quantity: z
    .number()
    .int()
    .min(1)
    .max(MAX_QTY)
    .optional()
    .describe("How many to add. Defaults to 1. Capped at 10."),
  options: z
    .array(
      z.object({
        groupName: z.string().describe("Modifier group, e.g. Size or Flavour."),
        optionName: z.string().describe("The option the buyer picked."),
      }),
    )
    .optional()
    .describe(
      "Required choices the buyer already gave (size, colour, flavour). Omit when unknown — the tool will return what's missing rather than guessing.",
    ),
});

function idempotencyKey(
  productId: string,
  quantity: number,
  options: { groupName: string; optionName: string }[] | undefined,
): string {
  const opt = (options ?? [])
    .map((o) => `${o.groupName}:${o.optionName}`)
    .sort()
    .join("|");
  return `${productId}:${quantity}:${opt}`;
}

/**
 * The AI proposes; this tool (and the cart backend) executes.
 *
 * Prices, stock, vendor status and totals never come from the model. The
 * listing must already have been shown this request (shown catalog) so
 * "add the second one" / "the black one" resolve to a real id in CODE.
 * Guests get `needs_signin` — they must have a buyer account before
 * anything goes in the cart. Paystack is never opened from here.
 */
export function addToCartTool(opts: {
  auth: { buyerId: string; cookie: string } | null;
  catalogRef: { current: ShownProduct[] };
  cartVendorId?: string | null;
  cartVendorName?: string | null;
  conversationId?: string | null;
  push?: (candidates: string[]) => void;
}) {
  const seen = new Map<string, CartAddOutcome>();
  let calls = 0;

  return tool({
    description:
      "Add a Velte listing the buyer was JUST shown to their in-app cart. Call this — and NEVER searchProducts — when they say 'add it', 'add the exact match', 'add the second one', 'the black one', or similar. Never invent a productId. Never add Jumia/Konga/Jiji. Never charge a card, mention a promo code, or tell them to tap Pay — the cart sidebar handles checkout. Prices and stock come from the database.",
    inputSchema,
    execute: async (input): Promise<CartAddOutcome> => {
      opts.push?.(addingToCartPhrase());
      calls += 1;
      if (calls > MAX_CALLS_PER_TURN) {
        return {
          status: "ineligible",
          reason: "Too many cart updates on this turn.",
        };
      }

      const key = idempotencyKey(
        `${input.productId ?? ""}:${input.ordinal ?? ""}:${input.nameHint ?? ""}`,
        input.quantity ?? 1,
        input.options,
      );
      const cached = seen.get(key);
      if (cached) return cached;

      const outcome = await runAddToCart(
        {
          auth: opts.auth,
          catalog: opts.catalogRef.current,
          cartVendorId: opts.cartVendorId,
          cartVendorName: opts.cartVendorName,
          conversationId: opts.conversationId,
        },
        input,
      );
      seen.set(key, outcome);
      return outcome;
    },
  });
}

function logCartTool(
  conversationId: string | null | undefined,
  productId: string | null,
  status: string,
  line?: CartLine,
) {
  console.info(
    "[cart-tool]",
    JSON.stringify({
      conversationId: conversationId ?? null,
      productId,
      status,
      vendorId: line?.vendorId ?? null,
      quantity: line?.quantity ?? null,
    }),
  );
}
