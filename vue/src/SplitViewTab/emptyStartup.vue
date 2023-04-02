<script lang="ts" setup>
import { useGlobalStore, type TabPane } from '@/store/useGlobalStore'
import { uniqueId } from 'lodash'
import { computed } from 'vue'
import { ID } from 'vue3-ts-util'

const global = useGlobalStore()
const props = defineProps<{ tabIdx: number, paneIdx: number }>()
const compCnMap: Partial<Record<TabPane['type'], string>> = {
  "auto-upload": '自动上传',
  local: '本地文件',
  netdisk: '百度云',
  "task-record": '任务记录'
}
const onCreateNewTab = (type: TabPane['type'], path?: string) => {
  let pane: TabPane

  switch (type) {
    case 'auto-upload':
    case 'task-record':
    case 'empty':
      pane = { type, name: compCnMap[type]!, key: Date.now() + uniqueId() }
      break
    case 'local':
    case 'netdisk':
      pane = { type, name: compCnMap[type]!, key: Date.now() + uniqueId(), target: type, path }
  }
  const tab = global.tabList[props.tabIdx]
  tab.panes.splice(props.paneIdx, 1, pane)
  tab.key = pane.key
}

const lastRecord = computed(() => global.lastTabListRecord?.[1])
</script>
<template>
  <div class="container">
    <h1>
      欢迎
    </h1>
    <div class="record-restore" v-if="lastRecord?.tabs">
      <a @click.prevent="global.tabList = lastRecord!.tabs.map(V => ID(V, true))">还原上次记录</a>
    </div>
    <ul>
      <h2>启动</h2>
      <li v-for="comp in Object.keys(compCnMap) as TabPane['type'][]" :key="comp">
        <a @click.prevent="onCreateNewTab(comp)">{{ compCnMap[comp] }}</a>
      </li>
    </ul>
    <ul>
      <h2>最近</h2>
      <li v-for="item in global.recent" :key="item.key">
        <a @click.prevent="onCreateNewTab(item.target as any, item.path)">{{ item.target === 'local' ? '本地' : '云盘' }} : {{
          item.path }}</a>
      </li>
    </ul>
  </div>
</template>
<style scoped lang="scss">
.container {
  margin: 32px;
}

ul {
  padding: 16px 0;
  list-style: none;
}
</style>