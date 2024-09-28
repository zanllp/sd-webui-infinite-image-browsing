import { Button, Input, Modal, message } from 'ant-design-vue'
import { StyleValue, ref } from 'vue'
import * as Path from '@/util/path'
import { FileNodeInfo, mkdirs } from '@/api/files'
import { setTargetFrameAsCover } from '@/api'
import { t } from '@/i18n'
import { downloadFiles, globalEvents, toRawFileUrl, toStreamVideoUrl } from '@/util'
import { DownloadOutlined } from '@/icon'
import { isStandalone } from '@/util/env'
import { addCustomTag, getDbBasicInfo, rebuildImageIndex, renameFile } from '@/api/db'
import { useTagStore } from '@/store/useTagStore'
import { useGlobalStore } from '@/store/useGlobalStore'
import { base64ToFile, video2base64 } from '@/util/video'

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
  const videoRef = ref<HTMLVideoElement | null>(null)
  const onSetCurrFrameAsVideoPoster = async  () => {
    if (!videoRef.value) {
      return
    }
    const video = videoRef.value
    video.pause()
    const base64 = video2base64(video)
    await setTargetFrameAsCover({ path: file.fullpath, base64_img: base64, updated_time: file.date } )
    file.cover_url = URL.createObjectURL(await base64ToFile(base64, 'cover'))
    message.success(t('success') + '!  ' + t('clearCacheIfNotTakeEffect'))
  }
  const tagBaseStyle: StyleValue = {
    margin: '2px',
    padding: '2px 16px',
    'border-radius': '4px',
    display: 'inline-block',
    cursor: 'pointer',
    'font-weight': 'bold',
    transition: '.5s all ease',
    'user-select': 'none',
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
        <video ref={videoRef} style={{ maxHeight: isStandalone ? '80vh' : '60vh', maxWidth: '100%', minWidth: '70%' }} src={toStreamVideoUrl(file)} controls autoplay></video>
        <div style={{ marginTop: '4px' }}>
          <div onClick={openAddNewTagModal}  style={{
            background: 'var(--zp-primary-background)', 
            color: 'var(--zp-luminous)',
            border: '2px solid var(--zp-luminous)',
            ...tagBaseStyle
          }}>
            { t('addNewCustomTag') }
          </div>
          {global.conf!.all_custom_tags.map((tag) => 
            <div key={tag.id} onClick={() => onTagClick?.(tag.id)}  style={{
              background: isSelected(tag.id) ? tagStore.getColor(tag) : 'var(--zp-primary-background)', 
              color: !isSelected(tag.id) ? tagStore.getColor(tag) : 'white', 
              border: `2px solid ${tagStore.getColor(tag)}`,
              ...tagBaseStyle
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
          <Button onClick={onSetCurrFrameAsVideoPoster}>
            {{
              default: t('setCurrFrameAsVideoPoster')
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


export const openRenameFileModal = (path: string) => {
  const name = ref(path.split(/[\\/]/).pop() ?? '')
  return new Promise<string>((resolve) => {
    Modal.confirm({
      title: t('rename'),
      content: () => <Input v-model:value={name.value} />,
      async onOk() {
        if (!name.value) {
          return
        }
        const resp = await renameFile({ path, name: name.value })
        resolve(resp.new_path)
      }
    })
  })
}


export const openAddNewTagModal = () => {
  const name = ref('')
  const global = useGlobalStore()
  return new Promise<string>((resolve) => {
    Modal.confirm({
      title: t('addNewCustomTag'),
      content: () => <Input v-model:value={name.value} />,
      async onOk() {
        if (!name.value) {
          return
        }
        const info = await getDbBasicInfo()
        const tag = await addCustomTag({ tag_name: name.value })
        if (tag.type !== 'custom') {
          message.error(t('existInOtherType'))
          throw new Error(t('existInOtherType'))
        }
        if (info.tags.find((v) => v.id === tag.id)) {
          message.error(t('alreadyExists'))
          throw new Error(t('alreadyExists'))
        } else {
          global.conf?.all_custom_tags.push(tag)
          message.success(t('success'))
        }
        resolve(name.value)
      }
    })
  })
}

