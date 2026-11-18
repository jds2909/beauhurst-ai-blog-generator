import Papa from 'papaparse'

// takes csv data into validated, structured company records

const headerAliases = {
  company: ['company', 'company name'],
  totalRaised: ['total raised', 'total funding', 'total fundraising'],
  region: ['region'],
  stage: ['stage'],
  employees: ['employees'],
  description: ['description'],
  website: ['website'],
  industries: ['industries'],
} as const

export interface Company {
  rank: number
  name: string
  fundingPence: number
  region: string | null
  stage: string | null
  employees: string | null
  description: string | null
  website: string | null
  industries: string[]
}

function optionalText(value = ''): string | null {
  const trimmed = value.trim()
  return !trimmed || /^(n\/?a|-)$/i.test(trimmed) ? null : trimmed
}

/** Parse a non-negative GBP amount into integer pence. */
export function parseFundingPence(value: string): number {
  const match = value.trim().match(/^(?:£\s*)?(\d+|\d{1,3}(?:,\d{3})+)(?:\.(\d{1,2}))?$/)
  if (!match) {
    throw new Error('Enter a non-negative GBP amount, such as £1,250.50.')
  }

  const pounds = match[1]!.replaceAll(',', '')
  const pence = Number(pounds + (match[2] ?? '').padEnd(2, '0'))
  if (!Number.isSafeInteger(pence)) {
    throw new Error('The GBP amount is too large to calculate precisely.')
  }
  return pence
}

export function parseCompanies(csv: string): Company[] {
  const { data, errors } = Papa.parse<string[]>(csv.replace(/^\uFEFF/, ''), {
    delimiter: ',',
    skipEmptyLines: true,
  })
  const [header, ...rows] = data
  if (errors.length) {
    throw new Error(`Invalid CSV: ${errors[0]!.message}`)
  }
  if (!header) {
    throw new Error('The CSV is empty.')
  }

  const headers = header.map(value => value.trim().toLowerCase().replace(/\s+/g, ' '))
  if (new Set(headers).size !== headers.length) {
    throw new Error('The CSV contains duplicate column names.')
  }

  function column(field: keyof typeof headerAliases): number {
    const aliases: readonly string[] = headerAliases[field]
    const matches = headers.filter(name => aliases.includes(name))
    if (matches.length > 1) {
      throw new Error(`Use only one of these columns: ${aliases.join(', ')}.`)
    }
    return matches.length ? headers.indexOf(matches[0]!) : -1
  }

  const nameColumn = column('company')
  const fundingColumn = column('totalRaised')
  if (nameColumn < 0 || fundingColumn < 0) {
    throw new Error('The CSV must include Company and Total Raised columns (or supported aliases).')
  }
  if (!rows.length) {
    throw new Error('The CSV must contain at least one company.')
  }

  const region = column('region')
  const stage = column('stage')
  const employees = column('employees')
  const description = column('description')
  const website = column('website')
  const industries = column('industries')

  const companies = rows.map((row, index) => {
    const record = index + 2
    if (row.length !== header.length) {
      throw new Error(`CSV record ${record}: expected ${header.length} fields, found ${row.length}.`)
    }

    const name = optionalText(row[nameColumn])
    if (!name) {
      throw new Error(`CSV record ${record}: Company is required.`)
    }
    const funding = optionalText(row[fundingColumn])
    if (!funding) {
      throw new Error(`CSV record ${record}: Total Raised is required.`)
    }

    let fundingPence: number
    try {
      fundingPence = parseFundingPence(funding)
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'Invalid GBP amount.'
      throw new Error(`CSV record ${record}: Total Raised. ${reason}`)
    }

    return {
      name,
      fundingPence,
      region: optionalText(row[region]),
      stage: optionalText(row[stage]),
      employees: optionalText(row[employees]),
      description: optionalText(row[description]),
      website: optionalText(row[website]),
      industries: (optionalText(row[industries]) ?? '').split(';').map(tag => tag.trim()).filter(Boolean),
    }
  })

  // JavaScript's stable sort retains CSV order for ties.
  return companies
    .sort((a, b) => b.fundingPence - a.fundingPence)
    .map((company, index) => ({ ...company, rank: index + 1 }))
}
