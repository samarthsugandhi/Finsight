"use client";

import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { Button } from "@/components/ui";
import { Sun, Moon, Menu as MenuIcon } from "lucide-react";

export default function DashboardHeader({ onMenuClick }) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="border-b border-line bg-paper-raised transition-colors duration-300">
      <div className="flex items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <div className="flex items-center gap-3">
          {/* Mobile nav toggle — only shown on pages that pass a handler (i.e. have a sidebar) */}
          {onMenuClick && (
            <button
              onClick={onMenuClick}
              aria-label="Open navigation"
              className="rounded-md p-2 text-ink hover:bg-ink/5 transition-colors focus-visible:outline-none cursor-pointer lg:hidden"
            >
              <MenuIcon className="h-5 w-5" />
            </button>
          )}

          {user && (
            <p className="font-editorial text-xs text-ink-soft sm:text-sm">
              Welcome back, <span className="font-semibold text-ink">{user.name}</span>
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {/* Light / Dark Mode Toggle */}
          <button
            onClick={toggleTheme}
            className="p-2.5 rounded-md border border-line text-ink hover:bg-ink/5 transition-colors focus-visible:outline-none flex items-center justify-center cursor-pointer"
            title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            {theme === "dark" ? (
              <Sun className="h-4 w-4 text-horizon animate-pulse" />
            ) : (
              <Moon className="h-4 w-4 text-horizon" />
            )}
          </button>



          <Button variant="ghost" onClick={logout} className="font-editorial font-semibold">
            Log out
          </Button>
        </div>
      </div>
    </header>
  );
}
