import { redirect } from "next/navigation";

// The buyer Hub has its own page, outside the chat shell.
export default function Page() {
  redirect("/hub");
}
