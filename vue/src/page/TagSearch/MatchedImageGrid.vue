<script lang="ts" setup>
import fileItemCell from '@/components/FileItem.vue'
import '@zanllp/vue-virtual-scroller/dist/vue-virtual-scroller.css'
// @ts-ignore
import { RecycleScroller } from '@zanllp/vue-virtual-scroller'
import { toRawFileUrl } from '@/util/file'
import { getImagesByTags, type MatchImageByTagsReq } from '@/api/db'
import { nextTick, watch } from 'vue'
import { copy2clipboardI18n } from '@/util'
import fullScreenContextMenu from '@/page/fileTransfer/fullScreenContextMenu.vue'
import { LeftCircleOutlined, RightCircleOutlined } from '@/icon'
import { useImageSearch } from './hook'
const {
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
  multiSelectedIdxs,
  onFileItemClick,
  scroller,
  showMenuIdx,
  onFileDragStart,
  onFileDragEnd,
  cellWidth,
  onScroll,
  updateImageTag
} = useImageSearch()

const props = defineProps<{
  tabIdx: number
  paneIdx: number
  selectedTagIds: MatchImageByTagsReq
  id: string
}>()

watch(
  () => props.selectedTagIds,
  async () => {
    const { res } = queue.pushAction(() => getImagesByTags(props.selectedTagIds))
    images.value = await res
    await nextTick()
    updateImageTag()
    scroller.value!.scrollToItem(0)
  },
  { immediate: true }
)
</script>
<template>
  <div class="container" ref="stackViewEl">
    <ASpin size="large" :spinning="!queue.isIdle">
      <AModal v-model:visible="showGenInfo" width="70vw" mask-closable @ok="showGenInfo = false">
        <template #cancelText />
        <ASkeleton active :loading="!genInfoQueue.isIdle">
          <div
            style="
              width: 100%;
              word-break: break-all;
              white-space: pre-line;
              max-height: 70vh;
              overflow: auto;
            "
            @dblclick="copy2clipboardI18n(imageGenInfo)"
          >
            <div class="hint">{{ $t('doubleClickToCopy') }}</div>
            {{ imageGenInfo }}
          </div>
        </ASkeleton>
      </AModal>
      <RecycleScroller
        ref="scroller"
        class="file-list"
        v-if="images"
        :items="images"
        :item-size="itemSize.first"
        key-field="fullpath"
        :item-secondary-size="itemSize.second"
        :gridItems="gridItems"
        @scroll="onScroll"
      >
        <template v-slot="{ item: file, index: idx }">
          <file-item-cell
            :idx="idx"
            :file="file"
            :cell-width="cellWidth"
            v-model:show-menu-idx="showMenuIdx"
            @dragstart="onFileDragStart"
            @dragend="onFileDragEnd"
            @file-item-click="onFileItemClick"
            :full-screen-preview-image-url="
              images[previewIdx] ? toRawFileUrl(images[previewIdx]) : ''
            "
            :selected="multiSelectedIdxs.includes(idx)"
            @context-menu-click="onContextMenuClickU"
            @preview-visible-change="onPreviewVisibleChange"
          />
        </template>
      </RecycleScroller>
      <div v-if="previewing" class="preview-switch">
        <LeftCircleOutlined
          @click="previewImgMove('prev')"
          :class="{ disable: !canPreview('prev') }"
        />
        <RightCircleOutlined
          @click="previewImgMove('next')"
          :class="{ disable: !canPreview('next') }"
        />
      </div>
    </ASpin>
    <fullScreenContextMenu
      v-if="previewing && images && images[previewIdx]"
      :file="images[previewIdx]"
      :idx="previewIdx"
      @context-menu-click="onContextMenuClickU"
    />
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

  & > * {
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
