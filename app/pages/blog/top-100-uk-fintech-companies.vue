<script setup lang="ts">
const articlePath = '/blog/top-100-uk-fintech-companies'
const { data: article, error } = await useFetch('/api/articles/top-100-uk-fintech-companies')

if (!article.value) {
  throw createError({
    statusCode: error.value?.statusCode ?? 500,
    statusMessage: 'Fintech article unavailable',
    fatal: true,
  })
}

const { siteUrl } = useRuntimeConfig().public
const canonical = siteUrl ? new URL(articlePath, siteUrl).href : undefined

useSeoMeta({
  title: () => article.value?.title,
  description: () => article.value?.description,
  ogType: 'article',
  ogLocale: 'en_GB',
  ogTitle: () => article.value?.title,
  ogDescription: () => article.value?.description,
  ogUrl: canonical,
})

if (canonical) {
  useHead({ link: [{ rel: 'canonical', href: canonical }] })
}
</script>

<template>
  <main class="page">
    <NuxtLink to="/">Back to articles</NuxtLink>
    <IndustryArticle
      v-if="article"
      :title="article.title"
      :introduction="article.introduction"
      :companies="article.companies"
      :statistics="article.statistics"
    />
  </main>
</template>
