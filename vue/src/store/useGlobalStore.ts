import type { GlobalConf, UploadTaskSummary } from '@/api'
import type { getAutoCompletedTagList } from '@/taskRecord/autoComplete'
import type { ReturnTypeAsync } from '@/util'
import { uniqueId } from 'lodash'
import { defineStore } from 'pinia'
import { reactive, ref } from 'vue'
import { typedEventEmitter, type UniqueId, ID } from 'vue3-ts-util'

interface OtherTabPane {
  type: 'auto-upload' | 'task-record' | 'empty'
  name: string
  readonly key: string
}

export interface FileTransferTabPane {
  type: 'local' | 'netdisk'
  target: 'local' | 'netdisk'
  name: string
  readonly key: string
  path?: string
  walkMode?: boolean
}

export type TabPane = FileTransferTabPane | OtherTabPane

export interface Tab extends UniqueId {
  panes: TabPane[]
  key: string
}

export const useGlobalStore = defineStore('useGlobalStore', () => {
  const conf = ref<GlobalConf>()
  const autoCompletedDirList = ref([] as ReturnTypeAsync<typeof getAutoCompletedTagList>)
  const enableThumbnail = ref(true)
  const stackViewSplit = ref(50)
  const autoUploadRecvDir = ref('/')
  const emptyPane: TabPane = { type: 'empty', name: '空启动页', key: uniqueId() }
  const tabList = ref<Tab[]>([ID({ panes: [emptyPane], key: emptyPane.key })])
  const dragingTab = ref<{ tabIdx: number, paneIdx: number }>()
  const recent = ref(new Array<{ path: string, key: string, target: string }>())
  const time = Date.now()
  const lastTabListRecord = ref<[{ time: number, tabs: Tab[] }, { time: number, tabs: Tab[] }]>() // [curr,last]
  const saveRecord = (tabs: Tab[]) => {
    if (lastTabListRecord.value?.length !== 2) {
      lastTabListRecord.value = [{ tabs, time }, { tabs, time }]
    }
    if (lastTabListRecord.value[0].time === time) {
      lastTabListRecord.value[0].tabs = tabs
    } else {
      lastTabListRecord.value.unshift({ tabs, time })
    }
    lastTabListRecord.value = lastTabListRecord.value.slice(0, 2) as any
  }
  return {
    tabList,
    conf,
    autoCompletedDirList,
    enableThumbnail,
    stackViewSplit,
    autoUploadRecvDir,
    dragingTab,
    saveRecord,
    recent, lastTabListRecord,
    ...typedEventEmitter<{ createNewTask: Partial<UploadTaskSummary> }>()
  }
}, {
  persist: {
    paths: ['enableThumbnail', 'lastTabListRecord', 'stackViewSplit', 'autoUploadRecvDir', 'recent']
  }
})