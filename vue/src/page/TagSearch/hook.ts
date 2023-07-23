import type { FileNodeInfo } from '@/api/files'
import { createReactiveQueue } from '@/util'
import { identity } from 'lodash-es'
import { ref } from 'vue'
import {
  useHookShareState,
  useFilesDisplay,
  useMobileOptimization,
  useFileTransfer,
  useFileItemActions,
  usePreview,
  useEventListen
} from '../fileTransfer/hook'
import { useTagStore } from '@/store/useTagStore'
import { debounce } from 'lodash-es'

export const useImageSearch = () => {
  const images = ref<FileNodeInfo[]>()
  const queue = createReactiveQueue()
  const tagStore = useTagStore()
  const { stackViewEl, multiSelectedIdxs, stack, scroller } = useHookShareState({ images }).toRefs()
  const { itemSize, gridItems, cellWidth } = useFilesDisplay()
  const { showMenuIdx } = useMobileOptimization()
  const { onFileDragStart, onFileDragEnd } = useFileTransfer()
  const {
    showGenInfo,
    imageGenInfo,
    q: genInfoQueue,
    onContextMenuClick,
    onFileItemClick
  } = useFileItemActions({ openNext: identity })
  const { previewIdx, previewing, onPreviewVisibleChange, previewImgMove, canPreview } = usePreview()

  const onContextMenuClickU: typeof onContextMenuClick = async (e, file, idx) => {
    stack.value = [{ curr: '', files: images.value! }] // hack，for delete multi files
    await onContextMenuClick(e, file, idx)
  }

  useEventListen('removeFiles', async ({ paths }) => {
    images.value = images.value?.filter((v) => !paths.includes(v.fullpath))
  })

  const updateImageTag = () => {
    const s = scroller.value
    if (s && images.value) {
      const paths = images.value
        .slice(Math.max(s.$_startIndex - 10, 0), s.$_endIndex + 10)
        .map((v) => v.fullpath)
      tagStore.fetchImageTags(paths)
    }
  }

  const onScroll = debounce(updateImageTag, 300)

  return {
    scroller,
    queue,
    images,
    onContextMenuClickU,
    stackViewEl,
    previewIdx,
    previewing,
    onPreviewVisibleChange,
    previewImgMove,
    canPreview,
    itemSize,
    gridItems,
    showGenInfo,
    imageGenInfo,
    q: genInfoQueue,
    onContextMenuClick,
    onFileItemClick,
    showMenuIdx,
    multiSelectedIdxs,
    onFileDragStart,
    onFileDragEnd,
    cellWidth,
    onScroll,
    updateImageTag
  }
}
