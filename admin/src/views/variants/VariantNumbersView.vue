<template>
  <section class="field-grid">
    <header class="page-header">
      <div>
        <h1>Varyant Yönetimi</h1>
        <p>Renk, beden, numara ve diğer varyant tiplerini yönetin</p>
      </div>
    </header>

    <section class="panel">
      <nav class="tabs" aria-label="Varyant tipleri">
        <button
          v-for="tab in variantTabs"
          :key="tab.kind"
          class="tab-button"
          :class="{ 'is-active': activeKind === tab.kind }"
          type="button"
          @click="selectKind(tab.kind)"
        >
          {{ tab.label }}
        </button>
      </nav>
    </section>

    <section class="variant-layout">
      <article class="panel">
        <div class="panel-header">
          <strong>{{ isEditing ? `${activeLabel} Düzenle` : `${activeLabel} Ekle` }}</strong>
        </div>
        <div class="panel-body field-grid">
          <label class="field">
            <span>Başlık TR *</span>
            <input v-model.trim="form.nameTr" class="input" />
          </label>
          <label class="field">
            <span>Başlık EN *</span>
            <input v-model.trim="form.nameEn" class="input" />
          </label>
          <label class="field">
            <span>Sıra *</span>
            <input v-model.number="form.sortOrder" class="input" type="number" min="1" step="1" />
          </label>
          <label class="field">
            <span>Durum</span>
            <select v-model="form.status" class="select">
              <option value="ACTIVE">Aktif</option>
              <option value="PASSIVE">Pasif</option>
            </select>
          </label>
          <label v-if="activeKind === 'COLOR'" class="field">
            <span>Renk Kodu (HEX)</span>
            <div class="color-input-wrap">
              <input v-model="colorPickerValue" class="color-picker" type="color" aria-label="Renk seç" />
              <input v-model.trim="form.swatchHex" class="input" placeholder="#FFAA00" />
            </div>
          </label>
          <p v-if="error" class="error-text">{{ error }}</p>
        </div>
        <div class="panel-footer">
          <button class="button danger" type="button" @click="resetForm">Vazgeç</button>
          <button class="button primary" type="button" @click="saveItem">
            {{ isEditing ? 'Güncelle' : 'Kaydet' }}
          </button>
        </div>
      </article>

      <article class="panel">
        <div class="panel-header">
          <strong>{{ activeLabel }} Listesi</strong>
          <span class="badge neutral">{{ pagination.total }} kayıt</span>
        </div>
        <div class="panel-body variant-filter-grid">
          <label class="field">
            <span>Ara</span>
            <input v-model.trim="filters.search" class="input" @keyup.enter="reloadFromFirstPage" />
          </label>
          <label class="field">
            <span>Durum</span>
            <select v-model="filters.status" class="select" @change="reloadFromFirstPage">
              <option value="">Tümü</option>
              <option value="ACTIVE">Aktif</option>
              <option value="PASSIVE">Pasif</option>
            </select>
          </label>
          <div class="toolbar">
            <button class="button" type="button" @click="reloadFromFirstPage">Filtrele</button>
          </div>
        </div>
        <div class="table-wrap">
          <table class="admin-table">
            <thead>
              <tr>
                <th>Ad TR</th>
                <th>Ad EN</th>
                <th v-if="activeKind === 'COLOR'">Renk</th>
                <th>Durum</th>
                <th>İşlem</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="loading">
                <td :colspan="activeKind === 'COLOR' ? 5 : 4">Yükleniyor...</td>
              </tr>
              <tr v-else-if="items.length === 0">
                <td :colspan="activeKind === 'COLOR' ? 5 : 4">Kayıt bulunamadı.</td>
              </tr>
              <tr v-for="item in items" :key="item.id">
                <td>{{ item.nameTr }}</td>
                <td>{{ item.nameEn }}</td>
                <td v-if="activeKind === 'COLOR'">
                  <div class="color-cell">
                    <span class="color-preview small" :style="{ background: normalizeHex(item.swatchHex) || '#ffffff' }" />
                    <span>{{ item.swatchHex || '-' }}</span>
                  </div>
                </td>
                <td>
                  <span class="badge" :class="item.status === 'ACTIVE' ? 'neutral' : 'warning'">
                    {{ item.status === 'ACTIVE' ? 'Aktif' : 'Pasif' }}
                  </span>
                </td>
                <td>
                  <div class="toolbar">
                    <button class="button icon-only ghost primary" type="button" title="Düzenle" @click="editItem(item)">
                      <i class="pi pi-pen-to-square" aria-hidden="true" />
                    </button>
                    <button class="button icon-only danger" type="button" title="Sil" @click="removeItem(item.id)">
                      <i class="pi pi-times" aria-hidden="true" />
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="panel-footer">
          <span class="muted">Sayfa {{ pagination.page }} / {{ totalPages }}</span>
          <div class="toolbar">
            <button class="button" type="button" :disabled="pagination.page <= 1 || loading" @click="goPrevPage">Önceki</button>
            <button class="button" type="button" :disabled="pagination.page >= totalPages || loading" @click="goNextPage">Sonraki</button>
          </div>
        </div>
      </article>
    </section>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { adminApi, toApiMessage, type ApiListPagination } from '../../services/api';

