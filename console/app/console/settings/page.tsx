import { redirect } from "next/navigation";

/** Settings has no root screen; profile is the default tab. */
export default function SettingsIndex() {
  redirect("/console/settings/profile");
}
