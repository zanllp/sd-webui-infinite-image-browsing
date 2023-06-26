<script setup lang="ts">
// @ts-ignore
import { Splitpanes, Pane } from 'splitpanes'
import DraggingPort from './DraggingPort.vue'
import { useImgSliStore } from '@/store/useImgSli'
import ImgSliSide from './ImgSliSide.vue'

const sli = useImgSliStore()


const onResize = ([{ size }]: { size: number }[]) => {
  sli.splitPercent = size
}
</script>
<template>
  <ADrawer width="100vw" v-model:visible="sli.drawerVisible" destroy-on-close class="img-sli">
    <splitpanes class="default-theme" @resize="onResize">
      <pane>
        <ImgSliSide side="left" />
      </pane>
      <pane>
        <ImgSliSide side="right" />
      </pane>
    </splitpanes>
  </ADrawer>
  <DraggingPort />
</template>

<style lang="scss">
.img-sli .default-theme {
  .splitpanes {
    background-color: #f8f8f8;
  }

  .splitpanes__splitter {
    background-color: #ccc;
    position: relative;
    width: 2px;
  }

  .splitpanes__splitter:before {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    transition: opacity 0.4s;
    opacity: 0;
    z-index: 1;
  }

  .splitpanes__splitter:hover:before {
    opacity: 1;
  }

  .splitpanes--vertical>.splitpanes__splitter:before {
    left: -30px;
    right: -30px;
    height: 100%;
  }

  .splitpanes--horizontal>.splitpanes__splitter:before {
    top: -30px;
    bottom: -30px;
    width: 100%;
  }
}</style>