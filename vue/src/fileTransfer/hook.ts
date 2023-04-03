import { useGlobalStore } from '@/store/useGlobalStore'
import { useTaskListStore } from '@/store/useTaskListStore'
import { computedAsync } from '@vueuse/core'
import { ref } from 'vue'

import { downloadBaiduyun } from '@/api'
import { isAxiosError } from 'axios'
export const useBaiduyun = () => {

  const taskListStore = useTaskListStore()
  const installedBaiduyun = computedAsync(taskListStore.checkBaiduyunInstalled, false)
  const baiduyunLoading = ref(false)
  const failedHint = ref('')
  const installBaiduyunBin = async () => {
    try {
      failedHint.value = ''
      baiduyunLoading.value = true
      await downloadBaiduyun()
      taskListStore.baiduyunInstalled = null
      await taskListStore.checkBaiduyunInstalled()
    } catch (e) {
      if (isAxiosError(e)) {
        failedHint.value = e.response?.data.detail ?? 'error'
      }
    } finally {
      baiduyunLoading.value = false
    }
  }
  return {
    installBaiduyunBin,
    installedBaiduyun,
    failedHint,
    baiduyunLoading
  }
}