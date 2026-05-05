<template>
  <Teleport to="body">
    <div v-if="open" class="drawer-backdrop" role="presentation" @click.self="emit('close')">
      <aside class="drawer" role="dialog" aria-modal="true" :aria-label="title">
        <header class="drawer-header">
          <strong>{{ title }}</strong>
          <button class="button ghost" type="button" title="Kapat" @click="emit('close')">
            <i class="pi pi-times" aria-hidden="true" />
          </button>
        </header>

        <form class="drawer-body" @submit.prevent="submit">
          <label v-for="field in fields" :key="field.key" class="field">
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

          <label class="field">
            <span>Gerekçe</span>
            <textarea
              v-model.trim="reason"
              class="textarea"
              :required="reasonRequired"
              placeholder="Değişiklik yapan yönetici işlemleri için zorunludur"
            />
          </label>

          <p v-if="reasonRequired && !hasReason" class="muted">
            Bu işlem onaylanmadan önce bir gerekçe girilmelidir.
          </p>

          <footer class="drawer-footer">
            <button class="button" type="button" @click="emit('close')">İptal</button>
            <button class="button primary" type="submit" :disabled="reasonRequired && !hasReason">
              {{ confirmLabel }}
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
  type?: 'text' | 'number' | 'textarea' | 'select';
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
  }>(),
  {
    fields: () => [],
    reasonRequired: true,
    confirmLabel: 'Onayla',
  },
);

const emit = defineEmits<{
  (event: 'confirm', payload: DrawerConfirmPayload): void;
  (event: 'close'): void;
}>();

const reason = ref('');
const fieldValues = reactive<Record<string, string>>({});

const hasReason = computed(() => reason.value.trim().length > 0);

watch(
  () => [props.open, props.fields] as const,
  () => {
    reason.value = '';
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
  if (props.reasonRequired && !hasReason.value) return;

  emit('confirm', {
    reason: reason.value.trim(),
    values: { ...fieldValues },
  });
}
</script>
