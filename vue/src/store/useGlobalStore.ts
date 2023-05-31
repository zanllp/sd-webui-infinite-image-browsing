import type { GlobalConf } from '@/api'
import type { MatchImageByTagsReq } from '@/api/db'
import { i18n, t } from '@/i18n'
import { getPreferredLang } from '@/i18n'
import type { getAutoCompletedTagList } from '@/page/taskRecord/autoComplete'
import type { Dict, ReturnTypeAsync } from '@/util'
import { isAbsolute, join, normalize } from '@/util/path'
import { cloneDeep, uniqueId } from 'lodash-es'
import { defineStore } from 'pinia'
import { computed, onMounted, watch } from 'vue'
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

export interface Shortcut {
  deleteInFullScreenPreviewMode: string
  toggleLikeTagInFullScreenPreviewMode: string
}

export const useGlobalStore = defineStore(
  'useGlobalStore',
  () => {
    const conf = ref<GlobalConf>()
    const quickMovePaths = ref([] as ReturnTypeAsync<typeof getAutoCompletedTagList>)
    const enableThumbnail = ref(true)
    const stackViewSplit = ref(50)
    const createEmptyPane = (): TabPane => ({
      type: 'empty',
      name: t('emptyStartPage'),
      key: uniqueId()
    })
    const tabList = ref<Tab[]>([])
    onMounted(() => {
      const emptyPane = createEmptyPane()
      tabList.value.push(ID({ panes: [emptyPane], key: emptyPane.key }))
    })
    const dragingTab = ref<{ tabIdx: number; paneIdx: number }>()
    const recent = ref(new Array<{ path: string; key: string }>())
    const time = Date.now()
    const lastTabListRecord = ref<[{ time: number; tabs: Tab[] }, { time: number; tabs: Tab[] }]>() // [curr,last]
    const saveRecord = () => {
      const tabs = tabList.value.slice()
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

    const shortcut = ref<Shortcut>({
      deleteInFullScreenPreviewMode: '',
      toggleLikeTagInFullScreenPreviewMode: ''
    })

    const pathAliasMap = computed((): Dict<string> => {
      if (!conf.value) return {}
      const { global_setting: paths, sd_cwd } = conf.value
      const map = {
        [t('extra')]: paths.outdir_extras_samples,
        [t('saveButtonSavesTo')]: paths.outdir_save,
        [t('t2i')]: paths.outdir_txt2img_samples,
        [t('i2i')]: paths.outdir_img2img_samples,
        [t('i2i-grid')]: paths.outdir_img2img_grids,
        [t('t2i-grid')]: paths.outdir_txt2img_grids
      }
      const existPaths = quickMovePaths.value.map(v => v.dir)
      const res = Object.keys(map).filter(v => existPaths.includes(map[v])).map(v => [v, isAbsolute(map[v]) ? normalize(map[v]) : join(sd_cwd, map[v])])
      return Object.fromEntries(res)
    })
    return {
      pathAliasMap,
      createEmptyPane,
      lang,
      tabList,
      conf,
      quickMovePaths,
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
      fullscreenPreviewInitialUrl: ref(''),
      shortcut
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
        'onlyFoldersAndImages',
        'shortcut'
      ]
    }
  }
)
