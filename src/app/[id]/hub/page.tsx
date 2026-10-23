import { redirect } from "next/navigation";

// The vendor Hub shares /hub with the buyer directory. The dashboard nav
// points straight there; this keeps an old /{id}/hub bookmark on the same page.
export default function Page() {
  redirect("/hub");
}
