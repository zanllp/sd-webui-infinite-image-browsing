import { createApp } from 'vue'
import App from './App.vue'
import { gradioApp, asyncCheck } from './util/index'
const getContainer = () => document.querySelector("#zanllp_dev_gradio_fe") || gradioApp()?.querySelector("#baidu_netdisk_container")
asyncCheck(getContainer, 300, Infinity)
  .then(el => createApp(App).mount(el!))

