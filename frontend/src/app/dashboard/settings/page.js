"use client";

import { PageHeader, Card, Button } from "@/components/ui";
import { useAuth } from "@/context/AuthContext";

export default function SettingsPage() {
  const { user, logout } = useAuth();

  return (
    <div className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">
      <PageHeader title="Settings" description="Your profile, account information, and preferences." />

      <div className="grid gap-6 sm:grid-cols-2">
        <Card>
          <h2 className="font-screamer text-lg uppercase tracking-wide text-ink mb-4">Profile</h2>
          {user ? (
            <dl className="space-y-3 font-editorial text-sm">
              <div>
                <dt className="text-xs uppercase text-ink-soft">Name</dt>
                <dd className="text-ink font-medium mt-0.5">{user.name}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase text-ink-soft">Email</dt>
                <dd className="text-ink font-medium mt-0.5">{user.email}</dd>
              </div>
              {user.createdAt && (
                <div>
                  <dt className="text-xs uppercase text-ink-soft">Member Since</dt>
                  <dd className="text-ink font-medium mt-0.5">
                    {new Date(user.createdAt).toLocaleDateString("en-IN", { month: "long", year: "numeric" })}
                  </dd>
                </div>
              )}
            </dl>
          ) : (
            <p className="text-sm text-ink-soft font-editorial">Loading profile…</p>
          )}
        </Card>

        <Card>
          <h2 className="font-screamer text-lg uppercase tracking-wide text-ink mb-4">Preferences</h2>
          <p className="text-sm text-ink-soft font-editorial mb-2">
            Light / dark theme can be toggled from the sun/moon icon in the top bar — your choice is remembered
            automatically.
          </p>
          <p className="text-xs text-ink-soft/70 font-editorial">
            Editable profile fields (e.g. changing your name or password) aren't implemented yet.
          </p>
        </Card>

        <Card className="sm:col-span-2">
          <h2 className="font-screamer text-lg uppercase tracking-wide text-ink mb-4">Account</h2>
          <Button variant="danger" onClick={logout} className="font-editorial font-semibold">
            Log out
          </Button>
        </Card>
      </div>
    </div>
  );
}
