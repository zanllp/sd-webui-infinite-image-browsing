<script setup lang="ts">
import { getTargetFolderFiles, type FileNodeInfo } from '@/api/files'
import { setImgPath, genInfoCompleted, getImageGenerationInfo } from '@/api'
import { cloneDeep, debounce, last, range, uniq } from 'lodash'
import { ref, computed, onMounted, watch, h, reactive } from 'vue'
import { FileOutlined, FolderOpenOutlined, DownOutlined, LeftCircleOutlined, RightCircleOutlined } from '@/icon'
import { sortMethodMap, sortFiles, SortMethod } from './fileSort'
import path from 'path-browserify'
import { useGlobalStore, type FileTransferTabPane } from '@/store/useGlobalStore'
import { copy2clipboard, ok, type SearchSelectConv, SearchSelect, useWatchDocument, fallbackImage, delay, Task, FetchQueue } from 'vue3-ts-util'
// @ts-ignore
import NProgress from 'multi-nprogress'
import 'multi-nprogress/nprogress.css'
import type Progress from 'nprogress'
import { message, Modal } from 'ant-design-vue'
import FolderNavigator from './folderNavigator.vue'
import { gradioApp, isImageFile } from '@/util'
import { useElementSize } from '@vueuse/core'
// @ts-ignore
import { RecycleScroller } from 'vue-virtual-scroller'
import 'vue-virtual-scroller/dist/vue-virtual-scroller.css'
import type { MenuInfo } from 'ant-design-vue/lib/menu/src/interface'

const el = ref<HTMLDivElement>()
const props = defineProps<{
  target: 'local' | 'netdisk',
  tabIdx: number,
  paneIdx: number,
  path?: string
}>()
interface Page {
  files: FileNodeInfo[]
  curr: string
}
interface FileNodeInfoR extends FileNodeInfo {
  fullpath: string
}
type ViewMode = 'line' | 'grid' | 'large-size-grid'
const global = useGlobalStore()
const { currLocation, currPage, refresh, copyLocation, back, openNext, stack, to, scroller } = useLocation()
const { gridItems, sortMethodConv, moreActionsDropdownShow, sortedFiles, sortMethod, viewMode, gridSize, viewModeMap, largeGridSize } = useFilesDisplay()
const { onDrop, onFileDragStart, multiSelectedIdxs } = useFileTransfer()
const { onFileItemClick, onContextMenuClick, showGenInfo, imageGenInfo, q } = useFileItemActions()
const { previewIdx, onPreviewVisibleChange, previewing, previewImgMove, canPreview } = usePreview()

const toRawFileUrl = (file: FileNodeInfoR, download = false) => `/baidu_netdisk/file?filename=${encodeURIComponent(file.fullpath)}${download ? `&disposition=${encodeURIComponent(file.name)}` : ''}`
const toImageThumbnailUrl = (file: FileNodeInfoR, size = '256,256') => `/baidu_netdisk/image-thumbnail?path=${encodeURIComponent(file.fullpath)}&size=${size}`

