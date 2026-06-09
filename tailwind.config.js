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
        inter: ['Inter', 'sans-serif'],
        sans: ['Inter', 'sans-serif'],
        quantico: ['Quantico', 'sans-serif'],
        // Alias pour rétrocompatibilité le temps de la refonte
        cinzel: ['Quantico', 'sans-serif'],
        serif: ['Inter', 'sans-serif'],
      },
      backgroundImage: {
        'rune-glow': 'radial-gradient(circle, rgba(79,164,184,0.15) 0%, transparent 70%)',
      },
      boxShadow: {
        'rune-glacier': '0 0 15px rgba(79,164,184,0.3)',
        'rune-glacier-bright': '0 0 25px rgba(79,164,184,0.5)',
      },
      colors: {
        surface: {
          DEFAULT: '#000000',
          card: '#0E1116',
          sidebar: '#0E1116',
          glass: 'rgba(14, 17, 22, 0.8)',
          deep: '#000000',
        },
        glacier: {
          dim:    'rgba(79, 164, 184, 0.2)',
          muted:  'rgba(79, 164, 184, 0.4)',
          DEFAULT:'#4FA4B8',
          bright: '#8BE0F2',
          glow:   'rgba(79, 164, 184, 0.6)',
        },
        silver: {
          dim:    'rgba(74, 84, 98, 0.4)',
          muted:  'rgba(74, 84, 98, 0.7)',
          DEFAULT:'#D2D7DF',
          dark:   '#4A5462',
          bright: '#FFFFFF',
        },
        // Garder ces alias 'gold' et 'border' pour l'instant afin d'éviter de casser l'application entière d'un coup,
        // puis on les migrera progressivement vers glacier/silver dans les composants.
        gold: {
          dim:    'rgba(79, 164, 184, 0.2)',
          muted:  'rgba(79, 164, 184, 0.4)',
          DEFAULT:'#4FA4B8',
          bright: '#8BE0F2',
          glow:   'rgba(79, 164, 184, 0.6)',
          border: 'rgba(79, 164, 184, 0.3)',
          'border-hover': 'rgba(79, 164, 184, 0.5)',
        },
        border: {
          subtle: '#4A5462',
          dark:   '#0E1116',
        }
      },
      borderRadius: {
        'sm': '2px',
        DEFAULT: '2px',
        'md': '2px',
        'lg': '2px',
        'xl': '2px',
        '2xl': '2px',
        '3xl': '2px',
        'full': '9999px',
      }
    },
  },
  plugins: [],
}