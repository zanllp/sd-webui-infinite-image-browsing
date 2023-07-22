import { FileNodeInfo } from '@/api/files'
import { uniqueFile } from '@/util'
import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useBatchDownloadStore = defineStore('useBatchDownloadStore', () => {
  const selectdFiles = ref<FileNodeInfo[]>([])
  const addFiles = (files: FileNodeInfo[]) => {
    selectdFiles.value = uniqueFile([...selectdFiles.value,...files])
  }
  return {
    selectdFiles,
    addFiles
  }
})
