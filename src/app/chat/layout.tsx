import { ChatHeader } from "@/components/chat/ChatHeader";
import { ConversationSidebar } from "@/components/chat/ConversationSidebar";
import { ReferralCapture } from "@/components/chat/ReferralCapture";
import { PlansModalProvider } from "@/components/plans/PlansModal";
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

// The /chat shell — wraps /chat itself.
//
// 2026-08-18 removed the sidebar per explicit product direction ("not needed
// again"), on the reasoning that buyers had no account to navigate one for.
// 2026-08-26 brings one back — a CONVERSATION sidebar, not the navigation
// sidebar that was removed — because that reasoning no longer holds: buyers
// have accounts, and their past conversations are exactly what those
// accounts are for.
//
// Laid out the ChatGPT way: the sidebar is the outermost left column and
// spans the full viewport height, with the header and thread stacked in
// their own column beside it — so collapsing the sidebar widens the header
// too, rather than leaving it straddling both. On a phone the same component
// becomes a slide-over instead (see ConversationSidebar).
// Owns the full-viewport height/scroll boundary that SearchHome.tsx used to
// own on its own — ChatHeader is `shrink-0`, the content below takes the
// rest via `flex-1 min-h-0` and owns its own internal scrolling.
export default function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // Credits live here as a modal rather than a route (2026-08-31) — the
    // provider wraps the WHOLE shell, header included, because the CTA that
    // opens it lives in ChatHeader. It fetches its own balance on open; the
    // cost table it renders is a plain client-safe import.
    <PlansModalProvider>
      <div className="h-dvh flex overflow-hidden bg-white">
        <script dangerouslySetInnerHTML={{ __html: PRE_PAINT_RESUME_CHECK }} />
        <ReferralCapture />
        <ConversationSidebar />
        {/* `min-w-0` matters: without it this flex child refuses to shrink
          below its content's intrinsic width, and a long result card would
          push the whole thread sideways instead of scrolling inside its own
          container. */}
        <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
          <ChatHeader />
          <div className="flex-1 min-h-0 overflow-hidden">{children}</div>
        </div>
      </div>
    </PlansModalProvider>
  );
}
