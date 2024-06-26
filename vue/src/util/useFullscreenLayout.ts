import { Ref, computed, onMounted, reactive, toRefs, watch } from 'vue'
import { debounce } from 'lodash-es'
import { useGlobalStore } from '@/store/useGlobalStore'
import { setAppFeSetting } from '@/api'
type LayoutConf = { enable: boolean, panelWidth: number, alwaysOn: boolean }

export const useFullscreenLayout = () => {
  const g = useGlobalStore()
  const state =  reactive<LayoutConf>(g.conf?.app_fe_setting?.fullscreen_layout ?? { enable: false, panelWidth: 384, alwaysOn: true })
  
  const panelwidtrhStyleVarName = '--iib-lr-layout-info-panel-width'
  const lrLayoutContainerOffset = computed(() => state.alwaysOn && state.enable ? state.panelWidth : 0)

  watch(state, () => {
    onUpdate(state, panelwidtrhStyleVarName, lrLayoutContainerOffset)
    sync(state)
  }, { deep: true })


  onMounted(() => onUpdate(state, panelwidtrhStyleVarName, lrLayoutContainerOffset))

  const { enable, panelWidth, alwaysOn } = toRefs(state)
  return {
    state, 
    isLeftRightLayout: enable,
    panelwidtrhStyleVarName,
    lrLayoutInfoPanelWidth: panelWidth,
    lrMenuAlwaysOn: alwaysOn
  }
}


const sync = debounce((val) => setAppFeSetting('fullscreen_layout', val), 300)

const onUpdate = debounce((state: LayoutConf, panelwidtrhStyleVarName: string, lrLayoutContainerOffset: Ref<number>) => {
  
  if (state.enable) {
    document.body.classList.add('fullscreen-lr-layout')
    document.documentElement.style.setProperty(panelwidtrhStyleVarName, `${state.panelWidth}px`)
    document.documentElement.style.setProperty('--iib-lr-layout-container-offset', `${lrLayoutContainerOffset.value}px`)
  } else {
    document.documentElement.style.removeProperty(panelwidtrhStyleVarName)
    document.documentElement.style.removeProperty('--iib-lr-layout-container-offset')
    document.body.classList.remove('fullscreen-lr-layout')
  }
}
, 300)