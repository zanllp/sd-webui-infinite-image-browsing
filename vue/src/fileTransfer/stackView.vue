<script setup lang="ts">
import { FileOutlined, FolderOpenOutlined, DownOutlined, LeftCircleOutlined, RightCircleOutlined } from '@/icon'
import { sortMethodMap } from './fileSort'
import { useGlobalStore } from '@/store/useGlobalStore'
import { useFileTransfer, useFilesDisplay, useHookShareState, useLocation, usePreview, type ViewMode, useFileItemActions, toImageThumbnailUrl, toRawFileUrl } from './hook'
import { copy2clipboard, SearchSelect, fallbackImage } from 'vue3-ts-util'

import 'multi-nprogress/nprogress.css'
import FolderNavigator from './folderNavigator.vue'
import { isImageFile } from '@/util'
// @ts-ignore
import { RecycleScroller } from 'vue-virtual-scroller'
import 'vue-virtual-scroller/dist/vue-virtual-scroller.css'
import { watch } from 'vue'


const global = useGlobalStore()
const props = defineProps<{
  target: 'local' | 'netdisk',
  tabIdx: number,
  paneIdx: number,
  path?: string,
  walkMode?: boolean
}>()
const { installBaiduyunBin, installedBaiduyun, failedHint, baiduyunLoading, scroller, stackViewEl, props: _props } = useHookShareState().toRefs()
watch(() => props, () => {
  _props.value = props
}, { immediate: true })

const { currLocation, currPage, refresh, copyLocation, back, openNext, stack, to } = useLocation(props)
const { gridItems, sortMethodConv, moreActionsDropdownShow, 
  sortedFiles, sortMethod, viewMode, gridSize, viewModeMap, largeGridSize,
  loadNextDir, loadNextDirLoading, canLoadNext,
   onScroll } = useFilesDisplay(props)
const { onDrop, onFileDragStart, multiSelectedIdxs } = useFileTransfer(props)
const { onFileItemClick, onContextMenuClick, showGenInfo, imageGenInfo, q } = useFileItemActions({ openNext })
const { previewIdx, onPreviewVisibleChange, previewing, previewImgMove, canPreview } = usePreview()



