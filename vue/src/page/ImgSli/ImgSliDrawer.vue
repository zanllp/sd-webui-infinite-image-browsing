<script setup lang="ts">
import DraggingPort from './DraggingPort.vue'
import { useImgSliStore } from '@/store/useImgSli'
import ImgSliSplitPane from './ImgSliComparePane.vue'
import { ref } from 'vue'

const sli = useImgSliStore()
const splitpane = ref<{ requestFullScreen (): void }>()
</script>
<template>
  <ADrawer width="100vw" v-model:visible="sli.drawerVisible" destroy-on-close class="img-sli" :close-icon="null">
    <ImgSliSplitPane ref="splitpane" v-if="sli.left && sli.right" :left="sli.left" :right="sli.right" />
    <template #footer>
      <div class="actions">
        <AButton @click="sli.drawerVisible = false">{{ $t('close') }}</AButton>
        <AButton @click="splitpane?.requestFullScreen()">{{ $t('fullscreenview') }}</AButton>
      </div>
    </template>
  </ADrawer>
  <DraggingPort />
</template>

<style lang="scss">
.img-sli {
  .ant-drawer-header,.ant-drawer-body {
    padding: 0;
  }

  .default-theme {

    .splitpanes__splitter {
      background-color: #ccc;
      position: relative;
      width: 4px;
    }

    .splitpanes {
      background-color: #f8f8f8;
    }

  }
}
</style>