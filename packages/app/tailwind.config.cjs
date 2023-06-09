const defaultTheme = require('tailwindcss/defaultTheme')
const plugin = require('tailwindcss/plugin')

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{html,ts}'],
  theme: {
    extend: {
      borderColor: ({ theme }) => ({
        DEFAULT: theme('colors.gray.200'),
        error: theme('colors.red.700'),
      }),
      colors: {
        primary: {
          50: '#edf8ff',
          100: '#d7edff',
          200: '#b7e1ff',
          300: '#86cfff',
          400: '#4db3ff',
          500: '#2491ff',
          600: '#0d70ff',
          700: '#0652dd',
          800: '#0d47c0',
          900: '#114097',
        },
        gray: {
          50: '#f5f6fa',
          100: '#ebedf3',
          200: '#d2d8e5',
          300: '#abb7ce',
          400: '#7d90b3',
          500: '#566a8f',
          600: '#495a80',
          700: '#3c4968',
          800: '#343f58',
          900: '#2f384b',
        },
        red: {
          50: '#fdf3f3',
          100: '#fce4e4',
          200: '#fbcdcd',
          300: '#f6abab',
          400: '#ef7a7a',
          500: '#e44f4f',
          600: '#d03232',
          700: '#af2626',
          800: '#942424',
          900: '#792323',
        },
      },
      fontFamily: {
        sans: ['Roboto', ...defaultTheme.fontFamily.sans],
      },
      fontSize: {
        'vs': '13px',
        '2xl': ['1.375rem', { lineHeight: '1.875rem' }],
      },
      minHeight: {
        9: '2.25rem',
      },
      ringColor: ({ theme }) => ({
        DEFAULT: theme('colors.primary.400'),
        red: theme('colors.red.300'),
      }),
      screens: {
        lp: { max: '1440px' },
        tl: { max: '1199px' },
        tp: { max: '1023px' },
        ph: { max: '767px' },
      },
      strokeWidth: {
        1.5: 1.5,
      },
    },
  },
  plugins: [
    plugin(function ({ addVariant }) {
      addVariant('children', ['& > *'])
      addVariant('hocus', ['&:hover', '&:focus'])
      addVariant('group-hocus', ['.group:hover &', '.group:focus &'])
      addVariant('parent-hocus', [
        ':hover > &',
        ':focus > &',
        '&:hover',
        '&:focus',
        '&:focus-within',
      ])
      addVariant('sorting', ['.sorting &'])
    }),
  ],
}
