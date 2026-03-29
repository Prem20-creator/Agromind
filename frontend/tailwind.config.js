/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ocean: {
          50:  '#e8f4f8',
          100: '#b8dce8',
          200: '#88c4d8',
          300: '#58acc8',
          400: '#2894b8',
          500: '#0b5a8e',
          600: '#0a3d62',
          700: '#0f1c2f',
          800: '#091524',
          900: '#040b15',
        },
        wave: {
          400: '#0b4d75',
          500: '#052f4f',
        },
        leaf: {
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
        },
        gold: '#facc15',
        violet: '#8b5cf6',
      },
      fontFamily: {
        sans: ['Roboto', 'system-ui', 'sans-serif'],
      },
      animation: {
        'wave': 'wave 15s linear infinite',
        'wave-slow': 'wave 20s linear infinite reverse',
        'wave-slower': 'wave 25s linear infinite',
        'rise': 'rise 12s linear infinite',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4,0,0.6,1) infinite',
        'fade-up': 'fadeUp 0.4s ease forwards',
        'slide-in': 'slideIn 0.3s ease forwards',
      },
      keyframes: {
        wave: {
          '0%':   { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        rise: {
          '0%':   { transform: 'translateY(0) scale(1)', opacity: '0' },
          '20%':  { opacity: '1' },
          '100%': { transform: 'translateY(-120vh) scale(1.3)', opacity: '0' },
        },
        fadeUp: {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        slideIn: {
          from: { opacity: '0', transform: 'translateX(-12px)' },
          to:   { opacity: '1', transform: 'translateX(0)' },
        },
      },
      backdropBlur: { xs: '2px' },
    },
  },
  plugins: [],
}