</script>
<template>
  <ASelect style="display: none;"></ASelect>
  <div v-if="props.target === 'netdisk' && !installedBaiduyun" class="uninstalled-hint">
    <div>尚未安装依赖，当前不可用</div>
    <AButton type="primary" :loading="baiduyunLoading" @click="installBaiduyunBin">点此安装</AButton>
    <p v-if="failedHint">{{ failedHint }}</p>
  </div>
  <div ref="stackViewEl" @dragover.prevent @drop.prevent="onDrop($event)" class="container" v-else>
    <AModal v-model:visible="showGenInfo" width="50vw">
      <ASkeleton active :loading="!q.isIdle">
        <pre style="width: 100%; word-break: break-all;white-space: pre-line;" @dblclick="copy2clipboard(imageGenInfo)">
                          双击复制
                          {{ imageGenInfo }}
                        </pre>
      </ASkeleton>
    </AModal>
    <div class="location-bar">
      <div class="breadcrumb">
        <a-breadcrumb style="flex: 1">
          <a-breadcrumb-item v-for="(item, idx) in stack" :key="idx"><a @click.prevent="back(idx)">{{
            item.curr === '/' ? '根' : item.curr.replace(/:\/$/, '盘')
          }}</a></a-breadcrumb-item>
        </a-breadcrumb>
      </div>
      <div class="actions">

        <a class="opt" @click.prevent="refresh"> 刷新 </a>
        <a-dropdown v-if="props.target === 'local'">
          <a class="opt" @click.prevent>
            快速移动
            <down-outlined />
          </a>
          <template #overlay>
            <a-menu>
              <a-menu-item v-for="item in global.autoCompletedDirList" :key="item.dir">
                <a @click.prevent="to(item.dir)">{{ item.zh }}</a>
              </a-menu-item>
            </a-menu>
          </template>
        </a-dropdown>

        <a-dropdown :trigger="['click']" v-model:visible="moreActionsDropdownShow" placement="bottomLeft"
          :getPopupContainer="trigger => trigger.parentNode as HTMLDivElement">
          <a class="opt" @click.prevent>
            更多
          </a>
          <template #overlay>
            <div
              style="  width: 384px; background: white; padding: 16px; border-radius: 4px; box-shadow: 0 0 4px #aaa; border: 1px solid #aaa;">
              <a-form v-bind="{
                labelCol: { span: 6 },
                wrapperCol: { span: 18 }
              }">
                <a-form-item label="查看模式">
                  <search-select v-model:value="viewMode" @click.stop
                    :conv="{ value: v => v, text: v => viewModeMap[v as ViewMode] }"
                    :options="Object.keys(viewModeMap)" />
                </a-form-item>
                <a-form-item label="排序方法">

                  <search-select v-model:value="sortMethod" @click.stop :conv="sortMethodConv"
                    :options="Object.keys(sortMethodMap)" />
                </a-form-item>
                <a-form-item>
                  <a @click.prevent="copyLocation">复制路径</a>
                  <folder-navigator :loc="currLocation" @to="to" />
                </a-form-item>
              </a-form>
            </div>
          </template>
        </a-dropdown>
      </div>
    </div>
    <div v-if="currPage" class="view">
      <RecycleScroller class="file-list" :items="sortedFiles" :prerender="10" ref="scroller" @scroll="onScroll"
        :item-size="viewMode === 'line' ? 80 : (viewMode === 'grid' ? gridSize : largeGridSize)" key-field="fullpath"
        :gridItems="gridItems">
        <template v-slot="{ item: file, index: idx }">
          <a-dropdown :trigger="['contextmenu']">
            <li class="file"
              :class="{ clickable: file.type === 'dir', selected: multiSelectedIdxs.includes(idx), grid: viewMode === 'grid', 'large-grid': viewMode === 'large-size-grid' }"
              :key="file.name" draggable="true" @dragstart="onFileDragStart($event, idx)"
              @click.capture="onFileItemClick($event, file)">
              <a-image ref="dd" :key="file.fullpath" :class="`idx-${idx}`"
                v-if="props.target === 'local' && viewMode !== 'line' && isImageFile(file.name)"
                :src="global.enableThumbnail ? toImageThumbnailUrl(file, viewMode === 'grid' ? void 0 : '512,512') : toRawFileUrl(file)"
                :fallback="fallbackImage"
                :preview="{ src: sortedFiles[previewIdx] ? toRawFileUrl(sortedFiles[previewIdx]) : '', onVisibleChange: onPreviewVisibleChange }">
              </a-image>
              <template v-else>
                <file-outlined class="icon" v-if="file.type === 'file'" />
                <folder-open-outlined class="icon" v-else />
                <div class="name">
                  {{ file.name }}
                </div>
                <div class="basic-info">
                  <div>
                    {{ file.size }}
                  </div>
                  <div>
                    {{ file.date }}
                  </div>
                </div>
              </template>
            </li>
            <template #overlay>
              <a-menu v-if="props.target === 'local' && file.type === 'file'" @click="onContextMenuClick($event, file)">
                <a-menu-item key="openInNewWindow">在新窗口预览（如果浏览器处理不了会下载，大文件的话谨慎）</a-menu-item>
                <a-menu-item key="download">直接下载（大文件的话谨慎）</a-menu-item>
                <a-menu-item key="copyPreviewUrl">复制源文件预览链接</a-menu-item>
                <template v-if="isImageFile(file.name)">
                  <a-menu-item key="viewGenInfo">查看生成信息(prompt等)</a-menu-item>
                  <a-menu-item key="send2txt2img">发送到文生图</a-menu-item>
                  <a-menu-item key="send2img2img">发送到图生图</a-menu-item>
                  <a-menu-item key="send2inpaint">发送到局部重绘</a-menu-item>
                  <a-menu-item key="send2extras">发送到附加功能</a-menu-item>
                </template>
              </a-menu>
            </template>
          </a-dropdown>
        </template>
        <template v-if="props.walkMode" #after>
          <AButton @click="loadNextDir" :loading="loadNextDirLoading" block type="primary" :disabled="!canLoadNext" ghost>加载下一页</AButton>
        </template>
      </RecycleScroller>
      <div v-if="previewing" class="preview-switch">
        <LeftCircleOutlined @click="previewImgMove('prev')" :class="{ 'disable': !canPreview('prev') }" />
        <RightCircleOutlined @click="previewImgMove('next')" :class="{ 'disable': !canPreview('next') }" />
      </div>
    </div>
  </div>
</template>
<style lang="scss" scoped>
.uninstalled-hint {
  margin: 256px auto;
  display: flex;
  flex-flow: column;
  justify-content: center;
  align-items: center;

  &>* {
    margin: 16px;
    text-align: center;
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
}

.location-bar {
  margin: 0 16px;
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

    .file {
      padding: 8px 16px;
      margin: 8px;
      display: flex;
      align-items: center;
      background: var(--zp-primary-background);
      border-radius: 8px;
      box-shadow: 0 0 4px #ccc;
      position: relative;

      &.grid {
        padding: 8px;
        height: 256px;
        width: 256px;
        display: inline-block;
        box-sizing: content-box;


        :deep() {
          .icon {
            font-size: 6em;
            margin-top: 16px;
          }

          .name {
            margin: 16px 0;
          }

          .basic-info {
            position: absolute;
            bottom: 16px;
            right: 16px;
          }

          img {
            height: 256px;
            width: 256px;
            object-fit: contain;
          }
        }
      }


      &.large-grid {
        padding: 8px;
        height: 512px;
        width: 512px;
        margin: 16px;
        display: inline-block;
        box-sizing: content-box;


        :deep() {
          .icon {
            font-size: 6em;
            margin-top: 16px;
          }

          .name {
            margin: 16px 0;
          }

          .basic-info {
            position: absolute;
            bottom: 16px;
            right: 16px;
          }

          img {
            height: 512px;
            width: 512px;
            object-fit: contain;
          }
        }
      }

      &.clickable {
        cursor: pointer;
      }

      &.selected {
        outline: #0084ff solid 2px;
      }

      .name {
        flex: 1;
        padding: 8px;
        word-break: break-all
      }

      .basic-info {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
      }
    }
  }
}
</style>
