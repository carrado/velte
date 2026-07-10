"use client";

import { useState } from "react";
import { Send } from "lucide-react";
import type { Clarification } from "@/types/search";

// Renders askClarifyingQuestionTool's structured widget metadata (see
// systemPrompt.ts) — the question TEXT itself is already shown above this
// as the turn's normal reply; this is just the answer affordance: either a
// row of pill buttons ("choice") or a small dedicated input ("text"),
// deliberately distinct from the main composer at the bottom of the page.
// No internal disabled/loading state — the parent appends a new turn the
// instant `onAnswer` fires, which (via the `isLatest` gate in SearchHome)
// unmounts this widget before a double-submit is possible.
export function ClarificationPrompt({
  clarification,
  onAnswer,
}: {
  clarification: Clarification;
  onAnswer: (text: string) => void;
}) {
  const [value, setValue] = useState("");

  if (clarification.kind === "choice") {
    return (
      <div className="flex flex-wrap gap-2">
        {clarification.options.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => onAnswer(option)}
            className="px-4 py-2 rounded-full border border-orange-200 bg-orange-50/50 text-sm font-medium text-orange-700 hover:bg-orange-100 transition-colors cursor-pointer"
          >
            {option}
          </button>
        ))}
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const trimmed = value.trim();
        if (!trimmed) return;
        onAnswer(trimmed);
      }}
      className="flex items-center gap-1.5 bg-white rounded-xl border border-orange-200 pl-3.5 pr-1.5 h-11 max-w-md focus-within:ring-2 focus-within:ring-orange-500/30 focus-within:border-orange-500"
    >
      <input
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Type your answer…"
        className="flex-1 min-w-0 h-full outline-none text-sm bg-transparent"
      />
      <button
        type="submit"
        disabled={!value.trim()}
        title="Send"
        className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:hover:bg-orange-500 text-white transition-colors"
      >
        <Send size={14} />
      </button>
    </form>
  );
}
