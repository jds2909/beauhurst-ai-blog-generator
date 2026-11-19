import type { Company } from '../../server/utils/company-csv.ts'
import type { calculateCompanyStatistics } from '../../server/utils/company-statistics.ts'
import type { GeneratedArticleCopy } from '../../server/utils/gemini-article.ts'

export interface ArticleContent extends GeneratedArticleCopy {
  companies: Company[]
  statistics: ReturnType<typeof calculateCompanyStatistics>
}

export interface ArticleDraft {
  industry: string
  content: ArticleContent
}

export interface SavedArticle extends ArticleDraft {
  slug: string
}
