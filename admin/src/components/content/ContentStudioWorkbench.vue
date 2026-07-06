<template>
  <section class="content-studio-workbench">
    <div v-if="loading" class="panel loading-panel">
      <i class="pi pi-spin pi-spinner spinner-icon" />
      <span>İçerik stüdyosu yükleniyor...</span>
    </div>
    <p v-else-if="error" class="error-text">{{ error }}</p>
    <div v-else class="studio-grid-three-col">
      
      <!-- Column 1: Collections Selector -->
      <aside class="panel collections-panel">
        <div class="panel-header-simple">
          <span>Koleksiyonlar</span>
        </div>
        <div class="collections-list-vertical">
          <button
            v-for="collection in availableCollections"
            :key="collection.key"
            class="collection-tab-vertical"
            :class="{ active: selectedCollection === collection.key }"
            type="button"
            @click="selectCollection(collection.key)"
          >
            <i :class="collection.icon" class="tab-icon" />
            <span class="tab-label">{{ collection.label }}</span>
          </button>
        </div>
      </aside>

      <!-- Column 2: Items List -->
      <aside class="panel items-panel">
        <div class="panel-header-actions">
          <div class="header-title">
            <strong>{{ selectedCollectionDefinition.label }}</strong>
            <span class="count-badge">{{ filteredItems.length }} Kayıt</span>
          </div>
          <button class="button primary add-new-btn" type="button" @click="addItem">
            <i class="pi pi-plus" /> Yeni Kayıt
          </button>
        </div>
        
        <div class="search-bar-container">
          <i class="pi pi-search search-icon" />
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Koleksiyonda ara..."
            class="search-input"
          />
        </div>

        <div class="items-scroll-list">
          <button
            v-for="item in filteredItems"
            :key="item.id"
            class="item-card-vertical"
            :class="{ active: selectedItemId === item.id }"
            type="button"
            @click="selectItem(item.id)"
          >
            <div class="item-card-body">
              <strong class="item-title">{{ item.title || 'Başlıksız kayıt' }}</strong>
              <div class="item-meta-row">
                <span class="status-badge" :class="item.status.toLowerCase()">
                  {{ item.status === 'PUBLISHED' ? 'Yayında' : item.status === 'DRAFT' ? 'Taslak' : 'Arşiv' }}
                </span>
              </div>
            </div>
            <span class="order-badge">#{{ item.order }}</span>
          </button>
          <p v-if="filteredItems.length === 0" class="muted-empty">Bu koleksiyonda kayıt bulunamadı.</p>
        </div>
      </aside>

      <!-- Editor Modal -->
      <div v-if="isEditing && selectedItem" class="editor-modal-backdrop" @click.self="isEditing = false">
        <section class="panel editor-modal-card">
          <div class="panel-header-editor">
            <div class="editor-header-title">
              <i :class="selectedCollectionDefinition.icon" class="title-icon" />
              <strong>{{ selectedItem ? selectedItem.title || 'Yeni Kayıt Düzenleme' : 'Kayıt Seçin' }}</strong>
            </div>
            <div class="editor-header-actions">
              <button
                v-if="selectedItem"
                class="button danger delete-btn-editor"
                type="button"
                @click="removeItem(selectedItem.id)"
              >
                <i class="pi pi-trash" /> Sil
              </button>
              <button class="button secondary close-btn-editor" type="button" @click="isEditing = false">
                <i class="pi pi-times" /> Kapat
              </button>
            </div>
          </div>

          <div class="editor-content-scroll">
            
            <!-- Language Tabs -->
            <div class="field lang-selector-field">
              <span>İçerik Dili</span>
              <div class="content-lang-tabs">
                <button
                  type="button"
                  class="content-lang-tab"
                  :class="{ active: contentLanguage === 'tr' }"
                  @click="contentLanguage = 'tr'"
                >
                  Türkçe
                </button>
                <button
                  type="button"
                  class="content-lang-tab"
                  :class="{ active: contentLanguage === 'en' }"
                  @click="contentLanguage = 'en'"
                >
                  İngilizce
                </button>
              </div>
            </div>

            <div class="editor-row-grid">
              <!-- Section 1: Genel Bilgiler -->
              <div class="editor-section-card">
                <div class="section-card-title">Genel Bilgiler</div>
                <div class="editor-fields-grid">
                  <label v-if="contentLanguage === 'tr'" class="field field-full">
                    <span>Başlık (TR)</span>
                    <input v-model.trim="selectedItem.title" class="input" placeholder="İçerik başlığı (Türkçe)" />
                  </label>
                  <label v-else class="field field-full">
                    <span>Başlık (EN)</span>
                    <input v-model.trim="selectedItem.titleEn" class="input" placeholder="İçerik başlığı (İngilizce)" />
                  </label>
                  <label class="field field-full">
                    <span>Slug (Benzersiz Kimlik)</span>
                    <input v-model.trim="selectedItem.slug" class="input" placeholder="Örn: yeni-duyuru" />
                  </label>
                </div>
              </div>

              <!-- Section 2: Görsel & Yönlendirme -->
              <div class="editor-section-card">
                <div class="section-card-title">Görsel & Yönlendirme</div>
                <div class="editor-fields-grid">
                  <div class="field field-full">
                    <span>Görsel</span>
                    <div v-if="selectedItem.imageUrl" class="image-preview-container">
                      <img :src="selectedItem.imageUrl" alt="Görsel önizleme" class="image-preview" />
                      <button class="button danger image-remove-btn" type="button" @click="removeImage">
                        <i class="pi pi-trash" /> Görseli Kaldır
                      </button>
                    </div>
                    <div v-else class="image-upload-dropzone" @click="triggerFileInput">
                      <i class="pi pi-upload" />
                      <span>{{ uploading ? 'Yükleniyor...' : 'Görsel seçmek için tıklayın' }}</span>
                      <small v-if="uploadError" class="image-upload-error">{{ uploadError }}</small>
                    </div>
                    <input
                      ref="fileInput"
                      type="file"
                      accept="image/*"
                      class="hidden-file-input"
                      @change="handleFileChange"
                    />
                  </div>
                </div>
              </div>
            </div>

            <!-- Section 3: İçerik Detayları -->
            <div class="editor-section-card">
              <div class="section-card-title">İçerik Detayları</div>
              <div class="editor-fields-grid">
                <label v-if="contentLanguage === 'tr'" class="field field-full">
                  <span>Özet / Giriş Metni (TR)</span>
                  <textarea v-model="selectedItem.excerpt" class="textarea" rows="2" placeholder="Listelerde görünecek kısa Türkçe açıklama..." />
                </label>
                <label v-else class="field field-full">
                  <span>Özet / Giriş Metni (EN)</span>
                  <textarea v-model="selectedItem.excerptEn" class="textarea" rows="2" placeholder="Listelerde görünecek kısa İngilizce açıklama..." />
                </label>
                <div v-if="contentLanguage === 'tr'" class="field field-full">
                  <span>Ana İçerik Metni (TR)</span>
                  <WysiwygEditor v-model="selectedItem.body" />
                </div>
                <div v-else class="field field-full">
                  <span>Ana İçerik Metni (EN)</span>
                  <WysiwygEditor v-model="selectedItem.bodyEn" />
                </div>
              </div>
            </div>

            <!-- Section 4: Ayarlar & Gelişmiş -->
            <div class="editor-section-card">
              <div class="section-card-title">Ayarlar & Gelişmiş</div>
              <div class="editor-fields-grid">
                <label class="field">
                  <span>Görüntüleme Sırası</span>
                  <input v-model.number="selectedItem.order" class="input" type="number" min="1" />
                </label>
                <label class="field">
                  <span>Yayın Durumu</span>
                  <select v-model="selectedItem.status" class="input select-input">
                    <option value="DRAFT">Taslak (DRAFT)</option>
                    <option value="PUBLISHED">Yayında (PUBLISHED)</option>
                    <option value="ARCHIVED">Arşivlendi (ARCHIVED)</option>
                  </select>
                </label>
                <label class="field field-full">
                  <span>Etiketler (Virgülle ayırın)</span>
                  <input
                    :value="selectedItem.tags.join(', ')"
                    class="input"
                    placeholder="kampanya, haber, yeni"
                    @input="handleTagsInput"
                  />
                </label>
                <label v-if="selectedCollection === 'blogs'" class="field field-full">
                  <span>Okuma Süresi (Örn: 4 dk okuma)</span>
                  <input
                    v-if="contentLanguage === 'tr'"
                    v-model="selectedItem.readTime"
                    type="text"
                    class="input"
                    placeholder="4 dk okuma"
                  />
                  <input
                    v-else
                    v-model="selectedItem.readTimeEn"
                    type="text"
                    class="input"
                    placeholder="4 min read"
                  />
                </label>
              </div>
            </div>

          </div>
        </section>
      </div>

    </div>

    <!-- Global Save Bar -->
    <section v-if="!loading && documentRef" class="panel workbench-save-footer">
      <div class="save-footer-content">
        <div class="reason-input-wrapper">
          <i class="pi pi-comment comment-icon" />
          <input
            v-model.trim="reason"
            type="text"
            class="reason-input"
            placeholder="Not ekle (opsiyonel)"
          />
        </div>
        <div class="save-actions">
          <button class="button secondary btn-reset" type="button" @click="loadDocument">
            <i class="pi pi-refresh" /> Geri Yükle
          </button>
          <button class="button primary btn-save" type="button" :disabled="saving || !canSave" @click="saveDocument">
            <i v-if="saving" class="pi pi-spin pi-spinner" />
            <i v-else class="pi pi-save" />
            <span>{{ saving ? 'Kaydediliyor...' : 'Değişiklikleri Canlıya Al' }}</span>
          </button>
        </div>
      </div>
    </section>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { adminApi, toApiMessage } from '../../services/api';
