import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { SettingsTabs } from "@/components/settings-tabs";

export const metadata: Metadata = { title: "Settings" };

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PageHeader
        title="Settings"
        description="Profile, billing, notifications and account controls."
      />
      <SettingsTabs />
      {children}
    </>
  );
}
