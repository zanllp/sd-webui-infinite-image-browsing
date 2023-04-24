import { message } from 'ant-design-vue'
import axios, { isAxiosError } from 'axios'
import type { GlobalSettingPart } from './type'
import { t } from '@/i18n'
export const axiosInst = axios.create({
  baseURL: '/infinite_image_browsing',

})
axiosInst.interceptors.response.use(resp => resp, err => {
  if (isAxiosError(err)) {
    const errmsg = err.response?.data?.detail ?? t('errorOccurred')
    message.error(errmsg)
    throw new Error(errmsg)
  }
  return err
})
export const greeting = async () => {
  const resp = await axiosInst.get('hello')
  return resp.data as string
}

export interface GlobalConf {
  global_setting: GlobalSettingPart,
  is_win: boolean,
  cwd: string,
  home: string
  sd_cwd: string
}

export const getGlobalSetting = async () => {
  const resp = await axiosInst.get('/global_setting')
  return resp.data as GlobalConf
}

export const checkPathExists = async (paths: string[]) => {
  const resp = await axiosInst.post('/check_path_exists',{ paths })
  return resp.data as Record<string, boolean>
}



export const setImgPath = async (path: string) => {
  return axiosInst.post(`/send_img_path?path=${encodeURIComponent(path)}`)
}

export const genInfoCompleted = async () => {
  return (await axiosInst.get(`/gen_info_completed`, { timeout: 60_000 })).data as boolean
}

export const getImageGenerationInfo = async (path: string) => {
  return (await axiosInst.get(`/image_geninfo?path=${encodeURIComponent(path)}`)).data as string
}
