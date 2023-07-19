import { Tag, batchGetTagsByPath } from '@/api/db'
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
  'geekblue',
  'volcano'
]

export const useTagStore = defineStore('useTagStore', () => {
  const tagMap = reactive(new Map<string, Tag[]>())
  const fetchImageTags = async (paths: string[]) => {
    paths = paths.filter((v) => !tagMap.has(v))
    if (!paths.length) {
      return
    }
    try {
      paths.forEach((v) => tagMap.set(v, []))
      const res = await batchGetTagsByPath(paths)
      for (const path in res) {
        tagMap.set(path, res[path])
      }
    } catch {
      paths.forEach((v) => tagMap.delete(v))
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
    getColor,
    fetchImageTags,
    refreshTags
  }
})
