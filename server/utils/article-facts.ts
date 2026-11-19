import { formatFunding } from '../../app/utils/format-funding.ts'
import type { Company } from './company-csv.ts'
import type { calculateCompanyStatistics } from './company-statistics.ts'

export interface ArticleFacts {
  industry: string
  statistics: ReturnType<typeof calculateCompanyStatistics>
  companies: readonly Company[]
}

const countFormat = new Intl.NumberFormat('en-GB')

function usableLabel(value: string, maxLength = 80): boolean {
  return Boolean(value) && value.length <= maxLength && !/[{}<>\p{Cc}]/u.test(value)
}

function countLabels(groups: readonly (readonly string[])[]) {
  const counts = new Map<string, { label: string, companyCount: number }>()
  for (const labels of groups) {
    const distinct = new Map(labels.filter(label => usableLabel(label)).map(label => [label.toLowerCase(), label]))
    for (const [key, label] of distinct) {
      const entry = counts.get(key) ?? { label, companyCount: 0 }
      entry.companyCount++
      counts.set(key, entry)
    }
  }
  return [...counts.values()]
    .sort((a, b) => b.companyCount - a.companyCount || a.label.localeCompare(b.label, 'en-GB'))
    .slice(0, 5)
}

export function buildArticleContext({ industry, statistics, companies }: ArticleFacts) {
  const leadingCompanies = companies.slice(0, 3).map(({ name, fundingPence }) => ({
    name: usableLabel(name) ? name : undefined,
    funding: formatFunding(fundingPence),
  }))
  const topRegion = statistics.regions[0]
  const placeholders: Record<string, string> = {
    companyCount: countFormat.format(statistics.companyCount),
    totalFunding: formatFunding(statistics.totalFundingPence),
  }
  if (usableLabel(industry, 100)) placeholders.industry = industry
  if (statistics.medianFundingPence !== null) {
    placeholders.medianFunding = formatFunding(statistics.medianFundingPence)
  }
  if (topRegion && usableLabel(topRegion.region)) {
    placeholders.topRegion = topRegion.region
    placeholders.topRegionCount = countFormat.format(topRegion.companyCount)
  }
  const leader = leadingCompanies[0]
  if (leader?.name) {
    placeholders.topCompany = leader.name
    placeholders.topCompanyFunding = leader.funding
  }
  const stages = countLabels(companies.map(company => company.stage ? [company.stage] : []))

  return {
    placeholders,
    facts: {
      industry,
      companyCount: statistics.companyCount,
      funding: { total: placeholders.totalFunding, median: placeholders.medianFunding ?? null },
      leadingCompanies,
      jointHighestFunding: Boolean(companies[0] && companies[1]?.fundingPence === companies[0].fundingPence),
      regions: statistics.regions.slice(0, 5).filter(({ region }) => usableLabel(region)),
      jointLargestRegion: Boolean(topRegion && statistics.regions[1]?.companyCount === topRegion.companyCount),
      companiesWithoutRegion: statistics.companiesWithoutRegion,
      categories: countLabels(companies.map(company => company.industries)).map(({ label }) => label),
      stages: stages.map(({ label }) => label),
      allCompaniesShareStage: stages[0]?.companyCount === companies.length,
      availablePlaceholders: Object.keys(placeholders).map(key => `{${key}}`),
    },
  }
}
