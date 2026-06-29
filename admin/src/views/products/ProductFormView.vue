<template>
  <section class="field-grid">
    <header class="page-header">
      <div>
        <h1>{{ isEdit ? 'Ürün Yönetimi / Düzenle' : 'Ürün Yönetimi / Yeni Ürün' }}</h1>
        <p>Ürün bilgilerini sekmeli adımlarla yönetin.</p>
      </div>
      <div class="toolbar">
        <div class="view-mode-switch">
          <button class="button ghost tiny" type="button" :class="{ 'is-active': isQuickMode }" @click="setFormMode('quick')">Hızlı Mod</button>
          <button class="button ghost tiny" type="button" :class="{ 'is-active': !isQuickMode }" @click="setFormMode('full')">Detaylı Mod</button>
        </div>
        <button class="button ghost" type="button" @click="goBack">Vazgeç</button>
        <button class="button primary" type="button" :disabled="saving" @click="submit">
          {{ saving ? 'Kaydediliyor...' : 'Kaydet' }}
        </button>
      </div>
    </header>

    <section class="panel">
      <nav class="tabs" aria-label="Ürün sekmeleri">
        <button
          v-for="tab in visibleTabs"
          :key="tab.key"
          class="tab-button"
          :class="{ 'is-active': activeTab === tab.key }"
          type="button"
          @click="activeTab = tab.key"
        >
          {{ tab.label }}
        </button>
      </nav>

      <div class="panel-body field-grid">
        <template v-if="activeTab === 'general'">
          <div v-if="isQuickMode" class="quick-note">
            Önce satıcı seç, `Ürün Adı` ve `Satış Fiyatı` alanlarını doldur. Sonra `Resimler` sekmesine geçip kaydet.
          </div>

          <div class="owner-grid">
            <div v-if="!isSellerOnly" class="field">
              <span>Satıcı *</span>
              <div 
                class="brand-select-trigger" 
                :class="{ empty: !selectedSellerLabel }"
                @click="openSellerModal"
              >
                <span>{{ selectedSellerLabel || 'Satıcı Seç' }}</span>
                <i v-if="selectedSellerLabel" class="pi pi-pencil edit-icon" />
              </div>
            </div>
            <label class="field"><span>Ürün Adı *</span><input v-model="form.title" class="input" /></label>
            <label class="field"><span>Satış Fiyatı (₺) *</span><input v-model="form.price" class="input" type="number" min="0" step="0.01" /></label>
            <label class="field"><span>Endemigo Stok</span><input v-model="form.stockQuantity" class="input" type="number" min="0" /></label>
            <label class="field">
              <span>Ürün Durumu</span>
              <select v-model="form.status" class="select">
                <option v-for="status in statusOptions" :key="status.value" :value="status.value">
                  {{ status.label }}
                </option>
              </select>
            </label>
            <div class="field">
              <span>Marka</span>
              <div 
                class="brand-select-trigger" 
                :class="{ empty: !form.brand }"
                @click="openBrandModal"
              >
                <span>{{ form.brand || 'Marka Seç' }}</span>
                <i v-if="form.brand" class="pi pi-pencil edit-icon" />
              </div>
            </div>
          </div>

          <template v-if="!isQuickMode">
            <div class="owner-grid">
              <label class="field"><span>Satış yeri</span><input v-model="form.salesRegion" class="input" /></label>
              <label class="field"><span>Google Kategori *</span><input v-model="form.googleCategory" class="input" /></label>
              <label class="field">
                <span>Tedarikçi</span>
                <select v-model="form.supplierId" class="select" @change="onSupplierChange">
                  <option value="">Tedarikçi seçiniz</option>
                  <option
                    v-for="supplier in supplierOptions"
                    :key="`supplier-${supplier.userId || supplier.id}`"
                    :value="supplier.userId || supplier.id"
                  >
                    {{ supplier.label }} ({{ supplier.userId || supplier.id }})
                  </option>
                </select>
              </label>
              <label class="field"><span>Ürün Kodu</span><input v-model="form.productCode" class="input" /></label>
              <label class="field">
                <span>Ön Sipariş Ürünü Mü?</span>
                <select v-model="form.isPreorder" class="select"><option value="false">Hayır</option><option value="true">Evet</option></select>
              </label>
              <label class="field">
                <span>İade Edilebilir mi?</span>
                <select v-model="form.returnable" class="select"><option value="true">Evet</option><option value="false">Hayır</option></select>
              </label>
              <label class="field">
                <span>Kargo Bedava mı?</span>
                <select v-model="form.freeShipping" class="select"><option value="false">Hayır</option><option value="true">Evet</option></select>
              </label>
            </div>

            <label class="field"><span>Ürün Link</span><input v-model="form.productLink" class="input" /></label>
            <label class="field"><span>Müzayede Link</span><input v-model="form.auctionLink" class="input" /></label>
            <label class="field"><span>Global Ticari Ürün Numarası / GTIN No</span><input v-model="form.gtin" class="input" /></label>
            <label class="field"><span>Ürün İçeriği</span><textarea v-model="form.productContent" class="textarea" /></label>
            <label class="field"><span>Ürüne Dair Eklemek İstediğiniz Notlar</span><textarea v-model="form.sellerNotes" class="textarea" /></label>

            <div class="owner-grid">
              <label class="field"><span>Coğrafi İşaret Aldığınız Tarih</span><input v-model="form.geoIndicationReceivedAt" class="input" type="date" /></label>
              <label class="field"><span>Tedarikçi tarafından yazılan marka</span><input v-model="form.supplierBrand" class="input" /></label>
              <label class="field">
                <span>Yoksa endemigo markasıyla satılsın mı?</span>
                <select v-model="form.isEndemigoBrandCandidate" class="select"><option value="false">Hayır</option><option value="true">Evet</option></select>
              </label>
            </div>

            <hr class="owner-sep" />
            <div class="owner-grid three-col">
              <label class="field">
                <span>Ürünün Üretim Yeri / Ülke</span>
                <select v-model="form.originCountry" class="select">
                  <option v-for="country in countryOptions" :key="`prod-country-${country.code}`" :value="country.code">
                    {{ country.label }} ({{ country.code }})
                  </option>
                </select>
              </label>
              <label class="field">
                <span>İl</span>
                <select v-model="form.productionProvince" class="select" @change="onProductionProvinceChange">
                  <option value="">İl Seçiniz</option>
                  <option v-for="province in provinces" :key="`prod-province-${province.id}`" :value="province.name">
                    {{ province.name }}
                  </option>
                </select>
              </label>
              <label class="field">
                <span>İlçe</span>
                <select v-model="form.productionDistrict" class="select">
                  <option value="">İlçe Seçiniz</option>
                  <option
                    v-for="district in productionDistrictOptions"
                    :key="`prod-district-${form.productionProvince}-${district}`"
                    :value="district"
                  >
                    {{ district }}
                  </option>
                </select>
              </label>
            </div>

            <div class="owner-grid period-grid">
              <div class="field">
                <span>Ürünün Üretim Dönemi</span>
                <div class="chip-wrap">
                  <button v-for="season in seasonOptions" :key="season.value" class="chip" :class="{ active: form.productionSeason === season.value }" type="button" @click="form.productionSeason = season.value">{{ season.label }}</button>
                </div>
              </div>
              <div class="field">
                <span>Ürünün Satışa Konma Dönemi</span>
                <div class="month-grid">
                  <button v-for="month in monthOptions" :key="month" class="month-chip" :class="{ active: selectedSalesMonths.includes(month) }" type="button" @click="toggleSalesMonth(month)">{{ month }}</button>
                </div>
              </div>
            </div>

            <div class="price-inline-grid price-row">
              <label class="field"><span>Ürünün Toptan Satış Fiyatı (KDV Dahil)</span><input v-model="form.wholesalePrice" class="input" type="number" min="0" step="0.01" /></label>
              <label class="field"><span>Ürünün Perakende Satış Fiyatı (KDV Dahil)</span><input v-model="form.retailPrice" class="input" type="number" min="0" step="0.01" /></label>
              <label class="field"><span>İndirim Oranı (%)</span><input v-model="form.discountRate" class="input" type="number" min="0" max="100" step="1" /></label>
              <label class="field"><span>İndirimli Fiyat</span><input :value="discountedRetailPrice" class="input" readonly /></label>
            </div>

            <div class="owner-grid three-col">
              <label class="field"><span>Ürünün Kargo Teslim Adresi / Ülke</span><input v-model="form.shippingCountry" class="input" /></label>
              <label class="field">
                <span>İl</span>
                <select v-model="form.shippingProvince" class="select" @change="onShippingProvinceChange">
                  <option value="">İl Seçiniz</option>
                  <option v-for="province in provinces" :key="`ship-province-${province.id}`" :value="province.name">
                    {{ province.name }}
                  </option>
                </select>
              </label>
              <label class="field">
                <span>İlçe</span>
                <select v-model="form.shippingDistrict" class="select">
                  <option value="">İlçe Seçiniz</option>
                  <option
                    v-for="district in shippingDistrictOptions"
                    :key="`ship-district-${form.shippingProvince}-${district}`"
                    :value="district"
                  >
                    {{ district }}
                  </option>
                </select>
              </label>
            </div>
            <label class="field"><span>Siparişin kargo teslim adresi</span><textarea v-model="form.shippingAddress" class="textarea" /></label>
          </template>
        </template>

        <template v-else-if="activeTab === 'detail'">
          <div class="owner-grid">
            <label class="field"><span>GTIN</span><input v-model="form.gtin" class="input" /></label>
            <label class="field"><span>MPN</span><input v-model="form.mpn" class="input" /></label>
            <label class="field">
              <span>Menşei Ülke</span>
              <select v-model="form.originCountry" class="select">
                <option v-for="country in countryOptions" :key="`origin-country-${country.code}`" :value="country.code">
                  {{ country.label }} ({{ country.code }})
                </option>
              </select>
            </label>
            <label class="field">
              <span>Teslimat Şablonu (yurtiçi)</span>
              <select v-model="form.deliveryTemplateDomestic" class="select">
                <option v-for="template in deliveryTemplateOptions" :key="`dom-${template}`" :value="template">{{ template }}</option>
              </select>
            </label>
            <label class="field">
              <span>Teslimat Şablonu (yurtdışı)</span>
              <select v-model="form.deliveryTemplateInternational" class="select">
                <option v-for="template in deliveryTemplateOptions" :key="`int-${template}`" :value="template">{{ template }}</option>
              </select>
            </label>
            <label class="field">
              <span>Desi (yurtiçi)</span>
              <select v-model="form.desiDomestic" class="select">
                <option v-for="option in desiOptions" :key="`dom-${option}`" :value="option">{{ option }}</option>
              </select>
            </label>
            <label class="field">
              <span>Desi (yurtdışı)</span>
              <select v-model="form.desiInternational" class="select">
                <option v-for="option in desiOptions" :key="`int-${option}`" :value="option">{{ option }}</option>
              </select>
            </label>
            <label class="field">
              <span>Para Birimi</span>
              <select v-model="form.currency" class="select">
                <option value="TRY">Türk Lirası (TL)</option>
                <option value="USD">Amerikan Doları ($)</option>
                <option value="EUR">Euro (€)</option>
              </select>
            </label>
            <label class="field"><span>Ağırlık</span><input v-model="form.weight" class="input" type="number" min="0" step="0.01" /></label>
            <label class="field"><span>Coğrafi İşaret Adı</span><input v-model="form.geoIndicationName" class="input" /></label>
            <label class="field"><span>Coğrafi İşaret Sınır</span><input v-model="form.geoIndicationRegion" class="input" /></label>
            <label class="field"><span>Coğrafi İşaret Sınır EN</span><input v-model="form.geoIndicationRegionEn" class="input" /></label>
          </div>

          <div class="field">
            <span>Özellikler</span>
            <div class="feature-badge-grid">
              <button
                v-for="feature in featureOptions"
                :key="feature.value"
                class="feature-badge"
                :class="{ active: selectedFeatures.includes(feature.value) }"
                type="button"
                :title="feature.label"
                @click="toggleFeature(feature.value)"
              >
                <img :src="feature.imageUrl" :alt="feature.label" class="feature-badge-image" />
              </button>
            </div>
          </div>

          <div class="field">
            <span>Coğrafi İşaret Türü</span>
            <div class="geo-badge-grid">
              <button
                v-for="type in geoTypeOptions"
                :key="type.value"
                class="geo-badge"
                :class="{ active: selectedGeoTypes.includes(type.value) }"
                type="button"
                :title="type.label"
                @click="toggleGeoType(type.value)"
              >
                <img v-if="type.imageUrl" :src="type.imageUrl" :alt="type.label" class="geo-badge-image" />
                <span v-else class="geo-badge-fallback">{{ type.label }}</span>
              </button>
            </div>
          </div>

          <div class="field">
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

          <label v-if="contentLanguage === 'tr'" class="field"><span>Ürün Açıklamaları</span><textarea v-model="form.description" class="textarea editor-like" /></label>
          <label v-else class="field"><span>Ürün Açıklamaları (EN)</span><textarea v-model="form.descriptionEn" class="textarea editor-like" /></label>
          <label v-if="contentLanguage === 'tr'" class="field"><span>Ürün Hikayesi</span><textarea v-model="form.story" class="textarea editor-like" /></label>
          <label v-else class="field"><span>Ürün Hikayesi (EN)</span><textarea v-model="form.storyEn" class="textarea editor-like" /></label>
          <label class="field"><span>Ürün Başlığı (Title)</span><input v-model="form.seoTitle" class="input" /></label>
          <label class="field"><span>SEO Meta Açıklaması (Description)</span><textarea v-model="form.seoDescription" class="textarea" /></label>
          <label class="field"><span>SEO Anahtar Kelimeler (Keywords)</span><textarea v-model="form.seoKeywords" class="textarea" /></label>
        </template>

        <template v-else-if="activeTab === 'category'">
          <div class="field">
            <span>Kategoriler (çoklu seçim)</span>
            <div class="category-grid">
              <div v-for="group in categoryGroupsView" :key="group.id" class="category-col">
                <label class="check-row category-title">
                  <input :checked="isSelected(group.id)" type="checkbox" @change="toggleCategory(group.id)" />
                  <strong>{{ group.label }}</strong>
                </label>
                <label
                  v-for="child in group.rows"
                  :key="child.id"
                  class="check-row"
                  :style="{ paddingInlineStart: `${child.depth * 12}px` }"
                >
                  <input :checked="isSelected(child.id)" type="checkbox" @change="toggleCategory(child.id)" />
                  <span>{{ child.label }}</span>
                </label>
              </div>
            </div>
          </div>
        </template>

        <template v-else-if="activeTab === 'variation'">
          <div class="variation-grid">
            <div v-for="group in variationGroups" :key="group.key" class="panel variation-panel">
              <div class="panel-header"><strong>{{ group.label }}</strong></div>
              <div class="panel-body variation-list">
                <p v-if="!hasSupplierSelection" class="muted">Önce tedarikçi seçin.</p>
                <p v-else-if="group.options.length === 0" class="muted">Bu tipte aktif varyasyon yok.</p>
                <div v-for="option in group.options" :key="`${group.key}-${option.id}`" class="variation-row">
                  <label class="check-row">
                    <input :checked="isVariationSelected(group.key, option.id)" :disabled="!hasSupplierSelection" type="checkbox" @change="toggleVariation(group.key, option.id)" />
                    <span>{{ option.label }}</span>
                  </label>
                  <input v-model="variationState[variationKey(group.key, option.id)].extraPrice" :disabled="!hasSupplierSelection" class="input mini" placeholder="Ek fiyat" />
                  <input v-model="variationState[variationKey(group.key, option.id)].stock" :disabled="!hasSupplierSelection" class="input mini" placeholder="Stok" />
                </div>
              </div>
            </div>
          </div>
        </template>

        <template v-else-if="activeTab === 'images'">
          <div class="field">
            <span>Ürün Görselleri</span>
            <input
              ref="productImageInput"
              type="file"
              class="hidden-file-input"
              accept="image/*"
              multiple
              @change="onImageInputChange($event, 'product')"
            />
            <button
              class="upload-dropzone"
              :class="{ dragging: dragTarget === 'product' }"
              type="button"
              @click="openImagePicker('product')"
              @dragover.prevent="dragTarget = 'product'"
              @dragleave.prevent="dragTarget = null"
              @drop.prevent="onDropImages($event, 'product')"
            >
              <strong>{{ uploadingTarget === 'product' ? 'Yükleniyor...' : 'Resim yüklemek için tıkla veya sürükle-bırak' }}</strong>
              <small>Çoklu seçim desteklenir • Maks 5 MB / dosya</small>
            </button>
          </div>
          <div v-if="productImageList.length > 0" class="upload-grid">
            <article v-for="(imageUrl, index) in productImageList" :key="`product-image-${index}-${imageUrl}`" class="upload-card">
              <img :src="imageUrl" alt="Ürün görseli" class="upload-preview" />
              <div class="upload-card-actions">
                <button class="button ghost tiny" type="button" :disabled="index === 0" @click="setCoverImage(index)">
                  {{ index === 0 ? 'Kapak' : 'Kapak Yap' }}
                </button>
                <button class="button danger tiny" type="button" @click="removeImage('product', index)">Sil</button>
              </div>
            </article>
          </div>
        </template>

        <template v-else-if="activeTab === 'certificate'">
          <div class="field">
            <span>Sertifika Görselleri</span>
            <input
              ref="certificateImageInput"
              type="file"
              class="hidden-file-input"
              accept="image/*"
              multiple
              @change="onImageInputChange($event, 'certificate')"
            />
            <button
              class="upload-dropzone upload-dropzone-certificate"
              :class="{ dragging: dragTarget === 'certificate' }"
              type="button"
              @click="openImagePicker('certificate')"
              @dragover.prevent="dragTarget = 'certificate'"
              @dragleave.prevent="dragTarget = null"
              @drop.prevent="onDropImages($event, 'certificate')"
            >
              <strong>{{ uploadingTarget === 'certificate' ? 'Yükleniyor...' : 'Sertifika görsellerini yükle' }}</strong>
              <small>JPG, PNG, WebP, GIF</small>
            </button>
          </div>
          <div v-if="certificateImageList.length > 0" class="upload-grid">
            <article
              v-for="(imageUrl, index) in certificateImageList"
              :key="`certificate-image-${index}-${imageUrl}`"
              class="upload-card"
            >
              <img :src="imageUrl" alt="Sertifika görseli" class="upload-preview" />
              <div class="upload-card-actions single">
                <button class="button danger tiny" type="button" @click="removeImage('certificate', index)">Sil</button>
              </div>
            </article>
          </div>
        </template>

        <template v-else-if="activeTab === 'delivery'">
          <label class="field">
            <span>Teslimat Yerleri (çoklu seçim)</span>
            <select
              v-model="selectedDeliveryCountries"
              class="select delivery-country-select"
              multiple
              @change="syncDeliveryLocationsFromSelectedCountries"
            >
              <option v-for="country in countryOptions" :key="`delivery-${country}`" :value="country">
                {{ country }}
              </option>
            </select>
          </label>
          <label class="field"><span>Kargo Notu</span><textarea v-model="form.cargoNote" class="textarea" /></label>
        </template>

      </div>
    </section>

    <section class="panel">
      <div class="panel-footer">
        <p v-if="error" class="error-text">{{ error }}</p>
        <div class="toolbar">
          <button class="button ghost" type="button" @click="goBack">Vazgeç</button>
          <button class="button primary" type="button" :disabled="saving" @click="submit">
            {{ saving ? 'Kaydediliyor...' : 'Kaydet' }}
          </button>
        </div>
      </div>
    </section>

    <Teleport to="body">
      <div v-if="sellerModalOpen" class="seller-modal-backdrop" role="presentation" @click.self="closeSellerModal">
        <section class="seller-modal" role="dialog" aria-modal="true" aria-label="Satıcı seç">
          <header class="seller-modal-header">
            <strong>Satıcı Seç</strong>
            <button class="button ghost tiny" type="button" @click="closeSellerModal">Kapat</button>
          </header>

          <div class="seller-modal-body">
            <label class="field">
              <span>Ara</span>
              <input
                v-model.trim="sellerSearch"
                class="input"
                placeholder="Satıcı ID, userId, şirket, mağaza adı..."
              />
            </label>

            <div class="seller-list">
              <article v-for="seller in filteredSellers" :key="seller.id" class="seller-item">
                <div class="seller-meta">
                  <strong>{{ seller.label }}</strong>
                  <small>ID: {{ seller.id }}</small>
                </div>
                <button class="button primary tiny" type="button" @click="selectSeller(seller)">Seç</button>
              </article>
              <p v-if="filteredSellers.length === 0" class="muted">Sonuç bulunamadı.</p>
            </div>

            <footer class="seller-modal-footer">
              <button class="button ghost tiny" type="button" :disabled="sellerPage <= 1" @click="changeSellerPage(-1)">Önceki</button>
              <span class="muted">Sayfa {{ sellerPage }} / {{ sellerTotalPages }}</span>
              <button class="button ghost tiny" type="button" :disabled="sellerPage >= sellerTotalPages" @click="changeSellerPage(1)">Sonraki</button>
            </footer>
          </div>
        </section>
      </div>

      <div v-if="brandModalOpen" class="seller-modal-backdrop" role="presentation" @click.self="closeBrandModal">
        <section class="seller-modal" role="dialog" aria-modal="true" aria-label="Marka seç">
          <header class="seller-modal-header">
            <strong>Marka Seç</strong>
            <button class="button ghost tiny" type="button" @click="closeBrandModal">Kapat</button>
          </header>

          <div class="seller-modal-body">
            <label class="field">
              <span>Ara</span>
              <input
                v-model.trim="brandSearch"
                class="input"
                placeholder="Marka adı ara..."
              />
            </label>

            <div class="seller-list">
              <article v-for="brand in filteredBrands" :key="brand.id" class="seller-item">
                <div class="seller-meta">
                  <strong>{{ brand.name }}</strong>
                  <small>ID: {{ brand.id }}</small>
                </div>
                <button class="button primary tiny" type="button" @click="selectBrand(brand)">Seç</button>
              </article>
              <p v-if="filteredBrands.length === 0" class="muted">Sonuç bulunamadı.</p>
            </div>
          </div>
        </section>
      </div>
    </Teleport>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAdminAuthStore } from '../../stores/adminAuth';
