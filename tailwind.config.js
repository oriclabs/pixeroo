/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './website/**/*.html',
    './website/pwa/**/*.html',
    './browser/**/*.html',
    './shared/**/*.js',
  ],
  theme: {
    extend: {
      colors: {
        saffron: {
          50: '#FFFBEB',
          100: '#FEF3C7',
          200: '#FDE68A',
          300: '#FCD34D',
          400: '#F4C430',
          500: '#D4A017',
          600: '#B8860B',
          700: '#92690A',
          800: '#6B4D09',
          900: '#453208',
          950: '#2A1E05',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
    },
  },
  plugins: [],
};