import WysiwygEditor from './WysiwygEditor.vue';

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
  | 'newsletters';

type ItemStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

interface ContentStudioItem {
  id: string;
  title: string;
  titleEn: string;
  body: string;
  bodyEn: string;
  excerpt: string;
  excerptEn: string;
  slug: string;
  imageUrl: string;
  status: ItemStatus;
  order: number;
  tags: string[];
  updatedAt: string;
  readTime: string;
  readTimeEn: string;
}

interface ContentStudioDocument {
  version: number;
  collections: Record<CollectionKey, ContentStudioItem[]>;
}

interface CollectionDefinition {
  key: CollectionKey;
  label: string;
  icon: string;
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
  { key: 'contents', label: 'İçerikler', icon: 'pi pi-file' },
  { key: 'news', label: 'Haberler / Duyuru', icon: 'pi pi-bell' },
  { key: 'blogs', label: 'Bloglar', icon: 'pi pi-book' },
  { key: 'faq', label: 'SSS', icon: 'pi pi-question-circle' },
  { key: 'newsletters', label: 'Bültenler', icon: 'pi pi-envelope' },
];

const loading = ref(false);
const saving = ref(false);
const error = ref<string | null>(null);
const reason = ref('');
const searchQuery = ref('');
const documentRef = ref<ContentStudioDocument | null>(null);
const selectedCollection = ref<CollectionKey>(
  props.featuredCollection ?? 'blogs',
);
const contentLanguage = ref<'tr' | 'en'>('tr');
const selectedItemId = ref<string | null>(null);
const fileInput = ref<HTMLInputElement | null>(null);
const uploading = ref(false);
const uploadError = ref<string | null>(null);
const isEditing = ref(false);