import { adminApi, toApiMessage, type ApiEnvelope } from '../../services/api';
import { normalizeMoneyScale, parseTrMoneyInput } from '../../../../shared-types/utils/money';
import ulkelerMap from '../../constants/ulkeler.json';
import illerData from '../../constants/iller.json';
import ilcelerData from '../../constants/ilceler.json';

type ProductStep =
  | 'general'
  | 'detail'
  | 'category'
  | 'variation'
  | 'images'
  | 'certificate'
  | 'delivery';

interface ProductDetailResponse extends ApiEnvelope {
  overview: Record<string, unknown>;
}

interface UploadImageResponse extends ApiEnvelope {
  url: string;
}

interface SellerListResponse extends ApiEnvelope {
  items: Array<Record<string, unknown>>;
  pagination?: {
    page: number;
    limit: number;
    total: number;
  };
}

interface SellerOption {
  id: string;
  userId: string;
  label: string;
  status: string;
}

interface VariationValue {
  selected: boolean;
  extraPrice: string;
  stock: string;
}

interface CategoryNode {
  id: string;
  label: string;
  children: CategoryNode[];
}

interface CategoryGroupView {
  id: string;
  label: string;
  rows: Array<{ id: string; label: string; depth: number }>;
}

interface CategoryFlatItem {
  id: string;
  name: string;
  parentId: string | null;
}