type VariantStatus = 'ACTIVE' | 'PASSIVE';
type VariantKind = 'COLOR' | 'SIZE' | 'NUMBER' | 'OPTION' | 'VARIATION';

interface VariantItem {
  id: string;
  kind: VariantKind;
  nameTr: string;
  nameEn: string;
  sortOrder: number;
  status: VariantStatus;
  swatchHex: string | null;
}

interface VariantForm {
  nameTr: string;
  nameEn: string;
  sortOrder: number;
  status: VariantStatus;
  swatchHex: string;
}

interface VariantListResponse {
  code: string;
  message: string;
  items: VariantItem[];
  pagination: ApiListPagination;
}

const variantTabs: Array<{ kind: VariantKind; label: string }> = [
  { kind: 'COLOR', label: 'Renk Yönetimi' },
  { kind: 'SIZE', label: 'Beden Yönetimi' },
  { kind: 'NUMBER', label: 'Numara Yönetimi' },
  { kind: 'OPTION', label: 'Seçenek Yönetimi' },
  { kind: 'VARIATION', label: 'Varyasyonlar' },
];

const activeKind = ref<VariantKind>('NUMBER');
const items = ref<VariantItem[]>([]);
const loading = ref(false);
const editingId = ref<string | null>(null);
const error = ref<string | null>(null);
const pagination = ref<ApiListPagination>({
  page: 1,
  limit: 10,
  total: 0,
});

const filters = reactive({
  search: '',
  status: '',
});

const form = reactive<VariantForm>({
  nameTr: '',
  nameEn: '',
  sortOrder: 99,
  status: 'ACTIVE',
  swatchHex: '',
});

const totalPages = computed(() =>
  Math.max(1, Math.ceil(pagination.value.total / pagination.value.limit)),
);
const isEditing = computed(() => editingId.value !== null);
const activeLabel = computed(
  () => variantTabs.find((tab) => tab.kind === activeKind.value)?.label ?? 'Varyant',
);
const colorPickerValue = computed({
  get: () => normalizeHex(form.swatchHex) || '#000000',
  set: (value: string) => {
    form.swatchHex = value.toUpperCase();
  },
});

