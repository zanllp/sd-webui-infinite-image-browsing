import { useGlobalStore, type FileTransferTabPane } from '@/store/useGlobalStore'
import { useTaskListStore } from '@/store/useTaskListStore'
import { computedAsync, useElementSize } from '@vueuse/core'
import { ref, computed, watch, onMounted, h, reactive } from 'vue'

import { downloadBaiduyun, genInfoCompleted, getImageGenerationInfo, setImgPath } from '@/api'
import { isAxiosError } from 'axios'
import { useWatchDocument, type SearchSelectConv, ok, createTypedShareStateHook, copy2clipboard, Task, delay, FetchQueue, typedEventEmitter } from 'vue3-ts-util'
import { gradioApp, isImageFile } from '@/util'
import { getTargetFolderFiles, type FileNodeInfo, deleteFiles } from '@/api/files'
import { sortFiles, sortMethodMap, SortMethod } from './fileSort'
import { cloneDeep, debounce, last, range, uniqBy } from 'lodash-es'
import path from 'path-browserify'
import type Progress from 'nprogress'
// @ts-ignore
import NProgress from 'multi-nprogress'
import { Modal, message } from 'ant-design-vue'
import type { MenuInfo } from 'ant-design-vue/lib/menu/src/interface'
import { nextTick } from 'vue'
import { loginByBduss } from '@/api/user'

const global = useGlobalStore()
export const toRawFileUrl = (file: FileNodeInfo, download = false) => `/baidu_netdisk/file?filename=${encodeURIComponent(file.fullpath)}${download ? `&disposition=${encodeURIComponent(file.name)}` : ''}`
export const toImageThumbnailUrl = (file: FileNodeInfo, size: string) => `/baidu_netdisk/image-thumbnail?path=${encodeURIComponent(file.fullpath)}&size=${size}`


export interface Scroller {
  $_startIndex: number
  $_endIndex: number
  scrollToItem (idx: number): void
}

export const { useHookShareState } = createTypedShareStateHook(() => {
  const props = ref<Props>({ tabIdx: -1, paneIdx: -1, target: 'local' })
  const currPage = computed(() => last(stack.value))
  const stack = ref<Page[]>([])
  const basePath = computed(() => stack.value.map((v) => v.curr).slice(global.conf?.is_win && props.value.target === 'local' ? 1 : 0))
  const currLocation = computed(() => path.join(...basePath.value))
  const sortMethod = ref(SortMethod.DATE_DESC)
  const sortedFiles = computed(() => {
    if (!currPage.value) {
      return []
    }
    const files = currPage.value?.files ?? []
    const method = sortMethod.value
    const { walkFiles } = currPage.value!
    if (props.value.walkMode) {
      /**
       * @see Page
       */
      return walkFiles
        ? walkFiles.map(dir => sortFiles(dir, method)).flat()
        : sortFiles(files, method)
    }
    return sortFiles(files, method)
  })
  const multiSelectedIdxs = ref([] as number[])
  const previewIdx = ref(-1)

  const canLoadNext = ref(true)
  return {
    canLoadNext,
    multiSelectedIdxs,
    previewIdx,
    basePath,
    currLocation,
    currPage,
    stack,
    sortMethod,
    sortedFiles,
    scroller: ref<Scroller>(),
    stackViewEl: ref<HTMLDivElement>(),
    props,
    ...useBaiduyun(),
    ...typedEventEmitter<{ loadNextDir: undefined }>()
  }
})

export interface Props {
  target: 'local' | 'netdisk',
  tabIdx: number,
  paneIdx: number,
  path?: string,
  walkMode?: boolean
}

export type ViewMode = 'line' | 'grid' | 'large-size-grid'
const taskListStore = useTaskListStore()

export const useBaiduyun = () => {

  const bduss = ref('')
  const installedBaiduyun = computedAsync(taskListStore.checkBaiduyunInstalled, false)
  const baiduyunLoading = ref(false)
  const failedHint = ref('')
  const installBaiduyunBin = async () => {
    try {
      failedHint.value = ''
      baiduyunLoading.value = true
      await downloadBaiduyun()
      taskListStore.baiduyunInstalled = null
      await taskListStore.checkBaiduyunInstalled()
    } catch (e) {
      if (isAxiosError(e)) {
        failedHint.value = e.response?.data.detail ?? 'error'
      }
    } finally {
      baiduyunLoading.value = false
    }
  }

  const onLoginBtnClick = async () => {
    if (baiduyunLoading.value) {
      return
    }
    try {
      baiduyunLoading.value = true
      global.user = await loginByBduss(bduss.value)
    } catch (error) {
      console.error(error)
      message.error(isAxiosError(error) ? error.response?.data?.detail ?? '未知错误' : '未知错误')
    } finally {
      baiduyunLoading.value = false
    }
  }

  return {
    installBaiduyunBin,
    installedBaiduyun,
    failedHint,
    baiduyunLoading,
    bduss,
    onLoginBtnClick
  }
}

