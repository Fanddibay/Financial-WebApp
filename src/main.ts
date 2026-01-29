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
import { usePocketStore } from './stores/pocket'
import { transactionService } from './services/transactionService'
import { MAIN_POCKET_ID } from './services/pocketService'

const tokenStore = useTokenStore()
tokenStore.getOrCreateDeviceId()

const pocketStore = usePocketStore()
pocketStore.init()
transactionService.migratePocketIds(MAIN_POCKET_ID)

app.mount('#app')
