<!-- eslint-disable no-empty -->
<script setup lang="ts">
import { onMounted, reactive } from 'vue'
import { FetchQueue } from 'vue3-ts-util'
import { getUserInfo } from './api/user'
import { getGlobalSetting } from './api'
import { useGlobalStore } from './store/useGlobalStore'
import { getAutoCompletedTagList } from './taskRecord/autoComplete'
import SplitViewTab from './SplitViewTab/SplitViewTab.vue'

const globalStore = useGlobalStore()
const queue = reactive(new FetchQueue(-1, 0, 0, 'throw'))
onMounted(async () => {
  getGlobalSetting().then(async (resp) => {
    globalStore.conf = resp
    const r = await getAutoCompletedTagList(resp)
    globalStore.autoCompletedDirList = r.filter(v => v?.dir?.trim?.())
  })
  globalStore.user = await queue.pushAction(getUserInfo).res
})

</script>

<template>
  <a-skeleton :loading="!queue.isIdle">
    <split-view-tab />
  </a-skeleton>
</template>
<style scoped lang="scss"> 


</style>