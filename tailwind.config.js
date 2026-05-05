/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
    './electron/**/*.{js,ts,jsx,tsx}'
  ],
  theme: {
    extend: {
      fontFamily: {
        cinzel: ['Cinzel', 'serif'],
        serif: ['EB Garamond', 'serif'],
        sans: ['Inter', 'sans-serif'],
      },
      backgroundImage: {
        'grimoire-texture': "url('https://www.transparenttextures.com/patterns/dark-leather.png')",
        'rune-glow': 'radial-gradient(circle, rgba(212,160,23,0.15) 0%, transparent 70%)',
      },
      boxShadow: {
        'rune-gold': '0 0 15px rgba(212,160,23,0.3)',
        'rune-gold-bright': '0 0 25px rgba(212,160,23,0.5)',
      },
      colors: {
        surface: {
          DEFAULT: '#0D0D0F',
          card: '#16161C',
          sidebar: '#111115',
          glass: 'rgba(255,255,255,0.04)'
        },
        gold: {
          dim:    '#6a5d3a',
          muted:  '#8a7040',
          DEFAULT:'#D4A017',
          bright: '#F0C040',
          glow:   '#B8860B',
          border: 'rgba(212,160,23,0.18)',
          'border-hover': 'rgba(212,160,23,0.45)',
        },
        silver: {
          dim:    '#5a5f6a',
          muted:  '#7a8090',
          DEFAULT:'#9DA8B8',
          bright: '#C8D4E0',
          glow:   '#7890A8',
          border: 'rgba(157,168,184,0.18)',
          'border-hover': 'rgba(157,168,184,0.40)',
        },
        border: {
          subtle: '#1e1e24',
          dark:   '#252530',
        }
      }
    },
  },
  plugins: [],
}