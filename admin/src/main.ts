import 'primeicons/primeicons.css';
import './styles.css';

import { createApp } from 'vue';
import { createPinia } from 'pinia';
import PrimeVue from 'primevue/config';
import ToastService from 'primevue/toastservice';
import App from './App.vue';
import router from './router';
import { initAdminMonitoring } from './services/monitoring';

const app = createApp(App);

app.use(createPinia());
app.use(PrimeVue, {
  ripple: true,
});
app.use(ToastService);
app.use(router);

void initAdminMonitoring(app);

app.mount('#app');
