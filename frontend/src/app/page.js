"use client";

import Link from "next/link";
import { motion, useReducedMotion, useScroll, useTransform, useMotionValue, useSpring } from "framer-motion";
import { useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui";
import { ArrowLeftRight, Wallet, Target, PieChart, HeartPulse, BarChart3 } from "lucide-react";
import PageLoader from "@/components/PageLoader/PageLoader";
import Menu from "@/components/Menu/Menu";
import Logo from "@/components/Logo";

const features = [
  {
    icon: ArrowLeftRight,
    title: "Transactions",
    body: "Every rupee in and out, categorized. Filter by type, category, or month — search it like a real ledger.",
  },
  {
    icon: Wallet,
    title: "Budgets",
    body: "Set a monthly cap per category. See spend, remaining, and percent used update live as you spend — no manual math.",
  },
  {
    icon: Target,
    title: "Savings Goals",
    body: "Track progress toward a target with a real date. Flag one as your emergency fund and it feeds straight into your Health Score.",
  },
  {
    icon: PieChart,
    title: "Portfolio",
    body: "Stocks, mutual funds, crypto, gold, fixed deposits — invested vs. current value, gain/loss, and allocation in one place.",
  },
  {
    icon: HeartPulse,
    title: "Financial Health Score",
    body: "One number out of 100, built from five weighted components. Missing data shows as Insufficient Data — never guessed.",
  },
  {
    icon: BarChart3,
    title: "Analytics",
    body: "Category breakdowns and monthly cash-flow trends, computed from your own transaction history — nothing invented.",
  },
];

const steps = [
  {
    n: "01",
    title: "Log what actually happened",
    body: "Add transactions, set budgets, log goals and holdings — or import a bank statement PDF and review it before anything is saved.",
  },
  {
    n: "02",
    title: "Get a transparent score",
    body: "Savings rate, budget discipline, diversification, emergency fund, and debt ratio — each one weighted and shown, not hidden behind a black box.",
  },
  {
    n: "03",
    title: "Act on your real numbers",
    body: "See exactly where a budget is exceeded, which goal needs attention, and how your portfolio is allocated — then decide.",
  },
];

const questions = [
  {
    q: "“Am I saving enough?”",
    a: "A Financial Health Score built from a transparent, weighted formula — savings rate, budget discipline, diversification, emergency fund, and debt ratio.",
  },
  {
    q: "“Can I afford this?”",
    a: "Budgets and goals that track progress in real time, so a purchase decision is grounded in your actual numbers, not guesswork.",
  },
  {
    q: "“Where does it go?”",
    a: "Every transaction categorized and rolled up into a clear picture of income, expense, and where your money actually goes each month.",
  },
];

function FeatureCard({ icon: Icon, title, body, index }) {
  const prefersReducedMotion = useReducedMotion();
  return (
    <motion.div
      initial={prefersReducedMotion ? false : { opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.4 }}
      transition={{ type: "spring", stiffness: 260, damping: 26, delay: index * 0.08 }}
      whileHover={prefersReducedMotion ? undefined : { y: -4 }}
      className="group rounded-2xl border border-line bg-paper-raised p-6 font-editorial shadow-sm transition-shadow hover:shadow-lg"
    >
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-horizon/12 text-horizon transition-transform duration-300 group-hover:scale-110">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="mt-4 font-screamer text-lg uppercase tracking-wide text-ink">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-ink-soft">{body}</p>
    </motion.div>
  );
}

function StepItem({ n, title, body, index, isLast }) {
  const prefersReducedMotion = useReducedMotion();
  return (
    <motion.div
      initial={prefersReducedMotion ? false : { opacity: 0, x: -20 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, amount: 0.5 }}
      transition={{ type: "spring", stiffness: 240, damping: 26, delay: index * 0.12 }}
      className="relative flex gap-5 pb-10 last:pb-0"
    >
      <div className="flex flex-col items-center">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-horizon/40 bg-horizon/10 font-figure text-sm font-bold text-horizon">
          {n}
        </span>
        {!isLast && <span className="mt-2 w-px flex-1 bg-line" />}
      </div>
      <div className="pt-1.5 font-editorial">
        <h3 className="font-screamer text-lg uppercase tracking-wide text-ink">{title}</h3>
        <p className="mt-2 max-w-lg text-sm leading-6 text-ink-soft">{body}</p>
      </div>
    </motion.div>
  );
}

function SiteFooter() {
  const prefersReducedMotion = useReducedMotion();
  return (
    <motion.footer
      initial={prefersReducedMotion ? false : { opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.5 }}
      className="relative z-10 border-t border-line px-6 py-10 font-editorial"
    >
      <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-6 sm:flex-row">
        <div className="flex items-center gap-2.5">
          <Logo className="h-7 w-7" />
          <span className="font-screamer text-lg tracking-widest text-horizon">Finsight</span>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-ink-soft">
          <Link href="/login" className="hover:text-ink transition-colors">
            Log in
          </Link>
          <Link href="/signup" className="hover:text-ink transition-colors">
            Create account
          </Link>
          <Link href="/dashboard" className="hover:text-ink transition-colors">
            Dashboard
          </Link>
        </div>
        <p className="text-xs text-ink-soft/70">© {new Date().getFullYear()} Finsight. Built on real numbers.</p>
      </div>
    </motion.footer>
  );
}

function RevealQuestion({ question, answer, progress, index }) {
  const prefersReducedMotion = useReducedMotion();
  const start = 0.14 + index * 0.1;
  const end = 0.34 + index * 0.1;
  const cardProgress = useTransform(progress, [start, end], [0, 1]);
  const opacity = useTransform(cardProgress, [0, 1], [0, 1]);
  const y = useTransform(cardProgress, [0, 1], [22, 0]);

  return (
    <motion.div
      style={prefersReducedMotion ? { opacity: 1, y: 0 } : { opacity, y }}
      className="rounded-2xl border border-line/70 bg-paper-raised/80 p-5 backdrop-blur-sm shadow-md font-editorial"
    >
      <p className="font-display text-lg italic text-ink-soft">{question}</p>
      <motion.div
        className="horizon-rule my-4 w-12 origin-left"
        style={prefersReducedMotion ? { scaleX: 1, opacity: 0.72 } : { scaleX: cardProgress, opacity: cardProgress }}
      />
      <p className="text-sm leading-6 text-ink-soft">{answer}</p>
    </motion.div>
  );
}

function FloatingCoin({ className, delay = 0, size = "h-12 w-12", label = "₹" }) {
  return (
    <motion.div
      initial={{ y: 0, rotate: 0 }}
      animate={{
        y: [-12, 12, -12],
        rotate: [0, 360],
      }}
      transition={{
        y: {
          duration: 6,
          repeat: Infinity,
          ease: "easeInOut",
          delay,
        },
        rotate: {
          duration: 16,
          repeat: Infinity,
          ease: "linear",
          delay,
        }
      }}
      className={`absolute flex items-center justify-center rounded-full bg-gradient-to-br from-horizon to-horizon/60 text-ink font-bold shadow-[0_10px_25px_rgba(226,163,61,0.35)] select-none pointer-events-none z-10 border border-horizon-dim/30 ${size} ${className}`}
    >
      <span className="font-mono text-sm">{label}</span>
    </motion.div>
  );
}

function Interactive3DCard() {
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const rotateX = useSpring(useTransform(y, [-150, 150], [15, -15]), { stiffness: 200, damping: 25 });
  const rotateY = useSpring(useTransform(x, [-150, 150], [-15, 15]), { stiffness: 200, damping: 25 });

  const glareX = useTransform(x, [-150, 150], ["100%", "0%"]);
  const glareY = useTransform(y, [-150, 150], ["100%", "0%"]);

  function handleMouseMove(event) {
    const card = event.currentTarget;
    const rect = card.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    
    const mouseX = event.clientX - rect.left - width / 2;
    const mouseY = event.clientY - rect.top - height / 2;
    
    x.set(mouseX);
    y.set(mouseY);
  }

  function handleMouseLeave() {
    x.set(0);
    y.set(0);
  }

  return (
    <div className="relative flex items-center justify-center py-10">
      {/* 3D floating coins acting as background accents */}
      <FloatingCoin className="-top-4 -left-6 z-20" delay={0} size="h-10 w-10" label="₹" />
      <FloatingCoin className="-bottom-8 right-6 z-20" delay={1.5} size="h-12 w-12" label="%" />
      <FloatingCoin className="top-10 -right-8 z-20" delay={3.2} size="h-8 w-8" label="+" />

      <div style={{ perspective: 1000 }} className="flex items-center justify-center">
        <motion.div
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          style={{
            rotateX,
            rotateY,
            transformStyle: "preserve-3d",
          }}
          className="relative w-80 h-48 rounded-2xl border border-white/20 bg-gradient-to-br from-paper-raised/15 to-paper-raised/5 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.5)] backdrop-blur-md p-6 overflow-hidden cursor-pointer"
        >
          {/* Shine reflection overlay */}
          <motion.div
            style={{
              background: `radial-gradient(circle at ${glareX} ${glareY}, rgba(255,255,255,0.18) 0%, transparent 65%)`,
            }}
            className="absolute inset-0 pointer-events-none z-10"
          />

          {/* Card content with volumetric depth */}
          <div style={{ transform: "translateZ(35px)" }} className="h-full flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[9px] uppercase tracking-[0.25em] text-horizon-hero font-semibold">Financial Health Card</p>
                <h3 className="font-display text-white text-lg mt-1 font-semibold">Finsight Premium</h3>
              </div>
              <div className="h-8 w-8 rounded-full border border-horizon/35 bg-horizon/25 flex items-center justify-center text-horizon text-xs font-bold font-figure shadow-[0_0_15px_rgba(226,163,61,0.4)]">
                F
              </div>
            </div>

            <div className="mt-4">
              <p className="text-[9px] uppercase tracking-wider text-white/60">Financial Health Score</p>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="font-figure text-3xl font-bold text-horizon-hero">84</span>
                <span className="text-[9px] text-signal-pos font-semibold bg-signal-pos/25 border border-signal-pos/30 px-1.5 py-0.5 rounded">EXCELLENT</span>
              </div>
            </div>

            <div className="flex justify-between items-end mt-4">
              <p className="font-figure text-xs text-white/85 tracking-widest">••••  ••••  ••••  4298</p>
              <div className="flex flex-col items-end">
                <span className="text-[8px] text-white/50 uppercase">Verified Ledger</span>
                <span className="font-figure text-[10px] text-white/70">2026</span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

const heroVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.1,
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 25 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 260, damping: 25 }
  }
};

