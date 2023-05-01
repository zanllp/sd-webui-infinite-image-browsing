<script setup lang="ts">
import { t } from '@/i18n'
import { useGlobalStore } from '@/store/useGlobalStore'
import { ref } from 'vue'

const globalStore = useGlobalStore()

const langChanged = ref(false)
const w = window
</script>
<template>
  <div class="panel">
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
          <a-select v-model:value="globalStore.lang" @change="langChanged = true">
            <a-select-option value="zh"> 中文 </a-select-option>
            <a-select-option lang="en"> English </a-select-option>
          </a-select>
        </div>
        <a-button type="primary" @click="w.location.reload()" v-if="langChanged" ghost>{{
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

  & > :not(:first-child) {
    margin-left: 16px;
  }
}

.lang-select-wrap {
  width: 128px;
  display: inline-block;
  padding-right: 16px;
}
</style>