interface VariantListResponse {
  code: string;
  message: string;
  items: Array<{
    id: string;
    kind: 'COLOR' | 'SIZE' | 'NUMBER' | 'OPTION' | 'VARIATION';
    nameTr: string;
    status: 'ACTIVE' | 'PASSIVE';
    swatchHex: string | null;
  }>;
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
}

interface CategoryListResponse {
  code: string;
  message: string;
  items: Array<Record<string, unknown>>;
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
}

interface VariationGroup {
  key: string;
  label: string;
  options: Array<{ id: string; label: string }>;
}

interface ProductAdminForm {
  sellerId: string;
  title: string;
  description: string;
  price: string;
  stockQuantity: string;
  sku: string;
  barcodeNo: string;
  brand: string;
  categoryId: string;
  status: string;
  productContent: string;
  sellerNotes: string;
  originCountry: string;
  originRegion: string;
  productionProvince: string;
  productionDistrict: string;
  productionSeason: string;
  salesMonths: number[];
  productImageUrls: string;
  certificateNotes: string;
  certificateImageUrls: string;
  geoIndicationCertNo: string;
  geoIndicationRegion: string;
  geoIndicationReceivedAt: string;
  shippingProvince: string;
  shippingDistrict: string;
  shippingAddress: string;
  deliveryLocations: string;
  imageUrl: string;
  retailPrice: string;
  wholesalePrice: string;
  askPriceMinAmount: string;
  askPriceEnabled: string;
  titleEn: string;
  descriptionEn: string;
  storyEn: string;
  story: string;
  googleCategory: string;
  googleCategoryEn: string;
  supplierId: string;
  supplierName: string;
  productCode: string;
  categoryText: string;
  subCategoryText: string;
  subCategoryText2: string;
  isPreorder: string;
  returnable: string;
  freeShipping: string;
  salesRegion: string;
  productLink: string;
  auctionLink: string;
  gtin: string;
  supplierBrand: string;
  isEndemigoBrandCandidate: string;
  discountRate: string;
  shippingCountry: string;
  mpn: string;
  deliveryTemplate: string;
  deliveryTemplateDomestic: string;
  deliveryTemplateInternational: string;
  desiDomestic: string;
  desiInternational: string;
  currency: string;
  weight: string;
  geoIndicationName: string;
  geoIndicationRegionEn: string;
  seoTitle: string;
  seoDescription: string;
  seoKeywords: string;
  productLinkEn: string;
  cargoNote: string;
}

interface ProductExtendedContent {
  notes: string;
  certificateImageUrls: string[];
  deliveryLocations: string[];
  adminFormSnapshot?: Record<string, unknown>;
}

interface ProvinceItem {
  id: number;
  name: string;
}

interface DistrictItem {
  id: number;
  ilId: number;
  name: string;
}

const props = withDefaults(
  defineProps<{
    mode: 'create' | 'edit';
    id?: string;
  }>(),
  { id: '' },
);

const auth = useAdminAuthStore();
const isSellerOnly = computed(() => {
  const roles = auth.admin?.roles || [];
  return roles.includes('seller') && !roles.some(r => ['SUPER_ADMIN', 'ADMIN'].includes(r));
});

const router = useRouter();
const route = useRoute();
const isEdit = computed(() => props.mode === 'edit');
const saving = ref(false);
const error = ref<string | null>(null);
const activeTab = ref<ProductStep>('general');
const contentLanguage = ref<'tr' | 'en'>('tr');
const isQuickMode = ref(true);
const productImageInput = ref<HTMLInputElement | null>(null);
const certificateImageInput = ref<HTMLInputElement | null>(null);
const dragTarget = ref<'product' | 'certificate' | null>(null);
const uploadingTarget = ref<'product' | 'certificate' | null>(null);
const productImageList = ref<string[]>([]);
const certificateImageList = ref<string[]>([]);
const brandModalOpen = ref(false);
const brandSearch = ref('');
const brandRows = ref<Array<{ id: string; name: string }>>([]);

const filteredBrands = computed(() => {
  const q = brandSearch.value.trim().toLowerCase();
  if (!q) return brandRows.value;
  return brandRows.value.filter((brand) => {
    return (
      brand.name.toLowerCase().includes(q) ||
      brand.id.toLowerCase().includes(q)
    );
  });
});

