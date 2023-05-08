<script lang="ts" setup>
import { ref } from 'vue'
import fileItemCell from '@/page/fileTransfer/FileItem.vue'
import type { FileNodeInfo } from '@/api/files'
import '@zanllp/vue-virtual-scroller/dist/vue-virtual-scroller.css'
// @ts-ignore
import { RecycleScroller } from '@zanllp/vue-virtual-scroller'
import {
  useFilesDisplay,
  type Scroller,
  useHookShareState,
  useMobileOptimization,
  useFileItemActions,
  toRawFileUrl,
  usePreview,
  useFileTransfer
} from '@/page/fileTransfer/hook'
import { identity } from 'lodash-es'
import { getImagesByTags } from '@/api/db'
import { watch } from 'vue'
import { copy2clipboardI18n, createReactiveQueue } from '@/util'
import fullScreenContextMenu from '@/page/fileTransfer/fullScreenContextMenu.vue'
import { LeftCircleOutlined, RightCircleOutlined } from '@/icon'

const images = ref<FileNodeInfo[]>()

const queue = createReactiveQueue()

const props = defineProps<{
  tabIdx: number
  paneIdx: number
  selectedTagIds: number[]
  id: string
}>()

watch(
  () => props.selectedTagIds,
  async () => {
    const { res } = queue.pushAction(() => getImagesByTags(props.selectedTagIds))
    images.value = await res
    scroller.value?.scrollToItem(0)
  },
  { immediate: true }
)

const scroller = ref<Scroller>()

const propsMock = { tabIdx: -1, target: 'local', paneIdx: -1, walkMode: false } as const
const { stackViewEl, multiSelectedIdxs, stack } = useHookShareState().toRefs()
const { itemSize, gridItems } = useFilesDisplay(propsMock)
const { showMenuIdx } = useMobileOptimization()
useFileTransfer() // for reset selected
const {
  showGenInfo,
  imageGenInfo,
  q: genInfoQueue,
  onContextMenuClick,
  onFileItemClick
} = useFileItemActions(propsMock, { openNext: identity })
const { previewIdx, previewing, onPreviewVisibleChange, previewImgMove, canPreview } = usePreview(props, { scroller, files: images })

const onContextMenuClickU: typeof onContextMenuClick = async (e, file, idx) => {
  stack.value = [{ curr: '', files: images.value! }] // hack，for delete multi files
  const idxs = multiSelectedIdxs.value.includes(idx) ? multiSelectedIdxs.value : [idx] // when click confirm ok button, idxs will be reset
  await onContextMenuClick(e, file, idx)
  if (e.key === 'deleteFiles') {
    images.value = images.value!.filter((_, idx) => !idxs.includes(idx))
  }
}

</script>
<template>
  <div class="container" ref="stackViewEl">
    <ASpin size="large" :spinning="!queue.isIdle">
      <AModal v-model:visible="showGenInfo" width="70vw" mask-closable @ok="showGenInfo = false">
        <template #cancelText />
        <ASkeleton active :loading="!genInfoQueue.isIdle">
          <div style="
                            width: 100%;
                              word-break: break-all;
                              white-space: pre-line;
                              max-height: 70vh;
                              overflow: auto;
                            " @dblclick="copy2clipboardI18n(imageGenInfo)">
            <div class="hint">{{ $t('doubleClickToCopy') }}</div>
            {{ imageGenInfo }}
          </div>
        </ASkeleton>
      </AModal>
      <RecycleScroller ref="scroller" class="file-list" v-if="images" :items="images" :item-size="itemSize.first"
        key-field="fullpath" :item-secondary-size="itemSize.second" :gridItems="gridItems">
        <template v-slot="{ item: file, index: idx }">
          <!-- idx 和file有可能丢失 -->
          <file-item-cell :idx="idx" :file="file" v-model:show-menu-idx="showMenuIdx" @file-item-click="onFileItemClick"
            :full-screen-preview-image-url="images[previewIdx] ? toRawFileUrl(images[previewIdx]) : ''"
            :selected="multiSelectedIdxs.includes(idx)" @context-menu-click="onContextMenuClickU"
            @preview-visible-change="onPreviewVisibleChange" />
        </template>
      </RecycleScroller>
      <div v-if="previewing" class="preview-switch">
        <LeftCircleOutlined @click="previewImgMove('prev')" :class="{ disable: !canPreview('prev') }" />
        <RightCircleOutlined @click="previewImgMove('next')" :class="{ disable: !canPreview('next') }" />
      </div>
    </ASpin>
    <fullScreenContextMenu v-if="previewing && images && images[previewIdx]" :file="images[previewIdx]" :idx="previewIdx"
      @context-menu-click="onContextMenuClickU" />
  </div>
</template>
<style scoped lang="scss">
.preview-switch {
  position: fixed;
  top: 0;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  z-index: 11111;
  pointer-events: none;

  &>* {
    color: white;
    margin: 16px;
    font-size: 4em;
    pointer-events: all;
    cursor: pointer;

    &.disable {
      opacity: 0;
      pointer-events: none;
      cursor: none;
    }
  }
}

.container {
  background: var(--zp-secondary-background);

  .file-list {
    list-style: none;
    padding: 8px;
    height: 100%;
    overflow: auto;
    height: var(--pane-max-height);
    width: 100%;
  }
}
</style>
