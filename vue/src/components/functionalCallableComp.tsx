import { Button, Input, Modal, message } from 'ant-design-vue'
import { ref } from 'vue'
import * as Path from '@/util/path'
import { FileNodeInfo, mkdirs } from '@/api/files'
import { t } from '@/i18n'
import { downloadFiles, globalEvents, toRawFileUrl } from '@/util'
import { DownloadOutlined } from '@/icon'
import { isStandalone } from '@/util/env'
import { rebuildImageIndex } from '@/api/db'

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

export const openVideoModal = (file: FileNodeInfo) => {
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
        <video style={{ maxHeight: isStandalone ? '80vh' : '60vh' }} src={toRawFileUrl(file)} controls autoplay></video>
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
