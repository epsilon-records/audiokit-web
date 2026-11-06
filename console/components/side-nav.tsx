"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  DashboardIcon,
  ExternalIcon,
  KeyIcon,
  PlanIcon,
  SettingsIcon,
  UsageIcon,
} from "./icons";

const items = [
  { href: "/console", label: "Dashboard", icon: DashboardIcon, exact: true },
  { href: "/console/usage", label: "Usage", icon: UsageIcon },
  { href: "/console/api-keys", label: "API keys", icon: KeyIcon },
  { href: "/console/plan", label: "Plan", icon: PlanIcon },
  { href: "/console/settings/profile", label: "Settings", icon: SettingsIcon, match: "/console/settings" },
];

export function SideNav({ apiVersion }: { apiVersion: string }) {
  const pathname = usePathname();

  function isCurrent(item: (typeof items)[number]) {
    if (item.exact) return pathname === item.href;
    if (item.match) return pathname.startsWith(item.match);
    return pathname === item.href || pathname.startsWith(`${item.href}/`);
  }

  return (
    <>
      <nav className="side-nav" aria-label="Console">
        {items.map((item) => {
          const Icon = item.icon;
          const current = isCurrent(item);
          return (
            <Link key={item.href} href={item.href} aria-current={current ? "page" : undefined}>
              <span className="nav-icon">
                <Icon />
              </span>
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="side-foot">
        <a href="https://audiokit.ai/docs/" target="_blank" rel="noopener noreferrer">
          Docs <ExternalIcon />
        </a>
        <a href="https://status.audiokit.ai/" target="_blank" rel="noopener noreferrer">
          Status <ExternalIcon />
        </a>
        <span className="version">API v{apiVersion}</span>
      </div>
    </>
  );
}
