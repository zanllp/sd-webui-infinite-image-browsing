import { Tag, batchGetTagsByPath } from '@/api/db'
import { defineStore } from 'pinia'
import sjcl from 'sjcl'
import { reactive } from 'vue'
import type { GridViewFileTag } from './useGlobalStore'
function generateColors() {
  const colors = []
  const saturation = 90
  const lightness = 35
  const interval = 360 / 50

  for (let i = 0; i < 72; i++) {
    const hue = i * interval
    const hslColor = `hsl(${hue}, ${saturation}%, ${lightness}%)`
    colors.push(hslColor)
  }

  return colors
}
const tagColors = generateColors()

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
  const tagConvert = (tag: GridViewFileTag): Tag => ({
    id: tag.name,
    count: 0,
    display_name: null,
    type: 'temp',
    ...tag
  })
  const set = (path: string, tags: (string|Tag| GridViewFileTag)[]) => {
    const normalizedTags = tags.map(v => tagConvert(typeof v === 'string' ? { name: v } : v))
    tagMap.set(path, normalizedTags)
  }
  return {
    set,
    colorCache,
    tagMap,
    getColor,
    fetchImageTags,
    refreshTags,
    tagConvert
  }
})
