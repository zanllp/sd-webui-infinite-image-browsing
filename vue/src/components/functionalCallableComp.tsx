import { Button, Input, Modal, message } from 'ant-design-vue'
import { ref } from 'vue'
import * as Path from '@/util/path'
import { FileNodeInfo, mkdirs } from '@/api/files'
import { t } from '@/i18n'
import { downloadFiles, globalEvents, toRawFileUrl, toStreamVideoUrl } from '@/util'
import { DownloadOutlined } from '@/icon'
import { isStandalone } from '@/util/env'
import { rebuildImageIndex } from '@/api/db'
import { useTagStore } from '@/store/useTagStore'
import { useGlobalStore } from '@/store/useGlobalStore'

export const openCreateFlodersModal = (base: string) => {
  const floderName = ref('')
  return new Promise<void>((resolve) => {
    Modal.confirm({
      title: t('inputFolderName'),
      content: () => <Input v-model:value={floderName.value} />,
      async onOk() {
        if (!floderName.value) {
          return
        }
        const dest = Path.join(base, floderName.value)
        await mkdirs(dest)
        resolve()
      }
    })
  })
}

export const MultiSelectTips = () => (
  <p
    style={{
      background: 'var(--zp-secondary-background)',
      padding: '8px',
      borderLeft: '4px solid var(--primary-color)'
    }}
  >
    Tips: {t('multiSelectTips')}
  </p>
)


export const openVideoModal = (file: FileNodeInfo, onTagClick?: (id: string| number) => void) => {
  const tagStore = useTagStore()
  const global = useGlobalStore()
  const isSelected = (id: string | number) => {
    return !!tagStore.tagMap.get(file.fullpath)?.some(v => v.id === id)
  }
  Modal.confirm({
    width: '80vw',
    title: file.name,
    icon: null,
    content: () => (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column'
        }}
      >
        <video style={{ maxHeight: isStandalone ? '80vh' : '60vh', maxWidth: '100%', minWidth: '70%' }} src={toStreamVideoUrl(file)} controls autoplay></video>
        <div style={{ marginTop: '4px' }}>
          {global.conf!.all_custom_tags.map((tag) => 
            <div key={tag.id} onClick={() => onTagClick?.(tag.id)}  style={{
              background: isSelected(tag.id) ? tagStore.getColor(tag.name) : 'var(--zp-primary-background)', 
              color: !isSelected(tag.id) ? tagStore.getColor(tag.name) : 'white', 
              margin: '2px',
              padding: '2px 16px',
              'border-radius': '4px',
              display: 'inline-block',
              cursor: 'pointer',
              'font-weight': 'bold',
              transition: '.5s all ease',
              border: `2px solid ${tagStore.getColor(tag.name)}`,
              'user-select': 'none',
            }}>
              { tag.name }
            </div>)}
        </div>
        <div class="actions" style={{ marginTop: '16px' }}>
          <Button onClick={() => downloadFiles([toRawFileUrl(file, true)])}>
            {{
              icon: <DownloadOutlined/>,
              default: t('download')
            }}
          </Button>
        </div>
      </div>
    ),
    maskClosable: true,
    wrapClassName: 'hidden-antd-btns-modal'
  })
}

export const openRebuildImageIndexModal = () => {
  Modal.confirm({
    title: t('confirmRebuildImageIndex'),
    onOk: async () => {
      await rebuildImageIndex()
      globalEvents.emit('searchIndexExpired')
      message.success(t('rebuildComplete'))
    }
  })
}
