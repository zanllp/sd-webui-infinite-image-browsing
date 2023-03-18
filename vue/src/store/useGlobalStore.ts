import type { GlobalConf, UploadTaskSummary } from '@/api'
import type { getAutoCompletedTagList } from '@/taskRecord/autoComplete'
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { typedEventEmitter } from 'vue3-ts-util'

export const useGlobalStore = defineStore('useGlobalStore', () => {
  const conf = ref<GlobalConf>()
  const autoCompletedDirList = ref([] as ReturnType<typeof getAutoCompletedTagList>)

  return {
    conf,
    autoCompletedDirList,
    ...typedEventEmitter<{ createNewTask: Partial<UploadTaskSummary> }>()
  }
})