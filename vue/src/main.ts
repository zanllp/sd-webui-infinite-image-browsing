import { createApp, watch } from 'vue'
import type {} from 'antd-vue-volar'
// @ts-ignore
import App from './App.vue'
import 'ant-design-vue/es/message/style'
import 'ant-design-vue/es/notification/style'
import 'ant-design-vue/es/modal/style'
import './index.scss'
import { createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'
import { usePreferredDark } from '@vueuse/core'
import { i18n } from './i18n'
import { delay } from 'vue3-ts-util'

const pinia = createPinia()
pinia.use(piniaPluginPersistedstate)
createApp(App).use(pinia).use(i18n).mount('#zanllp_dev_gradio_fe')

const dark = usePreferredDark()

const getParDark = () => {
  try {
    return parent.location.search.includes('theme=dark') // sd-webui的
  } catch (error) {
    //
  }
  return false
}


watch(
  [dark, getParDark],
  async ([selfdark, pardark]) => {
    await delay()
    const head = document.getElementsByTagName('html')[0] // html而不是head保证优先级
    if (selfdark || pardark) {
      document.body.classList.add('dark')
      const darkStyle = document.createElement('style')
      const { default: css } = await import('ant-design-vue/dist/antd.dark.css?inline')
      darkStyle.innerHTML = css
      darkStyle.setAttribute('antd-dark', '')
      head.appendChild(darkStyle)
    } else {
      document.body.classList.remove('dark')
      Array.from(head.querySelectorAll('style[antd-dark]')).forEach((e) => e.remove())
    }
  },
  { immediate: true }
)
