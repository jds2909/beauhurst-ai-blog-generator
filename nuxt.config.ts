// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  runtimeConfig: {
    geminiApiKey: '',
    geminiModel: '',
    supabaseUrl: '',
    supabaseSecretKey: '',
    public: { siteUrl: '' },
  },
  nitro: {
    serverAssets: [{ baseName: 'datasets', dir: '~~/data' }],
    vercel: {
      functions: { runtime: 'nodejs24.x', maxDuration: 60 },
    },
  },
})