function triggerFileInput() {
  fileInput.value?.click();
}

async function handleFileChange(event: Event) {
  const target = event.target as HTMLInputElement;
  const files = target.files;
  if (!files || files.length === 0) return;

  const file = files[0];
  const formData = new FormData();
  formData.append('file', file);

  uploading.value = true;
  uploadError.value = null;

  try {
    const response = await adminApi.post<{ url: string }>(
      '/admin/uploads/images?kind=content',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    if (selectedItem.value) {
      selectedItem.value.imageUrl = response.data.url;
    }
  } catch (err: any) {
    console.error(err);
    uploadError.value = toApiMessage(err) || 'Görsel yüklenemedi. Lütfen tekrar deneyin.';
  } finally {
    uploading.value = false;
    if (fileInput.value) {
      fileInput.value.value = '';
    }
  }
}

function removeImage() {
  if (selectedItem.value) {
    selectedItem.value.imageUrl = '';
  }
}



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

const filteredItems = computed(() => {
  const query = searchQuery.value.trim().toLowerCase();
  const items = selectedItems.value;
  if (!query) return items;
  return items.filter(
    (item) =>
      (item.title && item.title.toLowerCase().includes(query)) ||
      (item.id && item.id.toLowerCase().includes(query))
  );
});

const selectedItem = computed(() =>
  selectedItems.value.find((item) => item.id === selectedItemId.value) ?? null,
);

const canSave = computed(() => Boolean(documentRef.value));

// Reset search query when collection changes
watch(selectedCollection, () => {
  searchQuery.value = '';
});

function selectCollection(collection: CollectionKey) {
  selectedCollection.value = collection;
  selectedItemId.value = documentRef.value?.collections[collection][0]?.id ?? null;
  isEditing.value = false;
}

function selectItem(itemId: string) {
  selectedItemId.value = itemId;
  isEditing.value = true;
}

function addItem() {
  if (!documentRef.value) return;

  const timestamp = Date.now();
  const collection = documentRef.value.collections[selectedCollection.value];
  const nextItem: ContentStudioItem = {
    id: `${selectedCollection.value}-${timestamp}`,
    title: 'Yeni kayıt',
    titleEn: '',
    body: '',
    bodyEn: '',
    excerpt: '',
    excerptEn: '',
    slug: `${selectedCollection.value}-${timestamp}`,
    imageUrl: '',
    status: 'DRAFT',
    order: collection.length + 1,
    tags: [],
    updatedAt: new Date().toISOString(),
    readTime: '',
    readTimeEn: '',
  };
  collection.unshift(nextItem);
  selectedItemId.value = nextItem.id;
  isEditing.value = true;
}

function removeItem(itemId: string) {
  if (!documentRef.value) return;
  const confirmation = confirm('Bu kaydı silmek istediğinizden emin misiniz?');
  if (!confirmation) return;
  
  const collection = documentRef.value.collections[selectedCollection.value];
  documentRef.value.collections[selectedCollection.value] = collection.filter(
    (item) => item.id !== itemId,
  );
  selectedItemId.value =
    documentRef.value.collections[selectedCollection.value][0]?.id ?? null;
  isEditing.value = false;
}

function updateTags(rawValue: string) {
  if (!selectedItem.value) return;
  selectedItem.value.tags = rawValue
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function handleTagsInput(event: Event) {
  updateTags((event.target as HTMLInputElement).value);
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
  gap: 1.25rem;
  max-width: 100%;
}

.loading-panel {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  padding: 5rem 2rem;
  background: rgba(255, 255, 255, 0.7);
  border-radius: 16px;
  border: 1px dashed #cbd5e1;
  color: #64748b;
  font-size: 1.1rem;
}

.spinner-icon {
  font-size: 2rem;
  color: #0284c7;
}

.studio-grid-three-col {
  display: grid;
  gap: 1.25rem;
  grid-template-columns: 210px 1fr;
  align-items: start;
}

.panel {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.03), 0 2px 4px -2px rgba(0, 0, 0, 0.03);
  overflow: hidden;
}

/* Column 1: Collections Vertical Menu */
.collections-panel {
  padding: 0.75rem;
}

.panel-header-simple {
  padding: 0.5rem 0.75rem 0.75rem;
  font-weight: 700;
  font-size: 0.9rem;
  color: #475569;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  border-bottom: 1px solid #f1f5f9;
  margin-bottom: 0.5rem;
}

.collections-list-vertical {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.collection-tab-vertical {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  width: 100%;
  padding: 0.75rem 0.85rem;
  border: none;
  border-radius: 10px;
  background: transparent;
  color: #64748b;
  font-weight: 500;
  font-size: 0.95rem;
  text-align: left;
  cursor: pointer;
  transition: all 0.2s ease;
}

.collection-tab-vertical:hover {
  background: #f8fafc;
  color: #0f172a;
}

.collection-tab-vertical.active {
  background: #f0f9ff;
  color: #0284c7;
  font-weight: 600;
}

.tab-icon {
  font-size: 1.1rem;
}

/* Column 2: Items List */
.items-panel {
  display: flex;
  flex-direction: column;
  max-height: 750px;
  min-height: 600px;
}

.panel-header-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid #f1f5f9;
}

.header-title {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.header-title strong {
  font-size: 1.05rem;
  color: #0f172a;
}

.count-badge {
  font-size: 0.75rem;
  color: #64748b;
  font-weight: 500;
}

.add-new-btn {
  padding: 0.5rem 0.85rem;
  font-size: 0.85rem;
  border-radius: 8px;
  font-weight: 600;
}

.search-bar-container {
  position: relative;
  margin: 0.75rem 1.25rem;
}

.search-icon {
  position: absolute;
  left: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  color: #94a3b8;
  font-size: 0.9rem;
}

.search-input {
  width: 100%;
  padding: 0.5rem 0.75rem 0.5rem 2.2rem;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  font-size: 0.875rem;
  outline: none;
  transition: all 0.2s ease;
}

.search-input:focus {
  border-color: #0284c7;
  box-shadow: 0 0 0 3px rgba(2, 132, 199, 0.15);
}

.items-scroll-list {
  flex: 1;
  overflow-y: auto;
  padding: 0 1.25rem 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.item-card-vertical {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  width: 100%;
  padding: 0.85rem 1rem;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  background: #f8fafc;
  text-align: left;
  cursor: pointer;
  transition: all 0.2s ease;
}

.item-card-vertical:hover {
  background: #f1f5f9;
  border-color: #cbd5e1;
}

.item-card-vertical.active {
  border-color: #0284c7;
  background: #ffffff;
  box-shadow: 0 4px 12px -2px rgba(2, 132, 199, 0.1);
}

.item-card-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  padding-right: 0.5rem;
}

.item-title {
  font-size: 0.9rem;
  color: #1e293b;
  line-height: 1.35;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.item-meta-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.status-badge {
  font-size: 0.7rem;
  font-weight: 700;
  padding: 0.15rem 0.4rem;
  border-radius: 6px;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.status-badge.published {
  background: #dcfce7;
  color: #15803d;
}

.status-badge.draft {
  background: #f1f5f9;
  color: #475569;
}

.status-badge.archived {
  background: #fee2e2;
  color: #b91c1c;
}



.order-badge {
  font-size: 0.75rem;
  font-weight: 700;
  color: #94a3b8;
  background: #e2e8f0;
  padding: 0.15rem 0.35rem;
  border-radius: 6px;
}

.item-card-vertical.active .order-badge {
  color: #0284c7;
  background: #e0f2fe;
}

.muted-empty {
  text-align: center;
  padding: 3rem 1rem;
  color: #94a3b8;
  font-size: 0.85rem;
}

/* Editor Modal Backdrop and Card */
.editor-modal-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(15, 23, 42, 0.4);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: fadeIn 0.2s ease-out;
}

.editor-modal-card {
  width: 90%;
  max-width: 1000px;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  background: #ffffff;
  border-radius: 16px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  border: 1px solid #e2e8f0;
  animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  overflow: hidden;
}

.editor-header-actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideUp {
  from { transform: translateY(20px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

.editor-row-grid {
  display: grid;
  grid-template-columns: 3fr 2fr;
  gap: 1.25rem;
}

@media (max-width: 768px) {
  .editor-row-grid {
    grid-template-columns: 1fr;
  }
}

.panel-header-editor {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid #f1f5f9;
}

.editor-header-title {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.title-icon {
  font-size: 1.25rem;
  color: #0284c7;
}

.editor-header-title strong {
  font-size: 1.1rem;
  color: #0f172a;
}

.delete-btn-editor {
  padding: 0.5rem 0.85rem;
  font-size: 0.85rem;
  border-radius: 8px;
}

.editor-content-scroll {
  flex: 1;
  overflow-y: auto;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  background: #f8fafc;
}

.editor-section-card {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.section-card-title {
  font-weight: 700;
  font-size: 0.9rem;
  color: #0284c7;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  border-bottom: 1px solid #f1f5f9;
  padding-bottom: 0.5rem;
}

.editor-fields-grid {
  display: grid;
  gap: 1rem;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.field-full {
  grid-column: span 2;
}

.field span {
  font-weight: 600;
  font-size: 0.8rem;
  color: #475569;
}

.input, .textarea, .select-input {
  width: 100%;
  padding: 0.55rem 0.75rem;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  font-size: 0.875rem;
  outline: none;
  background: #ffffff;
  transition: all 0.2s ease;
}

.input:focus, .textarea:focus, .select-input:focus {
  border-color: #0284c7;
  box-shadow: 0 0 0 3px rgba(2, 132, 199, 0.15);
}

.body-textarea {
  font-family: inherit;
  line-height: 1.5;
}

.code {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  background: #0f172a;
  color: #38bdf8;
  border-color: #1e293b;
}

.error-text-json {
  font-size: 0.8rem;
  color: #ef4444;
  font-weight: 600;
  margin-top: 0.25rem;
}

.editor-empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  padding: 5rem 2rem;
  color: #64748b;
  text-align: center;
  flex: 1;
}

.empty-state-icon {
  font-size: 3.5rem;
  color: #cbd5e1;
}

.animate-pulse {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: .5; }
}

/* Global Save Bar */
.workbench-save-footer {
  margin-top: 0.5rem;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.03);
}

.save-footer-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.5rem;
  gap: 1rem;
}

.reason-input-wrapper {
  position: relative;
  flex: 1;
  max-width: 500px;
}

.comment-icon {
  position: absolute;
  left: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  color: #94a3b8;
  font-size: 0.9rem;
}

.reason-input {
  width: 100%;
  padding: 0.55rem 0.75rem 0.55rem 2.2rem;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  font-size: 0.875rem;
  outline: none;
  transition: all 0.2s ease;
}

.reason-input:focus {
  border-color: #0284c7;
  box-shadow: 0 0 0 3px rgba(2, 132, 199, 0.15);
}

.save-actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.btn-reset {
  padding: 0.6rem 1.1rem;
  font-size: 0.9rem;
  font-weight: 600;
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.btn-save {
  padding: 0.6rem 1.25rem;
  font-size: 0.9rem;
  font-weight: 700;
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

@media (max-width: 992px) {
  .studio-grid-three-col {
    grid-template-columns: 1fr;
  }
  
  .items-panel {
    max-height: none;
  }
  
  .save-footer-content {
    flex-direction: column;
    align-items: stretch;
  }
  
  .reason-input-wrapper {
    max-width: none;
  }
}

/* Image Upload Styles */
.image-preview-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  border: 1px solid #e2e8f0;
  border-radius: 9px;
  padding: 12px;
  background: #f8fafc;
  margin-top: 4px;
}

.image-preview {
  width: 100%;
  max-height: 180px;
  object-fit: cover;
  border-radius: 6px;
  border: 1px solid #cbd5e1;
}

.image-upload-dropzone {
  width: 100%;
  min-height: 120px;
  border: 2px dashed #cbd5e1;
  border-radius: 9px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 16px;
  background: #f8fafc;
  cursor: pointer;
  transition: all 0.2s ease;
  margin-top: 4px;
}

.image-upload-dropzone:hover {
  border-color: #0284c7;
  background: #f0f9ff;
}

.image-upload-dropzone i {
  font-size: 24px;
  color: #64748b;
}

.image-upload-dropzone span {
  font-size: 13px;
  font-weight: 600;
  color: #334155;
}

.image-upload-error {
  color: #ef4444;
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

.lang-selector-field {
  padding: 0 16px;
}

.content-lang-tabs {
  display: inline-flex;
  gap: 4px;
}

.content-lang-tab {
  border: 1px solid var(--border-strong);
  background: #f6f8fd;
  border-radius: 7px;
  padding: 4px 8px;
  cursor: pointer;
  font-weight: 600;
  opacity: 0.6;
  font-size: 0.8rem;
  line-height: 1.1;
}

.content-lang-tab.active {
  opacity: 1;
  border-color: var(--brand-600);
  background: #e8efff;
  color: #1f3f73;
}
</style>

