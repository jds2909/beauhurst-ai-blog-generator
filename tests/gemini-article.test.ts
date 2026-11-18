import assert from 'node:assert/strict'
import { test } from 'node:test'
import { parseCompanies } from '../server/utils/company-csv.ts'
import { calculateCompanyStatistics } from '../server/utils/company-statistics.ts'
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
    JSON.stringify({ ...example, introduction: '<script>example</script>' }),
  ]) {
    assert.throws(() => parseGeneratedArticleCopy(text), /invalid article copy/)
  }
})

const companies = parseCompanies('Company,Total Raised,Website,Region,Stage\nA,100,https://example.com/,London,Seed')
const facts = { industry: 'Fintech', statistics: calculateCompanyStatistics(companies), examples: companies }
const config = { geminiApiKey: 'test-secret', geminiModel: 'gemini-test' }

test('sends only selected dataset facts and extracts the structured content', async (context) => {
  const request = context.mock.method(globalThis, 'fetch', async () => Response.json({
    candidates: [{ finishReason: 'STOP', content: { parts: [
      { thought: true, text: 'Hidden thought' },
      { text: JSON.stringify(example) },
    ] } }],
  }))

  assert.deepEqual(await generateArticleCopy(facts, config), example)
  const [url, options] = request.mock.calls[0]!.arguments as Parameters<typeof fetch>
  assert.match(String(url), /\/gemini-test:generateContent$/)
  assert.equal(new Headers(options?.headers).get('x-goog-api-key'), config.geminiApiKey)
  const body = String(options?.body)
  assert.ok(!body.includes(config.geminiApiKey))
  assert.ok(!body.includes('example.com'))
  assert.deepEqual(JSON.parse(JSON.parse(body).contents[0].parts[0].text), {
    industry: 'Fintech', companyCount: 1, fundingPence: { total: 10000, median: 10000 },
    regions: [{ region: 'London', companyCount: 1 }], companiesWithoutRegion: 0,
    exampleCompanies: [{ stage: 'Seed', industries: [] }],
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
