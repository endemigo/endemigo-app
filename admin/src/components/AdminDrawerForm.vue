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
          <label
            v-for="field in visibleFields"
            :key="field.key"
            class="field"
            :class="{ 'field--full': field.type === 'textarea' || field.type === 'multiselect' }"
          >
            <span>{{ field.label }}</span>
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
            <input
              v-else
              v-model="fieldValues[field.key]"
              class="input"
              :type="field.type ?? 'text'"
              :required="field.required"
            />
          </label>

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
  type?: 'text' | 'number' | 'textarea' | 'select' | 'multiselect' | 'date' | 'url';
  required?: boolean;
  value?: string | string[];
  options?: DrawerFieldOption[];
}

export interface DrawerConfirmPayload {
  reason: string;
  values: Record<string, string | string[]>;
}

const props = withDefaults(
  defineProps<{
    open: boolean;
    title: string;
    fields?: DrawerField[];
    reasonRequired?: boolean;
    confirmLabel?: string;
    presentation?: 'drawer' | 'modal';
    pageSize?: number;
  }>(),
  {
    fields: () => [],
    reasonRequired: true,
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
const fieldValues = reactive<Record<string, string | string[]>>({});
const multiselectSearch = reactive<Record<string, string>>({});
const hasReason = computed(() => reason.value.trim().length > 0);
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

watch(
  () => [props.open, props.fields] as const,
  () => {
    reason.value = '';
    currentPage.value = 0;
    Object.keys(fieldValues).forEach((key) => {
      delete fieldValues[key];
    });
    Object.keys(multiselectSearch).forEach((key) => {
      delete multiselectSearch[key];
    });
    props.fields.forEach((field) => {
      fieldValues[field.key] = field.value ?? (field.type === 'multiselect' ? [] : '');
      if (field.type === 'multiselect') {
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
</script>

<style scoped>
/* Glassmorphism Backdrop & Layout Modes */
.drawer-backdrop {
  position: fixed;
  inset: 0;
  z-index: 40;
  display: flex;
  justify-content: flex-end;
  background: rgba(15, 23, 42, 0.4); /* Subtle slate overlay */
  backdrop-filter: blur(4px); /* Premium backdrop blur */
  transition: all 0.3s ease;
}

.drawer-backdrop.backdrop-modal {
  justify-content: center;
  align-items: center;
  padding: 24px;
}

/* Modal and Side Drawer General styles */
.drawer {
  width: min(520px, 100vw);
  height: 100vh;
  overflow-y: auto;
  border-left: 1px solid var(--border-soft);
  background: var(--bg-panel);
  box-shadow: -10px 0 30px rgba(15, 23, 42, 0.15);
  display: flex;
  flex-direction: column;
}

.drawer-modal {
  width: min(720px, calc(100vw - 32px));
  height: auto;
  max-height: calc(100vh - 48px);
  margin: auto;
  border: 1px solid var(--border-soft);
  border-radius: 14px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  overflow: hidden;
}

.drawer-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  border-bottom: 1px solid var(--border-soft);
  padding: 16px 20px;
  background: var(--bg-soft);
}

.drawer-title {
  font-family: 'Manrope', sans-serif;
  font-size: 16px;
  font-weight: 800;
  color: var(--text-strong);
  letter-spacing: -0.2px;
}

.drawer-close-btn {
  border-radius: 50% !important;
  width: 32px !important;
  height: 32px !important;
  display: flex !important;
  align-items: center;
  justify-content: center;
  padding: 0 !important;
  border: 1px solid transparent !important;
  transition: all 0.25s ease !important;
}

.drawer-close-btn:hover {
  background: var(--border-soft) !important;
  transform: rotate(90deg);
  color: var(--danger-500) !important;
}

/* Form Styles and Apple/Stripe-like Input aesthetics */
.drawer-body {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
  padding: 20px;
  overflow-y: auto;
  flex: 1;
}

.drawer-body .field {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.drawer-body .field.field--full,
.drawer-page-meta,
.drawer-full-row {
  grid-column: 1 / -1;
}

.drawer-body .field span {
  font-size: 11px;
  font-weight: 800;
  color: #5a6f64;
  letter-spacing: 0.5px;
  text-transform: uppercase;
}

.drawer-body .input,
.drawer-body .select,
.drawer-body .textarea {
  width: 100%;
  border: 1px solid var(--border-strong);
  border-radius: 9px;
  background: var(--bg-soft); /* Slate-soft background */
  color: var(--text-strong);
  padding: 10px 12px;
  font-size: 13.5px;
  font-weight: 500;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.02);
}

.drawer-body .input:focus,
.drawer-body .select:focus,
.drawer-body .textarea:focus {
  outline: none;
  background: #ffffff; /* Turns white on focus */
  border-color: var(--brand-500);
  box-shadow: 0 0 0 3px rgba(54, 95, 168, 0.12), inset 0 1px 2px rgba(0, 0, 0, 0.02);
}

/* Premium Gerekçe Area */
.reason-field-container {
  display: flex;
  flex-direction: column;
  gap: 12px;
  border-top: 1px dashed var(--border-soft);
  padding-top: 16px;
  margin-top: 8px;
}

.reason-info-banner {
  display: flex;
  align-items: center;
  gap: 10px;
  background: var(--brand-100);
  color: var(--brand-600);
  padding: 10px 14px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
  line-height: 1.4;
}

.reason-info-banner i {
  font-size: 16px;
  color: var(--brand-500);
}

.reason-textarea {
  min-height: 70px !important;
}

.reason-warning-text {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: var(--danger-500);
  font-size: 12.5px;
  font-weight: 600;
  background: var(--danger-100);
  padding: 8px 12px;
  border-radius: 8px;
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
  padding: 16px 20px;
  background: var(--bg-soft);
  margin-top: 8px;
}

.drawer-page-meta {
  display: flex;
  justify-content: flex-end;
  font-size: 12px;
  padding: 0 4px;
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
</style>
