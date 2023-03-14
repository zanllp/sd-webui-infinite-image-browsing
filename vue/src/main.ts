import { createApp, watch } from 'vue'
import App from './App.vue'
import "antd-vue-volar"
import 'ant-design-vue/es/message/style'
import 'ant-design-vue/es/notification/style'
import 'ant-design-vue/es/modal/style'
import './index.scss'
import { useElementSize } from '@vueuse/core'
import { createPinia } from 'pinia'

import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'
const pinia = createPinia()
pinia.use(piniaPluginPersistedstate)
createApp(App).use(pinia).mount('#zanllp_dev_gradio_fe')

const { width, height } =  useElementSize(document.querySelector('#zanllp_dev_gradio_fe') as HTMLElement)

watch([width, height], ([width, height]) => {
  window.parent.postMessage({ width, height, type: 'iframe-size-update' }, '*')
}, {
  immediate: true
})