async function loadBrands(): Promise<void> {
  const response = await adminApi.get<any>('/admin/brands', {
    params: {
      page: 1,
      limit: 1000,
    },
  });
  brandRows.value = (response.data.items ?? []).map((item: any) => ({
    id: String(item.id ?? ''),
    name: String(item.name ?? ''),
  }));
}

async function openBrandModal(): Promise<void> {
  brandModalOpen.value = true;
  brandSearch.value = '';
  if (brandRows.value.length === 0) {
    await loadBrands();
  }
}

function closeBrandModal(): void {
  brandModalOpen.value = false;
}

function selectBrand(brand: { id: string; name: string }): void {
  form.brand = brand.name;
  closeBrandModal();
}

const sellerModalOpen = ref(false);
const sellerSearch = ref('');
const sellerPage = ref(1);
const sellerLimit = 10;
const sellerTotal = ref(0);
const sellerRows = ref<SellerOption[]>([]);
const supplierOptions = ref<SellerOption[]>([]);
const selectedSellerLabel = ref('');
const selectedDeliveryCountries = ref<string[]>([]);
const provinces = illerData as ProvinceItem[];
const districts = ilcelerData as DistrictItem[];
const countryOptions = (() => {
  const entries = Object.entries(ulkelerMap as Record<string, string>)
    .map(([code, label]) => ({ code: code.trim().toUpperCase(), label: label.trim() }))
    .filter((item) => item.code.length > 0 && item.label.length > 0);
  const normalized = Array.from(
    new Map(entries.map((item) => [item.code, item])).values(),
  ).sort((a, b) =>
    a.label.localeCompare(b.label, 'tr'),
  );
  if (!normalized.some((item) => item.code === 'TR')) {
    normalized.unshift({ code: 'TR', label: 'Türkiye' });
  } else {
    normalized.sort((left, right) => {
      if (left.code === 'TR') return -1;
      if (right.code === 'TR') return 1;
      return left.label.localeCompare(right.label, 'tr');
    });
  }
  return normalized;
})();
const countryCodeByLabel = new Map<string, string>(
  countryOptions.map((item) => [item.label.toLocaleLowerCase('tr-TR'), item.code]),
);

const tabs: Array<{ key: ProductStep; label: string }> = [
  { key: 'general', label: 'Genel Bilgiler' },
  { key: 'detail', label: 'Ürün Detayı' },
  { key: 'category', label: 'Kategori' },
  { key: 'variation', label: 'Varyasyon' },
  { key: 'images', label: 'Resimler' },
  { key: 'certificate', label: 'Sertifika' },
  { key: 'delivery', label: 'Teslimat Yerleri' },
];
const quickTabKeys: ProductStep[] = ['general', 'images', 'variation', 'delivery'];
const visibleTabs = computed(() =>
  isQuickMode.value
    ? tabs.filter((tab) => quickTabKeys.includes(tab.key))
    : tabs,
);
const sellerTotalPages = computed(() =>
  Math.max(1, Math.ceil(sellerTotal.value / sellerLimit)),
);
const filteredSellers = computed(() => {
  const q = sellerSearch.value.trim().toLowerCase();
  if (!q) return sellerRows.value;
  return sellerRows.value.filter((seller) => {
    return (
      seller.id.toLowerCase().includes(q) ||
      seller.userId.toLowerCase().includes(q) ||
      seller.label.toLowerCase().includes(q) ||
      seller.status.toLowerCase().includes(q)
    );
  });
});
const hasSupplierSelection = computed(() => form.supplierId.trim().length > 0);
const productionDistrictOptions = computed(() => {
  const selectedProvince = provinces.find(
    (item) => item.name === form.productionProvince,
  );
  if (!selectedProvince) return [];
  return districts
    .filter((item) => item.ilId === selectedProvince.id)
    .map((item) => item.name);
});
const shippingDistrictOptions = computed(() => {
  const selectedProvince = provinces.find(
    (item) => item.name === form.shippingProvince,
  );
  if (!selectedProvince) return [];
  return districts
    .filter((item) => item.ilId === selectedProvince.id)
    .map((item) => item.name);
});

const statusOptions = [
  { label: 'Taslak', value: 'DRAFT' },
  { label: 'İnceleme', value: 'PENDING_REVIEW' },
  { label: 'Aktif', value: 'ACTIVE' },
  { label: 'Müzayedede', value: 'UNDER_AUCTION' },
  { label: 'Satıldı', value: 'SOLD' },
  { label: 'Stok Yok', value: 'OUT_OF_STOCK' },
  { label: 'Arşiv', value: 'ARCHIVED' },
  { label: 'Askıda', value: 'SUSPENDED' },
];
const deliveryTemplateOptions = [
  'Seçiniz',
  'Yurtiçi Kargo 1-3 gün',
  'Yurtiçi Ön Sipariş 3-15 gün',
  'Yurtiçi Ön Sipariş 1-1.5 ay',
  'Yurtiçi Kargo 3-7 gün',
  'UPS Kargo 1-3 gün',
  'UPS Kargo Ön Sipariş 3-15 gün',
  'UPS Kargo Ön Sipariş 1-1.5 ay',
  'UPS Kargo 3-7 gün',
  'Yurtiçi Ön Sipariş 2-2.5 ay',
];
const desiOptions = ['Seçiniz', '0-1', '1-3', '3-5', '5-10', '10-15', '15-20', '20+'];

const seasonOptions = [
  { value: 'ALL_TIME', label: 'Her zaman' },
  { value: 'SPRING', label: 'İlkbahar' },
  { value: 'SUMMER', label: 'Yaz' },
  { value: 'AUTUMN', label: 'Sonbahar' },
  { value: 'WINTER', label: 'Kış' },
];

const monthOptions = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const geoTypeOptions = ref<Array<{ value: string; label: string; imageUrl: string }>>([]);
const featureOptions = ref<Array<{ value: string; label: string; imageUrl: string }>>([]);

const categoryTree = ref<CategoryNode[]>([]);

const variationGroups = ref<VariationGroup[]>([
  { key: 'COLOR', label: 'Renk', options: [] },
  { key: 'SIZE', label: 'Beden', options: [] },
  { key: 'NUMBER', label: 'Numara', options: [] },
  { key: 'OPTION', label: 'Seçenek', options: [] },
  { key: 'VARIATION', label: 'Varyasyon', options: [] },
]);

const form = reactive<ProductAdminForm>({
  sellerId: '',
  title: '',
  description: '',
  price: '',
  stockQuantity: '',
  sku: '',
  barcodeNo: '',
  brand: '',
  categoryId: '',
  status: 'DRAFT',
  productContent: '',
  sellerNotes: '',
  originCountry: 'TR',
  originRegion: '',
  productionProvince: '',
  productionDistrict: '',
  productionSeason: 'ALL_TIME',
  salesMonths: [],
  productImageUrls: '',
  certificateNotes: '',
  certificateImageUrls: '',
  geoIndicationCertNo: '',
  geoIndicationRegion: '',
  geoIndicationReceivedAt: '',
  shippingProvince: '',
  shippingDistrict: '',
  shippingAddress: '',
  deliveryLocations: '',
  imageUrl: '',
  retailPrice: '',
  wholesalePrice: '',
  askPriceMinAmount: '',
  askPriceEnabled: 'false',
  titleEn: '',
  descriptionEn: '',
  storyEn: '',
  story: '',
  googleCategory: '',
  googleCategoryEn: '',
  supplierId: '',
  supplierName: '',
  productCode: '',
  categoryText: '',
  subCategoryText: '',
  subCategoryText2: '',
  isPreorder: 'false',
  returnable: 'true',
  freeShipping: 'false',
  salesRegion: 'Türkiye',
  productLink: '',
  auctionLink: '',
  gtin: '',
  supplierBrand: '',
  isEndemigoBrandCandidate: 'false',
  discountRate: '',
  shippingCountry: 'TR',
  mpn: '',
  deliveryTemplate: '',
  deliveryTemplateDomestic: 'Seçiniz',
  deliveryTemplateInternational: 'Seçiniz',
  desiDomestic: '',
  desiInternational: '',
  currency: 'TRY',
  weight: '',
  geoIndicationName: '',
  geoIndicationRegionEn: '',
  seoTitle: '',
  seoDescription: '',
  seoKeywords: '',
  productLinkEn: '',
  cargoNote: '',
});

const selectedCategoryIds = ref<string[]>([]);
const selectedSalesMonths = ref<number[]>([]);
const selectedFeatures = ref<string[]>([]);
const selectedGeoTypes = ref<string[]>([]);
const variationState = reactive<Record<string, VariationValue>>({});

initializeVariationState();

const discountedRetailPrice = computed(() => {
  const retail = Number(form.retailPrice);
  const discountRate = Number(form.discountRate);
  if (!Number.isFinite(retail) || !Number.isFinite(discountRate)) return '';
  const next = retail - (retail * discountRate) / 100;
  return next >= 0 ? next.toFixed(2) : '';
});

const categoryGroupsView = computed<CategoryGroupView[]>(() =>
  categoryTree.value.map((root) => ({
    id: root.id,
    label: root.label,
    rows: flattenCategoryRows(root.children, 1),
  })),
);

function initializeVariationState(): void {
  variationGroups.value.forEach((group) => {
    group.options.forEach((option) => {
      const key = variationKey(group.key, option.id);
      if (!variationState[key]) {
        variationState[key] = {
          selected: false,
          extraPrice: '',
          stock: '',
        };
      }
    });
  });
}

