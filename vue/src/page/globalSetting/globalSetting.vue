<script setup lang="ts">
import { t } from '@/i18n'
import { useGlobalStore, type Shortcut, type DefaultInitinalPage } from '@/store/useGlobalStore'
import { useWorkspeaceSnapshot } from '@/store/useWorkspeaceSnapshot'
import { computed, ref } from 'vue'
import { SearchSelect } from 'vue3-ts-util'
import { sortMethodConv, sortMethods } from '@/page/fileTransfer/fileSort'
import { relaunch } from '@tauri-apps/api/process'
import { appConfFilename } from '@/taurilaunchModal'
import { fs, invoke } from '@tauri-apps/api'
import { getShortcutStrFromEvent } from '@/util/shortcut'
import { isTauri } from '@/util/env'
import ImageSetting from './ImageSetting.vue'
import { openRebuildImageIndexModal } from '@/components/functionalCallableComp'


const globalStore = useGlobalStore()
const wsStore = useWorkspeaceSnapshot()

const langChanged = ref(false)
const reload = async () => {
  window.location.reload()
}
const langs: { text: string, value: string }[] = [
  { value: 'en', text: 'English' },
  { value: 'zhHans', text: '简体中文' },
  { value: 'zhHant', text: '繁體中文' },
  { value: 'de', text: 'Deutsch' }
]
const onShortcutKeyDown = (e: KeyboardEvent, key: keyof Shortcut) => {
  const keysStr = getShortcutStrFromEvent(e)
  if (keysStr) {
    globalStore.shortcut[key] = keysStr
  }
}

const oninitTauriLaunchConf = async () => {
  await invoke('shutdown_api_server_command')
  await fs.removeFile(appConfFilename)
  await relaunch()
}

const defaultInitinalPageOptions = computed(() => {
  const r: { text: string, value: DefaultInitinalPage }[] = [
    { value: 'empty', text: t('emptyStartPage') },
    { value: 'last-workspace-state', text: t('restoreLastWorkspaceState') },
    ...wsStore.snapshots.map(item => ({ value: `workspace_snapshot_${item.id}` as `workspace_snapshot_${string}`, text: t('restoreWorkspaceSnapshot', [item.name]) }))
  ]
  return r
})
</script>
<template>
  <div class="panel">
    <a-alert :message="$t('readonlyModeSettingPageDesc')" v-if="globalStore.conf?.is_readonly" type="warning" />
    <a-select v-if="false" />

    <a-form>
      <h2 style="margin-top: 0;">{{ t('ImageBrowsingSettings') }}</h2>
      <ImageSetting />
      <h2>{{ t('imgSearch') }}</h2>
      <a-form-item :label="$t('rebuildImageIndex')">
        <AButton @click="openRebuildImageIndexModal">{{ $t('start') }}</AButton>
      </a-form-item>

      <h2>{{ t('autoRefresh') }}</h2>
      <a-form-item :label="$t('autoRefreshWalkMode')">
        <a-switch v-model:checked="globalStore.autoRefreshWalkMode" />
      </a-form-item>
      <a-form-item :label="$t('autoRefreshNormalFixedMode')">
        <a-switch v-model:checked="globalStore.autoRefreshNormalFixedMode" />
      </a-form-item>
      <a-form-item :label="t('autoRefreshWalkModePosLimit')">
        <NumInput :min="0" :max="1024" :step="16" v-model="globalStore.autoRefreshWalkModePosLimit" />
      </a-form-item>
      <h2>{{ t('other') }}</h2>
      <a-form-item :label="$t('lang')">
        <div class="lang-select-wrap">
          <SearchSelect :options="langs" v-model:value="globalStore.lang" @change="langChanged = true" />
        </div>
        <a-button type="primary" @click="reload" v-if="langChanged" ghost>{{
      t('langChangeReload')
    }}</a-button>
      </a-form-item>
      <a-form-item :label="$t('onlyFoldersAndImages')">
        <a-switch v-model:checked="globalStore.onlyFoldersAndImages" />
      </a-form-item>
      <!--在生成信息面板显示逗号-->
      <a-form-item :label="$t('showCommaInGenInfoPanel')">
        <a-switch v-model:checked="globalStore.showCommaInInfoPanel" />
      </a-form-item>
      <a-form-item :label="$t('defaultSortingMethod')">
        <search-select v-model:value="globalStore.defaultSortingMethod" :conv="sortMethodConv" :options="sortMethods" />
      </a-form-item>

      <a-form-item :label="$t('longPressOpenContextMenu')">
        <a-switch v-model:checked="globalStore.longPressOpenContextMenu" />
      </a-form-item>
      <a-form-item :label="$t('openOnAppStart')">
        <search-select v-model:value="globalStore.defaultInitinalPage" :options="defaultInitinalPageOptions" />
      </a-form-item>
      <a-form-item :label="$t(key + 'SkipConfirm')" v-for="_, key in globalStore.ignoredConfirmActions" :key="key">
        <ACheckbox v-model:checked="globalStore.ignoredConfirmActions[key]"></ACheckbox>
      </a-form-item>
      <h2>{{ t('shortcutKey') }}</h2>
      <a-form-item :label="$t('download')">
        <div class="col">
          <a-input :value="globalStore.shortcut.download" @keydown.stop.prevent="onShortcutKeyDown($event, 'download')"
            :placeholder="$t('shortcutKeyDescription')" />
          <a-button @click="globalStore.shortcut.download = ''" class="clear-btn">{{ $t('clear') }}</a-button>
        </div>
      </a-form-item>
      <a-form-item :label="$t('deleteSelected')">
        <div class="col">
          <a-input :value="globalStore.shortcut.delete" @keydown.stop.prevent="onShortcutKeyDown($event, 'delete')"
            :placeholder="$t('shortcutKeyDescription')" />
          <a-button @click="globalStore.shortcut.delete = ''" class="clear-btn">{{ $t('clear') }}</a-button>
        </div>
      </a-form-item>
      <a-form-item :label="$t('toggleTagSelection', { tag: tag.name })"
        v-for="tag in globalStore.conf?.all_custom_tags ?? []" :key="tag.id">
        <div class="col">
          <a-input :value="globalStore.shortcut[`toggle_tag_${tag.name}`]"
            @keydown.stop.prevent="onShortcutKeyDown($event, `toggle_tag_${tag.name}`)"
            :placeholder="$t('shortcutKeyDescription')" />
          <a-button @click="globalStore.shortcut[`toggle_tag_${tag.name}`] = ''" class="clear-btn">
            {{ $t('clear') }}
          </a-button>
        </div>
      </a-form-item>
      <template v-if="isTauri">
        <h2>{{ t('clientSpecificSettings') }}</h2>
        <a-form-item>
          <div class="col">
            <a-button @click="oninitTauriLaunchConf" class="clear-btn">
              {{ $t('initiateSoftwareStartupConfig') }}
            </a-button>
          </div>
        </a-form-item>
      </template>
    </a-form>
  </div>
</template>
<style lang="scss" scoped>
.panel {
  padding: 8px;
  margin: 16px;
  border-radius: 8px;
  background: var(--zp-primary-background);
  overflow: auto;
  height: calc(100% - 32px);

  &> :not(:first-child) {
    margin-left: 16px;
  }
}

.lang-select-wrap {
  width: 128px;
  display: inline-block;
  padding-right: 16px;
}

h2 {
  margin: 64px 0 16px;
  font-weight: bold;
}

.row {
  margin-top: 16px;
  padding: 0 16px;
}

.col {
  display: flex;

}

.clear-btn {
  margin-left: 16px;
}
</style>
