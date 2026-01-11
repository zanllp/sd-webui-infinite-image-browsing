<template>
  <div ref="fullscreenRef" class="tag-hierarchy-graph">
    <div v-if="loading" class="loading-container">
      <a-spin size="large" />
      <div class="loading-text">{{ t('tagGraphGenerating') }}</div>
    </div>

    <div v-else-if="error" class="error-container">
      <a-alert type="error" :message="error" show-icon />
    </div>

    <div v-else-if="graphData" class="graph-container">
      <!-- Control Panel -->
      <div class="control-panel">
        <div style="display:flex; align-items:center; gap:10px; flex-wrap:wrap;">
          <a-space>
            <a-tag>{{ t('tagGraphStatLayers') }}: {{ displayGraphData?.layers?.length ?? 0 }}</a-tag>
            <a-tag>{{ t('tagGraphStatNodes') }}: {{ displayNodeCount }}</a-tag>
            <a-tag>{{ t('tagGraphStatLinks') }}: {{ displayLinkCount }}</a-tag>
          </a-space>

          <div style="flex: 1 1 auto;"></div>

          <!-- Filter Form (compact) -->
          <a-space :size="8">
            <a-select
              v-model:value="filterLayer"
              :options="layerOptions"
              style="width: 140px;"
              :getPopupContainer="(trigger: HTMLElement) => trigger.parentElement || trigger"
            />
            <a-input
              v-model:value="filterKeyword"
              style="width: 200px;"
              allow-clear
              :placeholder="t('tagGraphFilterPlaceholder')"
              @keydown.enter="applyFilterManual"
            />
            <a-input-number
              v-model:value="filterHops"
              size="small"
              :min="1"
              :max="20"
              :step="1"
              style="width: 92px;"
              :title="t('tagGraphFilterHopsTitle')"
            />
            <a-button size="small" @click="applyFilterManual">{{ t('tagGraphFilterApply') }}</a-button>
            <a-button size="small" @click="resetFilter">{{ t('tagGraphFilterReset') }}</a-button>
            <a-button
              size="small"
              :title="isFullscreen ? t('exitFullscreen') : t('fullscreen')"
              @click="toggleFullscreen"
            >
              <FullscreenExitOutlined v-if="isFullscreen" />
              <FullscreenOutlined v-else />
            </a-button>
          </a-space>
        </div>
      </div>

      <!-- ECharts Container -->
      <div ref="chartRef" class="chart-container"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, watch, nextTick, onUnmounted } from 'vue'
import { getClusterTagGraph, getClusterTagGraphClusterPaths, type TagGraphReq, type TagGraphResp } from '@/api/db'
import { message } from 'ant-design-vue'
import * as echarts from 'echarts'
import { t } from '@/i18n'
import { FullscreenExitOutlined, FullscreenOutlined } from '@/icon'

interface Props {
  folders: string[]
  lang?: string
}

const props = defineProps<Props>()
const emit = defineEmits<{
  searchTag: [tag: string]
  openCluster: [cluster: { title: string; paths: string[]; size: number }]
}>()

const loading = ref(false)
const error = ref<string>('')
const graphData = ref<TagGraphResp | null>(null)
const displayGraphData = ref<TagGraphResp | null>(null)
const chartRef = ref<HTMLDivElement>()
const fullscreenRef = ref<HTMLElement>()
let chartInstance: echarts.ECharts | null = null
let _handleResize: (() => void) | null = null
let _docClickHandler: ((e: MouseEvent) => void) | null = null
let _fsChangeHandler: (() => void) | null = null

let _indexById: Record<string, number> = {}

type LayerOption = { label: string; value: string }
const filterLayer = ref<string>('__all__')
const filterKeyword = ref<string>('')
// Expand matched nodes by N hops to keep chains connected.
const filterHops = ref<number>(3)
// When set, filter is anchored to this exact node id (so same-layer only keeps that node itself)
const filterExactNodeId = ref<string>('')
const isFullscreen = ref(false)

