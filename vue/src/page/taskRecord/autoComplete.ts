import { checkPathExists, type getGlobalSetting } from '@/api'
import { t } from '@/i18n'
import { pick, type ReturnTypeAsync } from '@/util'
import { normalize } from '@/util/path'
import { uniqBy } from 'lodash-es'

export const getAutoCompletedTagList = async ({
  global_setting,
  sd_cwd,
  home,
  extra_paths,
  cwd
}: ReturnTypeAsync<typeof getGlobalSetting>) => {
  const picked = pick(
    global_setting,
    // 'additional_networks_extra_lora_path',
    'outdir_grids',
    'outdir_extras_samples',
    'outdir_img2img_grids',
    'outdir_img2img_samples',
    'outdir_grids',
    'outdir_extras_samples',
    'outdir_samples',
    'outdir_txt2img_grids',
    'outdir_txt2img_samples',
    'outdir_save',
  )
  const pathMap = {
    ...picked,
    cwd: sd_cwd,
    home,
    desktop: `${home}/Desktop`
  }
  const exists = await checkPathExists(Object.values(pathMap).filter((v) => v))
  type Keys = keyof typeof pathMap
  const cnMap: Record<Keys, string> = {
    outdir_txt2img_samples: t('t2i'),
    outdir_img2img_samples: t('i2i'),
    outdir_save: t('saveButtonSavesTo'),
    outdir_extras_samples: t('extra'),
    outdir_grids: t('gridImage'),
    outdir_img2img_grids: t('i2i-grid'),
    outdir_samples: t('image'),
    outdir_txt2img_grids: t('t2i-grid'),
    cwd: t('workingFolder'),
    home: 'home',
    desktop: t('desktop')
  }
  const pathAliasMap = {
    home: normalize(home),
    [t('desktop')]: normalize(pathMap.desktop),
    [t('workingFolder')]: normalize(cwd),
    [t('t2i')]: picked.outdir_txt2img_samples &&  normalize(picked.outdir_txt2img_samples),
    [t('i2i')]: picked.outdir_img2img_samples && normalize(picked.outdir_img2img_samples)
  }
  const findshortest = (path: string) => {
    path = normalize(path)
    const replacedPaths = [] as string[]
    for (const [k,v] of Object.entries(pathAliasMap)) {
      if (k && v) {
        replacedPaths.push(path.replace(v, '$' + k))
      }
    }
    return replacedPaths.sort((a,b) => a.length - b.length)[0]
  }
  const res = Object.keys(cnMap)
  .filter((k) => exists[pathMap[k as keyof typeof pathMap] as string])
  .map((k) => {
    const key = k as Keys
    return {
      key,
      zh: cnMap[key],
      dir: pathMap[key],
      can_delete: false
    }
  }).concat(extra_paths.map(v => ({ key: v.path, zh: findshortest(v.path), dir: v.path, can_delete: true })) as any[])
  return uniqBy(res, 'key')
}
