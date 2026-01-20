import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'
import { installFontAwesome } from './plugins/fontawesome'
import { useThemeStore } from './stores/theme'
import i18n from './i18n'

const app = createApp(App)

const pinia = createPinia()
app.use(pinia)
app.use(router)
app.use(i18n)
installFontAwesome(app)

// Initialize theme before mounting
const themeStore = useThemeStore()
themeStore.initTheme()

// Initialize token store to ensure device UUID is generated on first load
import { useTokenStore } from './stores/token'
const tokenStore = useTokenStore()
// This will generate and store device UUID if it doesn't exist
tokenStore.getOrCreateDeviceId()

app.mount('#app')
