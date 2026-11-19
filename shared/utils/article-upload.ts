export const maxCsvBytes = 1024 * 1024
export const maxIndustryLength = 100

export function isIndustryName(value: string): boolean {
  return value.length <= maxIndustryLength &&
    /[\p{L}\p{N}]/u.test(value) &&
    /^[\p{L}\p{M}\p{N} &'’().,+/–-]+$/u.test(value)
}