const toggleFullscreen = async () => {
  try {
    if (document.fullscreenElement) {
      await document.exitFullscreen()
      return
    }
    const el = fullscreenRef.value
    if (!el || !(el as any).requestFullscreen) {
      message.warning(t('tagGraphFullscreenUnsupported'))
      return
    }
    await (el as any).requestFullscreen()
  } catch (e: any) {
    message.error(e?.message || t('tagGraphFullscreenFailed'))
  }
}

const layerOptions = computed<LayerOption[]>(() => {
  const layers = graphData.value?.layers ?? []
  const names = layers.map((l) => String((l as any).name ?? '')).filter(Boolean)
  const uniq = Array.from(new Set(names))
  return [{ label: t('tagGraphAllLayers'), value: '__all__' }, ...uniq.map((n) => ({ label: n, value: n }))]
})

const displayNodeCount = computed(() => {
  const layers = displayGraphData.value?.layers ?? []
  return layers.reduce((acc: number, l: any) => acc + (l?.nodes?.length ?? 0), 0)
})
const displayLinkCount = computed(() => (displayGraphData.value?.links?.length ?? 0))

// Layer colors (different for each layer)
const layerColors = [
  '#4A90E2', // Layer 0: Clusters - Blue
  '#7B68EE', // Layer 1: Tags - Purple
  '#50C878', // Layer 2: Abstract-1 - Green
  '#FF6B6B', // Layer 3: Abstract-2 - Red
]

const getLayerColor = (layer: number): string => {
  return layerColors[layer % layerColors.length]
}

const fetchGraphData = async () => {
  if (!props.folders || props.folders.length === 0) {
    error.value = 'No folders selected'
    return
  }

  loading.value = true
  error.value = ''

  try {
    const req: TagGraphReq = {
      folder_paths: props.folders,
      lang: props.lang || 'en',
    }

    graphData.value = await getClusterTagGraph(req)
    displayGraphData.value = graphData.value
  } catch (err: any) {
    const detail = err.response?.data?.detail
    error.value =
      typeof detail === 'string'
        ? detail
        : detail
          ? JSON.stringify(detail)
          : (err.message || 'Failed to load graph')
    message.error(error.value)
  } finally {
    loading.value = false
  }
}

const refreshChart = () => {
  if (!chartRef.value) return
  nextTick(() => {
    renderChart()
  })
}

const applyFilterCore = () => {
  const raw = graphData.value
  if (!raw) return
  const keyword = (filterKeyword.value || '').trim().toLowerCase()
  const layer = filterLayer.value
  const hops = Math.max(1, Math.min(20, Number(filterHops.value || 1)))

  // No filter -> show all
  if (!filterExactNodeId.value && !keyword && (layer === '__all__' || !layer)) {
    displayGraphData.value = raw
    refreshChart()
    return
  }

  // Flatten nodes with layer context
  const nodeById = new Map<string, { id: string; label: string; layerName: string; layerLevel: number; metadata?: any }>()
  for (const l of raw.layers as any[]) {
    const layerName = String(l?.name ?? '')
    const layerLevel = Number(l?.level ?? 0)
    for (const n of (l?.nodes ?? []) as any[]) {
      const id = String(n?.id ?? '')
      if (!id) continue
      nodeById.set(id, { id, label: String(n?.label ?? ''), layerName, layerLevel, metadata: n?.metadata })
    }
  }

  const matched = new Set<string>()
  // 1) match set
  if (filterExactNodeId.value) {
    if (nodeById.has(filterExactNodeId.value)) {
      matched.add(filterExactNodeId.value)
    }
  } else {
    // manual mode: layer + keyword contains
    for (const [id, n] of nodeById) {
      if (layer && layer !== '__all__' && n.layerName !== layer) continue
      if (keyword) {
        const hay = `${n.label} ${id}`.toLowerCase()
        if (!hay.includes(keyword)) continue
      }
      matched.add(id)
    }
  }

  const links = raw.links as any[]
  // 2) include matched + N-hop neighbors (both directions)
  const adj = new Map<string, Set<string>>()
  const addEdge = (a: string, b: string) => {
    if (!a || !b) return
    if (!adj.has(a)) adj.set(a, new Set())
    adj.get(a)!.add(b)
  }
  for (const lk of links) {
    const s = String(lk?.source ?? '')
    const t2 = String(lk?.target ?? '')
    if (!s || !t2) continue
    addEdge(s, t2)
    addEdge(t2, s)
  }

  const include = new Set<string>()
  const q: Array<{ id: string; d: number }> = []
  for (const id of matched) {
    include.add(id)
    q.push({ id, d: 0 })
  }
  while (q.length) {
    const cur = q.shift()!
    if (cur.d >= hops) continue
    const ns = adj.get(cur.id)
    if (!ns) continue
    for (const nxt of ns) {
      if (!include.has(nxt)) {
        include.add(nxt)
        q.push({ id: nxt, d: cur.d + 1 })
      }
    }
  }

  // 3) filter layers/nodes
  const filteredLayers: any[] = []
  for (const l of raw.layers as any[]) {
    const nodes = (l?.nodes ?? []).filter((n: any) => include.has(String(n?.id ?? '')))
    if (nodes.length) {
      filteredLayers.push({ ...l, nodes })
    }
  }

  // 4) filter links among included nodes
  const filteredLinks = links.filter((lk) => include.has(String(lk?.source ?? '')) && include.has(String(lk?.target ?? '')))

  displayGraphData.value = {
    layers: filteredLayers,
    links: filteredLinks,
    stats: {
      ...(raw as any).stats,
      total_links: filteredLinks.length
    }
  } as any
  refreshChart()
}

