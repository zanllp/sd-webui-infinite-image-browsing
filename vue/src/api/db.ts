import type { FileNodeInfo } from './files'
import { axiosInst } from './index'

export interface Tag {
  name: string
  id: number
  display_name: string | null
  type: string
  count: number
}


export type DataBaseBasicInfo = {
  img_count: number,
  tags: Tag[],
  expired: boolean,
  expired_dirs: string[]
}

export const getDbBasicInfo = async () => {
  const resp = await axiosInst.get('/db/basic_info')
  return resp.data as DataBaseBasicInfo
} 

export const updateImageData = async () => {
  await axiosInst.post('/db/update_image_data', {  }, { timeout: Infinity })
}

export const getImagesByTags  = async (ids: number[]) => {
  const resp = await axiosInst.get('/db/match_images_by_tags', { params: { tag_ids: ids.join() } })
  return resp.data as FileNodeInfo[]
}