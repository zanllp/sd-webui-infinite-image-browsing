<script setup lang="ts">
import { getGlobalSettingRaw, setAppFeSettingForce } from '@/api'
import {
  getClusterIibOutputJobStatus,
  getClusterIibOutputCached,
  searchIibOutputByPrompt,
  startClusterIibOutputJob,
  type ClusterIibOutputJobStatusResp,
  type ClusterIibOutputCachedResp,
  type ClusterIibOutputResp,
  type PromptSearchResp
} from '@/api/db'
import { updateImageData } from '@/api/db'
import { t } from '@/i18n'
import { useGlobalStore } from '@/store/useGlobalStore'
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { uniqueId } from 'lodash-es'
import { message } from 'ant-design-vue'
import { isTauri } from '@/util/env'
import { useLocalStorage } from '@vueuse/core'
import TagRelationGraph from './TagRelationGraph.vue'

const props = defineProps<{ tabIdx: number; paneIdx: number }>()
const g = useGlobalStore()

const loading = ref(false)
// Default stricter to avoid over-merged broad topics for natural-language prompts.
const threshold = ref(0.9)
const minClusterSize = ref(2)
const result = ref<ClusterIibOutputResp | null>(null)
const cacheInfo = ref<ClusterIibOutputCachedResp | null>(null)
const embeddingBuilt = ref(false)  // Track if embeddings are already built

const _REQS_LS_KEY = 'iib_topic_search_hide_requirements_v1'
// true = show requirements; false = hidden
const showRequirements = useLocalStorage<boolean>(_REQS_LS_KEY, true)
const hideRequirements = () => {
  showRequirements.value = false
}

const job = ref<ClusterIibOutputJobStatusResp | null>(null)
const jobId = ref<string>('')
let _jobTimer: any = null

const jobRunning = computed(() => {
  const st = job.value?.status
  return st === 'queued' || st === 'running'
})
const jobStageText = computed(() => {
  const st = String(job.value?.stage || '')
  if (!st || st === 'queued' || st === 'init') return t('topicSearchJobQueued')
  if (st === 'embedding') return t('topicSearchJobStageEmbedding')
  if (st === 'clustering') return t('topicSearchJobStageClustering')
  if (st === 'titling') return t('topicSearchJobStageTitling')
  if (st === 'done') return t('topicSearchJobStageDone')
  if (st === 'error') return t('topicSearchJobStageError')
  return `${t('topicSearchJobStage')}: ${st}`
})
const jobPercent = computed(() => {
  const p = job.value?.progress
  if (!p) return 0
  const total = Number(p.to_embed ?? 0)
  const done = Number(p.embedded_done ?? 0)
  if (total <= 0) return 0
  const v = Math.floor((done / total) * 100)
  return Math.max(0, Math.min(100, v))
})
const jobDesc = computed(() => {
  const p = job.value?.progress
  if (!p) return ''
  if (job.value?.stage === 'embedding') {
    const done = Number(p.embedded_done ?? 0)
    const total = Number(p.to_embed ?? 0)
    const scanned = Number(p.scanned ?? 0)
    const folder = String(p.folder ?? '')
    return t('topicSearchJobEmbeddingDesc', [done, total, scanned, folder])
  }
  if (job.value?.stage === 'clustering') {
    const done = Number(p.items_done ?? 0)
    const total = Number(p.items_total ?? 0)
    return t('topicSearchJobClusteringDesc', [done, total])
  }
  if (job.value?.stage === 'titling') {
    const done = Number(p.clusters_done ?? 0)
    const total = Number(p.clusters_total ?? 0)
    return t('topicSearchJobTitlingDesc', [done, total])
  }
  return ''
})

const query = ref('')
const qLoading = ref(false)
const qResult = ref<PromptSearchResp | null>(null)

// Tab control
const activeTab = ref<'clusters' | 'graph'>('clusters')

