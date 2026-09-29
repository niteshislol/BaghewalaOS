/** Circular progress gauge — unique visual vs number boxes */
export function Gauge({
  value,
  max = 100,
  label,
  unit = "",
  tone = "accent",
  size = 112,
}: {
  value: number;
  max?: number;
  label: string;
  unit?: string;
  tone?: "accent" | "good" | "warn" | "bad" | "info";
  size?: number;
}) {
  const colors = {
    accent: "var(--accent)",
    good: "var(--good)",
    warn: "var(--warn)",
    bad: "var(--bad)",
    info: "var(--info)",
  };
  const stroke = colors[tone];
  const r = 42;
  const c = 2 * Math.PI * r;
  const pct = Math.min(1, Math.max(0, value / max));
  const dash = c * pct;

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size} viewBox="0 0 100 100" className="gauge-ring">
        <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(232,226,214,0.08)" strokeWidth="6" />
        <circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          stroke={stroke}
          strokeWidth="6"
          strokeLinecap="butt"
          strokeDasharray={`${dash} ${c - dash}`}
          style={{ transition: "stroke-dasharray 800ms cubic-bezier(0.22,1,0.36,1)" }}
        />
      </svg>
      <div className="-mt-[4.6rem] mb-8 text-center">
        <div className="mono text-xl text-[var(--ink)]">
          {typeof value === "number" ? value.toFixed(value >= 100 ? 0 : 1) : value}
          <span className="text-[10px] text-[var(--ink-faint)]"> {unit}</span>
        </div>
        <div className="mt-0.5 text-[11px] text-[var(--ink-faint)]">{label}</div>
      </div>
    </div>
  );
}
