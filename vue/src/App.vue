<!-- eslint-disable no-empty -->
<script setup lang="ts">
import { onMounted } from 'vue'
import { getGlobalSetting } from './api'
import { useGlobalStore } from './store/useGlobalStore'
import { getAutoCompletedTagList } from '@/page/taskRecord/autoComplete'
import SplitViewTab from '@/page/SplitViewTab/SplitViewTab.vue'
import { createReactiveQueue, globalEvents, useGlobalEventListen } from './util'

const globalStore = useGlobalStore()
const queue = createReactiveQueue()

useGlobalEventListen('updateGlobalSetting', async () => {

  const resp = await getGlobalSetting()
  globalStore.conf = resp
  const r = await getAutoCompletedTagList(resp)
  globalStore.autoCompletedDirList = r.filter((v) => v?.dir?.trim?.())
})
onMounted(async () => {
  globalEvents.emit('updateGlobalSetting')
})
</script>

<template>
  <a-skeleton :loading="!queue.isIdle">
    <SplitViewTab />
  </a-skeleton>
</template>
<style scoped lang="scss"></style>
