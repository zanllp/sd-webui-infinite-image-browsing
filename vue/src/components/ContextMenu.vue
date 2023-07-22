<script setup lang="ts">
import type { Tag } from '@/api/db'
import type { FileNodeInfo } from '@/api/files'
import type { MenuInfo } from 'ant-design-vue/lib/menu/src/interface'
import { isImageFile } from '@/util'
import { StarFilled, StarOutlined } from '@/icon'
import { useGlobalStore } from '@/store/useGlobalStore'
import { computed } from 'vue'
const global = useGlobalStore()
const props = defineProps<{
  file: FileNodeInfo
  idx: number,
  selectedTag: Tag[],
  disableDelete?: boolean
}>()
const emit = defineEmits<{
  (type: 'contextMenuClick', e: MenuInfo, file: FileNodeInfo, idx: number): void
}>()

const tags = computed(() => {
  return (global.conf?.all_custom_tags ?? []).reduce((p, c) => {
    return [...p, { ...c, selected: !!props.selectedTag.find((v) => v.id === c.id) }]
  }, [] as (Tag & { selected: boolean })[])
})
</script>
<template>
  <a-menu @click="emit('contextMenuClick', $event, file, idx)">
    <a-menu-item key="deleteFiles" :disabled="disableDelete">{{ $t('deleteSelected') }}</a-menu-item>
    <template v-if="file.type === 'dir'">
      <a-menu-item key="openInNewTab">{{ $t('openInNewTab') }}</a-menu-item>
      <a-menu-item key="openOnTheRight">{{ $t('openOnTheRight') }}</a-menu-item>
      <a-menu-item key="openWithWalkMode">{{ $t('openWithWalkMode') }}</a-menu-item>
    </template>
    <template v-if="file.type === 'file'">
      <template v-if="isImageFile(file.name)">
        <a-menu-item key="viewGenInfo">{{ $t('viewGenerationInfo') }}</a-menu-item>
        <a-menu-divider />
        <template v-if="global.conf?.launch_mode !== 'server'">
          <a-menu-item key="send2txt2img">{{ $t('sendToTxt2img') }}</a-menu-item>
          <a-menu-item key="send2img2img">{{ $t('sendToImg2img') }}</a-menu-item>
          <a-menu-item key="send2inpaint">{{ $t('sendToInpaint') }}</a-menu-item>
          <a-menu-item key="send2extras">{{ $t('sendToExtraFeatures') }}</a-menu-item>
          <a-sub-menu key="sendToThirdPartyExtension" :title="$t('sendToThirdPartyExtension')">
            <a-menu-item key="send2controlnet-txt2img">ControlNet - {{ $t('t2i') }}</a-menu-item>
            <a-menu-item key="send2controlnet-img2img">ControlNet - {{ $t('i2i') }}</a-menu-item>
            <a-menu-item key="send2outpaint">openOutpaint</a-menu-item>
          </a-sub-menu>
        </template>
        <a-menu-item key="send2BatchDownload">{{ $t('sendToBatchDownload') }}</a-menu-item>
        <a-menu-item key="send2savedDir">{{ $t('send2savedDir') }}</a-menu-item>
        <a-menu-divider />
        <a-sub-menu key="toggle-tag" :title="$t('toggleTag')">
          <a-menu-item v-for="tag in tags" :key="`toggle-tag-${tag.id}`">{{ tag.name }} <star-filled
              v-if="tag.selected" /><star-outlined v-else />
          </a-menu-item>
        </a-sub-menu>
        <a-menu-item key="openWithLocalFileBrowser">{{ $t('openWithLocalFileBrowser') }}</a-menu-item>
      </template>
      <a-menu-item key="previewInNewWindow">{{ $t('previewInNewWindow') }}</a-menu-item>
      <a-menu-item key="download">{{ $t('download') }}</a-menu-item>
      <a-menu-item key="copyPreviewUrl">{{ $t('copySourceFilePreviewLink') }}</a-menu-item>
    </template>
  </a-menu>
</template>