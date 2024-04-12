import { Dict } from '@/util'
import type { FileNodeInfo } from './files'
import { axiosInst } from './index'
import { PageCursor } from 'vue3-ts-util'

export interface Tag {
  name: string
  id: number | string
  display_name: string | null
  type: string
  count: number
}

export type DataBaseBasicInfo = {
  img_count: number
  tags: Tag[]
  expired: boolean
  expired_dirs: string[]
}

export const getDbBasicInfo = async () => {
  const resp = await axiosInst.value.get('/db/basic_info')
  return resp.data as DataBaseBasicInfo
}

export const getExpiredDirs = async () => {
  const resp = await axiosInst.value.get('/db/expired_dirs')
  return resp.data as Pick<DataBaseBasicInfo, 'expired' | 'expired_dirs'>
}

export const updateImageData = async () => {
  await axiosInst.value.post('/db/update_image_data', {}, { timeout: Infinity })
}
type TagId = number | string
export interface MatchImageByTagsReq {
  folder_paths_str?: string
  and_tags: TagId[]
  or_tags: TagId[]
  not_tags: TagId[]
}

export const getImagesByTags = async (req: MatchImageByTagsReq, cursor: string) => {
  const resp = await axiosInst.value.post('/db/match_images_by_tags', {
    ...req,
    folder_paths: (req.folder_paths_str ?? '').split(/,|\n/).map(v => v.trim()).filter(v => v),
    cursor
  })
  return resp.data as {
    files: FileNodeInfo[],
    cursor: PageCursor
  }
}

export const addCustomTag = async (req: { tag_name: string }) => {
  const resp = await axiosInst.value.post('/db/add_custom_tag', req)
  return resp.data as Tag
}

export const toggleCustomTagToImg = async (req: { tag_id: TagId; img_path: string }) => {
  const resp = await axiosInst.value.post('/db/toggle_custom_tag_to_img', req)
  return resp.data as { is_remove: boolean }
}

export const removeCustomTag = async (req: { tag_id: TagId }) => {
  await axiosInst.value.post('/db/remove_custom_tag', req)
}

export const removeCustomTagToImg = async (req: { tag_id: TagId; img_id: TagId }) => {
  await axiosInst.value.post('/db/add_custom_tag_from_img', req)
}

export const getImageSelectedCustomTag = async (path: string) => {
  const resp = await axiosInst.value.get('/db/img_selected_custom_tag', { params: { path } })
  return resp.data as Tag[]
}

export interface SearchBySubstrReq {
  surstr: string;
  cursor: string;
  regexp: string;
  folder_paths?: string[];
  size?: number;
}


export const getImagesBySubstr = async (req: SearchBySubstrReq) => {
  const resp = await axiosInst.value.post('/db/search_by_substr', req)
  return resp.data as {
    files: FileNodeInfo[],
    cursor: PageCursor
  }
}

const extraPaths = '/db/extra_paths'
export type ExtraPathType =  'scanned' | 'walk' | 'cli_access_only' | ''

export interface ExtraPathModel {
  path: string
  alias?: string
  types: ExtraPathType[]
}

export const getExtraPath = async () => {
  const resp = await axiosInst.value.get(extraPaths)
  return resp.data as ExtraPathModel[]
}

export const addExtraPath = async (model: ExtraPathModel) => {
  await axiosInst.value.post(extraPaths, model)
}
export const removeExtraPath = async (req: ExtraPathModel) => {
  await axiosInst.value.delete(extraPaths, { data: req })
}

export interface ExtraPathAliasModel {
  path: string
  alias: string
}

export const aliasExtraPath = async (model: ExtraPathAliasModel) => {
  await axiosInst.value.post('/db/alias_extra_path', model)
}

export const batchGetTagsByPath = async (paths: string[]) => {
  const resp = await axiosInst.value.post('/db/get_image_tags', { paths })
  return resp.data as Dict<Tag[]>
}

export const rebuildImageIndex = () => axiosInst.value.post('/db/rebuild_index')

export interface BatchUpdateTagParams {
  img_paths: string[]
  action: 'add' | 'remove'
  tag_id: number
}

export const batchUpdateImageTag = (data: BatchUpdateTagParams) => {
  return axiosInst.value.post('/db/batch_update_image_tag', data)
}