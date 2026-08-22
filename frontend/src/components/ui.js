"use client";

import { useEffect, useRef, useState } from "react";
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
  useSpring,
} from "framer-motion";

function formatDisplayValue(value, kind, decimals) {
  if (typeof value !== "number" || Number.isNaN(value)) return String(value ?? "");

  if (kind === "currency") {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(value);
  }

  if (kind === "percent") {
    return `${value.toFixed(decimals)}%`;
  }

  if (kind === "score") {
    return `${Math.round(value)}`;
  }

  return decimals > 0 ? value.toFixed(decimals) : `${Math.round(value)}`;
}

function AnimatedNumber({ value, kind = "number", decimals = 0, className = "" }) {
  const prefersReducedMotion = useReducedMotion();
  const numericValue = typeof value === "number" ? value : Number(value) || 0;
  const motionValue = useMotionValue(0);
  const spring = useSpring(motionValue, { stiffness: 140, damping: 24, mass: 0.9 });
  const previousValueRef = useRef(0);
  const [displayValue, setDisplayValue] = useState(() =>
    prefersReducedMotion ? formatDisplayValue(numericValue, kind, decimals) : formatDisplayValue(0, kind, decimals)
  );

  useEffect(() => {
    if (prefersReducedMotion) {
      const frame = window.requestAnimationFrame(() => {
        setDisplayValue(formatDisplayValue(numericValue, kind, decimals));
      });
      previousValueRef.current = numericValue;
      return () => window.cancelAnimationFrame(frame);
    }

    motionValue.set(previousValueRef.current);
    const animationFrame = window.requestAnimationFrame(() => {
      motionValue.set(numericValue);
    });
    previousValueRef.current = numericValue;

    return () => window.cancelAnimationFrame(animationFrame);
  }, [decimals, kind, motionValue, numericValue, prefersReducedMotion]);

  useMotionValueEvent(spring, "change", (latest) => {
    if (prefersReducedMotion) return;
    setDisplayValue(formatDisplayValue(latest, kind, decimals));
  });

  return <span className={className}>{displayValue}</span>;
}

