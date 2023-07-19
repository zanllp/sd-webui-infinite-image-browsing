import { Tag, batchGetTagsByPath } from '@/api/db'
import { createReactiveQueue } from '@/util'
import { defineStore } from 'pinia'
import sjcl from 'sjcl'
import { reactive } from 'vue'

const tagColors = [
  'blue',
  'cyan',
  'gold',
  'green',
  'lime',
  'magenta',
  'orange',
  'pink',
  'purple',
  'red',
  'yellow',
  'error',
  'success',
  'warning',
  'processing',
  'geekblue',
  'volcano'
]

export const useTagStore = defineStore('useTagStore', () => {
  const q = createReactiveQueue()
  const fetchPendingImagePaths = new Set<string>()
  const tagMap = reactive(new Map<string, Tag[]>())
  const fetchImageTags = async (paths: string[]) => {
    paths = paths.filter((v) => !fetchPendingImagePaths.has(v) && !tagMap.has(v))
    if (!paths.length) {
      return
    }
    try {
      paths.forEach((v) => tagMap.set(v, []))
      const res = await batchGetTagsByPath(paths)
      for (const path in res) {
        tagMap.set(path, res[path])
      }
    } finally {
      paths.forEach((v) => fetchPendingImagePaths.delete(v))
    }
  }
  const colorCache = new Map<string, string>()
  const getColor = (tag: string) => {
    let color = colorCache.get(tag)
    if (!color) {
      const hash = sjcl.hash.sha256.hash(tag)
      const num = parseInt(sjcl.codec.hex.fromBits(hash), 16) % tagColors.length
      color = tagColors[num]
      colorCache.set(tag, color)
    }
    return color
  }
  const refreshTags = async (paths: string[]) => {
    paths.forEach((v) => tagMap.delete(v))
    await fetchImageTags(paths)
  }
  return {
    tagMap,
    q,
    getColor,
    fetchImageTags,
    refreshTags
  }
})
