// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  runtimeConfig: {
    geminiApiKey: '',
    geminiModel: '',
    public: { siteUrl: '' },
  },
  nitro: {
    serverAssets: [{ baseName: 'datasets', dir: '~~/data' }],
  },
})
