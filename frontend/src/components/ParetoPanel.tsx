import type { Recommendation } from "../types";
import { AnimatedNumber } from "./AnimatedNumber";

const LABELS: Record<string, { title: string; blurb: string }> = {
  option_a_production: { title: "Production focus", blurb: "Highest offtake on the front" },
  option_b_efficiency: { title: "Efficiency focus", blurb: "Lowest SOR trade-off" },
  option_c_reliability: { title: "Reliability focus", blurb: "Lowest failure probability" },
  balanced: { title: "Balanced", blurb: "Weighted objective" },
  production_focus: { title: "Production", blurb: "Higher offtake" },
  efficiency_focus: { title: "Efficiency", blurb: "Steam economy" },
  reliability_focus: { title: "Reliability", blurb: "Equipment protection" },
};

interface Props {
  recommended: Recommendation;
  options: Recommendation[];
}

export function ParetoPanel({ recommended, options }: Props) {
  const display = options.length > 0 ? options : [recommended];
  const maxProd = Math.max(...display.map((o) => o.predicted_oil_rate_bopd), 1);
  const maxSor = Math.max(...display.map((o) => o.predicted_sor), 1);

  return (
    <section className="fade-in">
      <div className="flex items-center gap-3">
        <span className="tick-mark" />
        <p className="eyebrow text-[var(--accent)]">Decision front</p>
      </div>
      <h3 className="serif mt-2 text-3xl font-semibold text-[var(--ink)]">Trade-off alternatives</h3>
      <p className="mt-2 max-w-2xl text-sm text-[var(--ink-muted)]">
        Pareto-style choices from the same search. Rings show relative production; bars show SOR load.
      </p>

      <div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {display.map((opt, idx) => {
          const meta = LABELS[opt.label] ?? { title: opt.label, blurb: "" };
          const isRec = Math.abs(opt.score - recommended.score) < 1e-6;
          const pct = (opt.predicted_oil_rate_bopd / maxProd) * 100;
          const sorPct = (opt.predicted_sor / maxSor) * 100;
          const r = 36;
          const c = 2 * Math.PI * r;
          const dash = (c * pct) / 100;

          return (
            <div
              key={opt.label}
              className={`plate p-5 ${isRec ? "border-[var(--accent)]" : ""}`}
              style={isRec ? { boxShadow: "inset 0 0 0 1px var(--accent)" } : undefined}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="eyebrow text-[var(--accent)]">Option {String.fromCharCode(65 + idx)}</p>
                  <p className="serif mt-1 text-xl font-semibold text-[var(--ink)]">{meta.title}</p>
                  <p className="mt-0.5 text-xs text-[var(--ink-faint)]">
                    {meta.blurb}
                    {isRec ? " · default" : ""}
                  </p>
                </div>
                <svg width="88" height="88" viewBox="0 0 100 100" className="gauge-ring shrink-0">
                  <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(232,226,214,0.08)" strokeWidth="5" />
                  <circle
                    cx="50"
                    cy="50"
                    r={r}
                    fill="none"
                    stroke="var(--accent)"
                    strokeWidth="5"
                    strokeDasharray={`${dash} ${c - dash}`}
                    style={{ transition: "stroke-dasharray 700ms ease" }}
                  />
                </svg>
              </div>
              <div className="-mt-10 mb-2 text-center">
                <p className="mono text-lg text-[var(--ink)]">
                  <AnimatedNumber value={opt.predicted_oil_rate_bopd} decimals={1} />
                  <span className="text-[10px] text-[var(--ink-faint)]"> BOPD</span>
                </p>
              </div>
              <div className="mt-6 space-y-3 border-t border-[var(--line)] pt-4">
                <div>
                  <div className="mb-1 flex justify-between text-[10px]">
                    <span className="eyebrow">SOR</span>
                    <span className="mono text-[var(--ink-muted)]">{opt.predicted_sor}</span>
                  </div>
                  <div className="h-px w-full bg-[rgba(232,226,214,0.08)]">
                    <div className="h-px bg-[var(--info)]" style={{ width: `${sorPct}%` }} />
                  </div>
                </div>
                <div className="flex flex-wrap gap-4 text-xs">
                  <span className="mono text-[var(--ink-muted)]">
                    Fail {(opt.predicted_failure_probability * 100).toFixed(1)}%
                  </span>
                  <span className="mono text-[var(--ink-faint)]">
                    {opt.parameters.steam_volume}t · SPM {opt.parameters.spm}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
