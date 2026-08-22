"use client";

import { useState } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import DashboardHeader from "@/components/DashboardHeader";
import Sidebar from "@/components/Sidebar";
import { FinanceProvider } from "@/context/FinanceContext";
import FinAIChat from "@/components/FinAIChat";
import ModuleGuideButton from "@/components/ModuleGuideButton";

export default function DashboardLayout({ children }) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <ProtectedRoute>
      <FinanceProvider>
        <div className="flex min-h-screen bg-paper">
          <Sidebar mobileOpen={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />
          <div className="flex min-h-screen flex-1 flex-col min-w-0">
            <DashboardHeader onMenuClick={() => setMobileNavOpen(true)} />
            <main className="flex-1">{children}</main>
          </div>
        </div>
        {/* Global — available on every dashboard page */}
        <FinAIChat />
        <ModuleGuideButton />
      </FinanceProvider>
    </ProtectedRoute>
  );
}