function flattenCategoryRows(nodes: CategoryNode[], depth: number): Array<{ id: string; label: string; depth: number }> {
  return nodes.flatMap((node) => [
    { id: node.id, label: node.label, depth },
    ...flattenCategoryRows(node.children, depth + 1),
  ]);
}

function resetVariationStateWithGroups(): void {
  Object.keys(variationState).forEach((key) => {
    delete variationState[key];
  });
  variationGroups.value.forEach((group) => {
    group.options.forEach((option) => {
      variationState[variationKey(group.key, option.id)] = {
        selected: false,
        extraPrice: '',
        stock: '',
      };
    });
  });
}

function variationKey(group: string, optionId: string): string {
  return `${group}::${optionId}`;
}

function isVariationSelected(group: string, optionId: string): boolean {
  return variationState[variationKey(group, optionId)]?.selected ?? false;
}

function toggleVariation(group: string, optionId: string): void {
  const key = variationKey(group, optionId);
  const current = variationState[key] ?? { selected: false, extraPrice: '', stock: '' };
  variationState[key] = { ...current, selected: !current.selected };
}

function toggleCategory(categoryId: string): void {
  if (selectedCategoryIds.value.includes(categoryId)) {
    selectedCategoryIds.value = selectedCategoryIds.value.filter((id) => id !== categoryId);
    return;
  }
  selectedCategoryIds.value = [...selectedCategoryIds.value, categoryId];
}

function isSelected(categoryId: string): boolean {
  return selectedCategoryIds.value.includes(categoryId);
}

function toggleSalesMonth(month: number): void {
  if (selectedSalesMonths.value.includes(month)) {
    selectedSalesMonths.value = selectedSalesMonths.value.filter((item) => item !== month);
    return;
  }
  selectedSalesMonths.value = [...selectedSalesMonths.value, month].sort((a, b) => a - b);
}

function onProductionProvinceChange(): void {
  if (!productionDistrictOptions.value.includes(form.productionDistrict)) {
    form.productionDistrict = '';
  }
}

function onShippingProvinceChange(): void {
  if (!shippingDistrictOptions.value.includes(form.shippingDistrict)) {
    form.shippingDistrict = '';
  }
}

function toggleFeature(feature: string): void {
  if (selectedFeatures.value.includes(feature)) {
    selectedFeatures.value = selectedFeatures.value.filter((item) => item !== feature);
    return;
  }
  selectedFeatures.value = [...selectedFeatures.value, feature];
}

function toggleGeoType(geoType: string): void {
  if (selectedGeoTypes.value.includes(geoType)) {
    selectedGeoTypes.value = selectedGeoTypes.value.filter((item) => item !== geoType);
    return;
  }
  selectedGeoTypes.value = [...selectedGeoTypes.value, geoType];
}

function openImagePicker(target: 'product' | 'certificate'): void {
  if (target === 'product') {
    productImageInput.value?.click();
    return;
  }
  certificateImageInput.value?.click();
}

function onImageInputChange(event: Event, target: 'product' | 'certificate'): void {
  const input = event.target as HTMLInputElement | null;
  if (!input?.files || input.files.length === 0) return;
  const files = Array.from(input.files);
  void uploadImages(files, target);
  input.value = '';
}

function onDropImages(event: DragEvent, target: 'product' | 'certificate'): void {
  dragTarget.value = null;
  const files = Array.from(event.dataTransfer?.files ?? []);
  if (files.length === 0) return;
  void uploadImages(files, target);
}

function removeImage(target: 'product' | 'certificate', index: number): void {
  if (target === 'product') {
    productImageList.value = productImageList.value.filter((_, itemIndex) => itemIndex !== index);
    syncProductImageFields();
    return;
  }
  certificateImageList.value = certificateImageList.value.filter((_, itemIndex) => itemIndex !== index);
  syncCertificateImageField();
}

function setCoverImage(index: number): void {
  if (index <= 0 || index >= productImageList.value.length) return;
  const next = [...productImageList.value];
  const [selected] = next.splice(index, 1);
  next.unshift(selected);
  productImageList.value = next;
  syncProductImageFields();
}

function syncProductImageFields(): void {
  form.productImageUrls = productImageList.value.join('\n');
  form.imageUrl = productImageList.value[0] ?? '';
}

function syncCertificateImageField(): void {
  form.certificateImageUrls = certificateImageList.value.join('\n');
}

function syncDeliveryLocationsFromSelectedCountries(): void {
  form.deliveryLocations = selectedDeliveryCountries.value.join('\n');
}

async function openSellerModal(): Promise<void> {
  sellerModalOpen.value = true;
  sellerSearch.value = '';
  if (sellerRows.value.length === 0) {
    await loadSellers(1);
  }
}

function closeSellerModal(): void {
  sellerModalOpen.value = false;
}

function mapSellerOption(raw: Record<string, unknown>): SellerOption {
  const id = String(raw.id ?? '');
  const userId = String(raw.userId ?? '');
  const status = String(raw.status ?? '');
  const businessName = String(raw.businessName ?? raw.companyName ?? raw.storeName ?? '').trim();
  const fullName = String(raw.fullName ?? raw.name ?? '').trim();
  const label = businessName || fullName || userId || id;
  return { id, userId, status, label };
}

async function loadSellers(page = 1): Promise<void> {
  const response = await adminApi.get<SellerListResponse>('/admin/sellers', {
    params: {
      page,
      limit: sellerLimit,
    },
  });
  sellerRows.value = (response.data.items ?? []).map((item) => mapSellerOption(item));
  sellerPage.value = Number(response.data.pagination?.page ?? page);
  sellerTotal.value = Number(response.data.pagination?.total ?? sellerRows.value.length);
}

async function changeSellerPage(delta: number): Promise<void> {
  const nextPage = sellerPage.value + delta;
  if (nextPage < 1 || nextPage > sellerTotalPages.value) return;
  await loadSellers(nextPage);
}

function selectSeller(seller: SellerOption): void {
  form.sellerId = seller.userId || seller.id;
  selectedSellerLabel.value = `${seller.label} (${form.sellerId})`;
  if (!form.supplierId) {
    form.supplierId = seller.userId || seller.id;
    form.supplierName = seller.label;
  }
  closeSellerModal();
}

function onSupplierChange(): void {
  const supplier = supplierOptions.value.find(
    (item) => (item.userId || item.id) === form.supplierId,
  );
  form.supplierName = supplier?.label ?? '';
  clearVariationSelections();
}

function clearVariationSelections(): void {
  Object.keys(variationState).forEach((key) => {
    variationState[key] = {
      ...variationState[key],
      selected: false,
      extraPrice: '',
      stock: '',
    };
  });
}

async function loadSupplierOptions(): Promise<void> {
  const pageSize = 1000;
  const collected: SellerOption[] = [];

  const response = await adminApi.get<SellerListResponse>('/admin/sellers', {
    params: {
      page: 1,
      limit: pageSize,
    },
  });
  const mapped = (response.data.items ?? []).map((item) => mapSellerOption(item));
  collected.push(...mapped);

  const unique = new Map<string, SellerOption>();
  collected.forEach((item) => {
    const key = item.userId || item.id;
    if (key && !unique.has(key)) {
      unique.set(key, item);
    }
  });
  supplierOptions.value = Array.from(unique.values()).sort((a, b) =>
    a.label.localeCompare(b.label, 'tr'),
  );
}

function buildSupplierVariationBindings(): Array<{
  supplierId: string;
  supplierName: string;
  variationKind: string;
  variationOptionId: string;
  extraPrice: string;
  stock: string;
}> {
  if (!hasSupplierSelection.value) return [];

  return Object.entries(variationState)
    .filter(([, value]) => value.selected)
    .map(([key, value]) => {
      const [variationKind, variationOptionId] = key.split('::');
      return {
        supplierId: form.supplierId,
        supplierName: form.supplierName,
        variationKind,
        variationOptionId,
        extraPrice: value.extraPrice.trim(),
        stock: value.stock.trim(),
      };
    });
}

async function uploadImages(files: File[], target: 'product' | 'certificate'): Promise<void> {
  const validFiles = files.filter((file) => file.type.startsWith('image/'));
  if (validFiles.length === 0) {
    error.value = 'Sadece görsel dosyaları yüklenebilir.';
    return;
  }

  if (validFiles.some((file) => file.size > 5 * 1024 * 1024)) {
    error.value = 'Tek dosya boyutu en fazla 5 MB olabilir.';
    return;
  }

  uploadingTarget.value = target;
  error.value = null;
  try {
    const uploadedUrls: string[] = [];
    for (const file of validFiles) {
      const formData = new FormData();
      formData.append('file', file);
      const response = await adminApi.post<UploadImageResponse>(
        `/admin/uploads/images?kind=${target}`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        },
      );
      if (response.data.url) {
        uploadedUrls.push(response.data.url);
      }
    }

    if (target === 'product') {
      productImageList.value = [...productImageList.value, ...uploadedUrls];
      syncProductImageFields();
    } else {
      certificateImageList.value = [...certificateImageList.value, ...uploadedUrls];
      syncCertificateImageField();
    }
  } catch (uploadError) {
    error.value = toApiMessage(uploadError);
  } finally {
    uploadingTarget.value = null;
  }
}

