<script setup lang="ts">
import { getTargetFolderFiles, type FileNodeInfo } from '@/api/files'
import { last } from 'lodash'
import { ref, computed, onMounted, toRaw } from 'vue'
import { FileOutlined, FolderOpenOutlined, DownOutlined } from '@/icon'
import path from 'path-browserify'
import { useGlobalStore } from '@/store/useGlobalStore'
import { copy2clipboard, ok, type SearchSelectConv, SearchSelect } from 'vue3-ts-util'
// @ts-ignore
import NProgress from 'multi-nprogress'
import 'multi-nprogress/nprogress.css'
import type Progress from 'nprogress'
import { Modal } from 'ant-design-vue'

const np = ref<Progress.NProgress>()
const el = ref<HTMLDivElement>()

const props = defineProps<{
  target: 'local' | 'netdisk'
}>()
interface Page {
  files: FileNodeInfo[]
  curr: string
}
const stack = ref<Page[]>([])
const global = useGlobalStore()
const currPage = computed(() => last(stack.value))
type SortMethod = 'date-asc' | 'date-desc' | 'name-asc' | 'name-desc' | 'size-asc' | 'size-desc'

const sortMethodMap: Record<SortMethod, string> = {
  'date-asc': '日期升序',
  'date-desc': '日期降序',
  'name-asc': '名称升序',
  'name-desc': '名称降序',
  'size-asc': '大小升序',
  'size-desc': '大小降序'
}
const sortMethodConv: SearchSelectConv<SortMethod> = {
  value: (v) => v,
  text: (v) => '按' + sortMethodMap[v]
}
const sortMethod = ref<SortMethod>('date-desc')

onMounted(async () => {
  const resp = await getTargetFolderFiles(props.target, '/')
  stack.value.push({
    files: resp.files,
    curr: '/'
  })
  np.value = new NProgress()
  np.value!.configure({ parent: el.value as any })
  if (props.target == 'local') {
    global.conf?.home && to(global.conf.home)
  }
})

const getBasePath = () =>
  stack.value.map((v) => v.curr).slice(global.conf?.is_win && props.target === 'local' ? 1 : 0)

const copyLocation = () => copy2clipboard(path.join(...getBasePath()))

const filesSort = (files: FileNodeInfo[]) => {
  return files.slice().sort((a, b) => {
    const method = sortMethod.value
    const sa = a.type === 'dir' ? 1 : 0
    const sb = b.type === 'dir' ? 1 : 0
    const typeCompare = sb - sa
    if (typeCompare !== 0) {
      return typeCompare
    }
    if (method === 'date-asc' || method === 'date-desc') {
      const da = Date.parse(a.date)
      const db = Date.parse(b.date)
      return method === 'date-asc' ? da - db : db - da
    } else if (method === 'name-asc' || method == 'name-desc') {
      const an = a.name.toLowerCase()
      const bn = b.name.toLowerCase()
      return method === 'name-asc' ? an.localeCompare(bn) : bn.localeCompare(an)
    } else {
      return method === 'size-asc' ? a.bytes - b.bytes : b.bytes - a.bytes
    }
  })
}

