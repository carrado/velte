"use client";

import { useEffect } from "react";

import { captureBuyerReferralCode } from "@/lib/buyerReferralCode";

// Remembers a BUYER `?ref=` code the moment someone arrives (2026-08-31).
//
// Rendered once in the chat shell rather than inside the sign-in button,
// because those are two different moments: the link is opened now, the
// account is created later — often several searches later, when the guest
// credits run out. By then the query string is gone.
//
// Renders nothing. It exists to run one effect on mount, which is why it is a
// component at all: the chat layout is a server component and cannot use an
// effect itself.
export function ReferralCapture() {
  useEffect(() => {
    captureBuyerReferralCode();
  }, []);
  return null;
}
