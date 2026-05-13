<template>
  <section class="field-grid">
    <header class="page-header">
      <div>
        <h1>Feature Gap Console</h1>
        <p>Admin panelde eksik kalan moduller ve durumlari.</p>
      </div>
      <div class="toolbar">
        <RouterLink class="button" to="/">Panele don</RouterLink>
      </div>
    </header>

    <section class="panel">
      <div class="panel-header">
        <strong>Secilen modul</strong>
        <span class="muted">{{ selectedModuleLabel }}</span>
      </div>
      <div class="panel-body">
        <p class="muted">
          Bu moduller su an backend contract disinda. Istikrarli gelisim icin once API ve yetki modeli tamamlanmali.
        </p>
      </div>
    </section>

    <section class="feature-gap-grid">
      <article v-for="group in featureGroups" :key="group.title" class="panel">
        <div class="panel-header">
          <strong>{{ group.title }}</strong>
          <span class="badge warning">{{ group.items.length }} eksik</span>
        </div>
        <div class="panel-body">
          <div class="feature-gap-list">
            <button
              v-for="item in group.items"
              :key="item"
              class="feature-gap-item"
              :class="{ active: selectedModuleLabel === item }"
              type="button"
              @click="selectModule(item)"
            >
              <strong>{{ item }}</strong>
              <small>Backend endpoint gerekiyor</small>
            </button>
          </div>
        </div>
      </article>
    </section>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';

interface FeatureGroup {
  title: string;
  items: string[];
}

const route = useRoute();
const router = useRouter();

const featureGroups: FeatureGroup[] = [
  {
    title: 'CMS',
    items: ['Contents', 'News', 'Blogs', 'Faq', 'Discover', 'MenuManagement'],
  },
  {
    title: 'Pazarlama Icerikleri',
    items: ['Banners', 'Popups', 'Polls', 'EBulletin'],
  },
  {
    title: 'Katalog Ek Modulleri',
    items: ['Variants', 'ProductsComments', 'ProductsCombines'],
  },
  {
    title: 'Finans Konfigurasyonlari',
    items: ['BankAccount', 'Installment', 'VatTerms', 'Currency'],
  },
  {
    title: 'Operasyon Talepleri',
    items: ['TransferNotify', 'GiveInfo', 'RequestProduct', 'MReferences', 'SuppliersComments'],
  },
  {
    title: 'Destek ve Mesajlasma',
    items: ['SupportInbox', 'ContactInbox', 'AdminMessageCenter'],
  },
];

const selectedModuleLabel = computed(() => {
  const module = route.query.module;
  if (typeof module === 'string' && module.trim()) {
    return module;
  }
  return 'Secim yok';
});

async function selectModule(module: string) {
  await router.replace({ path: '/feature-gap', query: { module } });
}
</script>
