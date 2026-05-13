<template>
  <div class="admin-shell">
    <aside class="admin-sidebar" :class="{ 'is-open': isSidebarOpen }">
      <div class="admin-sidebar-head">
        <RouterLink class="admin-brand" to="/">
          <span class="admin-brand-badge">E</span>
          <span class="admin-brand-text">
            <strong>Endemigo Core</strong>
            <span>Light Ops Console</span>
          </span>
        </RouterLink>
        <button class="button icon-only admin-sidebar-close" type="button" @click="isSidebarOpen = false">
          <i class="pi pi-times" aria-hidden="true" />
        </button>
      </div>

      <nav class="admin-nav" aria-label="Yönetici gezintisi">
        <section v-for="group in navGroups" :key="group.key" class="admin-nav-group">
          <button
            v-if="group.collapsible"
            class="admin-nav-title admin-nav-title-button"
            :class="{ 'is-open': isGroupOpen(group) }"
            type="button"
            :aria-expanded="isGroupOpen(group)"
            @click="toggleGroup(group)"
          >
            <span>{{ group.title }}</span>
            <i class="pi pi-chevron-down" aria-hidden="true" />
          </button>
          <div v-else class="admin-nav-title">{{ group.title }}</div>

          <div class="admin-nav-items" :class="{ 'is-collapsed': !isGroupOpen(group) }">
            <button
              v-for="item in group.items"
              :key="item.label"
              class="admin-nav-link"
              :class="{ 'is-disabled': item.available === false, 'is-active': isNavItemActive(item) }"
              type="button"
              @click="openNavItem(item)"
            >
              <i :class="item.icon" aria-hidden="true" />
              <span>{{ item.label }}</span>
              <small v-if="item.available === false" class="admin-nav-tag">Yakinda</small>
            </button>
          </div>
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
        <div class="admin-topbar-left">
          <button class="button icon-only admin-sidebar-toggle" type="button" @click="isSidebarOpen = true">
            <i class="pi pi-bars" aria-hidden="true" />
          </button>
          <form class="admin-search" @submit.prevent="handleQuickSearch">
            <i class="pi pi-search" aria-hidden="true" />
            <input v-model="quickQuery" type="search" placeholder="Hizli git: urunler, odemeler, raporlar..." />
          </form>
        </div>
        <div class="admin-topbar-actions">
          <button class="button ghost" type="button" @click="openCommandPalette">
            <i class="pi pi-bolt" aria-hidden="true" />
            Komut Paleti
          </button>
          <RouterLink class="button ghost" to="/queues">
            <i class="pi pi-list-check" aria-hidden="true" />
            Kuyruklar
          </RouterLink>
          <RouterLink class="button ghost" to="/reports">
            <i class="pi pi-chart-line" aria-hidden="true" />
            Raporlar
          </RouterLink>
          <button class="button" type="button" @click="refreshSession">
            <i class="pi pi-refresh" aria-hidden="true" />
            Oturumu yenile
          </button>
        </div>
      </header>
      <section class="admin-coverage-strip">
        <span class="badge">Hazir {{ availableFeatureCount }} / {{ totalFeatureCount }}</span>
        <span class="badge warning">Eksik {{ missingFeatureCount }}</span>
        <RouterLink class="button ghost" to="/feature-gap">Eksik Moduller</RouterLink>
      </section>

      <section class="admin-content">
        <RouterView />
      </section>
    </main>
  </div>

  <div v-if="isCommandPaletteOpen" class="drawer-backdrop" @click.self="closeCommandPalette">
    <div class="command-palette">
      <div class="command-palette-head">
        <strong>Komut Paleti</strong>
        <button class="button icon-only" type="button" @click="closeCommandPalette">
          <i class="pi pi-times" aria-hidden="true" />
        </button>
      </div>
      <div class="command-palette-body">
        <input
          ref="commandInputRef"
          v-model="commandQuery"
          class="input"
          type="search"
          placeholder="Sayfa ara..."
        />
        <div class="command-list">
          <button
            v-for="item in filteredCommandItems"
            :key="item.label"
            class="command-item"
            type="button"
            @click="openNavItem(item)"
          >
            <span>{{ item.label }}</span>
            <small>{{ item.available === false ? 'Eksik ozellik' : 'Hazir' }}</small>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAdminAuthStore } from '../stores/adminAuth';

interface NavItem {
  label: string;
  to?: string;
  icon: string;
  available?: boolean;
}

interface NavGroup {
  key: string;
  title: string;
  collapsible?: boolean;
  items: NavItem[];
}

const router = useRouter();
const route = useRoute();
const auth = useAdminAuthStore();
const isSidebarOpen = ref(false);
const isCommandPaletteOpen = ref(false);
const quickQuery = ref('');
const commandQuery = ref('');
const commandInputRef = ref<HTMLInputElement | null>(null);
const openGroups = ref<Record<string, boolean>>({
  catalog: true,
});
const isMobileViewport = ref(false);
const MOBILE_BREAKPOINT = 1024;

