<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import hljs from 'highlight.js/lib/core'
import json from 'highlight.js/lib/languages/json'
import { useGlobalStore } from '@/store/useGlobalStore'
import { FolderOutlined } from '@ant-design/icons-vue'

hljs.registerLanguage('json', json)

const global = useGlobalStore()

onMounted(async () => {
  await (global.computedTheme === 'dark'
    ? import('highlight.js/styles/atom-one-dark.css')
    : import('highlight.js/styles/github.css'))
})

interface ExifPath {
  key: string
  value: any
}

const props = defineProps<{
  data: Record<string, any>
}>()

const currentPath = ref<ExifPath[]>([])
const currentData = computed(() => {
  if (currentPath.value.length === 0) {
    return props.data
  }
  let data = props.data
  for (const path of currentPath.value) {
    data = path.value
  }
  return data
})

const jsonParseCache = new Map<string, any>()

const tryParseJson = (value: any): any => {
  if (typeof value !== 'string') {
    return null
  }

  const cacheKey = value
  if (jsonParseCache.has(cacheKey)) {
    return jsonParseCache.get(cacheKey)
  }

  try {
    const parsed = JSON.parse(value)
    jsonParseCache.set(cacheKey, parsed)
    return parsed
  } catch {
    return null
  }
}

const isNavigableValue = (value: any): boolean => {
  return tryParseJson(value) !== null
}

const formatValueForHighlight = (value: any): string => {
  if (value === null) {
    return 'null'
  }
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value, null, 2)
    } catch {
      return String(value)
    }
  }
  return String(value)
}

const highlightJson = (value: any): string => {
  const jsonString = formatValueForHighlight(value)
  if (typeof value === 'string' && value.length > 1000) {
    return jsonString.substring(0, 1000) + '...'
  }
  try {
    return hljs.highlight(jsonString, { language: 'json' }).value
  } catch {
    return jsonString
  }
}

const handleEnterNextLevel = (key: string, value: any) => {
  const parsed = tryParseJson(value)
  if (parsed !== null) {
    currentPath.value.push({ key, value: parsed })
  }
}

const handleBreadcrumbClick = (index: number) => {
  currentPath.value = currentPath.value.slice(0, index + 1)
}

const resetToRoot = () => {
  currentPath.value = []
}

const formatKey = (key: string): string => {
  if (/^\d+$/.test(key)) {
    return `[${key}]`
  }
  return key
}
</script>

<template>
  <div class="exif-browser">
    <div class="exif-header" v-if="currentPath.length > 0">
      <div class="exif-path">
        <span class="path-item" @click="resetToRoot">root</span>
        <template v-for="(item, index) in currentPath" :key="index">
          <span class="path-separator">/</span>
          <span class="path-item clickable" @click="handleBreadcrumbClick(index)">
            {{ formatKey(item.key) }}
          </span>
        </template>
      </div>
      <a-button size="small" @click="resetToRoot">
        {{ $t('reset') || 'Reset' }}
      </a-button>
    </div>

    <div class="exif-content">
      <template v-if="typeof currentData === 'object' && currentData !== null">
        <div class="exif-item" v-for="(value, key) in currentData" :key="key">
          <div class="exif-key">{{ formatKey(key) }}</div>
          <div class="exif-value">
            <div class="value-text" v-html="highlightJson(value)"></div>
            <a-button v-if="isNavigableValue(value)"  type="text"
              @click="handleEnterNextLevel(String(key), value)">
              <FolderOutlined style="font-size: 18px;" />
            </a-button>
          </div>
        </div>
      </template>
      <template v-else>
        <div class="exif-simple">
          <div v-html="highlightJson(currentData)"></div>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped lang="scss">
.exif-browser {
  display: flex;
  flex-direction: column;

  .exif-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px;
    background: var(--zp-secondary-variant-background);
    border-radius: 4px;
    margin-bottom: 8px;

    .exif-path {
      display: flex;
      align-items: center;
      flex: 1;
      overflow: hidden;
      white-space: nowrap;

      .path-item {
        padding: 2px 4px;
        border-radius: 2px;

        &.clickable {
          cursor: pointer;
          color: var(--zp-primary);

          &:hover {
            background: var(--zp-secondary);
          }
        }
      }

      .path-separator {
        color: var(--zp-secondary);
        margin: 0 4px;
      }
    }
  }

  .exif-content {
    .exif-item {
      display: flex;
      align-items: flex-start;
      padding: 4px 8px;
      border-bottom: 1px solid var(--zp-secondary);

      &:hover {
        background: var(--zp-secondary-variant-background);
      }

      .exif-key {
        flex: 0 0 120px;
        font-weight: 600;
        color: var(--zp-primary);
        word-break: break-all;
      }

      .exif-value {
        flex: 1;
        display: flex;
        align-items: flex-start;
        gap: 4px;
        color: var(--zp-primary);
        word-break: break-all;

        .value-text {
          flex: 1;
          white-space: pre-wrap;

          :deep(code) {
            font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
            font-size: 0.9em;
            line-height: 1.5;
            background: transparent;
            padding: 0;
          }
        }

        .ant-btn-text {
          padding: 0 4px;
          color: var(--zp-luminous);

          &:hover {
            color: var(--zp-primary);
          }
        }


      }
    }

    .exif-simple {
      padding: 8px;
      white-space: pre;
      color: var(--zp-primary);
    }
  }
}
</style>
