import assert from 'node:assert/strict'
import { test } from 'node:test'
import { parseCompanies } from '../server/utils/company-csv.ts'
import { calculateCompanyStatistics } from '../server/utils/company-statistics.ts'
import { buildArticleContext } from '../server/utils/article-facts.ts'
import { generateArticleCopy, parseGeneratedArticleCopy } from '../server/utils/gemini-article.ts'

const example = {
  title: 'UK fintech companies ranked by fundraising',
  description: 'Compare fundraising and regions across the companies in this fintech ranking.',
  introduction: 'Explore the fintech companies in the dataset by total funds raised.',
  sections: [
    { heading: 'Fundraising in context', body: 'The table orders the companies by the amount they raised.' },
    { heading: 'Regional breakdown', body: 'The regional breakdown shows where the listed companies are based.' },
  ],
}

test('parses structured article copy and trims surrounding whitespace', () => {
  assert.deepEqual(parseGeneratedArticleCopy(JSON.stringify({ ...example, title: ` ${example.title} ` })), example)
  const sections = [...example.sections, { heading: 'Reading the table', body: 'Each row describes a company.' }]
  assert.deepEqual(parseGeneratedArticleCopy(JSON.stringify({ ...example, sections })).sections, sections)
})

test('rejects missing, blank and incorrectly typed fields', () => {
  for (const value of [
    { ...example, title: undefined },
    { ...example, description: '   ' },
    { ...example, introduction: ['text'] },
    { ...example, sections: undefined },
    { ...example, sections: [example.sections[0], { heading: 'Missing body' }] },
    { ...example, companies: [] },
  ]) {
    assert.throws(() => parseGeneratedArticleCopy(JSON.stringify(value)), /invalid article copy/)
  }
})

test('rejects malformed JSON, wrong section counts, long text, markup and figures', () => {
  for (const text of [
    '{', 'null', '[]', '```json\n{}\n```',
    JSON.stringify({ ...example, sections: [example.sections[0]] }),
    JSON.stringify({ ...example, sections: [...example.sections, ...example.sections] }),
    JSON.stringify({ ...example, title: 'x'.repeat(76) }),
    JSON.stringify({ ...example, title: 'Top 100 fintech companies' }),
    JSON.stringify({ ...example, introduction: 'Companies raised five million pounds.' }),
    JSON.stringify({ ...example, introduction: '<script>example</script>' }),
  ]) {
    assert.throws(() => parseGeneratedArticleCopy(text), /invalid article copy/)
  }
})

const companies = parseCompanies('Company,Total Raised,Website,Region,Stage,Industries,Description\nExample 7,100,https://example.com/,London,Seed,Payments;payments,Private example text\nB,50,,Scotland,Growth,Payments,')
const facts = { industry: 'Fintech', statistics: calculateCompanyStatistics(companies), companies }
const config = { geminiApiKey: 'test-secret', geminiModel: 'gemini-test' }

test('substitutes exact dataset values using UK currency and count formatting', () => {
  const { placeholders } = buildArticleContext(facts)
  const copy = parseGeneratedArticleCopy(JSON.stringify({
    ...example,
    title: 'Top {companyCount} {industry} Companies Ranked by Funding',
    introduction: '{topCompany} raised {topCompanyFunding}. Combined funding was {totalFunding}.',
    sections: [
      { heading: 'Median funding', body: 'Median funding was {medianFunding}.' },
      { heading: 'Recorded regions', body: '{topRegion} accounted for {topRegionCount} of the companies.' },
    ],
  }), placeholders)
  assert.equal(copy.title, 'Top 2 Fintech Companies Ranked by Funding')
  assert.equal(copy.introduction, 'Example 7 raised \u00a3100. Combined funding was \u00a3150.')
  assert.equal(copy.sections[0]?.body, 'Median funding was \u00a375.')
  assert.equal(copy.sections[1]?.body, 'London accounted for 1 of the companies.')
  assert.throws(() => parseGeneratedArticleCopy(JSON.stringify({
    ...example, introduction: 'The company has a valuation of {topCompanyFunding}.',
  }), placeholders), /invalid article copy/)
})