function usePreview () {
  const previewIdx = ref(-1)
  const previewing = ref(false)
  let waitScrollTo = null as number | null
  const onPreviewVisibleChange = (v: boolean, lv: boolean) => {
    previewing.value = v
    if (waitScrollTo != null && !v && lv) {// 关闭预览时滚动过去
      scroller.value?.scrollToItem(waitScrollTo)
      waitScrollTo = null
    }
  }
  useWatchDocument('keydown', e => {
    if (previewing.value) {
      let next = previewIdx.value
      if (['ArrowDown', 'ArrowRight'].includes(e.key)) {
        next++
        while (sortedFiles.value[next] && !isImageFile(sortedFiles.value[next].name)) {
          next++
        }
      } else if (['ArrowUp', 'ArrowLeft'].includes(e.key)) {
        next--
        while (sortedFiles.value[next] && !isImageFile(sortedFiles.value[next].name)) {
          next--
        }
      }
      if (isImageFile(sortedFiles.value[next]?.name) ?? '') {
        previewIdx.value = next
        const s = scroller.value
        if (s && !(next >= s.$_startIndex && next <= s.$_endIndex)) {
          waitScrollTo = next // 关闭预览时滚动过去
        }
      }
    }
  })
  const previewImgMove = (type: 'next' | 'prev') => {
    let next = previewIdx.value
    if (type === 'next') {
      next++
      while (sortedFiles.value[next] && !isImageFile(sortedFiles.value[next].name)) {
        next++
      }
    } else if (type === 'prev') {
      next--
      while (sortedFiles.value[next] && !isImageFile(sortedFiles.value[next].name)) {
        next--
      }
    }
    if (isImageFile(sortedFiles.value[next]?.name) ?? '') {
      previewIdx.value = next
      const s = scroller.value
      if (s && !(next >= s.$_startIndex && next <= s.$_endIndex)) {
        waitScrollTo = next // 关闭预览时滚动过去
      }
    }
  }
  const canPreview = (type: 'next' | 'prev') => {
    let next = previewIdx.value
    if (type === 'next') {
      next++
      while (sortedFiles.value[next] && !isImageFile(sortedFiles.value[next].name)) {
        next++
      }
    } else if (type === 'prev') {
      next--
      while (sortedFiles.value[next] && !isImageFile(sortedFiles.value[next].name)) {
        next--
      }
    } return isImageFile(sortedFiles.value[next]?.name) ?? ''
  }
  return {
    previewIdx,
    onPreviewVisibleChange,
    previewing,
    previewImgMove,
    canPreview
  }
}

function useFilesDisplay () {
  const moreActionsDropdownShow = ref(false)
  const viewMode = ref<ViewMode>('grid')
  const viewModeMap: Record<ViewMode, string> = { line: '详情列表', 'grid': '预览网格', 'large-size-grid': '大尺寸预览网格' }
  const sortMethodConv: SearchSelectConv<SortMethod> = {
    value: (v) => v,
    text: (v) => '按' + sortMethodMap[v]
  }
  const sortMethod = ref(SortMethod.DATE_DESC)
  const sortedFiles = computed(() => sortFiles(currPage.value?.files ?? [], sortMethod.value).map(v => ({ ...v, fullpath: path.join(currLocation.value, v.name) })))
  const gridSize = 288
  const largeGridSize = gridSize * 2
  const { width } = useElementSize(el)
  const gridItems = computed(() => {
    const w = width.value
    if (viewMode.value === 'line' || !w) {
      return
    }
    return ~~(w / (viewMode.value === 'grid' ? gridSize : largeGridSize))
  })
  return {
    gridItems,
    sortedFiles,
    sortMethodConv,
    viewModeMap,
    moreActionsDropdownShow,
    viewMode,
    gridSize,
    sortMethod,
    largeGridSize
  }
}


