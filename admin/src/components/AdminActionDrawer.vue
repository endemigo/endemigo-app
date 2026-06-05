<template>
  <AdminDrawerForm
    :open="open"
    :title="title"
    :fields="fields"
    :reason-required="reasonRequired"
    :confirm-label="confirmLabel"
    :presentation="presentation"
    @close="emit('close')"
    @confirm="emit('confirm', $event)"
  />
</template>

<script setup lang="ts">
import AdminDrawerForm, {
  type DrawerConfirmPayload,
  type DrawerField,
} from './AdminDrawerForm.vue';
export type { DrawerField, DrawerConfirmPayload } from './AdminDrawerForm.vue';

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
</script>
