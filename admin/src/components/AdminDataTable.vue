<template>
  <section class="panel">
    <div class="panel-header">
      <AdminFilterBar :filters="filters" @filter="emitFilter" />
      <slot name="toolbar" />
    </div>

    <div class="table-wrap">
      <table class="admin-table">
        <thead>
          <tr>
            <th v-for="column in columns" :key="column.key" :style="{ width: column.width }">
              {{ column.label }}
            </th>
            <th v-if="actions.length > 0" class="actions-header">İşlemler</th>
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
              <slot :name="'cell-' + column.key" :row="row" :column="column" :value="row[column.key]">
                <StatusBadge v-if="column.format === 'status'" :value="row[column.key]" />
                <div v-else-if="column.format === 'tree'" class="tree-cell">
                  <!-- Visual hierarchical guide lines -->
                  <span
                    v-for="depth in Number(row.__treeDepth ?? 0)"
                    :key="depth"
                    class="tree-indent-spacer"
                  />

                  <!-- Toggle button for folders or spacer for leaf items -->
                  <button
                    v-if="toBoolean(row.__treeHasChildren)"
                    class="tree-toggle"
                    type="button"
                    :aria-label="toBoolean(row.__treeCollapsed) ? 'Genişlet' : 'Daralt'"
                    @click.stop="toggleTree(row)"
                  >
                    <i
                      :class="toBoolean(row.__treeCollapsed) ? 'pi pi-chevron-right' : 'pi pi-chevron-down'"
                      aria-hidden="true"
                    />
                  </button>
                  <span v-else class="tree-leaf-icon" aria-hidden="true">
                    <span v-if="Number(row.__treeDepth ?? 0) > 0" class="tree-leaf-connector" />
                  </span>

                  <!-- Category Icon (Folder/File) for premium design -->
                  <span class="tree-icon" aria-hidden="true">
                    <i
                      :class="[
                        toBoolean(row.__treeHasChildren)
                          ? toBoolean(row.__treeCollapsed)
                            ? 'pi pi-folder'
                            : 'pi pi-folder-open'
                          : 'pi pi-tag'
                      ]"
                    />
                  </span>

                  <span class="tree-label">
                    {{ formatCell(row[column.key], column) }}
                  </span>
                </div>
                <button
                  v-else-if="column.route"
                  class="table-cell-link"
                  type="button"
                  @click.stop="goToRoute(column, row)"
                >
                  {{ formatCell(row[column.key], column) }}
                </button>
                <span
                  v-else
                  :title="cellTitle(row[column.key], column)"
                  :class="{
                    'status-active': (column.key === 'isActive' || typeof row[column.key] === 'boolean') && toBoolean(row[column.key]),
                    'status-passive': (column.key === 'isActive' || typeof row[column.key] === 'boolean') && !toBoolean(row[column.key])
                  }"
                >
                  {{ formatCell(row[column.key], column) }}
                </span>
              </slot>
            </td>
            <td v-if="actions.length > 0" @click.stop class="actions-cell">
              <div class="toolbar">
                <button
                  v-for="action in visibleActions(row)"
                  :key="action.key"
                  class="button"
                  :class="[action.tone, { 'icon-only': action.iconOnly }]"
                  type="button"
                  :title="action.label"
                  :aria-label="action.label"
                  @click="handleAction(action, row)"
                >
                  <i :class="action.icon ?? 'pi pi-play'" aria-hidden="true" />
                  <span v-if="!action.iconOnly" class="table-action-label">{{ action.label }}</span>
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
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import AdminFilterBar from './AdminFilterBar.vue';
import StatusBadge from './StatusBadge.vue';

export interface AdminColumn {
  key: string;
  label: string;
  width?: string;
  format?: 'date' | 'money' | 'status' | 'text' | 'id' | 'tree';
  route?: (row: Record<string, unknown>) => string;
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
  iconOnly?: boolean;
  when?: (row: Record<string, unknown>) => boolean;
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
  (event: 'treeToggle', row: Record<string, unknown>): void;
}>();
const router = useRouter();

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

function emitFilter(filters: Record<string, string>) {
  props.onFilter?.(filters);
  emit('filter', filters);
}

function handleAction(action: AdminTableAction, row: Record<string, unknown>) {
  props.onAction?.(action, row);
  emit('action', action, row);
}

