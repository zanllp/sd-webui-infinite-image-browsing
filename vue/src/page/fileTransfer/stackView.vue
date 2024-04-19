<script setup lang="ts">
import { DownOutlined, LeftCircleOutlined, RightCircleOutlined } from '@/icon'
import { useGlobalStore } from '@/store/useGlobalStore'
import {
  useFileTransfer,
  useFilesDisplay,
  useHookShareState,
  useLocation,
  usePreview,
  useFileItemActions,
  useMobileOptimization,
  stackCache,
  useKeepMultiSelect
} from './hook'
import { SearchSelect } from 'vue3-ts-util'
import { toRawFileUrl } from '@/util/file'

import 'multi-nprogress/nprogress.css'
// @ts-ignore
import { RecycleScroller } from '@zanllp/vue-virtual-scroller'
import '@zanllp/vue-virtual-scroller/dist/vue-virtual-scroller.css'
import { watch } from 'vue'
import FileItem from '@/components/FileItem.vue'
import fullScreenContextMenu from './fullScreenContextMenu.vue'
import BaseFileListInfo from '@/components/BaseFileListInfo.vue'
import { copy2clipboardI18n } from '@/util'
import { openFolder, getImageGenerationInfoBatch } from '@/api'
import { sortMethods } from './fileSort'
import { isTauri } from '@/util/env'
import { parse } from '@/util/stable-diffusion-image-metadata'
import { ref } from 'vue'
import type { FileNodeInfo, GenDiffInfo } from '@/api/files'
import MultiSelectKeep from '@/components/MultiSelectKeep.vue'

const global = useGlobalStore()
const props = defineProps<{
  tabIdx: number
  paneIdx: number
  /**
   * 初始打开路径
   */
  path?: string
  walkModePath?: string
  /**
   * 页面栈,跳过不必要的api请求
   */
  stackKey?: string
}>()
const {
  scroller,
  stackViewEl,
  props: _props,
  multiSelectedIdxs,
  spinning
} = useHookShareState().toRefs()
const { currLocation, currPage, refresh, copyLocation, back, openNext, stack, quickMoveTo,
  addToSearchScanPathAndQuickMove, searchPathInfo, locInputValue, isLocationEditing,
  onLocEditEnter, onEditBtnClick, share, selectAll, onCreateFloderBtnClick, onWalkBtnClick,
  showWalkButton, searchInCurrentDir
} = useLocation()
const {
  gridItems,
  sortMethodConv,
  moreActionsDropdownShow,
  sortedFiles,
  sortMethod,
  itemSize,
  loadNextDir,
  loadNextDirLoading,
  canLoadNext,
  onScroll,
  cellWidth
} = useFilesDisplay()
const { onDrop, onFileDragStart, onFileDragEnd } = useFileTransfer()
const { onFileItemClick, onContextMenuClick, showGenInfo, imageGenInfo, q } = useFileItemActions({ openNext })
const { previewIdx, onPreviewVisibleChange, previewing, previewImgMove, canPreview } = usePreview()
const { showMenuIdx } = useMobileOptimization()
const { onClearAllSelected, onReverseSelect, onSelectAll } = useKeepMultiSelect()

watch(
  () => props,
  () => {
    _props.value = props
    const stackC = stackCache.get(props.stackKey ?? '')
    if (stackC) {
      stack.value = stackC.slice() // 浅拷贝
    }
  },
  { immediate: true }
)

watch(sortedFiles, async (newList, oldList) => {
  //check files in newList if it is an image-only list
  if (newList.length > 0 && newList.length !== oldList.length) {
    getRawGenParams()
  }
})

const changeIndchecked = ref<boolean>(global.defaultChangeIndchecked)
const seedChangeChecked = ref<boolean>(global.defaultSeedChangeChecked)

function getRawGenParams () {
  //extract fullpaths of all files from sortedfiles to array, but only if it's an actual file (not a folder or something else)
  let paths: string[] = []
  const allowedExtensions = ['.png', '.jpg', '.jpeg']
  for (let f in sortedFiles.value) {
    if (sortedFiles.value[f].type == 'file' && allowedExtensions.includes(sortedFiles.value[f].fullpath.slice(-4).toLowerCase())) {
      paths.push(sortedFiles.value[f].fullpath)
    }
  }
  q.pushAction(() => getImageGenerationInfoBatch(paths)).res.then((v) => {
    //result is a json object with fullpath as key and gen_info_raw as value
    for (let f in sortedFiles.value) {
      sortedFiles.value[f].gen_info_raw = v[sortedFiles.value[f].fullpath]
      sortedFiles.value[f].gen_info_obj = parse(v[sortedFiles.value[f].fullpath])
    }
  })
}

