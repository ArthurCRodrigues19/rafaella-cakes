/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Paleta Rafaella Cakes
        cream: '#FFF9F4',
        blush: {
          50: '#FDF6F5',
          100: '#FBEAE8',
          200: '#F4D6D6',
          300: '#EBB9B9',
          400: '#DE9A9C',
          500: '#C97B80',
          600: '#A95E65',
          700: '#8A4850',
        },
        champagne: {
          100: '#F7EFE2',
          200: '#EEDFC4',
          300: '#E2C99F',
          400: '#D4B483',
          500: '#B8955E',
          600: '#86683D', // escurecido para contraste AA sobre o creme
        },
        cocoa: {
          50: '#F6F1EE',
          100: '#EADFD9',
          200: '#D6C3B9',
          300: '#B89C8F',
          400: '#98786A',
          500: '#7A5A4B',
          600: '#5E4236',
          700: '#4A3228',
          800: '#3A271F',
          900: '#2E1F19',
        },
      },
      fontFamily: {
        serif: ['var(--font-serif)', 'Georgia', 'serif'],
        script: ['var(--font-script)', 'cursive'],
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 10px 40px -12px rgba(74, 50, 40, 0.18)',
        card: '0 4px 20px -6px rgba(74, 50, 40, 0.12)',
      },
      borderRadius: {
        '4xl': '2rem',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-up': 'fade-up .4s ease-out both',
      },
    },
  },
  plugins: [],
};