function visibleActions(row: Record<string, unknown>): AdminTableAction[] {
  return props.actions.filter((action) => {
    if (!action.when) return true;
    return action.when(row);
  });
}

async function goToRoute(column: AdminColumn, row: Record<string, unknown>) {
  if (!column.route) return;
  const target = column.route(row);
  if (!target) return;
  await router.push(target);
}

function selectRow(row: Record<string, unknown>) {
  emit('rowClick', row);
}

function toggleTree(row: Record<string, unknown>) {
  emit('treeToggle', row);
}

function formatCell(value: unknown, column: AdminColumn): string {
  if (value === null || value === undefined) return '-';
  if (column.key === 'isActive' || typeof value === 'boolean') {
    return toBoolean(value) ? 'Aktif' : 'Kapalı';
  }
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

function toBoolean(value: unknown): boolean {
  return value === true || value === 'true';
}

</script>

<style scoped>
.tree-cell {
  display: inline-flex;
  align-items: center;
  min-height: 32px;
  font-family: inherit;
}

.tree-indent-spacer {
  display: inline-block;
  width: 24px;
  height: 32px;
  position: relative;
  flex-shrink: 0;
}

.tree-indent-spacer::after {
  content: '';
  position: absolute;
  left: 11px; /* Center-aligned with 24px toggle */
  top: 0;
  bottom: 0;
  width: 1px;
  background-color: var(--border-soft);
}

.tree-toggle {
  width: 24px;
  height: 24px;
  border: 1px solid var(--border-soft);
  border-radius: 6px;
  background: var(--bg-panel);
  color: var(--text-strong);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-right: 8px;
  flex-shrink: 0;
  z-index: 2;
  transition: all 0.2s ease;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.tree-toggle:hover {
  background: var(--bg-soft);
  border-color: var(--border-strong);
  color: var(--brand-500);
  transform: scale(1.05);
}

.tree-leaf-icon {
  width: 24px;
  height: 32px;
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-right: 8px;
}

.tree-leaf-connector {
  position: absolute;
  left: 11px;
  top: 0;
  width: 13px;
  height: 16px; /* half of 32px */
  border-left: 1px solid var(--border-soft);
  border-bottom: 1px solid var(--border-soft);
}

.tree-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-right: 8px;
  font-size: 15px;
  flex-shrink: 0;
}

.tree-icon .pi-folder,
.tree-icon .pi-folder-open {
  color: #df9a28; /* Beautiful golden folder color */
}

.tree-icon .pi-tag {
  color: var(--brand-500); /* Premium blue tag color */
  font-size: 13px;
}

.tree-label {
  font-weight: 600;
  color: var(--text-strong);
  font-size: 13.5px;
  transition: color 0.15s ease;
}

/* Row hover effect for tree labels */
.admin-table tbody tr {
  cursor: pointer;
}

.admin-table tbody tr:hover .tree-label {
  color: var(--brand-600);
}

.status-active {
  color: #10b981; /* Emerald green */
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.status-active::before {
  content: '';
  display: inline-block;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background-color: #10b981;
  box-shadow: 0 0 8px rgba(16, 185, 129, 0.6);
}

.status-passive {
  color: var(--text-muted);
  opacity: 0.55;
  font-weight: 500;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.status-passive::before {
  content: '';
  display: inline-block;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background-color: var(--text-muted);
}

/* Table Action Toolbar Hover Effect */
.admin-table tbody td .toolbar {
  opacity: 0;
  transition: opacity 0.2s cubic-bezier(0.16, 1, 0.3, 1), transform 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  transform: translateX(4px);
  justify-content: flex-end; /* Align buttons to the right */
}

.admin-table tbody tr:hover td .toolbar {
  opacity: 1;
  transform: translateX(0);
}

/* Compact Table Action Buttons */
.admin-table tbody td .button {
  min-height: 26px !important;
  padding: 3px 8px !important;
  font-size: 11px !important;
  font-weight: 700 !important;
  border-radius: 6px !important;
  gap: 4px !important;
}

.admin-table tbody td .button i {
  font-size: 10px !important;
}

/* Narrow Actions Column Header & Cell */
.actions-header,
.actions-cell {
  width: 90px !important;
  max-width: 90px !important;
  text-align: right !important;
  padding-right: 14px !important;
}
</style>