const scopeOpen = ref(false)
const selectedFolders = ref<string[]>([])
const _scopeInitDone = ref(false)
const _SCOPE_SETTING_NAME = 'topic_search_scope'
const _saving = ref(false)
let _saveTimer: any = null
let _lastSavedSig = ''
const excludedDirs = computed(() => {
  const list = (g.quickMovePaths ?? []) as any[]
  return list
    .filter((v) => {
      const key = String(v?.key ?? '')
      const types = (v?.types ?? []) as string[]
      // 去掉默认注入的 3 项：工作文件夹 / home / 桌面
      return types.includes('preset') && ['cwd', 'home', 'desktop'].includes(key)
    })
    .map((v) => String(v?.dir ?? ''))
    .filter(Boolean)
})
watch(
  excludedDirs,
  (dirs) => {
    if (!dirs?.length) return
    selectedFolders.value = (selectedFolders.value ?? []).filter((p) => !dirs.includes(p))
  },
  { immediate: true }
)
const folderOptions = computed(() => {
  const list = (g.quickMovePaths ?? []) as any[]
  return list
    .filter((v) => {
      const key = String(v?.key ?? '')
      const types = (v?.types ?? []) as string[]
      return !(types.includes('preset') && ['cwd', 'home', 'desktop'].includes(key))
    })
    .map((v) => ({ value: v.dir, label: v.zh || v.dir }))
})
const scopeCount = computed(() => (selectedFolders.value ?? []).filter(Boolean).length)
const scopeFolders = computed(() => (selectedFolders.value ?? []).filter(Boolean))

const clusters = computed(() => result.value?.clusters ?? [])

const loadScopeFromBackend = async () => {
  if (_scopeInitDone.value) return
  try {
    const conf = await getGlobalSettingRaw()
    // 同步到全局 store，避免页面间不一致
    g.conf = conf as any
  } catch (e) {
    // ignore（axios interceptor 会提示错误）
  }

  const app = (g.conf?.app_fe_setting as any) || {}
  const savedPaths = app?.[_SCOPE_SETTING_NAME]?.folder_paths
  if (Array.isArray(savedPaths) && savedPaths.length && (!selectedFolders.value?.length)) {
    selectedFolders.value = savedPaths.map((x: any) => String(x)).filter(Boolean)
  }
  _scopeInitDone.value = true
}

const saveScopeToBackend = async () => {
  if (g.conf?.is_readonly) return
  if (!_scopeInitDone.value) return
  const payload = {
    folder_paths: scopeFolders.value,
    updated_at: Date.now()
  }
  await setAppFeSettingForce(_SCOPE_SETTING_NAME, payload)
  if (g.conf?.app_fe_setting) {
    (g.conf.app_fe_setting as any)[_SCOPE_SETTING_NAME] = payload
  }
}

const scheduleSaveScope = () => {
  if (g.conf?.is_readonly) return
  if (!_scopeInitDone.value) return
  const sig = JSON.stringify(scopeFolders.value)
  if (sig === _lastSavedSig) return
  if (_saveTimer) clearTimeout(_saveTimer)
  _saveTimer = setTimeout(async () => {
    _saving.value = true
    try {
      await saveScopeToBackend()
      _lastSavedSig = sig
    } finally {
      _saving.value = false
    }
  }, 500)
}

const stopJobPoll = () => {
  if (_jobTimer) {
    clearInterval(_jobTimer)
    _jobTimer = null
  }
}

const pollJob = async () => {
  const id = jobId.value
  if (!id) return
  const st = await getClusterIibOutputJobStatus(id)
  job.value = st
  if (st.status === 'done') {
    stopJobPoll()
    loading.value = false
    if (st.result) result.value = st.result
    cacheInfo.value = null
  } else if (st.status === 'error') {
    stopJobPoll()
    loading.value = false
    message.error(st.error || t('topicSearchJobFailed'))
  }
}

const loadCached = async () => {
  if (!scopeCount.value) return
  // best-effort: do not block entering the page
  try {
    const cached = await getClusterIibOutputCached({
      threshold: threshold.value,
      min_cluster_size: minClusterSize.value,
      lang: g.lang,
      folder_paths: scopeFolders.value
    })
    cacheInfo.value = cached
    if (cached.cache_hit && cached.result) {
      result.value = cached.result
    }
  } catch (e) {
    // ignore
  }
}

const refresh = async () => {
  if (g.conf?.is_readonly) return
  if (!scopeCount.value) {
    message.warning(t('topicSearchNeedScope'))
    scopeOpen.value = true
    return
  }
  stopJobPoll()
  loading.value = true
  job.value = null
  jobId.value = ''
  try {
    // Ensure DB file index is up to date before clustering (so newly added/moved images are included).
    await updateImageData()
    const started = await startClusterIibOutputJob({
      threshold: threshold.value,
      min_cluster_size: minClusterSize.value,
      lang: g.lang,
      folder_paths: scopeFolders.value
    })
    jobId.value = started.job_id
    // poll immediately + interval
    await pollJob()
    _jobTimer = setInterval(() => {
      void pollJob()
    }, 800)
  } catch (e) {
    loading.value = false
    throw e
  }
}