function normalizeHex(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim().toUpperCase();
  if (!/^#([0-9A-F]{6})$/.test(trimmed)) return null;
  return trimmed;
}

function queryParams() {
  return {
    page: pagination.value.page,
    limit: pagination.value.limit,
    kind: activeKind.value,
    search: filters.search || undefined,
    status: filters.status || undefined,
  };
}

async function loadList(): Promise<void> {
  loading.value = true;
  error.value = null;
  try {
    const response = await adminApi.get<VariantListResponse>('/admin/variants/numbers', {
      params: queryParams(),
    });
    items.value = response.data.items ?? [];
    pagination.value = response.data.pagination ?? pagination.value;
  } catch (loadError) {
    error.value = toApiMessage(loadError);
    items.value = [];
  } finally {
    loading.value = false;
  }
}

function selectKind(kind: VariantKind): void {
  activeKind.value = kind;
  resetForm();
  reloadFromFirstPage();
}

function reloadFromFirstPage(): void {
  pagination.value = { ...pagination.value, page: 1 };
  void loadList();
}

function goPrevPage(): void {
  if (pagination.value.page <= 1) return;
  pagination.value = { ...pagination.value, page: pagination.value.page - 1 };
  void loadList();
}

function goNextPage(): void {
  if (pagination.value.page >= totalPages.value) return;
  pagination.value = { ...pagination.value, page: pagination.value.page + 1 };
  void loadList();
}

function resetForm(): void {
  form.nameTr = '';
  form.nameEn = '';
  form.sortOrder = 99;
  form.status = 'ACTIVE';
  form.swatchHex = '';
  editingId.value = null;
  error.value = null;
}

async function saveItem(): Promise<void> {
  error.value = null;
  const resolvedNameEn =
    activeKind.value === 'COLOR' && !form.nameEn.trim() ? form.nameTr.trim() : form.nameEn.trim();

  if (!form.nameTr.trim() || !Number.isFinite(form.sortOrder) || form.sortOrder < 1) {
    error.value = 'Başlık TR ve geçerli sıra zorunludur.';
    return;
  }

  if (activeKind.value !== 'COLOR' && !resolvedNameEn) {
    error.value = 'Başlık EN zorunludur.';
    return;
  }
  const swatchHex = normalizeHex(form.swatchHex);
  if (activeKind.value === 'COLOR' && form.swatchHex && !swatchHex) {
    error.value = 'Renk kodu #RRGGBB formatında olmalı.';
    return;
  }

  form.nameEn = resolvedNameEn;

  const payload = {
    kind: activeKind.value,
    nameTr: form.nameTr.trim(),
    nameEn: resolvedNameEn,
    sortOrder: Math.floor(form.sortOrder),
    status: form.status,
    swatchHex: swatchHex || undefined,
  };

  try {
    if (editingId.value) {
      await adminApi.patch(`/admin/variants/numbers/${editingId.value}`, payload);
    } else {
      await adminApi.post('/admin/variants/numbers', payload);
    }
    resetForm();
    void loadList();
  } catch (saveError) {
    error.value = toApiMessage(saveError);
  }
}

function editItem(item: VariantItem): void {
  editingId.value = item.id;
  form.nameTr = item.nameTr;
  form.nameEn = item.nameEn;
  form.sortOrder = item.sortOrder;
  form.status = item.status;
  form.swatchHex = item.swatchHex ?? '';
  error.value = null;
}

async function removeItem(id: string): Promise<void> {
  try {
    await adminApi.delete(`/admin/variants/numbers/${id}`);
    if (items.value.length === 1 && pagination.value.page > 1) {
      pagination.value = { ...pagination.value, page: pagination.value.page - 1 };
    }
    void loadList();
  } catch (deleteError) {
    error.value = toApiMessage(deleteError);
  }
  if (editingId.value === id) {
    resetForm();
  }
}

onMounted(() => {
  void loadList();
});
</script>

<style scoped>
.variant-layout {
  display: grid;
  gap: 12px;
  grid-template-columns: minmax(320px, 1fr) minmax(420px, 1.2fr);
}

@media (max-width: 1200px) {
  .variant-layout {
    grid-template-columns: 1fr;
  }
}

.variant-filter-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
  gap: 8px;
  align-items: end;
}

.color-input-wrap {
  display: grid;
  grid-template-columns: 56px minmax(0, 1fr);
  gap: 8px;
  align-items: center;
}

.color-picker {
  width: 56px;
  height: 38px;
  border: 1px solid #d1d9e6;
  border-radius: 8px;
  padding: 4px;
  background: #fff;
  cursor: pointer;
}

.color-preview {
  width: 38px;
  height: 38px;
  border: 1px solid #d1d9e6;
  border-radius: 8px;
}

.color-preview.small {
  width: 18px;
  height: 18px;
  border-radius: 4px;
}

.color-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}
</style>
