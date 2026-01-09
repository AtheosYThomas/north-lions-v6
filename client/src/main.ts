
import { createApp } from 'vue';
import './style.css';
import App from './App.vue';
import router from './router';
import { createPinia } from 'pinia';
import { useUserStore } from './stores/user';

const pinia = createPinia();
const app = createApp(App);

app.use(router);
app.use(pinia);

// Initialize Auth Listener
const userStore = useUserStore();
userStore.initAuth();

app.mount('#app');
