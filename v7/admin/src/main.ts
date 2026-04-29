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
import liff from '@line/liff'
import { getAdminLiffId } from './lib/liffConfig'

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

app.config.errorHandler = (err, instance, info) => {
    console.error('[Admin Global Error]', err, '\nComponent:', instance, '\nInfo:', info);
};

const initApp = async () => {
  const LIFF_ID = getAdminLiffId()
  const allowLocalLiff = import.meta.env.VITE_LIFF_ALLOW_LOCAL === '1'
  const isLocalHost = ['127.0.0.1', 'localhost'].includes(window.location.hostname)
  if (LIFF_ID && (!isLocalHost || allowLocalLiff)) {
    try {
      await liff.init({ liffId: LIFF_ID })
      console.log('Admin LIFF init OK')
    } catch (e) {
      console.error('Admin LIFF init failed:', e)
    }
  }

  const authStore = useAuthStore()
  authStore.init()

  app.mount('#app')
  if (typeof document !== 'undefined') {
    document.body.setAttribute('data-admin-mounted', '1')
  }
}

void initApp()
