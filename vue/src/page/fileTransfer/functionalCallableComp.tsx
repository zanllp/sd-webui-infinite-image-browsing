import { Input, Modal } from 'ant-design-vue'
import { ref } from 'vue'
import * as Path from '@/util/path'
import { mkdirs } from '@/api/files'
import { t } from '@/i18n'

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

