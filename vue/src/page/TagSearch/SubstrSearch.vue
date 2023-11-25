<script lang="ts" setup>
import { nextTick, onMounted, ref } from 'vue'
import fileItemCell from '@/components/FileItem.vue'
import '@zanllp/vue-virtual-scroller/dist/vue-virtual-scroller.css'
// @ts-ignore
import { RecycleScroller } from '@zanllp/vue-virtual-scroller'
import { toRawFileUrl } from '@/util/file'
import { getDbBasicInfo, getExpiredDirs, getImagesBySubstr, updateImageData, type DataBaseBasicInfo, SearchBySubstrReq } from '@/api/db'
import { copy2clipboardI18n, makeAsyncFunctionSingle, useGlobalEventListen } from '@/util'
import fullScreenContextMenu from '@/page/fileTransfer/fullScreenContextMenu.vue'
import { LeftCircleOutlined, RightCircleOutlined, regex } from '@/icon'
import { message } from 'ant-design-vue'
import { t } from '@/i18n'
import { createImageSearchIter, useImageSearch } from './hook'

const props = defineProps<{ tabIdx: number; paneIdx: number, searchScope?: string }>()
const isRegex = ref(false)
const substr = ref('')
const folder_paths_str = ref(props.searchScope ?? '')
const iter = createImageSearchIter(cursor => {
  const req: SearchBySubstrReq = {
    cursor,
    regexp: isRegex.value ? substr.value : '',
    surstr: !isRegex.value ? substr.value : '',
    folder_paths: (folder_paths_str.value ?? '').split(/,|\n/).map(v => v.trim()).filter(v => v)
  }
  return getImagesBySubstr(req) 
})
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
  onScroll
} = useImageSearch(iter)

const info = ref<DataBaseBasicInfo>()

onMounted(async () => {
  info.value = await getDbBasicInfo()
  if (info.value.img_count && info.value.expired) {
    await onUpdateBtnClick()
  }
  if (props.searchScope) {
    await query()
  }
})

const onUpdateBtnClick = makeAsyncFunctionSingle(
  () =>
    queue.pushAction(async () => {
      await updateImageData()
      info.value = await getDbBasicInfo()
      return info.value
    }).res
)
const query = async () => {
  await iter.reset({ refetch: true })
  await nextTick()
  onScroll()
  scroller.value!.scrollToItem(0)
  if (!images.value.length) {
    message.info(t('fuzzy-search-noResults'))
  }
}

useGlobalEventListen('returnToIIB', async () => {
  const res = await queue.pushAction(getExpiredDirs).res
  info.value!.expired = res.expired
})

useGlobalEventListen('searchIndexExpired', () => info.value && (info.value.expired = true))

const onRegexpClick = () => {
  isRegex.value = !isRegex.value
}

</script>
<template>
  <div class="container" ref="stackViewEl">
    <div class="search-bar" v-if="info" @keydown.stop>
      <a-input v-model:value="substr" :placeholder="$t('fuzzy-search-placeholder') + ' ' + $t('regexSearchEnabledHint')"
        :disabled="!queue.isIdle" @keydown.enter="query" allow-clear />
      <div class="regex-icon" :class="{ selected: isRegex }" @keydown.stop @click="onRegexpClick"
        title="Use Regular Expression"> <img :src="regex"></div>
      <AButton @click="onUpdateBtnClick" :loading="!queue.isIdle" type="primary" v-if="info.expired || !info.img_count">
        {{ info.img_count === 0 ? $t('generateIndexHint') : $t('UpdateIndex') }}</AButton>
      <AButton v-else type="primary" @click="query" :loading="!queue.isIdle || iter.loading" :disabled="!substr && !folder_paths_str">{{
        $t('search') }}
      </AButton>
    </div>
    <div class="search-bar last">
      <div class="form-name">{{ $t('searchScope') }}</div>
      <ATextarea :auto-size="{ maxRows: 8 }" v-model:value="folder_paths_str" :placeholder="$t('specifiedSearchFolder')"/>
    </div>
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
        key-field="fullpath" :item-secondary-size="itemSize.second" :gridItems="gridItems" @scroll="onScroll">
        <template v-slot="{ item: file, index: idx }">
          <!-- idx 和file有可能丢失 -->
          <file-item-cell :idx="idx" :file="file" v-model:show-menu-idx="showMenuIdx" @file-item-click="onFileItemClick"
            :full-screen-preview-image-url="images[previewIdx] ? toRawFileUrl(images[previewIdx]) : ''"
            :cell-width="cellWidth" :selected="multiSelectedIdxs.includes(idx)" @context-menu-click="onContextMenuClickU"
            @dragstart="onFileDragStart" @dragend="onFileDragEnd" :is-selected-mutil-files="multiSelectedIdxs.length > 1"
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
.regex-icon {
  img {
    height: 1.5em;
  }

  user-select: none;
  padding: 4px;
  margin: 0 4px;
  cursor: pointer;
  border: 1px solid var(--zp-border);
  border-radius: 4px;

  &:hover {
    background: var(--zp-border);
  }

  &.selected {
    background: var(--primary-color-1);
    border: 1px solid var(--primary-color);
  }
}

.search-bar {
  padding: 8px 8px 0 8px;
  &.last {
    padding-bottom: 8px;
  }
  display: flex;
    .form-name {
      flex-shrink: 0;
      padding: 4px 8px;
    }
}

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
}</style>
