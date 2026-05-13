<template>
  <div class="admin-filter-bar">
    <label v-for="filter in filters" :key="filter.key" class="field admin-filter-field">
      <span>{{ filter.label }}</span>
      <input
        v-if="filter.type !== 'select'"
        v-model="localFilters[filter.key]"
        class="input"
        :type="filter.type ?? 'text'"
        @change="emitFilter"
      />
      <select
        v-else
        v-model="localFilters[filter.key]"
        class="select"
        @change="emitFilter"
      >
        <option value="">Tümü</option>
        <option v-for="option in filter.options ?? []" :key="option.value" :value="option.value">
          {{ option.label }}
        </option>
      </select>
    </label>
  </div>
</template>

<script setup lang="ts">
import { reactive, watch } from 'vue';
import type { AdminFilter } from './AdminDataTable.vue';

const props = withDefaults(
  defineProps<{
    filters?: AdminFilter[];
  }>(),
  {
    filters: () => [],
  },
);

const emit = defineEmits<{
  (event: 'filter', filters: Record<string, string>): void;
}>();

const localFilters = reactive<Record<string, string>>({});

watch(
  () => props.filters,
  (filters) => {
    filters.forEach((filter) => {
      localFilters[filter.key] = filter.value ?? localFilters[filter.key] ?? '';
    });
  },
  { immediate: true },
);

function emitFilter() {
  const cleanFilters = Object.fromEntries(
    Object.entries(localFilters).filter(([, value]) => value.trim().length > 0),
  );
  emit('filter', cleanFilters);
}
</script>
