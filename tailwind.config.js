/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // Primary palette
        primary: '#1A1AFF',
        'primary-dark': '#0D0D9E',
        accent: '#AADD00',
        'accent-light': '#C6F135',

        // Surfaces
        'bg-light': '#EFF3FC',
        'bg-light-alt': '#E8EEF8',
        'surface-dark': '#0A0A3C',
        'surface-dark-alt': '#111145',
        white: '#FFFFFF',

        // Text
        'text-primary': '#1A1A2E',
        'text-on-dark': '#FFFFFF',
        'text-muted': '#6B7280',

        // Semantic
        success: '#16A34A',
        warning: '#F59E0B',
        danger: '#DC2626',
        info: '#3B82F6',
      },

      borderRadius: {
        sm: '6px',
        md: '12px',
        lg: '16px',
        xl: '24px',
        full: '9999px',
      },

      fontSize: {
        display: ['32px', { lineHeight: '40px', fontWeight: '700' }],
        h1: ['24px', { lineHeight: '32px', fontWeight: '700' }],
        h2: ['20px', { lineHeight: '28px', fontWeight: '700' }],
        h3: ['18px', { lineHeight: '24px', fontWeight: '600' }],
        body: ['16px', { lineHeight: '24px', fontWeight: '400' }],
        'body-bold': ['16px', { lineHeight: '24px', fontWeight: '600' }],
        caption: ['13px', { lineHeight: '18px', fontWeight: '400' }],
        mini: ['11px', { lineHeight: '14px', fontWeight: '500' }],
      },

      spacing: {
        0: '0px',
        1: '4px',
        2: '8px',
        3: '12px',
        4: '16px',
        6: '24px',
        8: '32px',
        10: '40px',
        12: '48px',
        16: '64px',
        20: '80px',
        24: '96px',
      },

      boxShadow: {
        card: '0 2px 8px rgba(26, 26, 255, 0.08)',
        fab: '0 4px 16px rgba(26, 26, 255, 0.24)',
        modal: '0 -2px 24px rgba(0, 0, 0, 0.16)',
      },
    },
  },
  plugins: [],
};
