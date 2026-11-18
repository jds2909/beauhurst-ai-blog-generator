const gbp = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'GBP',
  minimumFractionDigits: 0,
  maximumFractionDigits: 3,
})

export function formatFunding(pence: number): string {
  return gbp.format(pence / 100)
}
