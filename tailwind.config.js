/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT: '#ffffff',
          dark: '#0f0f0f',
        },
        surface: {
          DEFAULT: '#f5f5f5',
          dark: '#1a1a1a',
        },
        border: {
          DEFAULT: '#e0e0e0',
          dark: '#2a2a2a',
        },
        text: {
          DEFAULT: '#000000',
          dark: '#ffffff',
        },
        'text-muted': {
          DEFAULT: '#666666',
          dark: '#888888',
        },
        accent: '#3B82F6',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
