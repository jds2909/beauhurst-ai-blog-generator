import { randomUUID } from 'node:crypto'
import { isIndustryName, maxCsvBytes, maxIndustryLength } from '../../shared/utils/article-upload.ts'
import { saveArticle } from './article-store.ts'
import { parseCompanies } from './company-csv.ts'
import { calculateCompanyStatistics } from './company-statistics.ts'
import { GeminiGenerationError, generateArticleCopy } from './gemini-article.ts'

export class ArticleUploadError extends Error {
  readonly statusCode: number

  constructor(statusCode: number, message: string) {
    super(message)
    this.statusCode = statusCode
  }
}

type GenerationConfig = NonNullable<Parameters<typeof generateArticleCopy>[1]> & Parameters<typeof saveArticle>[1]

interface CsvUpload {
  contentType?: string
  contentLength?: string
  encodedIndustry?: string
  body: AsyncIterable<Uint8Array>
}

function readIndustry(encodedIndustry = ''): string {
  let industry = ''
  // A UTF-8 encoded UTF-16 code unit takes at most nine header characters.
  if (encodedIndustry.length <= maxIndustryLength * 9) {
    try {
      industry = decodeURIComponent(encodedIndustry).trim()
    } catch {
      throw new ArticleUploadError(400, 'Enter a valid industry name.')
    }
  }
  if (!isIndustryName(industry)) {
    throw new ArticleUploadError(400, 'Enter an industry name of up to 100 characters, such as Healthtech.')
  }
  return industry
}

async function readCsv(upload: CsvUpload): Promise<string> {
  if (upload.contentType?.split(';')[0]?.trim().toLowerCase() !== 'text/csv') {
    throw new ArticleUploadError(415, 'Choose a CSV file.')
  }
  const tooLarge = () => new ArticleUploadError(413, 'Choose a CSV file no larger than 1 MB.')
  if (Number(upload.contentLength) > maxCsvBytes) throw tooLarge()

  let size = 0
  let csv = ''
  const decoder = new TextDecoder('utf-8', { fatal: true })
  try {
    for await (const chunk of upload.body) {
      size += chunk.byteLength
      if (size > maxCsvBytes) throw tooLarge()
      csv += decoder.decode(chunk, { stream: true })
    }
    csv += decoder.decode()
  } catch (error) {
    if (error instanceof ArticleUploadError) throw error
    throw new ArticleUploadError(400, 'The CSV could not be read. Upload a UTF-8 CSV file.')
  }
  if (!csv.trim()) throw new ArticleUploadError(400, 'Choose a CSV file that contains company data.')
  return csv
}

export async function generateSavedArticle(upload: CsvUpload, config: GenerationConfig): Promise<{ url: string }> {
  const industry = readIndustry(upload.encodedIndustry)
  const csv = await readCsv(upload)
  let companies: ReturnType<typeof parseCompanies>
  let statistics: ReturnType<typeof calculateCompanyStatistics>
  try {
    companies = parseCompanies(csv)
    statistics = calculateCompanyStatistics(companies)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Check your CSV and try again.'
    throw new ArticleUploadError(400, message)
  }

  const requestId = randomUUID()
  const startedAt = performance.now()
  const copy = await generateArticleCopy({ industry, statistics, companies }, config).catch((error: unknown) => {
    const diagnostic = error instanceof GeminiGenerationError ? error.diagnostic : { category: 'internal_error' }
    console.warn(JSON.stringify({
      event: 'article_generation_failed',
      requestId,
      elapsedMs: Math.round(performance.now() - startedAt),
      ...diagnostic,
    }))
    throw new ArticleUploadError(502, 'Article writing is temporarily unavailable. Please try again in a moment.')
  })
  const saved = await saveArticle({ industry, content: { ...copy, companies, statistics } }, config).catch(() => {
    throw new ArticleUploadError(503, 'We could not confirm that the article was saved. Please try again in a moment.')
  })
  return { url: `/blog/${saved.slug}` }
}
