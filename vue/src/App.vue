<script setup lang="ts">
import { onMounted } from 'vue'
import { getGlobalSetting } from './api'
import { useGlobalStore } from './store/useGlobalStore'
import { getQuickMovePaths } from '@/page/taskRecord/autoComplete'
import SplitViewTab from '@/page/SplitViewTab/SplitViewTab.vue'
import { createReactiveQueue, globalEvents, useGlobalEventListen } from './util'
import { resolveQueryActions } from './queryActions'
import { refreshTauriConf, tauriConf } from './util/tauriAppConf'
import { openModal } from './taurilaunchModal'
import { isTauri } from './util/env'

const globalStore = useGlobalStore()
const queue = createReactiveQueue()

useGlobalEventListen('updateGlobalSetting', async () => {
  await refreshTauriConf()
  console.log(tauriConf.value)
  const resp = await getGlobalSetting()
  globalStore.conf = resp
  const r = await getQuickMovePaths(resp)
  globalStore.quickMovePaths = r.filter((v) => v?.dir?.trim?.())
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
