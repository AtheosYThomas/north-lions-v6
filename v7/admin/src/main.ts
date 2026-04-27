import { createApp } from 'vue'
import { createPinia } from 'pinia'
// @ts-ignore
import PrimeVue from 'primevue/config'
// @ts-ignore
import Aura from '@primevue/themes/aura'
import './style.css'
import App from './App.vue'
import router from './router'
import { useAuthStore } from './stores/auth'

const app = createApp(App)

app.use(PrimeVue, {
    theme: {
        preset: Aura,
        options: {
            darkModeSelector: 'none',
        }
    }
})

const pinia = createPinia()
app.use(pinia)
app.use(router)

// Initialize auth store before mounting
const authStore = useAuthStore()
authStore.init()

// ✅ [新增] 全域錯誤捕揔器：避免元件陲十時白畫面
app.config.errorHandler = (err, instance, info) => {
    console.error('[Admin Global Error]', err, '\nComponent:', instance, '\nInfo:', info);
    // 可擴展為通知小表（目前以 console 輸出，安全降級）
};

app.mount('#app')
