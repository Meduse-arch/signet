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
          DEFAULT: 'var(--color-surface)',
          card: 'var(--color-surface-card)',
          sidebar: 'var(--color-surface-sidebar)',
          glass: 'var(--color-surface-glass)',
          deep: 'var(--color-surface-deep)',
        },
        gold: {
          dim:    'var(--color-gold-dim)',
          muted:  'var(--color-gold-muted)',
          DEFAULT:'var(--color-gold-default)',
          bright: 'var(--color-gold-bright)',
          glow:   'var(--color-gold-glow)',
          border: 'var(--color-gold-border)',
          'border-hover': 'var(--color-gold-border-hover)',
        },
        silver: {
          dim:    'var(--color-silver-dim)',
          muted:  'var(--color-silver-muted)',
          DEFAULT:'var(--color-silver-default)',
          bright: 'var(--color-silver-bright)',
          glow:   'var(--color-silver-glow)',
          border: 'var(--color-silver-border)',
          'border-hover': 'var(--color-silver-border-hover)',
        },
        border: {
          subtle: 'var(--color-border-subtle)',
          dark:   'var(--color-border-dark)',
        }
      }
    },
  },
  plugins: [],
}