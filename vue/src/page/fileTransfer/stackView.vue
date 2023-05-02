<script setup lang="ts">
import { DownOutlined, LeftCircleOutlined, RightCircleOutlined } from '@/icon'
import { sortMethodMap } from './fileSort'
import { useGlobalStore } from '@/store/useGlobalStore'
import {
  useFileTransfer,
  useFilesDisplay,
  useHookShareState,
  useLocation,
  usePreview,
  type ViewMode,
  useFileItemActions,
  toRawFileUrl,
  stackCache,
  useMobileOptimization
} from './hook'
import { copy2clipboard, SearchSelect } from 'vue3-ts-util'

import 'multi-nprogress/nprogress.css'
import FolderNavigator from './folderNavigator.vue'
// @ts-ignore
import { RecycleScroller } from 'vue-virtual-scroller'
import 'vue-virtual-scroller/dist/vue-virtual-scroller.css'
import { watch } from 'vue'
import FileItem from './FileItem.vue'
import fullScreenContextMenu from './fullScreenContextMenu.vue'
import 'antd-vue-volar'

const global = useGlobalStore()
const props = defineProps<{
  tabIdx: number
  paneIdx: number
  /**
   * 初始打开路径
   */
  path?: string
  walkMode?: boolean
  /**
   * 页面栈,跳过不必要的api请求
   */
  stackKey?: string
}>()
const {
  scroller,
  walkModePath,
  stackViewEl,
  props: _props,
  multiSelectedIdxs,
  spinning
} = useHookShareState().toRefs()
const { currLocation, currPage, refresh, copyLocation, back, openNext, stack, to, quickMoveTo } =
  useLocation(props)
const {
  gridItems,
  sortMethodConv,
  moreActionsDropdownShow,
  sortedFiles,
  sortMethod,
  viewMode,
  viewModeMap,
  itemSize,
  loadNextDir,
  loadNextDirLoading,
  canLoadNext,
  onScroll
} = useFilesDisplay(props)
const { onDrop, onFileDragStart } = useFileTransfer()
const { onFileItemClick, onContextMenuClick, showGenInfo, imageGenInfo, q } = useFileItemActions(
  props,
  { openNext }
)
const { previewIdx, onPreviewVisibleChange, previewing, previewImgMove, canPreview } =
  usePreview(props)
const { showMenuIdx } = useMobileOptimization()

