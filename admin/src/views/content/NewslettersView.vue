<template>
  <section class="field-grid">
    <header class="page-header">
      <div>
        <h1>Bültenler</h1>
        <p>Newsletter içeriklerini, konu satırlarını ve segment bazlı gönderim taslaklarını düzenle.</p>
      </div>
      <div class="toolbar">
        <span class="badge">admin/content-studio</span>
        <span class="badge ghost">newsletters</span>
        <span class="badge ghost">featuredCollection</span>
      </div>
    </header>

    <ContentStudioWorkbench featured-collection="newsletters" />
  </section>
</template>

<script setup lang="ts">
import ContentStudioWorkbench from '../../components/content/ContentStudioWorkbench.vue';

const adminContentStudioEndpoint = '/admin/content-studio';
const featuredCollection = 'newsletters';

void adminContentStudioEndpoint;
void featuredCollection;
</script>
