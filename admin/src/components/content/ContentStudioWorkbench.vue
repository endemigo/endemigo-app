<template>
  <section class="content-studio-workbench">
    <div v-if="loading" class="panel loading-panel">İçerik stüdyosu yükleniyor...</div>
    <p v-else-if="error" class="error-text">{{ error }}</p>
    <div v-else class="studio-grid">
      <aside class="panel studio-sidebar">
        <div class="panel-header">
          <strong>Koleksiyonlar</strong>
          <button class="button" type="button" @click="addItem">Yeni kayıt</button>
        </div>
        <div class="panel-body">
          <div v-if="availableCollections.length > 1" class="collection-tabs">
            <button
              v-for="collection in availableCollections"
              :key="collection.key"
              class="button ghost"
              :class="{ active: selectedCollection === collection.key }"
              type="button"
              @click="selectCollection(collection.key)"
            >
              {{ collection.label }}
            </button>
          </div>

          <div class="collection-list">
            <button
              v-for="item in selectedItems"
              :key="item.id"
              class="collection-item"
              :class="{ active: selectedItem?.id === item.id }"
              type="button"
              @click="selectItem(item.id)"
            >
              <div>
                <strong>{{ item.title || 'Başlıksız kayıt' }}</strong>
                <small>{{ item.status }} · {{ item.category || 'Kategori yok' }}</small>
              </div>
              <span>#{{ item.order }}</span>
            </button>
            <p v-if="selectedItems.length === 0" class="muted">Bu koleksiyonda henüz kayıt yok.</p>
          </div>
        </div>
      </aside>

      <section class="panel studio-editor">
        <div class="panel-header">
          <strong>{{ selectedCollectionDefinition.label }}</strong>
          <button
            v-if="selectedItem"
            class="button danger"
            type="button"
            @click="removeItem(selectedItem.id)"
          >
            Sil
          </button>
        </div>
        <div v-if="selectedItem" class="panel-body editor-grid">
          <label class="field">
            <span>Başlık</span>
            <input v-model.trim="selectedItem.title" class="input" />
          </label>
          <label class="field">
            <span>Alt başlık</span>
            <input v-model.trim="selectedItem.subtitle" class="input" />
          </label>
          <label class="field">
            <span>Kategori</span>
            <input v-model.trim="selectedItem.category" class="input" />
          </label>
          <label class="field">
            <span>Slug</span>
            <input v-model.trim="selectedItem.slug" class="input" />
          </label>
          <label class="field">
            <span>Görsel URL</span>
            <input v-model.trim="selectedItem.imageUrl" class="input" />
          </label>
          <label class="field">
            <span>Route</span>
            <input v-model.trim="selectedItem.route" class="input" />
          </label>
          <label class="field">
            <span>Sıra</span>
            <input v-model.number="selectedItem.order" class="input" type="number" min="1" />
          </label>
          <label class="field">
            <span>Durum</span>
            <select v-model="selectedItem.status" class="input">
              <option value="DRAFT">Taslak</option>
              <option value="PUBLISHED">Yayında</option>
              <option value="ARCHIVED">Arşiv</option>
            </select>
          </label>
          <label class="field field-full">
            <span>Özet</span>
            <textarea v-model="selectedItem.excerpt" class="textarea" rows="3" />
          </label>
          <label class="field field-full">
            <span>Metin</span>
            <textarea v-model="selectedItem.body" class="textarea" rows="8" />
          </label>
          <label class="field field-full">
            <span>Etiketler (virgülle)</span>
            <input
              :value="selectedItem.tags.join(', ')"
              class="input"
              @input="handleTagsInput"
            />
          </label>
          <label class="field field-full">
            <span>Metadata (JSON)</span>
            <textarea
              :value="selectedItemMetadataJson"
              class="textarea code"
              rows="6"
              @input="handleMetadataInput"
            />
          </label>
          <p v-if="metadataError" class="error-text">{{ metadataError }}</p>
        </div>
        <div v-else class="panel-body">
          <p class="muted">Soldan bir kayıt seç veya yeni kayıt ekle.</p>
        </div>
      </section>
    </div>

    <section v-if="!loading" class="panel studio-footer">
      <div class="panel-header">
        <strong>Kaydet</strong>
      </div>
      <div class="panel-body footer-grid">
        <label class="field field-full">
          <span>Gerekçe</span>
          <textarea v-model.trim="reason" class="textarea" rows="3" placeholder="Bu değişiklik neden yapılıyor?" />
        </label>
        <div class="footer-actions">
          <button class="button" type="button" @click="loadDocument">Yenile</button>
          <button class="button primary" type="button" :disabled="saving || !canSave" @click="saveDocument">
            {{ saving ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet' }}
          </button>
        </div>
      </div>
    </section>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { adminApi, toApiMessage } from '../../services/api';

type CollectionKey =
  | 'contents'
  | 'news'
  | 'blogs'
  | 'faq'
  | 'discover'
  | 'menuManagement'
  | 'banners'
  | 'popups'
  | 'polls'
  | 'newsletters'
  | 'supportInbox'
  | 'contactInbox'
  | 'adminMessageCenter'
  | 'financeConfigs';

type ItemStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

interface ContentStudioItem {
  id: string;
  title: string;
  subtitle: string;
  body: string;
  excerpt: string;
  slug: string;
  imageUrl: string;
  status: ItemStatus;
  order: number;
  category: string;
  tags: string[];
  route: string;
  updatedAt: string;
  metadata: Record<string, unknown>;
}

interface ContentStudioDocument {
  version: number;
  collections: Record<CollectionKey, ContentStudioItem[]>;
}

interface CollectionDefinition {
  key: CollectionKey;
  label: string;
}

interface ContentStudioResponse {
  document: ContentStudioDocument;
}

const props = withDefaults(
  defineProps<{
    featuredCollection?: CollectionKey | null;
  }>(),
  {
    featuredCollection: null,
  },
);

const collectionDefinitions: CollectionDefinition[] = [
  { key: 'contents', label: 'İçerikler' },
  { key: 'news', label: 'Haberler' },
  { key: 'blogs', label: 'Bloglar' },
  { key: 'faq', label: 'SSS' },
  { key: 'discover', label: 'Keşif' },
  { key: 'menuManagement', label: 'Menü Yönetimi' },
  { key: 'banners', label: 'Bannerlar' },
  { key: 'popups', label: 'Popuplar' },
  { key: 'polls', label: 'Anketler' },
  { key: 'newsletters', label: 'Bültenler' },
  { key: 'supportInbox', label: 'Destek Inbox' },
  { key: 'contactInbox', label: 'İletişim Inbox' },
  { key: 'adminMessageCenter', label: 'Mesaj Merkezi' },
  { key: 'financeConfigs', label: 'Finans Config' },
];

const loading = ref(false);
const saving = ref(false);
const error = ref<string | null>(null);
const reason = ref('');
const metadataError = ref<string | null>(null);
const documentRef = ref<ContentStudioDocument | null>(null);
const selectedCollection = ref<CollectionKey>(
  props.featuredCollection ?? 'blogs',
);
const selectedItemId = ref<string | null>(null);

const availableCollections = computed(() =>
  props.featuredCollection
    ? collectionDefinitions.filter(
        (collection) => collection.key === props.featuredCollection,
      )
    : collectionDefinitions,
);

const selectedCollectionDefinition = computed(
  () =>
    availableCollections.value.find(
      (collection) => collection.key === selectedCollection.value,
    ) ?? availableCollections.value[0],
);

const selectedItems = computed(
  () => documentRef.value?.collections[selectedCollection.value] ?? [],
);

const selectedItem = computed(() =>
  selectedItems.value.find((item) => item.id === selectedItemId.value) ?? null,
);

const selectedItemMetadataJson = computed(() =>
  JSON.stringify(selectedItem.value?.metadata ?? {}, null, 2),
);

const canSave = computed(
  () => reason.value.trim().length > 2 && !metadataError.value && Boolean(documentRef.value),
);

function selectCollection(collection: CollectionKey) {
  selectedCollection.value = collection;
  selectedItemId.value = documentRef.value?.collections[collection][0]?.id ?? null;
}

function selectItem(itemId: string) {
  selectedItemId.value = itemId;
}

function addItem() {
  if (!documentRef.value) return;

  const timestamp = Date.now();
  const collection = documentRef.value.collections[selectedCollection.value];
  const nextItem: ContentStudioItem = {
    id: `${selectedCollection.value}-${timestamp}`,
    title: 'Yeni kayıt',
    subtitle: '',
    body: '',
    excerpt: '',
    slug: `${selectedCollection.value}-${timestamp}`,
    imageUrl: '',
    status: 'DRAFT',
    order: collection.length + 1,
    category: '',
    tags: [],
    route: '',
    updatedAt: new Date().toISOString(),
    metadata: {},
  };
  collection.unshift(nextItem);
  selectedItemId.value = nextItem.id;
}

function removeItem(itemId: string) {
  if (!documentRef.value) return;
  const collection = documentRef.value.collections[selectedCollection.value];
  documentRef.value.collections[selectedCollection.value] = collection.filter(
    (item) => item.id !== itemId,
  );
  selectedItemId.value =
    documentRef.value.collections[selectedCollection.value][0]?.id ?? null;
}

function updateTags(rawValue: string) {
  if (!selectedItem.value) return;
  selectedItem.value.tags = rawValue
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function updateMetadata(rawValue: string) {
  if (!selectedItem.value) return;
  try {
    const parsed = JSON.parse(rawValue) as Record<string, unknown>;
    selectedItem.value.metadata = parsed;
    metadataError.value = null;
  } catch {
    metadataError.value = 'Metadata JSON geçerli değil.';
  }
}

function handleTagsInput(event: Event) {
  updateTags((event.target as HTMLInputElement).value);
}

function handleMetadataInput(event: Event) {
  updateMetadata((event.target as HTMLTextAreaElement).value);
}

async function loadDocument() {
  loading.value = true;
  error.value = null;
  try {
    const response = await adminApi.get<ContentStudioResponse>(
      '/admin/content-studio',
    );
    documentRef.value = structuredClone(response.data.document);
    const firstCollection =
      props.featuredCollection ?? availableCollections.value[0]?.key ?? 'blogs';
    selectedCollection.value = firstCollection;
    selectedItemId.value =
      documentRef.value.collections[firstCollection][0]?.id ?? null;
  } catch (loadError) {
    error.value = toApiMessage(loadError);
  } finally {
    loading.value = false;
  }
}

async function saveDocument() {
  if (!documentRef.value || !canSave.value) return;
  saving.value = true;
  error.value = null;
  try {
    await adminApi.patch('/admin/content-studio', {
      document: documentRef.value,
      version: documentRef.value.version,
      reason: reason.value,
    });
    reason.value = '';
    await loadDocument();
  } catch (saveError) {
    error.value = toApiMessage(saveError);
  } finally {
    saving.value = false;
  }
}

onMounted(loadDocument);
</script>

<style scoped>
.content-studio-workbench {
  display: grid;
  gap: 1rem;
}

.studio-grid {
  display: grid;
  gap: 1rem;
  grid-template-columns: minmax(18rem, 24rem) minmax(0, 1fr);
}

.studio-sidebar,
.studio-editor,
.studio-footer,
.loading-panel {
  min-height: 100%;
}

.collection-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.collection-list {
  display: grid;
  gap: 0.75rem;
}

.collection-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  border: 1px solid var(--border-color, #d6dee8);
  border-radius: 1rem;
  background: #fff;
  padding: 0.9rem 1rem;
  text-align: left;
  cursor: pointer;
}

.collection-item.active {
  border-color: var(--primary-color, #2563eb);
  box-shadow: 0 0 0 1px rgba(37, 99, 235, 0.08);
}

.collection-item small {
  display: block;
  margin-top: 0.25rem;
  color: var(--muted-color, #64748b);
}

.editor-grid {
  display: grid;
  gap: 1rem;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.field-full {
  grid-column: 1 / -1;
}

.footer-grid {
  display: grid;
  gap: 1rem;
}

.footer-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
}

.code {
  font-family: ui-monospace, SFMono-Regular, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
}

@media (max-width: 1080px) {
  .studio-grid {
    grid-template-columns: 1fr;
  }

  .editor-grid {
    grid-template-columns: 1fr;
  }
}
</style>
