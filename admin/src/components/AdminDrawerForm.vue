<template>
  <Teleport to="body">
    <Transition name="drawer-fade">
      <div
        v-if="open"
        class="drawer-backdrop"
        :class="{ 'backdrop-modal': presentation === 'modal' }"
        role="presentation"
        @click.self="emit('close')"
      >
        <aside
          class="drawer"
          :class="{ 'drawer-modal': presentation === 'modal' }"
          role="dialog"
          aria-modal="true"
          :aria-label="title"
        >
          <header class="drawer-header">
            <strong class="drawer-title">{{ title }}</strong>
            <button class="button ghost drawer-close-btn" type="button" title="Kapat" @click="emit('close')">
              <i class="pi pi-times" aria-hidden="true" />
            </button>
          </header>

        <form class="drawer-body" @submit.prevent="submit">
          <template v-for="field in visibleFields" :key="field.key">
            <label
              v-if="!hasLogoGroup || (field.key !== 'issuer' && field.key !== 'registrationUrl')"
              class="field"
              :class="{ 'field--full': field.fullWidth || field.type === 'textarea' || field.type === 'multiselect' || field.type === 'template_editor' || field.type === 'image' || (field.key === 'logoUrl' && hasLogoGroup) }"
            >
              <span>{{ field.key === 'logoUrl' && hasLogoGroup ? 'Logo Görseli & Detaylar' : field.label }}</span>

              <!-- Special Grouped Logo Layout -->
              <div v-if="field.key === 'logoUrl' && hasLogoGroup" class="logo-group-layout">
                <!-- Image Upload (Left, Square) -->
                <div class="logo-group-left">
                  <div class="image-upload-wrap square-image-upload">
                    <div v-if="fieldValues[field.key]" class="image-preview-container square-preview-container">
                      <img :src="fieldValues[field.key]" alt="Logo" class="image-preview square-preview" />
                      <button type="button" class="button danger ghost button--sm image-remove-btn square-remove-btn" @click="fieldValues[field.key] = ''">
                        <i class="pi pi-trash" aria-hidden="true" />
                        Kaldır
                      </button>
                    </div>
                    <div v-else class="image-upload-dropzone square-dropzone" @click="triggerFileInput(field.key)">
                      <i class="pi pi-upload" aria-hidden="true" />
                      <span style="font-size: 11px; font-weight: 700; margin-top: 4px;">Logo Seç</span>
                      <small v-if="uploadState[field.key]?.error" class="image-upload-error">{{ uploadState[field.key]?.error }}</small>
                    </div>
                    <input
                      :ref="el => { if (el) fileInputRefs[field.key] = el }"
                      type="file"
                      accept="image/*"
                      class="hidden-file-input"
                      @change="handleImageUpload(field.key, $event)"
                    />
                  </div>
                </div>

                <!-- Inputs (Right, Stacked) -->
                <div class="logo-group-right">
                  <div v-if="getFieldByKey('issuer')" class="sub-field">
                    <span>{{ getFieldByKey('issuer').label }}</span>
                    <input
                      v-model="fieldValues['issuer']"
                      class="input"
                      type="text"
                      :required="getFieldByKey('issuer').required"
                    />
                  </div>
                  <div v-if="getFieldByKey('registrationUrl')" class="sub-field">
                    <span>{{ getFieldByKey('registrationUrl').label }}</span>
                    <input
                      v-model="fieldValues['registrationUrl']"
                      class="input"
                      type="text"
                      :required="getFieldByKey('registrationUrl').required"
                    />
                  </div>
                </div>
              </div>

              <!-- Standard rendering -->
              <template v-else>
                <textarea
                  v-if="field.type === 'textarea'"
                  v-model="fieldValues[field.key]"
                  class="textarea"
                  :required="field.required"
                />
                <select
                  v-else-if="field.type === 'select'"
                  v-model="fieldValues[field.key]"
                  class="select"
                  :required="field.required"
                >
                  <option value="">Seçin</option>
                  <option v-for="option in field.options ?? []" :key="option.value" :value="option.value">
                    {{ option.label }}
                  </option>
                </select>
                <div v-else-if="field.type === 'multiselect'" class="multiselect-container">
                  <!-- Search Input -->
                  <div class="multiselect-search-wrap">
                    <i class="pi pi-search" aria-hidden="true" />
                    <input
                      type="text"
                      v-model="multiselectSearch[field.key]"
                      placeholder="Grup ara..."
                      class="input multiselect-search"
                      @click.prevent
                    />
                  </div>

                  <!-- Selected count & clear all -->
                  <div class="multiselect-header">
                    <span class="muted">{{ getSelectedCount(field.key) }} varyasyon seçildi</span>
                    <button
                      v-if="getSelectedCount(field.key) > 0"
                      type="button"
                      class="multiselect-clear-btn"
                      @click="clearSelected(field.key)"
                    >
                      Tümünü kaldır
                    </button>
                  </div>

                  <!-- Options list (Grouped) -->
                  <div class="multiselect-list">
                    <label
                      v-for="group in filteredGroups(field)"
                      :key="group.kind"
                      class="multiselect-item"
                      :class="{ 'is-selected': isGroupChecked(field.key, group.optionIds) }"
                    >
                      <input
                        type="checkbox"
                        :value="group.kind"
                        :checked="isGroupChecked(field.key, group.optionIds)"
                        @change="toggleGroup(field.key, group.optionIds)"
                        class="multiselect-checkbox"
                      />
                      <div class="multiselect-item-content">
                        <div class="multiselect-item-text">
                          <span class="multiselect-item-label">{{ group.label }}</span>
                          <span class="multiselect-item-details">
                            {{ group.optionLabels.join(', ') }}
                          </span>
                        </div>
                        <span class="multiselect-item-badge">
                          {{ group.kind }} ({{ group.optionIds.length }} Seçenek)
                        </span>
                      </div>
                    </label>
                    <div v-if="filteredGroups(field).length === 0" class="multiselect-empty">
                      Varyasyon grubu bulunamadı.
                    </div>
                  </div>
                </div>
                <div v-else-if="field.type === 'template_editor'" class="template-editor-container">
                  <!-- Live Search Filter Bar -->
                  <div class="template-search-bar">
                    <i class="pi pi-search search-icon" aria-hidden="true" />
                    <input 
                      type="text" 
                      v-model="templateSearchQuery" 
                      placeholder="İlan alanı ara (örnek: fiyat, kargo, desi)..." 
                      class="input template-search-input"
                    />
                    <span class="template-search-badge" v-if="templateSearchQuery">
                      {{ filteredPredefinedFields.length }} alan
                    </span>
                  </div>

                  <!-- Predefined Fields Checklist Grid -->
                  <div class="template-predefined-grid">
                    <div 
                      v-for="pf in filteredPredefinedFields" 
                      :key="pf.key" 
                      class="predefined-field-card"
                      :class="{ 'is-active': isFieldVisibleInTemplate(field.key, pf.key) }"
                    >
                      <div class="predefined-field-meta">
                        <strong class="predefined-field-label">{{ pf.label }}</strong>
                        <span class="predefined-field-key">{{ pf.key }}</span>
                        <span class="predefined-field-type-badge">{{ translateFieldType(pf.type) }}</span>
                      </div>
                      <div class="predefined-field-actions">
                        <label class="toggle-switch-label">
                          <input 
                            type="checkbox" 
                            :checked="isFieldVisibleInTemplate(field.key, pf.key)"
                            @change="toggleFieldVisibility(field.key, pf.key, pf)"
                          />
                          <span class="action-text">Göster</span>
                        </label>
                        
                        <label 
                          v-if="isFieldVisibleInTemplate(field.key, pf.key)" 
                          class="toggle-switch-label requirement-toggle"
                        >
                          <input 
                            type="checkbox" 
                            :checked="isFieldRequiredInTemplate(field.key, pf.key)"
                            @change="toggleFieldRequirement(field.key, pf.key)"
                          />
                          <span class="action-text zorunlu-text" :class="{ 'is-required': isFieldRequiredInTemplate(field.key, pf.key) }">Zorunlu</span>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
                <div v-else-if="field.type === 'image'" class="image-upload-wrap">
                  <div v-if="fieldValues[field.key]" class="image-preview-container">
                    <img :src="fieldValues[field.key]" alt="Kapak Görseli" class="image-preview" />
                    <button type="button" class="button danger ghost button--sm image-remove-btn" @click="fieldValues[field.key] = ''">
                      <i class="pi pi-trash" aria-hidden="true" />
                      Kaldır
                    </button>
                  </div>
                  <div v-else class="image-upload-dropzone" @click="triggerFileInput(field.key)">
                    <i class="pi pi-upload" aria-hidden="true" />
                    <span>{{ uploadState[field.key]?.uploading ? 'Yükleniyor...' : 'Görsel seçmek için tıklayın' }}</span>
                    <small v-if="uploadState[field.key]?.error" class="image-upload-error">{{ uploadState[field.key]?.error }}</small>
                  </div>
                  <input
                    :ref="el => { if (el) fileInputRefs[field.key] = el }"
                    type="file"
                    accept="image/*"
                    class="hidden-file-input"
                    @change="handleImageUpload(field.key, $event)"
                  />
                </div>
                <input
                  v-else
                  v-model="fieldValues[field.key]"
                  class="input"
                  :type="field.type ?? 'text'"
                  :required="field.required"
                  @input="field.key === 'slug' ? onSlugInput() : null"
                />
              </template>
              <small v-if="field.description" class="field-desc">{{ field.description }}</small>
            </label>
          </template>

          <div v-if="totalPages > 1" class="drawer-page-meta">
            <span class="muted">Sayfa {{ currentPage + 1 }} / {{ totalPages }}</span>
          </div>

          <!-- Premium Reason / Gerekçe Area -->
          <div v-if="isLastPage" class="field field--full reason-field-container">
            <div class="reason-info-banner">
              <i class="pi pi-shield" aria-hidden="true" />
              <span>Sistem güvenliği ve denetim logları için işlem gerekçesi zorunludur.</span>
            </div>
            <label class="field">
              <span>Gerekçe</span>
              <textarea
                v-model.trim="reason"
                class="textarea reason-textarea"
                :required="reasonRequired"
                placeholder="Bu işlemin yapılma nedenini kısaca açıklayın..."
              />
            </label>
          </div>

          <p v-if="isLastPage && reasonRequired && !hasReason" class="reason-warning-text drawer-full-row">
            <i class="pi pi-exclamation-triangle" aria-hidden="true" />
            Bu işlem onaylanmadan önce geçerli bir gerekçe yazmalısınız.
          </p>

          <footer class="drawer-footer drawer-full-row">
            <button
              v-if="totalPages > 1"
              class="button ghost"
              type="button"
              :disabled="currentPage === 0"
              @click="goPrevPage"
            >
              Önceki
            </button>
            <button class="button" type="button" @click="emit('close')">İptal</button>
            <button
              class="button primary"
              type="submit"
              :disabled="isLastPage && reasonRequired && !hasReason"
            >
              {{ isLastPage ? confirmLabel : 'Devam' }}
            </button>
          </footer>
        </form>
      </aside>
    </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';

