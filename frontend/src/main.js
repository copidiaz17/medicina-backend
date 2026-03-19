import { createApp } from 'vue'
import { createPinia } from 'pinia'
import Toast from 'vue-toastification'
import 'vue-toastification/dist/index.css'
import './assets/css/main.css'
import App from './App.vue'
import router from './router/index.js'
import axios from 'axios'

// En producción apunta al backend de Render; en dev el proxy de Vite maneja /api
if (import.meta.env.VITE_API_URL) {
  axios.defaults.baseURL = import.meta.env.VITE_API_URL
}

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.use(Toast, { position: 'top-right', timeout: 3000, closeOnClick: true })
app.mount('#app')
