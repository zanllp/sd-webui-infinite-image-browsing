<template>
  <div class="tag-hierarchy-graph">
    <div v-if="loading" class="loading-container">
      <a-spin size="large" />
      <div class="loading-text">Generating hierarchical graph...</div>
    </div>

    <div v-else-if="error" class="error-container">
      <a-alert type="error" :message="error" show-icon />
    </div>

    <div v-else-if="graphData" class="graph-container">
      <!-- Control Panel -->
      <div class="control-panel">
        <a-space>
          <a-tag>Layers: {{ graphData.layers.length }}</a-tag>
          <a-tag>Total Links: {{ graphData.stats.total_links }}</a-tag>
        </a-space>
      </div>

      <!-- ECharts Container -->
      <div ref="chartRef" class="chart-container"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, nextTick, onUnmounted } from 'vue'
import { getClusterTagGraph, type TagGraphReq, type TagGraphResp } from '@/api/db'
import { message } from 'ant-design-vue'
import * as echarts from 'echarts'

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
const chartRef = ref<HTMLDivElement>()
let chartInstance: echarts.ECharts | null = null
let _handleResize: (() => void) | null = null

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
      top_n_tags: 50,
      top_n_clusters: 20,
      lang: props.lang || 'en',
    }

    graphData.value = await getClusterTagGraph(req)
  } catch (err: any) {
    error.value = err.response?.data?.detail || err.message || 'Failed to load graph'
    message.error(error.value)
  } finally {
    loading.value = false
  }
}

const renderChart = () => {
  if (!graphData.value || !chartRef.value) {
    return
  }

  // Dispose old instance
  if (chartInstance) {
    chartInstance.dispose()
  }

  chartInstance = echarts.init(chartRef.value)

  const layers = graphData.value.layers
  // Reverse to show abstract on left
  const reversedLayers = [...layers].reverse()

  // Build nodes with scattered positions for better visualization
  const nodes: any[] = []
  const layerSpacing = 1200 / (reversedLayers.length + 1)  // Increased from 1000 to 1200
  const horizontalRange = 150 // Horizontal scatter range

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
    })
  })

  // Build links
  const links = graphData.value.links.map(link => ({
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
      formatter: (params: any) => {
        if (params.dataType === 'node') {
          const node = params.data
          let html = `<strong>${params.name}</strong><br/>`
          html += `Layer: ${node.layerName}<br/>`
          if (node.metadata?.image_count) {
            html += `Images: ${node.metadata.image_count}`
          }
          return html
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

  // Handle click events
  chartInstance.on('click', (params: any) => {
    if (params.dataType === 'node') {
      const node = params.data
      if (node.metadata?.type === 'tag') {
        emit('searchTag', params.name)
        message.info(`Searching for tag: ${params.name}`)
      } else if (node.metadata?.type === 'cluster') {
        // Open cluster directly with bound images
        if (node.metadata.paths && node.metadata.paths.length > 0) {
          emit('openCluster', {
            title: params.name,
            paths: node.metadata.paths,
            size: node.metadata.image_count || node.metadata.paths.length
          })
        } else {
          message.warning('No images found in this cluster')
        }
      } else {
        message.info(`Abstract category: ${params.name}`)
      }
    }
  })
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
  [graphData, chartRef],
  () => {
    if (graphData.value && chartRef.value) {
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
})

onUnmounted(() => {
  if (_handleResize) {
    window.removeEventListener('resize', _handleResize)
    _handleResize = null
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