function getGenDiff (ownGenInfo: any, idx: any, increment: any, ownFile: FileNodeInfo) {
  //init result obj
  let result: GenDiffInfo = {
    diff: {},
    empty: true,
    ownFile: '',
    otherFile: ''
  }

  //check for out of bounds
  if (idx + increment < 0
    || idx + increment >= sortedFiles.value.length
    || sortedFiles.value[idx] == undefined) {
    return result
  }
  //check for gen_info_obj existence
  if (!('gen_info_obj' in sortedFiles.value[idx])
    || !('gen_info_obj' in sortedFiles.value[idx + increment])) {
    return result
  }

  //diff vars init
  let gen_a = ownGenInfo
  let gen_b: any = sortedFiles.value[idx + increment].gen_info_obj
  if (gen_b == undefined) {
    return result
  }

  //further vars
  let skip = ['hashes', 'resources']
  result.diff = {}
  result.ownFile = ownFile.name,
  result.otherFile = sortedFiles.value[idx + increment].name,
  result.empty = false

  if (!seedChangeChecked.value) {
    skip.push('seed')
  }

  //actual per property diff
  for (let k in gen_a) {
    //skip unwanted values
    if (skip.includes(k)) {
      continue
    }
    //for all non-identical values, compare type based
    //existence test
    if (!(k in gen_b)) {
      result.diff[k] = '+'
      continue
    }
    //content test
    if (gen_a[k] != gen_b[k]) {
      if (k.includes('rompt') && gen_a[k] != '' && gen_b[k] != '') {
        //prompt values are comma separated, handle them differently
        let tokenize_a = gen_a[k].split(',')
        let tokenize_b = gen_b[k].split(',')
        //count how many tokens are different or at a different place
        let diff_count = 0
        for (let i in tokenize_a) {
          if (tokenize_a[i] != tokenize_b[i]) {
            diff_count++
          }
        }
        result.diff[k] = diff_count
      } else {
        //all others
        result.diff[k] = [gen_a[k], gen_b[k]]
      }
    }
  }

  //result
  return result
}

