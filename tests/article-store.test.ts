import assert from 'node:assert/strict'
import test from 'node:test'
import type { ArticleDraft } from '../shared/types/article.ts'
import { generateArticleSlug, getArticleBySlug, saveArticle } from '../server/utils/article-store.ts'
import { parseCompanies } from '../server/utils/company-csv.ts'
import { calculateCompanyStatistics } from '../server/utils/company-statistics.ts'

const config = { supabaseUrl: 'https://example.supabase.co', supabaseSecretKey: 'test-key' }
const companies = parseCompanies('Company,Total Raised\nExample Company,100000')
const draft: ArticleDraft = {
  industry: 'Health Tech',
  content: {
    title: 'Healthtech fundraising',
    description: 'Compare fundraising across healthtech companies.',
    introduction: 'This ranking compares funds raised.',
    sections: [
      { heading: 'Ranking', body: 'Companies are ordered by fundraising.' },
      { heading: 'Coverage', body: 'The figures cover the supplied dataset.' },
    ],
    companies,
    statistics: calculateCompanyStatistics(companies),
  },
}

test('slugs normalise industry names and use independent random identifiers', () => {
  const slug = generateArticleSlug('  Santé & Health Tech  ')
  assert.match(slug, /^sante-health-tech-[a-f0-9]{32}$/)
  assert.notEqual(slug, generateArticleSlug('Santé & Health Tech'))
  assert.match(generateArticleSlug('東京'), /^industry-[a-f0-9]{32}$/)
  assert.ok(generateArticleSlug('healthtech '.repeat(100)).length <= 96)
})

test('stores complete content in one row and retrieves it by exact slug', async (t) => {
  const fetch = t.mock.method(globalThis, 'fetch', async (url: URL, options: RequestInit) => {
    assert.equal(url.pathname, '/rest/v1/articles')
    assert.equal(url.searchParams.get('select'), 'slug,industry,content')
    assert.equal(new Headers(options.headers).get('apikey'), 'test-key')
    if (options.method === 'POST') {
      assert.equal(new Headers(options.headers).get('prefer'), 'return=representation')
      return Response.json([JSON.parse(String(options.body))], { status: 201 })
    }
    return Response.json([])
  })

  const saved = await saveArticle(draft, config)
  assert.deepEqual(saved, { ...draft, slug: saved.slug })
  fetch.mock.mockImplementationOnce(async (url: URL, options: RequestInit) => {
    assert.equal(options.method, 'GET')
    assert.equal(url.searchParams.get('slug'), `eq.${saved.slug}`)
    return Response.json([saved])
  })
  assert.deepEqual(await getArticleBySlug(saved.slug, config), saved)
  assert.equal(await getArticleBySlug('unknown', config), null)
  assert.equal(await getArticleBySlug('bad.slug', config), null)
  assert.equal(fetch.mock.callCount(), 3)
})

test('distinguishes database failures from missing articles', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => Response.json({ details: 'private' }, { status: 403 }))
  await assert.rejects(getArticleBySlug('unknown', config), { message: 'Could not read the article database.' })
  await assert.rejects(saveArticle(draft, config), { message: 'Could not save the article.' })
  await assert.rejects(getArticleBySlug('unknown', {}), /NUXT_SUPABASE_URL/)
})
