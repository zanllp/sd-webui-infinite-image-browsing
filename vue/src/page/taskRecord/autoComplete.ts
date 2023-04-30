import { checkPathExists, type getGlobalSetting } from '@/api'
import { t } from '@/i18n'
import { pick, type ReturnTypeAsync } from '@/util'

export const getAutoCompletedTagList = async ({
  global_setting,
  sd_cwd,
  home
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
    'outdir_save'
  )
  const pathMap = {
    ...picked,
    embeddings: 'embeddings',
    hypernetworks: 'models/hypernetworks',
    cwd: sd_cwd,
    home
  }
  const exists = await checkPathExists(Object.values(pathMap).filter(v => v))
  type Keys = keyof typeof pathMap
  const cnMap: Record<Keys, string> = {
    outdir_txt2img_samples: t('t2i'),
    outdir_img2img_samples: t('i2i'),
    outdir_save: t('saveButtonSavesTo'),
    outdir_extras_samples: t('extra'),
    // additional_networks_extra_lora_path: 'LoRA',
    outdir_grids: t('gridImage'),
    outdir_img2img_grids: t('i2i-grid'),
    outdir_samples: t('image'),
    outdir_txt2img_grids: t('t2i-grid'),
    hypernetworks: t('hypernetworks'),
    embeddings: 'Embedding',
    cwd: t('workingFolder'),
    home: 'home'
  }
  return Object.keys(cnMap)
    .filter((k) => exists[pathMap[k as keyof typeof pathMap] as string])
    .map((k) => {
      const key = k as Keys
      return {
        key,
        zh: cnMap[key],
        dir: pathMap[key]
      }
    })
}
