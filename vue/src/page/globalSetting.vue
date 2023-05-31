<script setup lang="ts">
import { t } from '@/i18n'
import { useGlobalStore, type Shortcut } from '@/store/useGlobalStore'
import { ref } from 'vue'
import { SearchSelect, delay } from 'vue3-ts-util'
// import { Form as AForm, FormItem as AFormItem, Input as AInput, Row as ARow, Col as ACol, Row } from 'ant-design-vue'

const globalStore = useGlobalStore()

const langChanged = ref(false)
const reload = async () => {
  await delay(300)
  window.location.reload()
}
const langs: { text: string, value: string }[] = [{ value: 'en', text: 'English' }, { value: 'zh', text: '中文' }, { value: 'de', text: 'Deutsch' }]
const onShortcutKeyDown = (e: KeyboardEvent, key: keyof Shortcut) => {
  const keys = [] as string[]
  if (e.shiftKey) {
    keys.push('Shift')
  } if (e.ctrlKey) {
    keys.push('Ctrl')
  }
  if (e.code.startsWith('Key') || e.code.startsWith('Digit')) {
    keys.push(e.code)
    globalStore.shortcut[key] = keys.join(' + ')
  }
}
</script>
<template>
  <div class="panel">
    <a-select v-if="false" />
    <a-form>
      <a-form-item :label="$t('useThumbnailPreview')">
        <a-switch v-model:checked="globalStore.enableThumbnail" />
      </a-form-item>

      <a-form-item :label="$t('gridThumbnailWidth')">
        <a-input-number v-model:value="globalStore.gridThumbnailSize" :min="256" :max="1024" /> (px)
      </a-form-item>
      <a-form-item :label="$t('largeGridThumbnailWidth')">
        <a-input-number v-model:value="globalStore.largeGridThumbnailSize" :min="256" :max="1024" />
        (px)
      </a-form-item>
      <a-form-item :label="$t('longPressOpenContextMenu')">
        <a-switch v-model:checked="globalStore.longPressOpenContextMenu" />
      </a-form-item>
      <a-form-item :label="$t('onlyFoldersAndImages')">
        <a-switch v-model:checked="globalStore.onlyFoldersAndImages" />
      </a-form-item>
      <a-form-item :label="$t('lang')">
        <div class="lang-select-wrap">
          <SearchSelect :options="langs" v-model:value="globalStore.lang" @change="langChanged = true" />
        </div>
        <a-button type="primary" @click="reload" v-if="langChanged" ghost>{{
          t('langChangeReload')
        }}</a-button>
      </a-form-item>
      <a-form-item :label="$t('shortcutKey')">
        <ARow v-for="value, key in globalStore.shortcut" :key="key" class="row">
          <ACol :span="8">
            {{ $t(key) }}
          </ACol>
          <ACol :span="16" class="col">
            <a-input :value="value" @keydown.stop.prevent="onShortcutKeyDown($event, key as any)"
              :placeholder="$t('shortcutKeyDescription')" />
              <a-button @click="globalStore.shortcut[key] = ''">{{ $t('cancel') }}</a-button>
          </ACol>
        </ARow>
      </a-form-item>
    </a-form>
  </div>
</template>
<style lang="scss" scoped>
.panel {
  padding: 8px;
  margin: 16px;
  border-radius: 8px;
  background: var(--zp-primary-background);

  &> :not(:first-child) {
    margin-left: 16px;
  }
}

.lang-select-wrap {
  width: 128px;
  display: inline-block;
  padding-right: 16px;
}

.row {
  margin-top: 16px;
  padding: 0 16px;
}
.col {
 display: flex;

}
</style>
