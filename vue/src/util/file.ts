import type { FileNodeInfo } from '@/api/files'
import { apiBase } from '@/api'
import { uniqBy } from 'lodash-es'

const encode = encodeURIComponent
export const toRawFileUrl = (file: FileNodeInfo, download = false) =>
  `${apiBase.value}/file?path=${encode(file.fullpath)}&t=${encode(file.date)}${
    download ? `&disposition=${encode(file.name)}` : ''
  }`
export const toImageThumbnailUrl = (file: FileNodeInfo, size: string = '512x512') =>
  `${apiBase.value}/image-thumbnail?path=${encode(file.fullpath)}&size=${size}&t=${encode(
    file.date
  )}`

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

export function isImageFile(filename: string): boolean {
  if (typeof filename !== 'string') {
    return false
  }
  const exts = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp']
  const extension = filename.split('.').pop()?.toLowerCase()
  return extension !== undefined && exts.includes(`.${extension}`)
}

export function isVideoFile(filename: string): boolean {
  if (typeof filename !== 'string') {
    return false
  }
  const exts = ['.mp4', '.avi', '.mov', '.mkv']
  const extension = filename.split('.').pop()?.toLowerCase()
  return extension !== undefined && exts.includes(`.${extension}`)
}

export const isMediaFile = (file: string) => isImageFile(file) || isVideoFile(file)

export function downloadFiles(urls: string[]) {
  const link = document.createElement('a');
  link.style.display = 'none';
  document.body.appendChild(link);

  urls.forEach((url) => {
    link.href = url;
    link.download = ''
    link.click();
  });

  document.body.removeChild(link);
}