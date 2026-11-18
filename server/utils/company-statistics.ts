import type { Company } from './company-csv.ts'

export function calculateCompanyStatistics(companies: readonly Company[]) {
  const totalsByRegion = new Map<string, { region: string, companyCount: number }>()
  let companiesWithoutRegion = 0
  let totalFundingPence = 0

  for (const company of companies) {
    totalFundingPence += company.fundingPence
    if (!Number.isSafeInteger(totalFundingPence)) {
      throw new Error('The combined funding is too large to calculate precisely.')
    }

    if (!company.region) {
      companiesWithoutRegion++
      continue
    }

    const key = company.region.toLowerCase()
    const entry = totalsByRegion.get(key) ?? { region: company.region, companyCount: 0 }
    entry.companyCount++
    totalsByRegion.set(key, entry)
  }

  const funding = companies.map(company => company.fundingPence).sort((a, b) => a - b)
  const middle = Math.floor(funding.length / 2)
  const medianFundingPence = funding.length === 0
    ? null
    : funding.length % 2 === 0
      ? (funding[middle - 1]! + funding[middle]!) / 2
      : funding[middle]!

  return {
    companyCount: companies.length,
    totalFundingPence,
    medianFundingPence,
    companiesWithoutRegion,
    regions: [...totalsByRegion.values()].sort((a, b) =>
      b.companyCount - a.companyCount || a.region.localeCompare(b.region, 'en-GB'),
    ),
  }
}
