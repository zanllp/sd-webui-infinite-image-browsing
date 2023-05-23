import type { GlobalConf } from '@/api'
import type { MatchImageByTagsReq } from '@/api/db'
import { i18n, t } from '@/i18n'
import { getPreferredLang } from '@/i18n'
import type { getAutoCompletedTagList } from '@/page/taskRecord/autoComplete'
import type { ReturnTypeAsync } from '@/util'
import { cloneDeep, uniqueId } from 'lodash-es'
import { defineStore } from 'pinia'
import { watch } from 'vue'
import { ref } from 'vue'
import { type UniqueId, ID } from 'vue3-ts-util'

interface OtherTabPane {
  type: 'empty' | 'global-setting' | 'tag-search' | 'fuzzy-search'
  name: string
  readonly key: string
}
// logDetailId

interface TagSearchMatchedImageGridTabPane {
  type: 'tag-search-matched-image-grid'
  name: string
  readonly key: string
  selectedTagIds: MatchImageByTagsReq
  id: string
}

export interface FileTransferTabPane {
  type: 'local'
  name: string
  readonly key: string
  path?: string
  walkMode?: boolean
  stackKey?: string
}

export type TabPane = FileTransferTabPane | OtherTabPane | TagSearchMatchedImageGridTabPane

export interface Tab extends UniqueId {
  panes: TabPane[]
  key: string
}

export const useGlobalStore = defineStore(
  'useGlobalStore',
  () => {
    const conf = ref<GlobalConf>()
    const autoCompletedDirList = ref([] as ReturnTypeAsync<typeof getAutoCompletedTagList>)
    const enableThumbnail = ref(true)
    const stackViewSplit = ref(50)
    const autoUploadRecvDir = ref('/')
    const createEmptyPane = (): TabPane =>  ({ type: 'empty', name: t('emptyStartPage'), key: uniqueId() })
    const emptyPane = createEmptyPane()
    const tabList = ref<Tab[]>([ID({ panes: [emptyPane], key: emptyPane.key })])
    const dragingTab = ref<{ tabIdx: number; paneIdx: number }>()
    const recent = ref(new Array<{ path: string; key: string; }>())
    const time = Date.now()
    const lastTabListRecord = ref<[{ time: number; tabs: Tab[] }, { time: number; tabs: Tab[] }]>() // [curr,last]
    const saveRecord = () => {
      const tabs = tabList.value.slice()
      console.log(tabs)
      if (lastTabListRecord.value?.length !== 2) {
        lastTabListRecord.value = [
          { tabs, time },
          { tabs, time }
        ]
      }
      if (lastTabListRecord.value[0].time === time) {
        lastTabListRecord.value[0].tabs = tabs
      } else {
        lastTabListRecord.value.unshift({ tabs, time })
      }
      lastTabListRecord.value = lastTabListRecord.value.slice(0, 2) as any
    }

    const openTagSearchMatchedImageGridInRight = async (
      tabIdx: number,
      id: string,
      tagIds: MatchImageByTagsReq
    ) => {
      let pane = tabList.value
        .map((v) => v.panes)
        .flat()
        .find(
          (v) => v.type === 'tag-search-matched-image-grid' && v.id === id
        ) as TagSearchMatchedImageGridTabPane
      if (pane) {
        pane.selectedTagIds = cloneDeep(tagIds)
        return
      } else {
        pane = {
          type: 'tag-search-matched-image-grid',
          id: id,
          selectedTagIds: cloneDeep(tagIds),
          key: uniqueId(),
          name: t('searchResults')
        }
      }

      const tab = tabList.value[tabIdx + 1]
      if (!tab) {
        tabList.value.push(ID({ panes: [pane], key: pane.key }))
      } else {
        tab.key = pane.key
        tab.panes.push(pane)
      }
    }

    const gridThumbnailSize = ref(256)
    const largeGridThumbnailSize = ref(512)

    const lang = ref(getPreferredLang())
    watch(lang, (v) => (i18n.global.locale.value = v as any))

    const longPressOpenContextMenu = ref(false)
    return {
      createEmptyPane,
      lang,
      tabList,
      conf,
      autoCompletedDirList,
      enableThumbnail,
      stackViewSplit,
      dragingTab,
      saveRecord,
      recent,
      lastTabListRecord,
      gridThumbnailSize,
      largeGridThumbnailSize,
      longPressOpenContextMenu,
      openTagSearchMatchedImageGridInRight,
      onlyFoldersAndImages: ref(true),
      fullscreenPreviewInitialUrl: ref('')
    }
  },
  {
    persist: {
      paths: [
        'lang',
        'enableThumbnail',
        'lastTabListRecord',
        'stackViewSplit',
        'recent',
        'gridThumbnailSize',
        'largeGridThumbnailSize',
        'longPressOpenContextMenu',
        'onlyFoldersAndImages'
      ]
    }
  }
)
