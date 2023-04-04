<!-- eslint-disable no-empty -->
<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { FetchQueue } from 'vue3-ts-util'
import { getUserInfo, type UserInfo, logout, loginByBduss } from './api/user'
import { message } from 'ant-design-vue'
import { isAxiosError } from 'axios'
import { getGlobalSetting } from './api'
import { useGlobalStore } from './store/useGlobalStore'
import { getAutoCompletedTagList } from './taskRecord/autoComplete'
import { useTaskListStore } from './store/useTaskListStore'
import { useIntervalFn } from '@vueuse/core'
import SplitViewTab from './SplitViewTab/SplitViewTab.vue'

const user = ref<UserInfo>()
const bduss = ref('')
const queue = reactive(new FetchQueue(-1, 0, 0, 'throw'))
const globalStore = useGlobalStore()
const taskStore = useTaskListStore()
onMounted(async () => {
  getGlobalSetting().then(async (resp) => {
    globalStore.conf = resp
    const r = await getAutoCompletedTagList(resp)
    globalStore.autoCompletedDirList = r.filter(v => v?.dir?.trim?.())
  })
  user.value = await queue.pushAction(getUserInfo).res
})

const onLogoutBtnClick = async () => {
  await queue.pushAction(logout).res
  user.value = undefined
}

const onLoginBtnClick = async () => {
  try {
    user.value = await queue.pushAction(() => loginByBduss(bduss.value)).res
  } catch (error) {
    console.error(error)
    message.error(isAxiosError(error) ? error.response?.data?.detail ?? '未知错误' : '未知错误')
  }
}

const tips = ref('')
const msgs = [
  '使用“快速移动”, 可以直接到到达图生图，文生图等文件夹',
  "你可以通过拖拽调整两边区域的大小",
  "使用ctrl，shift可以很方便的进行多选",
  "从百度云向本地拖拽是下载，本地向百度云拖拽是上传",
  "可以多尝试更多里面的功能",
  "鼠标在文件上右键可以打开上下文菜单",
  "提醒任务完成后，你需要手动刷新下才能看到新文件"]
useIntervalFn(() => {
  tips.value = msgs[~~(Math.random() * msgs.length)]
}, 3000)
</script>

<template>
  <a-skeleton :loading="!queue.isIdle">

    <!--div class="panel">
        <template v-if="user">
          <div>
            已登录用户：{{ user.username }}
          </div>
          <div class="flex-placeholder" /><a-alert :message="tips" type="info" show-icon />

          <a-form layout="inline">
            <a-form-item label="使用缩略图预览">
              <a-switch v-model:checked="globalStore.enableThumbnail" />
            </a-form-item>
            <a-form-item>

              <a-button @click="onLogoutBtnClick">
                <template #icon>
                  <logout-outlined />
                </template>
                登出
              </a-button>
            </a-form-item>
          </a-form>
        </template>

        <a-form layout="inline" v-else>
          <a-form-item label="bduss">
            <a-input v-model:value="bduss" style="width:300px"></a-input>
          </a-form-item>
          <a-form-item>
            <a-button @click="onLoginBtnClick" type="primary">
              <template #icon>
                <login-outlined />
              </template>
              登录
            </a-button>
          </a-form-item>
        </a-form>
      </div-->
    <split-view-tab />
  </a-skeleton>
</template>
<style scoped lang="scss"> 
.panel {
  padding: 8px;
  margin: 16px;
  border-radius: 8px;
  background: var(--zp-primary-background);
  display: flex;
  justify-content: space-between;

  &> :not(:first-child) {
    margin-left: 16px;
  }
}


.opreation-container {
  display: flex;
  flex-direction: column;

  .split-view {
    height: var(--scroll-container-max-height);
  }
}
</style>