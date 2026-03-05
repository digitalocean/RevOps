/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html","./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Geist','system-ui','sans-serif'],
        mono: ['Geist Mono','monospace'],
      },
      colors: {
        obsidian: {
          950: '#070809',
          900: '#0d0e14',
          850: '#111318',
          800: '#16181f',
          750: '#1a1d27',
          700: '#1f2235',
          600: '#252840',
          500: '#2e3352',
        },
        ink: {
          900: '#e8eaf2',
          700: '#b0b3c6',
          500: '#7a7e99',
          300: '#454966',
          200: '#2d3050',
        },
        accent: {
          DEFAULT: '#7c6af7',
          dim:     '#5c4fd6',
          glow:    'rgba(124,106,247,0.18)',
          subtle:  'rgba(124,106,247,0.08)',
        },
        jade:   { DEFAULT:'#2dd4a0', dim:'#1a9e75', glow:'rgba(45,212,160,0.15)' },
        amber:  { DEFAULT:'#f5a623', dim:'#c47e0a', glow:'rgba(245,166,35,0.15)' },
        rose:   { DEFAULT:'#f25f5c', dim:'#c93e3b', glow:'rgba(242,95,92,0.15)'  },
        sky:    { DEFAULT:'#52b8f5', dim:'#2490d4', glow:'rgba(82,184,245,0.15)' },
        violet: { DEFAULT:'#c084fc', dim:'#9333ea', glow:'rgba(192,132,252,0.15)' },
      },
      boxShadow: {
        'card':    '0 1px 3px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.04)',
        'card-hover': '0 4px 16px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.07)',
        'modal':   '0 32px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.06)',
        'glow':    '0 0 20px rgba(124,106,247,0.3)',
        'glow-sm': '0 0 10px rgba(124,106,247,0.2)',
        'inset':   'inset 0 1px 0 rgba(255,255,255,0.06)',
      },
      backgroundImage: {
        'gradient-card': 'linear-gradient(135deg, rgba(255,255,255,0.03) 0%, transparent 100%)',
        'gradient-accent': 'linear-gradient(135deg, #7c6af7 0%, #9f7aea 100%)',
        'gradient-jade':   'linear-gradient(135deg, #2dd4a0 0%, #06b6d4 100%)',
        'gradient-surface': 'linear-gradient(180deg, rgba(255,255,255,0.04) 0%, transparent 100%)',
      },
    },
  },
  plugins: [],
}
