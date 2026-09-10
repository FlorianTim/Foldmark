import { createPinia } from 'pinia';
import { createApp } from 'vue';
import App from './App.vue';
import { i18n } from '@/presentation/i18n';
import '@/styles/themes.css';
import '@/styles/app.css';

createApp(App).use(createPinia()).use(i18n).mount('#app');
