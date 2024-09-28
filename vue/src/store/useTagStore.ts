import { Tag, batchGetTagsByPath } from '@/api/db'
import { defineStore } from 'pinia'
import sjcl from 'sjcl'
import { reactive, ref } from 'vue'
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
  const colorCache = ref(new Map<string, string>())
  const notifyCacheUpdate = (updateTag?: Tag) => {
    // colorCache.value = cloneDeep(colorCache.value)
    if (updateTag) {
      colorCache.value.set(updateTag.id.toString(), updateTag.color)
    }
  }
  const getColor = (tag: Tag) => {
    const idStr = tag.id.toString()
    let color = colorCache.value.get(idStr)
    if (color) {
      return color
    }
    if (!color && tag.color) {
      colorCache.value.set(idStr, tag.color)
      return tag.color
    }
    if (!color) {
      const hash = sjcl.hash.sha256.hash(idStr)
      const num = parseInt(sjcl.codec.hex.fromBits(hash), 16) % tagColors.length
      color = tagColors[num]
      colorCache.value.set(idStr, color)
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
    color: '',
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
    tagConvert,
    notifyCacheUpdate
  }
})