export function Button({ children, variant = "primary", className = "", ...props }) {
  const prefersReducedMotion = useReducedMotion();
  const variants = {
    primary: "bg-ink text-paper hover:bg-ink/90",
    accent: "bg-horizon text-[#0f1b33] hover:bg-horizon/90",
    ghost: "bg-transparent text-ink hover:bg-ink/5 border border-line",
    danger: "bg-transparent text-signal-neg hover:bg-signal-neg/10 border border-signal-neg/30",
  };

  return (
    <motion.button
      whileHover={prefersReducedMotion ? undefined : { y: -1, scale: 1.01 }}
      whileTap={prefersReducedMotion ? undefined : { scale: 0.97 }}
      transition={{ type: "spring", stiffness: 520, damping: 34 }}
      className={`inline-flex items-center justify-center rounded-md px-4 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </motion.button>
  );
}

export function Input({ label, error, className = "", id, ...props }) {
  const prefersReducedMotion = useReducedMotion();
  const [focused, setFocused] = useState(false);
  const invalid = Boolean(error);
  const active = focused || invalid;

  const inputMotion = prefersReducedMotion
    ? {}
    : {
        x: invalid ? [0, -5, 5, -4, 4, 0] : 0,
        transition: { type: "spring", stiffness: 500, damping: 30 },
      };

  return (
    <motion.label className="block" htmlFor={id} animate={inputMotion}>
      {label && <span className="mb-1.5 block text-sm text-ink-soft">{label}</span>}
      <motion.input
        id={id}
        aria-invalid={invalid || undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        className={`w-full rounded-md border bg-paper-raised px-3 py-2.5 text-sm text-ink placeholder:text-ink-soft/50 focus-visible:outline-none ${className}`}
        animate={
          prefersReducedMotion
            ? undefined
            : {
                borderColor: active ? "var(--color-horizon)" : "var(--color-line)",
                boxShadow: active
                  ? "0 0 0 4px rgba(226, 163, 61, 0.18)"
                  : "0 0 0 0 rgba(226, 163, 61, 0)",
              }
        }
        transition={{ type: "spring", stiffness: 420, damping: 32 }}
        style={{ borderColor: "var(--color-line)" }}
        {...props}
      />
      <AnimatePresence mode="popLayout">
        {error ? (
          <motion.span
            id={`${id}-error`}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.18 }}
            className="mt-1 block text-xs text-signal-neg"
          >
            {error}
          </motion.span>
        ) : null}
      </AnimatePresence>
    </motion.label>
  );
}

export function Select({ label, className = "", id, children, ...props }) {
  return (
    <label className="block" htmlFor={id}>
      {label && <span className="mb-1.5 block text-sm text-ink-soft">{label}</span>}
      <select
        id={id}
        className={`w-full rounded-md border border-line bg-paper-raised px-3 py-2.5 text-sm text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-horizon ${className}`}
        {...props}
      >
        {children}
      </select>
    </label>
  );
}

export function Card({ children, className = "", layoutId, ...props }) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.div
      layout
      layoutId={layoutId}
      initial={prefersReducedMotion ? false : { opacity: 0.96, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 420, damping: 36 }}
      whileHover={prefersReducedMotion ? undefined : { y: -2 }}
      className={`rounded-xl border border-line bg-paper-raised p-5 ${className}`}
      {...props}
    >
      {children}
    </motion.div>
  );
}

export function StatCard({ label, value, kind = "number", decimals = 0, accent = false, sub, subValue, subKind = "number", subDecimals = 0, suffix = "", subSuffix = "", valueClassName = "" }) {
  return (
    <Card>
      <p className="text-xs uppercase tracking-wide text-ink-soft">{label}</p>
      <p className={`font-figure mt-2 text-2xl font-medium ${accent ? "text-horizon" : valueClassName || "text-ink"}`}>
        <AnimatedNumber value={value} kind={kind} decimals={decimals} />
        {suffix ? <span>{suffix}</span> : null}
      </p>
      {typeof subValue === "number" ? (
        <p className="mt-1 text-xs text-ink-soft">
          <AnimatedNumber value={subValue} kind={subKind} decimals={subDecimals} />
          {subSuffix ? <span>{subSuffix}</span> : null}
        </p>
      ) : sub ? (
        <p className="mt-1 text-xs text-ink-soft">{sub}</p>
      ) : null}
    </Card>
  );
}

export function AnimatedLedgerValue({ value, kind = "number", decimals = 0, className = "" }) {
  return <AnimatedNumber value={value} kind={kind} decimals={decimals} className={className} />;
}

/** Consistent page title + optional description + optional right-aligned action (e.g. a "View All" link or button). */
export function PageHeader({ title, description, action, className = "" }) {
  return (
    <div className={`mb-8 flex flex-wrap items-start justify-between gap-4 ${className}`}>
      <div>
        <h1 className="font-screamer text-2xl tracking-wide text-ink sm:text-3xl">{title}</h1>
        {description && <p className="mt-1 font-editorial text-sm text-ink-soft">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

/** Consistent empty-state placeholder for lists/tables with no data yet. */
export function EmptyState({ title = "Nothing here yet", description, action, className = "" }) {
  return (
    <div className={`flex flex-col items-center justify-center rounded-xl border border-dashed border-line px-6 py-12 text-center ${className}`}>
      <p className="font-editorial text-sm font-semibold text-ink">{title}</p>
      {description && <p className="mt-1 max-w-sm font-editorial text-xs text-ink-soft">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/** Consistent inline error banner, used for failed loads/mutations across pages. */
export function ErrorState({ message, onRetry, className = "" }) {
  if (!message) return null;
  return (
    <div className={`mb-6 flex items-center justify-between gap-4 rounded-md border border-signal-neg/30 bg-signal-neg/5 px-4 py-3 text-sm text-signal-neg font-editorial ${className}`}>
      <span>{message}</span>
      {onRetry && (
        <button onClick={onRetry} className="shrink-0 font-semibold underline underline-offset-2 hover:opacity-80 cursor-pointer">
          Retry
        </button>
      )}
    </div>
  );
}

/** Simple pulsing skeleton block, composable for page-level loading states. */
export function LoadingBlock({ className = "" }) {
  return <div className={`animate-pulse rounded-xl bg-ink/5 ${className}`} />;
}