export interface DrawerFieldOption {
  label: string;
  value: string;
}

export interface DrawerField {
  key: string;
  label: string;
  type?: 'text' | 'number' | 'textarea' | 'select' | 'multiselect' | 'date' | 'url' | 'image' | 'template_editor';
  required?: boolean;
  value?: any;
  options?: DrawerFieldOption[];
  description?: string;
  fullWidth?: boolean;
}

export interface DrawerConfirmPayload {
  reason: string;
  values: Record<string, string | string[]>;
}

import { adminApi } from '../services/api';

const props = withDefaults(
  defineProps<{
    open: boolean;
    title: string;
    fields?: DrawerField[];
    reasonRequired?: boolean;
    defaultReason?: string;
    confirmLabel?: string;
    presentation?: 'drawer' | 'modal';
    pageSize?: number;
  }>(),
  {
    fields: () => [],
    reasonRequired: true,
    defaultReason: '',
    confirmLabel: 'Onayla',
    presentation: 'drawer',
    pageSize: 0,
  },
);

const emit = defineEmits<{
  (event: 'confirm', payload: DrawerConfirmPayload): void;
  (event: 'close'): void;
}>();

const reason = ref('');
const fieldValues = reactive<Record<string, any>>({});
const multiselectSearch = reactive<Record<string, string>>({});
const hasReason = computed(() => reason.value.trim().length > 0);

