"use client";

import { useTheme } from "next-themes";
import { Sun, Moon, LogOut } from "lucide-react";
import { signOut } from "@/lib/auth/client";
import { useRouter } from "next/navigation";

interface TopBarProps {
  user: { name: string; email: string };
}

export function TopBar({ user }: TopBarProps) {
  const { theme, setTheme } = useTheme();
  const router = useRouter();

  async function handleSignOut() {
    await signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="h-14 border-b border-border bg-card flex items-center justify-between px-6 shrink-0">
      <div />
      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground">{user.name}</span>

        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
          aria-label="تغيير المظهر"
        >
          {theme === "dark" ? (
            <Sun className="h-4 w-4" />
          ) : (
            <Moon className="h-4 w-4" />
          )}
        </button>

        <button
          onClick={handleSignOut}
          className="flex items-center gap-2 rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
        >
          <LogOut className="h-4 w-4" />
          خروج
        </button>
      </div>
    </header>
  );
}
