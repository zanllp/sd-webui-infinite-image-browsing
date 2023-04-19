<script lang="ts" setup>
import { useGlobalStore, type TabPane } from '@/store/useGlobalStore'
import { uniqueId } from 'lodash-es'
import { computed } from 'vue'
import { ID } from 'vue3-ts-util'
import { CloudDownloadOutlined, FileDoneOutlined } from '@/icon'
import { message } from 'ant-design-vue'
import { t } from '@/i18n'

const global = useGlobalStore()
const props = defineProps<{ tabIdx: number, paneIdx: number }>()
const compCnMap: Partial<Record<TabPane['type'], string>> = {
  local: t('local'),
  'global-setting': t('globalSettings'),
  netdisk: t('baiduCloud'),
  "task-record": t('taskRecord'),
  "auto-upload": t('autoUpload'),
}
const openInCurrentTab = (type: TabPane['type'], path?: string, walkMode = false) => {
  let pane: TabPane
  if (type === 'task-record' && global.tabList.map(v => v.panes).flat().find(v => v.type === 'task-record')) {
    return message.error(t('onlyOneTaskRecordAllowed')) // 如果允许多个需要处理一些监听器，懒得改后面再说
  }
  switch (type) {
    case 'auto-upload':
    case 'task-record':
    case 'log-detail':
    case 'global-setting':
    case 'empty':
      pane = { type, name: compCnMap[type]!, key: Date.now() + uniqueId() }
      break
    case 'local':
    case 'netdisk':
      pane = { type, name: compCnMap[type]!, key: Date.now() + uniqueId(), target: type, path, walkMode }
  }
  const tab = global.tabList[props.tabIdx]
  tab.panes.splice(props.paneIdx, 1, pane)
  tab.key = pane.key
}

const lastRecord = computed(() => global.lastTabListRecord?.[1])




const walkModeSupportedDir = computed(() => global.autoCompletedDirList.filter(({ key: k }) => k === 'outdir_txt2img_samples' || k === 'outdir_img2img_samples' || k === 'outdir_extras_samples' || k === 'outdir_save' || k === 'outdir_samples'))
const canpreviewInNewWindow = window.parent !== window
const previewInNewWindow = () => window.parent.open('/infinite_image_browsing')
</script>
<template>
  <div class="container">
    <div class="header">
      <h1>{{ $t('welcome') }}</h1>
      <div flex-placeholder />
      <div v-if="canpreviewInNewWindow" class="last-record" @click="previewInNewWindow">
        <a>{{ $t('openInNewWindow') }}</a>
      </div>
      <div class="last-record">
        <a v-if="lastRecord?.tabs.length" @click.prevent="global.tabList = lastRecord!.tabs.map(V => ID(V, true))">{{
          $t('restoreLastRecord') }}</a>
      </div>
    </div>
    <div class="content">

      <div class="quick-start" v-if="walkModeSupportedDir.length">
        <h2>{{ $t('walkMode') }}</h2>
        <ul>
          <li v-for="item in walkModeSupportedDir" :key="item.dir" class="quick-start__item">
            <AButton @click="openInCurrentTab('local', item.dir, true)" ghost type="primary" block>{{ item.zh }}</AButton>
          </li>
        </ul>
      </div>
      <div class="quick-start" v-if="global.autoCompletedDirList.length">
        <h2>{{ $t('launchFromQuickMove') }}</h2>
        <ul>
          <li v-for="dir in global.autoCompletedDirList" :key="dir.key" class="quick-start__item"
            @click.prevent="openInCurrentTab('local', dir.dir)">
            <span class="quick-start__text line-clamp-1">{{ dir.zh }}</span>
          </li>
        </ul>

      </div>
      <div class="quick-start">
        <h2>{{ $t('launch') }}</h2>
        <ul>
          <li v-for="comp in Object.keys(compCnMap).slice(0, 2) as TabPane['type'][]" :key="comp"
            class="quick-start__item" @click.prevent="openInCurrentTab(comp)">
            <span class="quick-start__text line-clamp-1">{{ compCnMap[comp] }}</span>
          </li>
          <a-collapse style="margin-top: 32px; " v-model:activeKey="global.baiduNetdiskPageOpened" :bordered="false">
            <a-collapse-panel key="true" :header="$t('baiduNetdiskCollapseTitle')" >
              <li v-for="comp in Object.keys(compCnMap).slice(2) as TabPane['type'][]" :key="comp"
                class="quick-start__item" @click.prevent="openInCurrentTab(comp)">
                <span class="quick-start__text line-clamp-1">{{ compCnMap[comp] }}</span>
              </li>
            </a-collapse-panel>
          </a-collapse>

        </ul>
      </div>
      <div class="quick-start" v-if="global.recent.length">
        <h2>{{ $t('recent') }}</h2>
        <ul>
          <li v-for="item in global.recent" :key="item.key" class="quick-start__item"
            @click.prevent="openInCurrentTab(item.target as any, item.path)">
            <CloudDownloadOutlined class="quick-start__icon" v-if="item.target !== 'local'" />
            <FileDoneOutlined class="quick-start__icon" v-else />
            <span class="quick-start__text line-clamp-1">{{ item.path
            }}</span>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.container {
  padding: 20px;
  background-color: var(--zp-secondary-background);
  height: 100%;
  overflow: auto;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.header h1 {
  font-size: 28px;
  font-weight: bold;
  color: var(--zp-primary);
}

.last-record {
  margin-left: 8px;
  font-size: 14px;
  color: var(--zp-tertiary);
}

.last-record a {
  text-decoration: none;
  color: var(--zp-tertiary);
}

.last-record a:hover {
  color: var(--zp-primary);
}

.content {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  grid-gap: 20px;
}

.quick-start {
  background-color: var(--zp-primary-background);
  border-radius: 8px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
  padding: 20px;

  ul {
    list-style: none;
    padding: 4px;
  }
}

.quick-start h2 {
  margin-top: 0;
  margin-bottom: 20px;
  font-size: 20px;
  font-weight: bold;
  color: var(--zp-primary);
}

.quick-start__item {
  margin-bottom: 10px;
  padding: 4px 8px;
  display: flex;
  align-items: center;

  &:hover {
    background: var(--zp-secondary-background);
    border-radius: 4px;
    color: var(--primary-color);
    cursor: pointer;
  }
}

.quick-start__text {
  flex: 1;
  font-size: 16px;
}

.quick-start__icon {
  margin-right: 8px;
}
</style>