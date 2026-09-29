/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: 'var(--bg-surface)',
          secondary: 'var(--surface-secondary)',
        },
        petroleum: {
          DEFAULT: 'var(--petroleum)',
          hover: 'var(--petroleum-hover)',
          tint: 'var(--petroleum-tint)',
        },
        ink: {
          DEFAULT: 'var(--ink)',
          secondary: 'var(--ink-secondary)',
          muted: 'var(--ink-muted)',
        },
        border: {
          DEFAULT: 'var(--border)',
          subtle: 'var(--border-subtle)',
          dark: 'var(--border-dark)',
        },
        status: {
          crit: { DEFAULT: 'var(--status-crit)', bg: 'var(--status-crit-bg)', deep: 'var(--status-crit-deep)' },
          warn: { DEFAULT: 'var(--status-warn)', bg: 'var(--status-warn-bg)', deep: 'var(--status-warn-deep)' },
          info: { DEFAULT: 'var(--status-info)', bg: 'var(--status-info-bg)' },
          green: { DEFAULT: 'var(--status-green)', bg: 'var(--status-green-bg)' }
        }
      }
    }
  },
  plugins: [],
}
