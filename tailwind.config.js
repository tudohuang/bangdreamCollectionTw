/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // 夢幻底色 — 用 CSS 變數，深色模式自動切換（見 index.css）
        dream: {
          bg: 'rgb(var(--c-bg) / <alpha-value>)',
          ink: 'rgb(var(--c-ink) / <alpha-value>)',
          sub: 'rgb(var(--c-sub) / <alpha-value>)',
          faint: 'rgb(var(--c-faint) / <alpha-value>)',
          line: 'rgb(var(--c-line) / <alpha-value>)',
        },
        // 主題色：乾淨靛藍（單色系 chrome，讓樂團色跳出）
        bloom: {
          pink: '#a5b4fc',
          rose: '#6366f1',
          violet: '#6366f1',
          indigo: '#4f46e5',
          sky: '#818cf8',
        },
      },
      fontFamily: {
        // 樸素版：統一用一般黑體，不用圓潤可愛字
        display: ['"Noto Sans TC"', 'system-ui', 'sans-serif'],
        sans: ['"Noto Sans TC"', 'system-ui', 'sans-serif'],
        round: ['"Noto Sans TC"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        glass: 'none',
        glassHover: '0 8px 24px -8px rgba(0, 0, 0, 0.28)',
        glow: 'none',
        pill: 'none',
      },
      backdropBlur: {
        xs: '2px',
      },
      keyframes: {
        float: {
          '0%,100%': { transform: 'translateY(0) translateX(0)' },
          '50%': { transform: 'translateY(-26px) translateX(14px)' },
        },
        floatSlow: {
          '0%,100%': { transform: 'translateY(0) translateX(0) scale(1)' },
          '50%': { transform: 'translateY(30px) translateX(-18px) scale(1.06)' },
        },
        twinkle: {
          '0%,100%': { opacity: '0.25', transform: 'scale(0.85)' },
          '50%': { opacity: '1', transform: 'scale(1.15)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '200% center' },
          '100%': { backgroundPosition: '-200% center' },
        },
        riseIn: {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pop: {
          '0%': { opacity: '0', transform: 'scale(0.92)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
      animation: {
        float: 'float 16s ease-in-out infinite',
        floatSlow: 'floatSlow 22s ease-in-out infinite',
        twinkle: 'twinkle 3.5s ease-in-out infinite',
        shimmer: 'shimmer 6s linear infinite',
        riseIn: 'riseIn 0.5s ease-out both',
        pop: 'pop 0.25s ease-out both',
      },
    },
  },
  plugins: [],
}
