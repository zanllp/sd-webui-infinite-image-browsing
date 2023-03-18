import type { GlobalConf } from '@/api'
import type { getAutoCompletedTagList } from '@/taskRecord/autoComplete'
import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useGlobalStore = defineStore('useGlobalStore', () => {
  const conf = ref<GlobalConf>()
  const autoCompletedDirList = ref([] as ReturnType<typeof getAutoCompletedTagList>)
  return {
    conf,
    autoCompletedDirList
  }
})