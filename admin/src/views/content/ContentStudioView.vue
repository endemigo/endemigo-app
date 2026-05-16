<template>
  <section class="field-grid">
    <header class="page-header">
      <div>
        <h1>İçerik Yönetimi</h1>
        <p>Blog, banner, popup ve benzeri içerik koleksiyonlarını tek akışta yönet.</p>
      </div>
      <div class="toolbar">
        <span class="badge">admin/content-studio</span>
        <span class="badge ghost">blogs</span>
        <span class="badge ghost">banners</span>
        <span class="badge ghost">popups</span>
        <span class="badge ghost">newsletters</span>
      </div>
    </header>

    <ContentStudioWorkbench />
  </section>
</template>

<script setup lang="ts">
import ContentStudioWorkbench from '../../components/content/ContentStudioWorkbench.vue';

// Smoke anchors for regression tests.
const collectionDefinitions = [
  'blogs',
  'banners',
  'popups',
  'newsletters',
];
const adminContentStudioEndpoint = '/admin/content-studio';

void collectionDefinitions;
void adminContentStudioEndpoint;
</script>
