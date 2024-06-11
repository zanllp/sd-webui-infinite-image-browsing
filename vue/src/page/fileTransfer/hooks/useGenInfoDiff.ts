import { ref } from 'vue'
import { global, useHookShareState } from '.'
import { getImageGenerationInfoBatch } from '@/api'
import { FileNodeInfo, GenDiffInfo } from '@/api/files'
import { parse } from '@/util/stable-diffusion-image-metadata'
import { delay } from 'vue3-ts-util'
import { isImageFile } from '@/util'
const geninfocache = new Map<string, string>()

export const useGenInfoDiff = () => {
  const { useEventListen, sortedFiles, getViewableAreaFiles } = useHookShareState().toRefs()

  const changeIndchecked = ref<boolean>(global.defaultChangeIndchecked)
  const seedChangeChecked = ref<boolean>(global.defaultSeedChangeChecked)

  const setGenInfo = async () => {
    await delay(100)
    if (!changeIndchecked.value) return 
    const files = getViewableAreaFiles.value().filter(v => isImageFile(v.fullpath) && !v.gen_info_obj)
    if (!files.length) return 
    const geninfos = await getImageGenerationInfoBatch(files.map(v => v.fullpath).filter(v => !geninfocache.has(v)))
    
    files.forEach(item => {
      const info = geninfos[item.fullpath] || geninfocache.get(item.fullpath) || ''
      geninfocache.set(item.fullpath, info)
      item.gen_info_obj = parse(info)
      item.gen_info_raw = info
    })
  }

  useEventListen.value('viewableAreaFilesChange',setGenInfo)


  const getGenDiffWatchDep = (idx: number) => {
    const fs = sortedFiles.value
    return [idx, seedChangeChecked.value , fs[idx-1], fs[idx], fs[idx+1] ]
  }

  function getGenDiff (ownGenInfo: any, idx: any, increment: any, ownFile: FileNodeInfo) {
    //init result obj
    const result: GenDiffInfo = {
      diff: {},
      empty: true,
      ownFile: '',
      otherFile: ''
    }

    //check for out of bounds
    if (idx + increment < 0
      || idx + increment >= sortedFiles.value.length
      || sortedFiles.value[idx] == undefined) {
      return result
    }
    //check for gen_info_obj existence
    if (!('gen_info_obj' in sortedFiles.value[idx])
      || !('gen_info_obj' in sortedFiles.value[idx + increment])) {
      return result
    }

    //diff vars init
    const gen_a = ownGenInfo
    const gen_b: any = sortedFiles.value[idx + increment].gen_info_obj
    if (gen_b == undefined) {
      return result
    }

    //further vars
    const skip = ['hashes', 'resources']
    result.diff = {}
    result.ownFile = ownFile.name,
    result.otherFile = sortedFiles.value[idx + increment].name,
    result.empty = false

    if (!seedChangeChecked.value) {
      skip.push('seed')
    }

    //actual per property diff
    for (const k in gen_a) {
      //skip unwanted values
      if (skip.includes(k)) {
        continue
      }
      //for all non-identical values, compare type based
      //existence test
      if (!(k in gen_b)) {
        result.diff[k] = '+'
        continue
      }
      //content test
      if (gen_a[k] != gen_b[k]) {
        if (k.includes('rompt') && gen_a[k] != '' && gen_b[k] != '') {
          //prompt values are comma separated, handle them differently
          const tokenize_a = gen_a[k].split(',')
          const tokenize_b = gen_b[k].split(',')
          //count how many tokens are different or at a different place
          let diff_count = 0
          for (const i in tokenize_a) {
            if (tokenize_a[i] != tokenize_b[i]) {
              diff_count++
            }
          }
          result.diff[k] = diff_count
        } else {
          //all others
          result.diff[k] = [gen_a[k], gen_b[k]]
        }
      }
    }

    //result
    return result
  }
  return {
    getGenDiff,
    changeIndchecked,
    seedChangeChecked,
    getRawGenParams: () => setGenInfo(),
    getGenDiffWatchDep
  }
}