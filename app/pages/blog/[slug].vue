<script setup lang="ts">
import type { SavedArticle } from '#shared/types/article'

definePageMeta({ key: route => route.path })

const slug = encodeURIComponent(String(useRoute().params.slug))
const { data: article, error } = await useFetch<SavedArticle>(`/api/articles/${slug}`)

if (!article.value) {
  const statusCode = error.value?.statusCode ?? 500
  throw createError({
    statusCode,
    statusMessage: statusCode === 404 ? 'Article not found' : 'Saved article unavailable',
    fatal: true,
  })
}

const { siteUrl } = useRuntimeConfig().public
const canonical = siteUrl ? new URL(`/blog/${article.value.slug}`, siteUrl).href : undefined

useSeoMeta({
  title: () => article.value?.content.title,
  description: () => article.value?.content.description,
  robots: 'noindex',
  ogType: 'article',
  ogLocale: 'en_GB',
  ogTitle: () => article.value?.content.title,
  ogDescription: () => article.value?.content.description,
  ogUrl: canonical,
})

if (canonical) useHead({ link: [{ rel: 'canonical', href: canonical }] })
</script>

<template>
  <main class="page">
    <NuxtLink to="/">Back to articles</NuxtLink>
    <IndustryArticle
      v-if="article"
      :title="article.content.title"
      :introduction="article.content.introduction"
      :sections="article.content.sections"
      :companies="article.content.companies"
      :statistics="article.content.statistics"
    />
  </main>
</template>
