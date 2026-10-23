"use client";

import { useEffect, useState } from "react";

type Post = { id: string; body: string; mine?: boolean };

export default function Page() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);

  function load() {
    fetch("/api/trust/community")
      .then((res) => res.json())
      .then((data) => setPosts(data.posts ?? []))
      .catch(() => setError("Couldn't load the community."));
  }

  useEffect(() => {
    load();
  }, []);

  async function send() {
    const res = await fetch("/api/trust/community", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      setError(data?.error || "Couldn't post that.");
      return;
    }
    setBody("");
    setError(null);
    load();
  }

  async function report(id: string) {
    await fetch(`/api/trust/community/${id}/report`, { method: "POST" });
    load();
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-8">
      <h1 className="text-lg font-semibold text-ink">Community</h1>
      <p className="mt-1 text-sm text-gray-600">
        Premium and Enterprise. A report hides the message from this list. It
        does not hide the person.
      </p>
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        className="mt-4 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
        rows={3}
        placeholder="Write to other members"
      />
      <button
        type="button"
        onClick={send}
        className="mt-2 cursor-pointer rounded-full bg-orange-500 px-4 py-2 text-sm font-semibold text-white"
      >
        Post
      </button>
      {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
      <ul className="mt-6 space-y-3">
        {posts.map((post) => (
          <li
            key={post.id}
            className="rounded-2xl border border-gray-200 bg-surface p-4 text-sm text-ink"
          >
            <p>{post.body}</p>
            {!post.mine && (
              <button
                type="button"
                onClick={() => report(post.id)}
                className="mt-2 cursor-pointer text-xs text-gray-500 hover:text-red-600"
              >
                Report
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