interface Page {
  files: FileNodeInfo[]
  walkFiles?: FileNodeInfo[][] // 使用walk时，各个文件夹之间分散排序，避免创建时间不同的带来的干扰
  curr: string
}
/**
 * 全屏预览
 * @param props 
 * @returns 
 */
export function usePreview (props: Props) {
  const { scroller, sortedFiles, previewIdx, eventEmitter, canLoadNext, } = useHookShareState().toRefs()
  const previewing = ref(false)
  let waitScrollTo = null as number | null
  const onPreviewVisibleChange = (v: boolean, lv: boolean) => {
    previewing.value = v
    if (waitScrollTo != null && !v && lv) {
      // 关闭预览时滚动过去
      scroller.value?.scrollToItem(waitScrollTo)
      waitScrollTo = null
    }
  }

  const loadNextIfNeeded = () => {
    if (props.walkMode && props.target === 'local') {
      if (!canPreview('next') && canLoadNext) {
        message.info('即将加载下一个文件夹的文件')
        eventEmitter.value.emit('loadNextDir')
      }
    }
  }

  useWatchDocument('keydown', (e) => {
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
      loadNextIfNeeded()
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
    loadNextIfNeeded()
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
    }
    return isImageFile(sortedFiles.value[next]?.name) ?? ''
  }

  return {
    previewIdx,
    onPreviewVisibleChange,
    previewing,
    previewImgMove,
    canPreview
  }
}


