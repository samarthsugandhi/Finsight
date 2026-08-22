"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  if (loading) {
    return (
      <main className="flex flex-1 items-center justify-center bg-paper">
        <p className="text-sm text-ink-soft">Loading…</p>
      </main>
    );
  }

  if (!user) return null;

  return children;
}
