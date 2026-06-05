<template>
  <section class="field-grid">
    <header class="page-header">
      <div>
        <h1>Ayarlar</h1>
        <p>Gerekçeli yönetici değişiklikleriyle operasyon ayarları</p>
      </div>
      <button class="button" type="button" @click="loadRows">
        <i class="pi pi-refresh" aria-hidden="true" />
        Yenile
      </button>
    </header>

    <AdminDataTable
      :columns="columns"
      :rows="rows"
      :loading="loading"
      :pagination="pagination"
      :actions="actions"
      @action="openAction"
    />

    <p v-if="error" class="error-text">{{ error }}</p>

    <AdminActionDrawer
      :open="drawerOpen"
      title="Ayarı düzenle"
      :fields="fields"
      confirm-label="Kaydet"
      presentation="modal"
      @close="closeDrawer"
      @confirm="confirmAction"
    />
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import AdminActionDrawer, { type DrawerConfirmPayload, type DrawerField } from '../../components/AdminActionDrawer.vue';
import AdminDataTable, { type AdminColumn, type AdminPagination, type AdminTableAction } from '../../components/AdminDataTable.vue';
import { adminApi, toApiMessage } from '../../services/api';

const rows = ref<Record<string, unknown>[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);
const drawerOpen = ref(false);
const selectedRow = ref<Record<string, unknown> | null>(null);
const pagination = ref<AdminPagination>({ page: 1, limit: 100, total: 0 });

const columns: AdminColumn[] = [
  { key: 'description', label: 'Açıklama' },
  { key: 'displayValue', label: 'Değer' },
  { key: 'isSensitive', label: 'Gizli' },
];

const actions: AdminTableAction[] = [
  { key: 'edit', label: 'Düzenle', icon: 'pi pi-pencil', tone: 'primary' },
];

const detailedDescriptions: Record<string, string> = {
  COMMISSION_DEFAULT_RATE: 'Alıcı ve satıcı arasındaki başarılı işlemlerden platformun tahsil edeceği varsayılan komisyon yüzdesidir. Örneğin; %10 ayarlandığında, 100 TL\'lik bir satıştan satıcının bakiyesinden 10 TL komisyon kesilir.',
  ESCROW_AUTO_CONFIRM_HOURS: 'Sipariş teslim edildikten sonra, alıcı manuel olarak onay vermezse sistemin güvenli havuzdaki (escrow) ödemeyi satıcının hesabına otomatik aktarmak için bekleyeceği süredir (saat bazında).',
  CARGO_MOCK_ENABLED: 'Gerçek kargo entegrasyonu (API) yerine test kargo simülatörünü aktif eder. Geliştirme, test ve demo süreçlerinde sipariş adımlarını engelsiz tamamlamak için kullanılır.',
  NOTIFICATION_TEMPLATE_OVERRIDES: 'Sistem tarafından gönderilen otomatik bildirimlerin şablonlarında acil durumlarda yapılacak geçici veya kalıcı operasyonel metin ve biçim değişikliklerini içerir.',
  AD_SPONSORED_DENSITY: 'Arama ve kategori ilan listeleme sayfalarında, normal ilanlar arasına en fazla kaç adet sponsorlu/reklamlı ilanın serpiştirileceğini belirler. Kullanıcı deneyimini korumak için reklam yoğunluğunu sınırlar.',
  TRUST_GRACE_DAYS: 'Güven skoru düşen veya yeni kayıt olan üyelerin, hesap kısıtlamalarından doğrudan etkilenmeden önce bekleyen siparişlerini veya işlemlerini tamamlayabilmeleri için tanınan tolerans süresidir (gün bazında).',
  PRODUCT_IMAGE_UPLOAD_LIMITS: 'Bir satıcının yeni bir ilan oluştururken yüklemesi zorunlu kılınan en az (minimum) görsel sayısını ve yükleyebileceği en fazla (maksimum) fotoğraf sayısını belirler.'
};