function useLocation () {
  const scroller = ref<{ $_startIndex: number, $_endIndex: number, scrollToItem (idx: number): void }>()
  const np = ref<Progress.NProgress>()
  const currPage = computed(() => last(stack.value))
  const stack = ref<Page[]>([])
  const currLocation = computed(() => path.join(...getBasePath()))

  watch(() => stack.value.length, debounce((v, lv) => {
    if (v !== lv) {
      scroller.value!.scrollToItem(0)
    }
  }, 300))

  onMounted(async () => {
    const resp = await getTargetFolderFiles(props.target, '/')
    stack.value.push({
      files: resp.files,
      curr: '/'
    })
    np.value = new NProgress()
    np.value!.configure({ parent: el.value as any })
    if (props.path && props.path !== '/') {
      to(props.path)
    } else if (props.target == 'local') {
      global.conf?.home && to(global.conf.home)
    }
  })

  const getBasePath = () =>
    stack.value.map((v) => v.curr).slice(global.conf?.is_win && props.target === 'local' ? 1 : 0)

  watch(currLocation, debounce((loc) => {
    const pane = global.tabList[props.tabIdx].panes[props.paneIdx] as FileTransferTabPane
    pane.path = loc
    global.recent = global.recent.filter(v => v.key !== pane.key)
    global.recent.unshift({ path: loc, target: pane.target, key: pane.key })
    if (global.recent.length > 20) {
      global.recent = global.recent.slice(0, 20)
    }
  }, 300))

  const copyLocation = () => copy2clipboard(currLocation.value)

  const openNext = async (file: FileNodeInfo) => {
    if (file.type !== 'dir') {
      return
    }
    try {
      np.value?.start()
      const prev = getBasePath()
      const { files } = await getTargetFolderFiles(
        props.target,
        path.normalize(path.join(...prev, file.name))
      )
      stack.value.push({
        files,
        curr: file.name
      })
    } finally {
      np.value?.done()
    }
  }

  const back = (idx: number) => {
    while (idx < stack.value.length - 1) {
      stack.value.pop()
    }
  }

  const to = async (dir: string) => {
    const backup = cloneDeep(stack.value)
    try {
      if (!/^((\w:)|\/)/.test(dir)) {
        // 相对路径
        dir = path.join(global.conf?.sd_cwd ?? '/', dir)
      }
      const frags = dir.split(/\\|\//)
      if (global.conf?.is_win && props.target === 'local') {
        frags[0] = frags[0] + '/' // 分割完是c:
      } else {
        frags.shift() // /开头的一个是空
      }
      const currPaths = stack.value.map(v => v.curr)
      currPaths.shift() // 是 /
      while (currPaths[0] && frags[0]) {
        if (currPaths[0] !== frags[0]) {
          break
        } else {
          currPaths.shift()
          frags.shift()
        }
      }
      for (let index = 0; index < currPaths.length; index++) {
        stack.value.pop()
      }
      if (!frags.length) {
        return refresh()
      }
      for (const frag of frags) {
        const target = currPage.value?.files.find((v) => v.name === frag)
        ok(target)
        await openNext(target)
      }
    } catch (error) {
      console.error(dir)
      message.error('移动失败，检查你的路径输入')
      stack.value = backup
      throw error
    }
  }


  const refresh = async () => {
    if (stack.value.length === 1) {
      const resp = await getTargetFolderFiles(props.target, '/')
      stack.value = [
        {
          files: resp.files,
          curr: '/'
        }
      ]
    } else {
      const last = currPage.value
      stack.value.pop()
      await openNext(currPage.value?.files.find((v) => v.name === last?.curr)!)
    }
  }
  return {
    refresh,
    copyLocation,
    back,
    openNext,
    currPage,
    currLocation,
    to,
    stack,
    scroller
  }
}


function useFileTransfer () {
  const multiSelectedIdxs = ref([] as number[])
  const recover = () => {
    multiSelectedIdxs.value = []
  }
  useWatchDocument('click', recover)
  useWatchDocument('blur', recover)
  watch(currPage, recover)

  const onFileDragStart = (e: DragEvent, idx: number) => {
    const file = cloneDeep(sortedFiles.value[idx])
    console.log(file, idx)
    const names = [file.name]
    let includeDir = file.type === 'dir'
    if (multiSelectedIdxs.value.includes(idx)) {
      const selectedFiles = multiSelectedIdxs.value.map(idx => sortedFiles.value[idx])
      names.push(...selectedFiles.map(v => v.name))
      includeDir = selectedFiles.some(v => v.type === 'dir')

    }
    e.dataTransfer!.setData(
      'text/plain',
      JSON.stringify({
        from: props.target,
        includeDir,
        path: uniq(names).map(name => path.join(currLocation.value, name))
      })
    )
  }

  const onDrop = async (e: DragEvent) => {
    type Data = {
      from: typeof props.target
      path: string[],
      includeDir: boolean
    }
    const data = JSON.parse(e.dataTransfer?.getData('text') || '{}') as Data
    console.log(data)
    if (data.from && data.path && typeof data.includeDir !== 'undefined') {
      if (data.from === props.target) {
        return
      }
      const type = data.from === 'local' ? 'upload' : 'download'
      const typeZH = type === 'upload' ? '上传' : '下载'
      const toPath = currLocation.value
      const content = h('div', [
        h('div', `从 ${props.target !== 'local' ? '本地' : '云盘'} `),
        h('ol', data.path.map(v => v.split(/[/\\]/).pop()).map(v => h('li', v))),
        h('div', `${typeZH} ${props.target === 'local' ? '本地' : '云盘'} ${toPath}`)
      ])
      Modal.confirm({
        title: `确定创建${typeZH}任务${data.includeDir ? ', 这是文件夹或者包含文件夹!' : ''}`,
        content,
        maskClosable: true,
        async onOk () {
          global.eventEmitter.emit('createNewTask', { send_dirs: data.path, recv_dir: toPath, type })
        }
      })
    }
  }
  return {
    onFileDragStart,
    onDrop,
    multiSelectedIdxs
  }
}

function useFileItemActions () {
  const showGenInfo = ref(false)
  const imageGenInfo = ref('')
  const q = reactive(new FetchQueue())
  const onFileItemClick = async (e: MouseEvent, file: FileNodeInfo) => {
    const files = sortedFiles.value
    const idx = files.findIndex(v => v.name === file.name)
    previewIdx.value = idx
    if (e.shiftKey) {
      multiSelectedIdxs.value.push(idx)
      multiSelectedIdxs.value.sort((a, b) => a - b)
      const first = multiSelectedIdxs.value[0]
      const last = multiSelectedIdxs.value[multiSelectedIdxs.value.length - 1]
      multiSelectedIdxs.value = range(first, last + 1)
      e.stopPropagation()
    } else if (e.ctrlKey || e.metaKey) {
      multiSelectedIdxs.value.push(idx)
      e.stopPropagation()
    } else {
      await openNext(file)
    }
  }


  const onContextMenuClick = async (e: MenuInfo, file: FileNodeInfoR) => {
    const url = toRawFileUrl(file)
    const copyImgTo = async (tab: ["txt2img", "img2img", "inpaint", "extras"][number]) => {
      await setImgPath(file.fullpath) // 设置图像路径
      const btn = gradioApp().querySelector('#bd_hidden_img_update_trigger')! as HTMLButtonElement
      btn.click() // 触发图像组件更新
      await Task.run({
        pollInterval: 1000,
        action: genInfoCompleted,
        validator: v => v
      }).completedTask // 等待消息生成完成
      await delay(500) // 如果直接点好像会还是设置之前的图片，workaround
      const tabBtn = gradioApp().querySelector(`#bd_hidden_tab_${tab}`) as HTMLButtonElement
      tabBtn.click() // 触发粘贴
    }
    switch (e.key) {
      case 'openInNewWindow': return window.open(url)
      case 'download': return window.open(toRawFileUrl(file, true))
      case 'copyPreviewUrl': return copy2clipboard(location.host + url)
      case 'send2txt2img': return copyImgTo('txt2img')
      case 'send2img2img': return copyImgTo('img2img')
      case 'send2inpaint': return copyImgTo('inpaint')
      case 'send2extras': return copyImgTo('extras')
      case 'viewGenInfo': {
        showGenInfo.value = true
        imageGenInfo.value = await q.pushAction(() => getImageGenerationInfo(file.fullpath)).res
      }

    }
  }
  return {
    onFileItemClick,
    onContextMenuClick,
    showGenInfo,
    imageGenInfo,
    q
  }
}

</script>
<template>
  <div ref="el" @dragover.prevent @drop.prevent="onDrop($event)" class="container">
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

        <a-dropdown :trigger="['click']" v-model:visible="moreActionsDropdownShow" placement="bottomLeft">
          <a class="opt" @click.prevent>
            更多
          </a>
          <template #overlay>
            <div @click.stop
              style="  width: 384px; background: white; padding: 16px; border-radius: 4px; box-shadow: 0 0 4px #aaa; border: 1px solid #aaa;">
              <a-form v-bind="{
                labelCol: { span: 6 },
                wrapperCol: { span: 18 }
              }">
                <a-form-item label="查看模式">
                  <search-select v-model:value="viewMode" :conv="{ value: v => v, text: v => viewModeMap[v as ViewMode] }"
                    :options="Object.keys(viewModeMap)" />
                </a-form-item>
                <a-form-item label="排序方法">

                  <search-select v-model:value="sortMethod" :conv="sortMethodConv"
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
      <RecycleScroller class="file-list" :items="sortedFiles" :prerender="10" ref="scroller"
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
      </RecycleScroller>
      <div v-if="previewing" class="preview-switch">
        <LeftCircleOutlined @click="previewImgMove('prev')" :class="{ 'disable': !canPreview('prev') }" />
        <RightCircleOutlined @click="previewImgMove('next')" :class="{ 'disable': !canPreview('next') }" />
      </div>
    </div>
  </div>
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
  margin: 16px;
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
      background: var(--xdt-primary-background);
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