const templateEditorError = ref<string | null>(null);

const templateSearchQuery = ref('');

const hasLogoGroup = computed(() => {
  return props.fields.some(f => f.key === 'logoUrl') &&
         props.fields.some(f => f.key === 'issuer') &&
         props.fields.some(f => f.key === 'registrationUrl');
});

function getFieldByKey(key: string) {
  return props.fields.find(f => f.key === key);
}


const PREDEFINED_TEMPLATE_FIELDS = [
  { key: 'brand', label: 'Marka', type: 'text' },
  { key: 'condition', label: 'Ürün Durumu', type: 'select' },
  { key: 'productContent', label: 'Ürün İçeriği', type: 'text' },
  { key: 'sku', label: 'Stok Kodu (SKU)', type: 'text' },
  { key: 'barcodeNo', label: 'Barkod No', type: 'text' },
  { key: 'weight', label: 'Ağırlık (kg)', type: 'number' },
  { key: 'dimensionWidth', label: 'Genişlik (cm)', type: 'dimension' },
  { key: 'dimensionHeight', label: 'Yükseklik (cm)', type: 'dimension' },
  { key: 'dimensionDepth', label: 'Derinlik (cm)', type: 'dimension' },
  { key: 'productionProvince', label: 'Üretim İli', type: 'select' },
  { key: 'productionDistrict', label: 'Üretim İlçesi', type: 'select' },
  { key: 'originCountry', label: 'Menşei Ülke', type: 'select' },
  { key: 'originRegion', label: 'Menşei Bölge', type: 'text' },
  { key: 'wholesalePrice', label: 'Toptan Fiyat', type: 'number' },
  { key: 'retailPrice', label: 'Perakende Fiyat', type: 'number' },
  { key: 'shippingProvince', label: 'Gönderim İli', type: 'select' },
  { key: 'shippingDistrict', label: 'Gönderim İlçesi', type: 'select' },
  { key: 'shippingAddress', label: 'Gönderim Adresi', type: 'textarea' },
  { key: 'deliveryTemplateDomestic', label: 'Yurtiçi Teslimat Şablonu', type: 'select' },
  { key: 'deliveryTemplateInternational', label: 'Yurtdışı Teslimat Şablonu', type: 'select' },
  { key: 'desiDomestic', label: 'Yurtiçi Desi', type: 'text' },
  { key: 'desiInternational', label: 'Yurtdışı Desi', type: 'text' },
  { key: 'geoIndicationCertNo', label: 'Coğrafi İşaret Belge No', type: 'text' },
  { key: 'geoIndicationRegion', label: 'Coğrafi İşaret Bölgesi', type: 'text' },
  { key: 'geoIndicationReceivedAt', label: 'Coğrafi İşaret Tarihi', type: 'date' },
  { key: 'additionalCertificates', label: 'Ek Belgeler', type: 'text' },
  { key: 'featureBadges', label: 'Özellik Rozetleri', type: 'multiselect' },
  { key: 'geoBadgeSelections', label: 'Coğrafi Rozet Seçimleri', type: 'multiselect' },
  { key: 'productionSeasons', label: 'Üretim Sezonları', type: 'multiselect' },
  { key: 'salesMonths', label: 'Satış Ayları', type: 'multiselect' },
  { key: 'sellerNotes', label: 'Satıcı Notları', type: 'textarea' },
  { key: 'images', label: 'Görseller', type: 'image' },
].sort((a, b) => a.label.localeCompare(b.label, 'tr'));