const fields = computed<DrawerField[]>(() => {
  const key = selectedRow.value?.key as string;
  const val = selectedRow.value?.value as any;
  if (!key) return [];

  if (key === 'COMMISSION_DEFAULT_RATE') {
    return [
      {
        key: 'rate',
        label: 'Varsayılan Komisyon Oranı (%)',
        type: 'number',
        required: true,
        value: val && typeof val.rate === 'number' ? String(val.rate * 100) : '10',
      },
    ];
  }
  if (key === 'ESCROW_AUTO_CONFIRM_HOURS') {
    return [
      {
        key: 'hours',
        label: 'Escrow Otomatik Onay Süresi (Saat)',
        type: 'number',
        required: true,
        value: val && typeof val.hours === 'number' ? String(val.hours) : '72',
      },
    ];
  }
  if (key === 'CARGO_MOCK_ENABLED') {
    return [
      {
        key: 'enabled',
        label: 'Mock Kargo Sağlayıcı',
        type: 'select',
        required: true,
        value: val && typeof val.enabled === 'boolean' ? String(val.enabled) : 'false',
        options: [
          { label: 'Aktif (Evet)', value: 'true' },
          { label: 'Pasif (Hayır)', value: 'false' },
        ],
      },
    ];
  }
  if (key === 'AD_SPONSORED_DENSITY') {
    return [
      {
        key: 'maxSponsoredPerPage',
        label: 'Sayfa Başına Maksimum Sponsorlu İçerik',
        type: 'number',
        required: true,
        value: val && typeof val.maxSponsoredPerPage === 'number' ? String(val.maxSponsoredPerPage) : '3',
      },
    ];
  }
  if (key === 'TRUST_GRACE_DAYS') {
    return [
      {
        key: 'days',
        label: 'Trust Kısıtlamaları Grace Süresi (Gün)',
        type: 'number',
        required: true,
        value: val && typeof val.days === 'number' ? String(val.days) : '7',
      },
    ];
  }
  if (key === 'PRODUCT_IMAGE_UPLOAD_LIMITS') {
    return [
      {
        key: 'min',
        label: 'Minimum Görsel Yükleme Limiti',
        type: 'number',
        required: true,
        value: val && typeof val.min === 'number' ? String(val.min) : '1',
      },
      {
        key: 'max',
        label: 'Maksimum Görsel Yükleme Limiti',
        type: 'number',
        required: true,
        value: val && typeof val.max === 'number' ? String(val.max) : '10',
      },
    ];
  }

  // Fallback for any other settings
  return [
    {
      key: 'valueJson',
      label: 'Değer JSON',
      type: 'textarea',
      required: true,
      value: JSON.stringify(val ?? {}, null, 2),
    },
  ];
});

function openAction(_action: AdminTableAction, row: Record<string, unknown>) {
  selectedRow.value = row;
  drawerOpen.value = true;
}

function closeDrawer() {
  drawerOpen.value = false;
  selectedRow.value = null;
}

async function confirmAction(payload: DrawerConfirmPayload) {
  const key = String(selectedRow.value?.key ?? '');
  if (!key) return;
  try {
    let parsedValue: any;
    if (key === 'COMMISSION_DEFAULT_RATE') {
      const ratePercent = parseFloat(payload.values.rate as string);
      parsedValue = { rate: ratePercent / 100 };
    } else if (key === 'ESCROW_AUTO_CONFIRM_HOURS') {
      parsedValue = { hours: parseInt(payload.values.hours as string, 10) };
    } else if (key === 'CARGO_MOCK_ENABLED') {
      parsedValue = { enabled: payload.values.enabled === 'true' };
    } else if (key === 'AD_SPONSORED_DENSITY') {
      parsedValue = { maxSponsoredPerPage: parseInt(payload.values.maxSponsoredPerPage as string, 10) };
    } else if (key === 'TRUST_GRACE_DAYS') {
      parsedValue = { days: parseInt(payload.values.days as string, 10) };
    } else if (key === 'PRODUCT_IMAGE_UPLOAD_LIMITS') {
      parsedValue = {
        min: parseInt(payload.values.min as string, 10),
        max: parseInt(payload.values.max as string, 10),
      };
    } else {
      parsedValue = JSON.parse(payload.values.valueJson as string);
    }

    await adminApi.patch(`/admin/settings/${key}`, {
      value: parsedValue,
      reason: payload.reason,
    });
    closeDrawer();
    await loadRows();
  } catch (actionError) {
    error.value = toApiMessage(actionError);
  }
}

async function loadRows() {
  loading.value = true;
  error.value = null;
  try {
    const response = await adminApi.get('/admin/settings');
    const rawItems = response.data.items ?? [];
    rows.value = rawItems.map((item: any) => {
      let displayValue = '';
      const key = item.key;
      const val = item.value;
      if (key === 'COMMISSION_DEFAULT_RATE' && val && typeof val.rate === 'number') {
        displayValue = `%${(val.rate * 100).toFixed(0)} (Oran: ${val.rate})`;
      } else if (key === 'ESCROW_AUTO_CONFIRM_HOURS' && val && typeof val.hours === 'number') {
        displayValue = `${val.hours} Saat`;
      } else if (key === 'CARGO_MOCK_ENABLED' && val && typeof val.enabled === 'boolean') {
        displayValue = val.enabled ? 'Aktif' : 'Pasif';
      } else if (key === 'AD_SPONSORED_DENSITY' && val && typeof val.maxSponsoredPerPage === 'number') {
        displayValue = `Sayfa başına maks ${val.maxSponsoredPerPage}`;
      } else if (key === 'TRUST_GRACE_DAYS' && val && typeof val.days === 'number') {
        displayValue = `${val.days} Gün`;
      } else if (key === 'PRODUCT_IMAGE_UPLOAD_LIMITS' && val && typeof val.min === 'number' && typeof val.max === 'number') {
        displayValue = `Min: ${val.min}, Maks: ${val.max}`;
      } else {
        displayValue = val ? JSON.stringify(val) : '-';
      }

      let description = item.description || '';
      if (detailedDescriptions[key]) {
        description = detailedDescriptions[key];
      }

      return {
        ...item,
        description,
        displayValue,
      };
    });
    pagination.value = { page: 1, limit: rows.value.length || 1, total: rows.value.length };
  } catch (loadError) {
    error.value = toApiMessage(loadError);
    rows.value = [];
  } finally {
    loading.value = false;
  }
}

onMounted(loadRows);
</script>

