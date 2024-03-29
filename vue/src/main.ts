import { createApp } from 'vue'
import type {} from 'antd-vue-volar'
// @ts-ignore
import App from './App.vue'
import 'ant-design-vue/es/message/style'
import 'ant-design-vue/es/notification/style'
import 'ant-design-vue/es/modal/style'
import './index.scss'
import { createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'
import { i18n } from './i18n'
import VueDiff from 'vue-diff'

import 'vue-diff/dist/index.css';

const pinia = createPinia()
pinia.use(piniaPluginPersistedstate)
createApp(App)
  .use(pinia)
  .use(i18n)
  .use(VueDiff, {
    componentName: 'VueDiff',
  })
  .mount('#zanllp_dev_gradio_fe')