watch(
  () => props,
  () => {
    _props.value = props
    if (props.walkMode) {
      walkModePath.value = props.path
    }
    const stackC = stackCache.get(props.stackKey ?? '')
    if (stackC) {
      stack.value = stackC.slice() // 浅拷贝
    }
  },
  { immediate: true }
)
</script>
<template>
  <ASpin :spinning="spinning" size="large">
    <ASelect style="display: none"></ASelect>

    <div ref="stackViewEl" @dragover.prevent @drop.prevent="onDrop($event)" class="container">
      <AModal v-model:visible="showGenInfo" width="70vw" mask-closable @ok="showGenInfo = false">
        <template #cancelText />
        <ASkeleton active :loading="!q.isIdle">
          <div style="
                width: 100%;
                word-break: break-all;
                white-space: pre-line;
                max-height: 70vh;
                overflow: auto;
                z-index: 9999;
              " @dblclick="copy2clipboard(imageGenInfo, 'copied')">
            <div class="hint">{{ $t('doubleClickToCopy') }}</div>
            {{ imageGenInfo }}
          </div>
        </ASkeleton>
      </AModal>
      <div class="location-bar">
        <div class="breadcrumb">
          <a-tooltip v-if="props.walkMode">
            <template #title>{{ $t('walk-mode-move-message') }}</template><a-breadcrumb style="flex: 1">
              <a-breadcrumb-item v-for="(item, idx) in stack" :key="idx">
                <span>{{ item.curr === '/' ? $t('root') : item.curr.replace(/:\/$/, $t('drive')) }}</span>
              </a-breadcrumb-item>
            </a-breadcrumb>
          </a-tooltip>
          <a-breadcrumb style="flex: 1" v-else>
            <a-breadcrumb-item v-for="(item, idx) in stack" :key="idx">
              <a @click.prevent="back(idx)">{{ item.curr === '/' ? $t('root') : item.curr.replace(/:\/$/, $t('drive'))
              }}</a>
            </a-breadcrumb-item>
          </a-breadcrumb>
        </div>
        <div class="actions">
          <a class="opt" @click.prevent="refresh"> {{ $t('refresh') }} </a>
          <a-dropdown>
            <a class="opt" @click.prevent>
              {{ $t('quickMove') }}
              <down-outlined />
            </a>
            <template #overlay>
              <a-menu>
                <a-menu-item v-for="item in global.autoCompletedDirList" :key="item.dir">
                  <a @click.prevent="quickMoveTo(item.dir)">{{ item.zh }}</a>
                </a-menu-item>
              </a-menu>
            </template>
          </a-dropdown>
          <a-dropdown :trigger="['click']" v-model:visible="moreActionsDropdownShow" placement="bottomLeft"
            :getPopupContainer="trigger => trigger.parentNode as HTMLDivElement">
            <a class="opt" @click.prevent>
              {{ $t('more') }}
            </a>
            <template #overlay>
              <div style="
                    width: 512px;
                    background: var(--zp-primary-background);
                    padding: 16px;
                    border-radius: 4px;
                    box-shadow: 0 0 4px var(--zp-secondary-background);
                    border: 1px solid var(--zp-secondary-background);
                  ">
                <a-form v-bind="{
                  labelCol: { span: 6 },
                  wrapperCol: { span: 18 }
                }">
                  <a-form-item :label="$t('viewMode')">
                    <search-select v-model:value="viewMode" @click.stop
                      :conv="{ value: v => v, text: v => viewModeMap[v as ViewMode] }"
                      :options="Object.keys(viewModeMap)" />
                  </a-form-item>
                  <a-form-item :label="$t('sortingMethod')">
                    <search-select v-model:value="sortMethod" @click.stop :conv="sortMethodConv"
                      :options="Object.keys(sortMethodMap)" />
                  </a-form-item>
                  <a-form-item>
                    <a @click.prevent="copyLocation">{{ $t('copyPath') }}</a>
                    <folder-navigator :loc="currLocation" @to="to" />
                  </a-form-item>
                </a-form>
              </div>
            </template>
          </a-dropdown>
        </div>
      </div>
      <div v-if="currPage" class="view">
        <RecycleScroller class="file-list" :items="sortedFiles" ref="scroller" @scroll="onScroll"
          :item-size="itemSize.first" key-field="fullpath" :item-secondary-size="itemSize.second" :gridItems="gridItems">
          <template v-slot="{ item: file, index: idx }">
            <!-- idx 和file有可能丢失 -->
            <file-item :idx="idx" :file="file" :full-screen-preview-image-url="sortedFiles[previewIdx] ? toRawFileUrl(sortedFiles[previewIdx]) : ''
            " v-model:show-menu-idx="showMenuIdx" :selected="multiSelectedIdxs.includes(idx)" :view-mode="viewMode"
              @file-item-click="onFileItemClick" @dragstart="onFileDragStart"
              @preview-visible-change="onPreviewVisibleChange" @context-menu-click="onContextMenuClick" />
          </template>
          <template v-if="props.walkMode" #after>
            <AButton @click="loadNextDir" :loading="loadNextDirLoading" block type="primary" :disabled="!canLoadNext"
              ghost>
              {{ $t('loadNextPage') }}</AButton>
          </template>
        </RecycleScroller>
        <div v-if="previewing" class="preview-switch">
          <LeftCircleOutlined @click="previewImgMove('prev')" :class="{ disable: !canPreview('prev') }" />
          <RightCircleOutlined @click="previewImgMove('next')" :class="{ disable: !canPreview('next') }" />
        </div>
      </div>
    </div>
    <fullScreenContextMenu v-if="previewing" :file="sortedFiles[previewIdx]" :idx="previewIdx"
      @context-menu-click="onContextMenuClick" />
  </ASpin>
</template>
<style lang="scss" scoped>
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
  height: 100%;
  background: var(--zp-secondary-background);
}

.location-bar {
  padding: 4px 16px;
  background: var(--zp-primary-background);
  border-bottom: 1px solid var(--zp-border);
  display: flex;
  align-items: center;
  justify-content: space-between;

  .actions {
    display: flex;
    align-items: center;

    flex-shrink: 0;
  }

  a.opt {
    margin-left: 8px;
  }
}

.view {
  padding: 8px;
  height: calc(100vh - 96px);

  .file-list {
    list-style: none;
    padding: 8px;
    height: 100%;
    overflow: auto;
  }
}

.hint {
  padding: 4px;
  border: 4px;
  background: var(--zp-secondary-background);
  border: 1px solid var(--zp-border);
}
</style>
