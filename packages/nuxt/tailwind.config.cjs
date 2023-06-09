/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './playground/components/**/*.{js,vue,ts}',
    './playground/layouts/**/*.vue',
    './playground/pages/**/*.vue',
    './playground/plugins/**/*.{js,ts}',
    './playground/nuxt.config.{js,ts}',
    './playground/app.vue',
  ],
  theme: {
    extend: {
      container: {
        center: true,
        screens: {},
      },
      maxWidth: {
        '8xl': '90rem',
      },
    },
  },
  plugins: [],
}
