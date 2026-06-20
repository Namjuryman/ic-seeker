/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef1ff',
          100: '#dbe0ff',
          200: '#c0c7ff',
          300: '#969ffb',
          400: '#6c77f5',
          500: '#4f6af3',
          600: '#3d56d5',
          700: '#2e41b0',
          800: '#1e2d7a',
          900: '#0f1a4a',
        },
        surface: {
          bg: '#f1f3f9',
          elevated: '#f5f7fb',
          panel: '#ffffff',
          soft: '#f8fafc',
          warm: '#fafbfc',
        },
        ink: {
          text: '#0f172a',
          secondary: '#334155',
          muted: '#64748b',
          subtle: '#94a3b8',
          inverse: '#ffffff',
        },
        line: {
          DEFAULT: '#e2e8f0',
          strong: '#cbd5e1',
          subtle: '#eef2f7',
        },
        semantic: {
          green: '#10b981',
          'green-soft': '#ecfdf5',
          'green-deep': '#059669',
          warn: '#f59e0b',
          'warn-soft': '#fffbeb',
          danger: '#ef4444',
          'danger-soft': '#fef2f2',
        },
      },
      borderRadius: {
        'sm': '6px',
        'DEFAULT': '10px',
        'md': '12px',
        'lg': '16px',
        'xl': '20px',
      },
      boxShadow: {
        'xs': '0 1px 2px rgba(15, 23, 42, 0.04)',
        'sm': '0 1px 3px rgba(15, 23, 42, 0.06), 0 1px 2px rgba(15, 23, 42, 0.04)',
        'DEFAULT': '0 4px 6px -1px rgba(15, 23, 42, 0.06), 0 2px 4px -2px rgba(15, 23, 42, 0.04)',
        'md': '0 10px 15px -3px rgba(15, 23, 42, 0.07), 0 4px 6px -4px rgba(15, 23, 42, 0.04)',
        'lg': '0 20px 25px -5px rgba(15, 23, 42, 0.08), 0 8px 10px -6px rgba(15, 23, 42, 0.04)',
        'xl': '0 25px 50px -12px rgba(15, 23, 42, 0.12)',
        'inner': 'inset 0 2px 4px rgba(15, 23, 42, 0.04)',
        'accent': '0 4px 14px rgba(79, 106, 243, 0.25)',
      },
      fontFamily: {
        sans: ['Inter', 'Segoe UI', 'Arial', 'Microsoft YaHei', 'sans-serif'],
      },
      transitionTimingFunction: {
        'smooth': 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
      transitionDuration: {
        'fast': '150ms',
        'normal': '200ms',
        'slow': '300ms',
      },
    },
  },
  plugins: [],
}