function parseExtended(rawValue: unknown): ProductExtendedContent {
  if (typeof rawValue !== 'string' || !rawValue.trim()) {
    return { notes: '', certificateImageUrls: [], deliveryLocations: [] };
  }
  try {
    const parsed = JSON.parse(rawValue) as ProductExtendedContent;
    return {
      notes: parsed.notes ?? '',
      certificateImageUrls: Array.isArray(parsed.certificateImageUrls) ? parsed.certificateImageUrls : [],
      deliveryLocations: Array.isArray(parsed.deliveryLocations) ? parsed.deliveryLocations : [],
      adminFormSnapshot:
        parsed.adminFormSnapshot && typeof parsed.adminFormSnapshot === 'object'
          ? parsed.adminFormSnapshot
          : undefined,
    };
  } catch {
    return { notes: rawValue, certificateImageUrls: [], deliveryLocations: [] };
  }
}

function toString(value: unknown, fallback = ''): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  return fallback;
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item));
}

function toNumberArray(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => Number(item))
    .filter((item) => Number.isFinite(item))
    .map((item) => Math.trunc(item));
}

function normalizeCountryCode(value: unknown, fallback = 'TR'): string {
  const raw = toString(value, '').trim();
  if (!raw) return fallback;
  const upper = raw.toUpperCase();
  if (countryOptions.some((item) => item.code === upper)) return upper;
  if (upper === 'TURKIYE' || upper === 'TÜRKİYE' || upper === 'TURKEY') return 'TR';
  return countryCodeByLabel.get(raw.toLocaleLowerCase('tr-TR')) ?? fallback;
}

function parseRequiredMoney(value: string): number {
  const parsed = parseTrMoneyInput(value);
  if (parsed === undefined) {
    throw new Error('Geçerli bir fiyat giriniz.');
  }
  return normalizeMoneyScale(parsed);
}

function parseOptionalMoney(value: string): number | undefined {
  const parsed = parseTrMoneyInput(value);
  return parsed === undefined ? undefined : normalizeMoneyScale(parsed);
}

function applySnapshot(snapshot: Record<string, unknown> | undefined): void {
  if (!snapshot) return;
  form.salesRegion = toString(snapshot.salesRegion, form.salesRegion);
  form.googleCategory = toString(snapshot.googleCategory, form.googleCategory);
  form.googleCategoryEn = toString(snapshot.googleCategoryEn, form.googleCategoryEn);
  form.supplierId = toString(snapshot.supplierId, form.supplierId);
  form.supplierName = toString(snapshot.supplierName, form.supplierName);
  if (!form.supplierId && form.supplierName) {
    const matchedByName = supplierOptions.value.find(
      (item) => item.label.toLowerCase() === form.supplierName.toLowerCase(),
    );
    const matchedById = supplierOptions.value.find(
      (item) => (item.userId || item.id) === form.supplierName,
    );
    const match = matchedByName ?? matchedById;
    if (match) {
      form.supplierId = match.userId || match.id;
      form.supplierName = match.label;
    }
  }
  form.productCode = toString(snapshot.productCode, form.productCode);
  form.categoryText = toString(snapshot.categoryText, form.categoryText);
  form.subCategoryText = toString(snapshot.subCategoryText, form.subCategoryText);
  form.subCategoryText2 = toString(snapshot.subCategoryText2, form.subCategoryText2);
  form.isPreorder = toString(snapshot.isPreorder, form.isPreorder);
  form.returnable = toString(snapshot.returnable, form.returnable);
  form.freeShipping = toString(snapshot.freeShipping, form.freeShipping);
  form.productLink = toString(snapshot.productLink, form.productLink);
  form.auctionLink = toString(snapshot.auctionLink, form.auctionLink);
  form.gtin = toString(snapshot.gtin, form.gtin);
  form.supplierBrand = toString(snapshot.supplierBrand, form.supplierBrand);
  form.isEndemigoBrandCandidate = toString(snapshot.isEndemigoBrandCandidate, form.isEndemigoBrandCandidate);
  form.shippingCountry = toString(snapshot.shippingCountry, form.shippingCountry);
  form.mpn = toString(snapshot.mpn, form.mpn);
  const legacyDeliveryTemplate = toString(snapshot.deliveryTemplate, form.deliveryTemplate);
  form.deliveryTemplateDomestic = toString(
    snapshot.deliveryTemplateDomestic,
    form.deliveryTemplateDomestic,
  );
  form.deliveryTemplateInternational = toString(
    snapshot.deliveryTemplateInternational,
    form.deliveryTemplateInternational,
  );
  if (
    legacyDeliveryTemplate &&
    form.deliveryTemplateDomestic === 'Seçiniz' &&
    form.deliveryTemplateInternational === 'Seçiniz'
  ) {
    const [domestic, international] = legacyDeliveryTemplate
      .split('||')
      .map((part) => part.trim());
    form.deliveryTemplateDomestic = domestic || legacyDeliveryTemplate;
    form.deliveryTemplateInternational = international || 'Seçiniz';
  }
  form.deliveryTemplate = `${form.deliveryTemplateDomestic} || ${form.deliveryTemplateInternational}`;
  form.desiDomestic = toString(snapshot.desiDomestic, form.desiDomestic);
  form.desiInternational = toString(snapshot.desiInternational, form.desiInternational);
  form.currency = toString(snapshot.currency, form.currency);
  form.geoIndicationName = toString(snapshot.geoIndicationName, form.geoIndicationName);
  form.geoIndicationRegionEn = toString(snapshot.geoIndicationRegionEn, form.geoIndicationRegionEn);
  form.story = toString(snapshot.story, form.story);
  form.storyEn = toString(snapshot.storyEn, form.storyEn);
  form.titleEn = toString(snapshot.titleEn, form.titleEn);
  form.productLinkEn = toString(snapshot.productLinkEn, form.productLinkEn);
  form.descriptionEn = toString(snapshot.descriptionEn, form.descriptionEn);
  form.seoTitle = toString(snapshot.seoTitle, form.seoTitle);
  form.seoDescription = toString(snapshot.seoDescription, form.seoDescription);
  form.seoKeywords = toString(snapshot.seoKeywords, form.seoKeywords);
  form.cargoNote = toString(snapshot.cargoNote, form.cargoNote);
  if (!form.supplierName && form.supplierId) {
    const supplier = supplierOptions.value.find((item) => (item.userId || item.id) === form.supplierId);
    form.supplierName = supplier?.label ?? form.supplierName;
  }
  selectedCategoryIds.value = toStringArray(snapshot.selectedCategoryIds);
  selectedSalesMonths.value = toNumberArray(snapshot.selectedSalesMonths);
  selectedFeatures.value = toStringArray(snapshot.selectedFeatures);
  selectedGeoTypes.value = toStringArray(snapshot.selectedGeoTypes);
  const savedVariationState =
    snapshot.variationState && typeof snapshot.variationState === 'object'
      ? (snapshot.variationState as Record<string, unknown>)
      : {};
  Object.entries(savedVariationState).forEach(([key, value]) => {
    if (value && typeof value === 'object' && key in variationState) {
      const state = value as Record<string, unknown>;
      variationState[key] = {
        selected: Boolean(state.selected),
        extraPrice: toString(state.extraPrice),
        stock: toString(state.stock),
      };
    }
  });
}

async function loadProduct(): Promise<void> {
  if (!isEdit.value || !props.id) return;
  try {
    const response = await adminApi.get<ProductDetailResponse>(`/admin/products/${props.id}`);
    const overview = response.data.overview ?? {};
    const extra = parseExtended(overview.additionalCertificates);

    form.sellerId = toString(overview.sellerId);
    form.title = toString(overview.title);
    form.description = toString(overview.description);
    form.price = toString(overview.price);
    form.stockQuantity = toString(overview.stockQuantity);
    form.sku = toString(overview.sku);
    form.barcodeNo = toString(overview.barcodeNo);
    form.brand = toString(overview.brand);
    form.categoryId = toString(overview.categoryId);
    form.status = toString(overview.status, 'DRAFT');
    form.productContent = toString(overview.productContent);
    form.sellerNotes = toString(overview.sellerNotes);
    form.originCountry = normalizeCountryCode(overview.originCountry, 'TR');
    form.originRegion = toString(overview.originRegion);
    form.productionProvince = toString(overview.productionProvince);
    form.productionDistrict = toString(overview.productionDistrict);
    form.productionSeason = toString(overview.productionSeason, 'ALL_TIME');
    form.salesMonths = Array.isArray(overview.salesMonths)
      ? (overview.salesMonths as number[]).filter((item) => Number.isFinite(item))
      : [];
    form.imageUrl = toString(overview.imageUrl);
    form.productImageUrls = Array.isArray(overview.images)
      ? (overview.images as Array<{ url?: string }>).map((img) => img.url ?? '').filter((url) => url.length > 0).join('\n')
      : form.imageUrl;
    form.certificateNotes = extra.notes;
    form.certificateImageUrls = extra.certificateImageUrls.join('\n');
    form.geoIndicationCertNo = toString(overview.geoIndicationCertNo);
    form.geoIndicationRegion = toString(overview.geoIndicationRegion);
    form.geoIndicationReceivedAt = toString(overview.geoIndicationReceivedAt);
    form.shippingProvince = toString(overview.shippingProvince);
    form.shippingDistrict = toString(overview.shippingDistrict);
    form.shippingAddress = toString(overview.shippingAddress);
    form.deliveryLocations = extra.deliveryLocations.join('\n');
    selectedDeliveryCountries.value = extra.deliveryLocations;
    form.wholesalePrice = toString(overview.wholesalePrice);
    form.retailPrice = toString(overview.retailPrice);
    form.askPriceMinAmount = toString(overview.askPriceMinAmount);
    form.askPriceEnabled = toString(overview.askPriceEnabled, 'false');
    form.weight = toString(overview.weight);
    form.desiDomestic = toString(overview.desiDomestic, form.desiDomestic);
    form.desiInternational = toString(overview.desiInternational, form.desiInternational);
    form.deliveryTemplateDomestic = toString(
      overview.deliveryTemplateDomestic,
      form.deliveryTemplateDomestic,
    );
    form.deliveryTemplateInternational = toString(
      overview.deliveryTemplateInternational,
      form.deliveryTemplateInternational,
    );
    selectedFeatures.value = toStringArray(overview.featureBadges);
    selectedGeoTypes.value = toStringArray(overview.geoBadgeSelections);
    const legacyDeliveryTemplate = toString(overview.deliveryTemplate, '');
    if (legacyDeliveryTemplate) {
      const [domestic, international] = legacyDeliveryTemplate
        .split('||')
        .map((part) => part.trim());
      form.deliveryTemplateDomestic = domestic || form.deliveryTemplateDomestic;
      form.deliveryTemplateInternational = international || form.deliveryTemplateInternational;
      form.deliveryTemplate = legacyDeliveryTemplate;
    }
    selectedSellerLabel.value = form.sellerId ? form.sellerId : '';

    applySnapshot(extra.adminFormSnapshot);
    productImageList.value = form.productImageUrls
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
    certificateImageList.value = form.certificateImageUrls
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
    selectedDeliveryCountries.value = form.deliveryLocations
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
    syncProductImageFields();
    syncCertificateImageField();
    if (selectedSalesMonths.value.length === 0 && Array.isArray(overview.salesMonths)) {
      selectedSalesMonths.value = (overview.salesMonths as number[]).filter((item) => Number.isFinite(item));
    }
  } catch (loadError) {
    error.value = toApiMessage(loadError);
  }
}

