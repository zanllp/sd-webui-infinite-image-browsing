import { getTargetFolderFiles, FileNodeInfo } from '@/api/files'
import { openCreateFlodersModal } from '@/components/functionalCallableComp'
import { t } from '@/i18n'
import { DatabaseOutlined } from '@/icon'
import { TagSearchTabPane, FuzzySearchTabPane, FileTransferTabPane, EmptyStartTabPane } from '@/store/useGlobalStore'
import { copy2clipboardI18n, makeAsyncFunctionSingle, useGlobalEventListen } from '@/util'
import { message } from 'ant-design-vue'
import { ref, watch, onMounted, h, computed } from 'vue'
import { delay, ok, useWatchDocument } from 'vue3-ts-util'
import { useHookShareState, stackCache, global } from '.'

import * as Path from '@/util/path'
import type Progress from 'nprogress'
// @ts-ignore
import NProgress from 'multi-nprogress'

import { cloneDeep, debounce, last, uniqueId } from 'lodash-es'


/**
 * 路径栏相关
 */
export function useLocation () {
  const np = ref<Progress.NProgress>()
  const {
    scroller,
    stackViewEl,
    stack,
    currPage,
    currLocation,
    useEventListen,
    eventEmitter,
    getPane,
    props,
    deletedFiles,
    walker,
    sortedFiles
  } = useHookShareState().toRefs()

  watch(
    () => stack.value.length,
    debounce((v, lv) => {
      if (v !== lv) {
        scroller.value?.scrollToItem(0)
      }
    }, 300)
  )

  const handleWalkModeTo = async (path: string) => {
    await to(path)
    if (props.value.mode === 'walk') {
      await delay()
      await walker.value?.reset()
      eventEmitter.value.emit('loadNextDir')
    }
  }

  onMounted(async () => {
    if (!stack.value.length) {
      // 有传入stack时直接使用传入的
      if (props.value.mode === 'scanned-fixed') {
        stack.value = [{ files: [], curr: '' }]
      } else {
        const resp = await getTargetFolderFiles('/')
        stack.value.push({
          files: resp.files,
          curr: '/'
        })
      }
    }
    np.value = new NProgress()
    np.value!.configure({ parent: stackViewEl.value as any })
    if (props.value.path && props.value.path !== '/') {
      await handleWalkModeTo(props.value.path)
    } else {
      global.conf?.home && to(global.conf.home)
    }
  })

  watch(
    currLocation,
    debounce((loc) => {
      const pane = getPane.value()
      if (!pane) {
        return
      }
      pane.path = loc
      const filename = pane.path!.split('/').pop() ?? ''
      const getTitle = () => {
        const prefix = {
          walk: 'Walk',
          'scanned-fixed': 'Fixed',
          scanned: null
        }[props.value.mode ?? 'scanned']
        const wrap = (v: string) => prefix ? `${prefix}: ${v}` : v
        const np = Path.normalize(loc)
        for (const [k, v] of Object.entries(global.pathAliasMap)) {
          if (np.startsWith(v)) {
            return wrap(np.replace(v, k))
          }
        }
        return wrap(filename)
      }
      const title = getTitle()
      pane.name = h('div', { style: 'display:flex;align-items:center' }, [
        h(DatabaseOutlined),
        h('span', { class: 'line-clamp-1', style: 'max-width: 256px' }, title)
      ])
      pane.nameFallbackStr = title
      global.recent = global.recent.filter((v) => v.key !== pane.key)
      global.recent.unshift({ path: loc, key: pane.key })
      if (global.recent.length > 20) {
        global.recent = global.recent.slice(0, 20)
      }
    }, 300)
  )

  const copyLocation = () => copy2clipboardI18n(currLocation.value)

  const openNext = async (file: FileNodeInfo) => {
    if (file.type !== 'dir') {
      return
    }
    try {
      np.value?.start()
      const { files } = await getTargetFolderFiles(file.fullpath)
      if (props.value.mode == 'scanned-fixed') {
        stack.value = [{
          files,
          curr: file.fullpath
        }]
      } else {
        stack.value.push({
          files,
          curr: file.name
        })
      }
    } finally {
      np.value?.done()
    }
  }

  const back = (idx: number) => {
    while (idx < stack.value.length - 1) {
      stack.value.pop()
    }
  }

  const backToLastUseTo = () => {
    const lastLevelPath = Path.join(...Path.splitPath(currLocation.value).slice(0, -1))
    to(lastLevelPath)
  }

  const isDirNameEqual = (a: string, b: string) => {
    ok(global.conf, 'global.conf load failed')
    if (global.conf.is_win) {
      // window下忽略
      return a.toLowerCase() == b.toLowerCase()
    }
    return a == b
  }

  const to = async (dir: string) => {
    if (props.value.mode === 'scanned-fixed') {
      return openNext({ fullpath: dir, name: dir, type: 'dir' } as FileNodeInfo)
    }
    const backup = stack.value.slice()
    try {
      if (!Path.isAbsolute(dir)) {
        // 相对路径
        dir = Path.join(global.conf?.sd_cwd ?? '/', dir)
      }
      const frags = Path.splitPath(dir)
      const currPaths = stack.value.map((v) => v.curr)
      currPaths.shift() // 是 /
      while (currPaths[0] && frags[0]) {
        if (!isDirNameEqual(currPaths[0], frags[0])) {
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
        const target = currPage.value?.files.find((v) => isDirNameEqual(v.name, frag))
        if (!target) {
          console.error({ frags, frag, stack: cloneDeep(stack.value) })
          throw new Error(`${frag} not found`)
        }
        await openNext(target)
      }
    } catch (error) {
      message.error(t('moveFailedCheckPath') + (error instanceof Error ? error.message : ''))
      console.error(dir, Path.splitPath(dir), currPage.value)
      stack.value = backup
      throw error
    }
  }

  const refresh = makeAsyncFunctionSingle(async () => {
    try {
      np.value?.start()
      if (walker.value) {
        await walker.value.reset()
        eventEmitter.value.emit('loadNextDir')
      } else {
        
        const { files } = await getTargetFolderFiles(
          stack.value.length === 1 && props.value.mode !== 'scanned-fixed' ? '/' : currLocation.value
        )
        last(stack.value)!.files = files
      }

      deletedFiles.value.clear()
      scroller.value?.scrollToItem(0)
      message.success(t('refreshCompleted'))
    } finally {
      np.value?.done()
    }
  })

  useGlobalEventListen(
    'returnToIIB',
    makeAsyncFunctionSingle(async () => {
      if (props.value.mode === 'walk') return
      try {
        np.value?.start()
        const { files } = await getTargetFolderFiles(
          stack.value.length === 1 && props.value.mode !== 'scanned-fixed' ? '/' : currLocation.value
        )
        const currFiles = last(stack.value)!.files
        if (currFiles.map((v) => v.date).join() !== files.map((v) => v.date).join()) {
          last(stack.value)!.files = files
          message.success(t('autoUpdate'))
        }
      } finally {
        np.value?.done()
      }
    })
  )

  useEventListen.value('refresh', refresh)

  const quickMoveTo = (path: string) => {
    // todo
    handleWalkModeTo(path)
  }

  const normalizedScandPath = computed(() => {
    return global.quickMovePaths.map((v) => ({ ...v, path: Path.normalize(v.dir) }))
  })

  const searchPathInfo = computed(() => {
    const c = Path.normalize(currLocation.value)
    const path = normalizedScandPath.value.find((v) => v.path === c)
    return path
  })

  const addToSearchScanPathAndQuickMove = async () => {
    const tab = global.tabList[props.value.tabIdx]
    const pane: EmptyStartTabPane = { 
      type: 'empty', 
      name: t('emptyStartPage'), 
      key: Date.now() + uniqueId(),
      popAddPathModal: {
        path: currLocation.value,
        type: 'scanned'
      }
    }
    tab.panes.push(pane)
    tab.key = pane.key
  }

  const isLocationEditing = ref(false)
  const locInputValue = ref(currLocation.value)
  const onEditBtnClick = () => {
    isLocationEditing.value = true
    locInputValue.value = currLocation.value
  }

  const onLocEditEnter = async () => {
    await to(locInputValue.value)
    isLocationEditing.value = false
  }

  useWatchDocument('click', (e) => {
    if (!(e.target as HTMLElement)?.className?.includes?.('ant-input')) {
      isLocationEditing.value = false
    }
  })

  const share = () => {
    const loc = parent.location
    const baseUrl = loc.href.substring(0, loc.href.length - loc.search.length)
    const params = new URLSearchParams(loc.search)
    params.set('action', 'open')
    if (walker.value) {
      params.set('walk', '1')
    }
    params.set('path', currLocation.value)
    params.set('mode', props.value.mode ?? 'scanned')
    const url = `${baseUrl}?${params.toString()}`
    copy2clipboardI18n(url, t('copyLocationUrlSuccessMsg'))
  }

  const searchInCurrentDir = (type: (TagSearchTabPane | FuzzySearchTabPane)['type'] = 'tag-search') => {
    const tab = global.tabList[props.value.tabIdx]
    const pane = {
      type,
      key: uniqueId(),
      searchScope: currLocation.value,
      name: t(type === 'tag-search' ? 'imgSearch' : 'fuzzy-search'),
    }
    tab.panes.push(pane)
    tab.key = pane.key
  }

  const selectAll = () => eventEmitter.value.emit('selectAll')

  const onCreateFloderBtnClick = async () => {
    await openCreateFlodersModal(currLocation.value)
    await refresh()
  }

  const onWalkBtnClick = () => {
    const path = currLocation.value
    stackCache.set(path, stack.value)
    const tab = global.tabList[props.value.tabIdx]
    const pane: FileTransferTabPane = {
      type: 'local',
      key: uniqueId(),
      path: path,
      name: t('local'),
      stackKey: path,
      mode: 'walk'
    }
    tab.panes.push(pane)
    tab.key = pane.key
  }

  const showWalkButton = computed(() => !walker.value && sortedFiles.value.some(v => v.type === 'dir'))

  return {
    locInputValue,
    isLocationEditing,
    onLocEditEnter,
    onEditBtnClick,
    addToSearchScanPathAndQuickMove,
    searchPathInfo,
    refresh,
    copyLocation,
    back,
    openNext,
    currPage,
    currLocation,
    to,
    stack,
    scroller,
    share,
    selectAll,
    quickMoveTo,
    onCreateFloderBtnClick,
    onWalkBtnClick,
    showWalkButton,
    searchInCurrentDir,
    backToLastUseTo
  }
}