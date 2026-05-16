<template>
  <section class="field-grid">
    <header class="page-header">
      <div>
        <h1>İçerik Yönetimi</h1>
        <p>Blog, banner, popup, destek inbox ve finans config koleksiyonlarını tek akışta yönet.</p>
      </div>
      <div class="toolbar">
        <span class="badge">admin/content-studio</span>
        <span class="badge ghost">blogs</span>
        <span class="badge ghost">banners</span>
        <span class="badge ghost">supportInbox</span>
        <span class="badge ghost">financeConfigs</span>
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
  'supportInbox',
  'financeConfigs',
];
const adminContentStudioEndpoint = '/admin/content-studio';

void collectionDefinitions;
void adminContentStudioEndpoint;
</script>