async function loadCategoriesFromDb(): Promise<void> {
  const limit = 1000;
  const allItems: CategoryFlatItem[] = [];

  const response = await adminApi.get<CategoryListResponse>('/admin/categories', {
    params: { page: 1, limit },
  });
  const items = (response.data.items ?? []).map((item) => ({
    id: String(item.id ?? ''),
    name: String(item.name ?? ''),
    parentId: item.parentId ? String(item.parentId) : null,
  }));
  allItems.push(...items.filter((item) => item.id && item.name));

  const nodeMap = new Map<string, CategoryNode>();
  allItems.forEach((item) => {
    nodeMap.set(item.id, { id: item.id, label: item.name, children: [] });
  });

  const roots: CategoryNode[] = [];
  allItems.forEach((item) => {
    const node = nodeMap.get(item.id);
    if (!node) return;
    if (!item.parentId || !nodeMap.has(item.parentId)) {
      roots.push(node);
      return;
    }
    nodeMap.get(item.parentId)?.children.push(node);
  });

  roots.sort((a, b) => a.label.localeCompare(b.label, 'tr'));
  roots.forEach((node) => sortCategoryNode(node));
  categoryTree.value = roots;
}

async function loadGeoIndicationsFromDb(): Promise<void> {
  try {
    const response = await adminApi.get('/admin/geo-indications', {
      params: { page: 1, limit: 150 },
    });
    const items = response.data.items ?? [];
    geoTypeOptions.value = items
      .filter((item: any) => item.isActive)
      .map((item: any) => ({
        value: item.code || item.id,
        label: item.name,
        imageUrl: item.logoUrl || '',
      }));
  } catch (err) {
    console.error('Failed to load geo indications:', err);
  }
}

async function loadFeaturesFromDb(): Promise<void> {
  try {
    const response = await adminApi.get('/admin/feature-badges', {
      params: { page: 1, limit: 150 },
    });
    const items = response.data.items ?? [];
    featureOptions.value = items
      .filter((item: any) => item.isActive)
      .map((item: any) => ({
        value: item.code || item.id,
        label: item.name,
        imageUrl: item.logoUrl || '',
      }));
  } catch (err) {
    console.error('Failed to load features:', err);
  }
}

function sortCategoryNode(node: CategoryNode): void {
  node.children.sort((a, b) => a.label.localeCompare(b.label, 'tr'));
  node.children.forEach(sortCategoryNode);
}

async function loadVariationsFromDb(): Promise<void> {
  const kinds: Array<{ key: VariationGroup['key']; label: string }> = [
    { key: 'COLOR', label: 'Renk' },
    { key: 'SIZE', label: 'Beden' },
    { key: 'NUMBER', label: 'Numara' },
    { key: 'OPTION', label: 'Seçenek' },
    { key: 'VARIATION', label: 'Varyasyon' },
  ];

  const groups = await Promise.all(
    kinds.map(async (kindInfo) => {
      const limit = 1000;
      const options: VariationGroup['options'] = [];

      const response = await adminApi.get<VariantListResponse>('/admin/variants/numbers', {
        params: {
          page: 1,
          limit,
          kind: kindInfo.key,
          status: 'ACTIVE',
        },
      });
      const items = response.data.items ?? [];
      items.forEach((item) => {
        options.push({
          id: String(item.id),
          label: String(item.nameTr || item.nameEn || item.id),
        });
      });

      return {
        key: kindInfo.key,
        label: kindInfo.label,
        options,
      } satisfies VariationGroup;
    }),
  );

  variationGroups.value = groups;
  resetVariationStateWithGroups();
}

function goBack(): void {
  void router.back();
}

function setFormMode(mode: 'quick' | 'full'): void {
  isQuickMode.value = mode === 'quick';
  if (!visibleTabs.value.some((tab) => tab.key === activeTab.value)) {
    activeTab.value = 'general';
  }
}

function buildAdminSnapshot(): Record<string, unknown> {
  return {
    salesRegion: form.salesRegion,
    googleCategory: form.googleCategory,
    googleCategoryEn: form.googleCategoryEn,
    supplierId: form.supplierId,
    supplierName: form.supplierName,
    productCode: form.productCode,
    categoryText: form.categoryText,
    subCategoryText: form.subCategoryText,
    subCategoryText2: form.subCategoryText2,
    isPreorder: form.isPreorder,
    returnable: form.returnable,
    freeShipping: form.freeShipping,
    productLink: form.productLink,
    auctionLink: form.auctionLink,
    gtin: form.gtin,
    supplierBrand: form.supplierBrand,
    isEndemigoBrandCandidate: form.isEndemigoBrandCandidate,
    shippingCountry: form.shippingCountry,
    mpn: form.mpn,
    deliveryTemplateDomestic: form.deliveryTemplateDomestic,
    deliveryTemplateInternational: form.deliveryTemplateInternational,
    deliveryTemplate: `${form.deliveryTemplateDomestic} || ${form.deliveryTemplateInternational}`,
    desiDomestic: form.desiDomestic,
    desiInternational: form.desiInternational,
    featureBadges: selectedFeatures.value,
    geoBadgeSelections: selectedGeoTypes.value,
    currency: form.currency,
    geoIndicationName: form.geoIndicationName,
    geoIndicationRegionEn: form.geoIndicationRegionEn,
    story: form.story,
    storyEn: form.storyEn,
    titleEn: form.titleEn,
    productLinkEn: form.productLinkEn,
    descriptionEn: form.descriptionEn,
    seoTitle: form.seoTitle,
    seoDescription: form.seoDescription,
    seoKeywords: form.seoKeywords,
    cargoNote: form.cargoNote,
    selectedCategoryIds: selectedCategoryIds.value,
    selectedSalesMonths: selectedSalesMonths.value,
    selectedFeatures: selectedFeatures.value,
    selectedGeoTypes: selectedGeoTypes.value,
    supplierVariationBindings: buildSupplierVariationBindings(),
    variationState,
  };
}

async function submit(): Promise<void> {
  if ((!isSellerOnly.value && !form.sellerId.trim()) || !form.title.trim() || !form.price.trim()) {
    error.value = 'Satıcı ID, Ürün Adı ve Fiyat zorunludur.';
    return;
  }

  saving.value = true;
  error.value = null;

  let metadata: Record<string, unknown>;
  try {
    metadata = {
      sellerId: form.sellerId.trim(),
      title: form.title.trim(),
      description: form.description,
      price: parseRequiredMoney(form.price),
      stockQuantity: Number(form.stockQuantity || 0),
      sku: form.sku,
      barcodeNo: form.barcodeNo || form.gtin,
      brand: form.brand,
      supplierId: form.supplierId,
      supplierName: form.supplierName,
      categoryId: form.categoryId || selectedCategoryIds.value[0] || '',
      status: form.status,
      productContent: form.productContent,
      sellerNotes: form.sellerNotes,
      originCountry: normalizeCountryCode(form.originCountry, 'TR'),
      originRegion: form.originRegion,
      productionProvince: form.productionProvince,
      productionDistrict: form.productionDistrict,
      productionSeason: form.productionSeason,
      salesMonths: selectedSalesMonths.value,
      productImageUrls: form.productImageUrls,
      certificateNotes: form.certificateNotes,
      certificateImageUrls: form.certificateImageUrls,
      geoIndicationCertNo: form.geoIndicationCertNo,
      geoIndicationRegion: form.geoIndicationRegion,
      geoIndicationReceivedAt: form.geoIndicationReceivedAt,
      shippingProvince: form.shippingProvince,
      shippingDistrict: form.shippingDistrict,
      shippingAddress: form.shippingAddress,
      deliveryLocations: form.deliveryLocations,
      wholesalePrice: parseOptionalMoney(form.wholesalePrice),
      retailPrice: parseOptionalMoney(form.retailPrice),
      askPriceMinAmount: parseOptionalMoney(form.askPriceMinAmount),
      askPriceEnabled: form.askPriceEnabled === 'true',
      weight: parseOptionalMoney(form.weight),
      deliveryTemplateDomestic: form.deliveryTemplateDomestic,
      deliveryTemplateInternational: form.deliveryTemplateInternational,
      desiDomestic: form.desiDomestic,
      desiInternational: form.desiInternational,
      featureBadges: selectedFeatures.value,
      geoBadgeSelections: selectedGeoTypes.value,
      isEndemigoBrandCandidate: form.isEndemigoBrandCandidate === 'true',
      adminFormSnapshot: buildAdminSnapshot(),
    };
  } catch (formError) {
    error.value = toApiMessage(formError);
    saving.value = false;
    return;
  }

  const reason = isEdit.value
    ? 'Admin ürün formu güncellemesi'
    : 'Admin ürün formu oluşturma';

  try {
    if (isEdit.value && props.id) {
      await adminApi.patch(`/admin/products/${props.id}`, { reason, metadata });
    } else {
      await adminApi.post('/admin/products', { reason, metadata });
    }
    await router.push('/products');
  } catch (saveError) {
    error.value = toApiMessage(saveError);
  } finally {
    saving.value = false;
  }
}

