import type { FileTransferTabPane, useGlobalStore } from './store/useGlobalStore'
import { Dict, removeQueryParams, switch2IBB } from './util'
import { uniqueId } from 'lodash-es'

export const resolveQueryActions = async (g: ReturnType<typeof useGlobalStore>) => {
  const paths = g.conf?.global_setting
  const params = new URLSearchParams(parent.location.search)
  switch (params.get('action')) {
    case 'open': {
      let path = params.get('path')

      if (!path || !paths) return
      const map: Dict<string> = {
        extra: paths.outdir_extras_samples,
        save: paths.outdir_save,
        txt2img: paths.outdir_txt2img_samples,
        img2img: paths.outdir_img2img_samples
      }
      if (map[path]) {
        path = map[path]
      }
      const tab = g.tabList[0]
      const pane: FileTransferTabPane = {
        type: 'local',
        path,
        key: uniqueId(),
        name: '',
        walkModePath: params.get('walk') ? path : undefined
      }
      tab.panes.unshift(pane)
      tab.key = pane.key
      switch2IBB()
      removeQueryParams(['action', 'path', 'walk'])
      break
    }
  }
}
