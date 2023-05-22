<script setup lang="ts">
import { t } from '@/i18n'
import { useGlobalStore } from '@/store/useGlobalStore'
import { ref } from 'vue'
import { SearchSelect, delay } from 'vue3-ts-util'

const globalStore = useGlobalStore()

const langChanged = ref(false)
const reload = async () => {
  await delay(100)
  window.location.reload()
}
const langs: { text: string, value: string }[] = [{ value: 'en', text: 'English' }, { value: 'zh', text: '中文' }, { value: 'de', text: 'Deutsch' }]
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
</style>
