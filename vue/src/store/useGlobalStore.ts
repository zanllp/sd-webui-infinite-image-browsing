import type { GlobalConf } from '@/api'
import type { MatchImageByTagsReq } from '@/api/db'
import { FileNodeInfo } from '@/api/files'
import { i18n, t } from '@/i18n'
import { getPreferredLang } from '@/i18n'
import { SortMethod } from '@/page/fileTransfer/fileSort'
import type { getAutoCompletedTagList } from '@/page/taskRecord/autoComplete'
import type { Dict, ReturnTypeAsync } from '@/util'
import { isAbsolute, join, normalize } from '@/util/path'
import { cloneDeep, uniqueId } from 'lodash-es'
import { defineStore } from 'pinia'
import { VNode, computed, onMounted, toRaw, watch } from 'vue'
import { ref } from 'vue'

interface TabPaneBase {
  name: string | VNode
  nameFallbackStr?: string
  readonly key: string
}

interface OtherTabPane extends TabPaneBase {
  type: 'empty' | 'global-setting' | 'tag-search' | 'fuzzy-search' | 'batch-download'
}
// logDetailId

interface TagSearchMatchedImageGridTabPane extends TabPaneBase {
  type: 'tag-search-matched-image-grid'
  selectedTagIds: MatchImageByTagsReq
  id: string
}
export interface ImgSliTabPane extends TabPaneBase {
  type: 'img-sli'
  left: FileNodeInfo
  right: FileNodeInfo
}

export interface FileTransferTabPane extends TabPaneBase {
  type: 'local'
  path?: string
  walkModePath?: string
  stackKey?: string
}

export type TabPane = FileTransferTabPane | OtherTabPane | TagSearchMatchedImageGridTabPane | ImgSliTabPane

/**
 * This interface represents a tab, which contains an array of panes, an ID, and a key
 */
export interface Tab {
  /**
   * An array of panes that belong to this tab
   */
  panes: TabPane[]
  /**
   * A unique identifier for this tab
   */
  id: string
  /**
   * A value indicating which pane is currently selected within the tab
   */
  key: string
}

export interface Shortcut extends Record<`toggle_tag_${string}`, string | undefined> {
  delete: string
}

export const copyPane = (pane: TabPane) => {
  return cloneDeep({
    ...pane,
    name: typeof pane.name === 'string' ? pane.name : pane.nameFallbackStr ?? ''
  })
}

export const copyTab = (tab: Tab) => {
  return {
    ...tab,
    panes: tab.panes.map(copyPane)
  }
}

export const useGlobalStore = defineStore(
  'useGlobalStore',
  () => {
    const conf = ref<GlobalConf>()
    const quickMovePaths = ref([] as ReturnTypeAsync<typeof getAutoCompletedTagList>)
    
    const enableThumbnail = ref(true)
    const gridThumbnailResolution = ref(512)
    const defaultSortingMethod = ref(SortMethod.CREATED_TIME_DESC)
    const defaultGridCellWidth = ref(256)

    const createEmptyPane = (): TabPane => ({
      type: 'empty',
      name: t('emptyStartPage'),
      key: uniqueId()
    })
    const tabList = ref<Tab[]>([])
    onMounted(() => {
      const emptyPane = createEmptyPane()
      tabList.value.push({ panes: [emptyPane], key: emptyPane.key, id: uniqueId() })
    })
    const dragingTab = ref<{ tabIdx: number; paneIdx: number }>()
    const recent = ref(new Array<{ path: string; key: string }>())
    const time = Date.now()
    const tabListHistoryRecord = ref<{ time: number; tabs: Tab[] }[]>() // [curr,last]
    const saveRecord = () => {
      const tabs = toRaw(tabList.value).map(copyTab)
      if (tabListHistoryRecord.value?.[0].time !== time) {
        tabListHistoryRecord.value = [{ tabs, time }, ...(tabListHistoryRecord.value ?? [])]
      } else {
        tabListHistoryRecord.value[0].tabs = tabs
      }
      tabListHistoryRecord.value = tabListHistoryRecord.value.slice(0, 2)
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
        tabList.value.push({ panes: [pane], key: pane.key, id: uniqueId() })
      } else {
        tab.key = pane.key
        tab.panes.push(pane)
      }
    }


    const lang = ref(getPreferredLang())
    watch(lang, (v) => (i18n.global.locale.value = v as any))

    const longPressOpenContextMenu = ref(false)

    const shortcut = ref<Shortcut>({
      delete: ''
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
      const existPaths = quickMovePaths.value.map((v) => v.dir)
      const res = Object.keys(map)
        .filter((v) => existPaths.includes(map[v]))
        .map((v) => [v, isAbsolute(map[v]) ? normalize(map[v]) : join(sd_cwd, map[v])])
      return Object.fromEntries(res)
    })
    return {
      defaultSortingMethod,
      defaultGridCellWidth,
      pathAliasMap,
      createEmptyPane,
      lang,
      tabList,
      conf,
      quickMovePaths,
      enableThumbnail,
      dragingTab,
      saveRecord,
      recent,
      tabListHistoryRecord,
      gridThumbnailResolution,
      longPressOpenContextMenu,
      openTagSearchMatchedImageGridInRight,
      onlyFoldersAndImages: ref(true),
      fullscreenPreviewInitialUrl: ref(''),
      shortcut,
      dontShowAgain: ref(false),
      dontShowAgainNewImgOpts: ref(false)
    }
  },
  {
    persist: {
      // debug: true,
      paths: [
        'dontShowAgainNewImgOpts',
        'defaultSortingMethod',
        'defaultGridCellWidth',
        'dontShowAgain',
        'lang',
        'enableThumbnail',
        'tabListHistoryRecord',
        'recent',
        'gridThumbnailResolution',
        'longPressOpenContextMenu',
        'onlyFoldersAndImages',
        'shortcut'
      ]
    }
  }
)
