/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        'brand-blue': '#0A192F',
        'brand-navy': '#172A46',
        'brand-gold': '#D4AF37',
        'brand-light': '#CCD6F6',
        'brand-secondary': '#8892B0'
      },
      fontFamily: {
        cairo: ['"Cairo"', 'sans-serif']
      },
      boxShadow: {
        soft: '0 20px 25px -15px rgba(0, 0, 0, 0.45)'
      }
    }
  },
  plugins: []
};
