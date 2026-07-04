/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/renderer/index.html', './src/renderer/src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef4ff',
          100: '#d9e6ff',
          200: '#bcd2ff',
          300: '#8eb4ff',
          400: '#598bff',
          500: '#3563f7',
          600: '#2044ec',
          700: '#1a33d4',
          800: '#1c2eac',
          900: '#1d2c88',
          950: '#151d52'
        }
      },
      fontFamily: {
        sans: [
          'Inter',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Roboto',
          'Helvetica',
          'Arial',
          'sans-serif'
        ]
      },
      boxShadow: {
        window: '0 24px 60px -12px rgba(2, 6, 23, 0.55), 0 8px 24px -8px rgba(2, 6, 23, 0.4)'
      },
      keyframes: {
        'window-in': {
          '0%': { opacity: '0', transform: 'scale(0.96) translateY(8px)' },
          '100%': { opacity: '1', transform: 'scale(1) translateY(0)' }
        }
      },
      animation: {
        'window-in': 'window-in 0.14s ease-out'
      }
    }
  },
  plugins: []
}
