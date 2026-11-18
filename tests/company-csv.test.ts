import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { parseCompanies, parseFundingPence } from '../server/utils/company-csv.ts'
import { calculateCompanyStatistics } from '../server/utils/company-statistics.ts'

test('the fintech seed matches the expected ranking and statistics', () => {
  const csv = readFileSync(new URL('../data/fintech_companies_seed.csv', import.meta.url), 'utf8')
  const companies = parseCompanies(csv)
  const stats = calculateCompanyStatistics(companies)

  assert.equal(stats.companyCount, 100)
  assert.equal(stats.totalFundingPence / 100, 622_301_270)
  assert.equal(stats.medianFundingPence! / 100, 4_146_786)
  assert.deepEqual(stats.regions[0], { region: 'London', companyCount: 78 })
  assert.equal(companies[0]?.name, 'Nevis')
  assert.equal(companies[0]?.fundingPence, 30_314_247 * 100)
  assert.deepEqual(companies.map(company => company.rank), Array.from({ length: 100 }, (_, i) => i + 1))
  assert.equal(companies.filter(company => company.employees === null).length, 3)
})

test('GBP parsing preserves pence and rejects unsupported amounts', () => {
  assert.equal(parseFundingPence(' £1,250.05 '), 125_005)
  assert.equal(parseFundingPence('1200.5'), 120_050)
  assert.equal(parseFundingPence('0'), 0)
  for (const value of ['', 'N/A', '-1', '$100', '£1,25', '1.005', '2m', '1e3']) {
    assert.throws(() => parseFundingPence(value), /GBP amount/, value)
  }
  assert.throws(() => parseFundingPence('90071992547409.92'), /too large/)
})

test('ranks by funding and retains source order for ties', () => {
  const companies = parseCompanies('Rank,Company,Total Raised\n1,First tied,2\n2,Second tied,2\n3,Highest,3\n4,Lowest,1')
  assert.deepEqual(companies.map(({ rank, name }) => [rank, name]), [
    [1, 'Highest'], [2, 'First tied'], [3, 'Second tied'], [4, 'Lowest'],
  ])
  assert.equal(calculateCompanyStatistics(companies).medianFundingPence, 200)
  assert.equal(calculateCompanyStatistics(parseCompanies('Company,Total Raised\nA,0.01\nB,0.02')).medianFundingPence, 1.5)
})

test('validates absent and invalid required values and malformed records', () => {
  assert.throws(() => parseCompanies('Company,Region\nA,London'), /Company and Total Raised/)
  assert.throws(() => parseCompanies('Company,Total Raised\n,1'), /record 2: Company is required/)
  assert.throws(() => parseCompanies('Company,Total Raised\nA,N/A'), /record 2: Total Raised is required/)
  assert.throws(() => parseCompanies('Company,Total Raised\n,\nA,1'), /record 2: Company is required/)
  assert.throws(() => parseCompanies('Company,Total Raised\nA,invalid'), /record 2.*GBP/)
  assert.throws(() => parseCompanies('Company,Total Raised\nA,1,extra'), /record 2: expected 2 fields/)
  assert.throws(() => parseCompanies('Company,Total Raised\n"A,1'), /Invalid CSV/)
  assert.throws(() => parseCompanies('Company,Total Raised'), /at least one company/)
  assert.throws(() => parseCompanies('Company,Company Name,Total Raised\nA,A,1'), /Use only one/)
})

test('accepts reordered columns and aliases, and handles missing regions', () => {
  const companies = parseCompanies('\uFEFF Region , TOTAL FUNDING ,Company Name,Extra\r\nLondon,"£1,000","A, Ltd",x\r\nlondon,500,B,x\r\nN/A,0,C,x\r\n')
  const stats = calculateCompanyStatistics(companies)
  assert.equal(companies[0]?.name, 'A, Ltd')
  assert.equal(companies[0]?.description, null)
  assert.equal(companies[2]?.region, null)
  assert.deepEqual(stats.regions, [{ region: 'London', companyCount: 2 }])
  assert.equal(stats.companiesWithoutRegion, 1)
  assert.equal(stats.medianFundingPence, 50_000)
})
