<script setup lang="ts">
import { onMounted, watch } from 'vue'
import { getGlobalSetting } from './api'
import { useGlobalStore } from './store/useGlobalStore'
import { getQuickMovePaths } from '@/page/taskRecord/autoComplete'
import SplitViewTab from '@/page/SplitViewTab/SplitViewTab.vue'
import { createReactiveQueue, globalEvents, useGlobalEventListen } from './util'
import { resolveQueryActions } from './queryActions'
import { refreshTauriConf, tauriConf } from './util/tauriAppConf'
import { openModal } from './taurilaunchModal'
import { isTauri } from './util/env'
import { delay } from 'vue3-ts-util'
import { exportFn } from './defineExportFunc'

const globalStore = useGlobalStore()
const queue = createReactiveQueue()

useGlobalEventListen('updateGlobalSetting', async () => {
  await refreshTauriConf()
  console.log(tauriConf.value)
  const resp = await getGlobalSetting()
  globalStore.conf = resp
  const r = await getQuickMovePaths(resp)
  globalStore.quickMovePaths = r.filter((v) => v?.dir?.trim?.())
  exportFn(globalStore)
  resolveQueryActions(globalStore)
})

useGlobalEventListen('returnToIIB', async () => {
  const conf = globalStore.conf
  if (!conf) {
    return
  }
  const gs = conf.global_setting
  if (!gs.outdir_txt2img_samples && !gs.outdir_img2img_samples) {
    return
  }
  const set = new Set(globalStore.quickMovePaths.map(v => v.key))
  if (set.has('outdir_txt2img_samples') && set.has('outdir_img2img_samples')) {
    return
  }
  const r = await getQuickMovePaths(conf)
  globalStore.quickMovePaths = r.filter((v) => v?.dir?.trim?.())
})



watch(
  () => globalStore.computedTheme === 'dark',
  async (enableDark) => {
    await delay()
    const head = document.getElementsByTagName('html')[0] // html而不是head保证优先级    
    if (enableDark) {
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


onMounted(async () => {
  if (isTauri) {
    openModal()
  }
  globalEvents.emit('updateGlobalSetting')
})
</script>

<template>
  <a-skeleton :loading="!queue.isIdle">
    <SplitViewTab />
  </a-skeleton>
</template>
