import 'primeicons/primeicons.css';
import './styles.css';

import { createApp } from 'vue';
import { createPinia } from 'pinia';
import PrimeVue from 'primevue/config';
import App from './App.vue';
import router from './router';

const app = createApp(App);

app.use(createPinia());
app.use(PrimeVue, {
  ripple: true,
});
app.use(router);

app.mount('#app');
