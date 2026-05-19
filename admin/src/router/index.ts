import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router';
import { useAdminAuthStore } from '../stores/adminAuth';
import AdminLayout from '../layouts/AdminLayout.vue';
import LoginView from '../views/LoginView.vue';
import DashboardView from '../views/DashboardView.vue';
import PriorityQueuesView from '../views/queues/PriorityQueuesView.vue';
import AdminListView from '../views/operations/AdminListView.vue';
import AdminDetailView from '../views/operations/AdminDetailView.vue';
import AdsView from '../views/monetization/AdsView.vue';
import CampaignsView from '../views/monetization/CampaignsView.vue';
import MembershipView from '../views/monetization/MembershipView.vue';
import TrustView from '../views/trust/TrustView.vue';
import SettingsView from '../views/settings/SettingsView.vue';
import ReportsView from '../views/reports/ReportsView.vue';
import MobileConfigView from '../views/mobile/MobileConfigView.vue';
import FeatureGapView from '../views/FeatureGapView.vue';
import ProductFormView from '../views/products/ProductFormView.vue';
import VariantNumbersView from '../views/variants/VariantNumbersView.vue';
import ContentStudioView from '../views/content/ContentStudioView.vue';
import NewslettersView from '../views/content/NewslettersView.vue';

const operationRoutes: RouteRecordRaw[] = [
  {
    path: 'users',
    name: 'users',
    component: AdminListView,
    props: { resource: 'users', title: 'Üyeler' },
  },
  {
    path: 'users/:id',
    name: 'users-detail',
    component: AdminDetailView,
    props: (route) => ({ resource: 'users', id: String(route.params.id), title: 'Üye Detayı' }),
  },
  {
    path: 'sellers',
    name: 'sellers',
    component: AdminListView,
    props: { resource: 'sellers', title: 'Satıcılar' },
  },
  {
    path: 'sellers/:id',
    name: 'sellers-detail',
    component: AdminDetailView,
    props: (route) => ({ resource: 'sellers', id: String(route.params.id), title: 'Satıcı Detayı' }),
  },
  {
    path: 'products',
    name: 'products',
    component: AdminListView,
    props: { resource: 'products', title: 'Ürünler' },
  },
  {
    path: 'products/new',
    name: 'products-create',
    component: ProductFormView,
    props: { mode: 'create' },
  },
  {
    path: 'products/:id/edit',
    name: 'products-edit',
    component: ProductFormView,
    props: (route) => ({ mode: 'edit', id: String(route.params.id) }),
  },
  {
    path: 'products/:id',
    name: 'products-detail',
    component: AdminDetailView,
    props: (route) => ({
      resource: 'products',
      id: String(route.params.id),
      title: 'Ürün Detayı',
    }),
  },
  {
    path: 'variants/numbers',
    name: 'variant-numbers',
    component: VariantNumbersView,
  },
  {
    path: 'categories',
    name: 'categories',
    component: AdminListView,
    props: { resource: 'categories', title: 'Kategoriler' },
  },
  {
    path: 'brands',
    name: 'brands',
    component: AdminListView,
    props: { resource: 'brands', title: 'Markalar' },
  },
  {
    path: 'brands/:id',
    name: 'brands-detail',
    component: AdminDetailView,
    props: (route) => ({
      resource: 'brands',
      id: String(route.params.id),
      title: 'Marka Detayı',
    }),
  },
  {
    path: 'categories/:id',
    name: 'categories-detail',
    component: AdminDetailView,
    props: (route) => ({
      resource: 'categories',
      id: String(route.params.id),
      title: 'Kategori Detayı',
    }),
  },
  {
    path: 'auctions',
    name: 'auctions',
    component: AdminListView,
    props: { resource: 'auctions', title: 'Müzayedeler' },
  },
  {
    path: 'auctions/:id',
    name: 'auctions-detail',
    component: AdminDetailView,
    props: (route) => ({
      resource: 'auctions',
      id: String(route.params.id),
      title: 'Müzayede Detayı',
    }),
  },
  {
    path: 'orders',
    name: 'orders',
    component: AdminListView,
    props: { resource: 'orders', title: 'Siparişler' },
  },
  {
    path: 'orders/:id',
    name: 'orders-detail',
    component: AdminDetailView,
    props: (route) => ({ resource: 'orders', id: String(route.params.id), title: 'Sipariş Detayı' }),
  },
  {
    path: 'payments',
    name: 'payments',
    component: AdminListView,
    props: { resource: 'payments', title: 'Ödemeler' },
  },
  {
    path: 'payments/:id',
    name: 'payments-detail',
    component: AdminDetailView,
    props: (route) => ({
      resource: 'payments',
      id: String(route.params.id),
      title: 'Ödeme Detayı',
    }),
  },
  {
    path: 'bids',
    name: 'bids',
    component: AdminListView,
    props: { resource: 'bids', title: 'Teklifler', readOnly: true },
  },
  {
    path: 'bids/:id',
    name: 'bids-detail',
    component: AdminDetailView,
    props: (route) => ({ resource: 'bids', id: String(route.params.id), title: 'Teklif Detayı', readOnly: true }),
  },
  {
    path: 'payouts',
    name: 'payouts',
    component: AdminListView,
    props: { resource: 'payout-requests', title: 'Ödeme Talepleri' },
  },
  {
    path: 'payouts/:id',
    name: 'payouts-detail',
    component: AdminDetailView,
    props: (route) => ({
      resource: 'payout-requests',
      id: String(route.params.id),
      title: 'Ödeme Talebi Detayı',
    }),
  },
  {
    path: 'audit',
    name: 'audit',
    component: AdminListView,
    props: { resource: 'audit-logs', title: 'Denetim', endpoint: '/admin/audit-logs', readOnly: true },
  },
  {
    path: 'audit/:id',
    name: 'audit-detail',
    component: AdminDetailView,
    props: (route) => ({ resource: 'audit-logs', id: String(route.params.id), title: 'Denetim Detayı', readOnly: true }),
  },
];

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'login',
    component: LoginView,
    meta: { public: true },
  },
  {
    path: '/',
    component: AdminLayout,
    meta: { requiresAuth: true },
    children: [
      { path: '', name: 'dashboard', component: DashboardView },
      { path: 'queues', name: 'queues', component: PriorityQueuesView },
      ...operationRoutes,
      {
        path: 'ads',
        name: 'ads',
        component: AdsView,
      },
      {
        path: 'campaigns',
        name: 'campaigns',
        component: CampaignsView,
      },
      {
        path: 'membership',
        name: 'membership',
        component: MembershipView,
      },
      {
        path: 'trust',
        name: 'trust',
        component: TrustView,
      },
      {
        path: 'settings',
        name: 'settings',
        component: SettingsView,
      },
      {
        path: 'mobile-config',
        name: 'mobile-config',
        component: MobileConfigView,
      },
      {
        path: 'content-management',
        name: 'content-management',
        component: ContentStudioView,
      },
      {
        path: 'newsletters',
        name: 'newsletters',
        component: NewslettersView,
      },
      {
        path: 'reports',
        name: 'reports',
        component: ReportsView,
      },
      {
        path: 'feature-gap',
        name: 'feature-gap',
        component: FeatureGapView,
      },
    ],
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach((to) => {
  const auth = useAdminAuthStore();
  auth.loadSession();

  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    return { name: 'login', query: { redirect: to.fullPath } };
  }

  if (to.name === 'login' && auth.isAuthenticated) {
    return { name: 'dashboard' };
  }

  return true;
});

export default router;
