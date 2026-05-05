<template>
  <main class="login-page">
    <section class="panel login-panel" aria-labelledby="login-title">
      <div class="panel-header">
        <div>
          <h1 id="login-title">Endemigo Admin</h1>
          <p class="muted">Ayrı yönetici erişimi</p>
        </div>
      </div>

      <form class="panel-body field-grid" @submit.prevent="submit">
        <label class="field">
          <span>E-posta</span>
          <input v-model.trim="email" class="input" type="email" autocomplete="email" required />
        </label>

        <label class="field">
          <span>Şifre</span>
          <input
            v-model="password"
            class="input"
            type="password"
            autocomplete="current-password"
            required
          />
        </label>

        <p v-if="errorMessage" class="error-text">{{ errorMessage }}</p>

        <button class="button primary" type="submit" :disabled="auth.loading">
          <i class="pi pi-lock" aria-hidden="true" />
          {{ auth.loading ? 'Giriş yapılıyor' : 'Giriş yap' }}
        </button>
      </form>
    </section>
  </main>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAdminAuthStore } from '../stores/adminAuth';

const auth = useAdminAuthStore();
const route = useRoute();
const router = useRouter();

const devDefaultEmail = import.meta.env.DEV
  ? import.meta.env.VITE_ADMIN_DEFAULT_EMAIL ?? 'admin@endemigo.test'
  : '';
const devDefaultPassword = import.meta.env.DEV
  ? import.meta.env.VITE_ADMIN_DEFAULT_PASSWORD ?? 'Secret123!'
  : '';

const email = ref(devDefaultEmail);
const password = ref(devDefaultPassword);
const localError = ref<string | null>(null);

const errorMessage = computed(() => localError.value ?? auth.error);

async function submit() {
  localError.value = null;

  try {
    await auth.login(email.value, password.value);
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/';
    await router.push(redirect);
  } catch {
    localError.value = auth.error ?? 'Giriş başarısız';
  }
}
</script>
