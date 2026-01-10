<template>
  <div class="tag-graph-container">
    <!-- Toolbar -->
    <div class="toolbar">
      <a-space>
        <a-button type="primary" @click="loadGraph" :loading="loading">
          {{ $t('refresh') }}
        </a-button>
        <a-divider type="vertical" />
        <span class="label">Top Tags:</span>
        <a-input-number v-model:value="topNTags" :min="10" :max="100" :step="10" style="width: 80px" />
        <span class="label">Top Clusters:</span>
        <a-input-number v-model:value="topNClusters" :min="5" :max="50" :step="5" style="width: 80px" />
        <a-checkbox v-model:checked="showClusters">Show Clusters</a-checkbox>
        <a-button @click="fitView" size="small">Fit View</a-button>
      </a-space>
    </div>

    <!-- Graph Canvas -->
    <div ref="chartContainer" class="chart-container"></div>

    <!-- Info Panel -->
    <div v-if="selectedNode" class="info-panel">
      <div class="info-header">
        <span class="info-title">{{ selectedNode.label }}</span>
        <a-button size="small" type="text" @click="selectedNode = null">✕</a-button>
      </div>
      <div class="info-body">
        <div class="info-item">
          <span class="info-label">Category:</span>
          <span class="info-value">{{ selectedNode.category }}</span>
        </div>
        <div class="info-item" v-if="selectedNode.image_count">
          <span class="info-label">Images:</span>
          <span class="info-value">{{ selectedNode.image_count }}</span>
        </div>
        <div class="info-item" v-if="selectedNode.cluster_count">
          <span class="info-label">Clusters:</span>
          <span class="info-value">{{ selectedNode.cluster_count }}</span>
        </div>
        <div class="info-item" v-if="selectedNode.size">
          <span class="info-label">Size:</span>
          <span class="info-value">{{ selectedNode.size }}</span>
        </div>
        <div class="info-item" v-if="selectedNode.community !== undefined">
          <span class="info-label">Community:</span>
          <span class="info-value">{{ selectedNode.community }}</span>
        </div>
      </div>
      <div class="info-actions">
        <a-button size="small" type="primary" @click="searchByTag(selectedNode.label)">
          Search Images
        </a-button>
      </div>
    </div>

    <!-- Stats Panel -->
    <div v-if="stats" class="stats-panel">
      <div class="stat-item">
        <div class="stat-value">{{ stats.selected_tags }}</div>
        <div class="stat-label">Tags</div>
      </div>
      <div class="stat-item">
        <div class="stat-value">{{ stats.selected_clusters }}</div>
        <div class="stat-label">Clusters</div>
      </div>
      <div class="stat-item">
        <div class="stat-value">{{ stats.total_images }}</div>
        <div class="stat-label">Images</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import { getClusterTagGraph, type TagGraphReq, type TagGraphResp, type TagGraphNode } from '@/api/db'
import { message } from 'ant-design-vue'
import * as echarts from 'echarts'
import type { ECharts } from 'echarts'

const props = defineProps<{
  folders: string[]
  threshold: number
  minClusterSize: number
  lang?: string
  model?: string
}>()

const emit = defineEmits<{
  searchTag: [tag: string]
}>()

const loading = ref(false)
const chartContainer = ref<HTMLDivElement>()
const chart = ref<ECharts>()
const graphData = ref<TagGraphResp | null>(null)
const selectedNode = ref<TagGraphNode | null>(null)
const stats = ref<TagGraphResp['stats'] | null>(null)

// Parameters
const topNTags = ref(50)
const topNClusters = ref(20)
const showClusters = ref(true)

// Category colors
const categoryColors: Record<string, string> = {
  character: '#5470c6',
  style: '#91cc75',
  scene: '#fac858',
  object: '#ee6666',
  cluster: '#73c0de',
  other: '#9a60b4',
}

// Community colors (generated dynamically)
const communityColors: string[] = [
  '#5470c6', '#91cc75', '#fac858', '#ee6666', '#73c0de',
  '#3ba272', '#fc8452', '#9a60b4', '#ea7ccc', '#5d7092'
]

const getCategoryColor = (category: string, community?: number): string => {
  if (community !== undefined && community >= 0) {
    return communityColors[community % communityColors.length]
  }
  return categoryColors[category] || categoryColors.other
}

const loadGraph = async () => {
  if (!props.folders.length) {
    message.error('Please select folders first')
    return
  }

  loading.value = true
  try {
    const req: TagGraphReq = {
      folder_paths: props.folders,
      model: props.model,
      threshold: props.threshold,
      min_cluster_size: props.minClusterSize,
      lang: props.lang,
      top_n_tags: topNTags.value,
      top_n_clusters: topNClusters.value,
      show_clusters: showClusters.value,
      detect_communities: true,
      weight_mode: 'hybrid',
      alpha: 0.3,
    }

    const data = await getClusterTagGraph(req)
    graphData.value = data
    stats.value = data.stats

    renderGraph(data)
    message.success(`Graph loaded: ${data.stats.selected_tags} tags, ${data.stats.selected_clusters} clusters`)
  } catch (e: any) {
    message.error(e.message || 'Failed to load tag graph')
  } finally {
    loading.value = false
  }
}

