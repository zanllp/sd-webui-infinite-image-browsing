import type { UploadTaskTickStatus } from '@/api'
import { defineStore } from 'pinia'
import { reactive, ref } from 'vue'

export const useTaskListStore = defineStore('useTaskListStore', () => {
  const taskLogMap = ref(new Map<string, UploadTaskTickStatus[]>())
  const splitView = reactive({ open: false, percent: 50 })
  const currLogDetailId = ref('')
  return {
    taskLogMap,
    splitView,
    currLogDetailId
  }
})