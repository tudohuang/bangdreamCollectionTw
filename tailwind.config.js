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
        // 主題色：夜場霓虹 — 粉→紫為主旋律，青為冷光點綴
        bloom: {
          pink: '#f472b6',
          rose: '#ec4899',
          violet: '#a855f7',
          indigo: '#8b5cf6',
          sky: '#22d3ee',
        },
      },
      fontFamily: {
        // 標題／數字：英數用 Outfit（幾何感），中文自動退回 Noto Sans TC
        display: ['Outfit', '"Noto Sans TC"', 'system-ui', 'sans-serif'],
        sans: ['"Noto Sans TC"', 'system-ui', 'sans-serif'],
        round: ['Outfit', '"Noto Sans TC"', 'system-ui', 'sans-serif'],
        // 手寫感：便利貼、站長碎念、塗鴉註記用
        hand: ['"LXGW WenKai TC"', '"Noto Sans TC"', 'cursive'],
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
