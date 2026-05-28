// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-01-01',
  devtools: { enabled: true },

  // Pruvious ships as a Nuxt layer. Extending it wires up the schema, the API,
  // the dashboard, and the database.
  extends: ['pruvious'],

  // Configure the database, uploads, auth, i18n, and more here.
  // See https://pruvious.com/docs for the full reference.
  // pruvious: {},
})
