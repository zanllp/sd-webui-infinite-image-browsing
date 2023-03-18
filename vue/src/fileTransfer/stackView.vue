<script setup lang="ts">
import { getTargetFolderFiles, type FileNodeInfo } from '@/api/files'
import { last } from 'lodash'
import { ref, computed, onMounted } from 'vue'
import { FileOutlined, FolderOpenOutlined } from '@/icon'
import path from 'path-browserify'
import { useGlobalStore } from '@/store/useGlobalStore'
import { copy2clipboard } from 'vue3-ts-util'
// @ts-ignore
import NProgress from 'multi-nprogress'
import 'multi-nprogress/nprogress.css'
import type Progress from 'nprogress'

const np = ref<Progress.NProgress>()
const el = ref<HTMLDivElement>()

const props = defineProps<{
  target: 'local' | 'netdisk'
}>()
interface Page {
  files: FileNodeInfo[],
  curr: string
}
const stack = ref<Page[]>([])
const global = useGlobalStore()
const currPage = computed(() => last(stack.value))

const sortFile = (files: FileNodeInfo[]) => {
  return files.sort((a, b) => {
    const sa = a.type === 'dir' ? 1 : 0
    const sb = b.type === 'dir' ? 1 : 0
    return sb - sa
  })
}
onMounted(async () => {
  const resp = await getTargetFolderFiles(props.target, '/')
  stack.value.push({
    files: sortFile(resp.files),
    curr: '/'
  })
  np.value = new NProgress()
  np.value!.configure({ parent: el.value as any })
})
const getBasePath = () => stack.value.map(v => v.curr).slice(global.conf?.is_win && props.target === 'local' ? 1 : 0)

const copyLocation = () => copy2clipboard(path.join(...getBasePath()))

const openNext = async (file: FileNodeInfo) => {
  if (file.type !== 'dir') {
    return
  }
  try {
    np.value?.start()
    const prev = getBasePath()
    const { files } = await getTargetFolderFiles(props.target, path.normalize(path.join(...prev, file.name)))
    stack.value.push({
      files: sortFile(files),
      curr: file.name
    })
  } finally {
    np.value?.done()
  }
}

const back = (idx: number) => {
  while (idx < stack.value.length - 1) {
    stack.value.pop()
  }
}

</script>
<template>
  <div ref="el">
    <div class="location">

      <a-breadcrumb>
        <a-breadcrumb-item v-for="item, idx in stack" :key="idx"><a @click.prevent="back(idx)">{{ item.curr === "/" ? "根"
          : item.curr.replace(/:\/$/, '盘') }}</a></a-breadcrumb-item>
      </a-breadcrumb>
      <a @click.prevent="copyLocation">复制路径</a>
    </div>
    <div v-if="currPage" class="page-container">
      <ul class="file-list">
        <li class="file" v-for="file in currPage.files" :class="{ 'clickable': file.type === 'dir' }" :key="file.name"
          @click="openNext(file)">
          <file-outlined v-if="file.type === 'file'" />
          <folder-open-outlined v-else />
          <div class="name">
            {{ file.name }}
          </div>
          <div class="size">
            {{ file.size }}
          </div>
        </li>
      </ul>
    </div>
  </div>
</template>
<style lang="scss" scoped>
.location {
  margin: 32px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.page-container {
  padding: 8px;

  .file-list {
    list-style: none;
    padding: 8px;
    max-height: 900px;
    overflow: auto;



    .file {
      padding: 8px 16px;
      margin: 8px;
      display: flex;
      align-items: center;
      background: white;
      border-radius: 8px;
      box-shadow: 0 0 4px #ccc;

      &.clickable {
        cursor: pointer;
      }

      .name {
        flex: 1;
        padding: 8px;
      }

      .size {}

    }
  }
}
</style>