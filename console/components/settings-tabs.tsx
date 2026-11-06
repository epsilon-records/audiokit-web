"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/console/settings/profile", label: "Profile" },
  { href: "/console/settings/billing", label: "Billing" },
  { href: "/console/settings/notifications", label: "Notifications" },
  { href: "/console/settings/account", label: "Account" },
];

export function SettingsTabs() {
  const pathname = usePathname();
  return (
    <nav className="tabs" aria-label="Settings">
      {tabs.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          aria-current={pathname === tab.href ? "page" : undefined}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