const runQuery = async () => {
  const q = (query.value || '').trim()
  if (!q) return
  if (qLoading.value) return
  if (!scopeCount.value) {
    message.warning(t('topicSearchNeedScope'))
    scopeOpen.value = true
    return
  }
  qLoading.value = true
  try {
    qResult.value = await searchIibOutputByPrompt({
      query: q,
      top_k: 80,
      ensure_embed: !embeddingBuilt.value,  // Only build on first search
      folder_paths: scopeFolders.value
    })
    // Mark embeddings as built after first successful search
    if (!embeddingBuilt.value) {
      embeddingBuilt.value = true
    }
    // 搜索完成后自动打开结果页
    openQueryResult()
  } finally {
    qLoading.value = false
  }
}

const openQueryResult = () => {
  const paths = (qResult.value?.results ?? []).map((r) => r.path).filter(Boolean)
  if (!paths.length) return
  const title = `Query: ${query.value.trim()}（${paths.length}）`
  const pane = {
    type: 'topic-search-matched-image-grid' as const,
    name: title,
    key: Date.now() + uniqueId(),
    id: uniqueId(),
    title,
    paths
  }
  const tab = g.tabList[props.tabIdx]
  tab.panes.push(pane as any)
  tab.key = (pane as any).key
}

const openCluster = (item: ClusterIibOutputResp['clusters'][0]) => {
  const pane = {
    type: 'topic-search-matched-image-grid' as const,
    name: `${item.title}（${item.size}）`,
    key: Date.now() + uniqueId(),
    id: uniqueId(),
    title: item.title,
    paths: item.paths
  }
  const tab = g.tabList[props.tabIdx]
  tab.panes.push(pane as any)
  tab.key = (pane as any).key
}

const openClusterFromGraph = (cluster: { title: string; paths: string[]; size: number }) => {
  const pane = {
    type: 'topic-search-matched-image-grid' as const,
    name: `${cluster.title}（${cluster.size}）`,
    key: Date.now() + uniqueId(),
    id: uniqueId(),
    title: cluster.title,
    paths: cluster.paths
  }
  const tab = g.tabList[props.tabIdx]
  tab.panes.push(pane as any)
  tab.key = (pane as any).key
}

const handleSearchTag = (tag: string) => {
  // Search by tag name
  query.value = tag
  runQuery()
}

onMounted(() => {
  // 默认不启用任何范围：不自动刷新；但如果后端已持久化范围，则自动拉取一次结果
  void (async () => {
    await loadScopeFromBackend()
    if (scopeCount.value) {
      await loadCached()
    }
  })()
})

onBeforeUnmount(() => {
  stopJobPoll()
})

// Reset embedding built flag when scope changes
watch(scopeFolders, () => {
  embeddingBuilt.value = false
}, { deep: true })

watch(
  () => scopeFolders.value,
  () => {
    // 选择即自动持久化（不依赖 OK，也不依赖同步开关）
    scheduleSaveScope()
  },
  { deep: true }
)
</script>

