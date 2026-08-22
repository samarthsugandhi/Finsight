"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ArrowLeftRight,
  TrendingUp,
  TrendingDown,
  Wallet,
  Target,
  PieChart,
  HeartPulse,
  BarChart3,
  FileText,
  Settings,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import Logo from "@/components/Logo";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, exact: true },
  {
    label: "Transactions",
    icon: ArrowLeftRight,
    children: [
      { href: "/dashboard/transactions", label: "All Transactions", icon: ArrowLeftRight },
      { href: "/dashboard/income", label: "Income", icon: TrendingUp },
      { href: "/dashboard/expenses", label: "Expenses", icon: TrendingDown },
    ],
  },
  { href: "/dashboard/budgets", label: "Budgets", icon: Wallet },
  { href: "/dashboard/goals", label: "Savings Goals", icon: Target },
  { href: "/dashboard/portfolio", label: "Portfolio", icon: PieChart },
  { href: "/dashboard/financial-health", label: "Financial Health", icon: HeartPulse },
  { href: "/dashboard/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/dashboard/reports", label: "Reports", icon: FileText },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

function isActive(pathname, href, exact) {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavLink({ item, pathname, onNavigate, collapsed }) {
  const active = isActive(pathname, item.href, item.exact);
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      title={collapsed ? item.label : undefined}
      aria-current={active ? "page" : undefined}
      className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-editorial transition-all ${
        collapsed ? "justify-center px-0" : ""
      } ${
        active ? "bg-horizon/15 text-horizon font-semibold" : "text-ink-soft hover:bg-ink/5 hover:text-ink"
      }`}
    >
      <Icon className="h-4 w-4 shrink-0" />
      {!collapsed && <span>{item.label}</span>}
    </Link>
  );
}

function NavGroup({ item, pathname, onNavigate, collapsed }) {
  const Icon = item.icon;
  const groupActive = item.children.some((child) => isActive(pathname, child.href, false));

  if (collapsed) {
    return (
      <div className="flex flex-col gap-1 my-1">
        {item.children.map((child) => (
          <NavLink key={child.href} item={child} pathname={pathname} onNavigate={onNavigate} collapsed={true} />
        ))}
      </div>
    );
  }

  return (
    <div>
      <div
        className={`flex items-center gap-3 px-3 py-2 text-xs font-semibold uppercase tracking-wide ${
          groupActive ? "text-horizon" : "text-ink-soft"
        }`}
      >
        <Icon className="h-4 w-4 shrink-0" />
        <span>{item.label}</span>
      </div>
      <div className="ml-4 flex flex-col gap-1 border-l border-line pl-3">
        {item.children.map((child) => (
          <NavLink key={child.href} item={child} pathname={pathname} onNavigate={onNavigate} collapsed={false} />
        ))}
      </div>
    </div>
  );
}

function SidebarNav({ pathname, onNavigate, collapsed }) {
  return (
    <nav className="flex flex-col gap-1">
      {NAV_ITEMS.map((item) =>
        item.children ? (
          <NavGroup key={item.label} item={item} pathname={pathname} onNavigate={onNavigate} collapsed={collapsed} />
        ) : (
          <NavLink key={item.href} item={item} pathname={pathname} onNavigate={onNavigate} collapsed={collapsed} />
        )
      )}
    </nav>
  );
}

export default function Sidebar({ mobileOpen, onClose }) {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("finsight_sidebar_collapsed");
      if (stored === "true") setIsCollapsed(true);
    } catch {
      // ignore
    }
  }, []);

  function toggleCollapse() {
    const next = !isCollapsed;
    setIsCollapsed(next);
    try {
      localStorage.setItem("finsight_sidebar_collapsed", String(next));
    } catch {
      // ignore
    }
  }

  return (
    <>
      {/* Desktop: persistent sticky non-scrolling sidebar */}
      <aside
        className={`hidden lg:flex lg:sticky lg:top-0 lg:h-screen lg:shrink-0 lg:flex-col lg:border-r lg:border-line lg:bg-paper-raised transition-all duration-300 ${
          isCollapsed ? "lg:w-20" : "lg:w-64"
        }`}
      >
        {/* Header */}
        <div className={`border-b border-line px-5 py-5 flex items-center ${isCollapsed ? "justify-center" : "justify-between"}`}>
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <Logo className="h-7 w-7 shrink-0" />
            {!isCollapsed && <span className="font-screamer text-xl tracking-widest text-horizon">Finsight</span>}
          </Link>
        </div>

        {/* Navigation list */}
        <div className="flex-1 overflow-y-auto px-3 py-4">
          <SidebarNav pathname={pathname} onNavigate={undefined} collapsed={isCollapsed} />
        </div>

        {/* Bottom Minimize / Expand Toggle */}
        <div className="border-t border-line p-3">
          <button
            type="button"
            onClick={toggleCollapse}
            title={isCollapsed ? "Expand Sidebar" : "Minimize Sidebar"}
            className="flex items-center gap-2 rounded-md p-2 text-xs font-editorial text-ink-soft hover:bg-ink/5 hover:text-ink cursor-pointer w-full justify-center transition-colors"
          >
            {isCollapsed ? (
              <ChevronRight className="h-4 w-4 shrink-0" />
            ) : (
              <>
                <ChevronLeft className="h-4 w-4 shrink-0" />
                <span className="text-xs uppercase font-semibold tracking-wider">Minimize</span>
              </>
            )}
          </button>
        </div>
      </aside>

      {/* Mobile: slide-in drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            aria-label="Close navigation"
            onClick={onClose}
            className="absolute inset-0 bg-ink/40 backdrop-blur-sm cursor-pointer"
          />
          <aside className="absolute left-0 top-0 h-full w-64 max-w-[80vw] flex-col border-r border-line bg-paper-raised shadow-xl">
            <div className="flex items-center justify-between border-b border-line px-5 py-5">
              <Link href="/dashboard" onClick={onClose} className="flex items-center gap-2.5">
                <Logo className="h-7 w-7" />
                <span className="font-screamer text-xl tracking-widest text-horizon">Finsight</span>
              </Link>
              <button
                aria-label="Close navigation"
                onClick={onClose}
                className="rounded-md p-1.5 text-ink-soft hover:bg-ink/5 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-3 py-4">
              <SidebarNav pathname={pathname} onNavigate={onClose} collapsed={false} />
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
