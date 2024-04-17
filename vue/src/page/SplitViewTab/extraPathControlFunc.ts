
import { ExtraPathType, addExtraPath, aliasExtraPath, removeExtraPath } from '@/api/db'
import { globalEvents } from '@/util'
import { Input, Modal, message } from 'ant-design-vue'
import { open } from '@tauri-apps/api/dialog'
import { checkPathExists } from '@/api'
import { h, ref } from 'vue'
import { t } from '@/i18n'
import { useGlobalStore } from '@/store/useGlobalStore'



export const addToExtraPath = async (type: ExtraPathType) => {
  const g = useGlobalStore()
  let path: string
  if (import.meta.env.TAURI_ARCH) {
    const ret = await open({ directory: true })
    if (typeof ret === 'string') {
      path = ret
    } else {
      return
    }
  } else {
    path = await new Promise<string>((resolve) => {
      const key = ref('')
      Modal.confirm({
        title: t('inputTargetFolderPath'),
        width: '800px',
        content: () => {
          return h('div', [
            g.conf?.enable_access_control ? h('a', { 
              style: { 
                'word-break': 'break-all',
                'margin-bottom': '4px',
                display: 'block'
              },
              target: '_blank',
              href: 'https://github.com/zanllp/sd-webui-infinite-image-browsing/issues/518'
            }, 'Please open this link first (Access Control mode only)') : '',
            h(Input, {
              value: key.value,
              'onUpdate:value': (v: string) => (key.value = v)
            })
          ])
        },
        async onOk () {
          const path = key.value
          const res = await checkPathExists([path])
          if (res[path]) {
            resolve(key.value)
          } else {
            message.error(t('pathDoesNotExist'))
          }
        }
      })
    })
  }
  Modal.confirm({
    content: t('confirmToAddToExtraPath'),
    async onOk () {
      await addExtraPath({ types: [type], path })
      message.success(t('addCompleted'))
      globalEvents.emit('searchIndexExpired')
      globalEvents.emit('updateGlobalSetting')
    }
  })
}

export const onRemoveExtraPathClick = (path: string, type: ExtraPathType) => {
  Modal.confirm({
    content: t('confirmDelete'),
    closable: true,
    async onOk () {
      await removeExtraPath({ types: [type], path })
      message.success(t('removeCompleted'))
      globalEvents.emit('searchIndexExpired')
      globalEvents.emit('updateGlobalSetting')
    }
  })
}

export const onAliasExtraPathClick = (path: string) => {
  const alias = ref('')
  Modal.confirm({
    title: t('inputAlias'),
    content: () => {
      return h('div', [
        h('div', { 
          style: { 
            'word-break': 'break-all',
            'margin-bottom': '4px'
          } 
        }, 'Path: ' + path),
        h(Input, {
          value: alias.value,
          'onUpdate:value': (v: string) => (alias.value = v)
        })]
      )
    },
    async onOk () {
      await aliasExtraPath({ alias: alias.value, path })
      message.success(t('addAliasCompleted'))
      globalEvents.emit('updateGlobalSetting')
    }
  })
}