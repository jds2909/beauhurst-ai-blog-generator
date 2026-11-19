import { getArticleBySlug } from '../../utils/article-store'

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug') ?? ''
  const article = await getArticleBySlug(slug, useRuntimeConfig(event)).catch(() => {
    throw createError({ statusCode: 503, statusMessage: 'Saved articles are temporarily unavailable' })
  })

  if (!article) throw createError({ statusCode: 404, statusMessage: 'Article not found' })
  return article
})
