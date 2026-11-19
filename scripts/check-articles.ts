import { deepStrictEqual } from 'node:assert/strict'
import { getArticleBySlug, saveArticle } from '../server/utils/article-store.ts'
import { parseCompanies } from '../server/utils/company-csv.ts'
import { calculateCompanyStatistics } from '../server/utils/company-statistics.ts'
import { parseGeneratedArticleCopy } from '../server/utils/gemini-article.ts'

const companies = parseCompanies(`Company,Total Raised,Region
Example Diagnostics,1500000,London
Example Care Systems,800000,Scotland`)
const copy = parseGeneratedArticleCopy(JSON.stringify({
  title: 'UK healthtech companies ranked by fundraising',
  description: 'Compare funding and regions for the example companies in this UK healthtech dataset.',
  introduction: 'This sample compares fictional healthtech companies by total funds raised.',
  sections: [
    { heading: 'Funding comparison', body: 'The ranking orders the example companies by total fundraising.' },
    { heading: 'Regional coverage', body: 'The dataset includes example companies from London and Scotland.' },
  ],
}))

try {
  const config = {
    supabaseUrl: process.env.NUXT_SUPABASE_URL,
    supabaseSecretKey: process.env.NUXT_SUPABASE_SECRET_KEY,
  }
  const saved = await saveArticle({
    industry: 'Healthtech',
    content: { ...copy, companies, statistics: calculateCompanyStatistics(companies) },
  }, config)
  const retrieved = await getArticleBySlug(saved.slug, config)
  deepStrictEqual(retrieved, saved)
  console.log(`Saved and retrieved sample article at /blog/${saved.slug}`)
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Article check failed.')
  process.exitCode = 1
}
