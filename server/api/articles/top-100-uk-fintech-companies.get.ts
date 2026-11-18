import { parseCompanies } from '../../utils/company-csv'
import { calculateCompanyStatistics } from '../../utils/company-statistics'

export default defineEventHandler(async () => {
  const csv = await useStorage('assets:datasets').getItem<string>('fintech_companies_seed.csv')
  if (typeof csv !== 'string') {
    throw createError({ statusCode: 500, statusMessage: 'Fintech dataset unavailable' })
  }

  const companies = parseCompanies(csv)
  const statistics = calculateCompanyStatistics(companies)

  return {
    title: `Top ${statistics.companyCount} UK fintech companies by total fundraising`,
    description: `Explore the top ${statistics.companyCount} UK seed-stage fintech companies ranked by total funds raised, with funding figures and a regional breakdown.`,
    introduction: `This ranking covers ${statistics.companyCount} UK fintech companies recorded as seed-stage in the supplied Beauhurst dataset. It compares companies by total funds raised and shows where companies in this selection are based.`,
    companies,
    statistics,
  }
})
