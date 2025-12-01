import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import App from './App.vue'
import './style.css'

// Redirection HTTP → HTTPS en production
if (import.meta.env.PROD && location.protocol === 'http:' && location.hostname !== 'localhost') {
  location.replace(`https:${location.href.substring(location.protocol.length)}`)
}

const app = createApp(App)

app.use(createPinia())
app.use(router)

app.mount('#app')
