<template>
  <div class="admin-shell">
    <aside class="admin-sidebar">
      <RouterLink class="admin-brand" to="/">
        <strong>Endemigo</strong>
        <span>Operasyon paneli</span>
      </RouterLink>

      <nav class="admin-nav" aria-label="Yönetici gezintisi">
        <section v-for="group in navGroups" :key="group.title" class="admin-nav-group">
          <div class="admin-nav-title">{{ group.title }}</div>
          <RouterLink
            v-for="item in group.items"
            :key="item.to"
            class="admin-nav-link"
            :to="item.to"
          >
            <i :class="item.icon" aria-hidden="true" />
            <span>{{ item.label }}</span>
          </RouterLink>
        </section>
      </nav>

      <div class="admin-user">
        <strong>{{ auth.admin?.displayName ?? 'Yönetici' }}</strong>
        <span>{{ auth.roleLabel }}</span>
        <button class="button ghost" type="button" @click="logout">
          <i class="pi pi-sign-out" aria-hidden="true" />
          Çıkış yap
        </button>
      </div>
    </aside>

    <main class="admin-main">
      <header class="admin-topbar">
        <div>
          <strong>Öncelikli İşler</strong>
          <span class="muted">Önce kuyruklar, sonra işlemler</span>
        </div>
        <button class="button" type="button" @click="refreshSession">
          <i class="pi pi-refresh" aria-hidden="true" />
          Oturumu yenile
        </button>
      </header>

      <section class="admin-content">
        <RouterView />
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';
import { useAdminAuthStore } from '../stores/adminAuth';

interface NavItem {
  label: string;
  to: string;
  icon: string;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const router = useRouter();
const auth = useAdminAuthStore();

const navGroups: NavGroup[] = [
  {
    title: 'Öncelikli İşler',
    items: [
      { label: 'Panel', to: '/', icon: 'pi pi-home' },
      { label: 'Kuyruklar', to: '/queues', icon: 'pi pi-list-check' },
    ],
  },
  {
    title: 'Kullanıcılar/Satıcılar',
    items: [
      { label: 'Kullanıcılar', to: '/users', icon: 'pi pi-users' },
      { label: 'Satıcılar', to: '/sellers', icon: 'pi pi-verified' },
    ],
  },
  {
    title: 'Ticaret',
    items: [
      { label: 'Ürünler', to: '/products', icon: 'pi pi-box' },
      { label: 'Kategoriler', to: '/categories', icon: 'pi pi-tags' },
      { label: 'Müzayedeler', to: '/auctions', icon: 'pi pi-clock' },
      { label: 'Teklifler', to: '/bids', icon: 'pi pi-sort-amount-up' },
      { label: 'Siparişler', to: '/orders', icon: 'pi pi-shopping-bag' },
      { label: 'Ödemeler', to: '/payments', icon: 'pi pi-credit-card' },
      { label: 'Ödeme talepleri', to: '/payouts', icon: 'pi pi-wallet' },
    ],
  },
  {
    title: 'Gelir modeli',
    items: [
      { label: 'Reklamlar', to: '/ads', icon: 'pi pi-megaphone' },
      { label: 'Kampanyalar', to: '/campaigns', icon: 'pi pi-percentage' },
      { label: 'Üyelik', to: '/membership', icon: 'pi pi-star' },
    ],
  },
  {
    title: 'Güven',
    items: [{ label: 'Güven', to: '/trust', icon: 'pi pi-shield' }],
  },
  {
    title: 'Ayarlar',
    items: [
      { label: 'Ayarlar', to: '/settings', icon: 'pi pi-cog' },
      { label: 'Mobil Uygulama', to: '/mobile-config', icon: 'pi pi-mobile' },
    ],
  },
  {
    title: 'Denetim',
    items: [{ label: 'Denetim', to: '/audit', icon: 'pi pi-history' }],
  },
  {
    title: 'Raporlar',
    items: [{ label: 'Raporlar', to: '/reports', icon: 'pi pi-file-export' }],
  },
];

async function refreshSession() {
  await auth.refreshMe();
}

async function logout() {
  auth.logout();
  await router.push('/login');
}
</script>
