<script setup lang="ts">
import type { ArticleContent } from '#shared/types/article'
import { formatFunding } from '../utils/format-funding'

defineProps<{
  title: string
  introduction: string
  companies: ArticleContent['companies']
  statistics: ArticleContent['statistics']
  sections?: ArticleContent['sections']
}>()
</script>

<template>
  <article>
    <header>
      <h1>{{ title }}</h1>
      <p class="introduction">{{ introduction }}</p>
    </header>

    <section v-for="(section, index) in sections" :key="index" :aria-labelledby="`article-section-${index}`">
      <h2 :id="`article-section-${index}`">{{ section.heading }}</h2>
      <p>{{ section.body }}</p>
    </section>

    <section aria-labelledby="funding-heading">
      <h2 id="funding-heading">Funding at a glance</h2>
      <dl class="statistics">
        <div>
          <dt>Companies</dt>
          <dd>{{ statistics.companyCount }}</dd>
        </div>
        <div>
          <dt>Total funding</dt>
          <dd>{{ formatFunding(statistics.totalFundingPence) }}</dd>
        </div>
        <div>
          <dt>Median funding</dt>
          <dd>{{ statistics.medianFundingPence === null ? 'Unavailable' : formatFunding(statistics.medianFundingPence) }}</dd>
        </div>
      </dl>
    </section>

    <section v-if="statistics.regions.length" aria-labelledby="regions-heading">
      <h2 id="regions-heading">Where companies are based</h2>
      <p v-if="statistics.regions[0]">
        {{ statistics.regions[0].region }} accounts for
        {{ statistics.regions[0].companyCount }} of {{ statistics.companyCount }} companies.
      </p>
      <ul>
        <li v-for="region in statistics.regions" :key="region.region">
          {{ region.region }} ({{ region.companyCount }})
        </li>
        <li v-if="statistics.companiesWithoutRegion">Region unavailable ({{ statistics.companiesWithoutRegion }})</li>
      </ul>
    </section>

    <section aria-labelledby="ranking-heading">
      <h2 id="ranking-heading">Company ranking</h2>
      <CompanyRankingTable :companies="companies" />
    </section>
  </article>
</template>

<style scoped>
header { max-width: 50rem; }
.introduction { max-width: 65ch; }
section { margin-block-start: 2.5rem; }
.statistics {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 13rem), 1fr));
  gap: 0.75rem;
}
.statistics > div {
  padding: 1rem;
  background: #e8f3ed;
  border-radius: 0.5rem;
}
dd {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 700;
  overflow-wrap: anywhere;
}
ul { columns: 12rem; }
</style>
