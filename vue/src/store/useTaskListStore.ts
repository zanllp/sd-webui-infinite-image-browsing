import { checkBaiduyunExists, type UploadTaskSummary, type UploadTaskTickStatus } from '@/api'
import { defineStore } from 'pinia'
import { reactive, ref } from 'vue'
import { FetchQueue } from 'vue3-ts-util'
import type { WithId } from 'vue3-ts-util'

export const useTaskListStore = defineStore('useTaskListStore', () => {
  const taskLogMap = ref(new Map<string, UploadTaskTickStatus[]>())
  const splitView = reactive({ open: false, percent: 50 })
  const currLogDetailId = ref('')
  const queue = reactive(new FetchQueue())
  const pollInterval = ref(3)
  const tasks = ref<WithId<UploadTaskSummary>[]>([])

  const showDirAutoCompletedIdx = ref(-1)
  const baiduyunInstalled = ref(null as null | Promise<boolean>)
  const checkBaiduyunInstalled =  async  () => {
    if (baiduyunInstalled.value === null) {
      baiduyunInstalled.value = checkBaiduyunExists()
    }
    return baiduyunInstalled.value
  }
  return {
    checkBaiduyunInstalled,
    baiduyunInstalled,
    pollInterval,
    taskLogMap,
    splitView,
    currLogDetailId,
    queue,
    tasks,
    showDirAutoCompletedIdx
  }
}, {
  persist: {
    paths: ['pollInterval', 'splitView', 'tasks'],
    key: 'useTaskListStore-v0.0.1'
  }
})