</script>
<template>
  <ASpin :spinning="spinning" size="large">
    <MultiSelectKeep :show="global.keepMultiSelect || !!multiSelectedIdxs.length"
       @clear-all-selected="onClearAllSelected" @select-all="onSelectAll"
      @reverse-select="onReverseSelect" />
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
              " @dblclick="copy2clipboardI18n(imageGenInfo)">
            <div class="hint">{{ $t('doubleClickToCopy') }}</div>
            {{ imageGenInfo }}
          </div>
        </ASkeleton>
      </AModal>
      <div class="location-bar">
        <div class="breadcrumb" :style="{ flex: isLocationEditing ? 1 : '' }" >
          <AInput v-if="isLocationEditing" style="flex: 1" v-model:value="locInputValue" @click.stop @keydown.stop
            @press-enter="onLocEditEnter" allow-clear></AInput>
          <a-breadcrumb style="flex: 1" v-else>
            <a-breadcrumb-item v-for="(item, idx) in stack" :key="idx">
              <a @click.prevent="back(idx)">{{ item.curr === '/' ? $t('root') : item.curr.replace(/:\/$/, $t('drive'))
                }}</a>
            </a-breadcrumb-item>
          </a-breadcrumb>

          <AButton size="small" v-if="isLocationEditing" @click="onLocEditEnter" type="primary">{{ $t('go') }}</AButton>
          <div v-else class="location-act">
            <a @click.prevent="copyLocation" class="copy">{{ $t('copy') }}</a>
            <a @click.prevent.stop="onEditBtnClick">{{ $t('edit') }}</a>
          </div>
        </div>
        <div class="actions">
          <a class="opt" @click.prevent="refresh"> {{ $t('refresh') }} </a>
          <a-dropdown>
            <a class="opt" @click.prevent>
              {{ $t('search') }}
              <down-outlined />
            </a>
            <template #overlay>
              <a-menu>
                <a-menu-item key="tag-search">
                  <a @click.prevent="searchInCurrentDir('tag-search')">{{ $t('imgSearch') }}</a>
                </a-menu-item>
                <a-menu-item key="tag-search">
                  <a @click.prevent="searchInCurrentDir('fuzzy-search')">{{ $t('fuzzy-search') }}</a>
                </a-menu-item>
              </a-menu>
            </template>
          </a-dropdown>
          <a class="opt" @click.prevent="onWalkBtnClick" v-if="showWalkButton"> Walk </a>
          <a class="opt" @click.prevent.stop="selectAll"> {{ $t('selectAll') }} </a>
          <a class="opt" @click.prevent="share" v-if="!isTauri"> {{ $t('share') }} </a>
          <a-dropdown>
            <a class="opt" @click.prevent>
              {{ $t('quickMove') }}
              <down-outlined />
            </a>
            <template #overlay>
              <a-menu>
                <a-menu-item v-for="item in global.quickMovePaths" :key="item.dir">
                  <a @click.prevent="quickMoveTo(item.dir)">{{ item.zh }}</a>
                </a-menu-item>
              </a-menu>
            </template>
          </a-dropdown>
          <a-dropdown :trigger="['click']" v-model:visible="moreActionsDropdownShow" placement="bottomLeft"
            :getPopupContainer="(trigger: any) => trigger.parentNode as HTMLDivElement">
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
                  labelCol: { span: 10 },
                  wrapperCol: { span: 14 }
                }">
                  <a-form-item :label="$t('gridCellWidth')">
                    <numInput v-model="cellWidth" :max="1024" :min="64" :step="64" />
                  </a-form-item>
                  <a-form-item :label="$t('sortingMethod')">
                    <search-select v-model:value="sortMethod" @click.stop :conv="sortMethodConv"
                      :options="sortMethods" />
                  </a-form-item>
                  <a-form-item :label="$t('showChangeIndicators')">
                    <a-switch v-model:checked="changeIndchecked" @click="getRawGenParams" />
                  </a-form-item>
                  <a-form-item :label="$t('seedAsChange')">
                    <a-switch v-model:checked="seedChangeChecked" :disabled="!changeIndchecked" />
                  </a-form-item>
                  <div style="padding: 4px;">
                    <a @click.prevent="addToSearchScanPathAndQuickMove" v-if="!searchPathInfo">{{
    $t('addToSearchScanPathAndQuickMove') }}</a>
                    <a @click.prevent="addToSearchScanPathAndQuickMove" v-else-if="searchPathInfo.can_delete">{{
    $t('removeFromSearchScanPathAndQuickMove') }}</a>
                  </div>
                  <div style="padding: 4px;">
                    <a @click.prevent="openFolder(currLocation + '/')">{{ $t('openWithLocalFileBrowser') }}</a>
                  </div>
                  <div style="padding: 4px;">
                    <a @click.prevent="onCreateFloderBtnClick">{{ $t('createFolder') }}</a>
                  </div>
                </a-form>
              </div>
            </template>
          </a-dropdown>
        </div>
      </div>
      <div v-if="currPage" class="view">
        <RecycleScroller class="file-list" :items="sortedFiles" ref="scroller" @scroll="onScroll"
          :item-size="itemSize.first" key-field="fullpath" :item-secondary-size="itemSize.second"
          :gridItems="gridItems">
          <template v-slot="{ item: file, index: idx }">
            <!-- idx 和file有可能丢失 -->
            <file-item :idx="parseInt(idx)" :file="file"
              :full-screen-preview-image-url="sortedFiles[previewIdx] ? toRawFileUrl(sortedFiles[previewIdx]) : ''"
              v-model:show-menu-idx="showMenuIdx" :selected="multiSelectedIdxs.includes(idx)" :cell-width="cellWidth"
              @file-item-click="onFileItemClick" @dragstart="onFileDragStart" @dragend="onFileDragEnd"
              @preview-visible-change="onPreviewVisibleChange" @context-menu-click="onContextMenuClick"
              :is-selected-mutil-files="multiSelectedIdxs.length > 1"
              :gen-diff-to-next="getGenDiff(file.gen_info_obj, idx, 1, file)"
              :gen-diff-to-previous="getGenDiff(file.gen_info_obj, idx, -1, file)"
              :enable-change-indicator="changeIndchecked" />
          </template>
          <template #after>
            <div style="padding: 16px 0 512px;">
              <AButton v-if="props.walkModePath" @click="loadNextDir" :loading="loadNextDirLoading" block type="primary"
                :disabled="!canLoadNext" ghost>
                {{ $t('loadNextPage') }}</AButton>
            </div>
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
    <BaseFileListInfo :file-num="sortedFiles.length" :selected-file-num="multiSelectedIdxs.length" />
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

.location-act {
  margin-left: 8px;

  .copy {
    margin-right: 4px;
  }

  @media (max-width: 768px) {
    display: flex;
    flex-direction: column;

    &>*,
    .copy {
      margin: 2px;
    }
  }
}

.breadcrumb {
  display: flex;
  align-items: center;

  &>* {
    margin-right: 4px;
  }

  @media (max-width: 768px) {
    width: 100%;

    .ant-breadcrumb>* {
      display: inline-block;
    }
  }
}

.container {
  background: var(--zp-secondary-background);
  height: var(--pane-max-height);
}

.location-bar {
  padding: 4px 16px;
  background: var(--zp-primary-background);
  border-bottom: 1px solid var(--zp-border);
  display: flex;
  align-items: center;
  justify-content: space-between;

  @media (max-width: 768px) {
    flex-direction: column;

    ::-webkit-scrollbar {
      height: 2px; // 滚动条宽度
      background-color: var(--zp-secondary-variant-background); // 滚动条背景颜色
    }

    .actions {
      padding: 4px 0;
      width: 100%;
      overflow: auto;
      display: flex;
      align-items: center;

      &>* {
        flex-shrink: 0;
      }
    }
  }

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
  height: calc(100vh - 48px);

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
