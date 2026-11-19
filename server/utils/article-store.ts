import { randomUUID } from 'node:crypto'
import type { ArticleDraft, SavedArticle } from '../../shared/types/article.ts'

interface ArticleStoreConfig {
  supabaseUrl?: string
  supabaseSecretKey?: string
}

const articleColumns = 'slug,industry,content'

export function isArticleSlug(slug: string): boolean {
  return slug.length <= 96 && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)
}

export function generateArticleSlug(industry: string): string {
  const prefix = industry.normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+/, '').slice(0, 60).replace(/-+$/, '')
  return `${prefix || 'industry'}-${randomUUID().replaceAll('-', '')}`
}

async function requestArticles(
  config: ArticleStoreConfig,
  filters: Record<string, string>,
  draft?: SavedArticle,
): Promise<SavedArticle[]> {
  const url = config.supabaseUrl?.trim()
  const key = config.supabaseSecretKey?.trim()
  if (!url || !key) {
    throw new Error('Set NUXT_SUPABASE_URL and NUXT_SUPABASE_SECRET_KEY on the server.')
  }

  const headers: Record<string, string> = { apikey: key }
  if (draft) {
    headers['Content-Type'] = 'application/json'
    headers.Prefer = 'return=representation'
  }

  try {
    const endpoint = new URL('/rest/v1/articles', url)
    endpoint.search = new URLSearchParams({ select: articleColumns, ...filters }).toString()
    const response = await fetch(endpoint, {
      method: draft ? 'POST' : 'GET',
      headers,
      body: draft ? JSON.stringify(draft) : undefined,
      redirect: 'error',
      signal: AbortSignal.timeout(10_000),
    })
    if (!response.ok) throw new Error('Article database request failed.')
    const rows = await response.json()
    if (!Array.isArray(rows)) throw new Error('Expected article rows.')
    return rows
  } catch {
    // Omit upstream error details, which can include request or database data.
    const message = draft ? 'Could not save the article.' : 'Could not read the article database.'
    throw new Error(message)
  }
}

/** The caller supplies copy and company data that have already been validated. */
export async function saveArticle(draft: ArticleDraft, config: ArticleStoreConfig): Promise<SavedArticle> {
  const industry = draft.industry.trim()
  if (!industry) throw new Error('An article needs an industry.')
  const slug = generateArticleSlug(industry)
  const [saved] = await requestArticles(config, {}, { slug, industry, content: draft.content })
  if (!saved) throw new Error('The article database did not confirm the insert.')
  return saved
}

export async function getArticleBySlug(slug: string, config: ArticleStoreConfig): Promise<SavedArticle | null> {
  if (!isArticleSlug(slug)) return null
  const [article] = await requestArticles(config, { slug: `eq.${slug}`, limit: '1' })
  return article ?? null
}
