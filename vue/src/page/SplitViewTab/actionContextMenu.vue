<script lang="ts" setup>
import type { MenuInfo } from 'ant-design-vue/lib/menu/src/interface'


const emit = defineEmits(['openOnTheRight', 'openInNewTab'])
const onMenuClick = (e: MenuInfo) => {
  switch (e.key.toString()) {
    case 'openOnTheRight':
      emit('openOnTheRight')
      break
    case 'openInNewTab':
      emit('openInNewTab')
      break
  }
}
</script>
<template>
  <a-dropdown :trigger="['contextmenu']" >
    <slot />
    <template #overlay >
      <a-menu @click="onMenuClick">
        <a-menu-item key="openOnTheRight">{{ $t('openOnTheRight') }}</a-menu-item>
        <a-menu-item key="openInNewTab">{{ $t('openInNewTab') }}</a-menu-item>
      </a-menu>
    </template>
  </a-dropdown>
</template>

<style scoped lang="scss"></style>
