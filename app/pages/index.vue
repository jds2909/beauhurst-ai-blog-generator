<script setup lang="ts">
useSeoMeta({
  title: 'Company Dataset Blog Generator',
  description: 'Explore company rankings and funding insights from industry datasets.',
})
</script>

<template>
  <main class="page">
    <h1>Company Dataset Blog Generator</h1>
    <p>Explore company rankings, fundraising figures and regional insights from industry datasets.</p>

    <section aria-labelledby="articles-heading">
      <h2 id="articles-heading">Articles</h2>
      <NuxtLink to="/blog/top-100-uk-fintech-companies">
        Top 100 UK fintech companies by total fundraising
      </NuxtLink>
    </section>
  </main>
</template>
