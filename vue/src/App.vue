<script setup lang="ts">
import { onMounted, watch } from 'vue'
import { getGlobalSetting, setAppFeSetting } from './api'
import { useGlobalStore, presistKeys } from './store/useGlobalStore'
import { useWorkspeaceSnapshot } from './store/useWorkspeaceSnapshot'
import { getQuickMovePaths } from '@/page/taskRecord/autoComplete'
import SplitViewTab from '@/page/SplitViewTab/SplitViewTab.vue'
import { Dict, createReactiveQueue, globalEvents, useGlobalEventListen } from './util'
import { resolveQueryActions } from './queryActions'
import { refreshTauriConf, tauriConf } from './util/tauriAppConf'
import { openModal } from './taurilaunchModal'
import { isTauri } from './util/env'
import { delay } from 'vue3-ts-util'
import { exportFn } from './defineExportFunc'
import { debounce, once, cloneDeep } from 'lodash-es'
import { message } from 'ant-design-vue'
import { t } from './i18n'

const globalStore = useGlobalStore()
const wsStore = useWorkspeaceSnapshot()
const queue = createReactiveQueue()

const presistKeysFiltered = presistKeys.filter(v => !['tabListHistoryRecord', 'recent'].includes(v))

let lastConf = null as any
const watchGlobalSettingChange = once(async () => {
  globalStore.$subscribe((debounce(async () => {
    if (globalStore.conf?.is_readonly === true) {
      return
    }
    const conf = {} as Dict
    presistKeysFiltered.forEach((key) => {
      conf[key] = cloneDeep((globalStore as any)[key])
    })
    if (JSON.stringify(conf) === JSON.stringify(lastConf)) {
      return
    }
    console.log('save global setting', conf)
    await setAppFeSetting('global', conf)
    lastConf = cloneDeep(conf)
  }, 500)))


})

const restoreWorkspaceSnapshot = once( async () => {
  await delay(100)
  const initPage = globalStore.defaultInitinalPage
  if (initPage === 'empty') {
    return
  }
  if (initPage === 'last-workspace-state') {
    const last = globalStore.tabListHistoryRecord?.[1]
    if (!last?.tabs) {
      return
    }
    globalStore.tabList = cloneDeep(last.tabs)
    message.success(t('restoreLastWorkspaceStateSuccess'))
  } else {
    const id = initPage.split('_')?.[2]
    const shot = wsStore.snapshots.find(v => v.id === id)
    if (!shot?.tabs) {
      return
    }
    globalStore.tabList = cloneDeep(shot.tabs)
    message.success(t('restoreWorkspaceSnapshotSuccess'))
  }

})



useGlobalEventListen('updateGlobalSetting', async () => {
  await refreshTauriConf()
  console.log(tauriConf.value)
  const resp = await getGlobalSetting()
  globalStore.conf = resp
  const r = await getQuickMovePaths(resp)
  globalStore.quickMovePaths = r.filter((v) => v?.dir?.trim?.())

  const restoreFeGlobalSetting = globalStore?.conf?.app_fe_setting?.global
  if (restoreFeGlobalSetting) {
    console.log('restoreFeGlobalSetting', restoreFeGlobalSetting)
    lastConf = cloneDeep(restoreFeGlobalSetting)
    presistKeysFiltered.forEach((key) => {
      const v = restoreFeGlobalSetting[key]
      if (v !== undefined) {
        (globalStore as any)[key] = v
      }
    })
  }
  watchGlobalSettingChange()
  restoreWorkspaceSnapshot()
  exportFn(globalStore)
  resolveQueryActions(globalStore)
  // globalEvents.emit('updateGlobalSettingDone')
})



useGlobalEventListen('returnToIIB', async () => {
  const conf = globalStore.conf
  if (!conf) {
    return
  }
  const gs = conf.global_setting
  if (!gs.outdir_txt2img_samples && !gs.outdir_img2img_samples) {
    return
  }
  const set = new Set(globalStore.quickMovePaths.map(v => v.key))
  if (set.has('outdir_txt2img_samples') && set.has('outdir_img2img_samples')) {
    return
  }
  const r = await getQuickMovePaths(conf)
  globalStore.quickMovePaths = r.filter((v) => v?.dir?.trim?.())
})



watch(
  () => globalStore.computedTheme === 'dark',
  async (enableDark) => {
    await delay()
    const head = document.getElementsByTagName('html')[0] // html而不是head保证优先级    
    if (enableDark) {
      document.body.classList.add('dark')
      const darkStyle = document.createElement('style')
      const { default: css } = await import('ant-design-vue/dist/antd.dark.css?inline')
      darkStyle.innerHTML = css
      darkStyle.setAttribute('antd-dark', '')
      head.appendChild(darkStyle)
    } else {
      document.body.classList.remove('dark')
      Array.from(head.querySelectorAll('style[antd-dark]')).forEach((e) => e.remove())
    }
  },
  { immediate: true }
)

watch(() => globalStore.previewBgOpacity, (v) => {
  document.documentElement.style.setProperty('--iib-preview-mask-bg', `rgba(0, 0, 0, ${v})`)
}, { immediate: true })

onMounted(async () => {
  if (isTauri) {
    openModal()
  }
  globalEvents.emit('updateGlobalSetting')

})
</script>

<template>
  <a-skeleton :loading="!queue.isIdle">
    <SplitViewTab />
  </a-skeleton>
</template>
