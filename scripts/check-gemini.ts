import { readFile } from 'node:fs/promises'
import { parseCompanies } from '../server/utils/company-csv.ts'
import { calculateCompanyStatistics } from '../server/utils/company-statistics.ts'
import { generateArticleCopy } from '../server/utils/gemini-article.ts'

try {
  const csv = await readFile(new URL('../data/fintech_companies_seed.csv', import.meta.url), 'utf8')
  const companies = parseCompanies(csv)
  const copy = await generateArticleCopy({
    industry: 'UK fintech',
    statistics: calculateCompanyStatistics(companies),
    examples: companies,
  }, {
    geminiApiKey: process.env.NUXT_GEMINI_API_KEY,
    geminiModel: process.env.NUXT_GEMINI_MODEL,
  })
  console.log(JSON.stringify(copy, null, 2))
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Gemini check failed.')
  process.exitCode = 1
}
