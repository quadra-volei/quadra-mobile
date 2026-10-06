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
        tertiary: '#FF6B00',
        quaternary: '#6B1AFF',

        // Surfaces
        'bg-light': '#EFF3FC',
        'bg-light-alt': '#E8EEF8',
        'surface-dark': '#0A0A3C',
        'surface-dark-alt': '#111145',
        white: '#FFFFFF',

        // Text
        'text-primary': '#1A1A2E',
        'text-on-dark': '#FFFFFF',
        'text-muted': '#7A7A9A',
        line: 'rgba(10,10,60,0.10)',

        // Semantic
        success: '#16A34A',
        warning: '#F59E0B',
        danger: '#DC2626',
        info: '#3B82F6',
      },

      fontFamily: {
        // font-display → Climate Crisis (loaded as 'ClimateCrisis-Regular')
        display: ['ClimateCrisis-Regular'],
        // font-num → Russo One
        num: ['RussoOne_400Regular'],
        // font-body → DM Sans
        body: ['DMSans_400Regular'],
        // font-body-medium → DM Sans 500 (prototype's muted-meta weight, e.g.
        // "N partidas encontradas")
        'body-medium': ['DMSans_500Medium'],
        // font-body-semibold → DM Sans 600 (matches the text-body-bold weight)
        'body-semibold': ['DMSans_600SemiBold'],
        // font-body-bold → DM Sans 700 (prototype's dominant UI weight: card
        // titles, tags, badges — see Quadra.html)
        'body-bold': ['DMSans_700Bold'],
        // font-body-extrabold → DM Sans 800 (matches the text-h3 weight)
        'body-extrabold': ['DMSans_800ExtraBold'],
        // font-word → Baloo 2 (wordmark only)
        word: ['Baloo2_600SemiBold'],
        // font-mono → DM Mono
        mono: ['DMMono_500Medium'],
      },

      borderRadius: {
        chip: '16px',
        card: '20px',
        btn: '18px',
        pill: '24px',
        full: '9999px',
      },

      fontSize: {
        display: ['36px', { lineHeight: '44px', fontWeight: '400' }],
        h1: ['21px', { lineHeight: '28px', fontWeight: '400' }],
        // h2 → Climate Crisis in-screen section title, one step below the h1
        // screen header (see DESIGN_SYSTEM "Heading hierarchy").
        h2: ['16px', { lineHeight: '22px', fontWeight: '400' }],
        h3: ['17px', { lineHeight: '24px', fontWeight: '800' }],
        body: ['15px', { lineHeight: '22px', fontWeight: '400' }],
        'body-bold': ['15px', { lineHeight: '22px', fontWeight: '600' }],
        eyebrow: ['11px', { lineHeight: '16px', fontWeight: '700' }],
        caption: ['12px', { lineHeight: '16px', fontWeight: '400' }],
        mono: ['11px', { lineHeight: '16px', fontWeight: '500' }],
        num: ['32px', { lineHeight: '40px', fontWeight: '400' }],
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
        card: '0 2px 12px rgba(10,10,60,0.06)',
        cta: '0 4px 16px rgba(170,221,0,0.30)',
        primary: '0 4px 16px rgba(26,26,255,0.28)',
        fab: '0 4px 16px rgba(26,26,255,0.28)',
        modal: '0 -2px 24px rgba(0,0,0,0.16)',
      },
    },
  },
  plugins: [],
};