const filteredPredefinedFields = computed(() => {
  const query = templateSearchQuery.value.trim().toLocaleLowerCase('tr-TR');
  if (!query) return PREDEFINED_TEMPLATE_FIELDS;
  return PREDEFINED_TEMPLATE_FIELDS.filter(
    (f) =>
      f.label.toLocaleLowerCase('tr-TR').includes(query) ||
      f.key.toLowerCase().includes(query)
  );
});

function translateFieldType(type: string): string {
  const map: Record<string, string> = {
    text: 'Metin',
    number: 'Sayı',
    select: 'Seçim Kutusu',
    dimension: 'Boyut / Ebat',
    image: 'Görsel',
    textarea: 'Uzun Metin',
    date: 'Tarih'
  };
  return map[type.toLowerCase()] ?? type.toUpperCase();
}

function getFieldLabel(key: string): string {
  const translations: Record<string, string> = {
    brand: 'Marka',
    condition: 'Durum',
    sku: 'Stok Kodu (SKU)',
    price: 'Fiyat',
    stock: 'Stok Adedi',
    color: 'Renk',
    size: 'Beden / Ebat',
    material: 'Malzeme',
    fabric_type: 'Kumaş Türü',
    fabrictype: 'Kumaş Türü',
    material_type: 'Malzeme Türü',
    materialtype: 'Malzeme Türü',
    origin: 'Menşei',
    weight: 'Ağırlık / Kütle',
    dimensions: 'Boyutlar',
    productiondate: 'Üretim Tarihi',
    warranty: 'Garanti Süresi',
    shipping: 'Kargo Detayı',
    model: 'Model',
    year: 'Yıl',
    grade: 'Derece / Sınıf',
    authenticity: 'Orijinallik Belgesi',
    author: 'Yazar / Sanatçı',
    medium: 'Yapım Tekniği',
    publisher: 'Yayınevi',
    isbn: 'ISBN',
    page_count: 'Sayfa Sayısı',
    pagecount: 'Sayfa Sayısı',
    format: 'Format / Biçim',
    language: 'Dil',
    artist: 'Sanatçı',
    height: 'Yükseklik',
    width: 'Genişlik',
    depth: 'Derinlik',
    diameter: 'Çap',
    thickness: 'Kalınlık',
    volume: 'Hacim',
    capacity: 'Kapasite',
    power: 'Güç',
    voltage: 'Voltaj',
    fuel_type: 'Yakıt Tipi',
    fueltype: 'Yakıt Tipi',
    transmission: 'Şanzıman',
    engine_power: 'Motor Gücü',
    enginepower: 'Motor Gücü',
    engine_size: 'Motor Hacmi',
    enginesize: 'Motor Hacmi',
    mileage: 'Kilometre (Km)',
    body_type: 'Kasa Tipi',
    bodytype: 'Kasa Tipi',
    gear: 'Vites',
    room_count: 'Oda Sayısı',
    roomcount: 'Oda Sayısı',
    square_meters: 'Metrekare (m²)',
    squaremeters: 'Metrekare (m²)',
    floor: 'Bulunduğu Kat',
    heating: 'Isıtma',
    furnished: 'Eşyalı mı?',
    title_deed: 'Tapu Durumu',
    titledeed: 'Tapu Durumu',
    using_status: 'Kullanım Durumu',
    usingstatus: 'Kullanım Durumu',
    certifications: 'Sertifikalar / Belgeler',
    certification: 'Sertifikalar / Belgeler',
  };
  
  const normalizedKey = key.toLowerCase().replace(/_/g, '').replace(/-/g, '');
  return translations[key.toLowerCase()] ?? translations[normalizedKey] ?? key;
}

interface TemplateField {
  key: string;
  type: string;
  required?: boolean;
}

interface TemplateObject {
  fields?: TemplateField[];
  variant?: Record<string, unknown>;
}

function getTemplateFields(key: string): TemplateField[] {
  const current = fieldValues[key];
  if (!current || typeof current !== 'object' || Array.isArray(current)) return [];
  const fields = (current as TemplateObject).fields;
  return Array.isArray(fields) ? (fields as TemplateField[]) : [];
}

function isFieldVisibleInTemplate(key: string, fieldKey: string): boolean {
  const fields = getTemplateFields(key);
  return fields.some(f => f.key === fieldKey);
}

function isFieldRequiredInTemplate(key: string, fieldKey: string): boolean {
  const fields = getTemplateFields(key);
  const found = fields.find(f => f.key === fieldKey);
  return found ? found.required === true : false;
}

function toggleFieldVisibility(key: string, fieldKey: string, predefinedField: any) {
  let current = fieldValues[key];
  if (!current || typeof current !== 'object' || Array.isArray(current)) {
    current = {
      fields: [],
      variant: { enabled: false, allowedKinds: [], requiredKinds: [], maxGroups: 0 }
    };
  }
  const templateObj = current as TemplateObject;
  const fields = Array.isArray(templateObj.fields) ? [...templateObj.fields] : [];
  
  const existingIdx = fields.findIndex(f => f.key === fieldKey);
  if (existingIdx >= 0) {
    // Remove the field
    fields.splice(existingIdx, 1);
  } else {
    // Add the field
    fields.push({
      key: fieldKey,
      type: predefinedField.type,
      required: false
    });
  }
  
  fieldValues[key] = {
    ...templateObj,
    fields
  };
}

