import { useElementSize } from '@vueuse/core'
import { ref, computed, watch, reactive } from 'vue'
import { Top4MediaInfo, batchGetDirTop4MediaInfo } from '@/api'
import {
  delay} from 'vue3-ts-util'
import { sortMethodConv } from '../fileSort'
import { debounce } from 'lodash-es'
import { isMediaFile } from '@/util/file'
import { useHookShareState, global, tagStore } from '.'

export function useFilesDisplay ({ fetchNext }: {fetchNext?: () => Promise<any>} = {  }) {
  const {
    scroller,
    sortedFiles,
    sortMethod,
    currLocation,
    stackViewEl,
    canLoadNext,
    previewIdx,
    props,
    walker
  } = useHookShareState().toRefs()
  const { state } = useHookShareState()
  const moreActionsDropdownShow = ref(false)
  const cellWidth = ref(global.defaultGridCellWidth)
  const gridSize = computed(() => cellWidth.value + 16) // margin 8
  const profileHeight = 44
  const { width } = useElementSize(stackViewEl)
  const gridItems = computed(() => ~~(width.value / gridSize.value))
  const dirCoverCache = reactive(new Map<string, Top4MediaInfo[]>())

  const itemSize = computed(() => {
    const second = gridSize.value
    const first = second + (cellWidth.value <= 160 ? 0 : profileHeight)

    return {
      first,
      second
    }
  })

  const loadNextDirLoading = ref(false)

  const loadNextDir = async () => {
    if (loadNextDirLoading.value || props.value.mode !== 'walk' || !canLoadNext.value) {
      return
    }
    try {
      loadNextDirLoading.value = true
      await walker.value?.next()
    } finally {
      loadNextDirLoading.value = false
    }
  }

  // 填充够一页，直到不行为止
  const fetchDataUntilViewFilled = async (isFullScreenPreview = false) => {
    const s = scroller.value
    const currIdx = () => (isFullScreenPreview ? previewIdx.value : s?.$_endIndex ?? 0)
    const needLoad = () => {
      const len = sortedFiles.value.length
      const preload = 50
      if (!len) {
        return true
      }
      if (fetchNext) {
        return currIdx() > len - preload
      }
      return currIdx() > len - preload && canLoadNext.value // canLoadNext 是walker的，表示加载完成
    }
    while (needLoad()) {
      await delay(30)
      const ret = await (fetchNext ?? loadNextDir)()
      if (typeof ret === 'boolean' && !ret) {
        return // 返回false同样表示加载完成
      }
    }
  }

  state.useEventListen('loadNextDir', fetchDataUntilViewFilled)


  const onViewableAreaChange = () => {
    const s = scroller.value
    if (s) {
      const startIdx = Math.max(s.$_startIndex - 10, 0)
      const viewableAreaFiles = sortedFiles.value.slice(startIdx, s.$_endIndex + 10)
      state.eventEmitter.emit('viewableAreaFilesChange', { files: viewableAreaFiles, startIdx })
      const fetchTagPaths = viewableAreaFiles
        .filter(v => v.is_under_scanned_path && isMediaFile(v.name))
        .map(v => v.fullpath)
      tagStore.fetchImageTags(fetchTagPaths)
      const fetchDirTop4MediaPaths = viewableAreaFiles
        .filter(v => v.is_under_scanned_path && v.type === 'dir' && !dirCoverCache.has(v.fullpath))
        .map(v => v.fullpath)
      if (fetchDirTop4MediaPaths.length) {
        batchGetDirTop4MediaInfo(fetchDirTop4MediaPaths).then(v => {
          for (const key in v) {
            if (Object.prototype.hasOwnProperty.call(v, key)) {
              const element = v[key];
              dirCoverCache.set(key, element)
            }
          }
        })
      }
    }
  }
  const onViewableAreaChangeDebounced = debounce(onViewableAreaChange, 300)
  watch(currLocation, onViewableAreaChangeDebounced)

  const onScroll = debounce(async () => {
    await fetchDataUntilViewFilled()
    onViewableAreaChangeDebounced()
  }, 150)

  return {
    gridItems,
    sortedFiles,
    sortMethodConv,
    moreActionsDropdownShow,
    gridSize,
    sortMethod,
    onScroll,
    loadNextDir,
    loadNextDirLoading,
    canLoadNext,
    itemSize,
    cellWidth,
    dirCoverCache
  }
}
