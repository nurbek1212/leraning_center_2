/** @type {import('tailwindcss').Config} */

// Neytral (slate) ranglar CSS o'zgaruvchilari orqali beriladi: tungi rejimda qiymatlar o'zgaradi,
// shuning uchun sahifalardagi `text-slate-900`, `border-slate-200` kabi sinflar ikkala rejimda to'g'ri ishlaydi.
const slate = Object.fromEntries(
  [50, 100, 200, 300, 400, 500, 600, 700, 800, 900].map((n) => [n, `rgb(var(--slate-${n}) / <alpha-value>)`])
);

export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        slate,
        brand: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
          DEFAULT: 'rgb(37 99 235 / <alpha-value>)',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(15, 23, 42, 0.04), 0 1px 3px rgba(15, 23, 42, 0.06)',
        pop: '0 16px 40px -12px rgba(15, 23, 42, 0.28)',
      },
      keyframes: {
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        'pop-in': {
          from: { opacity: '0', transform: 'translateY(8px) scale(0.98)' },
          to: { opacity: '1', transform: 'none' },
        },
        'slide-in': {
          from: { opacity: '0', transform: 'translateX(16px)' },
          to: { opacity: '1', transform: 'none' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.15s ease-out',
        'pop-in': 'pop-in 0.18s ease-out',
        'slide-in': 'slide-in 0.2s ease-out',
      },
    },
  },
  plugins: [],
};
