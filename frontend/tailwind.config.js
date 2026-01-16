/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Oxygen', 'Ubuntu', 'Cantarell', 'sans-serif'],
        display: ['Poppins', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Monaco', 'Courier New', 'monospace'],
      },
      colors: {
        primary: {
          DEFAULT: '#667eea',
          50: '#f5f7ff',
          100: '#ebf0ff',
          200: '#d6e0ff',
          300: '#b8c9ff',
          400: '#94a8ff',
          500: '#667eea',
          600: '#5568d3',
          700: '#4552b8',
          800: '#364099',
          900: '#2a3375',
        },
        secondary: {
          DEFAULT: '#764ba2',
          50: '#f8f5fb',
          100: '#f0e8f7',
          200: '#e0d0ee',
          300: '#ccaee0',
          400: '#b388ce',
          500: '#764ba2',
          600: '#663f8a',
          700: '#563473',
          800: '#452a5c',
          900: '#362148',
        },
      },
      backgroundImage: {
        'gradient-primary': 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      },
    },
  },
  plugins: [],
}
