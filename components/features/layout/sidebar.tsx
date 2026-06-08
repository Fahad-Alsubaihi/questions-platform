"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Brain,
  ListChecks,
  Sparkles,
  BookOpen,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/queue", label: "طابور المراجعة", icon: ListChecks },
  { href: "/generate", label: "توليد أسئلة", icon: Sparkles },
  { href: "/approved", label: "الأسئلة المعتمدة", icon: BookOpen },
];

const adminItems = [
  { href: "/settings", label: "الإعدادات", icon: Settings },
];

interface SidebarProps {
  userRole: string;
}

export function Sidebar({ userRole }: SidebarProps) {
  const pathname = usePathname();

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  return (
    <aside className="w-64 flex flex-col border-l border-border bg-card shrink-0">
      <div className="flex items-center gap-2 px-6 py-5 border-b border-border">
        <Brain className="h-5 w-5 text-primary" />
        <span className="font-bold text-foreground">منصة الأسئلة</span>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              isActive(href)
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {label}
          </Link>
        ))}

        {userRole === "admin" && (
          <>
            <div className="pt-4 pb-1 px-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                المشرف
              </p>
            </div>
            {adminItems.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  isActive(href)
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {label}
              </Link>
            ))}
          </>
        )}
      </nav>
    </aside>
  );
}
