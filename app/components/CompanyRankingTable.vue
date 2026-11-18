<script setup lang="ts">
import type { Company } from '../../server/utils/company-csv'
import { formatFunding } from '../utils/format-funding'

const props = defineProps<{ companies: Company[] }>()

function websiteLink(website: string | null): string | undefined {
  if (!website || !/^https?:\/\//i.test(website)) return

  try {
    const url = new URL(website)
    if (!url.username && !url.password) return url.href
  } catch {
    return undefined
  }
}

const rows = computed(() => props.companies.map(company => ({
  ...company,
  websiteHref: websiteLink(company.website),
})))
</script>

<template>
  <div class="table-scroll" role="region" aria-label="Company ranking table" tabindex="0">
    <table>
      <caption>Companies ordered by total fundraising</caption>
      <thead>
        <tr>
          <th scope="col">Rank</th>
          <th scope="col">Company</th>
          <th scope="col" class="funding">Total raised</th>
          <th scope="col">Region</th>
          <th scope="col">Stage</th>
          <th scope="col">Employees</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="company in rows" :key="company.rank">
          <td>{{ company.rank }}</td>
          <th scope="row">
            <a v-if="company.websiteHref" :href="company.websiteHref">{{ company.name }}</a>
            <template v-else>{{ company.name }}</template>
          </th>
          <td class="funding">{{ formatFunding(company.fundingPence) }}</td>
          <td>{{ company.region ?? 'Unknown' }}</td>
          <td>{{ company.stage ?? 'Unknown' }}</td>
          <td>{{ company.employees ?? 'Unknown' }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.table-scroll {
  overflow-x: auto;
  border: 1px solid #b9ccc3;
  border-radius: 0.5rem;
}
table { width: 100%; border-collapse: collapse; }
caption { padding: 0.75rem; text-align: left; }
thead { background: #e8f3ed; }
th, td {
  padding: 0.65rem 0.75rem;
  border-block-end: 1px solid #d7e3dc;
  text-align: left;
  vertical-align: top;
}
tbody tr:nth-child(even) { background: #f1f6f2; }
tbody tr:last-child > * { border-block-end: 0; }
.funding { text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; }
</style>
