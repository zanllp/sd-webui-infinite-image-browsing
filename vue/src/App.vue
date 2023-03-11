<!-- eslint-disable no-empty -->
<script setup lang="ts">
import { SplitView } from 'vue3-ts-util'
import TaskList from './taskList/taskList.vue'
</script>

<template>
  <split-view :percent="90">
    <template #left>
      <task-list>

      </task-list>
    </template>
  </split-view>
</template>
<style scoped>
.action-bar {
  margin: 16px 0;
}

.container {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.upload-progress-info {
  display: flex;
  flex-direction: row;
  align-items: center;
}

.upload-progress-info>* {
  margin-right: 8px;
}

.log-list {
  max-height: 70vh;
  flex: 1;
  overflow: auto;
  background-color: #f5f5f5;
  /* 背景色 */
  border: 1px solid #ccc;
  /* 边框 */
  padding: 10px;
  /* 内边距 */
  box-shadow: 2px 2px 2px rgba(0, 0, 0, 0.3);
  /* 阴影 */
  border-radius: 5px;
  /* 圆角 */
  font-size: 14px;
  /* 字体大小 */
  line-height: 1.5;
  /* 行高 */
  font-family: Arial, sans-serif;
  /* 字体样式 */
  color: #333;
  /* 字体颜色 */
}
</style>

<style>
#baidu_netdisk_container {
  max-height: 70vh;
}
</style>