test('rejects unknown, unavailable, malformed and unresolved placeholders and overlong expansions', () => {
  const { placeholders } = buildArticleContext(facts)
  for (const title of ['{companyTotal}', '{constructor}', '{{companyCount}}', '{totalFunding', 'E{companyCount}', '{companyCount}m']) {
    assert.throws(() => parseGeneratedArticleCopy(JSON.stringify({ ...example, title }), placeholders), /invalid article copy/)
  }
  const sparse = parseCompanies('Company,Total Raised\nA,10')
  const context = buildArticleContext({ industry: 'Example', statistics: calculateCompanyStatistics(sparse), companies: sparse })
  assert.deepEqual(context.facts.regions, [])
  assert.deepEqual(context.facts.categories, [])
  assert.throws(() => parseGeneratedArticleCopy(JSON.stringify({ ...example, title: '{topRegion}' }), context.placeholders), /invalid article copy/)
  for (const industry of ['{unknown}', 'x'.repeat(76)]) {
    assert.throws(() => parseGeneratedArticleCopy(JSON.stringify({ ...example, title: '{industry}' }), { industry }), /invalid article copy/)
  }
})

test('sends only selected dataset facts and extracts the structured content', async (context) => {
  const request = context.mock.method(globalThis, 'fetch', async () => Response.json({
    candidates: [{ finishReason: 'STOP', content: { parts: [
      { thought: true, text: 'Hidden thought' },
      { text: JSON.stringify({ introduction: example.introduction, sections: example.sections }) },
    ] } }],
  }))

  assert.deepEqual(await generateArticleCopy(facts, config), {
    ...example,
    title: 'Top 2 Fintech Companies Ranked by Funding',
    description: 'Explore total funding for 2 Fintech companies in the supplied dataset and compare the recorded amounts raised.',
  })
  const [url, options] = request.mock.calls[0]!.arguments as Parameters<typeof fetch>
  assert.match(String(url), /\/gemini-test:generateContent$/)
  assert.equal(new Headers(options?.headers).get('x-goog-api-key'), config.geminiApiKey)
  const body = String(options?.body)
  assert.ok(!body.includes(config.geminiApiKey))
  assert.ok(!body.includes('example.com'))
  assert.ok(!body.includes('Private example text'))
  assert.deepEqual(JSON.parse(JSON.parse(body).contents[0].parts[0].text), {
    industry: 'Fintech', companyCount: 2, funding: { total: '\u00a3150', median: '\u00a375' },
    leadingCompanies: [{ name: 'Example 7', funding: '\u00a3100' }, { name: 'B', funding: '\u00a350' }],
    jointHighestFunding: false,
    regions: [{ region: 'London', companyCount: 1 }, { region: 'Scotland', companyCount: 1 }],
    jointLargestRegion: true,
    companiesWithoutRegion: 0,
    categories: ['payments'],
    stages: ['Growth', 'Seed'],
    allCompaniesShareStage: false,
    availablePlaceholders: ['{companyCount}', '{totalFunding}', '{industry}', '{medianFunding}', '{topRegion}', '{topRegionCount}', '{topCompany}', '{topCompanyFunding}'],
  })
})

test('reports missing credentials, quota errors, API failures and incomplete candidates safely', async (context) => {
  const fetch = context.mock.method(globalThis, 'fetch', async () => new Response('upstream private detail', { status: 429 }))
  await assert.rejects(generateArticleCopy(facts, {}), /key is missing/)
  assert.equal(fetch.mock.callCount(), 0)
  await assert.rejects(generateArticleCopy(facts, config), /quota reached/)

  fetch.mock.mockImplementationOnce(async () => new Response('upstream private detail', { status: 403 }))
  await assert.rejects(generateArticleCopy(facts, config), { message: 'Gemini API request failed (HTTP 403).' })

  fetch.mock.mockImplementationOnce(async () => Response.json({ candidates: [{ finishReason: 'MAX_TOKENS' }] }))
  await assert.rejects(generateArticleCopy(facts, config), /invalid article copy/)
})