onMounted(async () => {
  try {
    await Promise.all([
      loadCategoriesFromDb(),
      loadVariationsFromDb(),
      loadSupplierOptions(),
      loadGeoIndicationsFromDb(),
      loadFeaturesFromDb(),
    ]);
    if (!isEdit.value) {
      productImageList.value = [];
      certificateImageList.value = [];
      syncProductImageFields();
      syncCertificateImageField();
    }
    await loadProduct();
  } catch (loadError) {
    error.value = toApiMessage(loadError);
  }
});
</script>

<style scoped>
.owner-grid {
  display: grid;
  gap: 10px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.view-mode-switch {
  display: inline-flex;
  gap: 6px;
}

.view-mode-switch .button.is-active {
  border-color: var(--brand-600);
  color: #1f3f73;
  background: #e7efff;
}

.quick-note {
  border: 1px solid #b8c9ea;
  border-radius: 10px;
  background: #f4f8ff;
  padding: 10px 12px;
  font-weight: 600;
  color: #304a73;
}

.seller-picker {
  display: grid;
  gap: 8px;
}

.seller-chip {
  border: 1px solid #bfd0ee;
  border-radius: 10px;
  padding: 8px 10px;
  background: #f5f8ff;
  font-weight: 600;
  color: #2c487b;
}

.seller-chip.empty {
  color: #6b7692;
  font-weight: 500;
}

.brand-select-trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border: 1px solid #bfd0ee;
  border-radius: 10px;
  padding: 8px 12px;
  background: #f5f8ff;
  cursor: pointer;
  font-weight: 600;
  color: #2c487b;
  min-height: 40px;
  transition: all 0.2s ease;
}

.brand-select-trigger.empty {
  border-style: dashed;
  background: #fcfdfe;
  color: #6b7692;
}

.brand-select-trigger:hover {
  border-color: var(--brand-600);
  background: #eef4ff;
}

.brand-select-trigger.empty:hover {
  background: #f4f8ff;
}

.brand-select-trigger .edit-icon {
  opacity: 0;
  color: var(--brand-600);
  transition: opacity 0.2s ease;
  font-size: 0.9rem;
}

.brand-select-trigger:hover .edit-icon {
  opacity: 1;
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

.owner-grid.three-col {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.period-grid {
  align-items: start;
}

.price-row {
  align-items: end;
}

.price-inline-grid {
  display: grid;
  gap: 8px;
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.owner-sep {
  border: 0;
  border-top: 1px solid var(--border-soft);
  margin: 4px 0;
}

.chip-wrap,
.month-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.chip,
.month-chip {
  border: 1px solid var(--border-strong);
  border-radius: 8px;
  background: #f8fbff;
  padding: 6px 10px;
  font-weight: 700;
  opacity: 0.5;
  transition: opacity 0.15s ease, border-color 0.15s ease, background 0.15s ease;
}

.chip.active,
.month-chip.active {
  border-color: var(--brand-600);
  background: #e6eefc;
  color: #203a68;
  opacity: 1;
}

.feature-grid {
  display: grid;
  gap: 8px;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
}

.feature-badge-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.feature-badge {
  border: 1px solid transparent;
  background: transparent;
  border-radius: 999px;
  padding: 3px;
  cursor: pointer;
  opacity: 0.5;
  transition: opacity 0.18s ease, border-color 0.18s ease, transform 0.18s ease;
}

.feature-badge:hover {
  opacity: 0.8;
}

.feature-badge.active {
  opacity: 1;
  border-color: var(--brand-600);
  transform: translateY(-1px);
}

.feature-badge-image {
  width: 50px;
  height: 50px;
  object-fit: contain;
  display: block;
}

.geo-badge-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.geo-badge {
  border: 1px solid transparent;
  background: transparent;
  border-radius: 999px;
  padding: 3px;
  cursor: pointer;
  opacity: 0.5;
  transition: opacity 0.18s ease, border-color 0.18s ease, transform 0.18s ease;
}

.geo-badge:hover {
  opacity: 0.8;
}

.geo-badge.active {
  opacity: 1;
  border-color: var(--brand-600);
  transform: translateY(-1px);
}

.geo-badge-image {
  width: 52px;
  height: 52px;
  object-fit: contain;
  display: block;
}

.geo-badge-fallback {
  width: 52px;
  height: 52px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-soft, #f1f5f9);
  color: var(--text-muted, #64748b);
  border: 1px solid var(--border-soft, #cbd5e1);
  border-radius: 999px;
  font-size: 10px;
  font-weight: 700;
  text-align: center;
  line-height: 1.1;
  padding: 4px;
}

.check-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.category-grid {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
}

.category-col {
  border: 1px solid var(--border-soft);
  border-radius: 8px;
  background: #fbfcff;
  padding: 8px;
  display: grid;
  gap: 6px;
}

.category-title {
  margin-bottom: 4px;
}

.variation-grid {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
}

.variation-panel {
  box-shadow: none;
}

.variation-list {
  max-height: 360px;
  overflow: auto;
  display: grid;
  gap: 6px;
}

.variation-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 86px 70px;
  gap: 8px;
  align-items: center;
}

.hidden-file-input {
  position: absolute;
  opacity: 0;
  pointer-events: none;
  width: 1px;
  height: 1px;
}

.upload-dropzone {
  width: 100%;
  border: 1px dashed #6a8fd2;
  border-radius: 14px;
  padding: 22px;
  background:
    radial-gradient(circle at top right, rgba(66, 134, 244, 0.2), transparent 55%),
    linear-gradient(145deg, #f8fbff, #eef4ff);
  display: grid;
  gap: 6px;
  text-align: left;
  cursor: pointer;
}

.upload-dropzone strong {
  font-size: 0.95rem;
  color: #294d87;
}

.upload-dropzone small {
  color: #5d6a84;
}

.upload-dropzone.upload-dropzone-certificate {
  border-color: #70a5a1;
  background:
    radial-gradient(circle at top right, rgba(67, 154, 139, 0.2), transparent 55%),
    linear-gradient(145deg, #f8fffd, #edf9f6);
}

.upload-dropzone.dragging {
  border-style: solid;
  border-color: #2f63b6;
  box-shadow: 0 0 0 3px rgba(47, 99, 182, 0.15);
}

.upload-grid {
  display: grid;
  gap: 10px;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
}

.upload-card {
  border: 1px solid var(--border-soft);
  border-radius: 12px;
  background: #ffffff;
  overflow: hidden;
}

.upload-preview {
  width: 100%;
  height: 140px;
  object-fit: cover;
  display: block;
}

.upload-card-actions {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  padding: 8px;
}

.upload-card-actions.single {
  justify-content: flex-end;
}

.button.tiny {
  padding: 5px 10px;
  font-size: 0.76rem;
}

.seller-modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(12, 20, 35, 0.42);
  display: grid;
  place-items: center;
  z-index: 1600;
  padding: 16px;
}

.seller-modal {
  width: min(760px, 100%);
  max-height: 90vh;
  overflow: auto;
  border-radius: 14px;
  background: #ffffff;
  border: 1px solid var(--border-soft);
  box-shadow: 0 20px 50px rgba(10, 16, 31, 0.28);
}

.seller-modal-header {
  padding: 12px 14px;
  border-bottom: 1px solid var(--border-soft);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.seller-modal-body {
  padding: 12px;
  display: grid;
  gap: 10px;
}

.seller-list {
  border: 1px solid var(--border-soft);
  border-radius: 10px;
  overflow: hidden;
}

.seller-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 10px 12px;
  border-bottom: 1px solid var(--border-soft);
}

.seller-item:last-child {
  border-bottom: 0;
}

.seller-meta {
  display: grid;
  gap: 3px;
}

.seller-meta small {
  color: #6d7890;
}

.seller-modal-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
}

.input.mini {
  padding: 6px 8px;
}

.delivery-country-select {
  min-height: 220px;
}

.editor-like {
  min-height: 190px;
}

@media (max-width: 960px) {
  .owner-grid,
  .owner-grid.three-col {
    grid-template-columns: 1fr;
  }

  .price-inline-grid {
    grid-template-columns: 1fr;
  }
}
</style>
