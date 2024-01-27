<script setup lang="ts">
defineProps<{ fileNum: number; selectedFileNum?: number }>()

</script>
<template>
  <div class="base-info">
    <span>{{ $t('items', [fileNum]) }}
      <template v-if="selectedFileNum">,  {{ $t('selectedItems', [selectedFileNum]) }}</template>
    </span>
  </div>
</template>
<style lang="scss" scoped>
.base-info {
  position: absolute;
  padding: 4px;
  font-size: .8em;
  background: var(--zp-primary-background);
  color: var(--zp-primary);
  left: 0;
  bottom: 0;
  border-top-right-radius: 4px;
}
</style>