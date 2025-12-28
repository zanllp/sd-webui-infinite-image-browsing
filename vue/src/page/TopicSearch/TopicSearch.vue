<script setup lang="ts">
import { getGlobalSettingRaw, setAppFeSettingForce } from '@/api'
import { clusterIibOutput, searchIibOutputByPrompt, type ClusterIibOutputResp, type PromptSearchResp } from '@/api/db'
import { t } from '@/i18n'
import { useGlobalStore } from '@/store/useGlobalStore'
import { computed, onMounted, ref, watch } from 'vue'
import { uniqueId } from 'lodash-es'
import { message } from 'ant-design-vue'

const props = defineProps<{ tabIdx: number; paneIdx: number }>()
const g = useGlobalStore()

const loading = ref(false)
const threshold = ref(0.86)
const minClusterSize = ref(2)
const result = ref<ClusterIibOutputResp | null>(null)

const query = ref('')
const qLoading = ref(false)
const qResult = ref<PromptSearchResp | null>(null)

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

const clusters = computed(() => (result.value?.clusters ?? []).slice(0, 12))

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

const refresh = async () => {
  if (g.conf?.is_readonly) return
  if (!scopeCount.value) {
    message.warning(t('topicSearchNeedScope'))
    scopeOpen.value = true
    return
  }
  loading.value = true
  try {
    result.value = await clusterIibOutput({
      threshold: threshold.value,
      min_cluster_size: minClusterSize.value,
      lang: g.lang,
      folder_paths: scopeFolders.value
    })
  } finally {
    loading.value = false
  }
}

const runQuery = async () => {
  const q = (query.value || '').trim()
  if (!q) return
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
      ensure_embed: true,
      folder_paths: scopeFolders.value
    })
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

onMounted(() => {
  // 默认不启用任何范围：不自动刷新；但如果后端已持久化范围，则自动拉取一次结果
  void (async () => {
    await loadScopeFromBackend()
    if (scopeCount.value) {
      await refresh()
    }
  })()
})

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

          <div class="guide-hint">
            <span class="guide-icon">💡</span>
            <span class="guide-text" v-if="!scopeCount">{{ $t('topicSearchGuideEmptyReasonNoScope') }}</span>
            <span class="guide-text" v-else>{{ $t('topicSearchGuideEmptyReasonNoTopics') }}</span>
          </div>
        </div>
      </div>
    </a-spin>

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


