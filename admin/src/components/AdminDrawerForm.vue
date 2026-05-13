<template>
  <Teleport to="body">
    <div v-if="open" class="drawer-backdrop" role="presentation" @click.self="emit('close')">
      <aside
        class="drawer"
        :class="{ 'drawer-modal': presentation === 'modal' }"
        role="dialog"
        aria-modal="true"
        :aria-label="title"
      >
        <header class="drawer-header">
          <strong>{{ title }}</strong>
          <button class="button ghost" type="button" title="Kapat" @click="emit('close')">
            <i class="pi pi-times" aria-hidden="true" />
          </button>
        </header>

        <form class="drawer-body" @submit.prevent="submit">
          <label
            v-for="field in visibleFields"
            :key="field.key"
            class="field"
            :class="{ 'field--full': field.type === 'textarea' }"
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

          <label v-if="isLastPage" class="field field--full">
            <span>Gerekçe</span>
            <textarea
              v-model.trim="reason"
              class="textarea"
              :required="reasonRequired"
              placeholder="Değişiklik yapan yönetici işlemleri için zorunludur"
            />
          </label>

          <p v-if="isLastPage && reasonRequired && !hasReason" class="muted drawer-full-row">
            Bu işlem onaylanmadan önce bir gerekçe girilmelidir.
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
  type?: 'text' | 'number' | 'textarea' | 'select' | 'date' | 'url';
  required?: boolean;
  value?: string;
  options?: DrawerFieldOption[];
}

export interface DrawerConfirmPayload {
  reason: string;
  values: Record<string, string>;
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
const fieldValues = reactive<Record<string, string>>({});
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
    props.fields.forEach((field) => {
      fieldValues[field.key] = field.value ?? '';
    });
  },
  { immediate: true },
);

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
