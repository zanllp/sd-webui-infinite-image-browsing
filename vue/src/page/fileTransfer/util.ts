import type { FileNodeInfo } from '@/api/files'

const encode = encodeURIComponent
export const toRawFileUrl = (file: FileNodeInfo, download = false) =>
  `/infinite_image_browsing/file?path=${encode(file.fullpath)}&t=${encode(file.date)}${
    download ? `&disposition=${encode(file.name)}` : ''
  }`
export const toImageThumbnailUrl = (file: FileNodeInfo, size: string = '256x256') =>
  `/infinite_image_browsing/image-thumbnail?path=${encode(file.fullpath)}&size=${size}&t=${encode(
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
  