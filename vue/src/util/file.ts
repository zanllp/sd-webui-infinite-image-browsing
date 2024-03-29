import type { FileNodeInfo } from '@/api/files'
import { apiBase } from '@/api'
import { uniqBy } from 'lodash-es'
import { isTauri } from './env'

const encode = encodeURIComponent
export const toRawFileUrl = (file: FileNodeInfo, download = false) =>
  `${apiBase.value}/file?path=${encode(file.fullpath)}&t=${encode(file.date)}${download ? `&disposition=${encode(file.name)}` : ''
  }`
export const toImageThumbnailUrl = (file: FileNodeInfo, size: string = '512x512') =>
  `${apiBase.value}/image-thumbnail?path=${encode(file.fullpath)}&size=${size}&t=${encode(
    file.date
  )}`

export const toStreamVideoUrl = (file: FileNodeInfo) =>
  `${apiBase.value}/stream_video?path=${encode(file.fullpath)}`

export const toVideoCoverUrl = (file: FileNodeInfo) =>
  (isTauri ? '' : parent.document.location.origin)+ `${apiBase.value}/video_cover?path=${encode(file.fullpath)}&t=${encode(file.date)}`

export type FileTransferData = {
  path: string[]
  loc: string
  includeDir: boolean
  nodes: FileNodeInfo[]
  __id: 'FileTransferData'
}

export const isFileTransferData = (v: any): v is FileTransferData =>
  typeof v === 'object' && v.__id === 'FileTransferData'

export const getFileTransferDataFromDragEvent = (e: DragEvent) => {
  const data = JSON.parse(e.dataTransfer?.getData('text') ?? '{}')
  return isFileTransferData(data) ? data : null
}

export const uniqueFile = (files: FileNodeInfo[]) => uniqBy(files, 'fullpath')

export function isImageFile (filename: string): boolean {
  if (typeof filename !== 'string') {
    return false
  }
  const exts = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp']
  const extension = filename.split('.').pop()?.toLowerCase()
  return extension !== undefined && exts.includes(`.${extension}`)
}

export function isVideoFile (filename: string): boolean {
  if (typeof filename !== 'string') {
    return false
  }
  const exts = ['.mp4', '.avi', '.mkv', '.mov', '.wmv', '.flv', '.ts']
  const extension = filename.split('.').pop()?.toLowerCase()
  return extension !== undefined && exts.includes(`.${extension}`)
}

export const isMediaFile = (file: string) => isImageFile(file) || isVideoFile(file)

export function downloadFiles (urls: string[]) {
  const link = document.createElement('a')
  link.style.display = 'none'
  document.body.appendChild(link)

  urls.forEach((url) => {
    const urlObject = new URL(url, 'https://github.com/zanllp/sd-webui-infinite-image-browsing')
    let filename = ''
    const disposition = urlObject.searchParams.get('disposition')
    if (disposition) {
      filename = disposition
    }
    link.href = url
    link.download = filename
    link.click()
  })

  document.body.removeChild(link)
}

export const downloadFileInfoJSON = (files: FileNodeInfo[], name?: string) => {
  const url = window.URL.createObjectURL(new Blob([JSON.stringify({
    files
  }, null, 4)]))
  const link = document.createElement('a')
  link.href = url
  link.setAttribute('download', `iib_imginfo_${name ?? new Date().toLocaleString()}.json`)
  document.body.appendChild(link)
  link.click()
}