/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/renderer/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Background colors - use for surfaces and containers
        bg: {
          base: 'var(--color-bg-base)',
          surface: 'var(--color-bg-surface)',
          elevated: 'var(--color-bg-elevated)',
          hover: 'var(--color-bg-hover)',
          active: 'var(--color-bg-active)',
          overlay: 'var(--color-bg-overlay)',
        },
        // Foreground/text colors
        fg: {
          primary: 'var(--color-fg-primary)',
          secondary: 'var(--color-fg-secondary)',
          muted: 'var(--color-fg-muted)',
          faint: 'var(--color-fg-faint)',
        },
        // Border colors
        border: {
          DEFAULT: 'var(--color-border-default)',
          subtle: 'var(--color-border-subtle)',
          strong: 'var(--color-border-strong)',
        },
        // Accent colors - for interactive elements
        accent: {
          primary: 'var(--color-accent-primary)',
          'primary-hover': 'var(--color-accent-primary-hover)',
          secondary: 'var(--color-accent-secondary)',
          muted: 'var(--color-accent-muted)',
        },
        // Status/semantic colors
        status: {
          success: 'var(--color-status-success)',
          'success-muted': 'var(--color-status-success-muted)',
          warning: 'var(--color-status-warning)',
          'warning-muted': 'var(--color-status-warning-muted)',
          error: 'var(--color-status-error)',
          'error-muted': 'var(--color-status-error-muted)',
          info: 'var(--color-status-info)',
          'info-muted': 'var(--color-status-info-muted)',
        },
        // Terminal specific
        terminal: {
          bg: 'var(--color-terminal-bg)',
          fg: 'var(--color-terminal-fg)',
          cursor: 'var(--color-terminal-cursor)',
          selection: 'var(--color-terminal-selection)',
        },
      },
      // Use border color as default
      borderColor: {
        DEFAULT: 'var(--color-border-default)',
      },
    },
  },
  plugins: [],
}
