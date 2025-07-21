import './assets/main.css'

import { createApp } from 'vue'
import FloatingVue from 'floating-vue'
import 'floating-vue/dist/style.css'
import App from './App.vue'
import router from './router'
import { initializeAuth } from './services/api-client'

// Initialize auth headers from stored token
initializeAuth()

const app = createApp(App)

app.use(router)

app.use(FloatingVue)

app.mount('#app')
