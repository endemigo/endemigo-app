<template>
  <span class="badge" :class="toneClass">
    {{ label }}
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  value: unknown;
}>();

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Taslak',
  PENDING_REVIEW: 'İncelemede',
  ACTIVE: 'Aktif',
  UNDER_AUCTION: 'Müzayedede',
  SOLD: 'Satıldı',
  OUT_OF_STOCK: 'Stok Yok',
  ARCHIVED: 'Arşivlendi',
  SUSPENDED: 'Askıda',
  APPROVED: 'Onaylandı',
  REJECTED: 'Reddedildi',
  TERMINATED: 'Sonlandırıldı',
  ADMIN_REVIEW: 'Admin İncelemesi',
  FAILED: 'Başarısız',
  CANCELLED: 'İptal Edildi',
  COMPLETED: 'Tamamlandı',
  CREATED: 'Oluşturuldu',
  PASSED: 'Geçti',
  PAID: 'Ödendi',
  PENDING: 'Beklemede',
  PUBLISHED: 'Yayında',
  CUSTOMER: 'Müşteri',
  SELLER: 'Satıcı',
  SUPPLIER: 'Tedarikçi',
  ADMIN: 'Yönetici',
  TRUE: 'Aktif',
  FALSE: 'Pasif',
};

const rawLabel = computed(() => String(props.value ?? '-'));
const normalizedRaw = computed(() => rawLabel.value.toLowerCase());
const label = computed(() => {
  const key = rawLabel.value.trim().toUpperCase();
  return STATUS_LABELS[key] ?? rawLabel.value;
});

const toneClass = computed(() => {
  const status = normalizedRaw.value;
  if (
    status.includes('reject') ||
    status.includes('fail') ||
    status.includes('cancel') ||
    status.includes('suspend') ||
    status.includes('terminated') ||
    status.includes('archived') ||
    status.includes('inactive') ||
    status === 'false'
  ) {
    return 'danger';
  }
  if (
    status.includes('pending') ||
    status.includes('review') ||
    status.includes('waiting') ||
    status.includes('request')
  ) {
    return 'warning';
  }
  if (
    status.includes('active') ||
    status.includes('approved') ||
    status.includes('published') ||
    status.includes('completed') ||
    status === 'true'
  ) {
    return '';
  }
  return 'neutral';
});
</script>