export function useLocation (props: Props) {
  const np = ref<Progress.NProgress>()
  const { installedBaiduyun, scroller, stackViewEl, stack, currPage, currLocation, basePath, sortMethod } = useHookShareState().toRefs()

  watch(() => stack.value.length, debounce((v, lv) => {
    if (v !== lv) {
      scroller.value?.scrollToItem(0)
    }
  }, 300))

  onMounted(async () => {
    if (props.target === 'netdisk' && installedBaiduyun.value) {
      return
    }
    const resp = await getTargetFolderFiles(props.target, '/')
    stack.value.push({
      files: resp.files,
      curr: '/'
    })
    np.value = new NProgress()
    np.value!.configure({ parent: stackViewEl.value as any })
    if (props.path && props.path !== '/') {
      await to(props.path)
      if (props.walkMode) {
        await nextTick()
        const [firstDir] = sortFiles(currPage.value!.files, sortMethod.value).filter(v => v.type === 'dir')
        if (firstDir) {
          to(firstDir.fullpath)
        }
      }
    } else if (props.target == 'local') {
      global.conf?.home && to(global.conf.home)

    }
  })

  /**
   * 登录后重新获取
   */
  watch(() => props.target === 'netdisk' && installedBaiduyun.value && global.user, async (v, last) => {
    if (v && !last) {
      const resp = await getTargetFolderFiles(props.target, '/')
      stack.value = [{
        files: resp.files,
        curr: '/'
      }]
    }
  })


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
      const prev = basePath.value
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


export function useFilesDisplay (props: Props) {
  const { scroller, sortedFiles, stack, sortMethod, currLocation, currPage, stackViewEl,
    canLoadNext } = useHookShareState().toRefs()
  const { state } = useHookShareState()
  const moreActionsDropdownShow = ref(false)
  const viewMode = ref<ViewMode>('grid')
  const viewModeMap: Record<ViewMode, string> = { line: '详情列表', 'grid': '预览网格', 'large-size-grid': '大尺寸预览网格' }
  const sortMethodConv: SearchSelectConv<SortMethod> = {
    value: (v) => v,
    text: (v) => '按' + sortMethodMap[v]
  }
  const gridSize = 272
  const profileHeight = 64
  const largeGridSize = gridSize * 2
  const { width } = useElementSize(stackViewEl)
  const gridItems = computed(() => {
    const w = width.value
    if (viewMode.value === 'line' || !w) {
      return
    }
    return ~~(w / (viewMode.value === 'grid' ? gridSize : largeGridSize))
  })

  const itemSize = computed(() => {
    const mode = viewMode.value
    if (mode === 'line') {
      return { first: 80, second: undefined }
    }
    const second = (mode === 'grid' ? gridSize : largeGridSize)
    const first = second + profileHeight
    return {
      first,
      second
    }
  })

  const loadNextDirLoading = ref(false)


  const loadNextDir = async () => {
    if (loadNextDirLoading.value || !props.walkMode || !canLoadNext.value) {
      return
    }
    try {
      loadNextDirLoading.value = true
      const par = stack.value[stack.value.length - 2]
      const parFilesSorted = sortFiles(par.files, sortMethod.value)
      const currIdx = parFilesSorted.findIndex(v => v.name === currPage.value?.curr)
      if (currIdx !== -1) {
        const next = parFilesSorted[currIdx + 1]
        const p = path.normalize(path.join(currLocation.value, '../', next.name))
        const r = await getTargetFolderFiles(props.target, p)
        const page = currPage.value!
        page.curr = next.name
        if (!page.walkFiles) {
          page.walkFiles = [page.files]
        }
        page.walkFiles.push(r.files)
        console.log("curr page files length", currPage.value?.files.length)
      }
    } catch (e) {
      canLoadNext.value = false
    } finally {
      loadNextDirLoading.value = false
    }
    const s = scroller.value
    // 填充够一页，直到不行为止
    while (s && s.$_endIndex > sortedFiles.value.length - 10 && canLoadNext.value) {
      await loadNextDir()
    }
  }

  state.useEventListen('loadNextDir', loadNextDir)

  const onScroll = debounce(async () => {
    const s = scroller.value
    if (s && (s.$_endIndex > sortedFiles.value.length - 10) && props.walkMode) {
      loadNextDir()
    }
  }, 300)

  const thumbnailSize = computed(() => viewMode.value === 'grid' ? [global.gridThumbnailSize, global.gridThumbnailSize].join() : [global.largeGridThumbnailSize, global.largeGridThumbnailSize].join())
  return {
    gridItems,
    sortedFiles,
    sortMethodConv,
    viewModeMap,
    moreActionsDropdownShow,
    viewMode,
    gridSize,
    sortMethod,
    largeGridSize,
    onScroll,
    loadNextDir,
    loadNextDirLoading,
    canLoadNext,
    itemSize,
    thumbnailSize
  }
}



export function useFileTransfer (props: Props) {
  const { currLocation, sortedFiles, currPage, multiSelectedIdxs } = useHookShareState().toRefs()
  const recover = () => {
    multiSelectedIdxs.value = []
  }
  useWatchDocument('click', recover)
  useWatchDocument('blur', recover)
  watch(currPage, recover)

  const onFileDragStart = (e: DragEvent, idx: number) => {
    const file = cloneDeep(sortedFiles.value[idx])
    console.log('onFileDragStart set drag file ', e, idx, file)
    const files = [file]
    let includeDir = file.type === 'dir'
    if (multiSelectedIdxs.value.includes(idx)) {
      const selectedFiles = multiSelectedIdxs.value.map(idx => sortedFiles.value[idx])
      files.push(...selectedFiles)
      includeDir = selectedFiles.some(v => v.type === 'dir')

    }
    e.dataTransfer!.setData(
      'text/plain',
      JSON.stringify({
        from: props.target,
        includeDir,
        path: uniqBy(files, 'fullpath').map(f => f.fullpath)
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
          await global.createTaskRecordPaneIfNotExist(props.tabIdx)
          console.log('request createNewTask', { send_dirs: data.path, recv_dir: toPath, type })
          taskListStore.pendingBaiduyunTaskQueue.push({ send_dirs: data.path, recv_dir: toPath, type })
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



export function useFileItemActions (props: Props, { openNext }: { openNext: (file: FileNodeInfo) => Promise<void> }) {
  const showGenInfo = ref(false)
  const imageGenInfo = ref('')
  const { sortedFiles, previewIdx, multiSelectedIdxs, stack } = useHookShareState().toRefs()
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
      console.log(multiSelectedIdxs.value)

      e.stopPropagation()
    } else if (e.ctrlKey || e.metaKey) {
      multiSelectedIdxs.value.push(idx)
      e.stopPropagation()
    } else {
      await openNext(file)
    }
  }


  const onContextMenuClick = async (e: MenuInfo, file: FileNodeInfo, idx: number) => {
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
        break
      }
      case 'deleteFiles': {
        let selectedFiles: FileNodeInfo[] = []
        if (multiSelectedIdxs.value.includes(idx)) {
          selectedFiles = multiSelectedIdxs.value.map(idx => sortedFiles.value[idx])
        } else {
          selectedFiles.push(file)
        }
        Modal.confirm({
          title: '确认删除？',
          content: h('ol', { style: 'max-height:50vh;overflow:auto;' }, selectedFiles.map(v => v.fullpath.split(/[/\\]/).pop()).map(v => h('li', v))),
          async onOk () {
            const paths = selectedFiles.map(v => v.fullpath)
            await deleteFiles(props.target, paths)
            message.success('删除成功')
            const top = last(stack.value)!
            top.files = top.files.filter(v => !paths.includes(v.fullpath))
            if (top.walkFiles) {
              top.walkFiles = top.walkFiles.map(files => files.filter(file => !paths.includes(file.fullpath)))
            }
          },
        })
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
