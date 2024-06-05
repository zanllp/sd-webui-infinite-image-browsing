
import { ExtraPathType, addExtraPath, aliasExtraPath, removeExtraPath } from '@/api/db'
import { globalEvents } from '@/util'
import { Input, Modal, RadioButton, RadioGroup, message } from 'ant-design-vue'
import { open } from '@tauri-apps/api/dialog'
import { checkPathExists } from '@/api'
import { h, ref } from 'vue'
import { t } from '@/i18n'
import { useGlobalStore } from '@/store/useGlobalStore'



export const addToExtraPath = async (initType: ExtraPathType, initPath?: string) => {
  const g = useGlobalStore()
  let path: string = initPath ?? ''

  const type = ref(initType)
  if (import.meta.env.TAURI_ARCH) {
    const ret = await open({ directory: true, defaultPath: initPath })
    if (typeof ret === 'string') {
      path = ret
    } else {
      return
    }
  } else {
    path = await new Promise<string>((resolve) => {
      const key = ref(path)
      console.log('dfd', key.value)
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
            }),
            h('div', [
              h('span', t('type')+': '),
              h(RadioGroup, {
                value: type.value,
                'onUpdate:value': (v: ExtraPathType) => (type.value = v),
                buttonStyle: 'solid',
                style: { margin: '16px 0 32px' }
              }, [
                h(RadioButton, { value: 'walk' }, 'Walk'),
                h(RadioButton, { value: 'scanned' }, 'Normal'),
                h(RadioButton, { value: 'scanned-fixed' }, 'Fixed')
              ])
            ]),
            h('p', 'Walk: 无需翻页即可浏览指定文件夹下的所有文件，使用无限滚动的方式呈现。将会使用DFS的方式遍历所有文件. 注意:该模式下排序仅在同层之间进行'),
            h('p', 'Normal: 类似于windows的文件浏览器，拥有较高的灵活性. 但在访问云存储或者类似SMB这样的地方时可能会出现异常'),
            h('p', 'Fixed: 类似Normal模式，但页面初始速度更快，兼容性更好，灵活性稍差。在Normal模式下出现了异常的话都可以改用这个试试')
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
      await addExtraPath({ types: [type.value], path })
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