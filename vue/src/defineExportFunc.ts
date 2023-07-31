import { GridViewFile, TabPane, useGlobalStore } from './store/useGlobalStore'
import { Dict, globalEvents } from './util'
import { uniqueId } from 'lodash-es'


export const exportFn = async (g: ReturnType<typeof useGlobalStore>)  => {
  if (!g.conf?.export_fe_fn) {
    return
  }
  const insertTabPane = ({
    tabIdx = 0,
    paneIdx = 0,
    pane
  }: {
    tabIdx?: number
    paneIdx?: number
    pane: TabPane
  }) => {
    const tab = g.tabList[tabIdx]
    if (!pane.key) {
      ;(pane as any).key = uniqueId()
    }
    tab.panes.splice(paneIdx, 0, pane)
    tab.key = pane.key
    return {
      key: pane.key,
      ref: getPageRef(pane.key)
    }
  }

  define({
    insertTabPane,
    getTabList: () => g.tabList,
    getPageRef,
    createGridViewFile(path: string, tags:string[] = []): GridViewFile {
      return {
        name: path.split(/[/\\]/).pop() ?? '',
        size: '-',
        bytes: 0,
        type: 'file',
        created_time: '',
        date: '',
        fullpath: path,
        tags: tags.map(v => ({ name: v })),
        is_under_scanned_path: true
      }
    }
  })

  
  function getPageRef (key: string) {
    return new Proxy({}, {
      get(_target, p, _receiver) {
        if (p === 'close') {
          const tabIdx = g.tabList.findIndex(v => v.panes.some(v => v.key === key))
          return () => globalEvents.emit('closeTabPane', tabIdx , key)
        }
        return g.pageFuncExportMap.get(key)?.[p as string]
      },
    })
  }

  
  function define(funcs: Dict<(...args: any[]) => any>) {
    const w = window as any
    for (const key in funcs) {
      w[key] = (...args: any) => {
        return funcs[key](...args)
      }
    }
  }
  
}