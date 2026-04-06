/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        gather: {
          50:  '#f4f7f2',
          100: '#e4ece1',
          200: '#c8d9c4',
          300: '#a5be9f',
          400: '#82a37c',
          500: '#618a5a',
          600: '#4d7047',
          700: '#3d5a38',
          800: '#2e4329',
          900: '#1f2f1c',
        },
        ink: '#1a1a2e',
        mist: '#f8fafc',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'slide-up':   'slideUp 0.4s cubic-bezier(0.16,1,0.3,1) forwards',
        'slide-down': 'slideDown 0.4s cubic-bezier(0.16,1,0.3,1) forwards',
        'fade-in':    'fadeIn 0.3s ease forwards',
        'panel-in':   'panelIn 0.35s cubic-bezier(0.16,1,0.3,1) forwards',
      },
      keyframes: {
        slideUp: {
          '0%':   { opacity: 0, transform: 'translateY(28px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
        slideDown: {
          '0%':   { opacity: 1, transform: 'translateY(0)' },
          '100%': { opacity: 0, transform: 'translateY(-20px)' },
        },
        fadeIn: {
          '0%':   { opacity: 0 },
          '100%': { opacity: 1 },
        },
        panelIn: {
          '0%':   { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(0)' },
        },
      },
    },
  },
  plugins: [],
}
