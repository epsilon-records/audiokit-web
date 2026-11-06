import { redirect } from "next/navigation";

/** The console's root is the dashboard; the public site lives at audiokit.ai. */
export default function Home() {
  redirect("/console");
}
