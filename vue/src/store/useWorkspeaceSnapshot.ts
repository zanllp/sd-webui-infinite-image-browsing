import { setAppFeSetting } from '@/api'
import { defineStore } from 'pinia'
import { toRaw, watch } from 'vue'
import { ref } from 'vue'
import { prefix } from '@/util/const'
import { Tab, copyTabFilterWorkspaceSnapShot, useGlobalStore } from './useGlobalStore'
import { isSync } from '@/util'

export interface Snapshot {
  id: string
  name: string
  tabs: Tab[]
}



export const useWorkspeaceSnapshot = defineStore(
  prefix + 'useWorkspeaceSnapshot',
  () => {
    const g = useGlobalStore()
    const createSnapshot = (name: string): Snapshot => {
      const tablist = toRaw(g.tabList).map(copyTabFilterWorkspaceSnapShot)
      return {
        id: Date.now() + (Math.random() * 100000).toFixed(0),
        name,
        tabs: tablist
      }
    }
    const snapshots = ref<Snapshot[]>([])

    watch(() => g.conf?.app_fe_setting, setting => {
      if (setting && isSync()) {
        const keys = Object.keys(setting)
        const snapshotKeys = keys.filter((v) => v.startsWith('workspace_snapshot_'))
        const snapshotList = snapshotKeys.map((key) => (setting as any)[key])
        snapshots.value = snapshotList
      }
    }, { immediate: true })

    const addSnapshot = async (snapshot: Snapshot) => {
      snapshots.value.push(snapshot)
      await setAppFeSetting(`workspace_snapshot_${snapshot.id}`, snapshot)
    }

    return {
      createSnapshot,
      snapshots,
      addSnapshot
    }
  },
  {
    persist: {
      // debug: true,
      paths: ['snapshots']
    }
  }
)
