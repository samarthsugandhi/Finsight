export default function Logo({ className = "h-9 w-9" }) {
  return (
    <svg viewBox="0 0 40 40" className={className} fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect
        x="1.25"
        y="1.25"
        width="37.5"
        height="37.5"
        rx="10"
        fill="var(--color-accent-hero, var(--color-horizon))"
        fillOpacity="0.12"
        stroke="var(--color-accent-hero, var(--color-horizon))"
        strokeWidth="1.5"
      />
      {/* Ledger-bar "F" */}
      <path
        d="M13 29V14a3 3 0 0 1 3-3h9"
        stroke="var(--color-accent-hero, var(--color-horizon))"
        strokeWidth="2.6"
        strokeLinecap="round"
      />
      <path d="M13 20.5h7.5" stroke="var(--color-accent-hero, var(--color-horizon))" strokeWidth="2.6" strokeLinecap="round" />
      {/* Upward trend flourish */}
      <path
        d="M23 28.5l3.2-5.5 2.6 3 4.2-7.5"
        stroke="var(--color-accent-hero, var(--color-horizon))"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.85"
      />
    </svg>
  );
}