<template>
  <div class="topic-search">
    <div class="toolbar">
      <div class="left">
        <div class="title">
          <span class="icon">🧠</span>
          <span>{{ $t('topicSearchTitleExperimental') }}</span>
        </div>
        <a-tag v-if="result" color="blue">共 {{ result.count }} 张</a-tag>
        <a-tag v-if="result" color="geekblue">主题 {{ result.clusters.length }}</a-tag>
        <a-tag v-if="result" color="default">噪声 {{ result.noise.length }}</a-tag>
      </div>
      <div class="right">
        <a-button @click="scopeOpen = true">
          {{ $t('topicSearchScope') }}
          <span v-if="scopeCount" style="opacity: 0.75;">（{{ scopeCount }}）</span>
        </a-button>
        <a-input
          v-model:value="query"
          style="width: min(420px, 72vw);"
          :placeholder="$t('topicSearchQueryPlaceholder')"
          :disabled="qLoading"
          @keydown.enter="runQuery"
          allow-clear
        />
        <a-button :loading="qLoading" @click="runQuery">{{ $t('search') }}</a-button>
        <a-button v-if="qResult?.results?.length" @click="openQueryResult">{{ $t('topicSearchOpenResults') }}</a-button>
        <span class="label">{{ $t('topicSearchThreshold') }}</span>
        <a-input-number v-model:value="threshold" :min="0.5" :max="0.99" :step="0.01" />
        <span class="label">{{ $t('topicSearchMinClusterSize') }}</span>
        <a-input-number v-model:value="minClusterSize" :min="1" :max="50" :step="1" />
        <a-button type="primary" ghost :loading="loading" :disabled="g.conf?.is_readonly" @click="refresh">{{ $t('refresh') }}</a-button>
      </div>
    </div>

    <a-alert
      v-if="g.conf?.is_readonly"
      type="warning"
      :message="$t('readonlyModeSettingPageDesc')"
      style="margin: 12px 0;"
      show-icon
    />

    <a-alert
      v-if="showRequirements"
      type="info"
      show-icon
      closable
      style="margin: 10px 0 0 0;"
      :message="$t('topicSearchRequirementsTitle')"
      @close="hideRequirements"
    >
      <template #description>
        <div style="display: grid; gap: 6px;">
          <div>
            <span style="margin-right: 6px;">🔑</span>
            <span>{{ $t('topicSearchRequirementsOpenai') }}</span>
          </div>
          <template v-if="isTauri">
            <div>
              <span style="margin-right: 6px;">🧩</span>
              <span>{{ $t('topicSearchRequirementsDepsDesktop') }}</span>
            </div>
          </template>
          <template v-else>
            <div>
              <span style="margin-right: 6px;">🐍</span>
              <span>{{ $t('topicSearchRequirementsDepsPython') }}</span>
            </div>
            <div style="opacity: 0.85;">
              <span style="margin-right: 6px;">💻</span>
              <span>{{ $t('topicSearchRequirementsInstallCmd') }}</span>
            </div>
          </template>
        </div>
      </template>
    </a-alert>

    <a-alert
      v-if="cacheInfo?.cache_hit && cacheInfo?.stale"
      type="warning"
      show-icon
      style="margin: 10px 0 0 0;"
      :message="$t('topicSearchCacheStale')"
    >
      <template #description>
        <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
          <span style="opacity: 0.85;">{{ $t('topicSearchCacheStaleDesc') }}</span>
          <a-button size="small" :loading="loading || jobRunning" :disabled="g.conf?.is_readonly" @click="refresh">
            {{ $t('topicSearchCacheUpdate') }}
          </a-button>
        </div>
      </template>
    </a-alert>

    <div v-if="jobRunning" style="margin: 10px 0 0 0;">
      <a-alert type="info" show-icon :message="jobStageText" :description="jobDesc" />
      <a-progress :percent="jobPercent" size="small" style="margin-top: 8px;" />
    </div>

    <!-- View Switcher -->
    <div style="margin-top: 10px; display: flex; align-items: center; gap: 8px;">
      <span style="font-size: 13px; color: #666;">View:</span>
      <a-switch
        v-model:checked="activeTab"
        :checked-value="'graph'"
        :un-checked-value="'clusters'"
        checked-children="Tag Graph"
        un-checked-children="Clusters"
      />
    </div>

    <!-- Cluster Cards View -->
    <div v-if="activeTab === 'clusters'">
      <a-spin :spinning="loading">
        <div v-if="qResult" style="margin-top: 10px;">
          <a-alert
            type="info"
            :message="$t('topicSearchRecallMsg', [qResult.results.length, qResult.count, qResult.top_k])"
            show-icon
          />
        </div>
        <div class="grid" v-if="clusters.length">
          <div class="card" v-for="c in clusters" :key="c.id" @click="openCluster(c)">
            <div class="card-top">
              <div class="card-title line-clamp-1">{{ c.title }}</div>
              <div class="card-count">{{ c.size }}</div>
            </div>
            <div class="card-desc line-clamp-2">{{ c.sample_prompt }}</div>
          </div>
        </div>

        <div class="empty" v-else>
        <a-alert
          type="info"
          show-icon
          :message="$t('topicSearchGuideTitle')"
          style="margin-bottom: 10px;"
        />

        <div class="guide">
          <div class="guide-row">
            <span class="guide-icon">🗂️</span>
            <span class="guide-text">{{ $t('topicSearchGuideStep1') }}</span>
            <a-button size="small" @click="scopeOpen = true">{{ $t('topicSearchScope') }}</a-button>
          </div>
          <div class="guide-row">
            <span class="guide-icon">🧠</span>
            <span class="guide-text">{{ $t('topicSearchGuideStep2') }}</span>
            <a-button size="small" :loading="loading" :disabled="g.conf?.is_readonly" @click="refresh">{{ $t('refresh') }}</a-button>
          </div>
          <div class="guide-row">
            <span class="guide-icon">🔎</span>
            <span class="guide-text">{{ $t('topicSearchGuideStep3') }}</span>
          </div>

          <div class="guide-row">
            <span class="guide-icon">✨</span>
            <span class="guide-text">{{ $t('topicSearchGuideAdvantage1') }}</span>
          </div>
          <div class="guide-row">
            <span class="guide-icon">🚀</span>
            <span class="guide-text">{{ $t('topicSearchGuideAdvantage2') }}</span>
          </div>

          <div class="guide-hint">
            <span class="guide-icon">💡</span>
            <span class="guide-text" v-if="!scopeCount">{{ $t('topicSearchGuideEmptyReasonNoScope') }}</span>
            <span class="guide-text" v-else>{{ $t('topicSearchGuideEmptyReasonNoTopics') }}</span>
          </div>
        </div>
      </div>
      </a-spin>
    </div>

    <!-- Tag Graph View -->
    <div v-else-if="activeTab === 'graph'" style="height: calc(100vh - 300px); min-height: 600px;">
      <TagRelationGraph
        :folders="scopeFolders"
        :lang="g.lang"
        @search-tag="handleSearchTag"
        @open-cluster="openClusterFromGraph"
      />
    </div>

    <a-modal
      v-model:visible="scopeOpen"
      :title="$t('topicSearchScopeModalTitle')"
      :mask-closable="true"
      @ok="
        () => {
          scopeOpen = false
          void saveScopeToBackend()
        }
      "
    >
      <a-alert
        type="info"
        show-icon
        :message="$t('topicSearchScopeTip')"
        style="margin-bottom: 10px;"
      />
      <a-alert
        v-if="_saving"
        type="info"
        show-icon
        :message="$t('topicSearchSavingToBackend')"
        style="margin-bottom: 10px;"
      />
      <a-select
        v-model:value="selectedFolders"
        mode="multiple"
        style="width: 100%;"
        :options="folderOptions"
        :placeholder="$t('topicSearchScopePlaceholder')"
        :max-tag-count="3"
        :getPopupContainer="(trigger: HTMLElement) => trigger.parentElement || trigger"
        allow-clear
      />
    </a-modal>
  </div>
