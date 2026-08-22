"use client";

import { useMemo, useState } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import DashboardHeader from "@/components/DashboardHeader";
import { api } from "@/lib/api";
import { Card, Button, Input, StatCard } from "@/components/ui";
import { formatINR } from "@/lib/format";

const promptSuggestions = [
  "Why did my expenses increase?",
  "How healthy are my finances right now?",
  "Am I overspending on any category?",
  "How is my investment portfolio doing?",
];

function AssistantContent() {
  const [question, setQuestion] = useState("Why did my expenses increase?");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const topRecommendation = useMemo(() => result?.health?.recommendations?.[0] || "Ask a question to get an explanation and next action.", [result]);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const data = await api.askAdvisor({ question });
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">
      <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <Card>
          <p className="font-figure text-xs uppercase tracking-[0.2em] text-horizon">AI Finance Assistant</p>
          <h1 className="font-display mt-2 text-3xl">Ask a money question in plain English</h1>
          <p className="mt-3 max-w-2xl text-sm text-ink-soft">
            This combines the Retriever Agent, Advisor Agent, and Financial Health Agent to give you explainable guidance.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <Input
              id="question"
              label="Your question"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Why did my expenses increase?"
            />
            <div className="flex flex-wrap gap-2">
              {promptSuggestions.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => setQuestion(prompt)}
                  className="rounded-full border border-line px-3 py-1.5 text-xs text-ink-soft transition-colors hover:bg-ink/5 hover:text-ink"
                >
                  {prompt}
                </button>
              ))}
            </div>
            {error && <p className="text-sm text-signal-neg">{error}</p>}
            <Button type="submit" variant="primary" disabled={loading}>
              {loading ? "Thinking…" : "Ask advisor"}
            </Button>
          </form>

          {result && (
            <div className="mt-6 space-y-4">
              <div className="rounded-xl border border-line bg-paper px-4 py-4 whitespace-pre-line text-sm leading-6 text-ink">
                {result.answer}
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <StatCard label="Health Score" value={`${result.health.score} / 100`} accent />
                <StatCard label="Confidence" value={`${Math.round(result.confidence * 100)}%`} />
                <StatCard label="Intent" value={result.intent.replace(/_/g, " ")} />
              </div>
            </div>
          )}
        </Card>

        <div className="space-y-4">
          <Card>
            <p className="text-xs uppercase tracking-[0.2em] text-horizon">What the advisor used</p>
            <ul className="mt-4 space-y-3 text-sm text-ink-soft">
              <li>Current month spending vs previous month</li>
              <li>Budget pressure by category</li>
              <li>Portfolio diversification and returns</li>
              <li>Goal progress and health score breakdown</li>
            </ul>
          </Card>

          <Card>
            <p className="text-xs uppercase tracking-[0.2em] text-horizon">Top recommendation</p>
            <p className="mt-3 text-sm text-ink">{topRecommendation}</p>
            {result?.health?.anomalies?.length ? (
              <div className="mt-4 space-y-3">
                <p className="text-xs uppercase tracking-[0.2em] text-horizon">Unusual spending</p>
                {result.health.anomalies.slice(0, 3).map((item) => (
                  <div key={`${item.kind}-${item.categoryId}-${item.transactionId || item.amount}`} className="rounded-lg border border-line px-3 py-3 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-medium text-ink">{item.categoryName}</span>
                      <span className="font-figure text-signal-neg">{formatINR(item.amount)}</span>
                    </div>
                    <p className="mt-1 text-xs text-ink-soft">{item.reason}</p>
                  </div>
                ))}
              </div>
            ) : null}
          </Card>
        </div>
      </div>
    </main>
  );
}

export default function AssistantPage() {
  return (
    <ProtectedRoute>
      <DashboardHeader />
      <AssistantContent />
    </ProtectedRoute>
  );
}