const navGroups: NavGroup[] = [
  {
    key: 'dashboard',
    title: 'Dashboard',
    items: [
      { label: 'Panel', to: '/', icon: 'pi pi-home' },
      { label: 'Kuyruklar', to: '/queues', icon: 'pi pi-list-check' },
    ],
  },
  {
    key: 'operations',
    title: 'Operations',
    items: [
      { label: 'Üyeler', to: '/users', icon: 'pi pi-users' },
      { label: 'Satıcılar', to: '/sellers', icon: 'pi pi-verified' },
      { label: 'Teklifler', to: '/bids', icon: 'pi pi-sort-amount-up' },
      { label: 'Denetim', to: '/audit', icon: 'pi pi-history' },
    ],
  },
  {
    key: 'catalog',
    title: 'Catalog',
    collapsible: true,
    items: [
      { label: 'Ürünler', to: '/products', icon: 'pi pi-box' },
      { label: 'Kategoriler', to: '/categories', icon: 'pi pi-tags' },
      { label: 'Müzayedeler', to: '/auctions', icon: 'pi pi-clock' },
      { label: 'Markalar', to: '/brands', icon: 'pi pi-bookmark' },
      { label: 'Varyantlar', to: '/variants/numbers', icon: 'pi pi-sliders-h' },
    ],
  },
  {
    key: 'finance',
    title: 'Finance',
    items: [
      { label: 'Siparişler', to: '/orders', icon: 'pi pi-shopping-bag' },
      { label: 'Ödemeler', to: '/payments', icon: 'pi pi-credit-card' },
      { label: 'Ödeme talepleri', to: '/payouts', icon: 'pi pi-wallet' },
      { label: 'Üyelik', to: '/membership', icon: 'pi pi-star' },
    ],
  },
  {
    key: 'growth',
    title: 'Growth',
    items: [
      { label: 'Reklamlar', to: '/ads', icon: 'pi pi-megaphone' },
      { label: 'Kampanyalar', to: '/campaigns', icon: 'pi pi-percentage' },
      { label: 'Raporlar', to: '/reports', icon: 'pi pi-chart-line' },
      { label: 'İçerik Yönetimi', to: '/content-management', icon: 'pi pi-file-edit' },
      { label: 'Bultenler', icon: 'pi pi-envelope', available: false },
    ],
  },
  {
    key: 'risk',
    title: 'Risk',
    items: [{ label: 'Güven', to: '/trust', icon: 'pi pi-shield' }],
  },
  {
    key: 'settings',
    title: 'Settings',
    items: [
      { label: 'Ayarlar', to: '/settings', icon: 'pi pi-cog' },
      { label: 'Mobil Uygulama', to: '/mobile-config', icon: 'pi pi-mobile' },
    ],
  },
];

const allNavItems = computed(() => navGroups.flatMap((group) => group.items));
const availableFeatureCount = computed(() => allNavItems.value.filter((item) => item.available !== false).length);
const missingFeatureCount = computed(() => allNavItems.value.filter((item) => item.available === false).length);
const totalFeatureCount = computed(() => allNavItems.value.length);

const filteredCommandItems = computed(() => {
  const query = commandQuery.value.trim().toLocaleLowerCase('tr-TR');
  if (!query) return allNavItems.value;
  return allNavItems.value.filter((item) => item.label.toLocaleLowerCase('tr-TR').includes(query));
});

async function refreshSession() {
  await auth.refreshMe();
}

async function logout() {
  auth.logout();
  await router.push('/login');
}

async function openNavItem(item: NavItem) {
  isSidebarOpen.value = false;
  if (item.available === false) {
    await router.push({ path: '/feature-gap', query: { module: item.label } });
    closeCommandPalette();
    return;
  }
  if (!item.to) {
    return;
  }
  await router.push(item.to);
  closeCommandPalette();
}

function isGroupActive(group: NavGroup): boolean {
  return group.items.some((item) => isNavItemActive(item));
}

function isGroupOpen(group: NavGroup): boolean {
  if (!group.collapsible) return true;
  if (isGroupActive(group)) return true;
  const preferredOpenState = openGroups.value[group.key];
  if (preferredOpenState !== undefined) return preferredOpenState;
  return !isMobileViewport.value;
}

function toggleGroup(group: NavGroup): void {
  if (!group.collapsible) return;
  openGroups.value[group.key] = !isGroupOpen(group);
}

async function handleQuickSearch() {
  const query = quickQuery.value.trim().toLocaleLowerCase('tr-TR');
  if (!query) return;
  const matchedItem = allNavItems.value.find((item) => item.label.toLocaleLowerCase('tr-TR').includes(query));
  if (!matchedItem) return;
  await openNavItem(matchedItem);
}

function closeCommandPalette() {
  isCommandPaletteOpen.value = false;
  commandQuery.value = '';
}

async function openCommandPalette() {
  isCommandPaletteOpen.value = true;
  await nextTick();
  commandInputRef.value?.focus();
}

function handleGlobalKeydown(event: KeyboardEvent) {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault();
    if (isCommandPaletteOpen.value) {
      closeCommandPalette();
      return;
    }
    void openCommandPalette();
  }
}

function isNavItemActive(item: NavItem): boolean {
  if (!item.to) return false;
  if (item.to === '/') return route.path === '/';
  return route.path.startsWith(item.to);
}

function updateViewportState(): void {
  isMobileViewport.value = window.innerWidth <= MOBILE_BREAKPOINT;
}

onMounted(() => {
  updateViewportState();
  window.addEventListener('keydown', handleGlobalKeydown);
  window.addEventListener('resize', updateViewportState);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleGlobalKeydown);
  window.removeEventListener('resize', updateViewportState);
});
</script>
