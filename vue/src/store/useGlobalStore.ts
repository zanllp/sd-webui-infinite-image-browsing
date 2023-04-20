import type { GlobalConf, UploadTaskSummary } from '@/api'
import type { UserInfo } from '@/api/user'
import { i18n, t } from '@/i18n'
import { getPreferredLang } from '@/i18n'
import type { getAutoCompletedTagList } from '@/page/taskRecord/autoComplete'
import type { ReturnTypeAsync } from '@/util'
import { message } from 'ant-design-vue'
import { uniqueId } from 'lodash-es'
import { defineStore } from 'pinia'
import { watch } from 'vue'
import { nextTick } from 'vue'
import { ref } from 'vue'
import { typedEventEmitter, type UniqueId, ID } from 'vue3-ts-util'


interface OtherTabPane {
  type: 'auto-upload' | 'task-record' | 'empty' | 'log-detail' | 'global-setting' | 'tag-search'
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
  target: 'local' | 'netdisk' // type 和target一致
  name: string
  readonly key: string
  path?: string
  walkMode?: boolean
  stackKey?: string
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
  const emptyPane: TabPane = { type: 'empty', name: t('emptyStartPage'), key: uniqueId() }
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

  const createTaskRecordPaneIfNotExist = async (tabIdx = 0) => {
    if (!tabList.value.map(v => v.panes).flat().find(v => v.type === 'task-record')) {
      tabList.value[tabIdx].panes.push({ type: 'task-record', key: uniqueId(), name: '任务记录' })
    }
    await nextTick()
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

  const gridThumbnailSize = ref(256)
  const largeGridThumbnailSize = ref(512)

  const lang = ref(getPreferredLang())
  watch(lang, v => i18n.global.locale.value = v as any)

  const openBaiduYunIfNotLogged = (tabIdx: number, paneIdx: number) => {
    if (!user.value) {
      message.info(t('loginPrompt'))
      const pane: FileTransferTabPane = { key: uniqueId(), type: 'netdisk', target: 'netdisk', name: t('baiduCloud') + '  ' + t('login') }
      tabList.value[tabIdx].panes[paneIdx] = pane
      tabList.value[tabIdx].key = pane.key
    }
  }

  const longPressOpenContextMenu = ref(false)
  const baiduNetdiskPageOpened = ref('')
  return {
    lang,
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
    gridThumbnailSize,
    largeGridThumbnailSize,
    createTaskRecordPaneIfNotExist,
    openBaiduYunIfNotLogged,
    longPressOpenContextMenu,
    baiduNetdiskPageOpened,
    ...typedEventEmitter<{ createNewTask: Partial<UploadTaskSummary> }>()
  }
}, {
  persist: {
    paths: [
      'lang', 'enableThumbnail', 'lastTabListRecord', 
      'stackViewSplit', 'autoUploadRecvDir', 'recent',
       'gridThumbnailSize', 'largeGridThumbnailSize', 
       'longPressOpenContextMenu','baiduNetdiskPageOpened'
      ]
  }
})