<template>
  <NuxtRouteAnnouncer />
  <NuxtPage />
</template>

<script setup lang="ts">
useHead({ htmlAttrs: { lang: 'en-GB' } })
</script>

<style>
:root {
  font-family: system-ui, sans-serif;
  color: #172f29;
  background: #fbfcf9;
  line-height: 1.6;
}

body { margin: 0; }
a { color: #155845; text-underline-offset: 0.2em; }
:focus-visible { outline: 3px solid #155845; outline-offset: 3px; }

.page {
  max-width: 68rem;
  margin-inline: auto;
  padding: clamp(1rem, 4vw, 3rem);
}

h1 { font-size: clamp(2rem, 5vw, 3.5rem); line-height: 1.12; }
h2 { line-height: 1.25; }
</style>
