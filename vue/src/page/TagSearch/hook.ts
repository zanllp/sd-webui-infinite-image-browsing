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
  type Scroller,
  useEventListen,
  useLocation
} from '../fileTransfer/hook'

export const useImageSearch = () => {
  const images = ref<FileNodeInfo[]>()
  const queue = createReactiveQueue()
  const scroller = ref<Scroller>()
  const propsMock = { tabIdx: -1, target: 'local', paneIdx: -1, walkMode: false } as const
  const { stackViewEl, multiSelectedIdxs, stack } = useHookShareState({ images }).toRefs()
  const { itemSize, gridItems, cellWidth } = useFilesDisplay(propsMock)
  const { showMenuIdx } = useMobileOptimization()
  useLocation(propsMock)
  const { onFileDragStart,  onFileDragEnd } = useFileTransfer()
  const {
    showGenInfo,
    imageGenInfo,
    q: genInfoQueue,
    onContextMenuClick,
    onFileItemClick
  } = useFileItemActions(propsMock, { openNext: identity })
  const { previewIdx, previewing, onPreviewVisibleChange, previewImgMove, canPreview } = usePreview(
    propsMock,
    { scroller }
  )

  const onContextMenuClickU: typeof onContextMenuClick = async (e, file, idx) => {
    stack.value = [{ curr: '', files: images.value! }] // hack，for delete multi files
    await onContextMenuClick(e, file, idx)
  }

  useEventListen('removeFiles', async ({ paths }) => {
    images.value = images.value?.filter(v => !paths.includes(v.fullpath))
  })
  

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
    cellWidth
  }
}
