import type { FileNodeInfo } from '@/api/files'
import type { TiktokMediaItem } from '@/store/useTiktokStore'
import { useTiktokStore } from '@/store/useTiktokStore'
import { isVideoFile, isImageFile, isAudioFile } from '@/util'
import { toRawFileUrl, toStreamVideoUrl, toStreamAudioUrl } from '@/util/file'

/**
 * 将 FileNodeInfo 转换为 TiktokMediaItem
 */
export const fileToTiktokItem = (file: FileNodeInfo): TiktokMediaItem => {
  const isVideo = isVideoFile(file.name)
  const isAudio = isAudioFile(file.name)
  
  let url: string
  let type: 'image' | 'video' | 'audio'
  
  if (isVideo) {
    url = toStreamVideoUrl(file)
    type = 'video'
  } else if (isAudio) {
    url = toStreamAudioUrl(file)
    type = 'audio'
  } else {
    url = toRawFileUrl(file)
    type = 'image'
  }
  
  return {
    id: file.fullpath,
    url,
    type,
    // 保留原始文件信息以供后续使用
    originalFile: file,
    name: file.name,
    fullpath: file.fullpath
  }
}

/**
 * 将 FileNodeInfo 数组转换为 TiktokMediaItem 数组，只包含媒体文件
 */
export const filesToTiktokItems = (files: FileNodeInfo[]): TiktokMediaItem[] => {
  return files
    .filter(file => file.type === 'file' && (isImageFile(file.name) || isVideoFile(file.name) || isAudioFile(file.name)))
    .map(fileToTiktokItem)
}

/**
 * 从 URL 列表直接创建 TiktokMediaItem 数组
 */
export const urlsToTiktokItems = (urls: string[]): TiktokMediaItem[] => {
  return urls.map((url) => {
    let type: 'image' | 'video' | 'audio' = 'image'
    if (isVideoFile(url)) {
      type = 'video'
    } else if (isAudioFile(url)) {
      type = 'audio'
    }
    return {
      id: url,
      url: url,
      type
    }
  })
}

/**
 * 便捷函数：打开抖音式浏览器查看文件列表
 */
export const openTiktokViewWithFiles = (files: FileNodeInfo[], startIndex = 0) => {
  startIndex = Math.min(startIndex, files.length - 1)
  startIndex = Math.max(startIndex, 0)
  const tiktokStore = useTiktokStore()
  const items = filesToTiktokItems(files)
  
  if (items.length === 0) {
    console.warn('没有找到可以显示的媒体文件')
    return
  }
  
  // 调整起始索引，确保对应正确的媒体文件
  let adjustedStartIndex = 0
  if (startIndex < files.length) {
    const targetFile = files[startIndex]
    adjustedStartIndex = items.findIndex(item => item.id === targetFile.fullpath)
    if (adjustedStartIndex === -1) {
      adjustedStartIndex = 0
    }
  }
  
  tiktokStore.openTiktokView(items, adjustedStartIndex)
}

/**
 * 便捷函数：打开抖音式浏览器查看 URL 列表
 */
export const openTiktokViewWithUrls = (urls: string[], startIndex = 0) => {
  const tiktokStore = useTiktokStore()
  const items = urlsToTiktokItems(urls)
  
  if (items.length === 0) {
    console.warn('没有找到可以显示的媒体URL')
    return
  }
  
  tiktokStore.openTiktokView(items, startIndex)
}

/**
 * 便捷函数：打开抖音式浏览器查看单个文件
 */
export const openTiktokViewWithFile = (file: FileNodeInfo) => {
  openTiktokViewWithFiles([file], 0)
}

/**
 * 便捷函数：打开抖音式浏览器查看单个 URL
 */
export const openTiktokViewWithUrl = (url: string) => {
  openTiktokViewWithUrls([url], 0)
} 