function toggleFieldRequirement(key: string, fieldKey: string) {
  const current = fieldValues[key];
  if (!current || typeof current !== 'object' || Array.isArray(current)) return;
  
  const templateObj = current as TemplateObject;
  const fields = Array.isArray(templateObj.fields) ? [...templateObj.fields] : [];
  
  const existingIdx = fields.findIndex(f => f.key === fieldKey);
  if (existingIdx >= 0) {
    fields[existingIdx] = {
      ...fields[existingIdx],
      required: !fields[existingIdx].required
    };
  }
  
  fieldValues[key] = {
    ...templateObj,
    fields
  };
}

// Image Upload Logic & Refs
const uploadState = reactive<Record<string, { uploading: boolean; error: string | null }>>({});
const fileInputRefs = reactive<Record<string, any>>({});

function triggerFileInput(key: string) {
  fileInputRefs[key]?.click();
}

async function handleImageUpload(key: string, event: Event) {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file) return;

  uploadState[key] = { uploading: true, error: null };
  const formData = new FormData();
  formData.append('file', file);

  try {
    const response = await adminApi.post('/admin/uploads/images?kind=auction', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    fieldValues[key] = response.data.url;
    uploadState[key].uploading = false;
  } catch (e) {
    uploadState[key].uploading = false;
    uploadState[key].error = 'Görsel yüklenemedi. Lütfen tekrar deneyin.';
  }
}
const currentPage = ref(0);
const effectivePageSize = computed(() => Math.max(0, Number(props.pageSize ?? 0)));
const fieldPages = computed<DrawerField[][]>(() => {
  if (effectivePageSize.value <= 0) return [props.fields];
  const pages: DrawerField[][] = [];
  for (let index = 0; index < props.fields.length; index += effectivePageSize.value) {
    pages.push(props.fields.slice(index, index + effectivePageSize.value));
  }
  return pages.length > 0 ? pages : [[]];
});
const totalPages = computed(() => fieldPages.value.length);
const isLastPage = computed(() => currentPage.value >= totalPages.value - 1);
const visibleFields = computed(() => fieldPages.value[currentPage.value] ?? []);

let wasOpen = false;

watch(
  () => [props.open, props.fields, props.defaultReason] as const,
  ([isOpen, fields, defReason]) => {
    const openedJustNow = isOpen && !wasOpen;
    wasOpen = isOpen;

    if (openedJustNow) {
      reason.value = defReason ?? '';
      currentPage.value = 0;
      Object.keys(fieldValues).forEach((key) => {
        delete fieldValues[key];
      });
      Object.keys(multiselectSearch).forEach((key) => {
        delete multiselectSearch[key];
      });
    }

    fields.forEach((field) => {
      if (openedJustNow || fieldValues[field.key] === undefined) {
        fieldValues[field.key] = field.value ?? (field.type === 'multiselect' ? [] : '');
      }
      if (field.type === 'multiselect' && multiselectSearch[field.key] === undefined) {
        multiselectSearch[field.key] = '';
      }
    });
  },
  { immediate: true },
);

function isGroupChecked(key: string, optionIds: string[]): boolean {
  const current = fieldValues[key];
  if (!Array.isArray(current) || current.length === 0) return false;
  return optionIds.every((id) => current.includes(id));
}

function toggleGroup(key: string, optionIds: string[]) {
  const current = fieldValues[key];
  if (!Array.isArray(current)) {
    fieldValues[key] = [...optionIds];
    return;
  }
  const allSelected = optionIds.every((id) => current.includes(id));
  if (allSelected) {
    fieldValues[key] = current.filter((id) => !optionIds.includes(id));
  } else {
    const next = [...current];
    optionIds.forEach((id) => {
      if (!next.includes(id)) {
        next.push(id);
      }
    });
    fieldValues[key] = next;
  }
}

function clearSelected(key: string) {
  fieldValues[key] = [];
}

function getSelectedCount(key: string): number {
  const current = fieldValues[key];
  return Array.isArray(current) ? current.length : 0;
}

function getGroups(field: DrawerField) {
  const options = field.options ?? [];
  console.log('getGroups field key:', field.key, 'options length:', options.length, 'options:', JSON.stringify(options));
  const groupsMap = new Map<string, { label: string; kind: string; optionIds: string[]; optionLabels: string[] }>();
  
  options.forEach((opt) => {
    const kind = getOptionBadge(opt.label);
    if (!kind) return;
    
    let groupLabel = '';
    if (kind === 'COLOR') groupLabel = 'Renk Yönetimi';
    else if (kind === 'SIZE') groupLabel = 'Beden Yönetimi';
    else if (kind === 'NUMBER') groupLabel = 'Numara Yönetimi';
    else if (kind === 'OPTION') groupLabel = 'Seçenek Yönetimi';
    else if (kind === 'VARIATION') groupLabel = 'Varyasyonlar';
    else groupLabel = kind;
    
    const existing = groupsMap.get(kind) ?? { label: groupLabel, kind, optionIds: [], optionLabels: [] };
    existing.optionIds.push(opt.value);
    
    const cleanLabel = getCleanOptionLabel(opt.label);
    existing.optionLabels.push(cleanLabel);
    
    groupsMap.set(kind, existing);
  });
  
  return Array.from(groupsMap.values());
}

function getCleanOptionLabel(label: string): string {
  const index = label.indexOf('(');
  if (index === -1) return label;
  return label.substring(0, index).trim();
}

