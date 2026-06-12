<template>
  <div class="wysiwyg-editor">
    <div class="editor-toolbar">
      <button type="button" class="toolbar-btn text-btn" :class="{ active: isFormatActive('bold') }" title="Kalın" @click="format('bold')">
        <b>B</b>
      </button>
      <button type="button" class="toolbar-btn text-btn" :class="{ active: isFormatActive('italic') }" title="İtalik" @click="format('italic')">
        <i>I</i>
      </button>
      <button type="button" class="toolbar-btn text-btn" :class="{ active: isFormatActive('underline') }" title="Altı Çizili" @click="format('underline')">
        <u>U</u>
      </button>
      
      <div class="toolbar-divider" />
      
      <div class="color-picker-wrapper" title="Metin Rengi">
        <i class="pi pi-palette" aria-hidden="true" />
        <input type="color" value="#1e293b" class="color-input" @change="changeTextColor" />
      </div>
      
      <div class="color-picker-wrapper" title="Arka Plan Rengi">
        <i class="pi pi-pencil" aria-hidden="true" />
        <input type="color" value="#ffffff" class="color-input" @change="changeBgColor" />
      </div>
      
      <div class="toolbar-divider" />
      
      <button type="button" class="toolbar-btn text-btn" :class="{ active: isBlockActive('h2') }" title="Başlık 2" @click="formatBlock('h2')">
        H2
      </button>
      <button type="button" class="toolbar-btn text-btn" :class="{ active: isBlockActive('h3') }" title="Başlık 3" @click="formatBlock('h3')">
        H3
      </button>
      <button type="button" class="toolbar-btn text-btn" :class="{ active: isBlockActive('p') }" title="Paragraf" @click="formatBlock('p')">
        P
      </button>
      
      <div class="toolbar-divider" />
      
      <button type="button" class="toolbar-btn" title="Madde İşaretli Liste" @click="format('insertUnorderedList')">
        <i class="pi pi-list" aria-hidden="true" />
      </button>
      <button type="button" class="toolbar-btn" title="Numaralı Liste" @click="format('insertOrderedList')">
        <i class="pi pi-sort-numeric-down" aria-hidden="true" />
      </button>
      
      <div class="toolbar-divider" />
      
      <button type="button" class="toolbar-btn" title="Bağlantı Ekle" @click="addLink">
        <i class="pi pi-link" aria-hidden="true" />
      </button>
      <button type="button" class="toolbar-btn" title="Bağlantıyı Kaldır" @click="format('unlink')">
        <i class="pi pi-ban" aria-hidden="true" />
      </button>
      <button type="button" class="toolbar-btn" title="Biçimlendirmeyi Temizle" @click="format('removeFormat')">
        <i class="pi pi-filter-slash" aria-hidden="true" />
      </button>
    </div>
    <div
      ref="editorArea"
      class="editor-area"
      contenteditable="true"
      @input="handleInput"
      @blur="handleBlur"
      @keydown="handleKeydown"
    ></div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';

const props = defineProps<{
  modelValue: string;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void;
}>();

const editorArea = ref<HTMLDivElement | null>(null);
const activeFormats = ref<string[]>([]);
const activeBlock = ref<string>('p');

function format(command: string, value: string = '') {
  document.execCommand('styleWithCSS', false, 'true');
  document.execCommand(command, false, value);
  updateActiveStates();
  emitValue();
}

function formatBlock(tagName: string) {
  document.execCommand('formatBlock', false, `<${tagName}>`);
  updateActiveStates();
  emitValue();
}

function addLink() {
  const url = prompt('Bağlantı URL\'sini girin:', 'https://');
  if (url) {
    format('createLink', url);
  }
}

function changeTextColor(event: Event) {
  const color = (event.target as HTMLInputElement).value;
  format('foreColor', color);
}

function changeBgColor(event: Event) {
  const color = (event.target as HTMLInputElement).value;
  document.execCommand('styleWithCSS', false, 'true');
  const success = document.execCommand('hiliteColor', false, color);
  if (!success) {
    document.execCommand('backColor', false, color);
  }
  updateActiveStates();
  emitValue();
}

