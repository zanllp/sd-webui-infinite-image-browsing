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
    <ImgSliSplitPane ref="splitpane" container="drawer" v-if="sli.left && sli.right" :left="sli.left"
      :right="sli.right" />
    <template #footer>
      <div class="actions">
        <AButton @click="sli.drawerVisible = false">{{ $t('close') }}</AButton>
        <AButton @click="splitpane?.requestFullScreen()">{{ $t('fullscreenview') }}</AButton>
        <a-alert banner style="height: 32px;" :message="'👇 ' + $t('scrollDownToComparePrompt')" type="info" show-icon />
      </div>
    </template>
  </ADrawer>
  <DraggingPort />
</template>


<style lang="scss" scoped>
.actions {
  display: flex;
  flex-direction: row;
}
</style>
<style lang="scss">
.img-sli {

  .ant-drawer-header,
  .ant-drawer-body {
    padding: 0;
  }

  .default-theme {
    .splitpanes__splitter {
      background-color: var(--zp-tertiary);
      position: relative;
      width: 4px;
    }


    .splitpanes__pane {
      background: var(--zp-primary-background);
    }

  }
}
</style>