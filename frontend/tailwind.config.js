/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        fraunces: ['Fraunces', 'serif'],
        sans: ['DM Sans', 'system-ui', 'sans-serif'],
        mono: ['DM Mono', 'monospace'],
      },
      colors: {
        ink: 'var(--ink)',
        ink2: 'var(--ink2)',
        ink3: 'var(--ink3)',
        ink4: 'var(--ink4)',
        snow: 'var(--snow)',
        mist: 'var(--mist)',
        fog: 'var(--fog)',
        gold: 'var(--gold)',
        gold2: 'var(--gold2)',
        jade: 'var(--jade)',
        rose: 'var(--rose)',
        sky: 'var(--sky)',
        amber: 'var(--amber)',
        violet: 'var(--violet)',
      },
    },
  },
  plugins: [],
};
