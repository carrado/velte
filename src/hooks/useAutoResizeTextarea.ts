"use client";

import { useEffect, useRef, type FormEvent } from "react";

function resize(el: HTMLTextAreaElement) {
  el.style.height = "auto";
  el.style.height = `${el.scrollHeight}px`;
}

// Grows a <textarea> to fit its content instead of scrolling internally —
// same feel as a chat composer (lifted from SearchHome's composer, which
// had this inline). `onInput` covers typing for both controlled and
// uncontrolled textareas; the `value` effect additionally re-measures on a
// PROGRAMMATIC change (e.g. clearing the field after submit), which typing
// alone wouldn't catch since no native `input` event fires for that.
export function useAutoResizeTextarea(value?: string) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (el) resize(el);
  }, [value]);

  return {
    ref,
    onInput: (e: FormEvent<HTMLTextAreaElement>) => resize(e.currentTarget),
  };
}
