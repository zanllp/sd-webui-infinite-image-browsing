import { delay, ok } from 'vue3-ts-util'



export class UnsupportedVideoEncodingError extends Error {
  constructor() {
    super('当前浏览器不支持该视频编码，请转换为常用的视频格式再上传')
    this.name = 'UnsupportedVideoEncodingError'
  }
}

let canvasInst: HTMLCanvasElement
let canvasCtxInst: CanvasRenderingContext2D

export const base64ToFile = async (
  src: string,
  fileName: string,
  mimeType = 'image/webp'
) => {
  const res = await fetch(src)
  const buf = await res.arrayBuffer()
  const file = new File([buf], fileName, { type: mimeType })
  return file
}

export const video2base64 = (video: HTMLVideoElement, type = 'image/webp') => {
  if (!canvasCtxInst) {
    canvasInst = document.createElement('canvas')
    const ctx = canvasInst.getContext('2d')
    ok(ctx)
    canvasCtxInst = ctx
  }
  const { videoHeight, videoWidth } = video
  canvasInst.width = videoWidth
  canvasInst.height = videoHeight
  canvasCtxInst.drawImage(video, 0, 0, videoWidth, videoHeight)
  return canvasInst.toDataURL(type)
}

export const video2file = (video: HTMLVideoElement) =>
  base64ToFile(video2base64(video), 'temp')

export const getFristFrameFileFromVideoUrl = async (url: string) => {
  const video = document.createElement('video')
  try {
    video.src = url
    video.muted = true
    try {
      await video.play()
      await delay(100)
    } catch (error) {
      throw new UnsupportedVideoEncodingError()
    }
    const file = await video2file(video)
    if (file.size === 0) {
      throw new UnsupportedVideoEncodingError()
    }
    return file
  } finally {
    video.pause()
    video.src = ''
  }
}

/**
 * 宽高在浏览器无法播放的视频时为0,可以弹出个modal让用户输入
 */
export const getVideoMeta = (url: string) => {
  const video = document.createElement('video')
  video.src = url
  interface Meta {
    width: number
    height: number
    duration: number
  }
  return new Promise<Meta>((resolve, reject) => {
    video.addEventListener('error', () => {
      console.error('获取视频源信息错误')
      reject(new UnsupportedVideoEncodingError())
    })
    video.addEventListener('loadedmetadata', function () {
      const { duration, videoHeight, videoWidth } = this
      resolve({
        width: videoWidth,
        height: videoHeight,
        duration: duration,
      })
    })
  })
}