function filteredGroups(field: DrawerField) {
  const groups = getGroups(field);
  const query = (multiselectSearch[field.key] ?? '').toLowerCase().trim();
  if (!query) return groups;
  return groups.filter((g) => g.label.toLowerCase().includes(query) || g.kind.toLowerCase().includes(query));
}

function getOptionBadge(label: string): string {
  const startIndex = label.indexOf('(');
  const endIndex = label.lastIndexOf(')');
  if (startIndex === -1 || endIndex === -1) return '';
  return label.substring(startIndex + 1, endIndex).trim().toUpperCase();
}

function submit() {
  if (!isLastPage.value) {
    currentPage.value += 1;
    return;
  }
  if (props.reasonRequired && !hasReason.value) return;
  emit('confirm', {
    reason: reason.value.trim(),
    values: { ...fieldValues },
  });
}

function goPrevPage() {
  if (currentPage.value === 0) return;
  currentPage.value -= 1;
}

const isSlugManuallyEdited = ref(false);

function onSlugInput() {
  isSlugManuallyEdited.value = true;
}

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      isSlugManuallyEdited.value = false;
    }
  }
);

watch(
  () => fieldValues['name'],
  (newName) => {
    if (fieldValues['slug'] !== undefined && typeof newName === 'string' && !isSlugManuallyEdited.value) {
      fieldValues['slug'] = newName
        .trim()
        .toLowerCase()
        .replace(/ğ/g, 'g')
        .replace(/ü/g, 'u')
        .replace(/ş/g, 's')
        .replace(/ı/g, 'i')
        .replace(/ö/g, 'o')
        .replace(/ç/g, 'c')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
    }
  }
);

watch(
  () => fieldValues['slug'],
  (newSlug) => {
    if (newSlug === '') {
      isSlugManuallyEdited.value = false;
    }
  }
);
</script>

<style scoped>
/* Glassmorphism Backdrop & Layout Modes */
.drawer-backdrop {
  position: fixed;
  inset: 0;
  z-index: 40;
  display: flex;
  justify-content: flex-end;
  background: rgba(15, 23, 42, 0.45); /* Elegant slate overlay */
  backdrop-filter: blur(8px); /* Modern premium backdrop blur */
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.drawer-backdrop.backdrop-modal {
  justify-content: center;
  align-items: center;
  padding: 24px;
}

/* Modal and Side Drawer General styles */
.drawer {
  width: min(560px, 100vw);
  height: 100vh;
  overflow-y: auto;
  border-left: 1px solid var(--border-soft);
  background: var(--bg-panel);
  box-shadow: -10px 0 30px rgba(15, 23, 42, 0.1);
  display: flex;
  flex-direction: column;
}

.drawer-modal {
  width: min(720px, calc(100vw - 32px));
  height: auto;
  max-height: calc(100vh - 48px);
  margin: auto;
  border: 1px solid var(--border-soft);
  border-radius: 16px;
  box-shadow: 0 24px 48px -12px rgba(15, 23, 42, 0.18), 0 8px 16px -8px rgba(15, 23, 42, 0.08);
  overflow: hidden;
}

.drawer-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  border-bottom: 1px solid var(--border-soft);
  padding: 18px 24px;
  background: var(--bg-panel);
}

.drawer-title {
  font-family: 'Manrope', sans-serif;
  font-size: 17px;
  font-weight: 800;
  color: var(--text-strong);
  letter-spacing: -0.3px;
}

.drawer-close-btn {
  border-radius: 50% !important;
  width: 32px !important;
  height: 32px !important;
  display: flex !important;
  align-items: center;
  justify-content: center;
  padding: 0 !important;
  border: 1px solid var(--border-soft) !important;
  background: var(--bg-soft) !important;
  color: var(--text-muted) !important;
  transition: all 0.2s ease !important;
}

.drawer-close-btn:hover {
  background: var(--danger-50) !important;
  border-color: var(--danger-200) !important;
  color: var(--danger-600) !important;
  transform: rotate(90deg);
}

/* Form Styles and Apple/Stripe-like Input aesthetics */
.drawer-body {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 20px;
  padding: 24px;
  overflow-y: auto;
  flex: 1;
}

.drawer-body .field {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.drawer-body .field.field--full,
.drawer-page-meta,
.drawer-full-row {
  grid-column: 1 / -1;
}

.drawer-body .field span {
  font-size: 11px;
  font-weight: 700;
  color: var(--text-muted);
  letter-spacing: 0.8px;
  text-transform: uppercase;
}

.drawer-body .input,
.drawer-body .select,
.drawer-body .textarea {
  width: 100%;
  border: 1px solid var(--border-strong);
  border-radius: 10px;
  background: var(--bg-soft);
  color: var(--text-strong);
  padding: 11px 14px;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.01);
}

.drawer-body .input:hover,
.drawer-body .select:hover,
.drawer-body .textarea:hover {
  border-color: var(--text-muted);
}

.drawer-body .input:focus,
.drawer-body .select:focus,
.drawer-body .textarea:focus {
  outline: none;
  background: #ffffff;
  border-color: var(--brand-500);
  box-shadow: 0 0 0 3px rgba(54, 95, 168, 0.12), inset 0 1px 2px rgba(0, 0, 0, 0.01);
}

/* Premium Gerekçe Area */
.reason-field-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
  border-top: 1px dashed var(--border-soft);
  padding-top: 20px;
  margin-top: 12px;
}