const renderGraph = (data: TagGraphResp) => {
  if (!chartContainer.value) return

  if (!chart.value) {
    chart.value = echarts.init(chartContainer.value)
  }

  // Prepare data for ECharts
  const nodes = data.nodes.map(node => ({
    id: node.id,
    name: node.label,
    symbolSize: Math.sqrt(node.weight) * 0.5 + 10,
    value: node.weight,
    category: node.category,
    itemStyle: {
      color: getCategoryColor(node.category, node.community)
    },
    label: {
      show: node.category === 'cluster' || node.weight > 100,
    },
    // Store original data
    _data: node,
  }))

  const links = data.links.map(link => ({
    source: link.source,
    target: link.target,
    value: link.weight,
    lineStyle: {
      width: Math.sqrt(link.weight) * 0.02 + 0.5,
      opacity: 0.4,
    },
  }))

  // Build categories
  const categories = Object.keys(categoryColors).map(name => ({ name }))

  const option: echarts.EChartsOption = {
    title: {
      text: 'Tag Relationship Graph',
      left: 'center',
      top: 10,
    },
    tooltip: {
      formatter: (params: any) => {
        if (params.dataType === 'node') {
          const node = params.data._data as TagGraphNode
          let html = `<strong>${node.label}</strong><br/>`
          html += `Category: ${node.category}<br/>`
          if (node.image_count) html += `Images: ${node.image_count}<br/>`
          if (node.cluster_count) html += `Clusters: ${node.cluster_count}<br/>`
          if (node.size) html += `Size: ${node.size}<br/>`
          if (node.community !== undefined) html += `Community: ${node.community}<br/>`
          return html
        } else if (params.dataType === 'edge') {
          return `Weight: ${params.value.toFixed(1)}`
        }
        return ''
      }
    },
    legend: [
      {
        data: categories.map(c => c.name),
        orient: 'vertical',
        left: 10,
        top: 50,
      }
    ],
    series: [
      {
        type: 'graph',
        layout: 'force',
        data: nodes,
        links: links,
        categories: categories,
        roam: true,
        draggable: true,
        force: {
          repulsion: 200,
          gravity: 0.1,
          edgeLength: [50, 150],
          friction: 0.6,
        },
        emphasis: {
          focus: 'adjacency',
          lineStyle: {
            width: 3,
          },
        },
        label: {
          position: 'right',
          formatter: '{b}',
        },
        labelLayout: {
          hideOverlap: true,
        },
        scaleLimit: {
          min: 0.5,
          max: 5,
        },
      }
    ]
  }

  chart.value.setOption(option)

  // Handle click event
  chart.value.off('click')
  chart.value.on('click', (params: any) => {
    if (params.dataType === 'node') {
      selectedNode.value = params.data._data as TagGraphNode
    }
  })
}

const fitView = () => {
  if (!chart.value) return
  chart.value.resize()
}

const searchByTag = (tag: string) => {
  emit('searchTag', tag)
}

const resizeHandler = () => {
  chart.value?.resize()
}

onMounted(() => {
  nextTick(() => {
    window.addEventListener('resize', resizeHandler)
  })
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', resizeHandler)
  chart.value?.dispose()
})

// Auto load when folders change
watch(() => props.folders, () => {
  if (props.folders.length) {
    loadGraph()
  }
}, { immediate: true })

// Reload when parameters change
watch([topNTags, topNClusters, showClusters], () => {
  if (graphData.value) {
    loadGraph()
  }
})

defineExpose({ loadGraph })
</script>

<style scoped>
.tag-graph-container {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  position: relative;
}

.toolbar {
  padding: 12px 16px;
  background: #fafafa;
  border-bottom: 1px solid #e8e8e8;
  flex-shrink: 0;
}

.toolbar .label {
  font-size: 13px;
  color: #666;
}

.chart-container {
  flex: 1;
  width: 100%;
  min-height: 500px;
}

.info-panel {
  position: absolute;
  top: 80px;
  right: 20px;
  width: 280px;
  background: white;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  z-index: 1000;
}

.info-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid #f0f0f0;
}

.info-title {
  font-weight: 600;
  font-size: 15px;
}

.info-body {
  padding: 12px 16px;
}

.info-item {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
  font-size: 13px;
}

.info-label {
  color: #666;
}

.info-value {
  font-weight: 500;
}

.info-actions {
  padding: 12px 16px;
  border-top: 1px solid #f0f0f0;
}

.stats-panel {
  position: absolute;
  top: 80px;
  left: 20px;
  display: flex;
  gap: 16px;
  background: white;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  padding: 12px 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.stat-item {
  text-align: center;
}

.stat-value {
  font-size: 24px;
  font-weight: 600;
  color: #1890ff;
}

.stat-label {
  font-size: 12px;
  color: #666;
  margin-top: 4px;
}
</style>
