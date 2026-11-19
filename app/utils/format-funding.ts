const currencyOptions = {
  style: 'currency',
  currency: 'GBP',
} as const

const wholePounds = new Intl.NumberFormat('en-GB', {
  ...currencyOptions,
  maximumFractionDigits: 0,
})
const poundsAndPence = new Intl.NumberFormat('en-GB', currencyOptions)

export function formatFunding(pence: number): string {
  const formatter = pence % 100 === 0 ? wholePounds : poundsAndPence
  return formatter.format(pence / 100)
}