.reason-info-banner {
  display: flex;
  align-items: center;
  gap: 10px;
  background: var(--brand-50);
  color: var(--brand-700);
  border: 1px solid var(--brand-200);
  padding: 12px 16px;
  border-radius: 10px;
  font-size: 12.5px;
  font-weight: 600;
  line-height: 1.4;
}

.reason-info-banner i {
  font-size: 16px;
  color: var(--brand-500);
}

.reason-textarea {
  min-height: 80px !important;
}

.reason-warning-text {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: var(--danger-600);
  font-size: 12.5px;
  font-weight: 600;
  background: var(--danger-50);
  border: 1px solid var(--danger-100);
  padding: 10px 14px;
  border-radius: 10px;
  margin-top: 4px;
}

.reason-warning-text i {
  font-size: 14px;
}

/* Footer Styling */
.drawer-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  border-top: 1px solid var(--border-soft);
  padding: 18px 24px;
  background: var(--bg-soft);
  margin-top: 16px;
}

.drawer-page-meta {
  display: flex;
  justify-content: flex-end;
  font-size: 12px;
  padding: 0 4px;
}

.field-desc {
  font-size: 11px;
  color: var(--text-muted);
  margin-top: 5px;
  font-weight: 500;
  line-height: 1.4;
  text-transform: none !important;
}

/* --- Nested CSS Transitions for Teleport --- */
/* Fade backdrop */
.drawer-fade-enter-active,
.drawer-fade-leave-active {
  transition: opacity 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.drawer-fade-enter-from,
.drawer-fade-leave-to {
  opacity: 0;
}

/* Slide side drawer */
.drawer-fade-enter-active .drawer:not(.drawer-modal),
.drawer-fade-leave-active .drawer:not(.drawer-modal) {
  transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.drawer-fade-enter-from .drawer:not(.drawer-modal),
.drawer-fade-leave-to .drawer:not(.drawer-modal) {
  transform: translateX(100%);
}

/* Zoom/Scale centered modal */
.drawer-fade-enter-active .drawer-modal,
.drawer-fade-leave-active .drawer-modal {
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.drawer-fade-enter-from .drawer-modal,
.drawer-fade-leave-to .drawer-modal {
  transform: scale(0.95) translateY(12px);
  opacity: 0;
}

/* Image Upload Component Styles */
.image-upload-wrap {
  width: 100%;
  margin-top: 4px;
  grid-column: 1 / -1;
}
.image-preview-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  border: 1px solid var(--border-soft);
  border-radius: 9px;
  padding: 12px;
  background: var(--bg-soft);
}
.image-preview {
  width: 100%;
  max-height: 160px;
  object-fit: cover;
  border-radius: 6px;
  border: 1px solid var(--border-strong);
}
.image-upload-dropzone {
  width: 100%;
  min-height: 100px;
  border: 2px dashed var(--border-strong);
  border-radius: 9px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 16px;
  background: var(--bg-soft);
  cursor: pointer;
  transition: all 0.2s ease;
}
.image-upload-dropzone:hover {
  border-color: var(--brand-500);
  background: var(--brand-50);
}
.image-upload-dropzone i {
  font-size: 24px;
  color: var(--text-muted);
}
.image-upload-dropzone span {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-strong);
}
.image-upload-error {
  color: var(--danger-500);
  font-size: 11px;
  font-weight: 600;
}
.hidden-file-input {
  display: none;
}
.image-remove-btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}
</style>

<style scoped>
.multiselect-container {
  display: flex;
  flex-direction: column;
  gap: 10px;
  border: 1px solid var(--border-strong);
  border-radius: 10px;
  background: var(--bg-panel);
  padding: 12px;
  box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.02);
  margin-top: 4px;
}

.multiselect-search-wrap {
  position: relative;
  display: flex;
  align-items: center;
}

.multiselect-search-wrap i {
  position: absolute;
  left: 10px;
  color: var(--text-muted);
  font-size: 13px;
}

.multiselect-search {
  padding-left: 32px !important;
  font-size: 13px;
  min-height: 32px;
}

.multiselect-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 12px;
  padding: 0 4px;
}

.multiselect-clear-btn {
  background: transparent;
  border: 0;
  color: var(--danger-500);
  font-weight: 700;
  cursor: pointer;
  padding: 0;
}

.multiselect-clear-btn:hover {
  text-decoration: underline;
}

.multiselect-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 200px;
  overflow-y: auto;
  padding-right: 4px;
  border: 1px solid var(--border-soft);
  border-radius: 8px;
  background: var(--bg-soft);
  padding: 8px;
}

/* Custom Scrollbar for list */
.multiselect-list::-webkit-scrollbar {
  width: 6px;
}
.multiselect-list::-webkit-scrollbar-track {
  background: transparent;
}
.multiselect-list::-webkit-scrollbar-thumb {
  background-color: var(--border-strong);
  border-radius: 99px;
}

.multiselect-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 7px;
  border: 1px solid transparent;
  cursor: pointer;
  background: var(--bg-panel);
  transition: all 0.15s ease;
  user-select: none;
}

.multiselect-item:hover {
  background: var(--bg-elevated);
  border-color: var(--border-soft);
}

.multiselect-item.is-selected {
  background: var(--brand-100);
  border-color: var(--brand-500);
}

.multiselect-checkbox {
  width: 16px;
  height: 16px;
  accent-color: var(--brand-500);
  cursor: pointer;
  flex-shrink: 0;
}

.multiselect-item-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex: 1;
  min-width: 0;
  gap: 12px;
}

.multiselect-item-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  flex: 1;
}

