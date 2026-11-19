import assert from 'node:assert/strict'
import test from 'node:test'
import { maxCsvBytes } from '../shared/utils/article-upload.ts'
import { generateSavedArticle } from '../server/utils/article-generation.ts'

const config = {
  geminiApiKey: 'test-gemini',
  supabaseUrl: 'https://example.supabase.co',
  supabaseSecretKey: 'test-supabase',
}
const copy = {
  introduction: 'This ranking compares healthtech companies by total funds raised.',
  sections: [
    { heading: 'Fundraising', body: 'The ranking orders companies by total fundraising.' },
    { heading: 'Regions', body: 'The dataset covers companies in London and Scotland.' },
  ],
}
const csv = 'Company,Total Raised,Region\nFirst Tie,50.25,London\nLeader,100,Scotland\nSecond Tie,50.25,London'
const providerResponse = (text: string) => Response.json({
  candidates: [{ finishReason: 'STOP', content: { parts: [{ text }] } }],
})

async function* chunks(...values: (string | Uint8Array)[]) {
  for (const value of values) yield typeof value === 'string' ? new TextEncoder().encode(value) : value
}

function upload(overrides: Partial<Parameters<typeof generateSavedArticle>[0]> = {}) {
  return { contentType: 'text/csv', encodedIndustry: 'Health%20Tech', body: chunks(csv), ...overrides }
}

test('generates a URL after validated copy and deterministic facts are saved', async (t) => {
  const fetch = t.mock.method(globalThis, 'fetch', async (input: URL | string, init: RequestInit) => {
    const url = new URL(input)
    const body = JSON.parse(String(init.body))
    if (url.hostname === 'generativelanguage.googleapis.com') {
      const facts = JSON.parse(body.contents[0].parts[0].text)
      assert.equal(facts.industry, 'Health Tech')
      assert.deepEqual(facts.funding, { total: '\u00a3200.50', median: '\u00a350.25' })
      assert.deepEqual(facts.leadingCompanies[0], { name: 'Leader', funding: '\u00a3100' })
      return providerResponse(JSON.stringify({ ...copy, introduction: 'Combined funding was {totalFunding}.' }))
    }
    assert.equal(url.href, 'https://example.supabase.co/rest/v1/articles?select=slug%2Cindustry%2Ccontent')
    assert.equal(body.industry, 'Health Tech')
    assert.deepEqual(body.content.sections, copy.sections)
    assert.equal(body.content.introduction, 'Combined funding was \u00a3200.50.')
    assert.deepEqual(body.content.companies.map(({ name, rank, fundingPence }) => [name, rank, fundingPence]), [
      ['Leader', 1, 10000], ['First Tie', 2, 5025], ['Second Tie', 3, 5025],
    ])
    assert.deepEqual(body.content.statistics, {
      companyCount: 3, totalFundingPence: 20050, medianFundingPence: 5025, companiesWithoutRegion: 0,
      regions: [{ region: 'London', companyCount: 2 }, { region: 'Scotland', companyCount: 1 }],
    })
    return Response.json([body], { status: 201 })
  })
  const { url } = await generateSavedArticle(upload(), config)
  assert.match(url, /^\/blog\/health-tech-[a-f0-9]{32}$/)
  assert.equal(fetch.mock.callCount(), 2)
})

test('rejects invalid uploads before contacting either provider', async (t) => {
  const fetch = t.mock.method(globalThis, 'fetch')
  for (const industry of [undefined, '', '   ', '%FF', '<industry>', 'a'.repeat(101)]) {
    await assert.rejects(generateSavedArticle(upload({ encodedIndustry: industry }), config), { statusCode: 400 })
  }
  await assert.rejects(generateSavedArticle(upload({ contentType: 'application/json' }), config), { statusCode: 415 })
  for (const invalid of ['', 'Other,Total Raised\nExample,10', 'Company,Total Raised\nExample,bad', 'Company,Total Raised\n"Example']) {
    await assert.rejects(generateSavedArticle(upload({ body: chunks(invalid) }), config), { statusCode: 400 })
  }
  await assert.rejects(generateSavedArticle(upload({ body: chunks(new Uint8Array([255])) }), config), { statusCode: 400 })
  await assert.rejects(generateSavedArticle(upload({ contentLength: String(maxCsvBytes + 1) }), config), { statusCode: 413 })
  await assert.rejects(generateSavedArticle(upload({ body: chunks(new Uint8Array(maxCsvBytes), 'x') }), config), { statusCode: 413 })
  assert.equal(fetch.mock.callCount(), 0)
})

test('Gemini failures log only safe diagnostic fields and prevent persistence', async (t) => {
  const logger = t.mock.method(console, 'warn', () => {})
  const fetch = t.mock.method(globalThis, 'fetch')
  const timeout = t.mock.method(AbortSignal, 'timeout')
  const cases = [
    { response: () => new Response('private provider details', { status: 503 }), expected: { category: 'upstream_http', upstreamStatus: 503 } },
    { response: () => { throw new Error('private transport details') }, expected: { category: 'transport_failure' } },
    { response: () => { throw new Error('private timeout details') }, expected: { category: 'timeout' } },
    { response: () => new Response('private malformed response'), expected: { category: 'malformed_response', rule: 'provider_json' } },
    { response: () => Response.json({ candidates: [] }), expected: { category: 'malformed_response', rule: 'provider_envelope' } },
    { response: () => providerResponse('private malformed narrative'), expected: { category: 'malformed_response', rule: 'narrative_json' } },
    { response: () => providerResponse('{}'), expected: { category: 'rejected_content', rule: 'narrative_fields' } },
    {
      response: () => providerResponse(JSON.stringify({ ...copy, introduction: 'Funding reached 42 pounds.' })),
      expected: { category: 'rejected_content', rule: 'literal_number' },
    },
    {
      response: () => providerResponse(JSON.stringify({ ...copy, introduction: 'Funding reached {privatePlaceholder}.' })),
      expected: { category: 'rejected_content', rule: 'unknown_placeholder' },
    },
  ]
  const requestIds = new Set<string>()
  for (const [index, { response, expected }] of cases.entries()) {
    if (expected.category === 'timeout') {
      timeout.mock.mockImplementationOnce(() => AbortSignal.abort())
    }
    fetch.mock.mockImplementationOnce(async () => response())
    await assert.rejects(generateSavedArticle(upload(), config), {
      statusCode: 502,
      message: 'Article writing is temporarily unavailable. Please try again in a moment.',
    })
    const [entry] = logger.mock.calls[index]!.arguments
    const { requestId, elapsedMs, ...data } = JSON.parse(String(entry))
    assert.match(requestId, /^[a-f0-9-]{36}$/)
    assert.ok(Number.isInteger(elapsedMs) && elapsedMs >= 0)
    assert.deepEqual(data, { event: 'article_generation_failed', ...expected })
    requestIds.add(requestId)
  }
  assert.equal(requestIds.size, cases.length)
  assert.equal(logger.mock.callCount(), cases.length)
  assert.equal(fetch.mock.callCount(), cases.length)
})

test('a failed Supabase insert returns an error instead of a URL', async (t) => {
  const fetch = t.mock.method(globalThis, 'fetch', async () => providerResponse(JSON.stringify(copy)))
  fetch.mock.mockImplementationOnce(async () => Response.json({ message: 'private database details' }, { status: 500 }), 1)
  await assert.rejects(generateSavedArticle(upload(), config), {
    statusCode: 503,
    message: 'We could not confirm that the article was saved. Please try again in a moment.',
  })
  assert.equal(fetch.mock.callCount(), 2)
})