export default function LandingPage() {
  const heroRef = useRef(null);
  const prefersReducedMotion = useReducedMotion();
  
  // Loader and Menu active states
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isBootLoading, setIsBootLoading] = useState(true);

  useEffect(() => {
    setIsBootLoading(true);
    const timer = setTimeout(() => {
      setIsBootLoading(false);
    }, 6200);
    return () => clearTimeout(timer);
  }, []);

  const handleLoaderComplete = () => {
    setIsBootLoading(false);
  };

  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });

  // Fade out hero sections as you scroll down
  const heroOpacity = useTransform(scrollYProgress, [0, 0.45], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 0.45], [1, 0.96]);

  return (
    <main className="flex-1 overflow-x-hidden relative min-h-screen">
      {/* Finova Interactive Page Loader */}
      <PageLoader active={isBootLoading} onComplete={handleLoaderComplete} />

      {/* Fullscreen Animated Menu Drawer */}
      <Menu isOpen={isMenuOpen} setIsOpen={setIsMenuOpen} />

      {/* Main content, hidden during initial boot loading transition */}
      <div 
        style={{ 
          visibility: isBootLoading ? "hidden" : "visible",
          display: isBootLoading ? "none" : "block"
        }}
      >
        {/* Hero Section configured with .hero-section custom class & full-screen min-h-screen */}
        <section ref={heroRef} className="hero-section relative overflow-hidden min-h-screen flex items-center py-20 transition-colors duration-300">
          {/* Soft decorative background auroras */}
          <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none opacity-30">
            <div className="absolute -top-40 -left-40 h-[500px] w-[500px] rounded-full bg-horizon blur-[150px]" />
            <div className="absolute -bottom-40 -right-40 h-[600px] w-[600px] rounded-full bg-horizon-dim blur-[180px]" />
          </div>

          <motion.div
            className="horizon-rule absolute inset-x-0 top-0 origin-left"
            style={prefersReducedMotion ? { scaleX: 1, opacity: 0.62 } : { scaleX: 1, opacity: 0.55 }}
          />

          <div className="mx-auto max-w-5xl w-full px-6 relative z-10">
            <motion.div
              style={prefersReducedMotion ? {} : { opacity: heroOpacity, scale: heroScale }}
              variants={heroVariants}
              initial="hidden"
              animate="visible"
              className="grid lg:grid-cols-12 gap-12 items-center"
            >
              <div className="lg:col-span-7 flex flex-col justify-center">
                <motion.p variants={itemVariants} className="font-figure text-xs uppercase tracking-[0.2em] text-horizon-hero font-semibold">
                  Finsight
                </motion.p>
                
                <motion.h1
                  variants={itemVariants}
                  className="font-screamer mt-6 text-4xl leading-tight sm:text-5xl lg:text-6xl"
                >
                  Your money, explained —
                  <br />
                  <span className="italic text-horizon-hero">not just recorded.</span>
                </motion.h1>
                
                <motion.p
                  variants={itemVariants}
                  className="mt-6 max-w-xl text-base text-white/75 sm:text-lg leading-relaxed font-editorial"
                >
                  Finsight tracks every rupee in and out, then answers the question every finance app skips: what should you actually do about it.
                </motion.p>
                
                <motion.div
                  variants={itemVariants}
                  className="mt-10 flex flex-wrap gap-4"
                >
                  <Link href="/signup">
                    <Button variant="accent" className="px-6 py-3.5 font-screamer tracking-wide uppercase shadow-[0_4px_12px_var(--color-horizon-dim)] transition-all duration-300">
                      Create your account
                    </Button>
                  </Link>
                  <Link href="/login">
                    <Button variant="ghost" className="px-6 py-3.5 border-white/30 text-white hover:bg-white/10 font-screamer tracking-wide uppercase">
                      Log in
                    </Button>
                  </Link>
                </motion.div>
              </div>

              <motion.div 
                variants={itemVariants} 
                className="lg:col-span-5 flex justify-center lg:justify-end"
              >
                <Interactive3DCard />
              </motion.div>
            </motion.div>
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-6 py-20 relative z-10 font-editorial">
          <div className="grid gap-6 sm:grid-cols-3">
            {questions.map((item, index) => (
              <RevealQuestion key={item.q} question={item.q} answer={item.a} progress={scrollYProgress} index={index} />
            ))}
          </div>
        </section>

        {/* Feature grid */}
        <section className="mx-auto max-w-5xl px-6 py-16 relative z-10">
          <div className="mb-10 text-center">
            <p className="font-figure text-xs uppercase tracking-[0.2em] text-horizon font-semibold">Everything in one place</p>
            <h2 className="font-screamer mt-3 text-3xl sm:text-4xl text-ink">Six modules. One real picture.</h2>
            <p className="mt-4 max-w-xl mx-auto font-editorial text-sm text-ink-soft leading-relaxed">
              No module works in isolation — a goal you mark as your emergency fund changes your Health Score, a
              budget you exceed shows up in Analytics, and every number traces back to a transaction you actually logged.
            </p>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature, index) => (
              <FeatureCard key={feature.title} index={index} {...feature} />
            ))}
          </div>
        </section>

        {/* How it works */}
        <section className="mx-auto max-w-3xl px-6 py-16 relative z-10">
          <div className="mb-10">
            <p className="font-figure text-xs uppercase tracking-[0.2em] text-horizon font-semibold">How it works</p>
            <h2 className="font-screamer mt-3 text-3xl sm:text-4xl text-ink">From raw numbers to a real answer.</h2>
          </div>
          <div>
            {steps.map((step, index) => (
              <StepItem key={step.n} {...step} index={index} isLast={index === steps.length - 1} />
            ))}
          </div>
        </section>

        {/* Closing CTA */}
        <section className="mx-auto max-w-3xl px-6 py-20 text-center relative z-10 font-editorial">
          <h2 className="font-screamer text-3xl sm:text-4xl text-ink">Stop guessing. Start with your real numbers.</h2>
          <p className="mt-4 text-sm text-ink-soft leading-relaxed">
            Free to start — no fake demo data, just your actual transactions from day one.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link href="/signup">
              <Button variant="accent" className="px-6 py-3.5 font-screamer tracking-wide uppercase">
                Create your account
              </Button>
            </Link>
            <Link href="/login">
              <Button variant="ghost" className="px-6 py-3.5 font-screamer tracking-wide uppercase">
                Log in
              </Button>
            </Link>
          </div>
        </section>

        <SiteFooter />
      </div>
    </main>
  );
}
