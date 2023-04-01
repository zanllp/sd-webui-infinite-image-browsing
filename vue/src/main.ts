import { createApp, watch } from 'vue'
import App from './App.vue'
import "antd-vue-volar"
import 'ant-design-vue/es/message/style'
import 'ant-design-vue/es/notification/style'
import 'ant-design-vue/es/modal/style'
import './index.scss'
import { createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'
import { usePreferredDark } from '@vueuse/core'

const pinia = createPinia()
pinia.use(piniaPluginPersistedstate)
createApp(App).use(pinia).mount('#zanllp_dev_gradio_fe')

const dark = usePreferredDark()
watch(dark, (dark) => {
  if (dark) {
    import('ant-design-vue/dist/antd.dark.css')
  } else {
    const head = document.getElementsByTagName('head')[0]
    Array.from(head.querySelectorAll('link[href*="antd.dark"]')).forEach(e => e.remove()); // for prod
    Array.from(head.querySelectorAll('style[data-vite-dev-id*="antd.dark"]')).forEach(e => e.remove()); // for dev
  }
}, { immediate: true })