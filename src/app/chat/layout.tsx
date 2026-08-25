import { ChatHeader } from "@/components/chat/ChatHeader";
import { SEARCH_CONVERSATION_ID_STORAGE_KEY } from "@/lib/searchConversation";

// Runs synchronously during HTML parsing, BEFORE the page below ever
// paints — the server-rendered HTML can't know whether this browser has a
// stored conversation (that lives in localStorage), so without this a
// returning buyer always saw the fresh-start greeting flash up first and
// only then get swapped for the resume loader once React hydrated. Same
// pre-paint inline-script pattern theme toggles use. Sets a root attribute
// that globals.css's .velte-resume-* rules key off: stored conversation →
// the static resume loader paints first and the hero stays hidden until
// SearchHome's own rehydrate state takes over (and removes the attribute);
// no stored conversation (or localStorage unavailable) → attribute never
// set, hero paints exactly as before. A ?q=&auto=1 hero handoff is
// excluded here for the same reason SearchHome's rehydrate skips it: that's
// a deliberately fresh search, not a resume.
const PRE_PAINT_RESUME_CHECK = `try{var p=new URLSearchParams(location.search);if(localStorage.getItem(${JSON.stringify(SEARCH_CONVERSATION_ID_STORAGE_KEY)})&&!(p.get("q")&&p.get("auto")==="1")){document.documentElement.setAttribute("data-velte-resume","")}}catch(e){}`;

// The /chat shell — wraps /chat itself. No sidebar (2026-08-18, removed per
// explicit product direction — "not needed again"): buyers have no account
// to navigate a sidebar's worth of pages for, and a vendor browsing /chat
// can already get back to their own dashboard via the header's avatar link.
// Owns the full-viewport height/scroll boundary that SearchHome.tsx used to
// own on its own — ChatHeader is `shrink-0`, the content below takes the
// rest via `flex-1 min-h-0` and owns its own internal scrolling.
export default function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="h-dvh flex flex-col overflow-hidden bg-white">
      <script dangerouslySetInnerHTML={{ __html: PRE_PAINT_RESUME_CHECK }} />
      <ChatHeader />
      <div className="flex-1 min-h-0 overflow-hidden">{children}</div>
    </div>
  );
}
