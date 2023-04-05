import type { GlobalConf, UploadTaskSummary } from '@/api'
import type { UserInfo } from '@/api/user'
import type { getAutoCompletedTagList } from '@/page/taskRecord/autoComplete'
import type { ReturnTypeAsync } from '@/util'
import { uniqueId } from 'lodash'
import { defineStore } from 'pinia'
import { nextTick } from 'vue'
import { ref } from 'vue'
import { typedEventEmitter, type UniqueId, ID } from 'vue3-ts-util'

interface OtherTabPane {
  type: 'auto-upload' | 'task-record' | 'empty' | 'log-detail' | 'global-setting'
  name: string
  readonly key: string
}
// logDetailId

interface LogDetailTabPane {
  type: 'log-detail'
  logDetailId: string
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

export type TabPane = FileTransferTabPane | OtherTabPane | LogDetailTabPane

export interface Tab extends UniqueId {
  panes: TabPane[]
  key: string
}

export const useGlobalStore = defineStore('useGlobalStore', () => {
  const conf = ref<GlobalConf>()
  const user = ref<UserInfo>()
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

  const waitTaskRecordLoaded = ref(Promise.resolve())
  const createTaskRecordPaneIfNotExist = async (tabIdx = 0) => {
    if (!tabList.value.map(v => v.panes).flat().find(v => v.type === 'task-record')) {
      tabList.value[tabIdx].panes.push({ type: 'task-record', key: uniqueId(), name: '任务记录' })
    }
    await nextTick()
    await waitTaskRecordLoaded.value
  }
  const openLogDetailInRight = async (tabIdx: number, id: string) => {
    const tab = tabList.value[tabIdx + 1]
    const log: LogDetailTabPane = { type: 'log-detail', logDetailId: id, key: uniqueId(), name: `日志详情:${id.split('-')[0]}...` }
    if (!tab) {
      tabList.value.push(ID({ panes: [log], key: log.key }))
    } else {
      tab.key = log.key
      tab.panes.push(log)
    }

  }

  return {
    user,
    tabList,
    conf,
    autoCompletedDirList,
    enableThumbnail,
    stackViewSplit,
    autoUploadRecvDir,
    dragingTab,
    saveRecord,
    recent, lastTabListRecord,
    openLogDetailInRight,
    waitTaskRecordLoaded,
    createTaskRecordPaneIfNotExist,
    ...typedEventEmitter<{ createNewTask: Partial<UploadTaskSummary> }>()
  }
}, {
  persist: {
    paths: ['enableThumbnail', 'lastTabListRecord', 'stackViewSplit', 'autoUploadRecvDir', 'recent']
  }
})