</template>

<style scoped lang="scss">
.topic-search {
  height: var(--pane-max-height);
  overflow: auto;
  padding: 12px;
}

.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 12px;
  background: var(--zp-primary-background);
  border-radius: 12px;
}

.left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 700;
}

.right {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.label {
  color: #888;
}

.guide {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px 12px;
  background: var(--zp-primary-background);
  border-radius: 12px;
  border: 1px solid rgba(0, 0, 0, 0.06);
}

.guide-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.guide-hint {
  margin-top: 4px;
  display: flex;
  align-items: center;
  gap: 10px;
  opacity: 0.85;
}

.guide-icon {
  width: 22px;
  text-align: center;
  flex: 0 0 22px;
}

.guide-text {
  flex: 1 1 auto;
  min-width: 0;
  color: rgba(0, 0, 0, 0.75);
}

.grid {
  margin-top: 12px;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 10px;
}

.card {
  background: var(--zp-primary-background);
  border-radius: 12px;
  padding: 10px 12px;
  cursor: pointer;
  border: 1px solid rgba(0, 0, 0, 0.06);
}

.card:hover {
  border-color: rgba(24, 144, 255, 0.6);
}

.card-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.card-title {
  font-weight: 700;
}

.card-count {
  min-width: 28px;
  text-align: right;
  opacity: 0.75;
}

.card-desc {
  margin-top: 6px;
  color: #666;
  font-size: 12px;
}

.empty {
  height: calc(var(--pane-max-height) - 72px);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 12px;
}

.hint {
  font-size: 16px;
  opacity: 0.75;
}
</style>


