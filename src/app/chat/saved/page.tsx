"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function Page() {
  const [query, setQuery] = useState("");
  const [rows, setRows] = useState<{ id: string; query: string }[]>([]);
  const [error, setError] = useState<string | null>(null);

  function load() {
    fetch("/api/trust/saved-searches")
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok)
          throw new Error(body.error || "Sign in to see saved searches.");
        setRows(body.searches ?? []);
      })
      .catch((err) => setError(err.message));
  }

  useEffect(() => {
    load();
  }, []);

  async function save() {
    const res = await fetch("/api/trust/saved-searches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.error || "Couldn't save that.");
      return;
    }
    setQuery("");
    load();
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-8">
      <h1 className="text-lg font-semibold text-ink">Saved searches</h1>
      <div className="mt-4 flex gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="What you want to find again"
          className="min-w-0 flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm"
        />
        <button
          type="button"
          onClick={save}
          className="cursor-pointer rounded-full bg-orange-500 px-4 py-2 text-sm font-semibold text-white"
        >
          Save
        </button>
      </div>
      {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
      <ul className="mt-6 space-y-2">
        {rows.map((row) => (
          <li key={row.id}>
            <Link
              href={`/chat?q=${encodeURIComponent(row.query)}`}
              className="text-sm text-ink hover:text-orange-600"
            >
              {row.query}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
