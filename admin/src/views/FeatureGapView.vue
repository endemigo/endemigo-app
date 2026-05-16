<template>
  <section class="field-grid">
    <header class="page-header">
      <div>
        <h1>Modul Coverage</h1>
        <p>Once gap olarak izlenen admin modulleri artik canli sayfalara tasindi.</p>
      </div>
      <div class="toolbar">
        <RouterLink class="button" to="/">Panele don</RouterLink>
      </div>
    </header>

    <section class="panel">
      <div class="panel-header">
        <strong>Acik gap</strong>
        <span class="badge">0</span>
      </div>
      <div class="panel-body">
        <p class="muted">
          Icerik, bulten, destek ve finans koleksiyonlari artik ilgili operasyon ekranlarindan yonetiliyor.
        </p>
      </div>
    </section>

    <section class="feature-gap-grid">
      <article v-for="group in coverageGroups" :key="group.title" class="panel">
        <div class="panel-header">
          <strong>{{ group.title }}</strong>
          <span class="badge">{{ group.items.length }} aktif</span>
        </div>
        <div class="panel-body">
          <div class="feature-gap-list">
            <button
              v-for="item in group.items"
              :key="item.label"
              class="feature-gap-item"
              type="button"
              @click="openModule(item.route)"
            >
              <strong>{{ item.label }}</strong>
              <small>{{ item.description }}</small>
            </button>
          </div>
        </div>
      </article>
    </section>
  </section>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';

interface FeatureGroup {
  title: string;
  items: Array<{
    label: string;
    description: string;
    route: string;
  }>;
}

const router = useRouter();

const coverageGroups: FeatureGroup[] = [
  {
    title: 'Content Studio',
    items: [
      { label: 'Contents', description: 'Statik sayfa koleksiyonlari', route: '/content-management' },
      { label: 'News', description: 'Duyuru ve topluluk haberleri', route: '/content-management' },
      { label: 'Blogs', description: 'Public blog feed ve editor akisi', route: '/content-management' },
      { label: 'Faq', description: 'Sik sorulan sorular', route: '/content-management' },
      { label: 'Discover', description: 'Kesif koleksiyonlari', route: '/content-management' },
      { label: 'MenuManagement', description: 'Navigasyon tanimlari', route: '/content-management' },
    ],
  },
  {
    title: 'Pazarlama Icerikleri',
    items: [
      { label: 'Banners', description: 'Banner ve hero alanlari', route: '/content-management' },
      { label: 'Popups', description: 'Popup copy ve campaign overlays', route: '/content-management' },
      { label: 'Polls', description: 'Anket ve mini survey koleksiyonlari', route: '/content-management' },
      { label: 'EBulletin', description: 'Newsletter planlari ve email copy', route: '/newsletters' },
    ],
  },
  {
    title: 'Operasyon Inbox',
    items: [
      { label: 'SupportInbox', description: 'Destek queue kurallari', route: '/content-management' },
      { label: 'ContactInbox', description: 'Iletisim routing kurallari', route: '/content-management' },
      { label: 'AdminMessageCenter', description: 'Outbound message template koleksiyonu', route: '/content-management' },
    ],
  },
  {
    title: 'Finans Konfigurasyonlari',
    items: [
      { label: 'BankAccount', description: 'Tahsilat ve payout banka tanimlari', route: '/content-management' },
      { label: 'Installment', description: 'Taksit ve odeme plani notlari', route: '/content-management' },
      { label: 'VatTerms', description: 'Vergi ve oran bilgileri', route: '/content-management' },
      { label: 'Currency', description: 'Para birimi ve cevrim metadata', route: '/content-management' },
    ],
  },
];

async function openModule(route: string) {
  await router.push(route);
}
</script>
