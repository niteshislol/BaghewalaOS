import React from 'react';

interface SteamPlumeSvgProps {
  radius?: number;
  temperature?: number;
  className?: string;
}

export const SteamPlumeSvg: React.FC<SteamPlumeSvgProps> = ({
  radius = 18.4,
  temperature = 214.8,
  className = '',
}) => {
  return (
    <div className={`flex flex-col items-center justify-center p-3 bg-surface rounded-lg border border-border shadow-subtle ${className}`}>
      <div className="w-full flex items-center justify-between mb-2">
        <span className="text-[11px] font-semibold tracking-wider text-ink-secondary uppercase">
          Steam Plume Radial Isotherm Profile
        </span>
        <span className="font-mono text-xs text-petroleum font-bold">
          R = {radius} m
        </span>
      </div>

      <svg
        viewBox="0 0 320 200"
        className="w-full h-auto max-w-[320px] select-none"
        role="img"
        aria-label="Steam Plume Isotherm Profile"
      >
        <defs>
          <radialGradient id="steamHeatGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="var(--status-crit)" stopOpacity="0.85" />
            <stop offset="40%" stopColor="var(--petroleum)" stopOpacity="0.65" />
            <stop offset="75%" stopColor="var(--status-warn)" stopOpacity="0.35" />
            <stop offset="100%" stopColor="var(--status-green)" stopOpacity="0.05" />
          </radialGradient>
        </defs>

        {/* Overburden Shale Layer */}
        <rect x="10" y="15" width="300" height="20" className="fill-canvas-subtle stroke-border" rx="2" strokeWidth="1" />
        <text x="20" y="29" className="font-sans text-[9px] font-semibold fill-ink-secondary tracking-wider uppercase">
          Upper Caprock Shale (TVD 1,142 m)
        </text>

        {/* Underburden Shale Layer */}
        <rect x="10" y="165" width="300" height="20" className="fill-canvas-subtle stroke-border" rx="2" strokeWidth="1" />
        <text x="20" y="179" className="font-sans text-[9px] font-semibold fill-ink-secondary tracking-wider uppercase">
          Underburden Bounding Shale (TVD 1,280 m)
        </text>

        {/* Sand Matrix Background */}
        <rect x="10" y="38" width="300" height="124" className="fill-surface-secondary stroke-border-subtle" strokeWidth="1" />

        {/* Vertical Wellbore Track */}
        <line x1="160" y1="15" x2="160" y2="185" className="stroke-ink" strokeWidth="3.5" />
        <line x1="160" y1="75" x2="160" y2="125" className="stroke-petroleum" strokeWidth="6" strokeDasharray="3 2" />

        {/* Concentric Thermal Isotherms */}
        <ellipse cx="160" cy="100" rx="110" ry="52" fill="none" stroke="var(--status-info)" strokeWidth="1" strokeDasharray="4 3" />
        <ellipse cx="160" cy="100" rx="85" ry="42" fill="none" stroke="var(--status-warn)" strokeWidth="1.5" />
        <ellipse cx="160" cy="100" rx="60" ry="32" fill="url(#steamHeatGrad)" stroke="var(--petroleum)" strokeWidth="2" />

        {/* Perforations label */}
        <circle cx="160" cy="100" r="3" className="fill-surface stroke-ink" strokeWidth="1.5" />

        {/* Thermal Front Radius Callout */}
        <line x1="160" y1="100" x2="220" y2="100" stroke="var(--petroleum)" strokeWidth="1.5" />
        <text x="190" y="94" textAnchor="middle" className="font-mono text-[9px] font-bold fill-ink">
          R = {radius}m
        </text>

        {/* Current BHT Label */}
        <rect x="175" y="125" width="105" height="18" rx="3" className="fill-surface stroke-border" />
        <text x="227" y="137" textAnchor="middle" className="font-mono text-[9px] font-semibold fill-ink">
          Front: {temperature} °C
        </text>
      </svg>

      <div className="w-full flex items-center justify-between text-[11px] text-ink-muted mt-2 pt-2 border-t border-border-subtle px-1">
        <span>Swept Vol: <strong className="font-mono text-ink">11,400 m³</strong></span>
        <span>Retained Heat: <strong className="font-mono text-status-green">68.4%</strong></span>
      </div>
    </div>
  );
};
