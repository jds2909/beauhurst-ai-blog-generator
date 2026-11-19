<script setup lang="ts">
import { isIndustryName, maxCsvBytes, maxIndustryLength } from '#shared/utils/article-upload'

useSeoMeta({
  title: 'Company Dataset Blog Generator',
  description: 'Explore company rankings and funding insights from industry datasets.',
})

const industry = ref('')
const file = ref<File>()
const generating = ref(false)
const errorMessage = ref('')
const savedUrl = ref('')

function selectFile(event: Event) {
  file.value = (event.target as HTMLInputElement).files?.[0]
}

async function generateArticle() {
  if (generating.value) return
  errorMessage.value = ''
  savedUrl.value = ''
  const name = industry.value.trim()
  const csv = file.value

  if (!isIndustryName(name)) {
    errorMessage.value = 'Enter a valid industry name, such as Healthtech.'
    return
  }
  if (!csv || !csv.name.toLowerCase().endsWith('.csv') || !csv.size || csv.size > maxCsvBytes) {
    errorMessage.value = 'Choose a non-empty CSV file no larger than 1 MB.'
    return
  }

  generating.value = true
  try {
    const result = await $fetch<{ url: string }>('/api/articles', {
      method: 'POST',
      headers: { 'Content-Type': 'text/csv', 'X-Article-Industry': encodeURIComponent(name) },
      body: csv,
    })
    savedUrl.value = result.url
    await navigateTo(result.url)
  } catch (error) {
    const response = error as { data?: { data?: { message?: string } } }
    errorMessage.value = savedUrl.value
      ? 'The article was saved. Use the link to open it.'
      : response.data?.data?.message ?? 'Article generation failed. Please try again.'
  } finally {
    generating.value = false
  }
}
</script>

<template>
  <main class="page">
    <h1>Company Dataset Blog Generator</h1>
    <p>Explore company rankings, fundraising figures and regional insights from industry datasets.</p>

    <section aria-labelledby="generate-heading">
      <h2 id="generate-heading">Generate an article</h2>
      <form @submit.prevent="generateArticle">
        <fieldset :disabled="generating">
          <label for="industry">Industry name</label>
          <input id="industry" v-model="industry" type="text" required :maxlength="maxIndustryLength">
          <label for="csv">Company CSV</label>
          <input id="csv" type="file" accept=".csv,text/csv" required aria-describedby="csv-help" @change="selectFile">
          <small id="csv-help">Up to 1 MB. Include Company and Total Raised columns.</small>
          <button type="submit">{{ generating ? 'Generating…' : 'Generate Article' }}</button>
        </fieldset>
        <div role="status">
          <p v-if="savedUrl">Article saved. <NuxtLink :to="savedUrl">Open the article</NuxtLink></p>
          <p v-else-if="generating">Writing and saving your article. This may take a moment.</p>
        </div>
        <div role="alert"><p v-if="errorMessage">{{ errorMessage }}</p></div>
      </form>
    </section>

    <section aria-labelledby="articles-heading">
      <h2 id="articles-heading">Articles</h2>
      <NuxtLink to="/blog/top-100-uk-fintech-companies">
        Top 100 UK fintech companies by total fundraising
      </NuxtLink>
    </section>
  </main>
</template>

<style scoped>
section { margin-block-start: 2rem; }
fieldset {
  display: grid;
  gap: 0.5rem;
  margin: 0;
  max-width: 32rem;
  min-width: 0;
  padding: 1rem;
  border: 1px solid #b9ccc3;
  border-radius: 0.5rem;
  background: #e8f3ed;
}
label { font-weight: 600; }
input, button {
  box-sizing: border-box;
  min-width: 0;
  max-width: 100%;
  padding: 0.5rem;
  font: inherit;
}
input { margin-block-end: 0.25rem; }
button {
  justify-self: start;
  margin-block-start: 0.5rem;
  border: 0;
  border-radius: 0.35rem;
  background: #155845;
  color: white;
  cursor: pointer;
}
button:disabled { opacity: 0.65; }
[role="alert"] { color: #8b2424; }
</style>
