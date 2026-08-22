"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { AnimatePresence, motion } from "framer-motion";
import { Button, Input, Card } from "@/components/ui";

const formVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.05,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 350, damping: 25 },
  },
};

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [isShaking, setIsShaking] = useState(false);

  function validate() {
    const nextErrors = {};
    if (!email.trim()) nextErrors.email = "Email is required";
    if (!password.trim()) nextErrors.password = "Password is required";
    setFieldErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setFieldErrors({});
    if (!validate()) {
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 400);
      return;
    }
    setSubmitting(true);
    try {
      await login(email, password);
      router.push("/dashboard");
    } catch (err) {
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 400);
      if (err.details) {
        const nextErrors = {};
        err.details.forEach((issue) => {
          const key = issue.path.startsWith("body.") ? issue.path.slice(5) : issue.path;
          nextErrors[key] = issue.message;
        });
        setFieldErrors(nextErrors);
      } else {
        setError(err.message);
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="relative flex flex-1 items-center justify-center overflow-hidden bg-paper px-6 py-16 transition-colors duration-300">
      {/* Dynamic Animated Glows matching Finova design */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <motion.div
          animate={{
            scale: [1, 1.15, 1],
            opacity: [0.25, 0.4, 0.25],
            x: [0, 40, 0],
            y: [0, -20, 0]
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute -top-40 -left-40 h-[400px] w-[400px] rounded-full bg-horizon-dim blur-[100px]"
        />
        <motion.div
          animate={{
            scale: [1.15, 1, 1.15],
            opacity: [0.15, 0.3, 0.15],
            x: [0, -30, 0],
            y: [0, 30, 0]
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute -bottom-40 -right-40 h-[450px] w-[450px] rounded-full bg-horizon blur-[120px]"
        />
      </div>

      <motion.div
        animate={{ x: isShaking ? [-8, 8, -6, 6, -4, 4, 0] : 0 }}
        transition={{ duration: 0.4, ease: "easeInOut" }}
        className="z-10 w-full max-w-sm"
      >
        <Card layoutId="auth-card" className="w-full bg-paper-raised/80 shadow-2xl backdrop-blur-md border border-line/60 p-6 sm:p-8">
          <p className="font-figure text-[10px] uppercase tracking-[0.3em] text-horizon font-bold">Finsight</p>
          <h1 className="font-screamer mt-3 text-4xl sm:text-5xl text-ink tracking-wide leading-none uppercase">Sign In</h1>

          <motion.form
            variants={formVariants}
            initial="hidden"
            animate="visible"
            onSubmit={handleSubmit}
            className="mt-8 space-y-5"
          >
            <motion.div variants={itemVariants}>
              <Input
                id="email"
                label="Email"
                type="email"
                required
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (fieldErrors.email) setFieldErrors((prev) => ({ ...prev, email: undefined }));
                }}
                error={fieldErrors.email}
                placeholder="you@example.com"
                className="font-editorial"
              />
            </motion.div>

            <motion.div variants={itemVariants}>
              <Input
                id="password"
                label="Password"
                type="password"
                required
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (fieldErrors.password) setFieldErrors((prev) => ({ ...prev, password: undefined }));
                }}
                error={fieldErrors.password}
                placeholder="••••••••"
                className="font-editorial"
              />
            </motion.div>

            <motion.div variants={itemVariants} className="pt-2">
              <AnimatePresence mode="popLayout">
                {error ? (
                  <motion.p
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    className="text-xs text-signal-neg mb-4 p-2.5 rounded bg-signal-neg/10 border border-signal-neg/20 font-editorial"
                  >
                    {error}
                  </motion.p>
                ) : null}
              </AnimatePresence>
              
              <Button 
                type="submit" 
                variant="accent" 
                className="w-full py-3.5 font-screamer text-lg tracking-wide uppercase transition-all duration-300 shadow-[0_4px_12px_var(--color-horizon-dim)] hover:shadow-[0_4px_24px_rgba(214,255,98,0.35)]" 
                disabled={submitting}
              >
                {submitting ? "Logging in…" : "Log in"}
              </Button>
            </motion.div>
          </motion.form>

          <p className="mt-8 text-center text-sm text-ink-soft font-editorial">
            New here?{" "}
            <Link href="/signup" className="font-semibold text-ink underline underline-offset-4 hover:text-horizon transition-colors">
              Create an account
            </Link>
          </p>
        </Card>
      </motion.div>
    </main>
  );
}
