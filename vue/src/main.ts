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
watch(dark, async (dark) => {
  const head = document.getElementsByTagName('head')[0]
  if (dark) {
    const darkStyle = document.createElement('style')
    const { default: css } = await import('ant-design-vue/dist/antd.dark.css?inline')
    darkStyle.innerHTML = css
    darkStyle.setAttribute('antd-dark', '')
    head.appendChild(darkStyle)
  } else {
    Array.from(head.querySelectorAll('style[antd-dark]')).forEach(e => e.remove()) // for dev
  }
}, { immediate: true })