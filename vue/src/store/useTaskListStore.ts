import type { UploadTaskTickStatus } from '@/api'
import { defineStore } from 'pinia'
import { reactive, ref } from 'vue'
import { FetchQueue } from 'vue3-ts-util'

export const useTaskListStore = defineStore('useTaskListStore', () => {
  const taskLogMap = ref(new Map<string, UploadTaskTickStatus[]>())
  const splitView = reactive({ open: false, percent: 50 })
  const currLogDetailId = ref('')
  const queue = reactive(new FetchQueue())
  const pollInterval = ref(3)
  return {
    pollInterval,
    taskLogMap,
    splitView,
    currLogDetailId,
    queue
  }
}, {
  persist: {
      paths: ['pollInterval', 'splitView']
  }
})