const applyFilterManual = () => {
  // switching to manual mode clears exact-anchor
  filterExactNodeId.value = ''
  applyFilterCore()
}

const applyFilterByNode = (nodeId: string, layerName: string, nodeName: string, nodeType: string) => {
  // Keep UI in sync, but anchor by exact id to avoid matching multiple same-layer nodes
  filterLayer.value = layerName || '__all__'
  filterKeyword.value = nodeName || ''
  filterExactNodeId.value = nodeId

  // Suggested hops to reach Abstract-2 from different starting layers:
  // cluster -> tag -> abstract-1 -> abstract-2 : 3 hops
  // tag -> abstract-1 -> abstract-2 : 2 hops
  // abstract-1 -> abstract-2 : 1 hop
  const suggested = nodeType === 'cluster' ? 3 : (nodeType === 'tag' ? 2 : (nodeType === 'abstract' ? 1 : 2))
  filterHops.value = Math.max(Number(filterHops.value || 1), suggested)
  applyFilterCore()
}

const resetFilter = () => {
  filterLayer.value = '__all__'
  filterKeyword.value = ''
  filterHops.value = 3
  filterExactNodeId.value = ''
  if (graphData.value) displayGraphData.value = graphData.value
  refreshChart()
}

const renderChart = () => {
  if (!displayGraphData.value || !chartRef.value) {
    return
  }

  // Dispose old instance
  if (chartInstance) {
    chartInstance.dispose()
  }

  chartInstance = echarts.init(chartRef.value)

  const layers = displayGraphData.value.layers
  // Reverse to show abstract on left
  const reversedLayers = [...layers].reverse()

  // Build nodes with scattered positions for better visualization
  const nodes: any[] = []
  const layerSpacing = 1500 / (reversedLayers.length + 1)  // Increased from 1000 to 1200
  const horizontalRange = 200 // Horizontal scatter range
  _indexById = {}

  reversedLayers.forEach((layer, layerIdx) => {
    const baseX = layerSpacing * (layerIdx + 1)
    const numNodes = layer.nodes.length
    const verticalSpacing = 800 / (numNodes + 1)

    layer.nodes.forEach((node, nodeIdx) => {
      const y = verticalSpacing * (nodeIdx + 1)

      // Add horizontal offset for visual spacing
      // Alternate left/right based on index, with some randomness based on node id
      const hashOffset = node.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
      const horizontalOffset = ((hashOffset % horizontalRange) - horizontalRange / 2)
      const x = baseX + horizontalOffset

      // Calculate size with max 3x ratio
      const minSize = 20
      const maxSize = 60  // 3x ratio: 60 / 20 = 3
      const normalizedSize = Math.sqrt(node.size) / 5
      const clampedSize = Math.max(minSize, Math.min(maxSize, minSize + normalizedSize))

      nodes.push({
        id: node.id,
        name: node.label,
        x: x,
        y: y,
        fixed: true,
        symbolSize: clampedSize,
        value: node.size,
        category: layer.level,
        itemStyle: {
          color: getLayerColor(layer.level)
        },
        label: {
          show: true,
          fontSize: 11,
          color: '#fff',
          formatter: (params: any) => {
            const maxLen = 10
            const name = params.name
            return name.length > maxLen ? name.substring(0, maxLen) + '...' : name
          }
        },
        metadata: node.metadata,
        layerName: layer.name,
      })

      _indexById[node.id] = nodes.length - 1
    })
  })

  // Build links
  const links = displayGraphData.value.links.map(link => ({
    source: link.source,
    target: link.target,
    value: link.weight,
    lineStyle: {
      width: Math.max(0.5, Math.min(2, link.weight / 100)),
      opacity: 0.3,
      curveness: 0.1
    }
  }))

  // Build categories for legend
  const categories = reversedLayers.map(layer => ({
    name: layer.name
  }))

  const option: echarts.EChartsOption = {
    tooltip: {
      renderMode: 'html',
      // In fullscreen mode, only the fullscreen element subtree is rendered.
      // If tooltip is appended to document.body, it will not be visible.
      appendToBody: false,
      className: 'iib-tg-tooltip',
      backgroundColor: 'rgba(15, 23, 42, 0.92)',
      borderColor: 'rgba(255,255,255,0.14)',
      borderWidth: 1,
      padding: [10, 12],
      textStyle: {
        color: '#fff'
      },
      extraCssText: 'border-radius: 10px; box-shadow: 0 10px 30px rgba(0,0,0,0.35); z-index: 9999;',
      triggerOn: 'none',
      enterable: true,
      formatter: (params: any) => {
        if (params.dataType === 'node') {
          const node = params.data
          const nodeId = String(node.id || '')
          const meta = node.metadata || {}
          const imgCount = Number(meta.image_count ?? node.value ?? 0)
          const clusterCount = meta.cluster_count != null ? Number(meta.cluster_count) : null
          const level = meta.level != null ? Number(meta.level) : null
          const type = String(meta.type || '')

          const chips: string[] = []
          if (!Number.isNaN(imgCount) && imgCount > 0) chips.push(`🖼️ ${imgCount}`)
          if (clusterCount != null && !Number.isNaN(clusterCount)) chips.push(`🧩 ${clusterCount}`)
          if (level != null && !Number.isNaN(level)) chips.push(`🏷️ L${level}`)

          const canSearch = type === 'tag'
          const canFilter = type === 'tag' || type === 'abstract' || type === 'cluster'
          const canOpenCluster = type === 'cluster'
          const actionBtns = [
            canSearch
              ? `<button data-action="search" data-nodeid="${nodeId}" style="border:1px solid rgba(255,255,255,0.35); background: rgba(24,144,255,0.18); color:#fff; padding:4px 10px; border-radius:999px; cursor:pointer;">${t('search')}</button>`
              : '',
            canFilter
              ? `<button data-action="filter" data-nodeid="${nodeId}" style="border:1px solid rgba(255,255,255,0.30); background: rgba(255,255,255,0.10); color:#fff; padding:4px 10px; border-radius:999px; cursor:pointer;">${t('tagGraphTooltipFilter')}</button>`
              : '',
            canOpenCluster
              ? `<button data-action="openCluster" data-nodeid="${nodeId}" style="border:1px solid rgba(255,255,255,0.35); background: rgba(255,255,255,0.12); color:#fff; padding:4px 10px; border-radius:999px; cursor:pointer;">${t('tagGraphTooltipOpenCluster')}</button>`
              : '',
            `<button data-action="close" data-nodeid="${nodeId}" style="border:1px solid rgba(255,255,255,0.25); background: rgba(255,255,255,0.10); color:#fff; padding:4px 10px; border-radius:999px; cursor:pointer;">${t('close')}</button>`
          ].filter(Boolean).join('')

          return `
            <div class="iib-tg-tip" data-nodeid="${nodeId}" style="min-width: 180px;">
              <div style="font-weight: 700; margin-bottom: 6px; color:#fff;">${params.name}</div>
              <div style="display:flex; gap:10px; flex-wrap:wrap; font-size:12px; opacity:.9; color:#fff;">
                ${chips.map((c) => `<span>${c}</span>`).join('')}
              </div>
              <div style="margin-top: 10px; display:flex; gap:8px; flex-wrap:wrap;">
                ${actionBtns}
              </div>
            </div>
          `
        }
        return ''
      }
    },
    legend: [{
      data: categories.map(c => c.name),
      orient: 'vertical',
      right: 10,
      bottom: 10,
      textStyle: {
        color: '#fff'
      }
    }],
    series: [{
      type: 'graph',
      layout: 'none',
      data: nodes,
      links: links,
      categories: categories,
      roam: true,  // Enable zoom and pan
      scaleLimit: {
        min: 0.2,
        max: 5
      },
      draggable: false,
      blur: {
        itemStyle: {
          opacity: 0.15
        },
        lineStyle: {
          opacity: 0.08
        },
        label: {
          opacity: 0.25
        }
      },
      label: {
        show: true,
        position: 'inside'
      },
      lineStyle: {
        color: 'source',
        curveness: 0.1
      },
      emphasis: {
        focus: 'adjacency',
        lineStyle: {
          width: 3
        }
      },
      zoom: 1  // Initial zoom level
    }]
  }

  chartInstance.setOption(option)

  const hideTipOnly = () => {
    if (!chartInstance) return
    chartInstance.dispatchAction({ type: 'hideTip' })
  }

  // Handle click events
  chartInstance.on('click', (params: any) => {
    if (params.dataType === 'node') {
      const node = params.data
      if (node.metadata?.type === 'tag') {
        // Show tooltip; search is triggered from tooltip button
        const idx = _indexById[String(node.id || '')]
        if (idx != null) chartInstance?.dispatchAction({ type: 'showTip', seriesIndex: 0, dataIndex: idx })
      } else if (node.metadata?.type === 'cluster') {
        // Show tooltip; open is triggered from tooltip button
        const idx = _indexById[String(node.id || '')]
        if (idx != null) chartInstance?.dispatchAction({ type: 'showTip', seriesIndex: 0, dataIndex: idx })
      } else if (node.metadata?.type === 'abstract') {
        const idx = _indexById[String(node.id || '')]
        if (idx != null) chartInstance?.dispatchAction({ type: 'showTip', seriesIndex: 0, dataIndex: idx })
      } else {
        message.info(`Abstract category: ${params.name}`)
      }
    }
  })

  // Click blank area: hide tooltip
  chartInstance.getZr().on('click', (e: any) => {
    if (!e?.target) {
      hideTipOnly()
    }
  })

  // Tooltip action buttons (search / close)
  if (_docClickHandler) {
    document.removeEventListener('click', _docClickHandler, true)
    _docClickHandler = null
  }
  _docClickHandler = (ev: MouseEvent) => {
    const target = ev.target as HTMLElement | null
    if (!target) return

    // Click on tooltip button
    const btn = target.closest?.('button[data-action]') as HTMLElement | null
    if (btn) {
      const action = btn.getAttribute('data-action') || ''
      const nodeId = btn.getAttribute('data-nodeid') || ''
      const idx = _indexById[nodeId]
      if (action === 'search' && idx != null) {
        // Only tags have search button
        const nodeName = (nodes[idx] && nodes[idx].name) || ''
        if (nodeName) {
          emit('searchTag', nodeName)
          message.info(`${t('search')}: ${nodeName}`)
        }
        hideTipOnly()
      } else if (action === 'filter' && idx != null) {
        // Filter by this node (layer + keyword), keep 1-hop neighbors
        const layerName = (nodes[idx] && nodes[idx].layerName) || '__all__'
        const nodeName = (nodes[idx] && nodes[idx].name) || ''
        const targetNodeId = String((nodes[idx] && nodes[idx].id) || nodeId)
        const nodeType = String((nodes[idx] && nodes[idx].metadata && nodes[idx].metadata.type) || '')
        filterLayer.value = layerName || '__all__'
        filterKeyword.value = nodeName
        applyFilterByNode(targetNodeId, String(layerName || '__all__'), String(nodeName || ''), nodeType)
        // best-effort hide tip after applying
        hideTipOnly()
      } else if (action === 'openCluster' && idx != null) {
        const meta = (nodes[idx] && nodes[idx].metadata) || {}
        const title = (nodes[idx] && nodes[idx].name) || ''
        const size = Number(meta.image_count || 0)
        const topicClusterCacheKey = String(displayGraphData.value?.stats?.topic_cluster_cache_key || '')
        const clusterId = String(meta.cluster_id || '')
        if (!topicClusterCacheKey || !clusterId) {
          message.warning('Cluster data is incomplete, please re-generate clustering result')
          hideTipOnly()
          return
        }
        void (async () => {
          const hide = message.loading('Loading cluster images...', 0)
          try {
            const resp = await getClusterTagGraphClusterPaths({
              topic_cluster_cache_key: topicClusterCacheKey,
              cluster_id: clusterId
            })
            const paths: string[] = Array.isArray(resp?.paths) ? resp.paths : []
            if (paths.length) {
              emit('openCluster', { title, paths, size: size || paths.length })
            } else {
              message.warning('No images found in this cluster')
            }
            hideTipOnly()
          } finally {
            hide?.()
          }
        })()
      } else if (action === 'close') {
        hideTipOnly()
      }
      ev.preventDefault()
      ev.stopPropagation()
      return
    }

    // Click elsewhere (outside chart and tooltip): hide tooltip
    const tip = target.closest?.('.iib-tg-tip')
    if (tip) return
    const inChart = chartRef.value?.contains(target) ?? false
    if (!inChart) {
      hideTipOnly()
    }
  }
  document.addEventListener('click', _docClickHandler, true)
}

