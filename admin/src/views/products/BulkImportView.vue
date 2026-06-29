<template>
  <div class="page-container">
    <div class="page-header">
      <div class="page-title">
        <h1>Toplu Ürün Yükleme (Excel)</h1>
        <p class="page-subtitle">Excel dosyasını yükleyerek tek seferde 50'den fazla ürünü taslak olarak ekleyebilirsiniz.</p>
      </div>
    </div>

    <div class="card import-card">
      <div class="import-dropzone" @dragover.prevent @drop.prevent="handleDrop">
        <i class="pi pi-cloud-upload upload-icon"></i>
        <h3>Dosyayı Sürükleyin veya Seçin</h3>
        <p class="text-secondary">Sadece .xlsx ve .csv dosyaları desteklenir.</p>
        
        <input 
          type="file" 
          ref="fileInput" 
          accept=".xlsx, .csv" 
          class="hidden-input"
          @change="handleFileSelect" 
        />
        <button class="button primary mt-4" @click="$refs.fileInput.click()">
          Dosya Seç
        </button>
      </div>
    </div>

    <div v-if="parsedData.length > 0" class="card mt-6">
      <div class="card-header flex justify-between align-center">
        <h3>Önizleme ({{ parsedData.length }} ürün)</h3>
        <button class="button primary" :disabled="isUploading" @click="uploadToBackend">
          <i class="pi pi-check" v-if="!isUploading"></i>
          <i class="pi pi-spinner pi-spin" v-else></i>
          Onayla ve Yükle
        </button>
      </div>
      
      <div class="table-container mt-4">
        <table class="table w-full text-left">
          <thead>
            <tr>
              <th>Başlık</th>
              <th>Fiyat</th>
              <th>Stok</th>
              <th>Durum</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, index) in parsedData.slice(0, 10)" :key="index">
              <td>{{ row.title || 'Başlıksız' }}</td>
              <td>{{ row.price || 0 }} ₺</td>
              <td>{{ row.stockQuantity || 0 }}</td>
              <td><span class="badge warning">Taslak Bekliyor</span></td>
            </tr>
            <tr v-if="parsedData.length > 10">
              <td colspan="4" class="text-center py-4 text-secondary">
                ...ve {{ parsedData.length - 10 }} ürün daha
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import * as XLSX from 'xlsx';
import { adminApi } from '../../services/api';

const fileInput = ref<HTMLInputElement | null>(null);
const parsedData = ref<any[]>([]);
const isUploading = ref(false);

function handleDrop(event: DragEvent) {
  const file = event.dataTransfer?.files[0];
  if (file) parseFile(file);
}

function handleFileSelect(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (file) parseFile(file);
}

function parseFile(file: File) {
  const reader = new FileReader();
  reader.onload = (e) => {
    const data = e.target?.result;
    const workbook = XLSX.read(data, { type: 'binary' });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    
    // Excel'den array olarak al (headers map edilecek)
    const jsonData = XLSX.utils.sheet_to_json(worksheet);
    
    // Basit bir mapping (Excel sütunlarını DTO formatına çevir)
    parsedData.value = jsonData.map((row: any) => ({
      title: row['Başlık'] || row['Title'] || '',
      description: row['Açıklama'] || row['Description'] || '',
      price: parseFloat(row['Fiyat'] || row['Price'] || 0),
      stockQuantity: parseInt(row['Stok'] || row['Stock'] || 0),
      // Diğer create-product.dto alanları buraya haritalanabilir...
    })).filter((item: any) => item.title && item.title.length > 0);
  };
  reader.readAsBinaryString(file);
}

async function uploadToBackend() {
  if (parsedData.value.length === 0) return;
  isUploading.value = true;
  
  try {
    const response = await adminApi.post('/products/bulk-import', {
      products: parsedData.value
    });
    alert(`${response.data.importedCount} ürün başarıyla yüklendi.`);
    parsedData.value = [];
  } catch (error: any) {
    alert('Yükleme sırasında hata oluştu: ' + (error.response?.data?.message || error.message));
  } finally {
    isUploading.value = false;
  }
}
</script>

<style scoped>
.import-card { padding: 2rem; }
.import-dropzone {
  border: 2px dashed var(--color-border);
  border-radius: 12px;
  padding: 4rem 2rem;
  text-align: center;
  background-color: var(--color-surface-soft);
  transition: all 0.3s ease;
}
.import-dropzone:hover {
  border-color: var(--color-primary);
  background-color: var(--color-primary-soft);
}
.upload-icon {
  font-size: 3rem;
  color: var(--color-text-secondary);
  margin-bottom: 1rem;
}
.hidden-input { display: none; }
.flex { display: flex; }
.justify-between { justify-content: space-between; }
.align-center { align-items: center; }
.w-full { width: 100%; }
.text-left { text-align: left; }
.text-center { text-align: center; }
.py-4 { padding-top: 1rem; padding-bottom: 1rem; }
.mt-4 { margin-top: 1rem; }
.mt-6 { margin-top: 2rem; }
</style>
