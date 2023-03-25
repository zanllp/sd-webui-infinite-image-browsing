import type { GlobalConf, UploadTaskSummary } from '@/api'
import type { getAutoCompletedTagList } from '@/taskRecord/autoComplete'
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { typedEventEmitter } from 'vue3-ts-util'

export const useGlobalStore = defineStore('useGlobalStore', () => {
  const conf = ref<GlobalConf>()
  const autoCompletedDirList = ref([] as ReturnType<typeof getAutoCompletedTagList>)
  const enableThumbnail = ref(true)
  const stackViewSplit = ref(50)
  return {
    conf,
    autoCompletedDirList,
    enableThumbnail,
    stackViewSplit,
    ...typedEventEmitter<{ createNewTask: Partial<UploadTaskSummary> }>()
  }
}, {
  persist: {
    paths: ['enableThumbnail', 'stackViewSplit']
  }
})