const openNext = async (file: FileNodeInfo) => {
  if (file.type !== 'dir') {
    return
  }
  try {
    np.value?.start()
    const prev = getBasePath()
    const { files } = await getTargetFolderFiles(
      props.target,
      path.normalize(path.join(...prev, file.name))
    )
    stack.value.push({
      files,
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

const to = async (dir: string) => {
  if (!/^((\w:)|\/)/.test(dir)) {
    // 相对路径
    dir = path.join(global.conf?.sd_cwd ?? '/', dir)
  }
  const frags = dir.split(/\\|\//)
  if (global.conf?.is_win) {
    frags[0] = frags[0] + '/' // 分割完是c:
  } else {
    frags.shift() // /开头的一个是空
  }
  back(0) // 回到栈底
  for (const frag of frags) {
    const target = currPage.value?.files.find((v) => v.name === frag)
    ok(target)
    await openNext(target)
  }
}

const onDrop = async (e: DragEvent) => {
  const data = JSON.parse(e.dataTransfer?.getData('text') || '{}') as FileNodeInfo & {
    from: typeof props.target
    path: string
  }
  if (data.from && data.path && data.type) {
    if (data.from === props.target) {
      return
    }
    const type = data.from === 'local' ? 'upload' : 'download'
    const typeZH = type === 'upload' ? '上传' : '下载'
    const toPath = path.join(...getBasePath())
    Modal.confirm({
      title: `确定创建${typeZH}任务${data.type === 'dir' ? ', 这是文件夹!' : ''}`,
      content: `从 ${props.target !== 'local' ? '本地' : '云盘'} ${data.path} ${typeZH} ${props.target === 'local' ? '本地' : '云盘'
        } ${toPath}`,
      maskClosable: true,
      async onOk () {
        global.eventEmitter.emit('createNewTask', { send_dirs: data.path, recv_dir: toPath, type })
      }
    })
  }
}

const refresh = async () => {
  if (stack.value.length === 1) {
    const resp = await getTargetFolderFiles(props.target, '/')
    stack.value = [
      {
        files: resp.files,
        curr: '/'
      }
    ]
  } else {
    const last = currPage.value
    stack.value.pop()
    await openNext(currPage.value?.files.find((v) => v.name === last?.curr)!)
  }
}
</script>
<template>
  <div ref="el" @dragover.prevent @drop.prevent="onDrop($event)" class="container">
    <div class="location">
      <a-breadcrumb style="flex: 1">
        <a-breadcrumb-item v-for="(item, idx) in stack" :key="idx"><a @click.prevent="back(idx)">{{
          item.curr === '/' ? '根' : item.curr.replace(/:\/$/, '盘')
        }}</a></a-breadcrumb-item>
      </a-breadcrumb>
      <SearchSelect v-model:value="sortMethod" :conv="sortMethodConv" :options="Object.keys(sortMethodMap)" />
      <a class="opt" @click.prevent="refresh"> 刷新 </a>
      <a-dropdown v-if="props.target === 'local'">
        <a class="ant-dropdown-link opt" @click.prevent>
          快速移动
          <DownOutlined />
        </a>
        <template #overlay>
          <a-menu>
            <a-menu-item v-for="item in global.autoCompletedDirList" :key="item.dir">
              <a @click.prevent="to(item.dir)">{{ item.zh }}</a>
            </a-menu-item>
          </a-menu>
        </template>
      </a-dropdown>
      <a class="opt" @click.prevent="copyLocation">复制路径</a>
    </div>
    <div v-if="currPage" class="view">
      <ul class="file-list">
        <li class="file" v-for="file in filesSort(currPage.files)" :class="{ clickable: file.type === 'dir' }"
          :key="file.name" draggable="true" @dragstart="
            $event.dataTransfer!.setData(
              'text/plain',
              JSON.stringify({
                from: props.target,
                path: path.join(...getBasePath(), file.name),
                ...toRaw(file)
              })
            )
          " @click="openNext(file)">
          <file-outlined v-if="file.type === 'file'" />
          <folder-open-outlined v-else />
          <div class="name">
            {{ file.name }}
          </div>
          <div class="basic-info">
            <div>
              {{ file.size }}
            </div>
            <div>
              {{ file.date }}
            </div>
          </div>
        </li>
      </ul>
    </div>
  </div>
</template>
<style lang="scss" scoped>
.container {
  height: 100%;
}

.location {
  margin: 32px;
  display: flex;
  align-items: center;
  justify-content: space-between;

  a.opt {
    margin-left: 8px;
  }
}

.view {
  padding: 8px;

  .file-list {
    list-style: none;
    padding: 8px;
    height: var(--scroll-container-max-height);
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

      .basic-info {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
      }
    }
  }
}
</style>
