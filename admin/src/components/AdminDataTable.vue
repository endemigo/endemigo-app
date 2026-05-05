<template>
  <section class="panel">
    <div class="panel-header">
      <div class="toolbar">
        <label v-for="filter in filters" :key="filter.key" class="field">
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
      <slot name="toolbar" />
    </div>

    <div class="table-wrap">
      <table class="admin-table">
        <thead>
          <tr>
            <th v-for="column in columns" :key="column.key" :style="{ width: column.width }">
              {{ column.label }}
            </th>
            <th v-if="actions.length > 0">İşlemler</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td :colspan="columns.length + actionColumnCount">Kayıtlar yükleniyor...</td>
          </tr>
          <tr v-else-if="rows.length === 0">
            <td :colspan="columns.length + actionColumnCount">Kayıt bulunamadı.</td>
          </tr>
          <tr v-for="row in rows" v-else :key="rowKey(row)" @click="selectRow(row)">
            <td v-for="column in columns" :key="column.key">
              <span v-if="column.format === 'status'" class="badge" :class="statusClass(row[column.key])">
                {{ formatCell(row[column.key], column) }}
              </span>
              <span v-else :title="cellTitle(row[column.key], column)">
                {{ formatCell(row[column.key], column) }}
              </span>
            </td>
            <td v-if="actions.length > 0" @click.stop>
              <div class="toolbar">
                <button
                  v-for="action in actions"
                  :key="action.key"
                  class="button"
                  :class="action.tone"
                  type="button"
                  :title="action.label"
                  @click="handleAction(action, row)"
                >
                  <i :class="action.icon ?? 'pi pi-play'" aria-hidden="true" />
                  <span>{{ action.label }}</span>
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="panel-footer">
      <span class="muted">
        Sayfa {{ pagination.page }} / {{ totalPages }} - {{ pagination.total }} kayıt
      </span>
      <div class="toolbar">
        <button class="button" type="button" :disabled="pagination.page <= 1" @click="changePage(-1)">
          <i class="pi pi-chevron-left" aria-hidden="true" />
          Önceki
        </button>
        <button
          class="button"
          type="button"
          :disabled="pagination.page >= totalPages"
          @click="changePage(1)"
        >
          Sonraki
          <i class="pi pi-chevron-right" aria-hidden="true" />
        </button>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, reactive, watch } from 'vue';

export interface AdminColumn {
  key: string;
  label: string;
  width?: string;
  format?: 'date' | 'money' | 'status' | 'text' | 'id';
}

export interface AdminFilterOption {
  label: string;
  value: string;
}

export interface AdminFilter {
  key: string;
  label: string;
  value?: string;
  type?: 'text' | 'search' | 'date' | 'select';
  options?: AdminFilterOption[];
}

export interface AdminTableAction {
  key: string;
  label: string;
  icon?: string;
  tone?: 'primary' | 'danger' | 'ghost';
}

export interface AdminPagination {
  page: number;
  limit: number;
  total: number;
}

const props = withDefaults(
  defineProps<{
    columns: AdminColumn[];
    rows: Record<string, unknown>[];
    loading: boolean;
    pagination: AdminPagination;
    filters?: AdminFilter[];
    actions?: AdminTableAction[];
    onPage?: (page: number) => void;
    onFilter?: (filters: Record<string, string>) => void;
    onAction?: (action: AdminTableAction, row: Record<string, unknown>) => void;
  }>(),
  {
    filters: () => [],
    actions: () => [],
    onPage: undefined,
    onFilter: undefined,
    onAction: undefined,
  },
);

const emit = defineEmits<{
  (event: 'page', page: number): void;
  (event: 'filter', filters: Record<string, string>): void;
  (event: 'action', action: AdminTableAction, row: Record<string, unknown>): void;
  (event: 'rowClick', row: Record<string, unknown>): void;
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

const totalPages = computed(() =>
  Math.max(1, Math.ceil(props.pagination.total / props.pagination.limit)),
);
const actionColumnCount = computed(() => (props.actions.length > 0 ? 1 : 0));

function rowKey(row: Record<string, unknown>): string {
  const id = row.id ?? row.email ?? JSON.stringify(row);
  return String(id);
}

function changePage(delta: number) {
  const nextPage = props.pagination.page + delta;
  props.onPage?.(nextPage);
  emit('page', nextPage);
}

function emitFilter() {
  const cleanFilters = Object.fromEntries(
    Object.entries(localFilters).filter(([, value]) => value.trim().length > 0),
  );
  props.onFilter?.(cleanFilters);
  emit('filter', cleanFilters);
}

function handleAction(action: AdminTableAction, row: Record<string, unknown>) {
  props.onAction?.(action, row);
  emit('action', action, row);
}

function selectRow(row: Record<string, unknown>) {
  emit('rowClick', row);
}

function formatCell(value: unknown, column: AdminColumn): string {
  if (value === null || value === undefined) return '-';
  if (column.format === 'date' && typeof value === 'string') {
    return new Date(value).toLocaleString('tr-TR');
  }
  if (column.format === 'money' && (typeof value === 'number' || typeof value === 'string')) {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
      maximumFractionDigits: 0,
    }).format(Number(value));
  }
  if (column.format === 'id' && typeof value === 'string') {
    return compactId(value);
  }
  if (typeof value === 'string' && looksLikeId(value)) {
    return compactId(value);
  }
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function cellTitle(value: unknown, column: AdminColumn): string {
  if (typeof value !== 'string') return '';
  if (column.format === 'id' || looksLikeId(value)) return value;
  return '';
}

function looksLikeId(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function compactId(value: string): string {
  if (!looksLikeId(value)) return value;
  return `${value.slice(0, 8)}...${value.slice(-4)}`;
}

function statusClass(value: unknown): string {
  const status = String(value ?? '').toLowerCase();
  if (status.includes('reject') || status.includes('fail') || status.includes('cancel')) return 'danger';
  if (status.includes('pending') || status.includes('review')) return 'warning';
  return '';
}
</script>