.multiselect-item-label {
  font-size: 13.5px;
  font-weight: 700;
  color: var(--text-strong);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.multiselect-item-details {
  font-size: 9.5px;
  color: var(--text-muted);
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 320px;
  transition: color 0.15s ease;
}

.multiselect-item.is-selected .multiselect-item-details {
  color: var(--brand-600);
  opacity: 0.85;
}

.multiselect-item-badge {
  font-size: 10px;
  font-weight: 800;
  background: var(--bg-soft);
  color: var(--text-muted);
  padding: 2px 6px;
  border-radius: 6px;
  border: 1px solid var(--border-soft);
}

.multiselect-item.is-selected .multiselect-item-badge {
  background: #ffffff;
  color: var(--brand-600);
  border-color: #bfd0ea;
}

.multiselect-empty {
  padding: 20px;
  text-align: center;
  font-size: 12px;
  color: var(--text-muted);
}

/* Premium Dynamic Template Editor Styles */
.template-editor-container {
  display: flex;
  flex-direction: column;
  gap: 12px;
  grid-column: 1 / -1;
  border: 1px solid var(--border-strong);
  border-radius: 10px;
  background: var(--bg-panel);
  padding: 14px;
  box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.02);
  margin-top: 4px;
}

.template-search-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  position: relative;
  border: 1px solid var(--border-strong);
  border-radius: 9px;
  background: var(--bg-soft);
  padding: 2px 10px;
  margin-bottom: 4px;
}

.template-search-bar .search-icon {
  color: var(--text-muted);
  font-size: 14px;
}

.template-search-input {
  border: none !important;
  background: transparent !important;
  font-size: 13px;
  color: var(--text-strong);
  padding: 8px 4px !important;
  box-shadow: none !important;
  flex: 1;
}

.template-search-input:focus {
  outline: none !important;
}

.template-search-badge {
  font-size: 10px;
  font-weight: 800;
  background: var(--border-soft);
  color: var(--text-muted);
  padding: 2px 6px;
  border-radius: 6px;
  text-transform: uppercase;
}

.template-predefined-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  max-height: 380px;
  overflow-y: auto;
  padding: 4px;
}

.predefined-field-card {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 8px;
  padding: 10px 12px;
  background: var(--bg-soft);
  border: 1px solid var(--border-soft);
  border-radius: 8px;
  transition: all 0.2s ease;
}

.predefined-field-card:hover {
  border-color: var(--border-strong);
}

.predefined-field-card.is-active {
  background: var(--brand-50);
  border-color: var(--brand-200);
}

.predefined-field-meta {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.predefined-field-label {
  font-size: 13px;
  color: var(--text-strong);
  font-weight: 700;
  text-align: left;
}

.predefined-field-key {
  font-family: var(--font-mono, monospace);
  font-size: 10.5px;
  color: var(--text-muted);
  text-align: left;
  text-transform: none !important;
}

.predefined-field-type-badge {
  display: inline-block;
  align-self: flex-start;
  font-size: 9.5px;
  font-weight: 800;
  text-transform: uppercase;
  background: var(--border-soft);
  color: var(--text-muted);
  padding: 1px 5px;
  border-radius: 4px;
  margin-top: 3px;
}

.predefined-field-card.is-active .predefined-field-type-badge {
  background: var(--brand-100);
  color: var(--brand-700);
}

.predefined-field-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  border-top: 1px dashed var(--border-soft);
  padding-top: 6px;
  margin-top: 2px;
}

.toggle-switch-label {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  font-weight: 700;
  color: var(--text-muted);
  cursor: pointer;
  user-select: none;
}

.toggle-switch-label input {
  accent-color: var(--brand-500);
  width: 14px;
  height: 14px;
}

.toggle-switch-label.requirement-toggle {
  margin-left: auto;
}

.action-text {
  text-transform: uppercase;
  font-size: 10px;
  letter-spacing: 0.2px;
}

.zorunlu-text {
  color: var(--text-muted);
}

.zorunlu-text.is-required {
  color: #d97706; /* Amber */
  font-weight: 800;
}

/* Grouped Logo Layout Styles */
.logo-group-layout {
  display: flex;
  gap: 20px;
  width: 100%;
  margin-top: 4px;
}

.logo-group-left {
  flex-shrink: 0;
  width: 160px;
}

.logo-group-right {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.sub-field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.sub-field span {
  font-size: 11px;
  font-weight: 700;
  color: var(--text-muted);
  letter-spacing: 0.8px;
  text-transform: uppercase;
}

/* Square-specific Image Upload styles */
.square-image-upload {
  width: 160px;
  height: 160px;
  margin-top: 0;
}

.square-preview-container {
  width: 100%;
  height: 100%;
  padding: 8px;
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
}

.square-preview {
  width: 100%;
  height: 100%;
  max-height: 100%;
  object-fit: contain;
  border-radius: 8px;
  background: var(--bg-panel);
}

.square-remove-btn {
  position: absolute;
  bottom: 8px;
  left: 8px;
  right: 8px;
  width: calc(100% - 16px);
  padding: 6px 12px;
  font-size: 11px;
  background: rgba(239, 68, 68, 0.9) !important;
  color: white !important;
  border: none !important;
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.square-remove-btn:hover {
  background: #ef4444 !important;
}

.square-dropzone {
  width: 100%;
  height: 100%;
  min-height: auto;
  padding: 12px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
}
</style>
