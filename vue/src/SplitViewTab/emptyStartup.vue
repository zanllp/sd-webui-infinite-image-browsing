<script lang="ts" setup>
import { useGlobalStore, type TabPane } from '@/store/useGlobalStore'
import { uniqueId } from 'lodash'
import { computed } from 'vue'
import { ID } from 'vue3-ts-util'
import { CloudDownloadOutlined, FileDoneOutlined } from '@/icon'

const global = useGlobalStore()
const props = defineProps<{ tabIdx: number, paneIdx: number }>()
const compCnMap: Partial<Record<TabPane['type'], string>> = {
  "auto-upload": '自动上传',
  local: '本地文件',
  netdisk: '百度云',
  "task-record": '任务记录'
}
const openInCurrentTab = (type: TabPane['type'], path?: string, walkMode = false) => {
  let pane: TabPane

  switch (type) {
    case 'auto-upload':
    case 'task-record':
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

</script>
<template>
  <div class="container">
    <h1>
      欢迎
    </h1>
    <div class="record-restore" v-if="lastRecord?.tabs.length">
      <a @click.prevent="global.tabList = lastRecord!.tabs.map(V => ID(V, true))">还原上次记录</a>
    </div>
    <div class="quick-start">
      <div style="margin-right: 128px;">

        <ul>
          <h2>启动</h2>
          <li v-for="comp in Object.keys(compCnMap) as TabPane['type'][]" :key="comp" >
            <a @click.prevent="openInCurrentTab(comp)">{{ compCnMap[comp] }}</a>
          </li>
        </ul>
        <ul v-if="walkModeSupportedDir.length" class="walk-mode">
          <h2>使用Walk模式浏览图片</h2>
          <li v-for="item in walkModeSupportedDir" :key="item.dir" >
            <AButton @click="openInCurrentTab('local', item.dir, true)" ghost type="primary" block>{{ item.zh }}</AButton>
          </li>
          </ul>
        <ul>
          <h2>最近</h2>
          <li v-for="item in global.recent" :key="item.key">
            <CloudDownloadOutlined v-if="item.target !== 'local'" />
            <FileDoneOutlined v-else />
            {{ item.target === 'local' ? '本地' : '云盘' }}
            : <a @click.prevent="openInCurrentTab(item.target as any, item.path)">{{ item.path }}</a>
          </li>
        </ul>
      </div>
      <div>

        <ul>
          <h2>从快速移动启动</h2>
          <li v-for="dir in global.autoCompletedDirList" :key="dir.key" class="quick">
            <a @click.prevent="openInCurrentTab('local', dir.dir)">{{ dir.zh }}</a>
          </li>
        </ul>
      </div>

    </div>
  </div>
</template>
<style scoped lang="scss">
.container {
  margin: 32px;
}

.quick-start {
  display: flex;
  flex-wrap: wrap;
  margin-top: 64px;

  ul {
    flex-shrink: 0;
    padding: 16px 0;
    list-style: none;
    margin-right: 20%;
    width: 512px;


    li {
      padding: 4px 0;
    }
  }

}
</style>