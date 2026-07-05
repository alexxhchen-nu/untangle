/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        earth: {
          50: '#fdf8f0',
          100: '#f5e6d0',
          200: '#e8c9a0',
          300: '#d4a574',
          400: '#c08850',
          500: '#a06b30',
          600: '#845628',
          700: '#6b4420',
          800: '#55361a',
          900: '#3d2714',
        },
        bronze: {
          50: '#faf6f0',
          100: '#f0e4cc',
          200: '#dcc899',
          300: '#c4a66a',
          400: '#b08944',
          500: '#96702e',
          600: '#7a5a24',
          700: '#60461c',
          800: '#4a3616',
          900: '#362810',
        },
      },
      fontFamily: {
        sans: ['"Noto Sans SC"', '"PingFang SC"', '"Microsoft YaHei"', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