function handleInput() {
  emitValue();
}

function handleBlur() {
  emitValue();
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Enter') {
    // Force paragraph tags instead of divs/brs where possible
    document.execCommand('defaultParagraphSeparator', false, 'p');
  }
  updateActiveStates();
}

function emitValue() {
  if (editorArea.value) {
    emit('update:modelValue', editorArea.value.innerHTML);
  }
}

function updateActiveStates() {
  activeFormats.value = [];
  if (document.queryCommandState('bold')) activeFormats.value.push('bold');
  if (document.queryCommandState('italic')) activeFormats.value.push('italic');
  if (document.queryCommandState('underline')) activeFormats.value.push('underline');

  // Find block type
  const selection = window.getSelection();
  if (selection && selection.rangeCount > 0) {
    let parent = selection.getRangeAt(0).startContainer.parentElement;
    activeBlock.value = 'p';
    while (parent && parent !== editorArea.value) {
      const tag = parent.tagName.toLowerCase();
      if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'ul', 'ol', 'li'].includes(tag)) {
        activeBlock.value = tag;
        break;
      }
      parent = parent.parentElement;
    }
  }
}

function isFormatActive(name: string) {
  return activeFormats.value.includes(name);
}

function isBlockActive(name: string) {
  return activeBlock.value === name;
}

watch(() => props.modelValue, (newVal) => {
  if (editorArea.value && editorArea.value.innerHTML !== newVal) {
    editorArea.value.innerHTML = newVal || '<p><br></p>';
  }
});

onMounted(() => {
  if (editorArea.value) {
    editorArea.value.innerHTML = props.modelValue || '<p><br></p>';
  }
  try {
    document.execCommand('styleWithCSS', false, 'true');
  } catch (e) {
    console.warn('styleWithCSS not supported in this browser', e);
  }
});
</script>

<style scoped>
.wysiwyg-editor {
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  background: #ffffff;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.editor-toolbar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.25rem;
  padding: 0.5rem;
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
}

.toolbar-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 2rem;
  height: 2rem;
  padding: 0.25rem;
  border: 1px solid transparent;
  border-radius: 6px;
  background: transparent;
  color: #475569;
  font-weight: 600;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.toolbar-btn:hover {
  background: #e2e8f0;
  color: #0f172a;
}

.toolbar-btn.active {
  background: #e0f2fe;
  border-color: #bae6fd;
  color: #0369a1;
}

.text-btn {
  font-family: inherit;
  font-weight: 700;
}

.toolbar-divider {
  width: 1px;
  height: 1.25rem;
  background: #cbd5e1;
  margin: 0 0.25rem;
}

.color-picker-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 2rem;
  height: 2rem;
  border-radius: 6px;
  cursor: pointer;
  color: #475569;
  transition: all 0.2s ease;
}

.color-picker-wrapper:hover {
  background: #e2e8f0;
  color: #0f172a;
}

.color-input {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  cursor: pointer;
}

.editor-area {
  min-height: 250px;
  max-height: 450px;
  padding: 0.75rem 1rem;
  overflow-y: auto;
  outline: none;
  font-size: 0.95rem;
  line-height: 1.6;
  color: #1e293b;
}

.editor-area :deep(h2) {
  font-size: 1.35rem;
  font-weight: 700;
  margin-top: 1rem;
  margin-bottom: 0.5rem;
  color: #0f172a;
}

.editor-area :deep(h3) {
  font-size: 1.15rem;
  font-weight: 600;
  margin-top: 0.75rem;
  margin-bottom: 0.35rem;
  color: #1e293b;
}

.editor-area :deep(p) {
  margin-bottom: 0.75rem;
}

.editor-area :deep(ul), .editor-area :deep(ol) {
  padding-left: 1.5rem;
  margin-bottom: 0.75rem;
}

.editor-area :deep(a) {
  color: #0284c7;
  text-decoration: underline;
}
</style>