// Watch for folder changes
watch(
  () => props.folders,
  () => {
    fetchGraphData()
  },
  { immediate: true }
)

// Watch for graphData and chartRef to trigger rendering
watch(
  [displayGraphData, chartRef],
  () => {
    if (displayGraphData.value && chartRef.value) {
      nextTick(() => {
        renderChart()
      })
    }
  }
)

onMounted(() => {
  // Rerender on window resize
  _handleResize = () => {
    if (chartInstance) {
      chartInstance.resize()
    }
  }
  window.addEventListener('resize', _handleResize)

  _fsChangeHandler = () => {
    isFullscreen.value = !!document.fullscreenElement
    nextTick(() => {
      chartInstance?.resize()
    })
  }
  document.addEventListener('fullscreenchange', _fsChangeHandler)
})

onUnmounted(() => {
  if (_handleResize) {
    window.removeEventListener('resize', _handleResize)
    _handleResize = null
  }
  if (_fsChangeHandler) {
    document.removeEventListener('fullscreenchange', _fsChangeHandler)
    _fsChangeHandler = null
  }
  if (_docClickHandler) {
    document.removeEventListener('click', _docClickHandler, true)
    _docClickHandler = null
  }
  if (chartInstance) {
    chartInstance.dispose()
  }
})
</script>

<style scoped lang="scss">
.tag-hierarchy-graph {
  width: 100%;
  height: calc(100vh - 200px);
  min-height: 600px;
  position: relative;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  border-radius: 8px;
  overflow: hidden;
}

.loading-container,
.error-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #fff;
}

.loading-text {
  margin-top: 16px;
  font-size: 14px;
  color: #aaa;
}

.graph-container {
  width: 100%;
  height: 100%;
  position: relative;
}

.control-panel {
  position: absolute;
  top: 16px;
  left: 16px;
  z-index: 10;
  background: rgba(0, 0, 0, 0.7);
  padding: 8px 12px;
  border-radius: 6px;
  backdrop-filter: blur(10px);
}

.chart-container {
  width: 100%;
  height: 100%;
}
</style>
